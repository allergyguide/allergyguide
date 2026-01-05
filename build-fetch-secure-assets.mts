// purpose: create secure_assets/ folder that can be accessed through netlify functions only
// ASSUMES: private-tools/ folder is main entry in git repo pri
// runs on build

import { getPathsUsingGitTree, fetchFromGithubBinary } from './build-utils.mjs';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import dotenv from "dotenv";
dotenv.config({ override: true });

const SECURE_ASSETS_DIR = 'secure_assets';

// NETLIFY ENV VARS
const GITHUB_TOKEN = process.env.PRIVATE_TOKEN;
const GITHUB_REPO = `${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}`;   // e.g., "username/repo-name"
if (!GITHUB_REPO || !GITHUB_TOKEN) {
  console.error("No GitHub repo or token found. Check netlify settings")
  process.exit(1);
}

/**
 * Fetches secure assets from a private repo folder.
 * If 'subdir' is provided, it looks inside 'private-tools/subdir' remotely and saves to 'secure_assets/subdir' locally; all content within the subdir is flattened within 'private-tools/subdir'.
 *
 * @param {string} token - PAT token
 * @param {string} repo - "username/repo"
 * @param {string | null} subdir specific subdirectory inside `private-tools` to fetch, e.g. "oit_calculator"
 */
async function generateSecureAssets(token: string, repo: string, subdir: string | null) {
  // ensure root output directory exists
  if (!existsSync(SECURE_ASSETS_DIR)) {
    mkdirSync(SECURE_ASSETS_DIR, { recursive: true });
  }

  // ensure local subdirectory exists (if applicable)
  if (subdir) {
    const localSubdirPath = path.join(SECURE_ASSETS_DIR, subdir);
    if (!existsSync(localSubdirPath)) {
      mkdirSync(localSubdirPath, { recursive: true });
    }
  }

  try {
    const secure_dir_path = subdir ? `private-tools/${subdir}` : "private-tools";
    console.log(`Scanning remote: ${secure_dir_path}...`);

    const extensions = [".json", ".typ", ".png", ".jpg", ".svg"];

    const fileListPromises = extensions.map(ext =>
      getPathsUsingGitTree(token, repo, "main", secure_dir_path, ext)
    );

    // Wait for all lists and flatten into one array
    const results = await Promise.all(fileListPromises);
    const secure_filePaths = results.flat();
    console.log(`Found ${secure_filePaths.length} secure files to fetch.`);

    // Track filenames to prevent collisions
    const processedFilenames = new Set();

    // Fetch and Write
    for (const remotePath of secure_filePaths) {
      const flatFilename = path.basename(remotePath);

      // COLLISION GUARD
      if (processedFilenames.has(flatFilename)) {
        throw new Error(`Filename Collision: '${flatFilename}' already exists. Cannot flatten.`);
      }
      processedFilenames.add(flatFilename);

      // Fetch
      // Note that images should be fetched as buffers
      const content = await fetchFromGithubBinary(token, repo, remotePath);
      // Write to local build folder
      const localOutputPath = subdir
        ? path.join(SECURE_ASSETS_DIR, subdir, flatFilename)
        : path.join(SECURE_ASSETS_DIR, flatFilename);

      writeFileSync(localOutputPath, content);
    }

    console.log(`Secure assets (${subdir || 'root'}) downloaded.`);

  } catch (error) {
    console.error("Failed to generate secure assets:", error.message);
    process.exit(1);
  }
}

// ==========================================
// GENERATE SECURE ASSETS ENTRY POINT
// ==========================================
await generateSecureAssets(GITHUB_TOKEN, GITHUB_REPO, "user_configs");
await generateSecureAssets(GITHUB_TOKEN, GITHUB_REPO, "oit_calculator");

