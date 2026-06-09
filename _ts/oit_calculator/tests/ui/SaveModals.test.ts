import Decimal from "decimal.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appState, initializeAppState } from "../../state/instances";
import { FoodType, SourceType } from "../../types";
import { showSaveFoodModal } from "../../ui/components/SaveModals";

describe("SaveModals: showSaveFoodModal", () => {
	let mount: HTMLElement;

	beforeEach(() => {
		// Mock appState
		if (!appState) {
			initializeAppState({ foods: [], protocols: [] }, "https://example.com");
		}
		appState.setUserData([], []);

		mount = document.createElement("div");
		mount.id = "oit-library-modal-mount";
		document.body.appendChild(mount);
		vi.clearAllMocks();
	});

	afterEach(() => {
		document.body.removeChild(mount);
	});

	it("should validate against duplicate names when saveAsNew is true", async () => {
		// 1. Add a food to the library
		const existingFood = {
			id: "existing-id",
			name: "Peanut",
			type: FoodType.SOLID,
			gramsInServing: 10,
			servingSize: 100,
			source: SourceType.USER,
		};
		appState.setUserData([existingFood as any], []);

		// 2. Open modal to save a NEW food (saveAsNew = true)
		const newFood = {
			name: "New Food", // Modal will default to "Copy of New Food"
			type: FoodType.SOLID,
			gramsInServing: new Decimal(10),
			servingSize: new Decimal(100),
			source: SourceType.USER,
			getMgPerUnit: () => new Decimal(100),
		};

		showSaveFoodModal({
			food: newFood as any,
			saveAsNew: true,
			onSave: vi.fn(),
			onCancel: vi.fn(),
		});

		const input = document.getElementById("save-food-name-input") as HTMLInputElement;
		expect(input).not.toBeNull();

		// 3. Type the DUPLICATE name
		input.value = "Peanut";
		input.dispatchEvent(new Event("input"));

		// 4. Verify error message appears
		const errorDiv = mount.querySelector(".oit-error-message");
		expect(errorDiv?.textContent).toContain("already exists");
	});

	it("should NOT flag duplicate error if updating the same food (saveAsNew = false)", async () => {
		const existingFood = {
			id: "food-123",
			name: "Peanut",
			type: FoodType.SOLID,
			gramsInServing: 10,
			servingSize: 100,
			source: SourceType.USER,
		};
		appState.setUserData([existingFood as any], []);

		showSaveFoodModal({
			food: {
				...existingFood,
				gramsInServing: new Decimal(10),
				servingSize: new Decimal(100),
				getMgPerUnit: () => new Decimal(100),
			} as any,
			saveAsNew: false, // UPDATE mode
			onSave: vi.fn(),
			onCancel: vi.fn(),
		});

		const input = document.getElementById("save-food-name-input") as HTMLInputElement;
		input.value = "Peanut"; // Same name as itself
		input.dispatchEvent(new Event("input"));

		const errorDiv = mount.querySelector(".oit-error-message");
		expect(errorDiv).toBeNull(); // Should be valid
	});
});
