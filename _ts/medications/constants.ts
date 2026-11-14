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

/** Event sent on `document` whenever the province filter changes; every index and island listens for it */
export const PROVINCE_EVENT = "med-province-changed";

/**
 * Change the province filter everywhere on the page: saves it, then notifies every listener (index and islands), which re-render
 */
export function setProvince(province: string): void {
	saveProvince(province);
	document.dispatchEvent(
		new CustomEvent<string>(PROVINCE_EVENT, { detail: province }),
	);
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
