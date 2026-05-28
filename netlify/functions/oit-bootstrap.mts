import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import type { Handler, HandlerResponse } from "@netlify/functions";
import { authenticateUser } from "./_lib/auth.mts";
import { HttpError } from "./_lib/utils.mts";

/**
 * Handles initial data load for users who login succesfully
 *
 * Handles authentication, reads the user's specific configuration file, and aggregates their provisioned foods and protocols into a single JSON response.
 *
 * - Requires a valid JWT session cookie.
 * - Prevents path traversal attacks when resolving asset paths.
 * - Returns strictly non-cacheable headers for sensitive patient data arrays.
 *
 * @param event - The incoming Netlify serverless request event containing headers and cookies.
 * @returns {Promise<HandlerResponse>} A formatted HTTP response containing the aggregated tool data.
 * * HTTP Response Codes:
 * - `200 OK`: Successfully aggregated and returned the user's tools data.
 * - `400 Bad Request`: If the provisioned paths in the user config attempt path traversal.
 * - `401 Unauthorized`: If the user lacks a valid session cookie.
 * - `403 Forbidden`: If the user config is missing, or lacks explicit permissions for the OIT tool.
 * - `500 Internal Server Error`: For unexpected system or file-read failures.
 */
export const handler: Handler = async (event): Promise<HandlerResponse> => {
	try {
		const decoded = authenticateUser(event);
		const username = decoded.username;

		const secureRoot = resolve("./secure_assets");
		const configPath = resolve(
			secureRoot,
			`user_configs/${username}_config.json`,
		);

		// A. Read User Config
		let configRaw: string;
		try {
			configRaw = await fs.readFile(configPath, "utf-8");
		} catch {
			throw new HttpError("Forbidden: User configuration not found", 403);
		}
		const userConfig = JSON.parse(configRaw);

		if (!userConfig.tools?.oit_calculator) {
			console.warn(
				`User ${username} logged in but lacks oit_calculator config.`,
			);
			throw new HttpError("Forbidden: No OIT Configuration found", 403);
		}

		const oitConfig = userConfig.tools.oit_calculator;

		// B. Read Assets Parallel
		// Use catch() to return empty array if a specific file is missing/broken
		const readSecureFiles = async (paths: string[]) => {
			if (paths?.length === 0 || !Array.isArray(paths)) return [];

			const results = await Promise.all(
				paths.map(async (p) => {
					if (!p) return []; // skip empty "" within array

					const fullPath = resolve(secureRoot, p);
					// path traversal security check
					if (!fullPath.startsWith(secureRoot)) {
						throw new HttpError(`Invalid asset path: ${p}`, 400);
					}
					try {
						const content = await fs.readFile(fullPath, "utf-8");
						const parsed = JSON.parse(content);

						// Check if the parsed JSON is an envelope { metadata: ..., data: [...] } in the case this is the brand_foods.json
						// NOTE: THIS IS A POTENTIALLY BRITTLE HEURISTIC
						if (
							parsed &&
							typeof parsed === "object" &&
							!Array.isArray(parsed) &&
							parsed.metadata &&
							"schema_version" in parsed.metadata &&
							Array.isArray(parsed.data)
						) {
							return parsed.data;
						}

						return parsed;
					} catch (e) {
						console.error(`Failed to load asset ${p} for ${username}:`, e);
						return [];
					}
				}),
			);
			return results.flat();
		};

		const [provisioned_foods, provisioned_protocols] = await Promise.all([
			readSecureFiles(oitConfig.provisioned_foods),
			readSecureFiles(oitConfig.provisioned_protocols),
		]);

		const responseData = {
			username: username,
			provisioned_foods: provisioned_foods,
			provisioned_protocols: provisioned_protocols,
			handouts: oitConfig.handouts || [],
		};

		return {
			statusCode: 200,
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "private, no-cache, no-store, must-revalidate",
			},
			body: JSON.stringify(responseData),
		} as HandlerResponse;
	} catch (err) {
		if (err instanceof HttpError) {
			return {
				statusCode: err.statusCode,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ message: err.message }),
			};
		} else {
			console.error(
				"Unhandled Server Error during OIT calculator bootstrap:",
				err,
			);
			return {
				statusCode: 500,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ message: "Bootstrap failed" }),
			};
		}
	}
};
