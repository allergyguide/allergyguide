/**
 * @module OIT-Calculator
 * @author Joshua Yu
 * @license GPLv3
 *
 * Main entry point for OIT Calculator
 *
 */

// ============================================
// IMPORTS
// ============================================

import Decimal from "decimal.js";
import { AppState } from "./state/appState";
import { protocolState } from "./state/instances";

// UI 
import {
  showProtocolUI,
  renderFoodSettings,
  renderDosingStrategy,
  renderProtocolTable,
  updateWarnings,
  updateFoodBDisabledState,
  updateUndoRedoButtons
} from "./ui/renderers";
import { initSearchEvents } from "./ui/searchUI";
import { attachClickwrapEventListeners, attachLoginModalListeners } from "./ui/modals";
import { initGlobalEvents } from "./ui/events";
import { initExportEvents, triggerPdfGeneration } from "./ui/exports";
import { handleUserLoad, loadPublicDatabases } from "./data/loader";
import { logout } from "./data/auth";

// Configure Decimal.js
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// ============================================
// INITIALIZATION
// ============================================

export let appState: AppState;

/**
 * Initialize the OIT calculator after DOM is ready
 */
async function initializeCalculator(): Promise<void> {
  // Load public databases
  const publicData = await loadPublicDatabases();

  // Get URL for rules page
  const urlContainer = document.getElementById('url-container');
  const rulesUrl = urlContainer ? urlContainer.dataset.targetUrl! : "";

  // set up appState
  appState = new AppState(publicData, rulesUrl);

  // Auto-login on init attempt
  // will succeed if cookie exists
  await handleUserLoad();

  // Initialize global delegated events (settings, table, dosing, misc)
  initGlobalEvents();

  // Initialize search inputs
  initSearchEvents(appState);

  // Initialize export listeners
  initExportEvents();

  // Subscribe protocol state to renderers
  protocolState.subscribe((protocol, note) => {
    if (protocol) {
      showProtocolUI();
      renderFoodSettings(protocol); // renders settings blocks (uses patching)
      renderDosingStrategy(protocol); // renders strategy buttons
      renderProtocolTable(protocol, note); // renders table (uses patching)
      updateWarnings(protocol, appState.warningsPageURL);
      updateFoodBDisabledState(protocol);
      updateUndoRedoButtons(protocolState.getCanUndo(), protocolState.getCanRedo());
    }
  });

  // Set up clickwrap modal
  attachClickwrapEventListeners(triggerPdfGeneration);

  // setup login logic
  attachLoginModalListeners(handleUserLoad);

  // wire up logout logic:
  const logoutBtn = document.getElementById("btn-logout-trigger");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      const confirming = confirm("Are you sure you want to log out?");
      if (confirming) {
        await logout();
        // Reload the page to clear all memory/state
        window.location.reload();
      }
    });
  }

  // Check for debug mode
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('debug') === 'true') {
    const debugPanel = document.getElementById('oit-debug-panel');
    if (debugPanel) {
      debugPanel.style.display = 'block';
    }
  }

  console.log("OIT Calculator initialized");
}

const init = async () => {
  try {
    await initializeCalculator();
  } catch (e) {
    console.error("Critical init error", e);
    document.querySelector('.oit_calculator')!.innerHTML = `<div>Failed to load application data. Please refresh or contact support.</div>`;
  }
};

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
