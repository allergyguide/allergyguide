// Kept free of zod so the browser bundle can import these without pulling in the schema library.
import type { CoverageStatus } from "./schema";

export const PROVINCES = [
	"BC",
	"AB",
	"SK",
	"MB",
	"ON",
	"QC",
	"NB",
	"NS",
	"PE",
	"NL",
	"YT",
	"NT",
	"NU",
	"NIHB",
] as const;

/**
 * Maps each canonical {@link CoverageStatus} value to its corresponding CSS class name used on `.tag` elements
 */
export const STATUS_CSS_MAP: Record<CoverageStatus, string> = {
	Open: "open",
	Restricted: "restricted",
	"Age-Restricted": "age-restricted",
	"Not Covered": "not-covered",
};

const PROVINCE_STORAGE_KEY = "med-province";

/**
 * Read the saved province filter. Falls back to "All" when storage is blocked (some browsers throw on access) or the saved value is not a known province
 */
export function getSavedProvince(): string {
	try {
		const saved = localStorage.getItem(PROVINCE_STORAGE_KEY);
		return saved && (PROVINCES as readonly string[]).includes(saved)
			? saved
			: "All";
	} catch {
		return "All";
	}
}

/**
 * Save the province filter; a blocked storage only loses the preference, never the render
 */
export function saveProvince(province: string): void {
	try {
		localStorage.setItem(PROVINCE_STORAGE_KEY, province);
	} catch {
		// storage blocked: keep the in-memory selection only
	}
}
