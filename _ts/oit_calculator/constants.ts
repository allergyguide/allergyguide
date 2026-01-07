/**
 * @module
 *
 * Constants and default configuration values
 */
import Decimal from "decimal.js";

import type {
  ProtocolConfig,
} from "./types"

// ============================================
// CONSTANTS / DEFAULTS
// ============================================

// Precision / resolution of scales/syringes
// Number of decimals to display
export const SOLID_RESOLUTION: number = 2;
export const LIQUID_RESOLUTION: number = 1;

export const DILUTION_WATER_STEP_RESOLUTION = new Decimal(0.5);  // it would be easier for a patient to measure 13.5ml than 13.4 ml, especially if the final calculated protein remains within 5%

// Dosing step target default options
export const DOSING_STRATEGIES: { [key: string]: Decimal[] } = {
  STANDARD: [1, 2.5, 5, 10, 20, 40, 80, 120, 160, 240, 300].map(
    (num) => new Decimal(num),
  ),
  SLOW: [
    0.5, 1, 1.5, 2.5, 5, 10, 20, 30, 40, 60, 80, 100, 120, 140, 160, 190, 220,
    260, 300,
  ].map((num) => new Decimal(num)),
};

export let DEFAULT_CONFIG: ProtocolConfig;
DEFAULT_CONFIG = {
  minMeasurableMass: new Decimal(0.2), // assume that scales for patients have resolution of 0.01g
  minMeasurableVolume: new Decimal(0.2), // assume that syringes used has resolution of 0.1ml
  minServingsForMix: new Decimal(3), // want mixture to last at least 3 days
  PROTEIN_TOLERANCE: new Decimal(0.05), // percent difference allowable
  DEFAULT_FOOD_A_DILUTION_THRESHOLD: new Decimal(0.2),
  DEFAULT_FOOD_B_THRESHOLD: new Decimal(0.2),
  MAX_SOLID_CONCENTRATION: new Decimal(0.05),
  MAX_MIX_WATER: new Decimal(500),
  MAX_DAILY_AMOUNT: new Decimal(250),
  SOLID_MIX_CANDIDATES: [
    0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 25, 30
  ].map((num) => new Decimal(num)),
  LIQUID_MIX_CANDIDATES: [
    0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 25, 30
  ].map((num) => new Decimal(num)),
  DAILY_AMOUNT_CANDIDATES: [
    0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20
  ].map((num) => new Decimal(num))
};

// For clickwrap token for export PDF
export const OIT_CLICKWRAP_ACCEPTED_KEY = "oit_clickwrap_accepted_v1";
export const CLICKWRAP_EXPIRY_DAYS = 7;

