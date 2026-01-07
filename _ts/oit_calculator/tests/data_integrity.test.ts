import { describe, it, expect } from 'vitest';
import { FoodDataSchema, ProtocolDataSchema } from '../types';
import Decimal from 'decimal.js';

// Import static public JSONs
import cnfFoods from '../../../static/tool_assets/typed_foods.json';

describe('Static Data Integrity', () => {

  it('validates CNF foods (Structure & Physics)', () => {
    const cnfList = cnfFoods as unknown[];

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

  // secure assets testing
  it('validates all secure_assets/oit_calculator .jsons', async (ctx) => {

    const secureFiles = import.meta.glob(
      '../../../secure_assets/oit_calculator/*.json',
      { eager: true } // 'eager' loads the JSON content immediately
    );
    const filePaths = Object.keys(secureFiles);

    if (filePaths.length === 0) {
      console.warn("No secure assets found. Skipping integrity checks.");
      ctx.skip();
      return;
    }

    console.log(`Found ${filePaths.length} secure json files to try validating.`);

    let totalErrors = 0;

    // Iterate over every file found
    for (const path in secureFiles) {
      const module = secureFiles[path] as any;
      const data = module.default; // The actual JSON content

      // We don't know if a file is a Food list or a Protocol list just by name.
      // We can try to guess based on structure, or validation.

      if (Array.isArray(data)) {
        // Try validating as FOODS first
        const isFoodList = data.every(item => 'Food' in item && 'Mean protein in grams' in item);

        if (isFoodList) {
          totalErrors += validateFoodList(data, path);
        } else {
          // Assume it's a PROTOCOL list (or check specific fields)
          // You might check if 'table' or 'food_a' exists in the items
          totalErrors += validateProtocolList(data, path);
        }
      } else {
        // Example: me.json is an object, not an array. Skip
        console.log(`Skipping non-array file: ${path}`);
      }
    }

    expect(totalErrors, `Found ${totalErrors} integrity issues in secure assets`).toBe(0);
  });
});


function validateFoodList(list: any[], filePath: string): number {
  let errors = 0;
  const seenNames = new Set<string>();

  list.forEach((item, index) => {
    const result = FoodDataSchema.safeParse(item);
    if (!result.success) {
      console.error(`[${filePath}] Invalid Food at index ${index}:`, result.error);
      errors++;
      return;
    }

    const data = result.data;

    // Physics Check
    if (data['Mean protein in grams'] > data['Serving size']) {
      console.error(`[${filePath}] Impossible Food "${data.Food}": Protein > Serving`);
      errors++;
    }

    // Duplicates within file
    if (seenNames.has(data.Food)) {
      console.error(`[${filePath}] Duplicate Food: "${data.Food}"`);
      errors++;
    }
    seenNames.add(data.Food);
  });

  return errors;
}

function validateProtocolList(list: any[], filePath: string): number {
  let invalidCount = 0;
  const seenNames = new Set<string>();

  list.forEach((item: any, index) => {
    // Zod Structure Check
    const result = ProtocolDataSchema.safeParse(item);

    if (!result.success) {
      console.error(`Invalid Protocol structure at ${filePath}, index ${index}:`, result.error);
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

  return invalidCount;
}

