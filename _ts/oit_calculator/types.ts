/**
 * @module
 *
 * Core data structures, enumerations, and type aliases
 */
import Decimal from "decimal.js";
import { z } from "zod";

// ============================================
// ENUMS
// ============================================

/**
 * Dosing plan presets for target protein steps.
 * STANDARD, SLOW, map to arrays in DOSING_STRATEGIES.
 */
export enum DosingStrategy {
  STANDARD = "STANDARD",
  SLOW = "SLOW",
}

/**
 * Physical form that determines measuring unit and mixing model.
 * SOLID uses grams; LIQUID uses milliliters.
 * CAPSULE is its own special category
 */
export enum FoodType {
  SOLID = "SOLID",
  LIQUID = "LIQUID",
  CAPSULE = "CAPSULE",
}

/**
 * How a step is administered:
 * DIRECT (neat food), DILUTE (prepared mixture), or CAPSULE (pre-weighed).
 */
export enum Method {
  DILUTE = "DILUTE",
  DIRECT = "DIRECT",
  CAPSULE = "CAPSULE",
}

/**
 * Policy for when Food A uses dilution across steps.
 * DILUTE_INITIAL (until neat ≥ threshold), DILUTE_ALL, or DILUTE_NONE.
 */
export enum FoodAStrategy {
  DILUTE_INITIAL = "DILUTE_INITIAL",
  DILUTE_ALL = "DILUTE_ALL",
  DILUTE_NONE = "DILUTE_NONE",
}

export const WarningCode = {
  Red: {
    TOO_FEW_STEPS: "TOO_FEW_STEPS",
    PROTEIN_MISMATCH: "PROTEIN_MISMATCH",
    INSUFFICIENT_MIX_PROTEIN: "INSUFFICIENT_MIX_PROTEIN",
    IMPOSSIBLE_VOLUME: "IMPOSSIBLE_VOLUME",
    INVALID_CONCENTRATION: "INVALID_CONCENTRATION",
    INVALID_TARGET: "INVALID_TARGET",
    INVALID_DILUTION_STEP_VALUES: "INVALID_DILUTION_STEP_VALUES",
  },
  Yellow: {
    LOW_SERVINGS: "LOW_SERVINGS",
    NON_ASCENDING_STEPS: "NON_ASCENDING_STEPS",
    BELOW_RESOLUTION: "BELOW_RESOLUTION",
    HIGH_SOLID_CONCENTRATION: "HIGH_SOLID_CONCENTRATION",
    NO_TRANSITION_POINT: "NO_TRANSITION_POINT",
    DUPLICATE_STEP: "DUPLICATE_STEP",
    HIGH_DAILY_AMOUNT: "HIGH_DAILY_AMOUNT",
    HIGH_MIX_WATER: "HIGH_MIX_WATER",
    RAPID_ESCALATION: "RAPID_ESCALATION",
  }
} as const;
// to use in Warning interface
export type SpecificWarningCode = typeof WarningCode.Red[keyof typeof WarningCode.Red] | typeof WarningCode.Yellow[keyof typeof WarningCode.Yellow];

// ============================================
// TYPE ALIASES
// ============================================

/**
 * Union type for numeric inputs that may come from UI strings, 
 * native numbers, or Decimal objects.
 */
export type NumberLike = string | number | Decimal;

/**
 * Measuring unit for patient-facing amounts.
 * "g" for solids; "ml" for liquids.
 */
export type Unit = "g" | "ml" | "capsule";

// ============================================
// INTERFACES
// ============================================

/**
 * Food definition with protein concentration used for calculations.
 * mgPerUnit is the canonical internal unit (mg protein per g or ml food).
 * But this can be derived from the grams of protein per serving size (X g or ml)
 */
export interface Food {
  name: string;
  type: FoodType;
  gramsInServing: Decimal;
  servingSize: Decimal;
  getMgPerUnit(): Decimal; // mg of protein per gram or ml of food. Canonical protein unit for calculations in the tool
}

/**
 * Single dosing step with target protein and administration details.
 * For DILUTE steps, mix * and servings describe the prepared mixture.
 */
export interface Step {
  stepIndex: number;
  targetMg: Decimal;
  method: Method;
  dailyAmount: Decimal;
  dailyAmountUnit: Unit;
  mixFoodAmount?: Decimal;
  mixWaterAmount?: Decimal;
  servings?: Decimal;
  food: "A" | "B";
}

/**
 * Limits and tolerances used to compute feasible dilution/direct steps. Values are Decimals and represent device resolution, tolerances, and ratios.
 */
export interface ProtocolConfig {
  minMeasurableMass: Decimal; // Minimal mass that is practically measurable by scale.
  minMeasurableVolume: Decimal; // Minimal mass that is practically measurable by syringe.
  minServingsForMix: Decimal; // Minimal servings for dilution mix (must be >= 1)
  PROTEIN_TOLERANCE: Decimal; // allowable percent deviation of calculated actual protein target and targetmg. ie. 0.05. Understanding that in real life there is limited resolution of measurement so the actual protein content may be slightly different from the target to an allowable degree
  DEFAULT_FOOD_A_DILUTION_THRESHOLD: Decimal; // At what amount of Food A do you switch to direct dosing?
  DEFAULT_FOOD_B_THRESHOLD: Decimal; // At what amount of Food B do you switch from Food A to Food B?
  MAX_SOLID_CONCENTRATION: Decimal; //  max g/ml ratio for solid diluted into liquids (default 0.05). Assume that if the solid concentration is above this threshold, then the solid contributes non-negligibly to the total volume of the mixture.
  MAX_MIX_WATER: Decimal;
  MAX_DAILY_AMOUNT: Decimal;
  // Default candidate options for various parameters used to calculate optimal dilutions
  SOLID_MIX_CANDIDATES: Decimal[];
  LIQUID_MIX_CANDIDATES: Decimal[];
  DAILY_AMOUNT_CANDIDATES: Decimal[];
}

/**
 * Complete protocol definition, including steps and global settings.
 * May include a Food B transition and its threshold.
 */
export interface Protocol {
  dosingStrategy: DosingStrategy;
  foodA: Food;
  foodAStrategy: FoodAStrategy;
  diThreshold: Decimal;
  foodB?: Food;
  foodBThreshold?: { unit: Unit; amount: Decimal };
  steps: Step[];
  config: ProtocolConfig;
}

/**
 * Validation result describing an issue with the protocol or a specific step.
 * severity is "red" (critical) or "yellow" (caution).
 */
export interface Warning {
  severity: "red" | "yellow";
  code: SpecificWarningCode;
  message: string;
  stepIndex?: number;
}

/**
 * Intermediate dilution candidate considered during planning.
 * Represents a particular mix recipe and its derived servings.
 */
export interface Candidate {
  mixFoodAmount: Decimal;
  mixWaterAmount: Decimal;
  dailyAmount: Decimal;
  mixTotalVolume: Decimal;
  servings: Decimal;
}


// ============================================
// JSON SCHEMAS / INTERFACES - expected structure of items in jsons loaded on init
// ============================================

// Helper to ensure strings are valid numbers
const NumericString = z.string().refine((val) => !isNaN(parseFloat(val)) && isFinite(Number(val)), {
  message: "Must be a valid number string",
});

/**
 * Food database record (as loaded from JSON containing with data from Canadian Nutrient File, Health Canada, 2015).
 * Raw values are UI-facing and will be converted to internal Decimal where needed later.
 */
export const FoodDataSchema = z.strictObject({
  Food: z.string(), // name
  "Mean protein in grams": z.number(), // not all will be the mean: this applies mainly to CNF data, not custom foods
  "Serving size": z.number(), // 100g for CNF but otherwise for custom foods will be variable
  Type: z.enum(FoodType),
});
export type FoodData = z.infer<typeof FoodDataSchema>;

const BaseRow = z.strictObject({
  food: z.enum(["A", "B"]),
  protein: NumericString,
});

const DirectRow = BaseRow.extend({
  method: z.literal("DIRECT"),
  daily_amount: NumericString,
});

const DiluteRow = BaseRow.extend({
  method: z.literal("DILUTE"),
  daily_amount: NumericString,
  mix_amount: NumericString, // Now required!
  water_amount: NumericString, // Now required!
});

const CapsuleRow = BaseRow.extend({
  method: z.literal("CAPSULE"),
});

export const RowDataSchema = z.discriminatedUnion("method", [DirectRow, DiluteRow, CapsuleRow]);
export type RowData = z.infer<typeof RowDataSchema>;

/**
 * Protocol template record (as loaded from JSON).
 * String fields representing numbers are parsed into Decimal during load.
 */
export const ProtocolDataSchema = z.strictObject({
  name: z.string(),
  dosing_strategy: z.enum(DosingStrategy),
  food_a: z.strictObject({
    type: z.enum(FoodType),
    name: z.string(),
    gramsInServing: NumericString,
    servingSize: NumericString,
  }),
  food_a_strategy: z.enum(FoodAStrategy),
  di_threshold: NumericString,
  food_b: z.strictObject({
    type: z.enum(FoodType),
    name: z.string(),
    gramsInServing: NumericString,
    servingSize: NumericString,
  }).optional(),
  food_b_threshold: NumericString.optional(),
  table: z.array(RowDataSchema),
  custom_note: z.string().optional(),
});
export type ProtocolData = z.infer<typeof ProtocolDataSchema>;

// ============================================
// HISTORY INTERFACES
// ============================================

/**
 * Rich history item for internal application state
 * Maintains full object fidelity and precise timestamps 
 */
export interface HistoryItem {
  protocol: Protocol;
  label: string;      // Human-readable action description
  timestamp: number;  // Unix timestamp 
}

// --- MINIFIED INTERFACES FOR QR PAYLOAD (ZOD SCHEMAS) ---

export const MFoodSchema = z.strictObject({
  n: z.string(), // name
  t: z.number().int(), // 0=SOLID, 1=LIQUID, 2=CAPSULE
  p: z.number(), // gramsInServing
  s: z.number(), // servingSize
});
export type MFood = z.infer<typeof MFoodSchema>;

export const MStepSchema = z.strictObject({
  i: z.number().int(), // stepIndex
  t: z.number(), // targetMg
  m: z.number().int(), // 0=DIRECT, 1=DILUTE, 2=CAPSULE
  d: z.number(), // dailyAmount
  mf: z.number().optional(), // mixFoodAmount
  mw: z.number().optional(), // mixWaterAmount
  sv: z.number().optional(), // servings
  f: z.number().int(), // 0=Food A, 1=Food B
});
export type MStep = z.infer<typeof MStepSchema>;

export const MWarningSchema = z.strictObject({
  c: z.string(), // code string
  i: z.number().int().optional(), // stepIndex
});
export type MWarning = z.infer<typeof MWarningSchema>;

export const MProtocolSchema = z.strictObject({
  ds: z.number().int(),   // DosingStrategy: 0=STANDARD, 1=SLOW
  fas: z.number().int(),  // FoodAStrategy: 0=INIT, 1=ALL, 2=NONE
  dt: z.number(),   // diThreshold
  fbt: z.number().optional(), // foodBThreshold amount
  fa: MFoodSchema,    // Food A
  fb: MFoodSchema.optional(),   // Food B
  s: z.array(MStepSchema),   // Steps
});
export type MProtocol = z.infer<typeof MProtocolSchema>;

export const UserHistoryPayloadSchema = z.strictObject({
  v: z.string(),      // semver-hash
  ts: z.number(),     // Generated At timestamp
  p: MProtocolSchema,   // Current Protocol State
  w: z.array(MWarningSchema).optional(), // Warnings
  h: z.array(z.string()),    // History of action labels only
});
export type UserHistoryPayload = z.infer<typeof UserHistoryPayloadSchema>;

/**
 * Result of a successful authentication attempt.
 */
export interface AuthLoginResult {
  /** Indicates if the authentication was successful. */
  valid: boolean;
  /** Unix timestamp (milliseconds) when the session expires. */
  expiresAt: number;
  username: string;
  /** JWT token needed to access data */
  dbToken: string;
}

// ============================================
// READABLE INTERFACES (For Decoded Payload)
// ============================================
// The purpose of these interfaces is when a userhistory payload (minified as per above) needs to be read by a human. These don't include the config as these are not changeable by the user and can simply be found by going to the relevant commit hash

/**
 * Human-readable Food definition decoded from a QR payload.
 */
export interface ReadableFood {
  name: string;
  type: string; // "SOLID" | "LIQUID" | "CAPSULE"
  gramsInServing: number;
  servingSize: number;
  proteinConcentrationMgPerUnit: number;
}

/**
 * Human-readable Step definition decoded from a QR payload.
 */
export interface ReadableStep {
  stepIndex: number;
  targetMg: number;
  method: string; // "DIRECT" | "DILUTE" | "CAPSULE"
  dailyAmount: number;
  foodSource: string; // "Food A" | "Food B"
  mixFoodAmount?: number;
  mixWaterAmount?: number;
  servings?: number;
}

/**
 * Human-readable Warning decoded from a QR payload.
 */
export interface ReadableWarning {
  code: string;
  stepIndex?: number;
}

/**
 * Human-readable Protocol structure decoded from a QR payload.
 */
export interface ReadableProtocol {
  dosingStrategy: string;
  foodAStrategy: string;
  diThreshold: number;
  foodBThreshold?: number;
  foodA: ReadableFood;
  foodB?: ReadableFood;
  steps: ReadableStep[];
}

/**
 * Fully expanded, human-readable history payload decoded from a QR code.
 */
export interface ReadableHistoryPayload {
  /** The tool version that generated this payload. */
  version: string;
  timestamp: string; // ISO String
  protocol: ReadableProtocol;
  warnings?: ReadableWarning[];
  historyLog: string[];
}

// ERRORS
export class HttpError extends Error {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'HttpError'; // Helpful for debugging

    // lets 'instanceof' works
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}

// ============================================
// WORKSPACE INTERFACES
// ============================================

/**
 * Metadata for a single OIT protocol tab.
 */
export interface Tab {
  /** Unique identifier for the tab workspace. */
  id: string;
  /** State container for the protocol and notes in this tab. */
  state: import("./state/protocolState").ProtocolState;
  /** Human-readable title, usually derived from the primary food. */
  title: string;
}

/**
* Callback signature for workspace tab list changes.
*/
export type TabListener = (tabs: Tab[], activeId: string) => void;

// ============================================
// API & LOADER INTERFACES
// ============================================

// Return type for public loads
export interface PublicData {
  foods: FoodData[];
  protocols: ProtocolData[];
}

// Return type for secure load
export interface UserDataResult {
  username: string;
  customFoods: FoodData[];
  protocols: ProtocolData[];
  handouts: string[];
}

export interface SaveRequestPayload {
  /** The full serialized protocol object including food settings and steps. */
  protocolData: ProtocolData;
  /** User-defined name for this protocol (e.g., "John Doe - Peanut Standard"). */
  protocolName: string;
  /** The email address where the user wants to receive the request receipt. */
  userEmail: string;
  /** Optional additional instructions or clinical context for the request. */
  context: string;
  /** A formatted ASCII representation of the protocol for administrative review. */
  ascii: string;
  /** A formatted representation of the warnings of the protocol. */
  warnings: string;
}

// ============================================
// EXPORT INTERFACES
// ============================================

/**
 * Data bundle for exporting a single protocol tab
 */
export interface ProtocolExportData {
  protocol: Protocol;
  customNote: string;
  history: HistoryItem[];
}

// ============================================
// STATE LISTENERS
// ============================================

export type AuthListener = (isLoggedIn: boolean) => void;

export type ProtocolListener = (protocol: Protocol | null, note: string) => void;


