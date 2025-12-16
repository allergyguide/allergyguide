import { describe, it, expect, beforeEach } from 'vitest';
import Decimal from 'decimal.js';
import { protocolState } from '../../state/instances';
import { clearFoodB } from '../../ui/actions';
import { generateDefaultProtocol } from '../../core/calculator';
import { addFoodBToProtocol, updateStepTargetMg } from '../../core/protocol';
import { DEFAULT_CONFIG } from '../../constants';
import { FoodType, type Food } from '../../types';

// Helper to create food
const createFood = (name: string, type: FoodType = FoodType.SOLID): Food => ({
  name,
  type,
  gramsInServing: new Decimal(10),
  servingSize: new Decimal(100),
  getMgPerUnit() {
    return this.gramsInServing.times(1000).dividedBy(this.servingSize); // 100 mg/unit
  }
});

describe('UI Actions', () => {
  const foodA = createFood('Food A');
  const foodB = createFood('Food B');

  beforeEach(() => {
    // Reset state before each test
    protocolState.setProtocol(null, 'Reset');
  });

  describe('clearFoodB', () => {
    it('should remove Food B and preserve custom step targets', () => {
      // Setup Protocol with Food A
      let protocol = generateDefaultProtocol(foodA, DEFAULT_CONFIG);

      // Add Food B
      const threshold = { unit: 'g' as const, amount: new Decimal(1) };
      protocol = addFoodBToProtocol(protocol, foodB, threshold);

      // Modify a step to have a non-standard target (e.g. change step 1 from 1mg to 1.5mg)
      protocol = updateStepTargetMg(protocol, 1, 1.5);

      // Set state
      protocolState.setProtocol(protocol, 'Setup');

      // Verify setup
      let current = protocolState.getProtocol();
      expect(current?.foodB).toBeDefined();
      expect(current?.steps[0].targetMg.toNumber()).toBe(1.5);

      // Action: Clear Food B
      clearFoodB();

      // Assertions
      current = protocolState.getProtocol();

      // Food B should be gone
      expect(current?.foodB).toBeUndefined();
      expect(current?.foodBThreshold).toBeUndefined();

      // Step target should still be 1.5mg (preserved)
      // If it was reset to default, it would likely be 1.0mg or whatever the first standard step is
      expect(current?.steps[0].targetMg.toNumber()).toBe(1.5);
    });
  });
});
