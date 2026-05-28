import { render } from "lit-html";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FoodType, SourceType } from "../../types";
import { SearchDropdown } from "../../ui/components/SearchDropdown";

describe("SearchDropdown Iconography", () => {
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

	it("should render an SVG icon instead of a text badge for BRAND foods", () => {
		const results = [
			{
				type: "food",
				data: {
					name: "Milk",
					type: FoodType.LIQUID,
					gramsInServing: 3.3,
					servingSize: 100,
					source: SourceType.BRAND,
				},
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

		// Check for SVG icon
		const icon = mount.querySelector(".search-result-item svg.icon-brand");
		expect(icon).not.toBeNull();

		// Ensure old text badge is gone
		const oldBadge = Array.from(mount.querySelectorAll(".badge")).find(el => el.textContent === "BRAND");
		expect(oldBadge).toBeUndefined();
	});

	it("should render an SVG icon instead of a text badge for USER foods", () => {
		const results = [
			{
				type: "food",
				data: {
					name: "My Custom Food",
					type: FoodType.SOLID,
					gramsInServing: 10,
					servingSize: 100,
					source: SourceType.USER,
				},
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

		// Check for SVG icon
		const icon = mount.querySelector(".search-result-item svg.icon-user");
		expect(icon).not.toBeNull();

    // Ensure old text badge is gone
		const oldBadge = Array.from(mount.querySelectorAll(".badge")).find(el => el.textContent === "USER");
		expect(oldBadge).toBeUndefined();
	});

	it("should position the icon before the food name", () => {
		const results = [
			{
				type: "food",
				data: {
					name: "Milk",
					type: FoodType.LIQUID,
					gramsInServing: 3.3,
					servingSize: 100,
					source: SourceType.BRAND,
				},
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

		const content = mount.querySelector(".search-result-content");
        expect(content).not.toBeNull();
        if (content) {
            // Check that the first child is the icon or contains the icon
            const firstChild = content.firstElementChild;
            expect(firstChild?.tagName.toLowerCase()).toBe("svg");
            expect(firstChild?.classList.contains("icon-brand")).toBe(true);
        }
	});
});
