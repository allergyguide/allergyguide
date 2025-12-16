/**
 * @module
 *
 * High-level actions triggered by UI interactions
 */
import Decimal from "decimal.js";
import { protocolState } from "../state/instances";
import { generateDefaultProtocol, generateStepForTarget } from "../core/calculator";
import { addFoodBToProtocol } from "../core/protocol";
import type { FoodData, ProtocolData, Food, Protocol, Step, Unit } from "../types";
import { FoodType, DosingStrategy, FoodAStrategy, Method } from "../types";
import { DEFAULT_CONFIG } from "../constants";

/**
 * Select Food A from database entry and initialize a default protocol.
 * Change global protocolState
 *
 * @param foodData Entry from the foods database
 * @returns void
 */

export function selectFoodA(foodData: FoodData): void {
  const food: Food = {
    name: foodData.Food,
    type: foodData.Type === "SOLID" ? FoodType.SOLID : FoodType.LIQUID,
    gramsInServing: new Decimal(foodData["Mean protein in grams"]),
    servingSize: new Decimal(foodData["Serving size"]),
    getMgPerUnit: function() {
      return this.gramsInServing.times(1000).dividedBy(this.servingSize);
    },
  };

  const newProtocol = generateDefaultProtocol(food, DEFAULT_CONFIG);
  protocolState.setProtocol(newProtocol, `Selected Food A: ${food.name}`);

  // clear search bar input after
  const input = document.getElementById("food-a-search") as HTMLInputElement;
  if (input) input.value = "";
}

/**
 * Select Food B from database entry and compute transition steps
 *
 * Applies DEFAULT_FOOD_B_THRESHOLD as the initial transition threshold
 * Changes global protocolState
 *
 * @param foodData Entry from the foods database
 * @returns void
 */
export function selectFoodB(foodData: FoodData): void {
  const current = protocolState.getProtocol();
  if (!current) return;

  const food: Food = {
    name: foodData.Food,
    type: foodData.Type === "SOLID" ? FoodType.SOLID : FoodType.LIQUID,
    gramsInServing: new Decimal(foodData["Mean protein in grams"]),
    servingSize: new Decimal(foodData["Serving size"]),
    getMgPerUnit: function() {
      return this.gramsInServing.times(1000).dividedBy(this.servingSize);
    },
  };

  const threshold = {
    unit: food.type === FoodType.SOLID ? ("g" as Unit) : ("ml" as Unit),
    amount: DEFAULT_CONFIG.DEFAULT_FOOD_B_THRESHOLD,
  };

  const updated = addFoodBToProtocol(current, food, threshold);
  protocolState.setProtocol(updated, `Selected Food B: ${food.name}`);

  // clear food B searchbar input after
  const input = document.getElementById("food-b-search") as HTMLInputElement;
  if (input) input.value = "";
}

/**
 * Create and select a custom food for Food A or Food B
 *
 * Defaults to SOLID with 10 g protein per 100 g (100 mg/g) until edited
 * For Food A, initializes a new protocol; for Food B, attaches to current protocol
 * Changes global protocolState instance
 *
 * @param name Display name for the custom food
 * @param inputId Source input id ("food-a-search" or "food-b-search")
 * @returns void
 */
export function selectCustomFood(name: string, inputId: string): void {
  const food: Food = {
    name: name || "Custom Food",
    type: FoodType.SOLID,
    gramsInServing: new Decimal(10),
    servingSize: new Decimal(100),
    getMgPerUnit: function() {
      return this.gramsInServing.times(1000).dividedBy(this.servingSize);
    },
  };

  if (inputId === "food-a-search") {
    const newProtocol = generateDefaultProtocol(food, DEFAULT_CONFIG);
    protocolState.setProtocol(newProtocol, `Selected Custom Food A: ${food.name}`)
  } else {
    const current = protocolState.getProtocol();
    if (!current) return;
    const threshold = {
      unit: "g" as Unit,
      amount: DEFAULT_CONFIG.DEFAULT_FOOD_B_THRESHOLD,
    };
    const updated = addFoodBToProtocol(current, food, threshold);
    protocolState.setProtocol(updated, `Selected Custom Food B: ${food.name}`);
  }

  // clear input bar, whatever one it was
  const input = document.getElementById(inputId) as HTMLInputElement;
  if (input) input.value = "";
}

/**
 * Load a protocol template from JSON metadata.
 *
 * Populates Food A, strategy, thresholds, and the step/row table. Also loads Food B and its threshold if present. Computes servings for any dilution steps.
 *
 * changes global protocolState instance to trigger rerender
 *
 * @param protocolData Protocol template record
 * @returns void
 */
export function selectProtocol(protocolData: ProtocolData): void {

  const foodA: Food = {
    name: protocolData.food_a.name,
    type: protocolData.food_a.type === "SOLID" ? FoodType.SOLID : FoodType.LIQUID,
    gramsInServing: new Decimal(protocolData.food_a.gramsInServing),
    servingSize: new Decimal(protocolData.food_a.servingSize),
    getMgPerUnit: function() {
      return this.gramsInServing.times(1000).dividedBy(this.servingSize);
    },
  };

  const protocol: Protocol = {
    dosingStrategy: DosingStrategy[protocolData.dosing_strategy as keyof typeof DosingStrategy],
    foodA,
    foodAStrategy: FoodAStrategy[protocolData.food_a_strategy as keyof typeof FoodAStrategy],
    diThreshold: new Decimal(protocolData.di_threshold),
    steps: [],
    config: DEFAULT_CONFIG,
  };

  if (protocolData.custom_note) {
    protocolState.setCustomNote(protocolData.custom_note);
  }

  // load steps 
  const tableToLoad = protocolData.table;

  // load steps from relevant table
  for (let i = 0; i < tableToLoad.length; i++) {
    const row = tableToLoad[i];

    const isFoodA = row.food === "A";
    let unit: Unit = "g"
    if (row.method === "DILUTE") {
      unit = "ml"
    } else if (isFoodA) {
      unit = foodA.type === FoodType.SOLID ? "g" : "ml";
    } else {
      //isFoodB
      const typeB = protocolData.food_b?.type;
      unit = typeB === "LIQUID" ? "ml" : "g";
    }


    const step: Step = {
      stepIndex: i + 1,
      targetMg: new Decimal(row.protein),
      method: row.method === "DILUTE" ? Method.DILUTE : Method.DIRECT,
      dailyAmount: new Decimal(row.daily_amount),
      dailyAmountUnit: unit,
      food: row.food,
    };

    if (row.method === "DILUTE") { // mix_amount and water_amount are guaranteed by RowDataSchema
      step.mixFoodAmount = new Decimal(row.mix_amount);
      step.mixWaterAmount = new Decimal(row.water_amount);
      // Calculate servings
      const food = row.food === "A" ? foodA : protocol.foodB!;
      const totalMixProtein = step.mixFoodAmount.times(food.getMgPerUnit());
      step.servings = totalMixProtein.dividedBy(step.targetMg);
    }

    protocol.steps.push(step);
  }

  // Load Food B if present
  if (protocolData.food_b) {
    protocol.foodB = {
      name: protocolData.food_b.name,
      type: protocolData.food_b.type === "SOLID" ? FoodType.SOLID : FoodType.LIQUID,
      gramsInServing: new Decimal(protocolData.food_b.gramsInServing),
      servingSize: new Decimal(protocolData.food_b.servingSize),
      getMgPerUnit: function() {
        return this.gramsInServing.times(1000).dividedBy(this.servingSize);
      },
    };

    if (protocolData.food_b_threshold) {
      protocol.foodBThreshold = {
        unit: protocol.foodB.type === FoodType.SOLID ? "g" : "ml",
        amount: new Decimal(protocolData.food_b_threshold),
      };
    }
  }
  protocolState.setProtocol(protocol, `Loaded protocol: ${protocolData.name}`);

  // clear search 
  const input = document.getElementById("food-a-search") as HTMLInputElement;
  if (input) input.value = "";
}

/**
 * Remove Food B and its transition from the current protocol.
 * Rebuilds the protocol using only Food A, but preserving the existing step target proteins.
 *
 * @returns void
 */
export function clearFoodB(): void {
  const current = protocolState.getProtocol();
  if (!current) return;

  // if there's no food B to begin with return early so history stack isn't polluted
  // and needless calculations are done
  if (!current.foodB || !current.foodBThreshold) return;

  // Create shallow copy without Food B
  const protocolWithoutB: Protocol = {
    ...current,
    foodB: undefined,
    foodBThreshold: undefined
  };

  const newSteps: Step[] = [];

  // Filter out the redundant transition step if it exists
  // e.g. food A 80mg -> food B 80mg, on clear food B the latter step should be removed...
  // Criteria: Current step is Food B, Previous step is Food A, and Targets are identical
  const filteredSteps = current.steps.filter((step, index) => {
    if (index === 0) return true;
    const prevStep = current.steps[index - 1];

    if (
      prevStep.food === "A" &&
      step.food === "B" &&
      step.targetMg.equals(prevStep.targetMg)
    ) {
      return false;
    }
    return true;
  });

  // Iterate over filtered steps to preserve their targetMg
  filteredSteps.forEach((step, i) => {
    // generate a step for Food A for this target
    const newStep = generateStepForTarget(
      step.targetMg,
      i + 1, // 1-based index
      protocolWithoutB.foodA,
      protocolWithoutB.foodAStrategy,
      protocolWithoutB.diThreshold,
      protocolWithoutB.config
    );

    if (newStep) {
      newSteps.push(newStep);
    } else {
      // Fallback if dilution fails (e.g. target too small for Food A config)
      // force a DIRECT step so the data isn't lost
      console.error("Unable to find new valid dilution for step:", step);
      const unit = protocolWithoutB.foodA.type === FoodType.SOLID ? "g" : "ml";
      newSteps.push({
        stepIndex: i + 1,
        targetMg: step.targetMg,
        method: Method.DIRECT,
        dailyAmount: step.targetMg.dividedBy(protocolWithoutB.foodA.getMgPerUnit()),
        dailyAmountUnit: unit,
        food: "A"
      });
    }
  });

  protocolWithoutB.steps = newSteps;
  protocolState.setProtocol(protocolWithoutB, "Cleared Food B");
}
