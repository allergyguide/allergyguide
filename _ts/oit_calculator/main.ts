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
import { attachClickwrapEventListeners, attachLoginModalListeners, attachSaveRequestListeners } from "./ui/modals";
import { initGlobalEvents } from "./ui/events";
import { initExportEvents, triggerPdfGeneration } from "./ui/exports";
import { handleUserLoad, loadPublicDatabases, loadUserConfiguration } from "./data/loader";
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
  // Get URL for rules page
  const urlContainer = document.getElementById('url-container');
  const rulesUrl = urlContainer ? urlContainer.dataset.targetUrl! : "";

  // Parallel load public and user data (if user already signed in)
  const publicDataPromise = loadPublicDatabases();
  const userDataPromise = loadUserConfiguration().catch(() => null);
  const [publicData, userData] = await Promise.all([publicDataPromise, userDataPromise]);

  // set up appState
  appState = new AppState(publicData, rulesUrl);

  // Subscribe appState (Login Status) to UI Refresh
  appState.subscribeToAuth((isLoggedIn) => {
    const loginBtn = document.getElementById("btn-login-trigger");
    const logoutBtn = document.getElementById("btn-logout-trigger");
    const badge = document.getElementById("user-badge");

    if (isLoggedIn) {
      if (loginBtn) loginBtn.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'inline-block';
      if (badge) {
        badge.textContent = `User: ${appState.username}`;
        badge.style.display = 'inline-block';
      }
    } else {
      // Public Mode
      if (loginBtn) loginBtn.style.display = 'inline-block';
      if (logoutBtn) logoutBtn.style.display = 'none';
      if (badge) badge.style.display = 'none';
    }

    // Force UI refresh if protocol exists (preparing for future secure features)
    const p = protocolState.getProtocol();
    if (p) {
      renderProtocolTable(p, protocolState.getCustomNote(), isLoggedIn);
    }
  });

  // If successful auth in
  if (userData) {
    console.log("Session restored: Loading custom assets.");
    appState.addSecureData(
      userData.customFoods,
      userData.protocols,
      userData.handouts
    );

    // Set Auth State (Triggers listeners)
    appState.setAuthState(true, userData.user);
  }

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
      renderProtocolTable(protocol, note, appState.isLoggedIn); // renders table (uses patching)
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

  // wire up protocol save request modal
  attachSaveRequestListeners()

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
