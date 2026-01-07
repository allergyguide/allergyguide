import { describe, it, expect } from 'vitest';
import { validateProtocol } from '../../core/validator';
import { generateDefaultProtocol } from '../../core/calculator';
import { DEFAULT_CONFIG } from '../../constants';
import { FoodType, Method, WarningCode } from '../../types';
import Decimal from 'decimal.js';
import type { Food } from '../../types';

const createFood = (type: FoodType = FoodType.SOLID): Food => ({
  name: 'Peanut',
  type,
  gramsInServing: new Decimal(10), // 10g protein
  servingSize: new Decimal(100),   // per 100g/ml
  getMgPerUnit() {
    return this.gramsInServing.times(1000).dividedBy(this.servingSize); // 100 mg/unit
  }
});

describe('Core: Validator', () => {
  const food = createFood();

  describe('Critical Errors (Red)', () => {
    it('should flag TOO_FEW_STEPS for too few steps', () => {
      const protocol = generateDefaultProtocol(food, DEFAULT_CONFIG);
      protocol.steps = protocol.steps.slice(0, 3); // Only 3 steps
      const warnings = validateProtocol(protocol);
      expect(warnings.some(w => w.code === WarningCode.Red.TOO_FEW_STEPS)).toBe(true);
    });

    it('should flag PROTEIN_MISMATCH for protein mismatch > tolerance', () => {
      const protocol = generateDefaultProtocol(food, DEFAULT_CONFIG);
      // Corrupt a step: say target is 100mg but daily amount is 0.1g (10mg)
      protocol.steps[5].targetMg = new Decimal(100);
      protocol.steps[5].dailyAmount = new Decimal(0.1);
      protocol.steps[5].method = Method.DIRECT;

      const warnings = validateProtocol(protocol);
      expect(warnings.some(w => w.code === WarningCode.Red.PROTEIN_MISMATCH)).toBe(true);
    });

    it('should flag IMPOSSIBLE_VOLUME for impossible volumes (mix < daily)', () => {
      // Only applies to dilution
      const protocol = generateDefaultProtocol(food, DEFAULT_CONFIG);
      const diluteStepIndex = protocol.steps.findIndex(s => s.method === Method.DILUTE);
      if (diluteStepIndex === -1) return;

      const step = protocol.steps[diluteStepIndex];
      // make daily amount huge, larger than mix water
      step.dailyAmount = new Decimal(1000);
      step.mixWaterAmount = new Decimal(10);

      const warnings = validateProtocol(protocol);
      expect(warnings.some(w => w.code === WarningCode.Red.IMPOSSIBLE_VOLUME)).toBe(true);
    });

    it('should flag INVALID_CONCENTRATION for invalid food protein concentration', () => {
      const badFood = { ...food, getMgPerUnit: () => new Decimal(0) };
      const protocol = generateDefaultProtocol(badFood, DEFAULT_CONFIG);
      const warnings = validateProtocol(protocol);
      expect(warnings.some(w => w.code === WarningCode.Red.INVALID_CONCENTRATION && w.message.includes("protein concentration must be > 0"))).toBe(true);
    });

    it('should flag INVALID_CONCENTRATION when protein content is greater than serving size', () => {
      const badFood = { ...food, gramsInServing: new Decimal(150), servingSize: new Decimal(100) }; // 150g protein in 100g serving
      const protocol = generateDefaultProtocol(badFood, DEFAULT_CONFIG);
      const warnings = validateProtocol(protocol);
      expect(warnings.some(w => w.code === WarningCode.Red.INVALID_CONCENTRATION && w.message.includes("protein amount cannot be greater than a serving size of"))).toBe(true);
    });

    it('should flag INVALID_TARGET for zero or negative targetMg', () => {
      const protocol = generateDefaultProtocol(food, DEFAULT_CONFIG);
      // Set target to 0
      protocol.steps[0].targetMg = new Decimal(0);
      let warnings = validateProtocol(protocol);
      expect(warnings.some(w => w.code === WarningCode.Red.INVALID_TARGET)).toBe(true);

      // Set target to negative
      protocol.steps[0].targetMg = new Decimal(-5);
      warnings = validateProtocol(protocol);
      expect(warnings.some(w => w.code === WarningCode.Red.INVALID_TARGET)).toBe(true);
    });

    it('should flag INSUFFICIENT_MIX_PROTEIN when dilution mix has less protein than target', () => {
      const protocol = generateDefaultProtocol(food, DEFAULT_CONFIG);
      const diluteStepIndex = protocol.steps.findIndex(s => s.method === Method.DILUTE);
      if (diluteStepIndex === -1) return;

      const step = protocol.steps[diluteStepIndex];
      // Set target to 100mg
      step.targetMg = new Decimal(100);
      // Set mix food to 0.5g (50mg protein) - less than target
      step.mixFoodAmount = new Decimal(0.5);
      // Ensure other fields are present to avoid other errors/crashes in calculation
      step.mixWaterAmount = new Decimal(10);
      step.servings = new Decimal(0.5); // 50mg / 100mg = 0.5 servings

      const warnings = validateProtocol(protocol);
      expect(warnings.some(w => w.code === WarningCode.Red.INSUFFICIENT_MIX_PROTEIN)).toBe(true);
    });

    it('should flag PROTEIN_MISMATCH for dilution steps with incorrect proportions', () => {
      // Test Case 4: Dilution-Specific PROTEIN_MISMATCH
      const protocol = generateDefaultProtocol(food, DEFAULT_CONFIG);
      const diluteStepIndex = protocol.steps.findIndex(s => s.method === Method.DILUTE);
      // Ensure we have a dilute step
      if (diluteStepIndex === -1) return;

      const step = protocol.steps[diluteStepIndex];
      step.targetMg = new Decimal(10);
      step.mixFoodAmount = new Decimal(1);
      step.mixWaterAmount = new Decimal(10);
      step.dailyAmount = new Decimal(1); // 10mg delivered
      step.servings = new Decimal(10);

      // Verify baseline is valid (or at least doesn't trigger mismatch)
      let warnings = validateProtocol(protocol);
      expect(warnings.some(w => w.code === WarningCode.Red.PROTEIN_MISMATCH)).toBe(false);

      // Now corrupt it: Change water to 20ml (diluting it further)
      step.mixWaterAmount = new Decimal(20);
      warnings = validateProtocol(protocol);
      expect(warnings.some(w => w.code === WarningCode.Red.PROTEIN_MISMATCH)).toBe(true);
    });

    it('should flag INVALID_DILUTION_STEP_VALUES for negative physical values', () => {
      const protocol = generateDefaultProtocol(food, DEFAULT_CONFIG);
      const diluteStepIndex = protocol.steps.findIndex(s => s.method === Method.DILUTE);
      if (diluteStepIndex === -1) return;

      const step = protocol.steps[diluteStepIndex];

      // Negative water
      step.mixWaterAmount = new Decimal(-10);
      let warnings = validateProtocol(protocol);
      expect(warnings.some(w => w.code === WarningCode.Red.INVALID_DILUTION_STEP_VALUES)).toBe(true);

      // Reset water
      step.mixWaterAmount = new Decimal(10);

      // Zero daily amount
      step.dailyAmount = new Decimal(0);
      warnings = validateProtocol(protocol);
      expect(warnings.some(w => w.code === WarningCode.Red.INVALID_DILUTION_STEP_VALUES)).toBe(true);
    });

    it('should flag IMPOSSIBLE_VOLUME for Liquid-Specific additive volume issue', () => {
      // Liquid-Specific IMPOSSIBLE_VOLUME
      const liquidFood = createFood(FoodType.LIQUID);
      const protocol = generateDefaultProtocol(liquidFood, DEFAULT_CONFIG);
      const diluteStepIndex = protocol.steps.findIndex(s => s.method === Method.DILUTE);
      if (diluteStepIndex === -1) return;

      const step = protocol.steps[diluteStepIndex];

      // Set mix: 5ml food + 5ml water = 10ml total
      step.mixFoodAmount = new Decimal(5);
      step.mixWaterAmount = new Decimal(5);

      // Set daily amount to 12ml
      step.dailyAmount = new Decimal(12);

      const warnings = validateProtocol(protocol);
      expect(warnings.some(w => w.code === WarningCode.Red.IMPOSSIBLE_VOLUME)).toBe(true);
    });
  });

  describe('Warnings (Yellow)', () => {
    it('should flag LOW_SERVINGS for low servings', () => {
      const protocol = generateDefaultProtocol(food, DEFAULT_CONFIG);
      const diluteStepIndex = protocol.steps.findIndex(s => s.method === Method.DILUTE);
      if (diluteStepIndex === -1) return;

      // Force servings to be 1.5 (min is 3)
      protocol.steps[diluteStepIndex].servings = new Decimal(1.5);

      const warnings = validateProtocol(protocol);
      expect(warnings.some(w => w.code === WarningCode.Yellow.LOW_SERVINGS)).toBe(true);
    });

    it('should flag NON_ASCENDING_STEPS for non-ascending targets', () => {
      const protocol = generateDefaultProtocol(food, DEFAULT_CONFIG);
      // Make step 2 smaller than step 1
      protocol.steps[1].targetMg = protocol.steps[0].targetMg.dividedBy(2);

      const warnings = validateProtocol(protocol);
      expect(warnings.some(w => w.code === WarningCode.Yellow.NON_ASCENDING_STEPS)).toBe(true);
    });

    it('should flag BELOW_RESOLUTION for measurements below tool resolution', () => {
      const protocol = generateDefaultProtocol(food, DEFAULT_CONFIG);
      // Make a direct step have very small amount
      const directIndex = protocol.steps.findIndex(s => s.method === Method.DIRECT);
      protocol.steps[directIndex].dailyAmount = new Decimal(0.01); // < 0.2g default min

      const warnings = validateProtocol(protocol);
      expect(warnings.some(w => w.code === WarningCode.Yellow.BELOW_RESOLUTION)).toBe(true);
    });

    it('should flag HIGH_SOLID_CONCENTRATION for high solid concentration in liquid', () => {
      const protocol = generateDefaultProtocol(food, DEFAULT_CONFIG); // Solid food
      const diluteStepIndex = protocol.steps.findIndex(s => s.method === Method.DILUTE);
      if (diluteStepIndex === -1) return;

      // High concentration: 10g food in 10ml water = 1:1 ratio > 0.05 limit
      protocol.steps[diluteStepIndex].mixFoodAmount = new Decimal(10);
      protocol.steps[diluteStepIndex].mixWaterAmount = new Decimal(10);

      const warnings = validateProtocol(protocol);
      expect(warnings.some(w => w.code === WarningCode.Yellow.HIGH_SOLID_CONCENTRATION)).toBe(true);
    });

    it('should flag DUPLICATE_STEP for redundant adjacent steps', () => {
      const protocol = generateDefaultProtocol(food, DEFAULT_CONFIG);
      // Make step 2 same as step 1
      protocol.steps[1].targetMg = protocol.steps[0].targetMg;

      const warnings = validateProtocol(protocol);
      expect(warnings.some(w => w.code === WarningCode.Yellow.DUPLICATE_STEP)).toBe(true);
    });

    it('should NOT flag DUPLICATE_STEP if foods are different (transition)', () => {
      const protocol = generateDefaultProtocol(food, DEFAULT_CONFIG);
      // Make adjacent steps have same target but different food
      protocol.steps[1].targetMg = protocol.steps[0].targetMg;
      protocol.steps[0].food = 'A';
      protocol.steps[1].food = 'B';

      // Ensure Food B is defined
      protocol.foodB = { ...food, name: 'Food B' };

      const warnings = validateProtocol(protocol);
      expect(warnings.some(w => w.code === WarningCode.Yellow.DUPLICATE_STEP)).toBe(false);
    });

    it('should flag HIGH_DAILY_AMOUNT when daily amount exceeds limit', () => {
      const protocol = generateDefaultProtocol(food, DEFAULT_CONFIG);
      // Set daily amount to 300 (default max is 250)
      const index = protocol.steps.findIndex(s => s.method === Method.DIRECT);
      protocol.steps[index].dailyAmount = new Decimal(300);

      const warnings = validateProtocol(protocol);
      expect(warnings.some(w => w.code === WarningCode.Yellow.HIGH_DAILY_AMOUNT)).toBe(true);
    });

    it('should flag HIGH_MIX_WATER when mix water exceeds limit', () => {
      const protocol = generateDefaultProtocol(food, DEFAULT_CONFIG);
      const index = protocol.steps.findIndex(s => s.method === Method.DILUTE);
      if (index === -1) return;

      // Set mix water to 600 (default max is 500)
      protocol.steps[index].mixWaterAmount = new Decimal(600);

      const warnings = validateProtocol(protocol);
      expect(warnings.some(w => w.code === WarningCode.Yellow.HIGH_MIX_WATER)).toBe(true);
    });

    it('should flag RAPID_ESCALATION for >2x increase in dose', () => {
      const protocol = generateDefaultProtocol(food, DEFAULT_CONFIG);
      // Construct steps: 10mg -> 25mg (2.5x increase)
      protocol.steps[0].targetMg = new Decimal(10);
      protocol.steps[1].targetMg = new Decimal(25);

      const warnings = validateProtocol(protocol);
      expect(warnings.some(w => w.code === WarningCode.Yellow.RAPID_ESCALATION)).toBe(true);
    });

    it('should NOT flag RAPID_ESCALATION for >2x increase if both doses <= 5mg', () => {
      const protocol = generateDefaultProtocol(food, DEFAULT_CONFIG);
      // Construct steps: 1mg -> 4mg (4x increase, but small doses)
      protocol.steps[0].targetMg = new Decimal(1);
      protocol.steps[1].targetMg = new Decimal(4);

      const warnings = validateProtocol(protocol);
      expect(warnings.some(w => w.code === WarningCode.Yellow.RAPID_ESCALATION)).toBe(false);
    });

    it('should flag RAPID_ESCALATION for >2x increase when crossing 5mg threshold (e.g. 3mg -> 7mg)', () => {
      const protocol = generateDefaultProtocol(food, DEFAULT_CONFIG);
      // Construct steps: 3mg -> 7mg (2.33x increase, and 7mg > 5mg)
      protocol.steps[0].targetMg = new Decimal(3);
      protocol.steps[1].targetMg = new Decimal(7);

      const warnings = validateProtocol(protocol);
      expect(warnings.some(w => w.code === WarningCode.Yellow.RAPID_ESCALATION)).toBe(true);
    });

    it('should NOT flag RAPID_ESCALATION for <=2x increase', () => {
      const protocol = generateDefaultProtocol(food, DEFAULT_CONFIG);
      // Construct steps: 10mg -> 20mg (2x increase)
      protocol.steps[0].targetMg = new Decimal(10);
      protocol.steps[1].targetMg = new Decimal(20);

      const warnings = validateProtocol(protocol);
      expect(warnings.some(w => w.code === WarningCode.Yellow.RAPID_ESCALATION)).toBe(false);
    });

    it('should flag NO_TRANSITION_POINT when Food B is defined but no transition steps exist', () => {
      const protocol = generateDefaultProtocol(food, DEFAULT_CONFIG);
      // Add Food B definition but don't add steps for it
      protocol.foodB = { ...food, name: 'Food B' };
      // Manually ensure all steps are Food A
      protocol.steps.forEach(s => s.food = 'A');

      const warnings = validateProtocol(protocol);
      expect(warnings.some(w => w.code === WarningCode.Yellow.NO_TRANSITION_POINT)).toBe(true);
    });

    it('should flag BELOW_RESOLUTION for dilution mix ingredients', () => {
      // Component-Level BELOW_RESOLUTION
      const protocol = generateDefaultProtocol(food, DEFAULT_CONFIG);
      const diluteStepIndex = protocol.steps.findIndex(s => s.method === Method.DILUTE);
      if (diluteStepIndex === -1) return;

      const step = protocol.steps[diluteStepIndex];

      // Ensure daily amount is valid (> min)
      step.dailyAmount = new Decimal(5);

      // Set mix food amount to tiny (0.05g < 0.2g minMeasurableMass)
      step.mixFoodAmount = new Decimal(0.05);

      const warnings = validateProtocol(protocol);
      expect(warnings.some(w => w.code === WarningCode.Yellow.BELOW_RESOLUTION)).toBe(true);
    });
  });
});
