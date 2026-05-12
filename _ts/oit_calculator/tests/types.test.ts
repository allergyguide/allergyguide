import { describe, it, expect } from "vitest";
import type { Step } from "../types";
import { Method } from "../types";
import Decimal from "decimal.js";

describe("Step Interface", () => {
	it("should have an id property", () => {
		const step: Step = {
			id: "test-uuid",
			stepIndex: 1,
			targetMg: new Decimal(1),
			method: Method.DIRECT,
			dailyAmount: new Decimal(1),
			dailyAmountUnit: "g",
			food: "A",
		};
		expect(step.id).toBe("test-uuid");
	});
});
