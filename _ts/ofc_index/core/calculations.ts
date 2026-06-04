/**
 * Core mathematical logic for dosing steps
 * Handles conversion between target protein amounts (mg) and food quantities (g/ml)
 */
import Decimal from "decimal.js";
import type { Unit } from "../types";

/**
 * Represents a single dosing step in a challenge protocol
 */
export interface DosingStep {
	/** Step number (1-based) */
	step: number;
	/** Unit of measurement (g, ml, or capsule) */
	unit: Unit;
	/** Target protein amount for this specific step in mg */
	targetMg: Decimal;
	/** Calculated amount of food to be administered in this step */
	foodGrams: Decimal;
	/** Running total of protein administered up to and including this step in mg */
	cumulativeMg: Decimal;
}

/**
 * Calculates a series of dosing steps for a given challenge protocol
 *
 * @param targetMgSteps - Array of target protein amounts (mg) for each step of the protocol
 * @param proteinPerGram - Protein concentration (g) per 1g (or ml) of food
 * @param unit - Unit of measurement for the food item
 * @returns {DosingStep[]} Array of calculated dosing steps
 */
export function calculateSteps(
	targetMgSteps: number[],
	proteinPerGram: Decimal,
	unit: Unit,
): DosingStep[] {
	let cumulativeMg = new Decimal(0);

	return targetMgSteps.map((targetMgVal, index) => {
		const targetMg = new Decimal(targetMgVal);
		cumulativeMg = cumulativeMg.plus(targetMg);

		// Grams of food = (targetMg * 0.001) / proteinPerGram
		// if concentration of pr is 0, will simply return 0 as a fallback
		const foodGrams = proteinPerGram.gt(0)
			? targetMg.mul(0.001).div(proteinPerGram)
			: new Decimal(0);

		return {
			step: index + 1,
			unit,
			targetMg,
			foodGrams,
			cumulativeMg,
		};
	});
}
