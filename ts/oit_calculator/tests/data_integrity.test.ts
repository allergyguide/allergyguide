import { describe, it, expect } from 'vitest';
import { FoodDataSchema, ProtocolDataSchema } from '../types';
import Decimal from 'decimal.js';

// Import JSONs
import cnfFoods from '../../../static/tool_assets/typed_foods.json';
import customFoods from '../../../secure_assets/oit_calculator/custom_foods.json';
import protocols from '../../../secure_assets/oit_calculator/bcch_protocols.json';

const cnfList = cnfFoods as unknown[];
const customList = customFoods as unknown[];
const protocolList = protocols as unknown[];

describe('Static Data Integrity', () => {

  it('validates CNF foods (Structure & Physics)', () => {
    expect(Array.isArray(cnfList)).toBe(true);
    let invalidCount = 0;

    cnfList.forEach((item: any, index) => {
      const result = FoodDataSchema.safeParse(item);
      if (!result.success) {
        console.error(`Invalid CNF Food at index ${index}:`, result.error);
        invalidCount++;
        return;
      }

      // PHYSICS CHECK: Protein <= Serving Size
      if (result.data['Mean protein in grams'] > result.data['Serving size']) {
        console.error(`Impossible Food at index ${index} (${result.data.Food}): Protein > Serving Size`);
        invalidCount++;
      }

      // SANITY CHECK: Positive Protein (Warn only, don't fail test)
      // we handle 0 protein foods with a UI warning, so this isn't a hard data integrity failure
      if (result.data['Mean protein in grams'] <= 0) {
        console.warn(`[Quality Warning] Useless Food at index ${index} (${result.data.Food}): Protein <= 0`);
      }
    });
    expect(invalidCount, `Found ${invalidCount} invalid CNF foods`).toBe(0);
  });

  it('validates Custom foods (Structure, Physics, Uniqueness)', () => {
    expect(Array.isArray(customList)).toBe(true);
    let invalidCount = 0;
    const seenNames = new Set<string>();

    customList.forEach((item: any, index) => {
      // Zod Structure Check
      const result = FoodDataSchema.safeParse(item);

      if (!result.success) {
        console.error(`Invalid Custom Food structure at index ${index}:`, result.error);
        invalidCount++;
        return;
      }

      const data = result.data;

      // Uniqueness Check
      if (seenNames.has(data.Food)) {
        console.error(`Duplicate Custom Food found: "${data.Food}"`);
        invalidCount++;
      }
      seenNames.add(data.Food);

      // Physics Check
      if (data['Mean protein in grams'] > data['Serving size']) {
        console.error(`Impossible Custom Food "${data.Food}": Protein > Serving Size`);
        invalidCount++;
      }
    });

    expect(invalidCount, `Found ${invalidCount} issues in Custom foods`).toBe(0);
  });

  it('validates Protocols (Structure, Consistency, Physics, Sequence)', () => {
    expect(Array.isArray(protocolList)).toBe(true);
    let invalidCount = 0;
    const seenNames = new Set<string>();

    protocolList.forEach((item: any, index) => {
      // Zod Structure Check
      const result = ProtocolDataSchema.safeParse(item);

      if (!result.success) {
        console.error(`Invalid Protocol structure at index ${index}:`, result.error);
        invalidCount++;
        return;
      }

      const p = result.data;

      // Uniqueness Check
      if (seenNames.has(p.name)) {
        console.error(`Duplicate Protocol Name: "${p.name}"`);
        invalidCount++;
      }
      seenNames.add(p.name);

      // LOGICAL CONSISTENCY: Food B defined if used?
      const hasFoodBSteps = p.table.some(row => row.food === 'B');
      if (hasFoodBSteps && !p.food_b) {
        console.error(`Protocol "${p.name}" has Food B steps but no 'food_b' definition.`);
        invalidCount++;
      }

      // PHYSICS CHECK (Protocol Definitions)
      // Note: These fields are strings in ProtocolData, need conversion
      const foodAProtein = new Decimal(p.food_a.gramsInServing);
      const foodAServing = new Decimal(p.food_a.servingSize);

      if (foodAProtein.gt(foodAServing)) {
        console.error(`Protocol "${p.name}" Food A: Protein > Serving Size`);
        invalidCount++;
      }

      if (p.food_b) {
        const foodBProtein = new Decimal(p.food_b.gramsInServing);
        const foodBServing = new Decimal(p.food_b.servingSize);
        if (foodBProtein.gt(foodBServing)) {
          console.error(`Protocol "${p.name}" Food B: Protein > Serving Size`);
          invalidCount++;
        }
      }

      // SEQUENCE CHECK (Ascending Order)
      // Check that protein targets generally go up
      let prevTarget = new Decimal(0);
      p.table.forEach((row, rowIndex) => {
        const currentTarget = new Decimal(row.protein);

        // Allow equal for transitions (A->B with same dose), otherwise strictly ascending
        // We use a small epsilon or just allow equality because sometimes protocols hover
        if (currentTarget.lt(prevTarget)) {
          console.error(`Protocol "${p.name}" Step ${rowIndex + 1}: Target ${currentTarget} is less than previous ${prevTarget}`);
          invalidCount++;
        }
        prevTarget = currentTarget;
      });
    });

    expect(invalidCount, `Found ${invalidCount} issues in Protocols`).toBe(0);
  });
});
