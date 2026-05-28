/**
 * @module
 *
 * Collection of utility functions
 */
import Decimal from "decimal.js";
import { LIQUID_RESOLUTION, SOLID_RESOLUTION } from "./constants";
import {
	DosingStrategy,
	type Food,
	FoodAStrategy,
	type FoodData,
	FoodType,
	Method,
	type NumberLike,
	type Protocol,
	type ProtocolData,
	type RowData,
	SourceType,
	type Unit,
} from "./types";

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Escape a string for safe HTML insertion.
 *
 * Escapes the five critical characters (&, <, >, ", ') to their HTML entities.
 * Use this before inserting any user-provided content into the DOM via innerHTML or template literals. Safe for repeated calls (idempotent).
 *
 * Side effects: none (pure)
 *
 * @param unsafe Untrusted string that may contain HTML/JS
 * @returns Escaped string safe to render as text content
 * @example
 * // => "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
 * escapeHtml('<script>alert("xss")</script>');
 */
export function escapeHtml(unsafe: string): string {
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

/**
 * Format a numeric value with fixed decimal places.
 *
 * Accepts native numbers or Decimal-like objects exposing toNumber().
 * Returns an empty string for null/undefined to simplify templating.
 *
 * @param value Number or Decimal to format
 * @param decimals Number of fractional digits to render
 * @returns Formatted string (or "" for nullish input)
 */
export function formatNumber(
	value: NumberLike | null | undefined,
	decimals: number,
): string {
	if (value === null || value === undefined) return "";

	let num: number;
	if (typeof value === "number") {
		num = value;
	} else if (typeof value === "string") {
		num = Number.parseFloat(value);
	} else {
		// Assume Decimal object
		num = value.toNumber();
	}

	return Number.isNaN(num) ? "" : num.toFixed(decimals);
}

/**
 * Format a patient-measured amount based on its unit.
 *
 * @remarks
 * - For grams (g): fixed to SOLID_RESOLUTION decimals
 * - For milliliters (ml): integer when whole, otherwise LIQUID_RESOLUTION
 * - For capsules: returns empty string (dummy value)
 *
 * @param value Amount to format (g/ml)
 * @param unit Measuring unit: "g" or "ml" or "capsule"
 * @returns Formatted string, for example 0.1, or 0.12
 */
export function formatAmount(
	value: NumberLike | null | undefined,
	unit: Unit,
): string {
	if (value === null || value === undefined) return "";
	if (unit === "capsule") return ""; // Dummy value for capsules is not shown

	let num: number;
	if (typeof value === "number") {
		num = value;
	} else if (typeof value === "string") {
		num = Number.parseFloat(value);
	} else {
		// Assume Decimal object
		num = value.toNumber();
	}

	if (Number.isNaN(num)) return "";

	if (unit === "g") {
		return num.toFixed(SOLID_RESOLUTION);
	} else {
		// ml - integer or the LIQUID_RESOLUTION
		return num % 1 === 0 ? num.toFixed(0) : num.toFixed(LIQUID_RESOLUTION);
	}
}

/**
 * Get the measuring unit for a food by its form.
 *
 * @param food Food that has to contain a `type` field of type `FoodType`
 * @returns "g" for SOLID; "ml" for LIQUID; "capsule" for CAPSULE
 */
export function getMeasuringUnit(food: { type: FoodType }): Unit {
	if (food.type === FoodType.LIQUID) {
		return "ml";
	} else if (food.type === FoodType.CAPSULE) {
		return "capsule";
	} else {
		return "g";
	}
}

/**
 * Get the absolute percentage difference between a test value and a base reference value.
 * @param test - the value being evaluated.
 * @param base - the reference value used as the denominator
 * @returns Decimal obj representing the percentage difference (e.g., 0.1 = 10%)
 */
export function findPercentDifference(test: Decimal, base: Decimal): Decimal {
	return test.dividedBy(base).minus(1).abs();
}

/**
 * Serializes the runtime Protocol object + custom notes into the clean ProtocolData JSON schema suitable for export/email.
 */
export function serializeProtocol(
	protocol: Protocol,
	notes: string,
): ProtocolData {
	// Map steps to RowData
	const table: RowData[] = protocol.steps.map((step) => {
		// Resolve the food source for this specific step
		const stepFood = step.food === "A" ? protocol.foodA : protocol.foodB;

		// Invariant: step.food B should only exist if protocol.foodB is defined
		if (!stepFood) {
			throw new Error(`Step referenced Food ${step.food} which is undefined`);
		}

		const measureUnit: Unit = getMeasuringUnit(stepFood);

		const base = {
			food: step.food,
			protein: step.targetMg.toNumber(),
		};

		if (step.method === Method.DIRECT) {
			return {
				...base,
				method: "DIRECT",
				daily_amount: Number(
					formatAmount(step.dailyAmount, step.dailyAmountUnit),
				),
			};
		} else if (step.method === Method.CAPSULE) {
			return {
				...base,
				method: "CAPSULE",
			};
		} else {
			// DILUTE
			if (
				step.mixFoodAmount === undefined ||
				step.mixWaterAmount === undefined
			) {
				throw new Error("Dilution step missing mix amounts");
			}
			return {
				...base,
				method: "DILUTE",
				daily_amount: Number(
					formatAmount(step.dailyAmount, step.dailyAmountUnit),
				),
				mix_amount: Number(formatAmount(step.mixFoodAmount, measureUnit)),
				water_amount: Number(formatAmount(step.mixWaterAmount, "ml")),
			};
		}
	});

	// Construct ProtocolData
	const data: ProtocolData = {
		name: "Custom Protocol Request", // Default name for the request
		dosing_strategy: protocol.dosingStrategy,
		food_a: {
			type: protocol.foodA.type,
			name: protocol.foodA.name,
			gramsInServing: protocol.foodA.gramsInServing.toNumber(),
			servingSize: protocol.foodA.servingSize.toNumber(),
			source: protocol.foodA.source,
			...(protocol.foodA.id !== undefined && { id: protocol.foodA.id }),
			...(protocol.foodA.source_url !== undefined && {
				source_url: protocol.foodA.source_url,
			}),
			...(protocol.foodA.keywords !== undefined && {
				keywords: protocol.foodA.keywords,
			}),
			...(protocol.foodA.last_updated !== undefined && {
				last_updated: protocol.foodA.last_updated,
			}),
			...(protocol.foodA.is_active !== undefined && {
				is_active: protocol.foodA.is_active,
			}),
		} as FoodData,
		food_a_strategy: protocol.foodAStrategy,
		di_threshold: protocol.diThreshold.toNumber(),
		table: table,
		custom_note: notes,
	};

	// Add Food B if present
	if (protocol.foodB) {
		data.food_b = {
			type: protocol.foodB.type,
			name: protocol.foodB.name,
			gramsInServing: protocol.foodB.gramsInServing.toNumber(),
			servingSize: protocol.foodB.servingSize.toNumber(),
			source: protocol.foodB.source,
			...(protocol.foodB.id !== undefined && { id: protocol.foodB.id }),
			...(protocol.foodB.source_url !== undefined && {
				source_url: protocol.foodB.source_url,
			}),
			...(protocol.foodB.keywords !== undefined && {
				keywords: protocol.foodB.keywords,
			}),
			...(protocol.foodB.last_updated !== undefined && {
				last_updated: protocol.foodB.last_updated,
			}),
			...(protocol.foodB.is_active !== undefined && {
				is_active: protocol.foodB.is_active,
			}),
		} as FoodData;
	}

	if (protocol.foodBThreshold) {
		data.food_b_threshold = protocol.foodBThreshold.amount.toNumber();
	}

	return data;
}

/**
 * Safely parses a string input into a Decimal.
 * Handles NaN by returning a default value.
 * Clamps the value to be at least the minimum.
 *
 * @param input - The string to parse
 * @param defaultValue - Value to return if parsing fails
 * @param min - Minimum allowed value (default 0)
 */
export function parseSafeDecimal(
	input: string,
	defaultValue: Decimal,
	min: number = 0,
): Decimal {
	if (!input || input.trim() === "") return defaultValue;
	try {
		const val = new Decimal(input);
		if (val.isNaN()) return defaultValue;
		const minimum = new Decimal(min);
		return val.lessThan(minimum) ? minimum : val;
	} catch {
		return defaultValue;
	}
}

/**
 * Generates a stable UUID-like ID, safely falling back if crypto.randomUUID is unavailable.
 * This ensures the calculator functions in non-secure contexts (HTTP) often found in clinical intranets.
 */
export function generateUniqueId(): string {
	const cryptoObj =
		typeof globalThis !== "undefined" ? globalThis.crypto : null;

	// Preferred: modern standard
	if (typeof cryptoObj?.randomUUID === "function") {
		return cryptoObj.randomUUID();
	}

	// Strong fallback using Web Crypto
	if (typeof cryptoObj?.getRandomValues === "function") {
		const bytes = cryptoObj.getRandomValues(new Uint8Array(16));

		// UUID v4 format compliance
		bytes[6] = (bytes[6] & 0x0f) | 0x40;
		bytes[8] = (bytes[8] & 0x3f) | 0x80;

		// Build the hex string directly to avoid heavy array allocations
		let hex = "";
		for (let i = 0; i < 16; i++) {
			hex += bytes[i].toString(16).padStart(2, "0");
		}

		return (
			hex.substring(0, 8) +
			"-" +
			hex.substring(8, 12) +
			"-" +
			hex.substring(12, 16) +
			"-" +
			hex.substring(16, 20) +
			"-" +
			hex.substring(20)
		);
	}

	// Last resort
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

/**
 * Hydrates a FoodData object into a Food object.
 *
 * @param foodData The FoodData object to hydrate.
 * @returns The hydrated Food object.
 */
export function hydrateFoodData(foodData: FoodData): Food {
	const isCurated =
		foodData.source === SourceType.BRAND ||
		foodData.source === SourceType.PROVISIONED;
	return {
		name: foodData.name,
		type: foodData.type,
		gramsInServing: new Decimal(foodData.gramsInServing),
		servingSize: new Decimal(foodData.servingSize),
		getMgPerUnit: function () {
			return this.gramsInServing.times(1000).dividedBy(this.servingSize);
		},
		source: foodData.source,
		id:
			isCurated || foodData.source === SourceType.USER
				? foodData.id
				: undefined,
		source_url:
			foodData.source === SourceType.BRAND ? foodData.source_url : undefined,
		keywords: foodData.keywords,
		last_updated: isCurated ? foodData.last_updated : undefined,
		is_active: isCurated ? foodData.is_active : undefined,
	};
}

export const SAMPLE_PROTOCOL: ProtocolData = {
	name: "Almond milk to whole almonds",
	dosing_strategy: DosingStrategy.STANDARD,
	food_a: {
		type: FoodType.LIQUID,
		name: "Almond Milk",
		gramsInServing: 5,
		servingSize: 250,
		source: SourceType.GENERIC,
	},
	food_a_strategy: FoodAStrategy.DILUTE_INITIAL,
	di_threshold: 0.5,
	food_b: {
		type: FoodType.SOLID,
		name: "Almonds (dry roasted, unblanched)",
		gramsInServing: 21,
		servingSize: 100,
		source: SourceType.GENERIC,
	},
	food_b_threshold: 0.4,
	table: [
		{
			food: "A",
			protein: 1,
			method: "DILUTE",
			daily_amount: 1,
			mix_amount: 1,
			water_amount: 19,
		},
		{
			food: "A",
			protein: 2.5,
			method: "DILUTE",
			daily_amount: 1,
			mix_amount: 1,
			water_amount: 7,
		},
		{
			food: "A",
			protein: 5,
			method: "DILUTE",
			daily_amount: 1,
			mix_amount: 1,
			water_amount: 3,
		},
		{
			food: "A",
			protein: 10,
			method: "DIRECT",
			daily_amount: 0.5,
		},
		{
			food: "A",
			protein: 20,
			method: "DIRECT",
			daily_amount: 1,
		},
		{
			food: "A",
			protein: 40,
			method: "DIRECT",
			daily_amount: 2,
		},
		{
			food: "A",
			protein: 80,
			method: "DIRECT",
			daily_amount: 4,
		},
		{
			food: "B",
			protein: 80,
			method: "DIRECT",
			daily_amount: 0.4,
		},
		{
			food: "B",
			protein: 120,
			method: "DIRECT",
			daily_amount: 0.6,
		},
		{
			food: "B",
			protein: 160,
			method: "DIRECT",
			daily_amount: 0.8,
		},
		{
			food: "B",
			protein: 240,
			method: "DIRECT",
			daily_amount: 1.1,
		},
		{
			food: "B",
			protein: 300,
			method: "DIRECT",
			daily_amount: 1.4,
		},
	],
	custom_note: "This is an example of a pre-defined protocol.",
};
