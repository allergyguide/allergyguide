import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { findDilutionCandidates, generateStepForTarget, generateDefaultProtocol } from '../../core/calculator';
import { FoodType, Method, FoodAStrategy, DosingStrategy } from '../../types';
import { DEFAULT_CONFIG } from '../../constants';
import type { Food, ProtocolConfig } from '../../types';

// Helper: create a food object
const createFood = (type: FoodType = FoodType.SOLID, proteinPercent: number = 10): Food => ({
  name: type === FoodType.SOLID ? 'Peanut Flour' : 'Milk',
  type,
  gramsInServing: new Decimal(proteinPercent), // e.g. 10g protein
  servingSize: new Decimal(100),   // per 100g/ml
  getMgPerUnit() {
    return this.gramsInServing.times(1000).dividedBy(this.servingSize); // e.g. 100 mg/unit
  }
});

describe('Core: Calculator', () => {
  const solidFood = createFood(FoodType.SOLID, 10); // 100 mg/g
  const liquidFood = createFood(FoodType.LIQUID, 10); // 100 mg/ml

  describe('findDilutionCandidates', () => {
    it('should find candidates for solid foods within constraints', () => {
      // Target 10mg protein -> 0.1g food.
      // Default minMeasurableMass is 0.2g, so this needs dilution.
      const candidates = findDilutionCandidates(new Decimal(10), solidFood, DEFAULT_CONFIG);
      expect(candidates.length).toBeGreaterThan(0);

      candidates.forEach(c => {
        expect(c.mixFoodAmount.toNumber()).toBeGreaterThanOrEqual(DEFAULT_CONFIG.minMeasurableMass.toNumber());
        expect(c.mixWaterAmount.toNumber()).toBeGreaterThanOrEqual(DEFAULT_CONFIG.minMeasurableVolume.toNumber());
        expect(c.mixWaterAmount.toNumber()).toBeLessThanOrEqual(DEFAULT_CONFIG.MAX_MIX_WATER.toNumber());

        // For solid in liquid: mixTotalVolume = mixWaterAmount (approx)
        // Protein check:
        const totalProtein = c.mixFoodAmount.times(100); // 100mg/g
        const proteinPerMl = totalProtein.dividedBy(c.mixTotalVolume);
        const delivered = proteinPerMl.times(c.dailyAmount);

        // Check tolerance
        const diff = delivered.minus(10).abs().dividedBy(10);
        expect(diff.toNumber()).toBeLessThanOrEqual(DEFAULT_CONFIG.PROTEIN_TOLERANCE.toNumber());
      });
    });

    it('should find candidates for liquid foods using additive volume', () => {
      // Target 10mg protein -> 0.1ml food.
      const candidates = findDilutionCandidates(new Decimal(10), liquidFood, DEFAULT_CONFIG);
      expect(candidates.length).toBeGreaterThan(0);

      candidates.forEach(c => {
        // Liquid in liquid: mixTotalVolume = mixFood + mixWater
        expect(c.mixTotalVolume.minus(c.mixFoodAmount).toNumber()).toBeCloseTo(c.mixWaterAmount.toNumber());

        // Verify mix water is positive (implied by logic, but good to check)
        expect(c.mixWaterAmount.toNumber()).toBeGreaterThanOrEqual(0);
      });
    });

    it('should prioritize low concentration candidates for SOLID foods', () => {
      // Default MAX_SOLID_CONCENTRATION is 5% w/v
      // Target 10mg. Food has 100mg/g.
      const candidates = findDilutionCandidates(new Decimal(10), solidFood, DEFAULT_CONFIG);

      if (candidates.length >= 2) {
        const best = candidates[0];
        // Calculate concentration for the winner
        const conc = best.mixFoodAmount.dividedBy(best.mixWaterAmount);

        // We expect the best candidate to respect the max concentration if possible
        if (conc.greaterThan(DEFAULT_CONFIG.MAX_SOLID_CONCENTRATION)) {
          // If it violates, it means NO candidate met the criteria, 
          // OR the sort logic failed.
          const anyMet = candidates.some(c =>
            c.mixFoodAmount.dividedBy(c.mixWaterAmount).lessThanOrEqualTo(DEFAULT_CONFIG.MAX_SOLID_CONCENTRATION)
          );
          // If some met it, but the first one didn't, that's a failure.
          expect(anyMet).toBe(false);
        } else {
          expect(conc.toNumber()).toBeLessThanOrEqual(DEFAULT_CONFIG.MAX_SOLID_CONCENTRATION.toNumber());
        }
      }
    });

    it('should respect PROTEIN_TOLERANCE', () => {
      // Create a scenario where math is slightly off.
      // ie make the tolerance very tight to reject everything.
      const tightConfig: ProtocolConfig = {
        ...DEFAULT_CONFIG,
        PROTEIN_TOLERANCE: new Decimal(0.0000001) // Extremely strict
      };

      // It's likely that rounding to standard amounts (daily candidates) 
      // won't hit this perfect precision for arbitrary targets.
      // 13mg target is a prime number, hard to hit perfectly with standard step sizes.
      const candidates = findDilutionCandidates(new Decimal(13), solidFood, tightConfig);

      // Depending on the candidate arrays, this might return empty or very few matches.
      // This test mainly ensures the config parameter is actually used.
      // If we used a huge tolerance, we'd get more.
      const looseConfig: ProtocolConfig = {
        ...DEFAULT_CONFIG,
        PROTEIN_TOLERANCE: new Decimal(0.5) // 50%
      };
      const looseCandidates = findDilutionCandidates(new Decimal(13), solidFood, looseConfig);

      expect(looseCandidates.length).toBeGreaterThanOrEqual(candidates.length);
    });

    it('should respect MAX_MIX_WATER', () => {
      const lowWaterConfig: ProtocolConfig = {
        ...DEFAULT_CONFIG,
        MAX_MIX_WATER: new Decimal(5) // Max 5ml water
      };
      // This should filter out many candidates that require 100ml+ water
      const candidates = findDilutionCandidates(new Decimal(10), solidFood, lowWaterConfig);

      candidates.forEach(c => {
        expect(c.mixWaterAmount.toNumber()).toBeLessThanOrEqual(5);
      });
    });

    it('should return empty array if no candidates satisfy constraints', () => {
      const impossibleConfig: ProtocolConfig = {
        ...DEFAULT_CONFIG,
        minMeasurableMass: new Decimal(100), // Huge mass needed
        MAX_MIX_WATER: new Decimal(10)      // Tiny water allowed
      };
      // 1mg target
      const candidates = findDilutionCandidates(new Decimal(1), solidFood, impossibleConfig);
      expect(candidates).toHaveLength(0);
    });

    describe('Water Resolution Snapping (0.5ml increments)', () => {
      // Setup: 100mg/g food
      const food = createFood(FoodType.SOLID, 10);

      it('should return ONLY 0.5ml aligned water amounts when they satisfy tolerance', () => {
        // Target: 11mg 
        // Mix Candidate: 1g (100mg protein)
        // Daily Amount: 1ml
        // Ideal Servings = 100 / 11 = 9.0909...
        // Ideal Water = 9.0909... ml

        // 9.0ml water -> 100/9 = 11.11mg/ml -> 11.11mg dose. Error ~1%
        // 9.5ml water -> 100/9.5 = 10.52mg/ml -> 10.52mg dose. Error ~4.3%
        // Both satisfy default 5% tolerance.

        const candidates = findDilutionCandidates(new Decimal(11), food, DEFAULT_CONFIG);

        // Filter for this specific recipe mix
        const matches = candidates.filter(c =>
          c.mixFoodAmount.equals(1) && c.dailyAmount.equals(1)
        );

        expect(matches.length).toBeGreaterThan(0);

        // Verify all matches are multiples of 0.5
        matches.forEach(m => {
          const isAligned = m.mixWaterAmount.mod(0.5).equals(0);
          expect(isAligned).toBe(true);
        });

        // Verify the "perfect" but messy 9.0909 was NOT included
        const hasMessy = matches.some(m => !m.mixWaterAmount.mod(0.5).equals(0));
        expect(hasMessy).toBe(false);
      });

      it('should fallback to precise/messy water amounts when 0.5ml increments violate tolerance', () => {
        // Same scenario: Target 11mg. Ideal water 9.0909...
        // 9.0ml (1% error) and 9.5ml (4.3% error).

        // tighten tolerance to 0.1% so 9.0 and 9.5 fail
        const strictConfig: ProtocolConfig = {
          ...DEFAULT_CONFIG,
          PROTEIN_TOLERANCE: new Decimal(0.001) // 0.1%
        };

        const candidates = findDilutionCandidates(new Decimal(11), food, strictConfig);

        const matches = candidates.filter(c =>
          c.mixFoodAmount.equals(1) && c.dailyAmount.equals(1)
        );

        expect(matches.length).toBeGreaterThan(0);

        // Should contain the messy value because the snapped ones failed
        const preciseMatch = matches[0];
        expect(preciseMatch.mixWaterAmount.toNumber()).toBeCloseTo(9.0909, 3);

        // Ensure it is NOT 0.5 aligned
        expect(preciseMatch.mixWaterAmount.mod(0.5).toNumber()).not.toBe(0);
      });
    });
  });

  describe('generateStepForTarget', () => {
    const diThreshold = new Decimal(0.5);

    it('should return DIRECT step when above threshold', () => {
      const step = generateStepForTarget(
        new Decimal(1000), // 1000mg = 10g food
        1,
        solidFood,
        "A",
        FoodAStrategy.DILUTE_INITIAL,
        diThreshold,
        DEFAULT_CONFIG
      );
      expect(step?.method).toBe(Method.DIRECT);
      expect(step?.dailyAmount.toNumber()).toBe(10);
      expect(step?.dailyAmountUnit).toBe('g');
    });

    it('should return DILUTE step when below threshold and candidates exist', () => {
      const step = generateStepForTarget(
        new Decimal(10), // 10mg = 0.1g food < 0.5g
        1,
        solidFood,
        "A",
        FoodAStrategy.DILUTE_INITIAL,
        diThreshold,
        DEFAULT_CONFIG
      );
      expect(step?.method).toBe(Method.DILUTE);
      expect(step?.mixFoodAmount).toBeDefined();
    });

    it('should return DIRECT step for any amount if strategy is DILUTE_NONE', () => {
      const step = generateStepForTarget(
        new Decimal(10), // 10mg would normally require dilution
        1,
        solidFood,
        "A",
        FoodAStrategy.DILUTE_NONE,
        diThreshold,
        DEFAULT_CONFIG
      );
      expect(step?.method).toBe(Method.DIRECT);
      // It should just calculate the raw mass
      expect(step?.dailyAmount.toNumber()).toBe(0.1);
    });

    it('should force DILUTE for large amounts if strategy is DILUTE_ALL', () => {
      const step = generateStepForTarget(
        new Decimal(1000), // 10g normally DIRECT
        1,
        solidFood,
        "A",
        FoodAStrategy.DILUTE_ALL,
        diThreshold,
        DEFAULT_CONFIG
      );
      // It might be null if it can't dilute such a large amount due to constraints (e.g. max water)
      // If it is null, that's valid behavior, but if it returns a step, it MUST be DILUTE.
      if (step) {
        expect(step.method).toBe(Method.DILUTE);
      }
    });

    it('should return null if dilution required but not possible', () => {
      const strictConfig: ProtocolConfig = {
        ...DEFAULT_CONFIG,
        minMeasurableMass: new Decimal(1000),
      };
      const step = generateStepForTarget(
        new Decimal(1),
        1,
        solidFood,
        "A",
        FoodAStrategy.DILUTE_INITIAL,
        diThreshold,
        strictConfig
      );
      expect(step).toBeNull();
    });

    describe('Direct Amount Snapping', () => {
      // Setup Food: 170mg/g
      const food = createFood(FoodType.SOLID, 17);

      it('should snap to cleaner number if within tolerance', () => {
        // Target: 240mg
        // Precise: 240 / 170 = 1.41176 g
        // Snap 0.1: 1.4 g -> 238 mg -> 0.8% error (OK)

        const step = generateStepForTarget(
          new Decimal(240),
          1,
          food,
          "A",
          FoodAStrategy.DILUTE_NONE, // Force direct
          diThreshold,
          DEFAULT_CONFIG
        );

        expect(step?.method).toBe(Method.DIRECT);
        expect(step?.dailyAmount.toNumber()).toBe(1.4); // Snapped
      });

      it('should fallback to precise number if snap is outside tolerance', () => {
        // Target: 40mg
        // Precise: 40 / 170 = 0.23529 g
        // Snap 0.1: 0.2 -> 34mg (15% error) -> Fail
        // Snap 0.05: 0.25 -> 42.5mg (6.25% error) -> Fail
        // Should keep precise

        const step = generateStepForTarget(
          new Decimal(40),
          1,
          food,
          "A",
          FoodAStrategy.DILUTE_NONE,
          diThreshold,
          DEFAULT_CONFIG
        );

        expect(step?.method).toBe(Method.DIRECT);
        expect(step?.dailyAmount.toNumber()).toBeCloseTo(0.23529, 4);
      });
    });
  });

  describe('generateDefaultProtocol', () => {
    it('should generate a full protocol', () => {
      const protocol = generateDefaultProtocol(solidFood, DEFAULT_CONFIG);
      expect(protocol.foodA).toEqual(solidFood);
      expect(protocol.steps.length).toBeGreaterThan(0);
      expect(protocol.dosingStrategy).toBe(DosingStrategy.STANDARD);

      // Verify ascending order
      for (let i = 1; i < protocol.steps.length; i++) {
        expect(protocol.steps[i].targetMg.toNumber()).toBeGreaterThan(protocol.steps[i - 1].targetMg.toNumber());
      }
    });

    it('should provide fallback DIRECT steps if dilution fails', () => {
      // Create a config where dilution is impossible (huge min mass)
      const impossibleConfig: ProtocolConfig = {
        ...DEFAULT_CONFIG,
        minMeasurableMass: new Decimal(1000)
      };

      // This will attempt to create a protocol. 
      // Small doses (1mg, 2.5mg) will fail dilution.
      // The function should catch the null return and force a DIRECT step.
      const protocol = generateDefaultProtocol(solidFood, impossibleConfig);

      expect(protocol.steps.length).toBeGreaterThan(0);

      // Check the first step (lowest dose)
      const firstStep = protocol.steps[0];
      // It should be DIRECT even though it's tiny
      expect(firstStep.method).toBe(Method.DIRECT);

      // And it should have the correct calculated neat mass
      // 1mg target / 100mg/g = 0.01g
      const expectedMass = firstStep.targetMg.dividedBy(solidFood.getMgPerUnit());
      expect(firstStep.dailyAmount.toNumber()).toBeCloseTo(expectedMass.toNumber());
    });
  });
});
