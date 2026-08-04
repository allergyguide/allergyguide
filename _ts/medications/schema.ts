import { z } from "zod";

export const DoseAdjustmentSchema = z.object({
	condition: z.string(),
	dose: z.string(),
});
export type DoseAdjustment = z.infer<typeof DoseAdjustmentSchema>;

export const DoseSchema = z.object({
	indication: z.string(),
	off_label: z.boolean().optional().default(false),
	patient_age: z.string(),
	patient_weight: z.string().optional(),
	dose: z.string(),
	notes: z.string().optional(),
	sample_rx: z.string().optional(),
	adjustments: z.array(DoseAdjustmentSchema).optional().default([]),
});
export type Dose = z.infer<typeof DoseSchema>;

const SideEffectRateSchema = z.object({
	indication: z.string(),
	drug: z.string(),
	comparator: z.string().optional(),
});

const SideEffectSchema = z.object({
	symptom: z.string(),
	comparator_name: z.string().optional(),
	notes: z.string().optional(),
	rates: z.array(SideEffectRateSchema).optional().default([]),
});

export const CoverageStatusEnum = z.enum([
	"Open",
	"Restricted",
	"Age-Restricted",
	"Not Covered",
]);

export const ProvinceEnum = z.enum([
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
]);

const stringOrArray = z
	.union([z.string(), z.array(z.string())])
	.transform((val) => (Array.isArray(val) ? val : [val]));

const provinceOrArray = z
	.union([ProvinceEnum, z.array(ProvinceEnum)])
	.transform((val) => (Array.isArray(val) ? val : [val]));

/**
 * Coverage rules for a medication
 *
 * - If `province` is omitted, the rule applies to all provinces
 * - If `indication` is omitted, the rule applies to all indications
 * - Omitting *both* is intentional and means the rule applies universally
 *   (e.g. a medication that is not covered anywhere, regardless of indication)
 *
 * Multiple provinces or indications can be grouped into one rule by providing
 * an array — e.g. `province = ["BC", "AB"]`.
 */
export const CoverageSchema = z.object({
	indication: stringOrArray.optional(),
	province: provinceOrArray.optional(),
	status: CoverageStatusEnum,
	tips: z.string().optional(),
});
export type MedicationCoverage = z.infer<typeof CoverageSchema>;
export type CoverageStatus = z.infer<typeof CoverageStatusEnum>;

/**
 * Maps each canonical {@link CoverageStatus} value to its corresponding CSS * class name used on `.tag` elements
 */
export const STATUS_CSS_MAP: Record<CoverageStatus, string> = {
	Open: "open",
	Restricted: "restricted",
	"Age-Restricted": "age-restricted",
	"Not Covered": "not-covered",
};

export const MedicationSchema = z.object({
	draft: z.boolean().default(false),
	display_name: z.string(),
	categories: z.array(z.string()).default([]),
	otc: z.enum(["yes", "no", "both"]),
	abbreviations: z.string().optional(),
	authors: z
		.object({
			primary: z.string().optional(),
			editors: z.string().optional(),
			staff: z.string().optional(),
		})
		.optional(),

	brand_names: z.array(z.string()).optional().default([]),
	moa: z.string(),
	ix_before: z.string().optional(),
	ix_ongoing: z.string().optional(),
	available_forms: z.array(z.string()).optional().default([]),
	contraindications: z.string().optional(),
	interactions_summary: z.string().optional(),
	severe_interactions: z.string().optional(),
	pearls: z.array(z.string()).optional().default([]),

	pregnancy: z.string(),
	half_life: z.string().optional(),
	monograph_links: z.array(z.string()).optional().default([]),

	doses: z.array(DoseSchema).optional().default([]),

	side_effects_summary: z.string(),
	severe_side_effects: z.string().optional(),
	side_effects_source: z.string().optional(),
	side_effects: z.array(SideEffectSchema).optional().default([]),

	estimated_cost: z.string().optional(),
	coverage: z.array(CoverageSchema).optional().default([]),
});

export type Medication = z.infer<typeof MedicationSchema>;
export type MedicationDatabase = Record<string, Medication>;
