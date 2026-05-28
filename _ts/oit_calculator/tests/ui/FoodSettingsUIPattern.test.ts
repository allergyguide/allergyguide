import Decimal from "decimal.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FoodType, SourceType } from "../../types";
import { renderFoodASettings } from "../../ui/components/FoodSettings";

// Mock appState
vi.mock("../../state/instances", async () => {
	const actual = (await vi.importActual("../../state/instances")) as any;
	return {
		...actual,
		appState: {
			foodsDatabase: [],
			foodsById: new Map(),
		},
	};
});

describe("FoodSettings UI Pattern", () => {
	let mockWorkspace: any;
	let mockProtocol: any;
	let mount: HTMLElement;

	beforeEach(() => {
		mount = document.createElement("div");
		document.body.appendChild(mount);

		mockProtocol = {
			foodA: {
				name: "Brand Peanut",
				type: FoodType.SOLID,
				gramsInServing: new Decimal(10),
				servingSize: new Decimal(100),
				source: SourceType.BRAND,
				id: "brand-123",
				source_url: "https://example.com/brand",
			},
			foodAStrategy: "DILUTE_NONE",
			diThreshold: new Decimal(0.5),
			steps: [],
		};

		const mockActive = {
			getProtocol: vi.fn(() => mockProtocol),
			setProtocol: vi.fn(),
			setAdvancedSettingsOpen: vi.fn(),
			isAdvancedSettingsOpen: false,
		};

		mockWorkspace = {
			getActive: vi.fn(() => mockActive),
		};

		vi.clearAllMocks();
	});

	afterEach(() => {
		if (mount && mount.parentNode === document.body) {
			document.body.removeChild(mount);
		}
	});

	it("should wrap the food name input in a container for the border-label pattern", () => {
		renderFoodASettings(mockWorkspace, mount);

		const container = mount.querySelector(".food-name-container");
		expect(container).not.toBeNull();

		const input = container?.querySelector("#food-a-name");
		expect(input).not.toBeNull();
	});

	it("should render the source badge within a food-metadata-pill container", () => {
		renderFoodASettings(mockWorkspace, mount);

		const pill = mount.querySelector(
			".food-name-container .food-metadata-pill",
		);
		expect(pill).not.toBeNull();

		const badge = pill?.querySelector(".badge");
		expect(badge).not.toBeNull();
	});

	it("should make the BRAND badge a hyperlink to the source_url", () => {
		renderFoodASettings(mockWorkspace, mount);

		const badgeLink = mount.querySelector(".food-metadata-pill a.badge-brand");
		expect(badgeLink).not.toBeNull();
		expect(badgeLink?.getAttribute("href")).toBe("https://example.com/brand");
		expect(badgeLink?.getAttribute("target")).toBe("_blank");
		expect(badgeLink?.textContent?.trim()).toContain("BRAND");
	});

	it("should NOT render the separate verification link below the form", () => {
		renderFoodASettings(mockWorkspace, mount);

		const legacyLink = mount.querySelector(".verification-link");
		expect(legacyLink).toBeNull();
	});

	it("should render a static CUSTOM badge for custom foods", () => {
		mockProtocol.foodA.source = SourceType.USER;
		delete mockProtocol.foodA.source_url;

		renderFoodASettings(mockWorkspace, mount);

		const badge = mount.querySelector(".food-name-container .badge-custom");
		expect(badge).not.toBeNull();
		expect(badge?.tagName.toLowerCase()).toBe("span"); // Not a link
		expect(badge?.textContent?.trim()).toBe("CUSTOM");
	});
});
