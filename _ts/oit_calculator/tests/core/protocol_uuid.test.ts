import { describe, it, expect } from "vitest";
import { addStepAfter } from "../../core/protocol";
import { generateDefaultProtocol } from "../../core/calculator";
import { FoodType } from "../../types";
import Decimal from "decimal.js";
import { DEFAULT_CONFIG } from "../../constants";

const mockFood = {
	name: "Peanut",
	type: FoodType.SOLID,
	gramsInServing: new Decimal(20),
	servingSize: new Decimal(100),
	getMgPerUnit: () => new Decimal(200),
};

describe("Protocol UUID Injection", () => {
	it("should assign a UUID when adding a step after another", () => {
		const protocol = generateDefaultProtocol(mockFood, DEFAULT_CONFIG);
		const originalStepCount = protocol.steps.length;
		const updatedProtocol = addStepAfter(protocol, 1);

		expect(updatedProtocol.steps.length).toBe(originalStepCount + 1);
		const newStep = updatedProtocol.steps[1];
		expect(newStep.id).toBeDefined();
		expect(typeof newStep.id).toBe("string");
		expect(newStep.id.length).toBeGreaterThan(0);
		// Verify it looks like a UUID (simplistic check)
		expect(newStep.id).toMatch(/^[0-9a-f-]{36}$/i);
	});
});
