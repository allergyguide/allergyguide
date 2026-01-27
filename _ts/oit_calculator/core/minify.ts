/**
 * @module
 * * Logic for minifying protocols and generating payloads for QR codes
 */
import type {
  Protocol,
  HistoryItem,
  MProtocol,
  MFood,
  MStep,
  Step,
  UserHistoryPayload,
  Food,
  ReadableHistoryPayload,
  ReadableProtocol,
  ReadableFood,
  ReadableStep,
  Warning,
  MWarning,
  ReadableWarning
} from "../types";
import {
  FoodType,
  Method,
  DosingStrategy,
  FoodAStrategy,
  UserHistoryPayloadSchema
} from "../types"
import { validateProtocol } from "./validator";

// Need global commit hash 
// And current tool version
declare const __COMMIT_HASH__: string;
declare const __VERSION_OIT_CALCULATOR__: string;

/**
 * QR PAYLOAD KEY MAPPING DOCUMENTATION
 * ====================================
 * To keep the QR code size small, we use single-letter keys for the JSON payload.
 * 
 * MProtocol (p):
 *  - ds: Dosing Strategy (0=STANDARD, 1=SLOW)
 *  - fas: Food A Strategy (0=INIT, 1=ALL, 2=NONE)
 *  - dt: Dilution Threshold (Food A)
 *  - fbt: Food B Threshold Amount (Optional)
 *  - fa: Food A Object (MFood)
 *  - fb: Food B Object (MFood, Optional)
 *  - s: Steps Array (MStep[])
 * 
 * MFood (fa, fb):
 *  - n: Name
 *  - t: Type (0=SOLID, 1=LIQUID, 2=CAPSULE)
 *  - p: Protein grams in serving
 *  - s: Serving Size
 * 
 * MStep (s):
 *  - i: Step Index
 *  - t: Target Protein (mg)
 *  - m: Method (0=DIRECT, 1=DILUTE, 2=CAPSULE)
 *  - d: Daily Amount
 *  - f: Food Source (0=Food A, 1=Food B)
 *  - mf: Mix Food Amount (Optional, Dilute only)
 *  - mw: Mix Water Amount (Optional, Dilute only)
 *  - sv: Servings (Optional, Dilute only)
 * 
 * MWarning (w):
 *  - c: Code string
 *  - i: Step Index (Optional)
 * 
 * Root:
 *  - v: Version-Hash string
 *  - ts: Timestamp
 *  - p: Protocol (MProtocol)
 *  - w: Warnings (MWarning[], Optional)
 *  - h: History Log (string[])
 */

// --- Minification Helpers ---

/**
 * Minifies an array of warning objects 
 *
 * @param warnings - The array of Warning objects to minify
 * @returns An array of minified warning objects (MWarning)
 */
function minifyWarnings(warnings: Warning[]): MWarning[] {
  return warnings.map(w => ({
    c: w.code,
    i: w.stepIndex
  }));
}

/**
 * Minifies a Food object
 *
 * @param f - The Food object to minify
 * @returns The minified food object (MFood)
 */
function minifyFood(f: Food): MFood {
  let t = 0;
  if (f.type === FoodType.LIQUID) t = 1;
  else if (f.type === FoodType.CAPSULE) t = 2;

  // f is type Food, but we access properties to convert Decimal
  return {
    n: f.name,
    t: t,
    p: f.gramsInServing.toNumber(),
    s: f.servingSize.toNumber()
  };
}

/**
 * Minifies a Step object
 *
 * @param s - The Step object to minify
 * @returns The minified step object (MStep)
 */
function minifyStep(s: Step): MStep {
  let m = 0;
  if (s.method === Method.DILUTE) m = 1;
  else if (s.method === Method.CAPSULE) m = 2;

  // s is Step
  const ms: MStep = {
    i: s.stepIndex,
    t: s.targetMg.toNumber(),
    m: m,
    d: s.dailyAmount.toNumber(),
    f: s.food === "A" ? 0 : 1
  };

  if (s.method === Method.DILUTE) {
    if (s.mixFoodAmount) ms.mf = s.mixFoodAmount.toNumber();
    if (s.mixWaterAmount) ms.mw = s.mixWaterAmount.toNumber();
    if (s.servings) ms.sv = s.servings.toNumber();
  }

  return ms;
}

/**
 * Converts a full Protocol object into a Minified Protocol (MProtocol)
 *
 * @param p - The full Protocol object
 * @returns The minified protocol object
 */
export function minifyProtocol(p: Protocol): MProtocol {
  const mp: MProtocol = {
    ds: p.dosingStrategy === DosingStrategy.STANDARD ? 0 : 1,
    fas: 0, // default, check for dilute all and none later
    dt: p.diThreshold.toNumber(),
    fa: minifyFood(p.foodA),
    s: p.steps.map(minifyStep)
  };

  // Map Food A Strategy
  if (p.foodAStrategy === FoodAStrategy.DILUTE_ALL) mp.fas = 1;
  else if (p.foodAStrategy === FoodAStrategy.DILUTE_NONE) mp.fas = 2;

  if (p.foodB) {
    mp.fb = minifyFood(p.foodB);
  }

  if (p.foodBThreshold) {
    mp.fbt = p.foodBThreshold.amount.toNumber();
  }

  return mp;
}

/**
 * Generates information for final QR Payload
 *
 * @param history - The array of history items
 * @returns A UserHistoryPayload object containing the version, timestamp, minified protocol, warnings, and history log, or null if history is empty
 */
export function generateUserHistoryPayload(history: HistoryItem[]): UserHistoryPayload | null {
  if (history.length === 0) return null;

  // Current state is the last item in history (ProtocolState.getHistory returns [...past, current])
  const currentItem = history[history.length - 1];

  // Calculate warnings for current protocol
  const warnings = validateProtocol(currentItem.protocol);
  const mWarnings = minifyWarnings(warnings);

  return {
    v: `${__VERSION_OIT_CALCULATOR__}-${__COMMIT_HASH__}`,
    ts: Date.now(),
    p: minifyProtocol(currentItem.protocol),
    w: mWarnings.length > 0 ? mWarnings : undefined,
    h: history.map(h => h.label) // Strip timestamps/objects, keep text log
  };
}

/**
 * Decodes a Base64 encoded QR string into a human-readable JSON object
 *
 * @param b64String - The Base64 string from the QR code
 * @returns A fully expanded JavaScript object with readable keys and Enums resolved, or null on failure
 */
export async function decodeUserHistoryPayload(b64String: string): Promise<ReadableHistoryPayload | null> {
  try {
    const { inflate } = await import('pako');

    // Decode Base64 to Binary String
    const binaryString = atob(b64String);

    // Convert Binary String to Uint8Array
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Decompress (Inflate)
    // Note: 'to: "string"' forces pako to return a string instead of a Uint8Array
    const jsonStr = inflate(bytes, { to: 'string' });

    // Parse JSON
    const rawObj = JSON.parse(jsonStr);

    // Validate Schema
    const result = UserHistoryPayloadSchema.safeParse(rawObj);

    if (!result.success) {
      console.error("Payload validation failed:", result.error);
      return null;
    }

    const minified = result.data;

    // Expand Minified Keys to Human Readable Names
    return expandPayload(minified);

  } catch (error) {
    console.error("Failed to decode payload:", error);
    return null;
  }
}

// --- Helper: Expansion Logic ---

/**
 * Expands minified warnings back to their readable format
 *
 * @param mw - The array of minified warnings
 * @returns An array of readable warning objects
 */
function expandWarnings(mw: MWarning[]): ReadableWarning[] {
  return mw.map(w => ({
    code: w.c,
    stepIndex: w.i
  }));
}

/**
 * Expands a minified payload object into a human-readable history payload
 *
 * @param m - The minified payload object (parsed from JSON)
 * @returns The readable history payload
 */
function expandPayload(m: UserHistoryPayload): ReadableHistoryPayload {
  const result: ReadableHistoryPayload = {
    version: m.v,
    timestamp: new Date(m.ts).toISOString(), // Convert epoch to Readable Date
    protocol: expandProtocol(m.p),
    historyLog: m.h
  };

  if (m.w && Array.isArray(m.w)) {
    result.warnings = expandWarnings(m.w);
  }

  return result;
}

/**
 * Expands a minified protocol object into a readable protocol object
 *
 * @param p - The minified protocol object
 * @returns The readable protocol object
 */
function expandProtocol(p: MProtocol): ReadableProtocol {
  return {
    dosingStrategy: p.ds === 0 ? "STANDARD" : "SLOW",
    foodAStrategy: mapFoodAStrategy(p.fas),
    diThreshold: p.dt,
    foodBThreshold: p.fbt, // undefined if not present
    foodA: expandFood(p.fa),
    foodB: p.fb ? expandFood(p.fb) : undefined,
    steps: p.s.map(expandStep),
  };
}

/**
 * Expands a minified food object into a readable food object
 *
 * @param f - The minified food object
 * @returns The readable food object
 */
function expandFood(f: MFood): ReadableFood {
  let type = "SOLID";
  if (f.t === 1) type = "LIQUID";
  else if (f.t === 2) type = "CAPSULE";

  return {
    name: f.n,
    type: type,
    gramsInServing: f.p,
    servingSize: f.s,
    proteinConcentrationMgPerUnit: (f.p * 1000) / f.s
  };
}

/**
 * Expands a minified step object into a readable step object
 *
 * @param s - The minified step object
 * @returns The readable step object
 */
function expandStep(s: MStep): ReadableStep {
  let method = "DIRECT";
  if (s.m === 1) method = "DILUTE";
  else if (s.m === 2) method = "CAPSULE";

  const step: ReadableStep = {
    stepIndex: s.i,
    targetMg: s.t,
    method: method,
    dailyAmount: s.d,
    foodSource: s.f === 0 ? "Food A" : "Food B"
  };

  // Add dilution specifics only if they exist
  if (method === "DILUTE") {
    step.mixFoodAmount = s.mf;
    step.mixWaterAmount = s.mw;
    step.servings = s.sv;
  }

  return step;
}

/**
 * Maps the minified Food A strategy integer to its corresponding string representation
 *
 * @param val - The integer value representing the strategy
 * @returns The string representation of the strategy (eg, "DILUTE_INITIAL")
 */
function mapFoodAStrategy(val: number): string {
  switch (val) {
    case 0: return "DILUTE_INITIAL";
    case 1: return "DILUTE_ALL";
    case 2: return "DILUTE_NONE";
    default: return "UNKNOWN";
  }
}
