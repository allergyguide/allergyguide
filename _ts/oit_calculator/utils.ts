/**
 * @module
 *
 * Collection of utility functions
 */
import Decimal from "decimal.js";

import {
  DosingStrategy,
  FoodAStrategy,
  FoodType,
  Method,
  WarningCode,
  type ProtocolData,
  type Unit,
  type Food,
  type Protocol,
  type RowData,
  type SpecificWarningCode
} from "./types"

import {
  SOLID_RESOLUTION,
  LIQUID_RESOLUTION,
} from "./constants"

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Derives the severity ("red" or "yellow") from a SpecificWarningCode.
 *
 * @param code The warning code to check.
 * @returns "red" if the code is a critical error, "yellow" otherwise.
 */
export function getWarningSeverity(code: SpecificWarningCode): "red" | "yellow" {
  // Check if the code exists in WarningCode.Red
  const isRed = Object.values(WarningCode.Red).includes(code as any);
  return isRed ? "red" : "yellow";
}

/**
 * Escape a string for safe HTML insertion.
 *
 * Escapes the five critical characters (&, <, >, ", ') to their HTML entities.
 * Use this before inserting any user-provided content into the DOM via innerHTML or template literals. Safe for repeated calls (idempotent).
 *
 * Side effects: none (pure)
 *
 * @param unsafe Untrusted string that may contain HTML/JS
 * @returns Escaped string safe to render as text content
 * @example
 * // => "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
 * escapeHtml('<script>alert("xss")</script>');
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Format a numeric value with fixed decimal places.
 *
 * Accepts native numbers or Decimal-like objects exposing toNumber().
 * Returns an empty string for null/undefined to simplify templating.
 *
 * @param value Number or Decimal to format
 * @param decimals Number of fractional digits to render
 * @returns Formatted string (or "" for nullish input)
 */
export function formatNumber(value: any, decimals: number): string {
  if (value === null || value === undefined) return "";
  const num = typeof value === "number" ? value : value.toNumber();
  return num.toFixed(decimals);
}

/**
 * Format a patient-measured amount based on its unit.
 *
 * @remarks
 * - For grams (g): fixed to SOLID_RESOLUTION decimals
 * - For milliliters (ml): integer when whole, otherwise LIQUID_RESOLUTION
 *
 * @param value Amount to format (g/ml)
 * @param unit Measuring unit: "g" or "ml"
 * @returns Formatted string, for example 0.1, or 0.12
 */
export function formatAmount(value: any, unit: Unit): string {
  if (value === null || value === undefined) return "";
  const num = typeof value === "number" ? value : value.toNumber();
  if (unit === "g") {
    return num.toFixed(SOLID_RESOLUTION);
  } else {
    // ml - integer or the LIQUID_RESOLUTION
    return num % 1 === 0 ? num.toFixed(0) : num.toFixed(LIQUID_RESOLUTION);
  }
}

/**
 * Get the measuring unit for a food by its form.
 *
 * @param food Food definition with type SOLID or LIQUID
 * @returns "g" for SOLID foods; "ml" for LIQUID foods
 */
export function getMeasuringUnit(food: Food): Unit {
  if (food.type === FoodType.LIQUID) {
    return "ml";
  } else {
    return "g";
  }
}

/**
 * Get the absolute percentage difference between a test value and a base reference value.
 * @param test - the value being evaluated.
 * @param base - the reference value used as the denominator
 * @returns Decimal obj representing the percentage difference (e.g., 0.1 = 10%)
 */
export function findPercentDifference(test: Decimal, base: Decimal): Decimal {
  return test
    .dividedBy(base)
    .minus(1)
    .abs();
}

/**
 * Serializes the runtime Protocol object + custom notes into the clean ProtocolData JSON schema suitable for export/email.
 */
export function serializeProtocol(protocol: Protocol, notes: string): ProtocolData {
  // Map steps to RowData
  const table: RowData[] = protocol.steps.map((step) => {
    const foodType = step.food === "A" ? protocol.foodA.type : protocol.foodB!.type;
    const measureUnit: Unit = foodType === FoodType.SOLID ? "g" : "ml";

    const base = {
      food: step.food,
      protein: step.targetMg.toString(), // ProtocolData expects strings
      daily_amount: formatAmount(step.dailyAmount, step.dailyAmountUnit),
    };

    if (step.method === Method.DIRECT) {
      return {
        ...base,
        method: "DIRECT",
      };
    } else {
      return {
        ...base,
        method: "DILUTE",
        mix_amount: formatAmount(step.mixFoodAmount!, measureUnit),
        water_amount: formatAmount(step.mixWaterAmount!, "ml"),
      };
    }
  });

  // Construct ProtocolData
  const data: ProtocolData = {
    name: "Custom Protocol Request", // Default name for the request
    dosing_strategy: protocol.dosingStrategy,
    food_a: {
      type: protocol.foodA.type,
      name: protocol.foodA.name,
      gramsInServing: protocol.foodA.gramsInServing.toString(),
      servingSize: protocol.foodA.servingSize.toString(),
    },
    food_a_strategy: protocol.foodAStrategy,
    di_threshold: protocol.diThreshold.toString(),
    table: table,
    custom_note: notes,
  };

  // Add Food B if present
  if (protocol.foodB) {
    data.food_b = {
      type: protocol.foodB.type,
      name: protocol.foodB.name,
      gramsInServing: protocol.foodB.gramsInServing.toString(),
      servingSize: protocol.foodB.servingSize.toString(),
    };
  }

  if (protocol.foodBThreshold) {
    // ProtocolDataSchema expects food_b_threshold as string (NumericString)
    data.food_b_threshold = protocol.foodBThreshold.amount.toString();
  }

  return data;
}


export const SAMPLE_PROTOCOL: ProtocolData = {
  name: "Almond milk to whole almonds",
  dosing_strategy: DosingStrategy.STANDARD,
  food_a: {
    type: FoodType.LIQUID,
    name: "Elmhurst Milked Almonds Unsweetened Beverage",
    gramsInServing: "5",
    servingSize: "250"
  },
  food_a_strategy: FoodAStrategy.DILUTE_INITIAL,
  di_threshold: "0.5",
  food_b: {
    type: FoodType.SOLID,
    name: "Almonds (dry roasted, unblanched)",
    gramsInServing: "21",
    servingSize: "100"
  },
  food_b_threshold: "0.4",
  table: [
    {
      food: "A",
      protein: "1",
      method: "DILUTE",
      daily_amount: "1",
      mix_amount: "1",
      water_amount: "19"
    },
    {
      food: "A",
      protein: "2.5",
      method: "DILUTE",
      daily_amount: "1",
      mix_amount: "1",
      water_amount: "7"
    },
    {
      food: "A",
      protein: "5",
      method: "DILUTE",
      daily_amount: "1",
      mix_amount: "1",
      water_amount: "3"
    },
    {
      food: "A",
      protein: "10",
      method: "DIRECT",
      daily_amount: "0.5"
    },
    {
      food: "A",
      protein: "20",
      method: "DIRECT",
      daily_amount: "1"
    },
    {
      food: "A",
      protein: "40",
      method: "DIRECT",
      daily_amount: "2"
    },
    {
      food: "A",
      protein: "80",
      method: "DIRECT",
      daily_amount: "4"
    },
    {
      food: "B",
      protein: "80",
      method: "DIRECT",
      daily_amount: "0.4"
    },
    {
      food: "B",
      protein: "120",
      method: "DIRECT",
      daily_amount: "0.6"
    },
    {
      food: "B",
      protein: "160",
      method: "DIRECT",
      daily_amount: "0.8"
    },
    {
      food: "B",
      protein: "240",
      method: "DIRECT",
      daily_amount: "1.1"
    },
    {
      food: "B",
      protein: "300",
      method: "DIRECT",
      daily_amount: "1.4"
    }
  ],
  custom_note: "This is an example of a pre-defined protocol."
}

