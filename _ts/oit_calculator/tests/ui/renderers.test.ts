import { describe, it, expect, beforeEach } from "vitest";
import { updateWarnings } from "../../ui/renderers";
import type { Protocol, Warning } from "../../types";

describe("Renderer: updateWarnings", () => {
  let container: HTMLElement;
  const rulesURL = "https://example.com/rules";

  beforeEach(() => {
    // Create the expected DOM structure for updateWarnings
    document.body.innerHTML = '<div class="warnings-container"></div>';
    container = document.querySelector(".warnings-container") as HTMLElement;
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
      { severity: "red", code: "TOO_FEW_STEPS" as any, message: "Global Red" },
      { severity: "yellow", code: "LOW_SERVINGS" as any, message: "Step 1 Yellow", stepIndex: 1 },
    ];

    updateWarnings(mockProtocol, rulesURL, warnings);

    // Check summary badges
    expect(container.querySelector(".summary-badge.red")?.textContent).toContain("1");
    expect(container.querySelector(".summary-badge.yellow")?.textContent).toContain("1");

    // Check warning groups
    const groups = container.querySelectorAll(".warning-group");
    expect(groups).toHaveLength(2);
    
    expect(groups[0].classList.contains("severity-red")).toBe(true);
    expect(groups[0].querySelector(".warning-header")?.textContent).toBe("Protocol Issues");

    expect(groups[1].classList.contains("severity-yellow")).toBe(true);
    expect(groups[1].querySelector(".warning-header")?.textContent).toBe("Step 1");
  });

  it("should format messages correctly (stripping prefixes)", () => {
    const mockProtocol = {} as Protocol;
    const warnings: Warning[] = [
      { severity: "yellow", code: "LOW_SERVINGS" as any, message: "Step 1: Low servings", stepIndex: 1 },
    ];

    updateWarnings(mockProtocol, rulesURL, warnings);

    const message = container.querySelector(".warning-list li")?.textContent?.trim();
    expect(message).toBe("Low servings");
  });
});
