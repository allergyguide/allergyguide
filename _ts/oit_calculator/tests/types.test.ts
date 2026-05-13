import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import type { Step } from "../types";
import { Method } from "../types";

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
