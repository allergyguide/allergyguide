import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import * as searchUI from "../../ui/searchUI";
import { FoodType } from "../../types";

// Mock DOM
const mockMount = (id: string) => {
	const el = document.createElement("div");
	el.id = id;
	document.body.appendChild(el);
	return el;
};

describe("searchUI Navigation and Selection Logic", () => {
	let aMount: HTMLElement;

	const mockResults = [
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
			data: { name: "Peanut Protocol", dosing_strategy: "STANDARD" },
		},
	];

	const mockCallbacks = {
		onSelectCustom: vi.fn(),
		onSelectProtocol: vi.fn(),
		onSelectFoodA: vi.fn(),
		onSelectFoodB: vi.fn(),
	};

	beforeEach(() => {
		// Mock scrollIntoView
		window.HTMLElement.prototype.scrollIntoView = vi.fn();

		aMount = mockMount("food-a-search-dropdown-mount");
		vi.clearAllMocks();

		// Reset searchUI state
		searchUI.hideSearchDropdown("food-a-search");

		// Setup state via showSearchDropdown (which is used internally to track state for navigation)
		searchUI.showSearchDropdown(
			"food-a-search",
			mockResults as any,
			"testQuery",
			mockCallbacks as any,
		);
	});

	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("navigateDropdown('down') should cycle from -1 to 0", () => {
		searchUI.navigateDropdown("down");
		expect(
			aMount
				.querySelector('[data-index="0"]')
				?.classList.contains("highlighted"),
		).toBe(true);
	});

	it("navigateDropdown('up') from -1 should loop to last item (Custom Food)", () => {
		// 2 results + 1 custom = 3 items total. Indices 0, 1, 2.
		searchUI.navigateDropdown("up");
		expect(
			aMount
				.querySelector('[data-index="2"]')
				?.classList.contains("highlighted"),
		).toBe(true);
		expect(aMount.querySelector('[data-index="2"]')?.textContent).toContain(
			"Create Custom Food:",
		);
	});

	it("selectHighlightedDropdownItem should call onSelectCustom for last index", () => {
		// 2 results. Custom at index 2.
		searchUI.navigateDropdown("up"); // to index 2
		searchUI.selectHighlightedDropdownItem();

		expect(mockCallbacks.onSelectCustom).toHaveBeenCalledWith(
			"testQuery",
			"food-a-search",
		);
	});

	it("selectHighlightedDropdownItem should call correct action for result indices", () => {
		// Index 0: Milk (food)
		searchUI.navigateDropdown("down"); // to index 0
		searchUI.selectHighlightedDropdownItem();
		expect(mockCallbacks.onSelectFoodA).toHaveBeenCalledWith(
			mockResults[0].data,
		);

		// Index 1: Peanut Protocol (protocol)
		searchUI.showSearchDropdown(
			"food-a-search",
			mockResults as any,
			"testQuery",
			mockCallbacks as any,
		); // Reset activeIndex
		searchUI.navigateDropdown("down");
		searchUI.navigateDropdown("down"); // to index 1
		searchUI.selectHighlightedDropdownItem();
		expect(mockCallbacks.onSelectProtocol).toHaveBeenCalledWith(
			mockResults[1].data,
		);
	});
});
