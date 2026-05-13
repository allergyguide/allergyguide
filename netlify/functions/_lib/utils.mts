import { normalize } from "node:path";

/**
 * Error class for handling HTTP-specific exceptions in serverless functions.
 */
export class HttpError extends Error {
	public statusCode: number;

	constructor(message: string, statusCode: number) {
		super(message);
		this.statusCode = statusCode;
		this.name = "HttpError";

		Object.setPrototypeOf(this, HttpError.prototype);
	}
}

// Helper to check if a value is a likely file path
const isFilePath = (str: string) => str.includes("/") || str.includes(".");

/**
 * Recursively traverses an arbitrary configuration object (JSON) to collect all strings that appear to be file paths
 * It normalizes paths (e.g., resolving 'foo//bar' to 'foo/bar') to ensure consistent comparison against requested filenames.
 *
 * @param config - The user configuration object (can be string, array, or nested object)
 * @param paths - An accumulator Set used during recursion. Defaults to a new Set
 * @returns A Set containing all unique, normalized file paths found within the config
 */
export function getAllFilePaths(
	config: unknown,
	paths: Set<string> = new Set(),
): Set<string> {
	if (typeof config === "string") {
		// Normalize the path (resolves '..', '//', and converts slashes for OS)
		if (isFilePath(config)) {
			paths.add(normalize(config));
		}
	} else if (Array.isArray(config)) {
		for (const item of config) {
			getAllFilePaths(item, paths);
		}
	} else if (config && typeof config === "object") {
		for (const val of Object.values(config)) {
			getAllFilePaths(val, paths);
		}
	}
	return paths;
}

// Helper to escape HTML characters in user input (prevents broken layout/injection)
export function escapeHtml(unsafe: string): string {
	if (!unsafe) return "";
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}
