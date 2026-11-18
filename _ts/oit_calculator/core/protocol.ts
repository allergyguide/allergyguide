/**
 * @module
 *
 * Protocol modifying functions
 * SHOULD not modify protocols passed in as arguements
 *
 */
import Decimal from "decimal.js";
import { DOSING_STRATEGIES } from "../constants";

import type { Food, Protocol, Step, Unit } from "../types";
import { FoodAStrategy, FoodType, Method, type NumberLike } from "../types";
import { generateUniqueId, getMeasuringUnit } from "../utils";
import {
	findDilutionCandidates,
	findRoundedDirectAmount,
	findRoundedMixWaterAmount,
	generateStepOrDirectFallback,
} from "./calculator";

/**
 * Count the number of Food A steps in a protocol
 *
 * @param protocol Protocol to inspect
 * @returns Number of steps that belong to Food A
 */
export function getFoodAStepCount(protocol: Protocol): number {
	if (!protocol.foodB) return protocol.steps.length;

	// Find first Food B step by checking the food property
	for (let i = 0; i < protocol.steps.length; i++) {
		if (protocol.steps[i].food === "B") {
			return i;
		}
	}
	return protocol.steps.length;
}

/**
 * Pure function to update properties of Food A or Food B
 *
 * @param protocol Protocol to update
 * @param food 'A' or 'B'
 * @param updates Partial Food object with properties to update
 * @returns New Protocol object with updated food details
 */
export function updateFoodDetails(
	protocol: Protocol,
	food: "A" | "B",
	updates: Partial<Food>,
): Protocol {
	// Shallow copy
	const newProtocol = { ...protocol };

	const currentFood = food === "A" ? protocol.foodA : protocol.foodB;
	if (!currentFood) return protocol;

	// create new Food object with the updates applied
	const newFood = { ...currentFood, ...updates };

	// assign back to the new protocol
	if (food === "A") {
		newProtocol.foodA = newFood;
	} else {
		newProtocol.foodB = newFood;
	}

	return newProtocol;
}

/**
 * Updates Food B details and recalculates the protocol
 * If a threshold exists, recalculate the transition point because a change in Protein/Serving size changes where the transition happens
 *
 * @param protocol Protocol to update
 * @param updates Partial Food object with properties to update for Food B
 * @returns New Protocol object with updated Food B and recalculated steps
 */
export function updateFoodBAndRecalculate(
	protocol: Protocol,
	updates: Partial<Food>,
): Protocol {
	const newProtocol = updateFoodDetails(protocol, "B", updates);

	// A change in protein/serving size moves the transition point; addFoodBToProtocol re-finds it while keeping existing targets
	if (newProtocol.foodB && newProtocol.foodBThreshold) {
		return addFoodBToProtocol(
			newProtocol,
			newProtocol.foodB,
			newProtocol.foodBThreshold,
		);
	}

	return newProtocol;
}

/**
 * Updates the Food B transition threshold and recalculates the step sequence
 *
 * @param protocol Protocol to update
 * @param newAmount New threshold amount
 * @returns New Protocol object with updated threshold and recalculated steps
 */
export function updateFoodBThreshold(
	protocol: Protocol,
	newAmount: Decimal,
): Protocol {
	if (!protocol.foodB || !protocol.foodBThreshold) return protocol;
	return addFoodBToProtocol(protocol, protocol.foodB, {
		...protocol.foodBThreshold,
		amount: newAmount,
	});
}

/**
 * Inject a Food B transition into an existing protocol
 *
 * Finds the first step where targetMg ≥ (threshold.amount × foodB.mgPerUnit) and transitions at that point by:
 * - duplicating the transition target as the first Food B step
 * - converting all subsequent targets to Food B DIRECT steps
 * - reindexing steps
 *
 * Protocol.foodB and .foodBThreshold are assigned even if no transition point is found; the validation system will surface a warning in that case
 *
 * @param oldProtocol Protocol to modify (treated immutably)
 * @param foodB Food B definition
 * @param threshold Threshold to begin Food B, unit-specific amount (g/ml)
 * @returns New Protocol with Food B steps added
 */
export function addFoodBToProtocol(
	oldProtocol: Protocol,
	foodB: Food,
	threshold: { unit: Unit; amount: Decimal },
): Protocol {
	const newProtocol = { ...oldProtocol };

	// PRE-PROCESS: Remove "Duplicate" transition artifacts from previous Food B (ie if another Food B is selected)
	// If Step i (Food A) and Step i+1 (Food B) have same target, ignore Step i+1 (the duplicate) to prevent generating "stuttering" steps when switching Food B multiple times
	const sourceSteps = newProtocol.steps;
	const cleanedSourceSteps: Step[] = [];

	for (let i = 0; i < sourceSteps.length; i++) {
		const current = sourceSteps[i];
		const next = sourceSteps[i + 1];

		// if previous transition overlap exists (A -> B and same targetMg)
		// skip B's step
		if (
			next &&
			current.food === "A" &&
			next.food === "B" &&
			current.targetMg.equals(next.targetMg)
		) {
			cleanedSourceSteps.push(current);
			i++;
		} else {
			cleanedSourceSteps.push(current);
		}
	}

	// Normalize all existing steps to be valid Food A steps
	// Food A steps are kept as-is (preserving manual mix/daily edits and ids); only former Food B steps are recalculated as Food A
	// Copies are required: the reindex loop below mutates stepIndex, and the originals live in undo history
	newProtocol.steps = cleanedSourceSteps.map((existingStep) =>
		existingStep.food === "A"
			? { ...existingStep }
			: generateStepOrDirectFallback(
					existingStep.targetMg,
					existingStep.stepIndex,
					newProtocol.foodA,
					"A",
					newProtocol.foodAStrategy,
					newProtocol.diThreshold,
					newProtocol.config,
					existingStep.id,
				),
	);

	// Calculate foodBmgThreshold
	const foodBmgThreshold = threshold.amount.times(foodB.getMgPerUnit());

	// Set Food B in protocol (even if no transition point found, so threshold changes can be detected)
	newProtocol.foodB = foodB;
	newProtocol.foodBThreshold = threshold;

	// Find transition point
	let transitionIndex = -1;
	for (let i = 0; i < newProtocol.steps.length; i++) {
		if (newProtocol.steps[i].targetMg.greaterThanOrEqualTo(foodBmgThreshold)) {
			transitionIndex = i;
			break;
		}
	}

	if (transitionIndex === -1) {
		// No transition point found - emit warning
		// warning is picked up by validation system
		// new protocol basically isn't changed
		return newProtocol;
	}

	// Get the original target sequence after transition
	const originalTargets: Decimal[] = [];
	for (let i = transitionIndex + 1; i < newProtocol.steps.length; i++) {
		originalTargets.push(newProtocol.steps[i].targetMg);
	}

	// Insert duplicate at transition point
	const transitionTargetMg = newProtocol.steps[transitionIndex].targetMg;

	// Build Food B steps
	const foodBSteps: Step[] = [];
	const foodBUnit: Unit = getMeasuringUnit(foodB);

	// First Food B step uses same target as last Food A step
	const firstBTargetMg = transitionTargetMg;
	const firstBPreciseMass = firstBTargetMg.dividedBy(foodB.getMgPerUnit());
	const firstBSnappedMass = findRoundedDirectAmount(
		firstBTargetMg,
		foodB,
		firstBPreciseMass,
		newProtocol.config,
	);
	foodBSteps.push({
		id: generateUniqueId(),
		stepIndex: transitionIndex + 2, // Will be reindexed later
		targetMg: firstBTargetMg,
		method: Method.DIRECT,
		dailyAmount: firstBSnappedMass,
		dailyAmountUnit: foodBUnit,
		food: "B",
	});

	// Remaining Food B steps
	for (const targetMg of originalTargets) {
		const preciseMass = targetMg.dividedBy(foodB.getMgPerUnit());
		const snappedMass = findRoundedDirectAmount(
			targetMg,
			foodB,
			preciseMass,
			newProtocol.config,
		);
		foodBSteps.push({
			id: generateUniqueId(),
			stepIndex: 0, // Will be reindexed
			targetMg,
			method: Method.DIRECT,
			dailyAmount: snappedMass,
			dailyAmountUnit: foodBUnit,
			food: "B",
		});
	}

	// Truncate protocol.steps at transition point
	newProtocol.steps = newProtocol.steps.slice(0, transitionIndex + 1);

	// Add Food B steps
	newProtocol.steps.push(...foodBSteps);

	// Reindex
	for (let i = 0; i < newProtocol.steps.length; i++) {
		newProtocol.steps[i].stepIndex = i + 1;
	}

	// tada new protocol
	return newProtocol;
}

/**
 * Recompute the entire protocol step sequence from current high-level settings
 *
 * Rebuilds Food A steps from the selected dosing strategy and Food A strategy, then re-applies Food B transition if present. Triggers UI updates
 * It is DESTRUCTIVE: it will not respect any pre-existing target dose Mgs and will default to one of DOSING_STRATEGIES
 *
 * @param oldProtocol Protocol to recalculate based on its config
 * @returns New Protocol with recalculated steps
 */
export function recalculateProtocol(oldProtocol: Protocol): Protocol {
	const newProtocol = { ...oldProtocol };

	// Regenerate Food A steps
	newProtocol.steps = DOSING_STRATEGIES[newProtocol.dosingStrategy].map(
		(target, i) =>
			generateStepOrDirectFallback(
				target,
				i + 1,
				newProtocol.foodA,
				"A",
				newProtocol.foodAStrategy,
				newProtocol.diThreshold,
				newProtocol.config,
			),
	);

	// Re-add Food B if it exists
	if (newProtocol.foodB && newProtocol.foodBThreshold) {
		return addFoodBToProtocol(
			newProtocol,
			newProtocol.foodB,
			newProtocol.foodBThreshold,
		);
	}

	return newProtocol;
}

/**
 * Recompute per-step methods (DIRECT vs DILUTE) without changing targets/foods
 *
 * For Food B steps, always enforce DILUTE_NONE. For Food A steps, use the current Food A strategy and diThreshold
 *
 * @param oldProtocol Protocol to update
 * @returns New Protocol with updated step methods
 */
export function recalculateStepMethods(oldProtocol: Protocol): Protocol {
	const newProtocol = { ...oldProtocol };

	// Preserve existing targets and food properties but recalculate methods
	const preservedTargets = newProtocol.steps.map((s) => s.targetMg);
	const preservedFoods = newProtocol.steps.map((s) => s.food);

	const steps: Step[] = [];

	for (let i = 0; i < preservedTargets.length; i++) {
		const targetMg = preservedTargets[i];
		const isStepFoodB = preservedFoods[i] === "B";
		const food = isStepFoodB ? newProtocol.foodB : newProtocol.foodA;
		const foodAStrategy = isStepFoodB
			? FoodAStrategy.DILUTE_NONE
			: newProtocol.foodAStrategy;

		if (!food) {
			throw new Error(
				`Protocol is missing Food ${isStepFoodB ? "B" : "A"} for step ${i + 1}`,
			);
		}
		steps.push(
			generateStepOrDirectFallback(
				targetMg,
				i + 1,
				food,
				preservedFoods[i],
				foodAStrategy,
				newProtocol.diThreshold,
				newProtocol.config,
				newProtocol.steps[i].id,
			),
		);
	}

	newProtocol.steps = steps;

	return newProtocol;
}

/**
 * Handle user change to a step's target protein (mg)
 *
 * Updates dependent fields:
 * - DIRECT: recompute dailyAmount = targetMg / mgPerUnit
 * - DILUTE: recompute servings and mixWaterAmount to preserve dailyAmount and mixFoodAmount
 *
 * @param oldProtocol Protocol to update
 * @param stepIndex 1-based index of the step to update
 * @param newTargetMg New target protein (mg)
 * @returns New Protocol with updated step, or original protocol if validation fails
 */
export function updateStepTargetMg(
	oldProtocol: Protocol,
	stepIndex: number,
	newTargetMg: NumberLike,
): Protocol {
	if (!oldProtocol) return oldProtocol;

	// Shallow copy steps array
	const newSteps = [...oldProtocol.steps];

	// does it exist
	const originalStep = newSteps[stepIndex - 1];
	if (!originalStep) return oldProtocol;

	// shallow copy SPECIFIC step to modify
	const step = { ...originalStep };

	try {
		step.targetMg = new Decimal(newTargetMg);
	} catch {
		console.error("Invalid number format for targetMg:", newTargetMg);
		return oldProtocol;
	}

	// Determine which food
	const isStepFoodB = step.food === "B";
	const food = isStepFoodB ? oldProtocol.foodB : oldProtocol.foodA;

	if (!food) {
		throw new Error(
			`Protocol is missing Food ${isStepFoodB ? "B" : "A"} for step ${stepIndex}`,
		);
	}

	if (step.method === Method.DIRECT) {
		// Recalculate dailyAmount (with safe snapping)
		const preciseAmount = step.targetMg.dividedBy(food.getMgPerUnit());
		step.dailyAmount = findRoundedDirectAmount(
			step.targetMg,
			food,
			preciseAmount,
			oldProtocol.config,
		);
	} else if (step.method === Method.DILUTE) {
		// DILUTE - keep mixFoodAmount and dailyAmount, recalculate servings and water
		recalcDilutionWater(step, food, oldProtocol.config.PROTEIN_TOLERANCE);
	}

	newSteps[stepIndex - 1] = step;
	return { ...oldProtocol, steps: newSteps };
}

/**
 * Handle user change to a step's daily amount (g/ml)
 *
 * Updates dependent fields:
 * - DIRECT: recompute targetMg = dailyAmount × mgPerUnit
 * - DILUTE: recompute servings and mixWaterAmount to preserve targetMg and mixFoodAmount
 *
 * @param oldProtocol Protocol to update
 * @param stepIndex 1-based index of the step to update
 * @param newDailyAmount New amount (g or ml), number-like
 * @returns New Protocol with updated step
 */
export function updateStepDailyAmount(
	oldProtocol: Protocol,
	stepIndex: number,
	newDailyAmount: NumberLike,
): Protocol {
	if (!oldProtocol) return oldProtocol;

	// Shallow copy steps array
	const newSteps = [...oldProtocol.steps];
	const originalStep = newSteps[stepIndex - 1];
	if (!originalStep) return oldProtocol;

	// Copy step
	const step = { ...originalStep };

	step.dailyAmount = new Decimal(newDailyAmount);

	const isStepFoodB = step.food === "B";
	const food = isStepFoodB ? oldProtocol.foodB : oldProtocol.foodA;

	if (!food) {
		throw new Error(
			`Protocol is missing Food ${isStepFoodB ? "B" : "A"} for step ${stepIndex}`,
		);
	}

	if (step.method === Method.DIRECT) {
		// Recalculate target protein
		step.targetMg = step.dailyAmount.times(food.getMgPerUnit());
	} else if (step.method === Method.DILUTE) {
		// DILUTE - keep mixFoodAmount fixed, recalculate water
		recalcDilutionWater(step, food, oldProtocol.config.PROTEIN_TOLERANCE);
	}

	newSteps[stepIndex - 1] = step;
	return { ...oldProtocol, steps: newSteps };
}

/**
 * Handle user change to a dilution step's mix food amount
 *
 * Updates dependent fields (servings and mixWaterAmount) while preserving targetMg and dailyAmount
 *
 * @param oldProtocol Protocol to update
 * @param stepIndex 1-based index of the dilution step
 * @param newMixFoodAmount New amount of food to include in mix (g or ml), number-like
 * @returns New Protocol with updated step
 */
export function updateStepMixFoodAmount(
	oldProtocol: Protocol,
	stepIndex: number,
	newMixFoodAmount: NumberLike,
): Protocol {
	if (!oldProtocol) return oldProtocol;

	// Shallow copy steps array
	const newSteps = [...oldProtocol.steps];
	const originalStep = newSteps[stepIndex - 1];
	if (!originalStep || originalStep.method !== Method.DILUTE)
		return oldProtocol;

	// Copy step
	const step = { ...originalStep };

	step.mixFoodAmount = new Decimal(newMixFoodAmount);

	const isStepFoodB = step.food === "B";
	const food = isStepFoodB ? oldProtocol.foodB : oldProtocol.foodA;

	if (!food) {
		throw new Error(
			`Protocol is missing Food ${isStepFoodB ? "B" : "A"} for step ${stepIndex}`,
		);
	}

	// Recalculate water to keep P and dailyAmount unchanged
	recalcDilutionWater(step, food, oldProtocol.config.PROTEIN_TOLERANCE);

	newSteps[stepIndex - 1] = step;
	return { ...oldProtocol, steps: newSteps };
}

/**
 * Duplicate a step and insert it immediately after the original
 *
 * Copies all step fields; for DILUTE steps also copies mix amounts and servings. Reindexes all subsequent steps
 *
 * @param oldProtocol Protocol to update
 * @param stepIndex 1-based index after which to insert the new step
 * @returns New Protocol with added step
 */
export function addStepAfter(
	oldProtocol: Protocol,
	stepIndex: number,
): Protocol {
	if (!oldProtocol) return oldProtocol;

	// Shallow copy steps array
	let newSteps = [...oldProtocol.steps];
	const step = newSteps[stepIndex - 1];
	if (!step) return oldProtocol;

	// Duplicate the step
	const newStep: Step = {
		id: generateUniqueId(),
		stepIndex: step.stepIndex + 1,
		targetMg: step.targetMg,
		method: step.method,
		dailyAmount: step.dailyAmount,
		dailyAmountUnit: step.dailyAmountUnit,
		food: step.food,
	};

	if (step.method === Method.DILUTE) {
		newStep.mixFoodAmount = step.mixFoodAmount;
		newStep.mixWaterAmount = step.mixWaterAmount;
		newStep.servings = step.servings;
	}

	newSteps.splice(stepIndex, 0, newStep);

	// reindex and copy all steps to avoid mutating originals
	newSteps = newSteps.map((s, i) => ({
		...s,
		stepIndex: i + 1,
	}));

	return { ...oldProtocol, steps: newSteps };
}

/**
 * Remove a step from the protocol and reindex the remaining steps
 *
 * Does nothing if there is only one step
 *
 * @param oldProtocol Protocol to update
 * @param stepIndex 1-based index of the step to remove
 * @returns New Protocol with step removed
 */
export function removeStep(oldProtocol: Protocol, stepIndex: number): Protocol {
	if (!oldProtocol) return oldProtocol;

	if (oldProtocol.steps.length <= 1) return oldProtocol;

	// Filter out the step to remove (creates new array)
	let newSteps = oldProtocol.steps.filter((_, i) => i !== stepIndex - 1);

	// Reindex and copy all steps
	newSteps = newSteps.map((s, i) => ({
		...s,
		stepIndex: i + 1,
	}));

	return { ...oldProtocol, steps: newSteps };
}

/**
 * Toggle the form (SOLID / LIQUID / CAPSULE) for Food A or Food B, updating all steps
 *
 * For DILUTE steps:
 * - ensures dailyAmountUnit is "ml"
 * - recomputes mixWaterAmount based on the new volume model
 *
 * For DIRECT steps:
 * - adjusts dailyAmountUnit to "g" (SOLID) or "ml" (LIQUID)
 *
 * @param oldProtocol Protocol to update
 * @param isFoodB When true, toggles Food B; otherwise toggles Food A
 * @param targetType The new FoodType to switch to
 * @returns New Protocol with updated food type and steps
 */
export function toggleFoodType(
	oldProtocol: Protocol,
	isFoodB: boolean,
	targetType: FoodType,
): Protocol {
	if (!oldProtocol) return oldProtocol;

	const newProtocol = { ...oldProtocol };
	const food = isFoodB ? newProtocol.foodB : newProtocol.foodA;

	if (!food) {
		throw new Error(
			`Protocol is missing Food ${isFoodB ? "B" : "A"} to toggle`,
		);
	}

	// If already that type, do nothing
	if (food.type === targetType) return newProtocol;

	const isCapsuleSwitch =
		targetType === FoodType.CAPSULE || food.type === FoodType.CAPSULE;

	// Copy food object & update type
	const newFood = { ...food };
	newFood.type = targetType;

	if (isFoodB) {
		newProtocol.foodB = newFood;
		if (newProtocol.foodBThreshold) {
			newProtocol.foodBThreshold = {
				...newProtocol.foodBThreshold,
				unit: getMeasuringUnit(newFood),
			};
		}
	} else {
		newProtocol.foodA = newFood;
	}

	// Convert all relevant steps
	newProtocol.steps = newProtocol.steps.map((originalStep) => {
		const stepIsFoodB = originalStep.food === "B";
		if (stepIsFoodB !== isFoodB) return originalStep;

		// CAPSULE INVOLVED (Structural Change)
		if (isCapsuleSwitch) {
			// If switching TO Capsule
			if (targetType === FoodType.CAPSULE) {
				return {
					...originalStep,
					id: originalStep.id || generateUniqueId(),
					method: Method.CAPSULE,
					dailyAmount: new Decimal(1), // Dummy
					dailyAmountUnit: "capsule",
					mixFoodAmount: undefined,
					mixWaterAmount: undefined,
					servings: undefined,
				};
			}

			// If switching FROM Capsule (to Solid or Liquid)
			return generateStepOrDirectFallback(
				originalStep.targetMg,
				originalStep.stepIndex,
				newFood,
				originalStep.food,
				stepIsFoodB ? FoodAStrategy.DILUTE_NONE : newProtocol.foodAStrategy, // Food B always Dilute None
				newProtocol.diThreshold,
				newProtocol.config,
				originalStep.id,
			);
		}

		// CASE 2: SOLID <-> LIQUID (Form Change)
		// Preserve manual customizations (mix amounts, etc) and just adjust units/water math
		const step = { ...originalStep };

		if (step.method === Method.DILUTE) {
			// Convert mixFoodAmount assuming 1g ≈ 1ml (value stays the same)
			// Ensure dailyAmountUnit is always "ml" for dilutions
			step.dailyAmountUnit = "ml";

			// Recalculate servings and water based on new food type
			// Note: getMgPerUnit() hasn't changed, so Total Protein is same. Servings usually same.
			recalcDilutionWater(step, newFood, newProtocol.config.PROTEIN_TOLERANCE);
		} else {
			// DIRECT - just update unit
			step.dailyAmountUnit = newFood.type === FoodType.SOLID ? "g" : "ml";
		}
		return step;
	});

	return newProtocol;
}

/**
 * Toggle a single step between DIRECT and DILUTE methods.
 *
 * - DIRECT → DILUTE: finds the best dilution candidate for the step's target.
 *   Returns the original protocol unchanged if no valid candidate exists
 *   (caller should surface this to the user via the warning system).
 * - DILUTE → DIRECT: recomputes dailyAmount as a rounded neat dose.
 * - CAPSULE steps are always returned unchanged (no-op).
 *
 * @param oldProtocol Protocol to update
 * @param stepIndex 1-based index of the step to toggle
 * @returns New Protocol with the toggled step, or the original protocol if toggling is not feasible
 */
export function toggleStepMethod(
	oldProtocol: Protocol,
	stepIndex: number,
): Protocol {
	if (!oldProtocol) return oldProtocol;

	const newSteps = [...oldProtocol.steps];
	const originalStep = newSteps[stepIndex - 1];
	if (!originalStep) return oldProtocol;

	// CAPSULE steps cannot be toggled
	if (originalStep.method === Method.CAPSULE) return oldProtocol;

	const isStepFoodB = originalStep.food === "B";
	const food = isStepFoodB ? oldProtocol.foodB : oldProtocol.foodA;

	if (!food) {
		throw new Error(
			`Protocol is missing Food ${isStepFoodB ? "B" : "A"} for step ${stepIndex}`,
		);
	}

	if (originalStep.method === Method.DILUTE) {
		// DILUTE → DIRECT
		const P = originalStep.targetMg;
		const neatMass = P.dividedBy(food.getMgPerUnit());
		const dailyAmount = findRoundedDirectAmount(
			P,
			food,
			neatMass,
			oldProtocol.config,
		);
		const dailyAmountUnit = getMeasuringUnit(food);

		const updatedStep: Step = {
			id: originalStep.id,
			stepIndex: originalStep.stepIndex,
			targetMg: P,
			method: Method.DIRECT,
			dailyAmount,
			dailyAmountUnit,
			food: originalStep.food,
		};

		newSteps[stepIndex - 1] = updatedStep;
		return { ...oldProtocol, steps: newSteps };
	} else {
		// DIRECT → DILUTE
		const candidates = findDilutionCandidates(
			originalStep.targetMg,
			food,
			oldProtocol.config,
		);

		if (candidates.length === 0) {
			// No feasible dilution — return unchanged so warnings catch it
			return oldProtocol;
		}

		const best = candidates[0];
		const updatedStep: Step = {
			id: originalStep.id,
			stepIndex: originalStep.stepIndex,
			targetMg: originalStep.targetMg,
			method: Method.DILUTE,
			dailyAmount: best.dailyAmount,
			dailyAmountUnit: "ml",
			mixFoodAmount: best.mixFoodAmount,
			mixWaterAmount: best.mixWaterAmount,
			servings: best.servings,
			food: originalStep.food,
		};

		newSteps[stepIndex - 1] = updatedStep;
		return { ...oldProtocol, steps: newSteps };
	}
}

/**
 * Recalculate a dilution step's servings and mix water so the target protein and daily amount stay the same.
 * Prefers a water amount rounded to DILUTION_WATER_STEP_RESOLUTION if it stays within protein tolerance, else uses the precise amount.
 * SOLID foods are assumed not to add volume; LIQUID volumes are additive.
 * @sideeffect Mutates `step.servings` and `step.mixWaterAmount`
 */
function recalcDilutionWater(
	step: Step,
	food: Food,
	protein_tolerance: Decimal,
) {
	if (!step.mixFoodAmount)
		throw new Error(
			`Step ${step.stepIndex} is DILUTE but missing mixFoodAmount`,
		);
	step.servings = step.mixFoodAmount
		.times(food.getMgPerUnit())
		.dividedBy(step.targetMg);
	const mixTotalVolume = step.dailyAmount.times(step.servings);
	const idealWater =
		food.type === FoodType.SOLID
			? mixTotalVolume
			: mixTotalVolume.minus(step.mixFoodAmount);
	const rounded = findRoundedMixWaterAmount(
		step.targetMg,
		food,
		step.mixFoodAmount,
		idealWater,
		step.dailyAmount,
		protein_tolerance,
	);
	step.mixWaterAmount = rounded ?? idealWater;
}
