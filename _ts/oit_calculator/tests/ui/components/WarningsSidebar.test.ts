import { describe, it, expect, beforeEach } from "vitest";
import { render } from "lit-html";
import { WarningsSidebar, groupAndSortWarnings } from "../../../ui/components/WarningsSidebar";
import type { Warning } from "../../../types";
import { WarningCode } from "../../../types";

describe("WarningsSidebar Component", () => {
  let mount: HTMLElement;
  const rulesURL = "https://example.com/rules";

  beforeEach(() => {
    mount = document.createElement("div");
  });

  describe("groupAndSortWarnings", () => {
    it("should group global and step-specific warnings", () => {
      const warnings: Warning[] = [
        { severity: "red", code: WarningCode.Red.TOO_FEW_STEPS, message: "Too few steps" },
        { severity: "yellow", code: WarningCode.Yellow.LOW_SERVINGS, message: "Step 1: Low servings", stepIndex: 1 },
        { severity: "red", code: WarningCode.Red.PROTEIN_MISMATCH, message: "Step 1: Protein mismatch", stepIndex: 1 },
        { severity: "yellow", code: WarningCode.Yellow.DUPLICATE_STEP, message: "Step 2: Duplicate", stepIndex: 2 },
      ];

      const result = groupAndSortWarnings(warnings);

      expect(result.global).toHaveLength(1);
      expect(result.global[0].message).toBe("Too few steps");

      expect(result.steps).toHaveLength(2);
      expect(result.steps[0].index).toBe(1);
      expect(result.steps[0].warnings).toHaveLength(2);
      // Red should be first in the step group
      expect(result.steps[0].warnings[0].severity).toBe("red");
      expect(result.steps[0].warnings[1].severity).toBe("yellow");

      expect(result.steps[1].index).toBe(2);
    });

    it("should strip redundant prefixes from messages", () => {
      const warnings: Warning[] = [
        { severity: "yellow", code: WarningCode.Yellow.LOW_SERVINGS, message: "Step 1: Low servings", stepIndex: 1 },
        { severity: "red", code: WarningCode.Red.TOO_FEW_STEPS, message: "Protocol Issues: Global issue" },
      ];

      const result = groupAndSortWarnings(warnings);

      expect(result.steps[0].warnings[0].message).toBe("Low servings");
      expect(result.global[0].message).toBe("Global issue");
    });
  });

  describe("WarningsSidebar Template", () => {
    it("should render empty state with rules link", () => {
      render(WarningsSidebar([], rulesURL), mount);
      
      const noWarnings = mount.querySelector(".no-warnings");
      expect(noWarnings).not.toBeNull();
      
      const link = noWarnings?.querySelector("a");
      expect(link?.getAttribute("href")).toBe(rulesURL);
      expect(link?.getAttribute("target")).toBe("_blank");
    });

    it("should render summary badges", () => {
      const warnings: Warning[] = [
        { severity: "red", code: WarningCode.Red.TOO_FEW_STEPS, message: "Red 1" },
        { severity: "yellow", code: WarningCode.Yellow.LOW_SERVINGS, message: "Yellow 1" },
        { severity: "red", code: WarningCode.Red.PROTEIN_MISMATCH, message: "Red 2" },
      ];

      render(WarningsSidebar(warnings, rulesURL), mount);

      const redBadge = mount.querySelector(".summary-badge.red");
      const yellowBadge = mount.querySelector(".summary-badge.yellow");

      expect(redBadge?.textContent).toContain("2");
      expect(redBadge?.textContent).toContain("Critical");
      expect(yellowBadge?.textContent).toContain("1");
      expect(yellowBadge?.textContent).toContain("Caution");
    });

    it("should render global and step groups with correct classes", () => {
      const warnings: Warning[] = [
        { severity: "red", code: WarningCode.Red.TOO_FEW_STEPS, message: "Global Red" },
        { severity: "yellow", code: WarningCode.Yellow.LOW_SERVINGS, message: "Step 1 Yellow", stepIndex: 1 },
      ];

      render(WarningsSidebar(warnings, rulesURL), mount);

      const groups = mount.querySelectorAll(".warning-group");
      expect(groups).toHaveLength(2);

      expect(groups[0].classList.contains("severity-red")).toBe(true);
      expect(groups[0].querySelector(".warning-header")?.textContent).toBe("Protocol Issues");

      expect(groups[1].classList.contains("severity-yellow")).toBe(true);
      expect(groups[1].querySelector(".warning-header")?.textContent).toBe("Step 1");
    });
  });
});
