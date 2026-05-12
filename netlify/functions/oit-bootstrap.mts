import type { Handler, HandlerResponse } from "@netlify/functions";
import { resolve } from "path";
import { promises as fs } from "fs";
import { authenticateUser } from "./_lib/auth.mts";
import { HttpError } from "./_lib/utils.mts";

// 1. Read `user_configs/${user.username}_config.json`
// 2. Ensure userConfig.tools.oit_calculator exists
// 3. Read foodsPath and protocolsPath in parallel (Promise.all)
// 4. Return the aggregated JSON payload
export const handler: Handler = async (event) => {
	try {
		const decoded = authenticateUser(event);
		const username = decoded.username;

		const secureRoot = resolve("./secure_assets");
		const configPath = resolve(
			secureRoot,
			`user_configs/${username}_config.json`,
		);

		// A. Read User Config
		let configRaw;
		try {
			configRaw = await fs.readFile(configPath, "utf-8");
		} catch (err) {
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

		// path traversal security check
		const foodsPath = resolve(secureRoot, oitConfig.provisioned_foods);
		if (!foodsPath.startsWith(secureRoot))
			throw new HttpError("Invalid provisioned foods path", 400);
		const protocolsPath = resolve(secureRoot, oitConfig.provisioned_protocols);
		if (!protocolsPath.startsWith(secureRoot))
			throw new HttpError("Invalid provisioned protocols path", 400);

		const [foodsRaw, protocolsRaw] = await Promise.all([
			fs.readFile(foodsPath, "utf-8").catch((e) => {
				console.error(`Failed to load foods for ${username}:`, e);
				return "[]";
			}),
			fs.readFile(protocolsPath, "utf-8").catch((e) => {
				console.error(`Failed to load protocols for ${username}:`, e);
				return "[]";
			}),
		]);

		const responseData = {
			username: username,
			provisioned_foods: JSON.parse(foodsRaw),
			provisioned_protocols: JSON.parse(protocolsRaw),
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
