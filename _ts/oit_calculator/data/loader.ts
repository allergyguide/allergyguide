import { z } from "zod";
import {
  type FoodData,
  type ProtocolData,
  FoodDataSchema,
  ProtocolDataSchema,
  type UserConfig,
  UserConfigSchema,
} from "../types";
import { HttpError } from "../types";
import { SAMPLE_PROTOCOL } from "../utils"
import { loadSecureAsset } from "./api";
import { appState } from "../main";


// Return type for just the public load
export interface PublicData {
  foods: FoodData[];
  protocols: ProtocolData[];
}

// Return type for the secure load
export interface UserDataResult {
  user: string;
  customFoods: FoodData[];
  protocols: ProtocolData[];
  handouts: string[];
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
 * Orchestrates loading the user config and then the specific assets defined in it.
 * Call after auth signal
 */
export async function loadUserConfiguration(): Promise<UserDataResult> {
  try {
    // Fetch User Config
    const rawConfig = await loadSecureAsset('me.json', 'json');

    const meConfigResult = UserConfigSchema.safeParse(rawConfig);

    let meConfig: UserConfig;

    if (!meConfigResult.success) {
      throw new Error("OIT_NO_PERMISSION");
    } else {
      meConfig = meConfigResult.data;
    }

    const oitConfig = meConfig.tools.oit_calculator;

    // Fetch the specific data files defined in the config
    const [customFoodsResult, protocolsResult] = await Promise.all([
      loadSecureAsset(oitConfig.custom_foods, 'json'),
      loadSecureAsset(oitConfig.custom_protocols, 'json')
    ]);

    // Validate Data
    const customFoods = validateList<FoodData>(customFoodsResult, FoodDataSchema, "Custom Food");
    const protocols = validateList<ProtocolData>(protocolsResult, ProtocolDataSchema, "Protocol");

    return {
      user: meConfig.user,
      customFoods,
      protocols,
      handouts: oitConfig.handouts
    };
  } catch (error) {
    if (error instanceof HttpError) {
      throw error
    }
    if (error instanceof Error && error.message === "OIT_NO_PERMISSION") {
      throw new Error("User credentials valid, but account does not have permission to access extra resources. If you think this is a mistake, please contact us.");
    }
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
    // This throws if me.json is missing or lacks oit_calculator config
    const userData = await loadUserConfiguration();

    // update state (foods, protocols, and pdf order)
    appState.addSecureData(
      userData.customFoods,
      userData.protocols,
      userData.handouts
    );

    // update ui to show logged-in state
    const loginBtn = document.getElementById("btn-login-trigger");
    const logoutBtn = document.getElementById("btn-logout-trigger");
    const badge = document.getElementById("user-badge");

    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'inline-block'; // SHOW LOGOUT
    if (badge) {
      badge.textContent = `User: ${userData.user}`;
      badge.style.display = 'inline-block';
    }
    return true;
  } catch (e) {
    const loginBtn = document.getElementById("btn-login-trigger");
    const logoutBtn = document.getElementById("btn-logout-trigger");
    if (loginBtn) loginBtn.style.display = 'inline-block';
    if (logoutBtn) logoutBtn.style.display = 'none'; // HIDE LOGOUT

    if (e instanceof HttpError && e.status !== 401 && e.status !== 403) {
      console.warn("User load failed (Non-Auth Error):", e);
      return false
    } else {
      console.debug("No active session or failed to load user config:", e);
      return false;
    }
  }
}

