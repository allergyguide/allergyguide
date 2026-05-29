import { describe, expect, it } from "vitest";
import { FoodType } from "../types";
import { getMeasuringUnit } from "../utils";

describe("OFC Utils", () => {
	describe("getMeasuringUnit", () => {
		it('should return "g" for SOLID foods', () => {
			expect(getMeasuringUnit({ type: FoodType.SOLID })).toBe("g");
		});

		it('should return "ml" for LIQUID foods', () => {
			expect(getMeasuringUnit({ type: FoodType.LIQUID })).toBe("ml");
		});

		it('should return "capsule" for CAPSULE foods', () => {
			expect(getMeasuringUnit({ type: FoodType.CAPSULE })).toBe("capsule");
		});
	});
});
