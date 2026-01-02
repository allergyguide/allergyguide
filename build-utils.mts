import dotenv from "dotenv";
dotenv.config();

/**
 * Interface representing the structure of the AUTH_USERS environment variable
 * Keys are usernames, values are password hashes or similar credentials
 */
interface AuthUsers {
  [username: string]: string;
}

/**
 * Interface representing the structure of the USER_PERMISSIONS environment variable
 * Keys are usernames, values are lists of permissions or roles
 */
interface UserPermissions {
  [username: string]: string[];
}

/**
 * Fetches a raw file from a private GitHub repository as a binary buffer
 * Uses the custom `application/vnd.github.raw` header to avoid base64 overhead
 * @param token - PAT with read-only scope ideally
 * @param repo - the repository string in "owner/repo" format
 * @param filepath - the full path to the file within the repository
 * @returns a promise resolving to a buffer containing the file's raw content
 * @throws {Error} If the fetch fails or the response is not OK
 */
export async function fetchFromGithubBinary(token: string, repo: string, filePath: string) {
  const url = `https://api.github.com/repos/${repo}/contents/${filePath}`;

  // To fetch raw binary from GitHub API efficiently without base64 wrapper overhead, use the "Raw" media type header:
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.raw', // Request raw content
      'User-Agent': 'Netlify-Function'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${filePath}: ${response.status} ${response.statusText}`);
  }

  // Get as ArrayBuffer and convert to Buffer for fs.writeFileSync
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Fetches all files with a specific extension using the Git Tree API
 * @param {string} token - GitHub PAT
 * @param {string} repo - "user/repo"
 * @param {string} branch - The branch to scan (e.g., "main")
 * @param {string} dirPath - Filter results to this directory (optional) e.g. "tools"
 * @param {string} extension - The file ending (e.g., ".json")
 * @returns A Promise resolving to an array of file path strings
 * @throws {Error} If the Git Tree API request fails

 Example output with dirPath "tools" looking for jsons:
 [
  'tools/alice_foods.json',
  'tools/alice_protocols.json',
  'tools/user_configs/alice_config.json'
]
 */
export async function getPathsUsingGitTree(token: string, repo: string, branch: string, dirPath: string, extension: string): Promise<string[]> {
  // ?recursive=1 fetches the entire file tree in one go
  const url = `https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=1`;
  const ext = extension.startsWith('.') ? extension : `.${extension}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub API Error for tree fetch: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // The API returns a flat array of all files in the repo
  return (data.tree as any[])
    .filter(item =>
      item.type === 'blob' &&                 // explicit check for file (blob)
      item.path.startsWith(dirPath) &&        // inside target dir
      item.path.endsWith(ext)                 // matches extension
    )
    .map(item => item.path);
}

/**
 * Verifies the integrity of the `AUTH_USERS` and `USER_PERMISSIONS` environment variables
 * Ensures that every authenticated user has a defined permissions entry and vice-versa
 * if the security config is invalid, the build terminates
 */
export function verifyUsersData() {
  console.log("Verifying Users Configuration...");
  const authUsersEnv = process.env.AUTH_USERS!;
  const userPermsEnv = process.env.USER_PERMISSIONS!;
  if (!authUsersEnv || !userPermsEnv) {
    console.error("Build Failed: Missing AUTH_USERS or USER_PERMISSIONS environment variables.");
    process.exit(1);
  }
  let authUsersKeys: string[] = [];
  let userPermsKeys: string[] = [];
  try {
    // Parse the JSON strings
    const authUsers = JSON.parse(authUsersEnv);
    const userPerms = JSON.parse(userPermsEnv);
    authUsersKeys = Object.keys(authUsers);
    userPermsKeys = Object.keys(userPerms);
  } catch (e) {
    console.error("Build Failed: Could not parse AUTH_USERS or USER_PERMISSIONS as JSON.", e.message);
    process.exit(1);
  }

  // Check for Users without Permissions
  const usersMissingPerms = authUsersKeys.filter(user => !userPermsKeys.includes(user));

  if (usersMissingPerms.length > 0) {
    console.error("Build Failed: The following users are in AUTH_USERS but missing from USER_PERMISSIONS:");
    console.error(JSON.stringify(usersMissingPerms, null, 2));
    console.error(">> Every user who can login must have an entry (even if empty) in the permission list.");
    process.exit(1);
  }

  // Check for Orphaned Permissions 
  // Users listed in permissions but have no login credentials
  const orphans = userPermsKeys.filter(user => !authUsersKeys.includes(user));

  if (orphans.length > 0) {
    console.warn("Error: The following users have permissions defined but are NOT in AUTH_USERS (they cannot log in):");
    console.warn(JSON.stringify(orphans, null, 2));
    process.exit(1);
  }
  console.log("Security Config Verified: All users have associated permissions.");
}


