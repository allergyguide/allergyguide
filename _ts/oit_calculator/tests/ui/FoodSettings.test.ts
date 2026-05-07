import { describe, it, expect, beforeEach, vi } from "vitest";
import Decimal from "decimal.js";
import { renderFoodASettings, renderFoodBSettings } from "../../ui/components/FoodSettings";
import { FoodType, FoodAStrategy, DosingStrategy } from "../../types";

describe("FoodSettings Component", () => {
  let mockWorkspace: any;
  let mockProtocol: any;
  let mount: HTMLElement;

  beforeEach(() => {
    mount = document.createElement("div");
    mockProtocol = {
      foodA: { 
        name: "Food A", 
        gramsInServing: new Decimal(5), 
        servingSize: new Decimal(250), 
        type: FoodType.SOLID 
      },
      foodB: null,
      foodAStrategy: FoodAStrategy.DILUTE_INITIAL,
      diThreshold: new Decimal(0.5),
      dosingStrategy: DosingStrategy.STANDARD,
      steps: []
    };

    const mockActive = {
      getProtocol: vi.fn().mockReturnValue(mockProtocol),
      setProtocol: vi.fn(),
      setAdvancedSettingsOpen: vi.fn(),
      isAdvancedSettingsOpen: false
    };

    mockWorkspace = {
      getActive: vi.fn().mockReturnValue(mockActive)
    };
  });

  it("should render Food A name in the input", () => {
    renderFoodASettings(mockWorkspace, mount);
    const input = mount.querySelector("#food-a-name") as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.value).toBe("Food A");
  });

  it("should render Food A protein and serving size", () => {
    renderFoodASettings(mockWorkspace, mount);
    const proteinInput = mount.querySelector("#food-a-protein") as HTMLInputElement;
    const servingInput = mount.querySelector("#food-a-serving-size") as HTMLInputElement;
    expect(proteinInput.value).toBe("5.0");
    expect(servingInput.value).toBe("250.0");
  });

  it("should render ml unit for liquid Food A", () => {
    mockProtocol.foodA.type = FoodType.LIQUID;
    renderFoodASettings(mockWorkspace, mount);
    // Find the unit span specifically
    const unitSpan = mount.querySelector(".input-unit-group span:last-of-type");
    expect(unitSpan?.textContent).toBe("ml");
  });

  it("should disable inputs for Capsule type", () => {
    mockProtocol.foodA.type = FoodType.CAPSULE;
    renderFoodASettings(mockWorkspace, mount);
    const proteinInput = mount.querySelector("#food-a-protein") as HTMLInputElement;
    const servingInput = mount.querySelector("#food-a-serving-size") as HTMLInputElement;
    expect(proteinInput.disabled).toBe(true);
    expect(servingInput.disabled).toBe(true);
  });

  it("should render Food B if present", () => {
    mockProtocol.foodB = {
      name: "Food B",
      gramsInServing: new Decimal(20),
      servingSize: new Decimal(100),
      type: FoodType.SOLID,
      getMgPerUnit: () => new Decimal(200)
    };
    mockProtocol.foodBThreshold = { amount: new Decimal(0.4), unit: "g" };

    renderFoodBSettings(mockWorkspace, mount);
    const nameInput = mount.querySelector("#food-b-name") as HTMLInputElement;
    expect(nameInput.value).toBe("Food B");
    
    const thresholdInput = mount.querySelector("#food-b-threshold") as HTMLInputElement;
    expect(thresholdInput.value).toBe("0.40");
  });

  it("should toggle advanced settings open state", () => {
    renderFoodASettings(mockWorkspace, mount);
    const details = mount.querySelector("details") as HTMLDetailsElement;
    expect(details.open).toBe(false);

    // Simulate toggle
    details.open = true;
    details.dispatchEvent(new Event("toggle"));
    expect(mockWorkspace.getActive().setAdvancedSettingsOpen).toHaveBeenCalledWith(true);
  });
});
