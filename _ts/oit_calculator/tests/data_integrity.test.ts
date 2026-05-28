import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
// Import static public JSONs
import cnfFoods from "../../../static/tool_assets/cnf_foods.json";
import { FoodDataSchema, ProtocolDataSchema } from "../types";

// Import error fixtures for negative testing
import errorFoods from "./fixtures/error-foods.json";
import errorProtocols from "./fixtures/error-protocols.json";

describe("Data Integrity Suite", () => {
	describe("Positive Testing: Production Assets", () => {
		it("validates CNF foods (Structure & Physics)", () => {
			const cnfList = cnfFoods as unknown[];
			expect(Array.isArray(cnfList)).toBe(true);

			// Inject GENERIC source for CNF foods if missing (they are public/generic by definition)
			const listWithSource = cnfList.map((item: any) => ({
				...item,
				source: item.source || "GENERIC",
			}));

			const invalidCount = validateFoodList(listWithSource, "cnf_foods.json");
			expect(invalidCount, `Found ${invalidCount} invalid CNF foods`).toBe(0);
		});

		it("validates all secure_assets/oit_calculator .jsons", async (ctx) => {
			const secureFiles = import.meta.glob(
				"../../../secure_assets/oit_calculator/*.json",
				{ eager: true },
			);
			const filePaths = Object.keys(secureFiles);

			if (filePaths.length === 0) {
				console.warn("No secure assets found. Skipping integrity checks.");
				ctx.skip();
				return;
			}

			let totalErrors = 0;
			for (const path in secureFiles) {
				const module = secureFiles[path];
				if (
					typeof module === "object" &&
					module !== null &&
					"default" in module
				) {
					const data = module.default;

					if (Array.isArray(data)) {
						const isFoodList =
							data.length > 0 &&
							Object.keys(data[0]).includes("gramsInServing");
						if (isFoodList) {
							totalErrors += validateFoodList(data, path);
						} else {
							totalErrors += validateProtocolList(data, path);
						}
					}
				}
			}

			expect(
				totalErrors,
				`Found ${totalErrors} integrity issues in secure assets`,
			).toBe(0);
		});
	});

	describe("Negative Testing: Error Fixtures", () => {
		it("should catch all errors in error-foods.json", () => {
			const errors = validateFoodList(errorFoods, "error-foods.json", true);
			// We expect 5 invalid foods in error-foods.json
			expect(errors).toBe(5);
		});

		it("should catch errors in error-protocols.json", () => {
			const errors = validateProtocolList(
				errorProtocols,
				"error-protocols.json",
				true,
			);
			// Based on error-protocols.json, we have several invalid cases
			// Nested Food A Physics, Nested Food B Metadata, Missing Food B Definition, Below Resolution, etc.
			expect(errors).toBeGreaterThan(0);
		});
	});
});

/**
 * Validates a single food item
 */
function validateFood(
	item: unknown,
	filePath: string,
	index: number,
	silent = false,
): boolean {
	const result = FoodDataSchema.safeParse(item);
	if (!result.success) {
		if (!silent)
			console.error(
				`[${filePath}] Invalid Food structure at index ${index}:`,
				result.error,
			);
		return false;
	}

	const data = result.data;

	// PHYSICS CHECK: Protein <= Serving Size
	if (data.gramsInServing > data.servingSize) {
		if (!silent)
			console.error(
				`[${filePath}] Impossible Food "${data.name}" at index ${index}: Protein > Serving Size`,
			);
		return false;
	}

	// SANITY CHECK: Positive Protein
	// Runtime validator considers <= 0 a RED error for non-capsules
	if (data.type !== "CAPSULE" && data.gramsInServing <= 0) {
		if (!silent)
			console.error(
				`[${filePath}] Invalid Food "${data.name}" at index ${index}: Protein must be > 0`,
			);
		return false;
	}

	return true;
}

/**
 * Validates a list of foods
 */
function validateFoodList(
	list: unknown[],
	filePath: string,
	silent = false,
): number {
	let errors = 0;
	const seenNames = new Set<string>();

	list.forEach((item, index) => {
		if (!validateFood(item, filePath, index, silent)) {
			errors++;
			return;
		}

		// Type assertion is safe here as validateFood successfully parsed the structure via Zod
		const name = (item as { name: string }).name;
		if (seenNames.has(name)) {
			if (!silent) console.error(`[${filePath}] Duplicate Food: "${name}"`);
			errors++;
		}
		seenNames.add(name);
	});

	return errors;
}

/**
 * Validates a single protocol item
 */
function validateProtocol(
	item: unknown,
	filePath: string,
	index: number,
	silent = false,
): boolean {
	// 1. Structural Validation (Zod)
	const result = ProtocolDataSchema.safeParse(item);
	if (!result.success) {
		if (!silent)
			console.error(
				`[${filePath}] Invalid Protocol structure at index ${index}:`,
				result.error,
			);
		return false;
	}

	const p = result.data;
	let isValid = true;

	// 2. Table Presence Check
	if (p.table.length === 0) {
		if (!silent)
			console.error(
				`[${filePath}] Protocol "${p.name}" at index ${index} has an empty table.`,
			);
		isValid = false;
	}

	// 3. Nested Food Validation
	if (!validateFood(p.food_a, `${filePath} [Food A]`, index, silent)) {
		isValid = false;
	}
	if (p.food_b) {
		if (!validateFood(p.food_b, `${filePath} [Food B]`, index, silent)) {
			isValid = false;
		}
	}

	// 4. Logical Consistency: Food B defined if used in table
	const hasFoodBSteps = p.table.some((row) => row.food === "B");
	if (hasFoodBSteps && !p.food_b) {
		if (!silent)
			console.error(
				`[${filePath}] Protocol "${p.name}" has Food B steps but no 'food_b' definition.`,
			);
		isValid = false;
	}

	// 5. Sequence and Resolution Checks
	let prevTarget = new Decimal(0);
	p.table.forEach((row, rowIndex) => {
		const currentTarget = new Decimal(row.protein);

		// Non-ascending check
		if (currentTarget.lt(prevTarget)) {
			if (!silent)
				console.error(
					`[${filePath}] Protocol "${p.name}" Step ${rowIndex + 1}: Target ${currentTarget} is less than previous ${prevTarget}`,
				);
			isValid = false;
		}
		prevTarget = currentTarget;

		// Method / Type mismatch
		const isFoodA = row.food === "A";
		const food = isFoodA ? p.food_a : p.food_b;
		if (food && food.type === "CAPSULE" && row.method !== "CAPSULE") {
			if (!silent)
				console.error(
					`[${filePath}] Protocol "${p.name}" Step ${rowIndex + 1}: Food ${row.food} is type CAPSULE but step method is ${row.method}.`,
				);
			isValid = false;
		}

		// Practical Resolution Check (minimal daily amount)
		if (row.method !== "CAPSULE" && row.daily_amount !== undefined) {
			if (row.daily_amount <= 0) {
				if (!silent)
					console.error(
						`[${filePath}] Protocol "${p.name}" Step ${rowIndex + 1}: Daily amount must be > 0.`,
					);
				isValid = false;
			}

			const minMeasurable = food?.type === "SOLID" ? 0.005 : 0.01; // Conservative limits
			if (row.daily_amount < minMeasurable) {
				if (!silent)
					console.warn(
						`[${filePath}] Protocol "${p.name}" Step ${rowIndex + 1}: Daily amount ${row.daily_amount} is below practical resolution.`,
					);
				// Warning only for now, similar to protein <= 0
			}
		}
	});

	return isValid;
}

/**
 * Validates a list of protocols
 */
function validateProtocolList(
	list: unknown[],
	filePath: string,
	silent = false,
): number {
	let errors = 0;
	const seenNames = new Set<string>();

	list.forEach((item, index) => {
		if (!validateProtocol(item, filePath, index, silent)) {
			errors++;
			return;
		}

		// Type assertion is safe here as validateProtocol successfully parsed the structure via Zod
		const name = (item as { name: string }).name;
		if (seenNames.has(name)) {
			if (!silent)
				console.error(`[${filePath}] Duplicate Protocol Name: "${name}"`);
			errors++;
		}
		seenNames.add(name);
	});

	return errors;
}
