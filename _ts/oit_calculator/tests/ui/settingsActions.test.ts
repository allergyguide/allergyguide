import { describe, it, expect, beforeEach, vi } from "vitest";
import Decimal from "decimal.js";
import {
  handleFoodANameChange,
  handleFoodAProteinChange,
  handleFoodAServingSizeChange,
  handleFoodAStrategyChange,
  handleFoodAThresholdChange,
  handleFoodBThresholdChange,
  handleFoodBNameChange,
  handleFoodBProteinChange,
  handleFoodBTypeChange,
  handleFoodATypeChange
} from "../../ui/actions/settingsActions";
import { FoodType, FoodAStrategy, DosingStrategy } from "../../types";
import { parseSafeDecimal } from "../../utils";
import { DEFAULT_CONFIG } from "../../constants";

describe("parseSafeDecimal", () => {
  it("should parse a valid decimal string", () => {
    expect(parseSafeDecimal("1.5", new Decimal(0)).toString()).toBe("1.5");
  });

  it("should return defaultValue for invalid string", () => {
    const def = new Decimal(10);
    expect(parseSafeDecimal("abc", def).toString()).toBe("10");
  });

  it("should return defaultValue for empty string", () => {
    const def = new Decimal(5);
    expect(parseSafeDecimal("", def).toString()).toBe("5");
  });

  it("should clamp to min value if input is lower", () => {
    expect(parseSafeDecimal("-5", new Decimal(0), 0).toString()).toBe("0");
    expect(parseSafeDecimal("1", new Decimal(0), 5).toString()).toBe("5");
  });
});

describe("Action Handlers", () => {
  let mockActive: any;
  let mockProtocol: any;

  beforeEach(() => {
    mockProtocol = {
      foodA: {
        name: "Food A",
        gramsInServing: new Decimal(5),
        servingSize: new Decimal(250),
        type: FoodType.SOLID,
        getMgPerUnit: () => new Decimal(20)
      },
      foodB: null,
      foodAStrategy: FoodAStrategy.DILUTE_INITIAL,
      diThreshold: new Decimal(0.5),
      dosingStrategy: DosingStrategy.STANDARD,
      steps: [],
      config: DEFAULT_CONFIG
    };

    mockActive = {
      getProtocol: vi.fn().mockReturnValue(mockProtocol),
      setProtocol: vi.fn()
    };
  });

  it("handleFoodANameChange should update name and call setProtocol", () => {
    vi.useFakeTimers();
    handleFoodANameChange(mockActive, "New Name");
    vi.runAllTimers();
    expect(mockActive.setProtocol).toHaveBeenCalledWith(
      expect.objectContaining({
        foodA: expect.objectContaining({ name: "New Name" })
      }),
      "Renamed Food A"
    );
    vi.useRealTimers();
  });

  it("handleFoodAProteinChange should clamp protein and update protocol", () => {
    // Over servingSize (250) -> should clamp to 250
    handleFoodAProteinChange(mockActive, "300");
    expect(mockActive.setProtocol).toHaveBeenCalledWith(
      expect.objectContaining({
        foodA: expect.objectContaining({ gramsInServing: new Decimal(250) })
      }),
      expect.stringContaining("Food A Protein changed")
    );

    // Negative -> should clamp to 0
    handleFoodAProteinChange(mockActive, "-10");
    expect(mockActive.setProtocol).toHaveBeenLastCalledWith(
      expect.objectContaining({
        foodA: expect.objectContaining({ gramsInServing: new Decimal(0) })
      }),
      expect.stringContaining("Food A Protein changed")
    );
  });

  it("handleFoodAServingSizeChange should clamp and update", () => {
    // Less than protein (5) -> should clamp to 5
    handleFoodAServingSizeChange(mockActive, "2");
    expect(mockActive.setProtocol).toHaveBeenCalledWith(
      expect.objectContaining({
        foodA: expect.objectContaining({ servingSize: new Decimal(5) })
      }),
      expect.stringContaining("Food A Serving Size changed")
    );

    // Over 1000 -> should clamp to 1000
    handleFoodAServingSizeChange(mockActive, "2000");
    expect(mockActive.setProtocol).toHaveBeenLastCalledWith(
      expect.objectContaining({
        foodA: expect.objectContaining({ servingSize: new Decimal(1000) })
      }),
      expect.stringContaining("Food A Serving Size changed")
    );
  });

  it("handleFoodATypeChange should toggle type", () => {
    handleFoodATypeChange(mockActive, FoodType.LIQUID);
    expect(mockActive.setProtocol).toHaveBeenCalled();
  });

  it("handleFoodAStrategyChange should update strategy", () => {
    handleFoodAStrategyChange(mockActive, FoodAStrategy.DILUTE_ALL);
    expect(mockActive.setProtocol).toHaveBeenCalledWith(
      expect.objectContaining({
        foodAStrategy: FoodAStrategy.DILUTE_ALL
      }),
      expect.stringContaining("Food A Strategy")
    );
  });

  it("handleFoodAThresholdChange should clamp and update", () => {
    handleFoodAThresholdChange(mockActive, "-1");
    expect(mockActive.setProtocol).toHaveBeenCalledWith(
      expect.objectContaining({
        diThreshold: new Decimal(0)
      }),
      expect.stringContaining("Food A DI Threshold")
    );
  });

  describe("Food B Actions", () => {
    beforeEach(() => {
      mockProtocol.foodB = {
        name: "Food B",
        gramsInServing: new Decimal(5),
        servingSize: new Decimal(100),
        type: FoodType.SOLID,
        getMgPerUnit: () => new Decimal(50)
      };
      mockProtocol.foodBThreshold = { amount: new Decimal(0.5), unit: "g" };
    });

    it("handleFoodBNameChange should update name", () => {
      vi.useFakeTimers();
      handleFoodBNameChange(mockActive, "New Food B");
      vi.runAllTimers();
      expect(mockActive.setProtocol).toHaveBeenCalledWith(
        expect.objectContaining({
          foodB: expect.objectContaining({ name: "New Food B" })
        }),
        "Renamed Food B"
      );
      vi.useRealTimers();
    });

    it("handleFoodBProteinChange should update Food B protein", () => {
      handleFoodBProteinChange(mockActive, "10");
      expect(mockActive.setProtocol).toHaveBeenCalledWith(
        expect.objectContaining({
          foodB: expect.objectContaining({ gramsInServing: new Decimal(10) })
        }),
        expect.stringContaining("Food B Protein changed")
      );
    });

    it("handleFoodBThresholdChange should update threshold", () => {
      handleFoodBThresholdChange(mockActive, "1.0");
      expect(mockActive.setProtocol).toHaveBeenCalledWith(
        expect.objectContaining({
          foodBThreshold: expect.objectContaining({ amount: new Decimal(1.0) })
        }),
        expect.stringContaining("Food B Threshold changed")
      );
    });

    it("handleFoodBTypeChange should toggle Food B type", () => {
      handleFoodBTypeChange(mockActive, FoodType.LIQUID);
      expect(mockActive.setProtocol).toHaveBeenCalled();
    });
  });
});
