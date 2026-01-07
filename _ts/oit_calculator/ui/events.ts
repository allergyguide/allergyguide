/**
 * @module
 *
 * Centralized event delegation and handling
 * Biggun
 * Mainly for mutation of big global protocol states and the main components
 * Other more specialized UI event delegation and handling are done in other modules like ui/searchUI.ts, modals.ts 
 */
import Decimal from "decimal.js";
import { protocolState } from "../state/instances";
import {
  updateFoodDetails,
  recalculateStepMethods,
  updateFoodBAndRecalculate,
  updateFoodBThreshold,
  toggleFoodType,
  updateStepTargetMg,
  updateStepDailyAmount,
  updateStepMixFoodAmount,
  addStepAfter,
  removeStep,
  recalculateProtocol
} from "../core/protocol";
import {
  FoodType,
  FoodAStrategy,
  DosingStrategy
} from "../types";
import type { Protocol } from "../types";

import { clearFoodB } from "./actions";
import { renderDebugResult } from "./renderers";

// Debounce timers
let inputDebounceTimer: number | null = null;
let noteDebounceTimer: number | null = null;
let foodADebounceTimer: number | null = null;
let foodBDebounceTimer: number | null = null;

let isInitialized = false;

/**
 * Initialize global event listeners using delegation
 * Call this ONLY ONCE at startup (is ensured by boolean flag)
 */
export function initGlobalEvents(): void {
  if (isInitialized) {
    console.warn("Global events already initialized. Skipping.");
    return;
  }

  attachSettingsDelegation();
  attachTableDelegation();
  attachDosingStrategyDelegation();
  attachCustomNoteDelegation();
  attachUndoRedoDelegation();
  attachDebugDelegation();

  // Misc global listeners
  const clearFoodBBtn = document.getElementById("clear-food-b") as HTMLButtonElement;
  if (clearFoodBBtn) {
    clearFoodBBtn.addEventListener("click", clearFoodB);
  }

  isInitialized = true;
}

/**
 * Attaches event listeners for Undo and Redo operations
 * Wires up the UI buttons (#btn-undo, #btn-redo) to the global protocol state
 * Excludes the Custom Note textarea from these shortcuts to preserve native browser text editing behavior
 */
function attachUndoRedoDelegation() {
  const undoBtn = document.getElementById("btn-undo");
  const redoBtn = document.getElementById("btn-redo");

  // button wiring
  if (undoBtn) undoBtn.addEventListener("click", () => protocolState.undo());
  if (redoBtn) redoBtn.addEventListener("click", () => protocolState.redo());

  // keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Allow native undo/redo for the Custom Note textarea
    if ((e.target as HTMLElement).tagName === 'TEXTAREA') return;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      e.shiftKey ? protocolState.redo() : protocolState.undo();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      protocolState.redo();
    }
  });
}

/**
 * Attaches event listeners for the Custom Note section
 */
function attachCustomNoteDelegation() {
  const bottomSection = document.querySelector(".bottom-section");
  if (bottomSection) {
    bottomSection.addEventListener("input", (e) => {
      const target = e.target as HTMLTextAreaElement;
      if (target.id === "custom-note") {
        if (noteDebounceTimer !== null) {
          clearTimeout(noteDebounceTimer);
        }

        noteDebounceTimer = window.setTimeout(() => {
          const rawValue = target.value;
          protocolState.setCustomNote(rawValue, { skipRender: true });
        }, 300);
      }
    });
  }
}

/**
 * Attaches event delegation logic for Food A and Food B settings panels
 * Handles three types of interactions:
 * 1. `input`: For text fields like Food Name (debounced)
 * 2. `change`: For numeric inputs (Protein, Serving Size, Thresholds). Updates trigger immediate protocol recalculations 
 * 3. `click`: For toggle buttons (Solid/Liquid form, Dilution Strategies)
 *
 * Parses and validates numeric inputs before updating the state
 */
function attachSettingsDelegation() {
  // Food A Settings Delegation
  const foodAContainer = document.querySelector(".food-a-container");
  if (foodAContainer) {
    foodAContainer.addEventListener("input", (e) => {
      const target = e.target as HTMLElement;

      if (target.id === "food-a-name") {
        // debounce
        if (foodADebounceTimer) clearTimeout(foodADebounceTimer);
        foodADebounceTimer = window.setTimeout(() => {
          const current = protocolState.getProtocol();
          if (current) {
            const val = (target as HTMLInputElement).value;
            const updated = updateFoodDetails(current, 'A', {
              name: (target as HTMLInputElement).value
            });
            protocolState.setProtocol(updated, `Renamed Food A`);
          }
        }, 400);
      }
    });

    foodAContainer.addEventListener("change", (e) => {
      const target = e.target as HTMLElement;
      const current = protocolState.getProtocol();
      if (!current) return;

      if (target.id === "food-a-serving-size") {
        let value = parseFloat((target as HTMLInputElement).value);
        // validation of input
        // also have to clamp so serving size cannot be less than the protein amount
        if (value < current.foodA.gramsInServing.toNumber()) value = current.foodA.gramsInServing.toNumber();
        if (value <= 0) value = 1;
        if (value > 1000) value = 1000;
        if (Number.isNaN(value)) value = 1;
        const updated = updateFoodDetails(current, 'A', {
          servingSize: new Decimal(value),
        });
        protocolState.setProtocol(recalculateStepMethods(updated), `Food A Serving Size changed to: ${value}`);
      } else if (target.id === "food-a-protein") {
        let value = parseFloat((target as HTMLInputElement).value);

        // Food A protein input clamping
        if (value < 0) value = 0;
        if (value > current.foodA.servingSize.toNumber()) value = current.foodA.servingSize.toNumber();
        if (Number.isNaN(value)) value = 0;
        const updated = updateFoodDetails(current, 'A', {
          gramsInServing: new Decimal(value)
        });
        protocolState.setProtocol(recalculateStepMethods(updated), `Food A Protein changed to: ${value}`);
      } else if (target.id === "food-a-threshold") {
        const val = (target as HTMLInputElement).value;

        // Food A threshold value clamping
        let value = parseFloat(val);
        if (value < 0) value = 0;
        if (Number.isNaN(value)) value = 0;
        const updated: Protocol = {
          ...current,
          diThreshold: new Decimal(value)
        }
        protocolState.setProtocol(recalculateStepMethods(updated), `Food A DI Threshold changed to: ${value}`);
      }
    });

    foodAContainer.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const action = target.getAttribute("data-action");
      const current = protocolState.getProtocol();
      if (!current || !action) return;

      switch (action) {
        case "toggle-food-a-solid":
          if (current.foodA.type !== FoodType.SOLID) {
            protocolState.setProtocol(toggleFoodType(current, false), "Set Food A to Solid");
          }
          break;
        case "toggle-food-a-liquid":
          if (current.foodA.type !== FoodType.LIQUID) {
            protocolState.setProtocol(toggleFoodType(current, false), "Set Food A to Liquid");
          }
          break;
        case "food-a-strategy-initial":
          protocolState.setProtocol(
            recalculateStepMethods({ ...current, foodAStrategy: FoodAStrategy.DILUTE_INITIAL }),
            "Set Food A Strategy: Dilute Initial"
          );
          break;
        case "food-a-strategy-all":
          protocolState.setProtocol(
            recalculateStepMethods({ ...current, foodAStrategy: FoodAStrategy.DILUTE_ALL }),
            "Set Food A Strategy: Dilute All"
          );
          break;
        case "food-a-strategy-none":
          protocolState.setProtocol(
            recalculateStepMethods({ ...current, foodAStrategy: FoodAStrategy.DILUTE_NONE }),
            "Set Food A Strategy: Dilute None"
          );
          break;
      }
    });
  }

  // Food B Settings Delegation
  const foodBContainer = document.querySelector(".food-b-container");
  if (foodBContainer) {
    foodBContainer.addEventListener("input", (e) => {
      const target = e.target as HTMLElement;
      if (target.id === "food-b-name") {
        // debounce
        if (foodBDebounceTimer) clearTimeout(foodBDebounceTimer);
        foodBDebounceTimer = window.setTimeout(() => {
          const current = protocolState.getProtocol();
          if (current && current.foodB) {
            const val = (target as HTMLInputElement).value;
            const updated = updateFoodDetails(current, "B", {
              name: (target as HTMLInputElement).value
            });
            protocolState.setProtocol(updated, `Renamed Food B`);
          }
        }, 400);
      }
    });

    foodBContainer.addEventListener("change", (e) => {
      const target = e.target as HTMLElement;
      const current = protocolState.getProtocol();
      if (!current || !current.foodB) return;

      if (target.id === "food-b-serving-size") {
        let value = parseFloat((target as HTMLInputElement).value);
        if (value < current.foodB.gramsInServing.toNumber()) value = current.foodB.gramsInServing.toNumber();
        if (value <= 0) value = 1;
        if (value > 1000) value = 1000;
        if (Number.isNaN(value)) value = 1;
        const updated = updateFoodBAndRecalculate(current, {
          servingSize: new Decimal(value)
        });
        protocolState.setProtocol(updated, `Food B Serving Size changed to: ${value}`);
      } else if (target.id === "food-b-protein") {
        let value = parseFloat((target as HTMLInputElement).value);
        if (value < 0) value = 0;
        if (value > current.foodB.servingSize.toNumber()) value = current.foodB.servingSize.toNumber();
        if (Number.isNaN(value)) value = 0;
        const updated = updateFoodBAndRecalculate(current, {
          gramsInServing: new Decimal(value)
        });
        protocolState.setProtocol(updated, `Food B Protein changed to: ${value}`);
      } else if (target.id === "food-b-threshold") {
        let value = parseFloat((target as HTMLInputElement).value);

        // Food B threshold input clamp
        if (value < 0) value = 0;
        if (Number.isNaN(value)) value = 0;
        const updated = updateFoodBThreshold(current, new Decimal(value));
        protocolState.setProtocol(updated, `Food B Threshold changed to: ${value}`);
      }
    });

    foodBContainer.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const action = target.getAttribute("data-action");
      const current = protocolState.getProtocol();
      if (!current || !action) return;

      switch (action) {
        case "toggle-food-b-solid":
          if (current.foodB && current.foodB.type !== FoodType.SOLID) {
            protocolState.setProtocol(toggleFoodType(current, true), "Set Food B to Solid");
          }
          break;
        case "toggle-food-b-liquid":
          if (current.foodB && current.foodB.type !== FoodType.LIQUID) {
            protocolState.setProtocol(toggleFoodType(current, true), "Set Food B to Liquid");
          }
          break;
      }
    });
  }
}

/**
 * Attaches click delegation for the Dosing Strategy selection buttons
 */
function attachDosingStrategyDelegation() {
  const container = document.querySelector(".dosing-strategy-container");
  if (container) {
    container.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const strategy = target.getAttribute("data-strategy") as DosingStrategy;
      const current = protocolState.getProtocol();
      if (current && strategy && strategy !== current.dosingStrategy) {
        const updated = recalculateProtocol({ ...current, dosingStrategy: strategy });

        protocolState.setProtocol(updated, `Dosing Strategy changed to: ${strategy}`);
      }
    });
  }
}

/**
 * Attaches event delegation for the main Protocol Output Table
 * Handles:
 * - Row Actions: Clicks on "Add Step" (+) and "Remove Step" (-) buttons
 * - Data Editing: Input events on editable cells (Target Mg, Daily Amount, Mix Food Amount)
 * - Uses a 300ms debounce timer for smoother typing
 * - Clamps negative values to 0
 * - UX: Handles 'Enter' keypresses to blur inputs
 */
function attachTableDelegation() {
  const tableContainer = document.querySelector(".output-container table");
  if (!tableContainer) return;

  // Click delegation for Add/Remove buttons
  tableContainer.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const current = protocolState.getProtocol();
    if (!current) return;

    if (target.classList.contains("btn-add-step")) {
      const stepIndex = parseInt(target.getAttribute("data-step")!);
      const updated = addStepAfter(current, stepIndex);
      protocolState.setProtocol(updated, `Added Step after ${stepIndex}`);
    } else if (target.classList.contains("btn-remove-step")) {
      const stepIndex = parseInt(target.getAttribute("data-step")!);
      const updated = removeStep(current, stepIndex);
      protocolState.setProtocol(updated, `Removed Step ${stepIndex}`);
    }
  });

  // Input delegation with debounce
  tableContainer.addEventListener("input", (e) => {
    const target = e.target as HTMLInputElement;
    if (!target.classList.contains("editable")) return;

    if (inputDebounceTimer !== null) {
      clearTimeout(inputDebounceTimer);
    }

    inputDebounceTimer = window.setTimeout(() => {
      const stepIndex = parseInt(target.getAttribute("data-step")!);
      const field = target.getAttribute("data-field")!;
      let value = parseFloat(target.value);

      // for ALL table inputs, disallow negatives
      // treat as 0
      if (isNaN(value)) value = 0;
      if (value < 0) value = 0; // clamping logic

      // get current state of protocol
      const current = protocolState.getProtocol();
      if (!current) return;

      let updated: Protocol = { ...current };
      let label = "";

      if (field === "targetMg") {
        const oldTargetMg = current.steps[stepIndex - 1].targetMg.toNumber();
        updated = updateStepTargetMg(current, stepIndex, value);
        label = `Step ${stepIndex} Target: ${oldTargetMg} -> ${value} mg`;
      } else if (field === "dailyAmount") {
        const oldDailyAmount = current.steps[stepIndex - 1].dailyAmount.toNumber();
        updated = updateStepDailyAmount(current, stepIndex, value);
        label = `Step ${stepIndex} Daily Amount: ${oldDailyAmount} -> ${value}`;
      } else if (field === "mixFoodAmount") {
        const oldMixFoodAmount = current.steps[stepIndex - 1].mixFoodAmount?.toNumber();
        updated = updateStepMixFoodAmount(current, stepIndex, value);
        label = oldMixFoodAmount ? `Step ${stepIndex} Mix Amount: ${oldMixFoodAmount} -> ${value}` : `Step ${stepIndex} Mix Amount: ${value}`;
      }

      protocolState.setProtocol(updated, label);
    }, 300); // 300ms debounce
  });

  tableContainer.addEventListener("keydown", (e) => {
    if ((e as KeyboardEvent).key === "Enter") {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT') {
        target.blur();
      }
    }
  });
}

function attachDebugDelegation() {
  const debugBtn = document.getElementById("debug-btn");
  const debugInput = document.getElementById("debug-input") as HTMLInputElement;

  if (debugBtn && debugInput) {
    debugBtn.addEventListener("click", async () => {
      const val = debugInput.value.trim();
      if (!val) {
        console.warn("No string provided");
        alert("Please paste a Base64 string first.");
        return;
      }
      try {
        // Dynamically import to ensure we get the fresh module and don't bloat init if not needed
        const { decodeUserHistoryPayload } = await import("../core/minify");

        console.group("DECODED PAYLOAD");
        console.log("b64 length:", val.length)
        console.log("Input:", val.substring(0, 20) + "...");

        const result = await decodeUserHistoryPayload(val);
        console.log("Result:", result);
        console.groupEnd();

        renderDebugResult(result);
      } catch (e) {
        console.error("Decode failed", e);
        alert("Decode failed. Check console for error details.");
      }
    });
  }
}
