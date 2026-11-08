import Decimal from "decimal.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CONFIG } from "../../constants";
import { generateDefaultProtocol } from "../../core/calculator";
import { addFoodBToProtocol, updateStepTargetMg } from "../../core/protocol";
import { appState, initializeAppState, workspace } from "../../state/instances";
import { type Food, FoodType, SourceType } from "../../types";
import { clearFoodB, selectCustomFood } from "../../ui/actions";

// Helper to create food
const createFood = (name: string, type: FoodType = FoodType.SOLID): Food => ({
	name,
	type,
	gramsInServing: new Decimal(10),
	servingSize: new Decimal(100),
	source: SourceType.GENERIC,
	getMgPerUnit() {
		return this.gramsInServing.times(1000).dividedBy(this.servingSize); // 100 mg/unit
	},
});

describe("UI Actions", () => {
	const foodA = createFood("Food A");
	const foodB = createFood("Food B");

	beforeEach(() => {
		// Reset state before each test
		// Use the active tab from the workspace
		workspace.getActive().setProtocol(null, "Reset");
	});

	describe("clearFoodB", () => {
		it("should remove Food B and preserve custom step targets", () => {
			// Setup Protocol with Food A
			let protocol = generateDefaultProtocol(foodA, DEFAULT_CONFIG);

			// Add Food B
			const threshold = { unit: "g" as const, amount: new Decimal(1) };
			protocol = addFoodBToProtocol(protocol, foodB, threshold);

			// Modify a step to have a non-standard target (e.g. change step 1 from 1mg to 1.5mg)
			protocol = updateStepTargetMg(protocol, 1, 1.5);

			// Set state
			workspace.getActive().setProtocol(protocol, "Setup");

			// Verify setup
			let current = workspace.getActive().getProtocol();
			expect(current?.foodB).toBeDefined();
			expect(current?.steps[0].targetMg.toNumber()).toBe(1.5);

			// Action: Clear Food B
			clearFoodB();

			// Assertions
			current = workspace.getActive().getProtocol();

			// Food B should be gone
			expect(current?.foodB).toBeUndefined();
			expect(current?.foodBThreshold).toBeUndefined();

			// Step target should still be 1.5mg (preserved)
			// If it was reset to default, it would likely be 1.0mg or whatever the first standard step is
			expect(current?.steps[0].targetMg.toNumber()).toBe(1.5);
		});
	});

	describe("selectCustomFood duplicate checks", () => {
		beforeEach(() => {
			if (!appState) {
				initializeAppState({ foods: [], protocols: [] }, "https://example.com");
			}
			appState.setUserData(
				[
					{
						id: "custom-1",
						name: "Existing Custom",
						type: FoodType.SOLID,
						gramsInServing: 10,
						servingSize: 100,
						source: SourceType.USER,
					},
				],
				[],
			);
		});

		it("should block creation and alert if custom food has exact same name as existing custom food", () => {
			const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});

			selectCustomFood("Existing Custom", "food-a-search");

			expect(alertMock).toHaveBeenCalledWith(
				expect.stringContaining("already exists in your library"),
			);
			expect(workspace.getActive().getProtocol()).toBeNull();

			alertMock.mockRestore();
		});

		it("should allow creation if food name is unique", () => {
			selectCustomFood("Brand New Custom", "food-a-search");

			const current = workspace.getActive().getProtocol();
			expect(current?.foodA.name).toBe("Brand New Custom");
			expect(current?.foodA.source).toBe(SourceType.USER);
		});
	});
});
