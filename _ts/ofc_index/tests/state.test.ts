import { beforeEach, describe, expect, it } from "vitest";
import { AppState } from "../state/state";
import { type Food, FoodType, SourceType } from "../types";

describe("AppState", () => {
	let appState: AppState;

	const mockPublicFoods: Food[] = [
		{
			name: "Peanut",
			gramsInServing: 25,
			servingSize: 100,
			type: FoodType.SOLID,
			group: "Legumes",
			source: SourceType.GENERIC,
			keywords: ["nut", "groundnut"],
		},
		{
			name: "Milk",
			gramsInServing: 8,
			servingSize: 250,
			type: FoodType.LIQUID,
			group: "Dairy",
			source: SourceType.GENERIC,
		},
	];

	const mockProvisionedFoods: Food[] = [
		{
			name: "Active Brand Food",
			gramsInServing: 10,
			servingSize: 100,
			type: FoodType.SOLID,
			group: "Branded",
			source: SourceType.PROVISIONED,
		},
		{
			name: "Inactive Brand Food",
			gramsInServing: 5,
			servingSize: 100,
			type: FoodType.SOLID,
			group: "Branded",
			source: SourceType.PROVISIONED,
		},
	];

	beforeEach(() => {
		appState = new AppState();
	});

	it("should initialize with default state", () => {
		const state = appState.getState();
		expect(state.isLoggedIn).toBe(false);
		expect(state.searchQuery).toBe("");
		expect(state.searchableFoods).toHaveLength(0);
	});

	it("should pre-compute searchable foods correctly in setFoods", () => {
		appState.setFoods(mockPublicFoods, [mockProvisionedFoods[0]]); // Only pass active one
		const state = appState.getState();

		// 2 public + 1 active provisioned = 3
		expect(state.searchableFoods).toHaveLength(3);
		expect(state.searchableFoods[0].preparedKey).toBeDefined();
	});

	it("should return empty list when search query is empty", () => {
		appState.setFoods(mockPublicFoods);
		appState.setSearchQuery("");
		// Manually update debounced query for immediate test check
		(appState as any).state.debouncedSearchQuery = "";

		expect(appState.getFilteredFoods()).toHaveLength(0);
	});

	it("should return matching foods for a valid query", () => {
		appState.setFoods(mockPublicFoods);
		// Mock the debounced update to happen immediately
		(appState as any).state.debouncedSearchQuery = "Peanut";

		const results = appState.getFilteredFoods();
		expect(results).toHaveLength(1);
		expect(results[0].name).toBe("Peanut");
	});

	it("should memoize search results", () => {
		appState.setFoods(mockPublicFoods);
		(appState as any).state.debouncedSearchQuery = "Milk";

		const results1 = appState.getFilteredFoods();
		const results2 = appState.getFilteredFoods();

		// Strict equality check for memoization
		expect(results1).toBe(results2);
	});

	it("should initialize modal state when a food is selected", () => {
		const food = mockPublicFoods[0];
		appState.setSelectedFood(food);

		const state = appState.getState();
		expect(state.selectedFood?.name).toBe(food.name);
		expect(state.modalGramsInServing).toBe(food.gramsInServing);
		expect(state.modalServingSize).toBe(food.servingSize);
	});

	it("should not mutate original food object in state when using shallow copy", () => {
		const food = { ...mockPublicFoods[0] };
		appState.setSelectedFood(food);
		appState.updateSelectedFoodName("Modified Name");

		expect(food.name).toBe("Peanut");
		expect(appState.getState().selectedFood?.name).toBe("Modified Name");
	});

	it("should enforce minimum serving size of 1", () => {
		appState.setModalServingSize(0);
		expect(appState.getState().modalServingSize).toBe(1);

		appState.setModalServingSize(-10);
		expect(appState.getState().modalServingSize).toBe(1);
	});

	it("should update auth state", () => {
		appState.setAuthState(true, "test@example.com");
		const state = appState.getState();
		expect(state.isLoggedIn).toBe(true);
		expect(state.email).toBe("test@example.com");
	});

	it("should prioritize foods with higher source weight on similar search scores", () => {
		const testFoods: Food[] = [
			{
				name: "Peanut Generic",
				gramsInServing: 25,
				servingSize: 100,
				type: FoodType.SOLID,
				group: "Legumes",
				source: SourceType.GENERIC,
			},
			{
				name: "Peanut User",
				gramsInServing: 25,
				servingSize: 100,
				type: FoodType.SOLID,
				group: "Legumes",
				source: SourceType.USER,
			},
			{
				name: "Peanut Provisioned",
				gramsInServing: 25,
				servingSize: 100,
				type: FoodType.SOLID,
				group: "Legumes",
				source: SourceType.PROVISIONED,
			},
			{
				name: "Peanut Brand",
				gramsInServing: 25,
				servingSize: 100,
				type: FoodType.SOLID,
				group: "Legumes",
				source: SourceType.BRAND,
			},
		];

		appState.setFoods(testFoods);
		(appState as any).state.debouncedSearchQuery = "Peanut";

		const results = appState.getFilteredFoods();
		expect(results).toHaveLength(4);

		// Order should be USER (4), PROVISIONED (3), BRAND (2), GENERIC (1)
		expect(results[0].name).toBe("Peanut User");
		expect(results[1].name).toBe("Peanut Provisioned");
		expect(results[2].name).toBe("Peanut Brand");
		expect(results[3].name).toBe("Peanut Generic");
	});
});
