/**
 * @module
 * Orchestrates loading of public food databases and user-specific config and secure assets.
 */
import { z } from "zod";
import {
  type FoodData,
  type ProtocolData,
  FoodDataSchema,
  ProtocolDataSchema,
  type PublicData,
  type UserDataResult,
} from "../types";
import { HttpError } from "../types";
import { SAMPLE_PROTOCOL } from "../utils"
import { loadSecureAsset } from "./api";
import { appState } from "../main";


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

export async function loadPublicDatabases(): Promise<PublicData> {
  try {
    const response = await fetch("/tool_assets/typed_foods.json");
    if (!response.ok) throw new Error(`Failed to load CNF foods: ${response.statusText}`);

    const raw = await response.json();
    const foods = validateList<FoodData>(raw, FoodDataSchema, "CNF Food");

    return {
      foods,
      protocols: [SAMPLE_PROTOCOL] // the sample
    };
  } catch (error) {
    console.error("Error loading public database:", error);
    throw error;
  }
}

/**
 * Orchestrates loading the user configuration and consolidated assets via a bootstrap endpoint.
 * Call after auth signal.
 */
export async function loadUserConfiguration(): Promise<UserDataResult> {
  try {
    // Fetch everything in one go via the `oit_calculator-bootstrap`
    const bootstrapData = await loadSecureAsset('oit_calculator-bootstrap', 'json');

    // Basic structure check
    if (!bootstrapData || typeof bootstrapData !== 'object') {
      throw new Error("Invalid bootstrap data");
    }

    // Validate Data
    // fallback to [] if the call fails
    const customFoods = validateList<FoodData>(bootstrapData.customFoods || [], FoodDataSchema, "Custom Food");
    const protocols = validateList<ProtocolData>(bootstrapData.protocols || [], ProtocolDataSchema, "Protocol");

    return {
      username: bootstrapData.username || "Unknown",
      customFoods,
      protocols,
      handouts: bootstrapData.handouts || []
    };
  } catch (error) {
    if (error instanceof HttpError) {
      throw error
    }
    // Generic fallback for other errors
    console.error("Error loading user configuration:", error);
    throw error;
  }
}

/**
 * Shared logic to load user data and update the UI
 * Used on page load (if cookie exists) and after manual login
 */
export async function handleUserLoad(): Promise<boolean> {
  try {
    // load user config and assets
    // This throws if the bootstrap request fails or lacks oit_calculator config
    const userData = await loadUserConfiguration();

    // update state (foods, protocols, and pdf order)
    appState.addSecureData(
      userData.customFoods,
      userData.protocols,
      userData.handouts
    );

    appState.setAuthState(true, userData.username);

    return true;
  } catch (e) {
    appState.setAuthState(false, null);

    if (e instanceof HttpError && e.status !== 401 && e.status !== 403) {
      console.warn("User load failed (Non-Auth Error):", e);
      return false
    } else {
      console.debug("No active session or failed to load user config:", e);
      return false;
    }
  }
}

