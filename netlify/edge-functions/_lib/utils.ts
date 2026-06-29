/**
 * Error class for handling HTTP-specific exceptions in serverless functions
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

/** Known secure-asset file extensions. Used to identify path strings in config objects */
const SECURE_ASSET_EXTENSIONS = new Set([
	"json",
	"pdf",
	"png",
	"jpg",
	"jpeg",
	"svg",
	"typ",
]);

// Helper to check if a string is a blob key (i.e. a file path with a known extension)
const isFilePath = (str: string): boolean => {
	const ext = str.split(".").pop()?.toLowerCase();
	return ext !== undefined && SECURE_ASSET_EXTENSIONS.has(ext);
};

/**
 * Normalizes a blob key by collapsing duplicate slashes and stripping a leading slash.
 */
export function normalizeBlobKey(str: string): string {
	return str.replace(/\/\/+/g, "/").replace(/^\//, "");
}

/**
 * Recursively traverses an arbitrary configuration object (JSON) to collect all strings that appear to be file paths
 * It normalizes paths (e.g., resolving '//') to ensure consistent comparison against requested blob keys
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
		if (isFilePath(config)) {
			paths.add(normalizeBlobKey(config));
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
