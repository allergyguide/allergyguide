import { describe, it, expect, beforeEach } from 'vitest';
import Decimal from 'decimal.js';
import {
  addFoodBToProtocol,
  recalculateProtocol,
  updateStepTargetMg,
  updateStepDailyAmount,
  updateStepMixFoodAmount,
  toggleFoodType,
  removeStep,
  addStepAfter
} from '../../core/protocol';
import { generateDefaultProtocol } from '../../core/calculator';
import { FoodType, Method, DosingStrategy } from '../../types';
import { DEFAULT_CONFIG } from '../../constants';
import type { Food, Protocol } from '../../types';

const createFood = (name: string, type: FoodType = FoodType.SOLID): Food => ({
  name,
  type,
  gramsInServing: new Decimal(10),
  servingSize: new Decimal(100),
  getMgPerUnit() {
    return this.gramsInServing.times(1000).dividedBy(this.servingSize); // 100 mg/unit
  }
});

describe('Core: Protocol Manipulation', () => {
  const foodA = createFood('Food A', FoodType.SOLID);
  const foodB = createFood('Food B', FoodType.SOLID);

  let baseProtocol: Protocol;

  beforeEach(() => {
    baseProtocol = generateDefaultProtocol(foodA, DEFAULT_CONFIG);
  });

  describe('addFoodBToProtocol', () => {
    it('should transition to Food B at correct threshold', () => {
      // Threshold 1g of Food B = 100mg protein
      const threshold = { unit: 'g' as const, amount: new Decimal(1) };

      const newProto = addFoodBToProtocol(baseProtocol, foodB, threshold);

      expect(newProto.foodB).toBeDefined();
      expect(newProto.foodB!.name).toBe('Food B');

      const steps = newProto.steps;
      const firstBIndex = steps.findIndex(s => s.food === 'B');

      expect(firstBIndex).not.toBe(-1);

      const transitionStep = steps[firstBIndex];
      const prevStep = steps[firstBIndex - 1];

      // Ensure transition logic: duplicate step at transition
      expect(transitionStep.targetMg.toNumber()).toEqual(prevStep.targetMg.toNumber());
      expect(transitionStep.food).toBe('B');
      expect(prevStep.food).toBe('A');
    });
  });

  describe('recalculateProtocol', () => {
    it('should regenerate all steps based on current configuration', () => {
      // Change strategy to SLOW
      const p = { ...baseProtocol, dosingStrategy: DosingStrategy.SLOW };
      const newProto = recalculateProtocol(p);

      expect(newProto.steps.length).not.toBe(baseProtocol.steps.length);
    });

    it('should re-apply Food B transition if it exists', () => {
      const threshold = { unit: 'g' as const, amount: new Decimal(1) };
      let p = addFoodBToProtocol(baseProtocol, foodB, threshold);

      // modify config causing recalc
      p.dosingStrategy = DosingStrategy.SLOW;

      const newProto = recalculateProtocol(p);

      expect(newProto.foodB).toBeDefined();
      // Check if steps still transition
      const hasB = newProto.steps.some(s => s.food === 'B');
      expect(hasB).toBe(true);
    });
  });

  describe('Step Updates', () => {
    it('updateStepTargetMg should recalculate daily amount for DIRECT steps', () => {
      // Find a direct step
      const index = baseProtocol.steps.findIndex(s => s.method === Method.DIRECT) + 1;

      // Change target from X to 200mg
      // 200mg = 2g of food (100mg/g)
      const newProto = updateStepTargetMg(baseProtocol, index, 200);
      const newStep = newProto.steps[index - 1];

      expect(newStep.targetMg.toNumber()).toBe(200);
      expect(newStep.dailyAmount.toNumber()).toBe(2);
    });

    it('updateStepTargetMg should recalculate servings/water for DILUTE steps', () => {
      // Find dilute step
      const index = baseProtocol.steps.findIndex(s => s.method === Method.DILUTE) + 1;
      if (index === 0) return; // Should exist with default config

      const oldStep = baseProtocol.steps[index - 1];
      const newTarget = oldStep.targetMg.times(2);

      const newProto = updateStepTargetMg(baseProtocol, index, newTarget);
      const newStep = newProto.steps[index - 1];

      // mixFoodAmount should stay same
      expect(newStep.mixFoodAmount?.toNumber()).toBe(oldStep.mixFoodAmount?.toNumber());
      // servings should halve approx
      expect(newStep.servings?.toNumber()).toBeCloseTo(oldStep.servings!.dividedBy(2).toNumber());
    });

    it('updateStepDailyAmount should recalculate targetMg for DIRECT steps', () => {
      const index = baseProtocol.steps.findIndex(s => s.method === Method.DIRECT) + 1;
      const newProto = updateStepDailyAmount(baseProtocol, index, 5); // 5g

      const newStep = newProto.steps[index - 1];
      expect(newStep.dailyAmount.toNumber()).toBe(5);
      // 5g * 100mg/g = 500mg
      expect(newStep.targetMg.toNumber()).toBe(500);
    });

    it('updateStepMixFoodAmount should recalculate water/servings for DILUTE steps', () => {
      const index = baseProtocol.steps.findIndex(s => s.method === Method.DILUTE) + 1;
      if (index === 0) return;

      const oldStep = baseProtocol.steps[index - 1];
      const newMixFood = oldStep.mixFoodAmount!.times(2);

      const newProto = updateStepMixFoodAmount(baseProtocol, index, newMixFood);
      const newStep = newProto.steps[index - 1];

      expect(newStep.mixFoodAmount?.toNumber()).toBe(newMixFood.toNumber());
      // targetMg and dailyAmount should be preserved
      expect(newStep.targetMg.toNumber()).toBe(oldStep.targetMg.toNumber());
      expect(newStep.dailyAmount.toNumber()).toBe(oldStep.dailyAmount.toNumber());
      // servings should double (since mix protein doubled)
      expect(newStep.servings?.toNumber()).toBeCloseTo(oldStep.servings!.times(2).toNumber());
    });
  });

  describe('Structure Modification', () => {
    it('should add step after', () => {
      const len = baseProtocol.steps.length;
      const newProto = addStepAfter(baseProtocol, 1);
      expect(newProto.steps.length).toBe(len + 1);
      expect(newProto.steps[1].stepIndex).toBe(2);
      expect(newProto.steps[2].stepIndex).toBe(3);
      expect(newProto.steps[1].targetMg).toEqual(newProto.steps[0].targetMg);
    });

    it('should remove step', () => {
      const len = baseProtocol.steps.length;
      const newProto = removeStep(baseProtocol, 1);
      expect(newProto.steps.length).toBe(len - 1);
      expect(newProto.steps[0].stepIndex).toBe(1);
    });
  });

  describe('Toggles', () => {
    it('toggleFoodType should switch units', () => {
      // Toggle Food A to Liquid
      expect(baseProtocol.foodA.type).toBe(FoodType.SOLID);
      const newProto = toggleFoodType(baseProtocol, false);

      expect(newProto.foodA.type).toBe(FoodType.LIQUID);

      // Check steps
      newProto.steps.forEach(s => {
        if (s.method === Method.DIRECT) {
          expect(s.dailyAmountUnit).toBe('ml');
        }
      });
    });
  });
});
