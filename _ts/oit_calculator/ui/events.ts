/**
 * @module
 *
 * Centralized event delegation and handling
 * Mainly for mutation of big global protocol states and the main components
 * Other more specialized UI event delegation and handling are done in other modules like ui/searchUI.ts, modals.ts 
 * Slowly being chipped away to lit-html for high importance components
 */
import { workspace } from "../state/instances";
import {
  recalculateProtocol
} from "../core/protocol";
import {
  DosingStrategy
} from "../types";

import { clearFoodB } from "./actions";
import { renderDebugResult } from "./renderers";
import { resetSearch } from "./searchUI";
import { appState } from "../main";

// Debounce timers
let noteDebounceTimer: number | null = null;

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

  attachDosingStrategyDelegation();
  attachCustomNoteDelegation();
  attachUndoRedoDelegation();
  attachDebugDelegation();
  attachTabBarDelegation();

  // Misc global listeners
  const clearFoodBBtn = document.getElementById("clear-food-b") as HTMLButtonElement;
  if (clearFoodBBtn) {
    clearFoodBBtn.addEventListener("click", clearFoodB);
  }

  isInitialized = true;
}

/**
 * Attaches event listeners for Undo and Redo operations
 * Wires up the UI buttons (#btn-undo, #btn-redo) to the active protocol state
 * Excludes the Custom Note textarea from these shortcuts to preserve native browser text editing behavior
 */
function attachUndoRedoDelegation() {
  const undoBtn = document.getElementById("btn-undo");
  const redoBtn = document.getElementById("btn-redo");

  // button wiring to active workspace protocol
  if (undoBtn) undoBtn.addEventListener("click", () => workspace.getActive().undo());
  if (redoBtn) redoBtn.addEventListener("click", () => workspace.getActive().redo());

  // keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Allow native undo/redo for the Custom Note textarea
    if ((e.target as HTMLElement).tagName === 'TEXTAREA') return;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      e.shiftKey ? workspace.getActive().redo() : workspace.getActive().undo();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      workspace.getActive().redo();
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
          workspace.getActive().setCustomNote(rawValue, { skipRender: true });
        }, 300);
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
      const current = workspace.getActive().getProtocol();
      if (current && strategy && strategy !== current.dosingStrategy) {
        const updated = recalculateProtocol({ ...current, dosingStrategy: strategy });

        workspace.getActive().setProtocol(updated, `Dosing Strategy changed to: ${strategy}`);
      }
    });
  }
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

/**
 * Global event delegation for the Tab Bar.
 * Handles tab switching, closing, and adding new tabs.
 */
function attachTabBarDelegation() {
  const tabsBar = document.getElementById("oit-tabs-list");
  if (tabsBar) {
    tabsBar.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;

      // Tab Switch: User clicked on a tab
      const tabEl = target.closest(".oit-tab") as HTMLElement;
      if (tabEl && !target.classList.contains("oit-tab-close")) {
        const id = tabEl.dataset.tabId;
        if (id) {
          resetSearch(); // Cleanup UI before switch
          workspace.setActive(id);
        }
        return;
      }

      // Tab Close: User clicked the 'x' button
      if (target.classList.contains("oit-tab-close")) {
        const id = target.dataset.tabClose;
        if (id) workspace.closeTab(id);
        return;
      }

      // Tab Add: User clicked the '+' button
      if (target.classList.contains("oit-tab-add")) {
        if (!appState.isLoggedIn) {
          // Trigger login modal if public tries to add tab
          const loginBtn = document.getElementById("btn-login-trigger");
          if (loginBtn) loginBtn.click();
        } else {
          workspace.addTab();
          document.getElementById("food-a-search")?.focus();
        }
      }
    });
  }
}
