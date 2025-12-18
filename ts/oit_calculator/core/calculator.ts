/**
 * @module
 *
 * Core calculation logic 
 *
 * - find dilution candidates for a given protein target
 * - generate individual protocol steps (both direct and diluted)
 * - create a default starting protocol based on a selected food
 */
import Decimal from "decimal.js";

import {
  FoodType,
  Method,
  FoodAStrategy,
  DosingStrategy,
} from "../types"

import type {
  Food,
  Step,
  Unit,
  Protocol,
  ProtocolConfig,
  Candidate,
} from "../types"

import {
  DILUTION_WATER_STEP_RESOLUTION,
  DOSING_STRATEGIES,
} from "../constants"
import { findPercentDifference, formatAmount, formatNumber } from "../utils";

/**
 * Compute feasible dilution candidates for a target protein dose
 *
 * For a target protein P (mg), searches across candidate mix sizes and daily amounts to produce practical dilution recipes that:
 * - respect tool resolution (minMeasurableMass/minMeasurableVolume)
 * - keep total mix water within MAX_MIX_WATER
 * - meet minimum servings (minServingsForMix)
 * - achieve protein within relative tolerance PROTEIN_TOLERANCE
 * - for SOLID foods, prefer low w/v concentration based on MAX_SOLID_CONCENTRATION
 *
 * Liquid-in-liquid assumes additive volumes; solid-in-liquid assumes solid volume is negligible (validated separately via warnings) if w/v < certain amount
 * It will also try to obtain a mix-water amount that is in 0.5ml increments, but will fall back to more precise values if needed.
 *
 * Returned candidates are sorted by:
 * - whether they meet low-concentration preference (SOLID only), then
 * - mixFoodAmount asc, dailyAmount asc, mixTotalVolume asc, mixWaterAmount asc
 *
 * @param P Target protein per dose, in mg
 * @param food Food used for the dilution (determines unit logic)
 * @param config Protocol configuration and constraints
 * @returns Array of feasible, sorted Candidate items
 */
export function findDilutionCandidates(
  P: Decimal,
  food: Food,
  config: ProtocolConfig,
): Candidate[] {
  const candidates: Candidate[] = [];
  const mixCandidates =
    food.type === FoodType.SOLID ? config.SOLID_MIX_CANDIDATES : config.LIQUID_MIX_CANDIDATES;

  // Calculate minimum dailyAmount to achieve `dailyAmount > P / (MAX_SOLID_CONCENTRATION × mgPerUnit)`
  // For ratio = mixFood / mixWaterAmount < MAX_SOLID_CONCENTRATION
  // Recall: mixWaterAmount = mixTotalVolume = dailyAmount × servings
  // & servings = (mixFood × mgPerUnit) / P
  // => ratio = P / (dailyAmount × mgPerUnit)
  // => MAX_SOLID_CONCENTRATION > P / (dailyAmount × mgPerUnit)
  // => dailyAmount > P / (MAX_SOLID_CONCENTRATION × mgPerUnit)
  const minDailyForLowConcentration =
    food.type === FoodType.SOLID
      ? P.dividedBy(config.MAX_SOLID_CONCENTRATION.times(food.getMgPerUnit()))
      : null;

  for (const mixFoodValue of mixCandidates) {
    const mixFood: Decimal = mixFoodValue;

    for (const dailyAmountValue of config.DAILY_AMOUNT_CANDIDATES) {
      const dailyAmount: Decimal = dailyAmountValue;

      // What is the ideal water amount? This may not be a practical amount for patients (ie. 11.2ml is less practical than 11, or 11.5 ml)
      let idealWater: Decimal;
      const totalMixProtein = mixFood.times(food.getMgPerUnit());

      if (food.type === FoodType.SOLID) {
        // SOLID: Water ~= Total Volume
        const idealServings = totalMixProtein.dividedBy(P);
        idealWater = dailyAmount.times(idealServings);
      } else {
        // LIQUID: Water = Total Volume - Food Amount
        const idealServings = totalMixProtein.dividedBy(P);
        const idealTotalVolume = dailyAmount.times(idealServings);
        idealWater = idealTotalVolume.minus(mixFood);
      }
      if (idealWater.lessThan(0)) continue; // handle weird case

      // find up to two cases of water mix amounts (ie. let's say ml water is between 0.5ml incr) - want to check both
      const steps = idealWater.dividedBy(DILUTION_WATER_STEP_RESOLUTION);
      const floorWater = steps.floor().times(DILUTION_WATER_STEP_RESOLUTION);
      const ceilWater = steps.ceil().times(DILUTION_WATER_STEP_RESOLUTION);

      const roundedOptionsToCheck: Decimal[] = [floorWater];
      if (!ceilWater.equals(floorWater)) {
        roundedOptionsToCheck.push(ceilWater);
      }

      // TEST OPTIONS
      let foundValidSnap = false;

      for (const testWater of roundedOptionsToCheck) {
        const roundCandidate = checkCandidateValidity(food, P, totalMixProtein, mixFood, dailyAmount, testWater, config);
        if (roundCandidate) {
          candidates.push(roundCandidate);
          foundValidSnap = true;
        }
      }

      // if no valid rounded options are found
      if (!foundValidSnap) {
        const idealCandidate = checkCandidateValidity(food, P, totalMixProtein, mixFood, dailyAmount, idealWater, config);
        if (idealCandidate) {
          candidates.push(idealCandidate);
        }
      }
    }
  }

  // Sort candidates
  candidates.sort((a, b) => {
    // For SOLID: prioritize candidates meeting the low concentration constraint
    if (food.type === FoodType.SOLID && minDailyForLowConcentration) {
      const aMeetsRatio = a.dailyAmount.greaterThanOrEqualTo(
        minDailyForLowConcentration,
      );
      const bMeetsRatio = b.dailyAmount.greaterThanOrEqualTo(
        minDailyForLowConcentration,
      );

      if (aMeetsRatio && !bMeetsRatio) return -1;
      if (!aMeetsRatio && bMeetsRatio) return 1;
    }

    // Then apply remaining sort criteria
    let cmp = a.mixFoodAmount.comparedTo(b.mixFoodAmount);
    if (cmp !== 0) return cmp;
    cmp = a.dailyAmount.comparedTo(b.dailyAmount);
    if (cmp !== 0) return cmp;
    cmp = a.mixTotalVolume.comparedTo(b.mixTotalVolume);
    if (cmp !== 0) return cmp;
    return a.mixWaterAmount.comparedTo(b.mixWaterAmount);
  });

  return candidates;
}

/**
 * Helper to validate if a specific mix recipe (food + water + daily amount) meets all protocol constraints.
 * * Checks:
 * - Minimum servings (practicality)
 * - Measurability limits (mass/volume resolution)
 * - Max mix water limits
 * - Protein tolerance (does the actual concentration delivered match the target P within tolerance?)
 *
 * @param food - The food object being used 
 * @param P - The target protein amount (mg)
 * @param totalMixProtein - Pre-calculated protein in the mixFood amount (mg)
 * @param mixFood - Amount of food in the mix (g or ml)
 * @param dailyAmount - Amount of the mix to take daily (ml)
 * @param waterVal - Amount of water in the mix (ml)
 * @param config - Protocol configuration containing constraints (minMeasurable, maxWater, tolerance, etc.)
 * @returns A valid Candidate object if all checks pass, or null if any constraint is violated.
 */
function checkCandidateValidity(food: Food, P: Decimal, totalMixProtein: Decimal, mixFood: Decimal, dailyAmount: Decimal, waterVal: Decimal, config: ProtocolConfig): Candidate | null {
  let mixTotalVolume: Decimal;

  if (food.type === FoodType.SOLID) {
    mixTotalVolume = waterVal;
  } else {
    mixTotalVolume = mixFood.plus(waterVal);
  }

  // Recalculate Servings based on this water volume, which may be different from the ideal water volume
  const servings = mixTotalVolume.dividedBy(dailyAmount);

  // --- Check Hard Constraints ---
  // ------------------------------
  if (servings.lessThan(config.minServingsForMix)) return null;
  if (food.type === FoodType.SOLID) {
    if (mixFood.lessThan(config.minMeasurableMass)) return null;
  } else {
    if (mixFood.lessThan(config.minMeasurableVolume)) return null;
  }
  if (dailyAmount.lessThan(config.minMeasurableVolume)) return null;
  if (waterVal.greaterThan(config.MAX_MIX_WATER)) return null;
  if (waterVal.lessThan(config.minMeasurableVolume)) return null;

  // --- Check Protein Tolerance ---
  const actualProteinPerMl = totalMixProtein.dividedBy(mixTotalVolume);
  const actualProteinDelivered = actualProteinPerMl.times(dailyAmount);
  if (
    actualProteinDelivered
      .dividedBy(P)
      .minus(1)
      .abs()
      .greaterThan(config.PROTEIN_TOLERANCE)
  ) {
    return null;
  }

  // return good candidate if possible
  return {
    mixFoodAmount: mixFood,
    mixWaterAmount: waterVal,
    dailyAmount,
    mixTotalVolume,
    servings,
  };
}

/**
 * For a given target protein in a step, calculate the remaining numbers to formally define a step if possible
 *
 * When diluting, picks the first (best) candidate from findDilutionCandidates
 * Returns null only when a dilution is required but no feasible candidate exists
 *
 * Side effects: none (pure)
 *
 * @param targetMg Target protein amount for this step (mg)
 * @param stepIndex
 * @param food Food to base the step on (Food A or Food B)
 * @param foodAStrategy Strategy controlling Food A dilution behavior
 * @param diThreshold Threshold neat amount at/above which DIRECT is acceptable, for dilution initial strategy
 * @param config Protocol constraints and tolerances
 * @returns Step definition or null if a required dilution cannot be constructed
 */
export function generateStepForTarget(
  targetMg: Decimal,
  stepIndex: number,
  food: Food,
  foodAStrategy: FoodAStrategy,
  diThreshold: Decimal,
  config: ProtocolConfig,
): Step | null {
  const P = targetMg;
  const neatMass = P.dividedBy(food.getMgPerUnit());
  const unit: Unit = food.type === FoodType.SOLID ? "g" : "ml";

  let needsDilution = false;
  if (foodAStrategy === FoodAStrategy.DILUTE_INITIAL) {
    needsDilution = neatMass.lessThan(diThreshold);
  } else if (foodAStrategy === FoodAStrategy.DILUTE_ALL) {
    needsDilution = true;
  } else {
    needsDilution = false;
  }

  if (needsDilution) {
    const candidates: Candidate[] = findDilutionCandidates(P, food, config);
    if (candidates.length === 0) {
      return null; // Cannot dilute
    }
    const best = candidates[0];
    return {
      stepIndex,
      targetMg: P,
      method: Method.DILUTE,
      dailyAmount: best.dailyAmount,
      dailyAmountUnit: "ml",
      mixFoodAmount: best.mixFoodAmount,
      mixWaterAmount: best.mixWaterAmount,
      servings: best.servings,
      food: "A",
    };
  } else {
    return {
      stepIndex,
      targetMg: P,
      method: Method.DIRECT,
      dailyAmount: neatMass,
      dailyAmountUnit: unit,
      food: "A",
    };
  }
}

/**
 * Build a default protocol for Food A using the default dosing strategy
 *
 * Uses:
 * - dosingStrategy: STANDARD
 * - foodAStrategy: DILUTE_INITIAL
 * - diThreshold: DEFAULT_CONFIG.DEFAULT_FOOD_A_DILUTION_THRESHOLD
 *
 * Steps are generated with generateStepForTarget. If a dilution is required but not feasible for a target, a DIRECT fallback step is emitted so the sequence remains continuous (validation will flag any issues)
 *
 * @param food Food A
 * @param config Protocol configuration and constraints
 * @returns Protocol with Food A steps populated
 */
export function generateDefaultProtocol(food: Food, config: ProtocolConfig): Protocol {
  const dosingStrategy = DosingStrategy.STANDARD;
  const foodAStrategy = FoodAStrategy.DILUTE_INITIAL;
  const unit: Unit = food.type === FoodType.SOLID ? "g" : "ml";
  const diThreshold = config.DEFAULT_FOOD_A_DILUTION_THRESHOLD;

  const targetProteins = DOSING_STRATEGIES[dosingStrategy];
  const steps: Step[] = [];

  for (let i = 0; i < targetProteins.length; i++) {
    const step = generateStepForTarget(
      targetProteins[i],
      i + 1,
      food,
      foodAStrategy,
      diThreshold,
      config,
    );
    if (step) {
      steps.push(step);
    } else {
      // Cannot generate step - still add it as direct with warning
      const P = targetProteins[i];
      const neatMass = P.dividedBy(food.getMgPerUnit());
      steps.push({
        stepIndex: i + 1,
        targetMg: P,
        method: Method.DIRECT,
        dailyAmount: neatMass,
        dailyAmountUnit: unit,
        food: "A",
      });
    }
  }

  return {
    dosingStrategy: dosingStrategy,
    foodA: food,
    foodAStrategy: foodAStrategy,
    diThreshold: diThreshold,
    steps: steps,
    config: config,
  };
}

/**
 * Attempt to find a practical mix water amount (snapped to resolution increments) that still delivers a protein dose within the allowable tolerance
 *
 * This is used during manual protocol table edits to prefer user-friendly water volumes (e.g., 0.5 ml increments) over raw "ideal" calculations. It evaluates the floor and ceiling snapped values and returns the one with the smallest error, provided it is within the configured protein tolerance.
 *
 * Of note, the parameters passed in are rounded to what the user will see.
 * 
 * @param P - The target protein dose (mg)
 * @param food - The food object (Solid/Liquid) being used for the mixture
 * @param roundedMixAmount - The amount of food currently in the mixture (g or ml)
 * @param idealWaterAmount - The mathematically precise water amount required for target P (ml)
 * @param roundedDailyAmount - The volume of the final mixture the patient takes daily (ml)
 * @param protein_tolerance - The allowable relative error (e.g., 0.05 for 5%)
 * @returns A snapped Decimal water amount if a valid one exists; otherwise null
 */
export function findRoundedMixWaterAmount(P: Decimal, food: Food, mixAmount: Decimal, idealWaterAmount: Decimal, dailyAmount: Decimal, protein_tolerance: Decimal): Decimal | null {
  const steps = idealWaterAmount.dividedBy(DILUTION_WATER_STEP_RESOLUTION);
  const floorWater = steps.floor().times(DILUTION_WATER_STEP_RESOLUTION);
  const ceilWater = steps.ceil().times(DILUTION_WATER_STEP_RESOLUTION);

  // round values
  const unit = food.type === FoodType.SOLID ? "g" : "ml";
  const roundedDailyAmount = new Decimal(formatAmount(dailyAmount, "ml"));
  const roundedMixAmount = new Decimal(formatAmount(mixAmount, unit));

  // test floor first
  let floorMixTotalVolume: Decimal;
  if (food.type === FoodType.SOLID) {
    floorMixTotalVolume = floorWater;
  } else {
    floorMixTotalVolume = floorWater.add(roundedMixAmount);
  }
  if (floorMixTotalVolume.isZero()) return null;
  const floorMg = calculateDilutionActualProtein(food, roundedMixAmount, floorMixTotalVolume, roundedDailyAmount);
  const floorDifference = findPercentDifference(floorMg!, P);

  // test ceilWater if it's not the same as floor
  if (!ceilWater.equals(floorWater)) {
    let ceilMixTotalVolume: Decimal;
    if (food.type === FoodType.SOLID) {
      ceilMixTotalVolume = ceilWater;
    } else {
      ceilMixTotalVolume = ceilWater.add(roundedMixAmount);
    }
    if (ceilMixTotalVolume.isZero()) return null;
    const ceilMg = calculateDilutionActualProtein(food, roundedMixAmount, ceilMixTotalVolume, roundedDailyAmount);
    const ceilDifference = findPercentDifference(ceilMg!, P);

    // find best out of ceilWater and floor water; if the best is still >= protein tolerance, return null
    const minDiff = Decimal.min(floorDifference, ceilDifference);
    if (floorDifference.equals(minDiff)) {
      return floorDifference.lessThanOrEqualTo(protein_tolerance) ? floorWater : null
    } else {
      return ceilDifference.lessThanOrEqualTo(protein_tolerance) ? ceilWater : null
    }
  } else {
    // if floor is the same as ceiling just do floor
    return floorDifference.lessThanOrEqualTo(protein_tolerance) ? floorWater : null
  }
}

/**
 * Calculate the actual protein amount delivered by a specific dilution recipe
 *
 * Accounts for the food's concentration and the ratio of the daily dose to the total volume of the mixture.
 *
 * @remarks
 * For SOLID foods, this assumes the food volume does not contribute to the total mix volume. For LIQUID foods, it assumes additive volumes
 *
 * @param food - The food definition containing protein concentration data
 * @param mixAmount - Amount of food added to the mixture (g or ml)
 * @param mixTotalVolume - Total volume of the mixture (ml)
 * @param dailyAmount - The daily dose volume taken by the patient (ml)
 * @returns The calculated protein delivered (mg), or null if mixTotalVolume is zero
 */
export function calculateDilutionActualProtein(food: Food, mixAmount: Decimal, mixTotalVolume: Decimal, dailyAmount: Decimal): Decimal | null {
  if (mixTotalVolume.isZero()) return null

  const totalProtein = mixAmount.times(food.getMgPerUnit());
  const actualProtein = totalProtein.times(dailyAmount.dividedBy(mixTotalVolume));

  return actualProtein
}
