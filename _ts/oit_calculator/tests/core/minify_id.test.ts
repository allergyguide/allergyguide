import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import { minifyProtocol } from "../../core/minify";
import { DosingStrategy, FoodAStrategy, FoodType, Method } from "../../types";

const mockProtocol = {
	dosingStrategy: DosingStrategy.STANDARD,
	foodA: {
		name: "Peanut",
		type: FoodType.SOLID,
		gramsInServing: new Decimal(20),
		servingSize: new Decimal(100),
		getMgPerUnit: () => new Decimal(200),
	},
	foodAStrategy: FoodAStrategy.DILUTE_NONE,
	diThreshold: new Decimal(0.5),
	steps: [
		{
			id: "some-uuid",
			stepIndex: 1,
			targetMg: new Decimal(10),
			method: Method.DIRECT,
			dailyAmount: new Decimal(0.05),
			dailyAmountUnit: "g" as any,
			food: "A" as any,
		},
	],
	config: {} as any,
};

describe("Minify ID stripping", () => {
	it("should strip id from steps during minification", () => {
		const minified = minifyProtocol(mockProtocol as any);
		const minifiedStep = minified.s[0];

		// Check that 'id' is not in the minified step object
		expect(minifiedStep).not.toHaveProperty("id");
		// Also check that it doesn't have any other long keys
		expect(Object.keys(minifiedStep)).toEqual(["i", "t", "m", "d", "f"]);
	});
});
