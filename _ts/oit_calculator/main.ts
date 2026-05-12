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
import { workspace } from "./state/instances";
import type { Warning } from "./types";
import { validateProtocol } from "./core/validator";

// UI
import {
  showProtocolUI,
  renderDosingStrategy,
  renderProtocolTable,
  updateWarnings,
  updateFoodBDisabledState,
  updateUndoRedoButtons,
  renderTabs
} from "./ui/renderers";
import {
  renderFoodASettings,
  renderFoodBSettings
} from "./ui/components/FoodSettings";
import { initSearchEvents } from "./ui/searchUI";
import { attachClickwrapEventListeners, attachLoginModalListeners, attachSaveRequestListeners } from "./ui/modals";
import { initGlobalEvents } from "./ui/events";
import { initExportEvents, prefetchPdfLibraries, triggerPdfGeneration } from "./ui/exports";
import { handleUserLoad, loadPublicDatabases, loadUserConfiguration } from "./data/loader";
import { logout } from "./data/auth";
import { VALIDATION_DEBOUNCE_MS } from "./constants";

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

  // Start loads
  const publicDataPromise = loadPublicDatabases(); // for CNF foods basically
  const userDataPromise = loadUserConfiguration().catch(() => null);

  // Await Public Data (Required for AppState init)
  const publicData = await publicDataPromise;

  // Init AppState and Subscribers
  appState = new AppState(publicData, rulesUrl);

  // Cache for warnings to avoid flickering during debounced updates
  let cachedWarnings: Warning[] = [];
  let validationTimer: number | null = null;

  appState.subscribeToAuth((isLoggedIn) => {
    const loginBtn = document.getElementById("btn-login-trigger");
    const logoutBtn = document.getElementById("btn-logout-trigger");
    const badge = document.getElementById("user-badge");

    // Update workspace auth
    workspace.setAuth(isLoggedIn);

    if (isLoggedIn) {
      if (loginBtn) loginBtn.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'inline-block';
      if (badge) {
        badge.textContent = `${appState.username}`;
        badge.style.display = 'inline-block';
      }
    } else {
      // Public Mode
      if (loginBtn) loginBtn.style.display = 'inline-block';
      if (logoutBtn) logoutBtn.style.display = 'none';
      if (badge) badge.style.display = 'none';
    }

    // Force UI refresh if protocol exists
    const p = workspace.getActive().getProtocol();
    if (p) {
      cachedWarnings = validateProtocol(p);
      renderProtocolTable(p, workspace.getActive().getCustomNote(), isLoggedIn, cachedWarnings);
      updateWarnings(p, appState.warningsPageURL, cachedWarnings); // for sidebar
    }
  });

  // OPTIMISTIC UI
  // Check if we expect to be logged in based on local flag
  let optimisticLogin = false;
  try {
    const sessionRaw = localStorage.getItem('oit_session_active');
    if (sessionRaw) {
      const session = JSON.parse(sessionRaw);
      if (session.valid && session.expiresAt > Date.now()) {
        optimisticLogin = true;
        appState.setAuthState(true, session.username || "..."); // Show "User: Loading..." immediately
      } else {
        localStorage.removeItem('oit_session_active');
      }
    }
  } catch (e) {
    // Ignore corrupt localstorage
  }

  // Await User Data (The actual auth check + data load)
  const userData = await userDataPromise;

  // If successful auth in
  if (userData) {
    console.log("Session restored: Loading provisioned assets.");
    appState.addProvisionedData(
      userData.provisioned_foods,
      userData.provisioned_protocols,
      userData.handouts
    );

    // Set Real Auth State (Triggers listeners again with real name)
    appState.setAuthState(true, userData.username);

    // remove sync loading indicator from the optimistic UI
    const badge = document.getElementById('user-badge');
    if (badge) badge.classList.remove('oit-data-syncing');
  } else {
    // If we optimistically showed login but the request failed (cookie expired, network err), revert to public
    if (optimisticLogin) {
      console.log("Session invalid or expired. Reverting to public mode.");
      appState.setAuthState(false, null);
      localStorage.removeItem('oit_session_active'); // Cleanup
    }
  }

  // Initialize global delegated events (settings, table, dosing, misc)
  initGlobalEvents();

  // Initialize search inputs
  initSearchEvents(appState);

  // Initialize export listeners
  initExportEvents();

  // Subscribe workspace to renderers
  // This listener fires whenever the ACTIVE protocol changes
  // OR when the active tab switches
  workspace.subscribe((protocol, note, context) => {

    // Mount food A and B settings. These functions handle a null protocol already
    const aMount = document.getElementById("food-a-settings-mount");
    const bMount = document.getElementById("food-b-settings-mount");
    if (aMount) renderFoodASettings(workspace, aMount);
    if (bMount) renderFoodBSettings(workspace, bMount);

    if (protocol) {
      showProtocolUI();
      renderDosingStrategy(protocol);
      updateFoodBDisabledState(protocol);

      const activeState = workspace.getActive();
      updateUndoRedoButtons(activeState.getCanUndo(), activeState.getCanRedo());

      // debouncer for validation engine
      if (validationTimer !== null) {
        window.clearTimeout(validationTimer);
      }

      if (context === 'input') {
        // DEBOUNCED PATH; if the user is editing a numerical field, ideally the validation engine doesn't run immediately but after a slight debounce after they stop typing. ,  
        renderProtocolTable(protocol, note, appState.isLoggedIn, cachedWarnings); // first tho, render immediately with cached warnings to keep math snappy but colors stable

        validationTimer = window.setTimeout(() => {
          cachedWarnings = validateProtocol(protocol);
          renderProtocolTable(protocol, note, appState.isLoggedIn, cachedWarnings);
          updateWarnings(protocol, appState.warningsPageURL, cachedWarnings);
          validationTimer = null;
        }, VALIDATION_DEBOUNCE_MS);

      } else {
        // INSTANT PATH (Structural, History, Load), no debounce needed
        cachedWarnings = validateProtocol(protocol);
        renderProtocolTable(protocol, note, appState.isLoggedIn, cachedWarnings);
        updateWarnings(protocol, appState.warningsPageURL, cachedWarnings);
      }

    } else {
      // NO ACTIVE PROTOCOL: clear timers, warnings[], etc. and then freshly re-render
      if (validationTimer !== null) {
        clearTimeout(validationTimer);
        validationTimer = null;
      }
      cachedWarnings = [];
      renderProtocolTable(null, "", appState.isLoggedIn, []);
      updateFoodBDisabledState(null);
      updateUndoRedoButtons(false, false);
      updateWarnings(null, appState.warningsPageURL, []);
    }
  });

  /**
   * Subscribe to Tab list changes to re-render the Tab Bar.
   */
  workspace.subscribeToTabs((tabs, activeId) => {
    renderTabs(tabs, activeId);
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

  // start loading some of the heavy libraries needed for export
  prefetchPdfLibraries()

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
