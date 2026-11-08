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

	it("should display warning if saving a custom food that matches a standard food with different protein", async () => {
		// Provide a standard food in publicFoods
		initializeAppState(
			{
				foods: [
					{
						name: "Peanut Butter",
						type: FoodType.SOLID,
						gramsInServing: 25,
						servingSize: 100, // 250 mg/g
						source: SourceType.GENERIC,
					},
				],
				protocols: [],
			},
			"https://example.com",
		);

		const customFood = {
			name: "Peanut Butter",
			type: FoodType.SOLID,
			gramsInServing: new Decimal(35), // 350 mg/g
			servingSize: new Decimal(100),
			source: SourceType.USER,
			getMgPerUnit: () => new Decimal(350),
		};

		showSaveFoodModal({
			food: customFood as any,
			saveAsNew: true,
			onSave: vi.fn(),
			onCancel: vi.fn(),
		});

		const input = document.getElementById("save-food-name-input") as HTMLInputElement;
		input.value = "Peanut Butter";
		input.dispatchEvent(new Event("input"));

		const warningDiv = mount.querySelector(".oit-warning-message");
		expect(warningDiv?.textContent).toContain("different protein content");

		// Crucially, Save button should NOT be disabled
		const saveBtn = mount.querySelector(".core-btn-primary") as HTMLButtonElement;
		expect(saveBtn.disabled).toBe(false);
	});
});
