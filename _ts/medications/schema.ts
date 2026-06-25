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

const CoverageSchema = z.object({
	province: z.string(),
	status: z.string(),
	details: z.string(),
});

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
