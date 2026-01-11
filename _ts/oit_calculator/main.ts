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
import type { Protocol } from "./types";

// UI 
import {
  showProtocolUI,
  renderFoodSettings,
  renderDosingStrategy,
  renderProtocolTable,
  updateWarnings,
  updateFoodBDisabledState,
  updateUndoRedoButtons,
  renderTabs
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

  // Start Loads
  const publicDataPromise = loadPublicDatabases();
  const userDataPromise = loadUserConfiguration().catch(() => null);

  // Await Public Data (Required for AppState init)
  const publicData = await publicDataPromise;

  // Init AppState and Subscribers
  appState = new AppState(publicData, rulesUrl);

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

    // Force UI refresh if protocol exists (preparing for future secure features)
    const p = workspace.getActive().getProtocol();
    if (p) {
      renderProtocolTable(p, workspace.getActive().getCustomNote(), isLoggedIn);
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
        // removes old cookie that's expired...? redundant if we do this again below
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
    console.log("Session restored: Loading custom assets.");
    appState.addSecureData(
      userData.customFoods,
      userData.protocols,
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
  workspace.subscribe((protocol: Protocol | null, note: string) => {
    if (protocol) {
      showProtocolUI();
      renderFoodSettings(protocol); // renders settings blocks (uses patching)
      renderDosingStrategy(protocol); // renders strategy buttons
      renderProtocolTable(protocol, note, appState.isLoggedIn); // renders table (uses patching)
      updateWarnings(protocol, appState.warningsPageURL);
      updateFoodBDisabledState(protocol);

      const activeState = workspace.getActive();
      updateUndoRedoButtons(activeState.getCanUndo(), activeState.getCanRedo());
    } else {
      renderProtocolTable(null, "", appState.isLoggedIn);
      renderFoodSettings(null);
      updateFoodBDisabledState(null);
      updateUndoRedoButtons(false, false);
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
