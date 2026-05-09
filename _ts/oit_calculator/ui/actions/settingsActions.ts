import Decimal from "decimal.js";
import {
  updateFoodDetails,
  recalculateStepMethods,
  toggleFoodType,
  updateFoodBAndRecalculate,
  updateFoodBThreshold
} from "../../core/protocol";
import { FoodType, FoodAStrategy } from "../../types";
import type { Protocol } from "../../types";
import type { ProtocolState } from "../../state/protocolState";
import { parseSafeDecimal } from "../../utils";


// --- Food A Handlers ---

/**
 * Updates the name of Food A in the active protocol.
 *
 * @param state - The protocol state container.
 * @param name - The new name for Food A.
 */
export function handleFoodANameChange(state: ProtocolState, name: string) {
  const current = state.getProtocol();
  if (current) {
    const updated = updateFoodDetails(current, 'A', { name });
    state.setProtocol(updated, `Renamed Food A`, { debounceHistory: true });
  }
}

/**
 * Updates the protein content of Food A and recalculates step methods.
 * Ensures the value is non-negative and does not exceed the serving size.
 *
 * @param state - The protocol state container.
 * @param valueStr - The new protein value as a string from UI input.
 */
export function handleFoodAProteinChange(state: ProtocolState, valueStr: string) {
  const current = state.getProtocol();
  if (!current) return;

  // new val cannot be <0, cannot be >serving size, and cannot be an invalid val such as a char or NaN
  const val = parseSafeDecimal(valueStr, current.foodA.gramsInServing, 0);
  const servingSize = current.foodA.servingSize;
  const clamped = val.greaterThan(servingSize) ? servingSize : val;

  const updated = updateFoodDetails(current, 'A', { gramsInServing: clamped });
  state.setProtocol(recalculateStepMethods(updated), `Food A Protein changed to: ${clamped}`);
}

/**
 * Updates the serving size of Food A and recalculates step methods.
 * Ensures the value is at least the current protein content and within practical limits (max 1000).
 *
 * @param state - The protocol state container.
 * @param valueStr - The new serving size value as a string from UI input.
 */
export function handleFoodAServingSizeChange(state: ProtocolState, valueStr: string) {
  const current = state.getProtocol();
  if (!current) return;

  // new val cannot be <0, cannot be <protein amount, and cannot be an invalid val such as a char or NaN
  // also doesn't make sense for a serving size to be grossly large (e.g. 1000 here)
  // as default would prefer the min to be 1 (or the protein content)
  const min = current.foodA.gramsInServing.toNumber();
  const val = parseSafeDecimal(valueStr, current.foodA.servingSize, min);
  let finalVal = val;
  if (finalVal.lessThanOrEqualTo(0)) finalVal = new Decimal(1); // makes sure serving size can't be <=0, in case of protein content being 0
  if (finalVal.greaterThan(1000)) finalVal = new Decimal(1000);

  const updated = updateFoodDetails(current, 'A', { servingSize: finalVal });
  state.setProtocol(recalculateStepMethods(updated), `Food A Serving Size changed to: ${finalVal}`);
}

/**
 * Toggles the physical form (Solid, Liquid, or Capsule) of Food A.
 * Triggers a structural update of all steps associated with Food A.
 *
 * @param state - The protocol state container.
 * @param type - The target FoodType to switch to.
 */
export function handleFoodATypeChange(state: ProtocolState, type: FoodType) {
  const current = state.getProtocol();
  if (current && current.foodA.type !== type) {
    state.setProtocol(toggleFoodType(current, false, type), `Set Food A to ${type}`);
  }
}

/**
 * Updates the dilution strategy for Food A and re-evaluates step methods.
 * Determines whether steps are administered as direct doses or dilutions.
 *
 * @param state - The protocol state container.
 * @param strategy - The new FoodAStrategy selection.
 */
export function handleFoodAStrategyChange(state: ProtocolState, strategy: FoodAStrategy) {
  const current = state.getProtocol();
  if (current && current.foodAStrategy !== strategy) {
    state.setProtocol(
      recalculateStepMethods({ ...current, foodAStrategy: strategy }),
      `Set Food A Strategy: ${strategy}`
    );
  }
}

/**
 * Updates the dilution-to-direct threshold for Food A.
 * When Food A strategy is DILUTE_INITIAL, steps at or above this mass/volume 
 * will be generated as direct doses.
 *
 * @param state - The protocol state container.
 * @param valueStr - The new threshold value as a string from UI input.
 */
export function handleFoodAThresholdChange(state: ProtocolState, valueStr: string) {
  const current = state.getProtocol();
  if (!current) return;

  // threshold cannot be negative, NaN/invalid
  const val = parseSafeDecimal(valueStr, current.diThreshold, 0);
  const updated: Protocol = { ...current, diThreshold: val };
  state.setProtocol(recalculateStepMethods(updated), `Food A DI Threshold changed to: ${val}`);
}

// --- Food B Handlers ---

/**
 * Updates the name of Food B in the active protocol.
 *
 * @param state - The protocol state container.
 * @param name - The new name for Food B.
 */
export function handleFoodBNameChange(state: ProtocolState, name: string) {
  const current = state.getProtocol();
  if (current && current.foodB) {
    const updated = updateFoodDetails(current, 'B', { name });
    state.setProtocol(updated, `Renamed Food B`, { debounceHistory: true });
  }
}

/**
 * Updates the protein content of Food B and recalculates the transition point.
 * Ensures the value is non-negative and does not exceed Food B's serving size.
 *
 * @param state - The protocol state container.
 * @param valueStr - The new protein value as a string from UI input.
 */
export function handleFoodBProteinChange(state: ProtocolState, valueStr: string) {
  const current = state.getProtocol();
  if (!current || !current.foodB) return;

  const val = parseSafeDecimal(valueStr, current.foodB.gramsInServing, 0);
  const servingSize = current.foodB.servingSize;
  const clamped = val.greaterThan(servingSize) ? servingSize : val;

  const updated = updateFoodBAndRecalculate(current, { gramsInServing: clamped });
  state.setProtocol(updated, `Food B Protein changed to: ${clamped}`);
}

/**
 * Updates the serving size of Food B and recalculates the transition point.
 * Ensures the value is at least the current protein content and within practical limits (max 1000).
 *
 * @param state - The protocol state container.
 * @param valueStr - The new serving size value as a string from UI input.
 */
export function handleFoodBServingSizeChange(state: ProtocolState, valueStr: string) {
  const current = state.getProtocol();
  if (!current || !current.foodB) return;

  const min = current.foodB.gramsInServing.toNumber();
  const val = parseSafeDecimal(valueStr, current.foodB.servingSize, min);

  let finalVal = val;
  if (finalVal.lessThanOrEqualTo(0)) finalVal = new Decimal(1);
  if (finalVal.greaterThan(1000)) finalVal = new Decimal(1000);

  const updated = updateFoodBAndRecalculate(current, { servingSize: finalVal });
  state.setProtocol(updated, `Food B Serving Size changed to: ${finalVal}`);
}

/**
 * Toggles the physical form (Solid or Liquid) of Food B.
 * Triggers a structural update of all steps associated with Food B.
 *
 * @param state - The protocol state container.
 * @param type - The target FoodType to switch to.
 */
export function handleFoodBTypeChange(state: ProtocolState, type: FoodType) {
  const current = state.getProtocol();
  if (current && current.foodB && current.foodB.type !== type) {
    state.setProtocol(toggleFoodType(current, true, type), `Set Food B to ${type}`);
  }
}

/**
 * Updates the transition threshold for Food B.
 * Steps at or above this mass/volume will switch from the primary food (Food A) 
 * to Food B.
 *
 * @param state - The protocol state container.
 * @param valueStr - The new threshold value as a string from UI input.
 */
export function handleFoodBThresholdChange(state: ProtocolState, valueStr: string) {
  const current = state.getProtocol();
  if (!current || !current.foodBThreshold) return;

  const val = parseSafeDecimal(valueStr, current.foodBThreshold.amount, 0);
  const updated = updateFoodBThreshold(current, val);
  state.setProtocol(updated, `Food B Threshold changed to: ${val}`);
}
