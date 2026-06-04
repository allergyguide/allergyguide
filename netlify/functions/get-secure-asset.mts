/**
 * @module
 * Serverless function to serve protected assets (JSON/PDF) securely.
 */

import { promises as fs } from "node:fs";
import { normalize, resolve } from "node:path";
import type { Handler, HandlerResponse } from "@netlify/functions";
import { authenticateUser, type UserToken } from "./_lib/auth.mts";
import { getAllFilePaths, HttpError } from "./_lib/utils.mts";

/**
 * Netlify Function: Secure Asset Handler
 * Serves private assets (.jsons, .pdfs) from within a protected directory secure_assets/ which is built during build-time
 * NOTE: ONLY WORKS FOR JSONS AND PDFS AT THIS TIME.
 *
 * It authenticates the user via their Supabase access token and checks specific file permissions before serving the content
 * @param event - The Netlify event object containing headers and query parameters
 * @returns A response containing the base64 encoded file or an error status
 */
export const handler: Handler = async (event) => {
	let uuid = "";

	try {
		const decoded = (await authenticateUser(event)) as UserToken;
		uuid = decoded.uuid;
	} catch (err) {
		if (err instanceof HttpError) {
			return {
				statusCode: err.statusCode,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ message: err.message }),
			};
		} else {
			// would be very odd if this were to run
			console.error("Unhandled Server Error:", err);
			return {
				statusCode: 500,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ message: "Internal Server Error" }),
			};
		}
	}

	// PARSE REQUESTED FILENAME, AND MAKE SURE IT'S VALID
	// Normalize it too
	let filename = event.queryStringParameters?.file;
	if (!filename || filename.includes("..") || filename.includes("\\")) {
		return {
			statusCode: 400,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ message: "Invalid filename" }),
		};
	}
	filename = normalize(filename);

	// CHANGE FILENAME IF GENERIC `me.json` REQUESTED TO GRAB USER CONFIG
	// MAP TO USER UUID
	if (filename === "me.json") {
		filename = `user_configs/${uuid}_config.json`;
	}

	// AUTHORIZATION LOGIC JIT
	// ------------------------
	let hasAccess = false;

	// everyone should have access to their own config file
	if (filename === `user_configs/${uuid}_config.json`) {
		hasAccess = true;
	}
	// Check permissions
	else {
		let permissions: string[] = [];
		try {
			const configPath = resolve(
				`./secure_assets/user_configs/${uuid}_config.json`,
			);
			const configRaw = await fs.readFile(configPath, "utf-8");
			const userConfig = JSON.parse(configRaw);

			// Flatten config to just a list of allowed paths
			permissions = Array.from(getAllFilePaths(userConfig));

			// now check
			if (permissions.includes(filename)) {
				hasAccess = true;
			}
		} catch (e) {
			console.error(`Could not load config for ${uuid} during login:`, e);
			return {
				statusCode: 403,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					message: `Could not load config for ${uuid} during login.`,
				}),
			};
		}

		// if no permission for the file...
		if (!hasAccess) {
			console.log(`User ${uuid} denied access to ${filename}`);
			return {
				statusCode: 403,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ message: "Forbidden: Access Denied" }),
			};
		}
	}

	// ============================================================
	// RESOLVE AND SERVE FILE
	// ============================================================

	// RESOLVE FILE PATH
	try {
		const secureRoot = resolve("./secure_assets");
		// Resolve the full path of the requested file
		const filePath = resolve(secureRoot, filename);

		// security check
		if (!filePath.startsWith(secureRoot)) {
			console.error(`Path traversal attempt by ${uuid}: ${filename}`);
			return {
				statusCode: 403,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ message: "Forbidden" }),
			};
		}

		// Check existence asynchronously
		try {
			await fs.access(filePath);
		} catch {
			return {
				statusCode: 404,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ message: "File not found" }),
			};
		}

		// file exists, so serve file as b64
		const ext = filename.split(".").pop()?.toLowerCase();
		const contentTypes: Record<string, string> = {
			pdf: "application/pdf",
			json: "application/json",
			png: "image/png",
			jpg: "image/jpeg",
			jpeg: "image/jpeg",
			svg: "image/svg+xml",
		};
		const contentType = contentTypes[ext || ""] || "application/octet-stream";
		let cacheControl = "private, no-cache, no-store, must-revalidate"; // Default
		// Allow limited caching for PDFs (Static Handouts)
		if (ext === "pdf") {
			// "private" = specific to this user (don't put on shared CDN)
			// "max-age=3600" = keep in browser RAM/Disk for 1 hour
			cacheControl = "private, max-age=3600";
		}

		// read and return
		const fileBuffer = await fs.readFile(filePath);
		return {
			statusCode: 200,
			headers: {
				"Content-Type": contentType,
				"Content-Disposition": `inline; filename="${filename}"`,
				"Cache-Control": cacheControl,
			},
			body: fileBuffer.toString("base64"),
			isBase64Encoded: true,
		} as HandlerResponse;
	} catch (err) {
		console.error(`Error serving file ${filename}:`, err);
		return {
			statusCode: 500,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ message: "Internal Server Error" }),
		};
	}
};
