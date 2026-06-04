import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import type { Handler, HandlerResponse } from "@netlify/functions";
import { authenticateUser } from "./_lib/auth.mts";
import { HttpError } from "./_lib/utils.mts";

/**
 * Handles initial data load for the OFC index tool for authenticated users
 */
export const handler: Handler = async (event): Promise<HandlerResponse> => {
	try {
		const decoded = await authenticateUser(event);
		const uuid = decoded.uuid;

		const secureRoot = resolve("./secure_assets");
		const configPath = resolve(secureRoot, `user_configs/${uuid}_config.json`);

		// A. Read User Config
		let configRaw: string;
		try {
			configRaw = await fs.readFile(configPath, "utf-8");
		} catch {
			throw new HttpError("Forbidden: User configuration not found", 403);
		}
		const userConfig = JSON.parse(configRaw);

		if (!userConfig.tools?.ofc_index) {
			console.warn(`User ${uuid} logged in but lacks config for this tool.`);
			throw new HttpError("Forbidden: No OFC index Configuration found", 403);
		}
		const ofcConfig = userConfig.tools?.ofc_index;

		// B. Read Provisioned Foods
		const readSecureFiles = async (paths: string[]) => {
			if (paths?.length === 0 || !Array.isArray(paths)) return [];

			const results = await Promise.all(
				paths.map(async (p) => {
					if (!p) return [];

					const fullPath = resolve(secureRoot, p);
					if (!fullPath.startsWith(secureRoot)) {
						throw new HttpError(`Invalid asset path: ${p}`, 400);
					}
					try {
						const content = await fs.readFile(fullPath, "utf-8");
						const parsed = JSON.parse(content);

						// Handle envelope structure { metadata: ..., data: [...] }
						// This occurs this is brand_foods.json
						// Again, potentially brittle heuristic
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
						console.error(`Failed to load asset ${p} for ${uuid}:`, e);
						return [];
					}
				}),
			);
			return results.flat();
		};

		const provisioned_foods = await readSecureFiles(
			ofcConfig.provisioned_foods,
		);

		const responseData = {
			uuid: uuid,
			email: decoded.email,
			provisioned_foods: provisioned_foods,
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
			console.error("Unhandled Server Error during OFC index bootstrap:", err);
			return {
				statusCode: 500,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ message: "Bootstrap failed" }),
			};
		}
	}
};
