import fuzzysort from "fuzzysort";
import { z } from "zod";
import {
  type FoodData,
  type ProtocolData,
  FoodDataSchema,
  ProtocolDataSchema
} from "../types";

// Helper type: Takes any object T and adds the 'prepared' property from Fuzzysort
type PreparedItem<T> = T & { prepared: Fuzzysort.Prepared };

/**
 * Return type structure for the loaded application data.
 */
export interface LoadedData {
  foodsDatabase: FoodData[];
  protocolsDatabase: ProtocolData[];
  fuzzySortPreparedFoods: PreparedItem<FoodData>[];
  fuzzySortPreparedProtocols: PreparedItem<ProtocolData>[];
}

/**
 * Validates an array of raw data items against a Zod schema
 * If any raw data item is invalid it will be skipped and the user will be prominently alerted to this
 *
 * @template T - The TypeScript type inferred from the Zod schema
 * @param {unknown} list - The raw input data (expected to be an array of objects)
 * @param {z.ZodType<T>} schema - The Zod schema definition for a single item
 * @param {string} itemName - A label for the data type (e.g., "Protocol", "CNF Food") used in error logging
 * @returns {T[]} A strongly-typed array of validated items
 * @throws {Error} If the input is not an array 
 */
function validateList<T>(list: unknown, schema: z.ZodSchema<T>, itemName: string): T[] {
  if (!Array.isArray(list)) {
    console.error(`Expected array for ${itemName}, got`, list);
    if (typeof window !== "undefined" && window.alert) {
      window.alert(`Failed to load ${itemName}: Data is not an array.`);
    }
    throw Error(`Expected array for ${itemName}. Check console`)
  }

  const validItems: T[] = [];
  let invalidCount = 0;

  list.forEach((item, index) => {
    const result = schema.safeParse(item);
    if (result.success) {
      validItems.push(result.data);
    } else {
      invalidCount++;
      console.warn(`Skipping invalid ${itemName} at index ${index}:`, result.error);
    }
  });

  if (invalidCount > 0) {
    const msg = `Warning: Skipped ${invalidCount} malformed ${itemName}(s). Check console for details.`;
    console.warn(msg);
    if (typeof window !== "undefined" && window.alert) {
      window.alert(msg);
    }
  }

  return validItems;
}

/**
 * Load foods and protocol template databases and prepare fuzzy search indices.
 *
 * Fetches:
 * - /tool_assets/typed_foods.json 
 * - /tool_assets/custom_foods.json
 * - /tool_assets/oit_protocols.json
 *
 * On failure, logs the error and alerts the user that some features may not work.
 *
 * @returns Promise that resolves with loaded data
 * @throws Error if fetching/parsing fails
 */
export async function loadDatabases(): Promise<LoadedData> {
  try {
    // Load databases
    const [cnfFoodsResponse, customFoodsResponse, protocolsResponse] = await Promise.all([
      fetch("/tool_assets/typed_foods.json"),
      fetch("/tool_assets/custom_foods.json"),
      fetch("/tool_assets/oit_protocols.json")
    ]);

    // HTTP errors
    if (!cnfFoodsResponse.ok) throw new Error(`Failed to load CNF foods: ${cnfFoodsResponse.statusText}`);
    if (!customFoodsResponse.ok) throw new Error(`Failed to load custom foods: ${customFoodsResponse.statusText}`);
    if (!protocolsResponse.ok) throw new Error(`Failed to load protocols: ${protocolsResponse.statusText}`);

    // get raw JSON values
    const cnfFoodsRaw = await cnfFoodsResponse.json();
    const customFoodsRaw = await customFoodsResponse.json();
    const protocolsRaw = await protocolsResponse.json();

    // runtime validate .jsons with Zod. They should be lists of their specific structures (FoodData, ProtocolData)
    // any malformed entries are not included in the final database for the user and console.error logged
    const cnfFoodsDatabase = validateList<FoodData>(cnfFoodsRaw, FoodDataSchema, "CNF Food");
    const customFoodsDatabase = validateList<FoodData>(customFoodsRaw, FoodDataSchema, "Custom Food");
    const protocolsDatabase = validateList<ProtocolData>(protocolsRaw, ProtocolDataSchema, "Protocol");

    // merge custom and cnf
    const foodsDatabase = [...cnfFoodsDatabase, ...customFoodsDatabase];

    // Prepare for fuzzy search
    // make objects containing the raw data + the prepared search index
    const fuzzySortPreparedFoods = foodsDatabase.map((f: FoodData) => ({
      ...f,
      prepared: fuzzysort.prepare(f.Food),
    }));
    const fuzzySortPreparedProtocols = protocolsDatabase.map((p: ProtocolData) => ({
      ...p,
      prepared: fuzzysort.prepare(p.name),
    }));

    console.log(
      `Loaded ${foodsDatabase.length} foods and ${protocolsDatabase.length} protocols`,
    );

    return {
      foodsDatabase,
      protocolsDatabase,
      fuzzySortPreparedFoods,
      fuzzySortPreparedProtocols
    };
  } catch (error) {
    console.error("Error loading databases:", error);
    throw error;
  }
}
