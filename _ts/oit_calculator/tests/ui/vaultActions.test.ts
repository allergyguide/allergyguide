import Decimal from "decimal.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveSupaDocument } from "../../../core/data/db";
import { appState, initializeAppState, workspace } from "../../state/instances";
import { type Food, FoodType, SourceType } from "../../types";
import { saveCustomFood } from "../../ui/actions/vaultActions";

// Mock the database call
vi.mock("../../../core/data/db", () => ({
	saveSupaDocument: vi.fn().mockResolvedValue({}),
	deleteSupaDocument: vi.fn().mockResolvedValue({}),
}));

// Mock the save modals to avoid DOM issues
vi.mock("../../ui/components/SaveModals", () => ({
	hideSaveModal: vi.fn(),
	showSaveFoodModal: vi.fn(),
	showSaveModal: vi.fn(),
}));

describe("Vault Actions: saveCustomFood", () => {
	const mockFood: Food = {
		id: "food-123",
		name: "Original Name",
		type: FoodType.SOLID,
		gramsInServing: new Decimal(10),
		servingSize: new Decimal(100),
		source: SourceType.USER,
		keywords: ["test", "metadata"],
		getMgPerUnit() {
			return new Decimal(100);
		},
	};

	beforeEach(() => {
		vi.clearAllMocks();

		// Initialize appState singleton if not already present
		if (!appState) {
			initializeAppState({ foods: [], protocols: [] }, "https://example.com");
		}
		// Reset user foods
		appState.setUserData([], []);

		// Setup a clean protocol
		workspace.getActive().setProtocol(
			{
				foodA: { ...mockFood },
				foodAStrategy: "DILUTE_INITIAL" as any,
				diThreshold: new Decimal(0.5),
				steps: [],
				dosingStrategy: "STANDARD" as any,
				config: {} as any,
			},
			"Reset",
		);
	});

	it("should strip keywords and set saving state during update", async () => {
		const activeTab = workspace.getActive();
		const setSavingSpy = vi.spyOn(activeTab, "setSavingFoodKey");

		// We call update (saveAsNew = false)
		await saveCustomFood(mockFood, false, "A");

		// 1. Verify saving state was toggled
		expect(setSavingSpy).toHaveBeenCalledWith("A");
		expect(setSavingSpy).toHaveBeenLastCalledWith(null);

		// 2. Verify database call omitted keywords
		const calls = (saveSupaDocument as any).mock.calls;
		const foodDataArg = calls[0][2];
		expect(foodDataArg.name).toBe("Original Name");
		expect(foodDataArg.keywords).toBeUndefined(); // Keywords should be stripped
	});

	it("should strictly update only the targetSlot in the protocol", async () => {
		// Setup protocol with same food in both slots
		const p = workspace.getActive().getProtocol()!;
		workspace.getActive().setProtocol(
			{
				...p,
				foodB: { ...mockFood, name: "Original Name" },
				foodBThreshold: { amount: new Decimal(1), unit: "g" },
			},
			"Dual Food Setup",
		);

		// Sanity check
		expect(workspace.getActive().getProtocol()?.foodA.name).toBe("Original Name");
		expect(workspace.getActive().getProtocol()?.foodB?.name).toBe("Original Name");

		// Update Food A specifically
		const updatedFood = { ...mockFood, name: "New Name" };
		await saveCustomFood(updatedFood, false, "A");

		const finalP = workspace.getActive().getProtocol()!;
		expect(finalP.foodA.name).toBe("New Name");
		expect(finalP.foodB?.name).toBe("Original Name"); // Should NOT have changed
	});
});
