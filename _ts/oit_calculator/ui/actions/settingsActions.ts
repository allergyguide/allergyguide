import Decimal from "decimal.js";
import {
	recalculateStepMethods,
	toggleFoodType,
	updateFoodBAndRecalculate,
	updateFoodBThreshold,
} from "../../core/protocol";
import type { ProtocolState } from "../../state/protocolState";
import {
	type Food,
	type FoodAStrategy,
	type FoodType,
	type Protocol,
	SourceType,
} from "../../types";
import { parseSafeDecimal } from "../../utils";

/**
 * Strips metadata and flips source to USER if the food was previously any other source.
 * @param food The food object to evaluate and potentially modify
 * @returns A new food object with the chain of custody broken if necessary, or the original food
 */
function breakChainOfCustody(food: Food): Food {
	if (food.source !== SourceType.USER) {
		const {
			id,
			source_url,
			keywords,
			last_updated,
			is_active,
			getMgPerUnit,
			...rest
		} = food;
		return {
			...rest,
			source: SourceType.USER,
			getMgPerUnit,
		};
	}
	return food;
}

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
		// Meaningful name change check (case-sensitive, trimmed)
		const isMeaningfulChange = name.trim() !== current.foodA.name.trim();

		let updatedFoodA = { ...current.foodA, name };
		if (isMeaningfulChange) {
			updatedFoodA = breakChainOfCustody(updatedFoodA);
		}

		const updated = { ...current, foodA: updatedFoodA };
		state.setProtocol(updated, "Renamed Food A", { debounceHistory: true });
	}
}

/**
 * Updates the protein content of Food A and recalculates step methods.
 * Ensures the value is non-negative and does not exceed the serving size.
 *
 * @param state - The protocol state container.
 * @param valueStr - The new protein value as a string from UI input.
 */
export function handleFoodAProteinChange(
	state: ProtocolState,
	valueStr: string,
) {
	const current = state.getProtocol();
	if (!current) return;

	// new val cannot be <0, cannot be >serving size, and cannot be an invalid val such as a char or NaN
	const val = parseSafeDecimal(valueStr, current.foodA.gramsInServing, 0);
	const servingSize = current.foodA.servingSize;
	const clamped = val.greaterThan(servingSize) ? servingSize : val;

	const isMeaningfulChange = !clamped.equals(current.foodA.gramsInServing);

	let updatedFoodA = { ...current.foodA, gramsInServing: clamped };
	if (isMeaningfulChange) {
		updatedFoodA = breakChainOfCustody(updatedFoodA);
	}

	const updated = recalculateStepMethods({ ...current, foodA: updatedFoodA });
	state.setProtocol(updated, `Food A Protein changed to: ${clamped}`);
}

/**
 * Updates the serving size of Food A and recalculates step methods.
 * Ensures the value is at least the current protein content and within practical limits (max 1000).
 *
 * @param state - The protocol state container.
 * @param valueStr - The new serving size value as a string from UI input.
 */
export function handleFoodAServingSizeChange(
	state: ProtocolState,
	valueStr: string,
) {
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

	const isMeaningfulChange = !finalVal.equals(current.foodA.servingSize);

	let updatedFoodA = { ...current.foodA, servingSize: finalVal };
	if (isMeaningfulChange) {
		updatedFoodA = breakChainOfCustody(updatedFoodA);
	}

	const updated = recalculateStepMethods({ ...current, foodA: updatedFoodA });
	state.setProtocol(updated, `Food A Serving Size changed to: ${finalVal}`);
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
		const updated = toggleFoodType(current, false, type);
		updated.foodA = breakChainOfCustody(updated.foodA);
		state.setProtocol(updated, `Set Food A to ${type}`);
	}
}

/**
 * Updates the dilution strategy for Food A and re-evaluates step methods.
 * Determines whether steps are administered as direct doses or dilutions.
 *
 * @param state - The protocol state container.
 * @param strategy - The new FoodAStrategy selection.
 */
export function handleFoodAStrategyChange(
	state: ProtocolState,
	strategy: FoodAStrategy,
) {
	const current = state.getProtocol();
	if (current && current.foodAStrategy !== strategy) {
		state.setProtocol(
			recalculateStepMethods({ ...current, foodAStrategy: strategy }),
			`Set Food A Strategy: ${strategy}`,
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
export function handleFoodAThresholdChange(
	state: ProtocolState,
	valueStr: string,
) {
	const current = state.getProtocol();
	if (!current) return;

	// threshold cannot be negative, NaN/invalid
	const val = parseSafeDecimal(valueStr, current.diThreshold, 0);
	const updated: Protocol = { ...current, diThreshold: val };
	state.setProtocol(
		recalculateStepMethods(updated),
		`Food A DI Threshold changed to: ${val}`,
	);
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
	if (current?.foodB) {
		const isMeaningfulChange = name.trim() !== current.foodB.name.trim();

		let updatedFoodB = { ...current.foodB, name };
		if (isMeaningfulChange) {
			updatedFoodB = breakChainOfCustody(updatedFoodB);
		}

		const updated = { ...current, foodB: updatedFoodB };
		state.setProtocol(updated, "Renamed Food B", { debounceHistory: true });
	}
}

/**
 * Updates the protein content of Food B and recalculates the transition point.
 * Ensures the value is non-negative and does not exceed Food B's serving size.
 *
 * @param state - The protocol state container.
 * @param valueStr - The new protein value as a string from UI input.
 */
export function handleFoodBProteinChange(
	state: ProtocolState,
	valueStr: string,
) {
	const current = state.getProtocol();
	if (!current?.foodB) return;

	const val = parseSafeDecimal(valueStr, current.foodB.gramsInServing, 0);
	const servingSize = current.foodB.servingSize;
	const clamped = val.greaterThan(servingSize) ? servingSize : val;

	const isMeaningfulChange = !clamped.equals(current.foodB.gramsInServing);

	let updatedFoodB = { ...current.foodB, gramsInServing: clamped };
	if (isMeaningfulChange) {
		updatedFoodB = breakChainOfCustody(updatedFoodB);
	}

	const updated = updateFoodBAndRecalculate(
		{ ...current, foodB: updatedFoodB },
		{},
	);
	state.setProtocol(updated, `Food B Protein changed to: ${clamped}`);
}

/**
 * Updates the serving size of Food B and recalculates the transition point.
 * Ensures the value is at least the current protein content and within practical limits (max 1000).
 *
 * @param state - The protocol state container.
 * @param valueStr - The new serving size value as a string from UI input.
 */
export function handleFoodBServingSizeChange(
	state: ProtocolState,
	valueStr: string,
) {
	const current = state.getProtocol();
	if (!current?.foodB) return;

	const min = current.foodB.gramsInServing.toNumber();
	const val = parseSafeDecimal(valueStr, current.foodB.servingSize, min);

	let finalVal = val;
	if (finalVal.lessThanOrEqualTo(0)) finalVal = new Decimal(1);
	if (finalVal.greaterThan(1000)) finalVal = new Decimal(1000);

	const isMeaningfulChange = !finalVal.equals(current.foodB.servingSize);

	let updatedFoodB = { ...current.foodB, servingSize: finalVal };
	if (isMeaningfulChange) {
		updatedFoodB = breakChainOfCustody(updatedFoodB);
	}

	const updated = updateFoodBAndRecalculate(
		{ ...current, foodB: updatedFoodB },
		{},
	);
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
	if (current?.foodB && current.foodB.type !== type) {
		const updated = toggleFoodType(current, true, type);
		if (updated.foodB) {
			updated.foodB = breakChainOfCustody(updated.foodB);
		}
		state.setProtocol(updated, `Set Food B to ${type}`);
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
export function handleFoodBThresholdChange(
	state: ProtocolState,
	valueStr: string,
) {
	const current = state.getProtocol();
	if (!current?.foodBThreshold) return;

	const val = parseSafeDecimal(valueStr, current.foodBThreshold.amount, 0);
	const updated = updateFoodBThreshold(current, val);
	state.setProtocol(updated, `Food B Threshold changed to: ${val}`);
}
