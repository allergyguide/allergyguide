import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { getBlobStore } from "./build-config.mjs";

function getAllLocalFiles(
	dirPath: string,
	arrayOfFiles: string[] = [],
): string[] {
	const files = readdirSync(dirPath);

	for (const file of files) {
		const fullPath = path.join(dirPath, file);
		if (statSync(fullPath).isDirectory()) {
			arrayOfFiles = getAllLocalFiles(fullPath, arrayOfFiles);
		} else {
			arrayOfFiles.push(fullPath);
		}
	}

	return arrayOfFiles;
}

export async function pruneBlobs() {
	console.log("Checking for orphaned blobs...");
	const store = getBlobStore();

	// Get all local files and convert to blob keys
	const localKeys = new Set<string>();
	if (existsSync("secure_assets")) {
		const localFiles = getAllLocalFiles("secure_assets");
		for (const file of localFiles) {
			// Convert local file paths (which could have OS-specific separators) to standard blob keys
			const normalizedPath = file.replace(/\\/g, "/");
			const blobKey = normalizedPath.replace(/^secure_assets\//, "");
			localKeys.add(blobKey);
		}
	}

	try {
		// Fetch all blobs currently in the remote store
		const { blobs } = await store.list();

		if (!blobs || !Array.isArray(blobs)) {
			console.log("No blobs found or error listing blobs.");
			return;
		}

		// Compare and delete
		let deletedCount = 0;
		for (const blob of blobs) {
			if (!localKeys.has(blob.key)) {
				console.log(`Deleting orphaned blob: ${blob.key}`);
				await store.delete(blob.key);
				deletedCount++;
			}
		}

		if (deletedCount === 0) {
			console.log(
				"No orphaned blobs to prune. Blob store is perfectly synced!",
			);
		} else {
			console.log(`Successfully pruned ${deletedCount} orphaned blob(s).`);
		}
	} catch (e) {
		console.error("Failed to prune orphaned blobs:", e);
	}
}
