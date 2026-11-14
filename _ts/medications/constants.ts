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
