import * as litHtml from "lit-html";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Protocol, Warning } from "../../types";
import { WarningCode } from "../../types";
import { renderProtocolTable, updateWarnings } from "../../ui/renderers";

// Mock lit-html to spy on render calls
vi.mock("lit-html", async () => {
	const actual = (await vi.importActual("lit-html")) as any;
	return {
		...actual,
		render: vi.fn(actual.render),
	};
});

describe("Renderer: updateWarnings", () => {
	let container: HTMLElement;
	const rulesURL = "https://example.com/rules";

	beforeEach(() => {
		// Create the expected DOM structure for updateWarnings
		document.body.innerHTML = '<div class="warnings-container"></div>';
		container = document.querySelector(".warnings-container") as HTMLElement;
		vi.clearAllMocks();
	});

	it("should render the empty state when no warnings are present", () => {
		const mockProtocol = {} as Protocol;
		updateWarnings(mockProtocol, rulesURL, []);

		expect(container.querySelector(".no-warnings")).not.toBeNull();
		expect(container.querySelector("a")?.getAttribute("href")).toBe(rulesURL);
	});

	it("should render summary badges and warning groups", () => {
		const mockProtocol = {} as Protocol;
		const warnings: Warning[] = [
			{
				severity: "red",
				code: WarningCode.Red.TOO_FEW_STEPS,
				message: "Global Red",
			},
			{
				severity: "yellow",
				code: WarningCode.Yellow.LOW_SERVINGS,
				message: "Step 1 Yellow",
				stepIndex: 1,
			},
		];

		updateWarnings(mockProtocol, rulesURL, warnings);

		// Check summary badges
		expect(
			container.querySelector(".summary-badge.red")?.textContent,
		).toContain("1");
		expect(
			container.querySelector(".summary-badge.yellow")?.textContent,
		).toContain("1");

		// Check warning groups
		const groups = container.querySelectorAll(".warning-group");
		expect(groups).toHaveLength(2);

		expect(groups[0].classList.contains("severity-red")).toBe(true);
		expect(groups[0].querySelector(".warning-header")?.textContent).toBe(
			"Protocol Issues",
		);

		expect(groups[1].classList.contains("severity-yellow")).toBe(true);
		expect(groups[1].querySelector(".warning-header")?.textContent).toBe(
			"Step 1",
		);
	});

	it("should format messages correctly (stripping prefixes)", () => {
		const mockProtocol = {} as Protocol;
		const warnings: Warning[] = [
			{
				severity: "yellow",
				code: WarningCode.Yellow.LOW_SERVINGS,
				message: "Step 1: Low servings",
				stepIndex: 1,
			},
		];

		updateWarnings(mockProtocol, rulesURL, warnings);

		const message = container
			.querySelector(".warning-list li")
			?.textContent?.trim();
		expect(message).toBe("Low servings");
	});
});

describe("Renderer: renderProtocolTable", () => {
	beforeEach(() => {
		// Mock the full OIT UI structure needed for renderProtocolTable and renderEmptyState
		document.body.innerHTML = `
      <div id="empty-state-container"></div>
      <div id="protocol-table-mount"></div>
      <div class="warnings-container"></div>
      <div class="dosing-strategy-container"></div>
      <div class="step-controls-footer"></div>
      <div class="bottom-section"></div>
      <div class="settings-container"></div>
      <div class="oit-toolbar"></div>
    `;
		vi.clearAllMocks();
	});

	it("should clear warnings container using lit-html when protocol is null", () => {
		const warningsContainer = document.querySelector(
			".warnings-container",
		) as HTMLElement;

		// Call with null protocol (simulating tab switch to empty)
		renderProtocolTable(null, "", false, []);

		// Regression check: Ensure render(nothing, container) was called instead of warningsContainer.innerHTML = ""
		expect(litHtml.render).toHaveBeenCalledWith(
			litHtml.nothing,
			warningsContainer,
		);

		// Also verify that the container is effectively empty
		expect(warningsContainer.innerHTML.replace("<!---->", "")).toBe("");
	});
});
