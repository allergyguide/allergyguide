import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "lit-html";
import { SearchDropdown } from "../../../ui/components/SearchDropdown";
import { FoodType } from "../../../types";

describe("SearchDropdown Component", () => {
	let mount: HTMLElement;
	const mockCallbacks = {
		onSelectCustom: vi.fn(),
		onSelectProtocol: vi.fn(),
		onSelectFoodA: vi.fn(),
		onSelectFoodB: vi.fn(),
	};

	beforeEach(() => {
		mount = document.createElement("div");
		vi.clearAllMocks();
	});

	it("should always render the Custom Food item at the last index", () => {
		const results = [
			{
				type: "food",
				data: {
					Food: "Milk",
					Type: FoodType.LIQUID,
					"Mean protein in grams": 3.3,
					"Serving size": 100,
				},
			},
		];
		render(
			SearchDropdown(
				"food-a-search",
				results as any,
				"Peanut",
				-1,
				mockCallbacks,
			),
			mount,
		);

		const items = mount.querySelectorAll(".search-result-item");
		expect(items).toHaveLength(2);

		const lastItem = items[1];
		expect(lastItem.getAttribute("data-index")).toBe("1");
		expect(lastItem.textContent).toContain("Create Custom Food:");
		expect(lastItem.textContent).toContain("Peanut");
		expect(lastItem.classList.contains("sticky-bottom")).toBe(true);
	});

	it("should render search results with correct data-index starting from 0", () => {
		const results = [
			{
				type: "food",
				data: {
					Food: "Milk",
					Type: FoodType.LIQUID,
					"Mean protein in grams": 3.3,
					"Serving size": 100,
				},
			},
			{
				type: "protocol",
				data: { name: "Peanut Protocol", dosing_strategy: "STANDARD" as any },
			},
		];

		render(
			SearchDropdown(
				"food-a-search",
				results as any,
				"test",
				-1,
				mockCallbacks,
			),
			mount,
		);

		const items = mount.querySelectorAll(".search-result-item");
		expect(items).toHaveLength(3); // 2 results + Custom
		expect(items[0].getAttribute("data-index")).toBe("0");
		expect(items[1].getAttribute("data-index")).toBe("1");
		expect(items[2].getAttribute("data-index")).toBe("2"); // Custom
	});

	it("should apply 'highlighted' class to the correct item based on activeIndex", () => {
		const results = [
			{
				type: "food",
				data: {
					Food: "Milk",
					Type: FoodType.LIQUID,
					"Mean protein in grams": 3.3,
					"Serving size": 100,
				},
			},
		];

		render(
			SearchDropdown("food-a-search", results as any, "test", 0, mockCallbacks),
			mount,
		);
		expect(
			mount
				.querySelector('[data-index="0"]')
				?.classList.contains("highlighted"),
		).toBe(true);
		expect(
			mount
				.querySelector('[data-index="1"]')
				?.classList.contains("highlighted"),
		).toBe(false);

		render(
			SearchDropdown("food-a-search", results as any, "test", 1, mockCallbacks),
			mount,
		);
		expect(
			mount
				.querySelector('[data-index="0"]')
				?.classList.contains("highlighted"),
		).toBe(false);
		expect(
			mount
				.querySelector('[data-index="1"]')
				?.classList.contains("highlighted"),
		).toBe(true);
	});

	it("should call onSelectCustom when Custom Food item is clicked", () => {
		const results = [
			{
				type: "food",
				data: {
					Food: "Milk",
					Type: FoodType.LIQUID,
					"Mean protein in grams": 3.3,
					"Serving size": 100,
				},
			},
		];
		render(
			SearchDropdown(
				"food-a-search",
				results as any,
				"CustomQuery",
				-1,
				mockCallbacks,
			),
			mount,
		);
		const customItem = mount.querySelector('[data-index="1"]') as HTMLElement;
		customItem.click();

		expect(mockCallbacks.onSelectCustom).toHaveBeenCalledWith(
			"CustomQuery",
			"food-a-search",
		);
	});

	it("should call onSelectProtocol when a protocol result is clicked", () => {
		const protocol = {
			name: "Peanut Standard",
			dosing_strategy: "STANDARD" as any,
		};
		render(
			SearchDropdown(
				"food-a-search",
				[{ type: "protocol", data: protocol } as any],
				"test",
				-1,
				mockCallbacks,
			),
			mount,
		);

		const item = mount.querySelector('[data-index="0"]') as HTMLElement;
		item.click();

		expect(mockCallbacks.onSelectProtocol).toHaveBeenCalledWith(protocol);
	});

	it("should call onSelectFoodA when a food result is clicked for food-a-search", () => {
		const food = {
			Food: "Egg",
			Type: FoodType.SOLID,
			"Mean protein in grams": 6,
			"Serving size": 50,
		};
		render(
			SearchDropdown(
				"food-a-search",
				[{ type: "food", data: food } as any],
				"test",
				-1,
				mockCallbacks,
			),
			mount,
		);

		const item = mount.querySelector('[data-index="0"]') as HTMLElement;
		item.click();

		expect(mockCallbacks.onSelectFoodA).toHaveBeenCalledWith(food);
	});

	it("should call onSelectFoodB when a food result is clicked for food-b-search", () => {
		const food = {
			Food: "Egg",
			Type: FoodType.SOLID,
			"Mean protein in grams": 6,
			"Serving size": 50,
		};
		render(
			SearchDropdown(
				"food-b-search",
				[{ type: "food", data: food } as any],
				"test",
				-1,
				mockCallbacks,
			),
			mount,
		);
		const item = mount.querySelector('[data-index="0"]') as HTMLElement;
		item.click();

		expect(mockCallbacks.onSelectFoodB).toHaveBeenCalledWith(food);
	});
});
