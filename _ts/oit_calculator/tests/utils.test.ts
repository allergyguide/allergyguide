import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import type { Food, Protocol } from "../types";
import { DosingStrategy, FoodAStrategy, FoodType, Method } from "../types";
import * as utils from "../utils";

describe("Utils", () => {
	describe("escapeHtml", () => {
		it("should escape critical HTML characters", () => {
			const input = '<script>alert("XSS & &")</script>\'';
			const expected =
				"&lt;script&gt;alert(&quot;XSS &amp; &amp;&quot;)&lt;/script&gt;&#039;";
			expect(utils.escapeHtml(input)).toBe(expected);
		});
	});

	describe("formatNumber", () => {
		it("should format native numbers to fixed decimals", () => {
			expect(utils.formatNumber(1.2345, 2)).toBe("1.23");
			expect(utils.formatNumber(1, 1)).toBe("1.0");
		});

		it("should format Decimal objects", () => {
			expect(utils.formatNumber(new Decimal(10.5), 2)).toBe("10.50");
		});

		it("should return empty string for nullish values", () => {
			expect(utils.formatNumber(null, 2)).toBe("");
			expect(utils.formatNumber(undefined, 2)).toBe("");
		});
	});

	describe("formatAmount", () => {
		it("should format grams (g) using SOLID_RESOLUTION", () => {
			// SOLID_RESOLUTION is 2
			expect(utils.formatAmount(0.1234, "g")).toBe("0.12");
			expect(utils.formatAmount(new Decimal(0.5), "g")).toBe("0.50");
		});

		it("should format milliliters (ml) as integer when whole", () => {
			expect(utils.formatAmount(5.0, "ml")).toBe("5");
			expect(utils.formatAmount(new Decimal(10), "ml")).toBe("10");
		});

		it("should format milliliters (ml) using LIQUID_RESOLUTION when fractional", () => {
			// LIQUID_RESOLUTION is 1
			expect(utils.formatAmount(5.23, "ml")).toBe("5.2");
			expect(utils.formatAmount(new Decimal(0.55), "ml")).toBe("0.6"); // toFixed(1) rounds
		});

		it("should return empty string for capsules", () => {
			expect(utils.formatAmount(1, "capsule")).toBe("");
		});

		it("should return empty string for nullish values", () => {
			expect(utils.formatAmount(null, "g")).toBe("");
		});
	});

	describe("getMeasuringUnit", () => {
		it('should return "ml" for LIQUID food type', () => {
			const food = { type: FoodType.LIQUID } as Food;
			expect(utils.getMeasuringUnit(food)).toBe("ml");
		});

		it('should return "capsule" for CAPSULE food type', () => {
			const food = { type: FoodType.CAPSULE } as Food;
			expect(utils.getMeasuringUnit(food)).toBe("capsule");
		});

		it('should return "g" for SOLID food type', () => {
			const food = { type: FoodType.SOLID } as Food;
			expect(utils.getMeasuringUnit(food)).toBe("g");
		});
	});

	describe("findPercentDifference", () => {
		it("should calculate absolute percentage difference", () => {
			const test = new Decimal(110);
			const base = new Decimal(100);
			// (110/100) - 1 = 0.1
			expect(utils.findPercentDifference(test, base).toNumber()).toBe(0.1);
		});

		it("should be absolute", () => {
			const test = new Decimal(90);
			const base = new Decimal(100);
			// (90/100) - 1 = -0.1.abs() = 0.1
			expect(utils.findPercentDifference(test, base).toNumber()).toBe(0.1);
		});
	});

	describe("parseSafeDecimal", () => {
		it("should parse valid strings", () => {
			expect(utils.parseSafeDecimal("10.5", new Decimal(0)).toNumber()).toBe(
				10.5,
			);
		});

		it("should return default value for empty/null input", () => {
			const def = new Decimal(5);
			expect(utils.parseSafeDecimal("", def)).toBe(def);
			expect(utils.parseSafeDecimal("  ", def)).toBe(def);
		});

		it("should return default value for invalid numeric strings", () => {
			const def = new Decimal(0);
			expect(utils.parseSafeDecimal("abc", def)).toBe(def);
		});

		it("should clamp to minimum value", () => {
			expect(utils.parseSafeDecimal("5", new Decimal(10), 10).toNumber()).toBe(
				10,
			);
			expect(utils.parseSafeDecimal("15", new Decimal(0), 10).toNumber()).toBe(
				15,
			);
		});
	});

	describe("serializeProtocol", () => {
		const foodA: Food = {
			name: "Milk",
			type: FoodType.LIQUID,
			gramsInServing: new Decimal(8),
			servingSize: new Decimal(250),
			getMgPerUnit() {
				return new Decimal(32);
			},
		};

		const foodB: Food = {
			name: "Cheese",
			type: FoodType.SOLID,
			gramsInServing: new Decimal(25),
			servingSize: new Decimal(100),
			getMgPerUnit() {
				return new Decimal(250);
			},
		};

		const protocol: Protocol = {
			dosingStrategy: DosingStrategy.STANDARD,
			foodA,
			foodAStrategy: FoodAStrategy.DILUTE_INITIAL,
			diThreshold: new Decimal(0.5),
			foodB,
			foodBThreshold: { unit: "g", amount: new Decimal(0.4) },
			steps: [
				{
					id: "step-1",
					stepIndex: 1,
					targetMg: new Decimal(1),
					method: Method.DILUTE,
					dailyAmount: new Decimal(1),
					dailyAmountUnit: "ml",
					mixFoodAmount: new Decimal(1),
					mixWaterAmount: new Decimal(19),
					servings: new Decimal(20),
					food: "A",
				},
				{
					id: "step-2",
					stepIndex: 2,
					targetMg: new Decimal(10),
					method: Method.DIRECT,
					dailyAmount: new Decimal(0.31),
					dailyAmountUnit: "ml",
					food: "A",
				},
				{
					id: "step-3",
					stepIndex: 3,
					targetMg: new Decimal(100),
					method: Method.DIRECT,
					dailyAmount: new Decimal(0.4),
					dailyAmountUnit: "g",
					food: "B",
				},
			],
			config: {} as any, // Not used by serializeProtocol
		};

		it("should serialize a complex protocol correctly", () => {
			const notes = "Test Note";
			const result = utils.serializeProtocol(protocol, notes);

			expect(result.name).toBe("Custom Protocol Request");
			expect(result.dosing_strategy).toBe(DosingStrategy.STANDARD);
			expect(result.food_a.name).toBe("Milk");
			expect(result.food_a.gramsInServing).toBe("8");
			expect(result.food_b?.name).toBe("Cheese");
			expect(result.food_b_threshold).toBe("0.4");
			expect(result.custom_note).toBe(notes);

			// Check steps
			expect(result.table.length).toBe(3);

			// Step 1: DILUTE
			expect(result.table[0]).toEqual({
				food: "A",
				protein: "1",
				method: "DILUTE",
				daily_amount: "1",
				mix_amount: "1", // LIQUID food -> whole number -> "1"
				water_amount: "19", // water is always ml -> whole number
			});

			// Step 2: DIRECT
			expect(result.table[1]).toEqual({
				food: "A",
				protein: "10",
				method: "DIRECT",
				daily_amount: "0.3", // ml -> LIQUID_RESOLUTION (1)
			});

			// Step 3: DIRECT (Food B)
			expect(result.table[2]).toEqual({
				food: "B",
				protein: "100",
				method: "DIRECT",
				daily_amount: "0.40", // g -> SOLID_RESOLUTION (2)
			});
		});

		it("should handle protocol without Food B", () => {
			const simpleProtocol = {
				...protocol,
				foodB: undefined,
				foodBThreshold: undefined,
				steps: protocol.steps.slice(0, 2),
			};
			const result = utils.serializeProtocol(simpleProtocol as Protocol, "");
			expect(result.food_b).toBeUndefined();
			expect(result.food_b_threshold).toBeUndefined();
			expect(result.table.length).toBe(2);
		});
	});
});
