/**
 * @module
 *
 * Validation logic for OIT protocols
 */
import Decimal from "decimal.js";

import {
  FoodType,
  Method,
  WarningCode,
} from "../types"

import type {
  Protocol,
  Food,
  Step,
  Warning,
} from "../types"

import {
  escapeHtml,
  formatNumber,
  formatAmount,
  getMeasuringUnit,
  getWarningSeverity
} from "../utils"

import {
  SOLID_RESOLUTION,
  LIQUID_RESOLUTION,
  DEFAULT_CONFIG,
} from "../constants"

/**
 * Validate protocol-level and per-step constraints, yielding warnings.
 *
 * Produces red (critical) and yellow (practical) warnings covering:
 * - structural issues (too few steps, non-ascending targets)
 * - invalid/edge concentrations, servings, volumes, mismatch to tolerance
 * - measurement resolution impracticalities
 * - transition feasibility for Food B
 * - others...
 *
 * No exceptions are thrown; issues are reported via structured Warning items
 *
 * @remarks Validation should act on the ROUNDED VALUES PRESENTED TO THE USER, not the internally calculated ones.
 * @param protocol Protocol to validate
 * @returns Array of warnings, possibly empty
 */
export function validateProtocol(protocol: Protocol): Warning[] {
  let warnings: Warning[] = [];

  warnings = [...validateSettings(protocol)];
  warnings = [...warnings, ...validateAllSteps(protocol)];

  return warnings;
}

// ============================================
// GLOBAL / SETTINGS VALIDATORS
// ============================================

/**
 * Problems checked:
 * - if TOO_FEW_STEPS
 * - if food B exists and there's no valid transition point
 * - if food A or B has invalid settings
 */
function validateSettings(protocol: Protocol): Warning[] {
  const warnings: Warning[] = [];

  // TOO_FEW_STEPS: Too few steps
  if (protocol.steps.length < 5) {
    warnings.push({
      severity: getWarningSeverity(WarningCode.Red.TOO_FEW_STEPS),
      code: WarningCode.Red.TOO_FEW_STEPS,
      message:
        "Protocol < 5 steps, which is quite rapid for a full OIT protocol.",
    });
  }

  // Food config checks
  warnings.push(...validateFoodConfig(protocol.foodA));
  if (protocol.foodB) {
    warnings.push(...validateFoodConfig(protocol.foodB))
  }

  // NO_TRANSITION_POINT: No transition point found for food B if it exists. That means the transition threshold is too high.
  if (protocol.foodB) {
    let foodBinSteps: boolean = false;
    for (const step of protocol.steps) {
      if (step.food === "B") {
        foodBinSteps = true;
      }
    }
    if (foodBinSteps === false) {
      warnings.push({
        severity: getWarningSeverity(WarningCode.Yellow.NO_TRANSITION_POINT),
        code: WarningCode.Yellow.NO_TRANSITION_POINT,
        message: `${escapeHtml(protocol.foodB.name)} has no transition point. Decrease the threshold if you want to transition.`,
      });
    }
  }
  return warnings;
}


/**
 * Reusable validator for Food A or B config
 * Checks:
 * - if mgPerUnit <= 0  
 * - if grams in serving > serving size
 */
function validateFoodConfig(food: Food): Warning[] {
  const warnings: Warning[] = [];

  if (food.getMgPerUnit().lessThanOrEqualTo(0)) {
    warnings.push({
      severity: getWarningSeverity(WarningCode.Red.INVALID_CONCENTRATION),
      code: WarningCode.Red.INVALID_CONCENTRATION,
      message: `${escapeHtml(food.name)} protein concentration must be > 0 to be considered for OIT`,
    });
  }
  if (food.gramsInServing.greaterThan(food.servingSize)) {
    warnings.push({
      severity: getWarningSeverity(WarningCode.Red.INVALID_CONCENTRATION),
      code: WarningCode.Red.INVALID_CONCENTRATION,
      message: `${escapeHtml(food.name)} protein amount cannot be greater than a serving size of ${formatAmount(food.servingSize, getMeasuringUnit(food))}`,
    });
  }
  return warnings;
}

// ============================================
// STEP VALIDATORS
// ============================================

function validateAllSteps(protocol: Protocol): Warning[] {
  const warnings: Warning[] = [];

  // iterate through all steps
  protocol.steps.forEach((step) => {
    // Context object to pass around easily
    const ctx = { step, protocol, food: step.food === "B" ? protocol.foodB! : protocol.foodA };

    // Run checks
    warnings.push(...checkAnyStepType(ctx));
    warnings.push(...checkMeasurability(ctx));
    if (step.method === Method.DILUTE) {
      warnings.push(...checkDilutionStep(ctx));
    } else {
      warnings.push(...checkDirectStep(ctx));
    }
  });

  // Run Sequence checks (needs access to full array)
  warnings.push(...checkStepSequence(protocol.steps));

  return warnings;

}

// SPECIFIC STEP RULES
// ---------------

/**
 * Checks if the configured amounts are practically measurable by home tools - VALIDATES AGAINST ROUNDED AMOUNTS
 * Handles BELOW_RESOLUTION for both Dilution and Direct methods
 */
function checkMeasurability({ step, protocol, food }: { step: Step, protocol: Protocol, food: Food }): Warning[] {
  const warnings: Warning[] = [];
  const config = protocol.config;

  // FOR DILUTION STEPS (need to handle mix food and mix water amounts)
  if (step.method === Method.DILUTE) {

    // GET ROUNDED AMOUNTS - USER FACING
    const roundedMixFoodAmount = new Decimal(formatAmount(step.mixFoodAmount, getMeasuringUnit(food)));
    const roundedMixWaterAmount = new Decimal(formatAmount(step.mixWaterAmount, "ml"));
    const roundedDailyAmount = new Decimal(formatAmount(step.dailyAmount, "ml"));

    // Mix Food Amount Resolution
    if (food.type === FoodType.SOLID && roundedMixFoodAmount.lessThan(config.minMeasurableMass)) {
      warnings.push({
        severity: getWarningSeverity(WarningCode.Yellow.BELOW_RESOLUTION),
        code: WarningCode.Yellow.BELOW_RESOLUTION,
        message: `Step ${step.stepIndex}: Measuring ${formatNumber(step.mixFoodAmount, SOLID_RESOLUTION)} g of food is impractical. Aim for value ≥ ${config.minMeasurableMass} g`,
        stepIndex: step.stepIndex,
      });
    }
    if (food.type === FoodType.LIQUID && roundedMixFoodAmount.lessThan(config.minMeasurableVolume)) {
      warnings.push({
        severity: getWarningSeverity(WarningCode.Yellow.BELOW_RESOLUTION),
        code: WarningCode.Yellow.BELOW_RESOLUTION,
        message: `Step ${step.stepIndex}: Measuring ${formatNumber(step.mixFoodAmount, LIQUID_RESOLUTION)} ml of food is impractical. Aim for value ≥ ${config.minMeasurableVolume} ml`,
        stepIndex: step.stepIndex,
      });
    }

    // Daily Amount Resolution
    if (roundedDailyAmount.lessThan(config.minMeasurableVolume)) {
      warnings.push({
        severity: getWarningSeverity(WarningCode.Yellow.BELOW_RESOLUTION),
        code: WarningCode.Yellow.BELOW_RESOLUTION,
        message: `Step ${step.stepIndex}: Measuring a daily amount of ${formatNumber(step.dailyAmount, LIQUID_RESOLUTION)} ml is impractical. Aim for value ≥ ${config.minMeasurableVolume} ml`,
        stepIndex: step.stepIndex,
      });
    }

    // Mix Water Resolution
    if (roundedMixWaterAmount.lessThan(config.minMeasurableVolume)) {
      warnings.push({
        severity: getWarningSeverity(WarningCode.Yellow.BELOW_RESOLUTION),
        code: WarningCode.Yellow.BELOW_RESOLUTION,
        message: `Step ${step.stepIndex}: Measuring ${formatNumber(step.mixWaterAmount, LIQUID_RESOLUTION)} ml of water is impractical. Aim for value ≥ ${config.minMeasurableVolume} ml`,
        stepIndex: step.stepIndex,
      });
    }

  } else {
    // DIRECT Method
    // GET ROUNDED AMOUNTS
    const dailyAmountUnit = step.dailyAmountUnit;
    const roundedDailyAmount = new Decimal(formatAmount(step.dailyAmount, dailyAmountUnit));

    if (food.type === FoodType.SOLID && roundedDailyAmount.lessThan(config.minMeasurableMass)) {
      warnings.push({
        severity: getWarningSeverity(WarningCode.Yellow.BELOW_RESOLUTION),
        code: WarningCode.Yellow.BELOW_RESOLUTION,
        message: `Step ${step.stepIndex}: Measuring ${formatNumber(step.dailyAmount, SOLID_RESOLUTION)} g of food is impractical. Aim for ≥ ${config.minMeasurableMass} g`,
        stepIndex: step.stepIndex,
      });
    }
    if (food.type === FoodType.LIQUID && roundedDailyAmount.lessThan(config.minMeasurableVolume)) {
      warnings.push({
        severity: getWarningSeverity(WarningCode.Yellow.BELOW_RESOLUTION),
        code: WarningCode.Yellow.BELOW_RESOLUTION,
        message: `Step ${step.stepIndex}: Measuring ${formatNumber(step.dailyAmount, LIQUID_RESOLUTION)} ml of food is impractical. Aim for ≥ ${config.minMeasurableVolume} ml`,
        stepIndex: step.stepIndex,
      });
    }
  }

  return warnings;
};

/**
 *  This is for checks that apply to ANY step regardless of method
 *  Handles: INVALID_TARGET, HIGH_DAILY_AMOUNT
 */
function checkAnyStepType({ step, protocol, food }: { step: Step, protocol: Protocol, food: Food }): Warning[] {
  const warnings: Warning[] = [];

  // INVALID_TARGET: Step targetMg zero or negative
  if (step.targetMg.lessThanOrEqualTo(new Decimal(0))) {
    warnings.push({
      severity: getWarningSeverity(WarningCode.Red.INVALID_TARGET),
      code: WarningCode.Red.INVALID_TARGET,
      message: `Step ${step.stepIndex}: A target protein of ${formatNumber(step.targetMg, 1)} mg is NOT valid. It must be >0.`,
      stepIndex: step.stepIndex,
    });
  }

  // HIGH_DAILY_AMOUNT: more than the practical amount
  if (step.dailyAmount.greaterThan(protocol.config.MAX_DAILY_AMOUNT)) {
    warnings.push({
      severity: getWarningSeverity(WarningCode.Yellow.HIGH_DAILY_AMOUNT),
      code: WarningCode.Yellow.HIGH_DAILY_AMOUNT,
      message: `Step ${step.stepIndex}: Daily amount of ${formatAmount(step.dailyAmount, step.dailyAmountUnit)} ${step.dailyAmountUnit} is impractically high (> ${formatAmount(protocol.config.MAX_DAILY_AMOUNT, step.dailyAmountUnit)} ${step.dailyAmountUnit}).`,
      stepIndex: step.stepIndex,
    });
  }

  return warnings;
};

/**
 * CHECKS ARE RUN USING ROUNDED USER FACING VALUES
 * Checks specific to DILUTE steps.
 * Handles: PROTEIN_MISMATCH, INSUFFICIENT_MIX_PROTEIN, IMPOSSIBLE_VOLUME, 
 * INVALID_DILUTION_STEP_VALUES, LOW_SERVINGS, HIGH_SOLID_CONCENTRATION, HIGH_MIX_WATER
 */
function checkDilutionStep({ step, protocol, food }: { step: Step, protocol: Protocol, food: Food }): Warning[] {
  // Guard clause for malformed data
  if (step.mixFoodAmount == null || step.mixWaterAmount == null) {
    // Push a technical error warning or return early
    return [{
      severity: "red",
      code: WarningCode.Red.INVALID_DILUTION_STEP_VALUES,
      message: `Step ${step.stepIndex}: Missing mix amounts for dilution.`,
      stepIndex: step.stepIndex
    }];
  }

  const warnings: Warning[] = [];

  // Setup Rounded Values for Calculation
  const mixUnit = getMeasuringUnit(food);
  const roundedMixFoodAmount = new Decimal(formatAmount(step.mixFoodAmount, mixUnit));
  const roundedMixWaterAmount = new Decimal(formatAmount(step.mixWaterAmount, "ml"));
  const roundedDailyAmount = new Decimal(formatAmount(step.dailyAmount, "ml"));

  // Calculate Protein based on what the user actually measures
  const totalMixProteinBasedOnRounded = roundedMixFoodAmount.times(food.getMgPerUnit());

  // assume solid do not contribute to volume, while volume to volume is additive
  let mixTotalVolumeBasedOnRounded = food.type === FoodType.SOLID
    ? roundedMixWaterAmount
    : roundedMixFoodAmount.plus(roundedMixWaterAmount);

  // TODO! Anything better to handle this very weird case?
  if (mixTotalVolumeBasedOnRounded.isZero()) {
    mixTotalVolumeBasedOnRounded = new Decimal(1); // Avoid division by zero
  }

  // PROTEIN_MISMATCH:
  // NOTE: this uses ROUNDED values
  // If the dilution is impossible (e.g. not enough mix amount) then the output here would be nonsensical
  const calculatedProtein = totalMixProteinBasedOnRounded
    .times(roundedDailyAmount)
    .dividedBy(mixTotalVolumeBasedOnRounded);

  if (!step.targetMg.isZero()) {
    const delta = calculatedProtein.dividedBy(step.targetMg).minus(1).abs();
    if (delta.greaterThan(protocol.config.PROTEIN_TOLERANCE)) {

      let msg = `Step ${step.stepIndex}: Protein mismatch. Target ${formatNumber(step.targetMg, 1)} mg but calculated ${formatNumber(calculatedProtein, 1)} mg: ${formatNumber(delta.times(100), 0)}% difference.`;

      if (step.servings?.lessThan(new Decimal(1))) {
        msg = `Step ${step.stepIndex}: Protein mismatch. Valid dilution not possible to obtain target of (${formatNumber(step.targetMg, 1)} mg). Ensure the mixture contains enough food.`
      }

      warnings.push({
        severity: getWarningSeverity(WarningCode.Red.PROTEIN_MISMATCH),
        code: WarningCode.Red.PROTEIN_MISMATCH,
        message: msg,
        stepIndex: step.stepIndex,
      });
    }
  }

  // INSUFFICIENT_MIX_PROTEIN:
  // NOTE: this does NOT use rounded values
  if (step.servings?.lessThan(new Decimal(1))) {
    const totalMixProtein = step.mixFoodAmount!.times(food.getMgPerUnit());
    warnings.push({
      severity: getWarningSeverity(WarningCode.Red.INSUFFICIENT_MIX_PROTEIN),
      code: WarningCode.Red.INSUFFICIENT_MIX_PROTEIN,
      message: `Step ${step.stepIndex}: ${formatAmount(step.mixFoodAmount, getMeasuringUnit(food))} ${getMeasuringUnit(food)} of food only makes ${formatNumber(totalMixProtein, 1)} mg of total protein. However, target protein is ${formatNumber(step.targetMg, 1)} mg.`,
      stepIndex: step.stepIndex,
    });
  }

  // IMPOSSIBLE_VOLUME:
  const mixTotalVolume = food.type === FoodType.SOLID
    ? step.mixWaterAmount
    : step.mixFoodAmount!.plus(step.mixWaterAmount!);

  if (mixTotalVolume!.lessThan(step.dailyAmount)) {
    warnings.push({
      severity: getWarningSeverity(WarningCode.Red.IMPOSSIBLE_VOLUME),
      code: WarningCode.Red.IMPOSSIBLE_VOLUME,
      message: `Step ${step.stepIndex}: Total volume of dilution is ${formatNumber(mixTotalVolume, LIQUID_RESOLUTION)} ml; however, daily amount is ${formatNumber(step.dailyAmount, LIQUID_RESOLUTION)} ml, which is impossible`,
      stepIndex: step.stepIndex,
    });
  }

  // INVALID_DILUTION_STEP_VALUES:
  if (step.dailyAmount.lessThanOrEqualTo(0)) {
    warnings.push({
      severity: getWarningSeverity(WarningCode.Red.INVALID_DILUTION_STEP_VALUES),
      code: WarningCode.Red.INVALID_DILUTION_STEP_VALUES,
      message: `Step ${step.stepIndex}: Daily amount cannot be <= 0 ml`,
      stepIndex: step.stepIndex,
    });
  }
  if (step.mixFoodAmount!.lessThanOrEqualTo(0)) {
    warnings.push({
      severity: getWarningSeverity(WarningCode.Red.INVALID_DILUTION_STEP_VALUES),
      code: WarningCode.Red.INVALID_DILUTION_STEP_VALUES,
      message: `Step ${step.stepIndex}: Amount of food to mix cannot be <= 0 ${getMeasuringUnit(food)}`,
      stepIndex: step.stepIndex,
    });
  }
  if (step.mixWaterAmount!.lessThan(0)) {
    warnings.push({
      severity: getWarningSeverity(WarningCode.Red.INVALID_DILUTION_STEP_VALUES),
      code: WarningCode.Red.INVALID_DILUTION_STEP_VALUES,
      message: `Step ${step.stepIndex}: Amount of water to mix cannot be < 0 ml`,
      stepIndex: step.stepIndex,
    });
  }

  // LOW_SERVINGS
  if (step.servings!.lessThan(protocol.config.minServingsForMix) && step.servings!.greaterThan(new Decimal(1))) {
    warnings.push({
      severity: getWarningSeverity(WarningCode.Yellow.LOW_SERVINGS),
      code: WarningCode.Yellow.LOW_SERVINGS,
      message: `Step ${step.stepIndex}: Only ${formatNumber(step.servings, 1)} servings (< ${DEFAULT_CONFIG.minServingsForMix} - impractical). Consider increasing mix amounts.`,
      stepIndex: step.stepIndex,
    });
  }

  // HIGH_SOLID_CONCENTRATION
  if (
    food.type === FoodType.SOLID &&
    step.mixFoodAmount!.dividedBy(step.mixWaterAmount!).greaterThan(new Decimal(DEFAULT_CONFIG.MAX_SOLID_CONCENTRATION))
  ) {
    warnings.push({
      severity: getWarningSeverity(WarningCode.Yellow.HIGH_SOLID_CONCENTRATION),
      code: WarningCode.Yellow.HIGH_SOLID_CONCENTRATION,
      message: `Step ${step.stepIndex}: at ${formatNumber(step.mixFoodAmount, SOLID_RESOLUTION)} g of food in ${formatNumber(step.mixWaterAmount, LIQUID_RESOLUTION)} ml of water, the w/v is > ${formatNumber(DEFAULT_CONFIG.MAX_SOLID_CONCENTRATION.times(100), 0)}%. The assumption that the food contributes non-negligibly to the total volume of dilution is likely violated. Consider increasing the Daily Amount`,
      stepIndex: step.stepIndex,
    });
  }

  // HIGH_MIX_WATER
  if (step.mixWaterAmount && step.mixWaterAmount.greaterThan(protocol.config.MAX_MIX_WATER)) {
    warnings.push({
      severity: getWarningSeverity(WarningCode.Yellow.HIGH_MIX_WATER),
      code: WarningCode.Yellow.HIGH_MIX_WATER,
      message: `Step ${step.stepIndex}: Mix water amount of ${formatAmount(step.mixWaterAmount, "ml")} ml is impractically high (> ${formatAmount(protocol.config.MAX_MIX_WATER, "ml")} ml).`,
      stepIndex: step.stepIndex,
    });
  }

  return warnings;
};

/**
 * Checks specific to DIRECT steps.
 * Uses ROUNDED USER FACING VALUES to check
 * Handles: PROTEIN_MISMATCH
 */
function checkDirectStep({ step, protocol, food }: { step: Step, protocol: Protocol, food: Food }): Warning[] {
  const warnings: Warning[] = [];

  const dailyAmountUnit = step.dailyAmountUnit;
  const roundedDailyAmount = new Decimal(formatAmount(step.dailyAmount, dailyAmountUnit));
  const calculatedProtein = roundedDailyAmount.times(food.getMgPerUnit());

  // PROTEIN_MISMATCH
  if (!step.targetMg.isZero()) {
    const delta = calculatedProtein.dividedBy(step.targetMg).minus(1).abs();
    if (delta.greaterThan(protocol.config.PROTEIN_TOLERANCE)) {
      warnings.push({
        severity: getWarningSeverity(WarningCode.Red.PROTEIN_MISMATCH),
        code: WarningCode.Red.PROTEIN_MISMATCH,
        message: `Step ${step.stepIndex}: Protein mismatch. Target ${formatNumber(step.targetMg, 1)} mg but calculated ${formatNumber(calculatedProtein, 1)} mg: ${formatNumber(delta.times(100), 0)}% difference.`,
        stepIndex: step.stepIndex,
      });
    }
  }

  return warnings;
};

/**
 *  Problems checked:
 * - if all steps have at least ascending targetMg
 * - if adjacent targetMg are duplicate, unless A -> transition
 * - if dose increases by more than 100%
 */
function checkStepSequence(steps: Step[]): Warning[] {
  const warnings: Warning[] = [];

  for (let i = 1; i < steps.length; i++) {
    const currentStep = steps[i];
    const prevStep = steps[i - 1];

    // NON_ASCENDING_STEPS:
    if (currentStep.targetMg.lessThan(prevStep.targetMg)) {
      warnings.push({
        severity: getWarningSeverity(WarningCode.Yellow.NON_ASCENDING_STEPS),
        code: WarningCode.Yellow.NON_ASCENDING_STEPS,
        message: `Step target proteins must be ascending or equal — check step ${currentStep.stepIndex} vs step ${prevStep.stepIndex}.`,
        stepIndex: currentStep.stepIndex,
      });
    }

    // DUPLICATE_STEP:
    // Two directly adjacent steps have the same dose, and are the same food.
    if (currentStep.food === prevStep.food && currentStep.targetMg.equals(prevStep.targetMg)) {
      warnings.push({
        severity: getWarningSeverity(WarningCode.Yellow.DUPLICATE_STEP),
        code: WarningCode.Yellow.DUPLICATE_STEP,
        message: `Step ${prevStep.stepIndex} and Step ${currentStep.stepIndex} have the same target protein. This is redundant.`,
        stepIndex: currentStep.stepIndex,
      });
    }

    // RAPID_ESCALATION:
    // More than doubling between adj steps
    // In general most protocols in trials / clinical practice never go beyond, unless in very small steps (e.g. 1mg -> 2.5mg)
    // That said, there is no guideline that explicitly says >X % increase should not be done 
    // And for very rare and specific circumstances (ie. anti-IgE rush protocols) sometimes >2x is done...
    if (prevStep.targetMg.greaterThan(0)) {
      // limit is 2x unless previous step and current step <=5mg
      if (prevStep.targetMg.lessThanOrEqualTo(5) && currentStep.targetMg.lessThanOrEqualTo(5)) continue;

      const doublePrev = prevStep.targetMg.times(2);
      if (currentStep.targetMg.greaterThan(doublePrev)) {
        const ratio = currentStep.targetMg.dividedBy(prevStep.targetMg);

        warnings.push({
          severity: getWarningSeverity(WarningCode.Yellow.RAPID_ESCALATION),
          code: WarningCode.Yellow.RAPID_ESCALATION,
          message: `Step ${currentStep.stepIndex}: Rapid escalation (${formatNumber(ratio, 1)} times the previous dose). Most protocols in the literature do not exceed doubling in a single step, except at very small target doses.`,
          stepIndex: currentStep.stepIndex,
        });
      }
    }
  }

  return warnings;
};



