import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import { PRACTALL_5_STEPS, PRACTALL_7_STEPS } from "../constants";
import { calculateSteps } from "../core/calculations";

describe("OFC Calculations", () => {
	it("should calculate food grams correctly for a simple case", () => {
		// 10g protein per 100g food = 0.1g protein per 1g food
		// Step 1: 30mg protein = 0.03g protein
		// food grams = 0.03 / 0.1 = 0.3g
		const steps = calculateSteps([30], Decimal(0.1), "g");
		expect(steps[0].foodGrams.toNumber()).toBeCloseTo(0.3, 5);
		expect(steps[0].cumulativeMg.toNumber()).toBe(30);
	});

	it("should handle zero protein gracefully", () => {
		const steps = calculateSteps([30], Decimal(0), "g");
		expect(steps[0].foodGrams.toNumber()).toBe(0);
	});

	it("should accumulate mg correctly across PRACTALL-5", () => {
		const steps = calculateSteps(PRACTALL_5_STEPS, Decimal(5), "g");
		expect(steps.length).toBe(5);
		expect(steps[0].cumulativeMg.toNumber()).toBe(30);
		expect(steps[4].cumulativeMg.toNumber()).toBe(4430); // 30+100+300+1000+3000
	});

	it("should handle the PRACTALL-7 sequence", () => {
		// At 1g protein per 100g
		const steps = calculateSteps(PRACTALL_7_STEPS, Decimal(0.01), "g");
		expect(steps.length).toBe(7);
		expect(steps[0].targetMg.toNumber()).toBe(3);
		expect(steps[6].targetMg.toNumber()).toBe(3000);
		expect(steps[6].foodGrams.toNumber()).toBeCloseTo(300, 5);
	});
});
