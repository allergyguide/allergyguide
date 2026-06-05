import Decimal from "decimal.js";
import { beforeEach, describe, expect, it } from "vitest";
import { ProtocolState } from "../../state/protocolState";
import {
	DosingStrategy,
	FoodAStrategy,
	FoodType,
	SourceType,
} from "../../types";

describe("ProtocolState: Decoupled Baselines & Library Check", () => {
	let state: ProtocolState;

	const mockProtocol = () => ({
		id: "protocol-123",
		source: SourceType.USER,
		dosingStrategy: DosingStrategy.STANDARD,
		foodA: {
			name: "Peanut",
			type: FoodType.SOLID,
			gramsInServing: new Decimal(1),
			servingSize: new Decimal(100),
			source: SourceType.USER,
			id: "food-123",
			getMgPerUnit: () => new Decimal(10),
		},
		foodAStrategy: FoodAStrategy.DILUTE_INITIAL,
		diThreshold: new Decimal(0.5),
		steps: [],
		config: {} as any,
	});

	beforeEach(() => {
		state = new ProtocolState();
		state.setProtocol(mockProtocol(), "Initial Load", { isLoad: true });
		state.setAllBaselines();
	});

	it("should correctly identify when protocol is dirty but food is clean", () => {
		const p = state.getProtocol()!;
		state.setProtocol(
			{ ...p, foodAStrategy: FoodAStrategy.DILUTE_ALL },
			"Changed Strategy",
		);

		expect(state.isDirty()).toBe(true);
		expect(state.isFoodDirty("A")).toBe(false);
	});

	it("should correctly identify when food is dirty and protocol is dirty", () => {
		const p = state.getProtocol()!;
		const updatedFoodA = { ...p.foodA, gramsInServing: new Decimal(2) };
		state.setProtocol({ ...p, foodA: updatedFoodA }, "Changed Protein");

		expect(state.isDirty()).toBe(true);
		expect(state.isFoodDirty("A")).toBe(true);
	});

	it("should clear food dirty state if it perfectly matches the global library (Drift Resolution)", () => {
		const p = state.getProtocol()!;

		// 1. Setup a "dirty" state: current food differs from baseline
		const updatedFoodA = { ...p.foodA, gramsInServing: new Decimal(2) };
		state.setProtocol({ ...p, foodA: updatedFoodA }, "Manual Fix");

		expect(state.isFoodDirty("A")).toBe(true);

		// 2. Mock a library that matches the "new" value
		const mockFoodsById = new Map<string, any>([
			[
				"food-123",
				{
					name: "Peanut",
					gramsInServing: 2, // Matches the manual update
					servingSize: 100,
					type: FoodType.SOLID,
				},
			],
		]);

		// 3. Now the food should be considered clean relative to library when map is passed
		expect(state.isFoodDirty("A", mockFoodsById)).toBe(false);

		// 4. BUT the protocol itself is still dirty relative to its loaded session baseline
		expect(state.isDirty()).toBe(true);
	});

	it("should clear ONLY food dirty state when setFoodBaseline is called", () => {
		const p = state.getProtocol()!;
		const updatedFoodA = { ...p.foodA, gramsInServing: new Decimal(2) };
		state.setProtocol({ ...p, foodA: updatedFoodA }, "Changed Protein");

		state.setFoodBaseline("A");

		expect(state.isFoodDirty("A")).toBe(false);
		expect(state.isDirty()).toBe(true);
	});

	it("should clear everything when setAllBaselines is called", () => {
		const p = state.getProtocol()!;
		const updatedFoodA = { ...p.foodA, gramsInServing: new Decimal(2) };
		state.setProtocol(
			{ ...p, foodA: updatedFoodA, foodAStrategy: FoodAStrategy.DILUTE_ALL },
			"Complex Change",
		);

		state.setAllBaselines();

		expect(state.isDirty()).toBe(false);
		expect(state.isFoodDirty("A")).toBe(false);
	});

	it("should handle brand new foods (no ID) as always dirty", () => {
		const p = state.getProtocol()!;
		const brandNewFood = { ...p.foodA, id: undefined };
		state.setProtocol({ ...p, foodA: brandNewFood }, "New Food");

		expect(state.isFoodDirty("A")).toBe(true);

		state.setFoodBaseline("A");
		expect(state.isFoodDirty("A")).toBe(true);
	});
});
