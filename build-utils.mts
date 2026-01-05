import dotenv from "dotenv";
import { existsSync } from 'fs';
import { resolve } from 'path';
dotenv.config();

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
 * Fetches all filesnames with a specific extension using the Git Tree API
 *
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
 * Verifies the integrity of the `AUTH_USERS` environment variables.
 * Ensures that every non-admin user has an associated config file in secure_assets.
 * If the security config is invalid, the build terminates.
 */
export function verifyUsersData() {
  console.log("Verifying Users Configuration...");

  // Verify AUTH_USERS exists and is valid JSON
  const authUsersEnv = process.env.AUTH_USERS!;
  if (!authUsersEnv) {
    console.error("Build Failed: Missing AUTH_USERS environment variable.");
    process.exit(1);
  }

  let authUsersKeys: string[] = [];
  try {
    const authUsers = JSON.parse(authUsersEnv);
    authUsersKeys = Object.keys(authUsers);
  } catch (e: any) {
    console.error("Build Failed: Could not parse AUTH_USERS as JSON.", e.message);
    process.exit(1);
  }

  // Load ADMIN_USERS (Optional exception list)
  let adminUsers: string[] = [];
  try {
    adminUsers = JSON.parse(process.env.ADMIN_USERS || '[]');
  } catch (e) {
    console.warn("Warning: Could not parse ADMIN_USERS. Treating as empty list.");
  }

  // Check for File Existence
  const usersMissingConfig: string[] = [];

  // Resolve path relative to project root
  const configBaseDir = resolve('secure_assets/user_configs');

  authUsersKeys.forEach(user => {
    // If user is an Admin, they have implicit wildcard access, so no config file is strictly required.
    if (adminUsers.includes(user)) {
      return;
    }

    const configPath = resolve(configBaseDir, `${user}_config.json`);

    if (!existsSync(configPath)) {
      usersMissingConfig.push(user);
    }
  });

  // Fail if any regular users are missing their config
  if (usersMissingConfig.length > 0) {
    console.error("Build Failed: The following users are in AUTH_USERS but missing a configuration file:");
    console.error(JSON.stringify(usersMissingConfig, null, 2));
    console.error(`>> Expected file path on client: secure_assets/user_configs/{username}_config.json`);
    process.exit(1);
  }

  console.log(`Security Config Verified: ${authUsersKeys.length} users checked.`);
}


