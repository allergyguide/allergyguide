// purpose: create secure_assets/ folder that can be accessed through netlify functions only
// ASSUMES: private-tools/ folder is main entry in git repo pri
// runs on build through package.json

import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ENV_VARS } from "./build-config.mjs";
import { fetchFromGithubBinary, getPathsUsingGitTree } from "./build-utils.mjs";

const SECURE_ASSETS_DIR = "secure_assets";

/**
 * Fetches secure assets from a private repo FOLDER MAIN BRANCH.
 * If 'subdir' is provided, it looks inside 'private-tools/subdir' remotely and saves to 'secure_assets/subdir' locally; all content within the subdir is flattened within 'private-tools/subdir'.
 * NOTE: at present it only accepts certain file extensions to download
 *
 * @param {string} token - PAT token
 * @param {string} repo - "username/repo"
 * @param {string | null} subdir specific subdirectory inside `private-tools` to fetch, e.g. "oit_calculator"
 */
async function syncSecureFolder(
	token: string,
	repo: string,
	subdir: string | null,
) {
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
		// Enforce directory matching by ensuring a trailing slash
		// This prevents "private-tools/oit" from matching "private-tools/oit_calculator" and prevents treating a file as a directory
		let secure_dir_path = subdir ? `private-tools/${subdir}` : "private-tools";
		if (!secure_dir_path.endsWith("/")) {
			secure_dir_path += "/";
		}

		console.log(`Scanning remote directory: ${secure_dir_path}...`);

		const extensions = [".json", ".typ", ".png", ".jpg", ".svg", ".pdf"];

		const fileListPromises = extensions.map((ext) =>
			getPathsUsingGitTree(token, repo, "main", secure_dir_path, ext),
		);

		// Wait for all lists and flatten into one array
		const results = await Promise.all(fileListPromises);
		const secure_filePaths = results.flat();

		if (secure_filePaths.length === 0) {
			throw new Error(
				`No files found in '${secure_dir_path}'. Ensure the path is a directory and contains supported files.`,
			);
		}

		console.log(`Found ${secure_filePaths.length} secure files to fetch.`);

		// Track filenames to prevent collisions
		const processedFilenames = new Set();

		// Fetch and Write
		await Promise.all(
			secure_filePaths.map(async (remotePath) => {
				const flatFilename = path.basename(remotePath);

				// COLLISION GUARD
				if (processedFilenames.has(flatFilename)) {
					throw new Error(
						`Filename Collision: '${flatFilename}' already exists. Cannot flatten.`,
					);
				}
				processedFilenames.add(flatFilename);

				// Fetch
				const content = await fetchFromGithubBinary(token, repo, remotePath);
				// Write to local build folder
				const localOutputPath = subdir
					? path.join(SECURE_ASSETS_DIR, subdir, flatFilename)
					: path.join(SECURE_ASSETS_DIR, flatFilename);

				writeFileSync(localOutputPath, content);
			}),
		);
		console.log(`Secure assets (${subdir || "root"}) downloaded.`);
	} catch (error) {
		console.error("Failed to sync secure folder:", error);
		process.exit(1);
	}
}

/**
 * Fetches ONE asset from a private repo MAIN BRANCH and directly downloads it to an optional localSubdir
 *
 * @param {string} token - PAT token
 * @param {string} repo - "username/repo"
 * @param {string | null} remotePath - relative to private-tools/, can include further nested subfolders
 * @param {string | null} localSubdir - optional subdir folder within secure_assets/ to save the file into; else the file will go at root of secure_assets
 */
async function fetchSecureFile(
	token: string,
	repo: string,
	remotePath: string | null,
	localSubdir: string | null,
) {
	if (!remotePath) {
		console.warn("fetchSecureFile: No remotePath provided. Skipping.");
		return;
	}

	// ensure root output directory exists
	if (!existsSync(SECURE_ASSETS_DIR)) {
		mkdirSync(SECURE_ASSETS_DIR, { recursive: true });
	}

	// ensure local subdirectory exists (if applicable)
	if (localSubdir) {
		const localSubdirPath = path.join(SECURE_ASSETS_DIR, localSubdir);
		if (!existsSync(localSubdirPath)) {
			mkdirSync(localSubdirPath, { recursive: true });
		}
	}

	try {
		const fullRemotePath = `private-tools/${remotePath}`;
		console.log(`Fetching remote file: ${fullRemotePath}...`);

		const content = await fetchFromGithubBinary(token, repo, fullRemotePath);
		const filename = path.basename(remotePath);

		// account if localSubdir exists
		const localOutputPath = localSubdir
			? path.join(SECURE_ASSETS_DIR, localSubdir, filename)
			: path.join(SECURE_ASSETS_DIR, filename);

		writeFileSync(localOutputPath, content);
		console.log(
			`Successfully fetched ${filename} to ${localSubdir || "root"}.`,
		);
	} catch (error) {
		console.error(`Failed to fetch secure file (${remotePath}):`, error);
		process.exit(1);
	}
}

// ==========================================
// GENERATE SECURE ASSETS ENTRY POINT
// ==========================================
console.log("\n-----CREATING SECURE_ASSETS-----");
// CLEAN OLD ASSETS
if (existsSync(SECURE_ASSETS_DIR)) {
	console.log("Cleaning old secure_assets...");
	rmSync(SECURE_ASSETS_DIR, { recursive: true, force: true });
}
console.log("\nGrabbing user configs...");
await syncSecureFolder(
	ENV_VARS.GITHUB_TOKEN,
	ENV_VARS.GITHUB_REPO,
	"user_configs",
);
console.log("\nGrabbing oit_calculator assets...");
await syncSecureFolder(
	ENV_VARS.GITHUB_TOKEN,
	ENV_VARS.GITHUB_REPO,
	"oit_calculator",
);
await fetchSecureFile(
	ENV_VARS.GITHUB_TOKEN,
	ENV_VARS.GITHUB_REPO,
	"foods/meta.json",
	"shared-tool-assets",
);
console.log("---------------------------\n");
