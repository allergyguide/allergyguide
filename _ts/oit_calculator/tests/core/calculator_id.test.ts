import { describe, it, expect } from "vitest";
import { generateStepForTarget } from "../../core/calculator";
import { FoodType, FoodAStrategy } from "../../types";
import Decimal from "decimal.js";
import { DEFAULT_CONFIG } from "../../constants";

const mockFood = {
	name: "Peanut",
	type: FoodType.SOLID,
	gramsInServing: new Decimal(20),
	servingSize: new Decimal(100),
	getMgPerUnit: () => new Decimal(200),
};

describe("Calculator ID handling", () => {
	it("should preserve an existing ID when provided", () => {
		const existingId = "existing-uuid";
		const step = generateStepForTarget(
			new Decimal(10),
			1,
			mockFood as any,
			"A",
			FoodAStrategy.DILUTE_NONE,
			new Decimal(100),
			DEFAULT_CONFIG,
			existingId,
		);
		expect(step?.id).toBe(existingId);
	});

	it("should generate a new UUID when no ID is provided", () => {
		const step = generateStepForTarget(
			new Decimal(10),
			1,
			mockFood as any,
			"A",
			FoodAStrategy.DILUTE_NONE,
			new Decimal(100),
			DEFAULT_CONFIG,
		);
		expect(step?.id).toBeDefined();
		expect(step?.id).toMatch(/^[0-9a-f-]{36}$/i);
	});
});
