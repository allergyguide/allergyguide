/**
 * @module
 *
 * DOM Rendering logic
 */
import { DosingStrategy } from "../types";
import type { Protocol, Warning, ReadableHistoryPayload, Tab, ReadableWarning } from "../types";
import { escapeHtml } from "../utils";
import { workspace } from "../state/instances";
import { render } from "lit-html";
import { ProtocolTable } from "./components/ProtocolTable";
import { validateProtocol } from "../core/validator";

// Need global commit hash
declare const __COMMIT_HASH__: string;

// ============================================
// MODULE SPECIFIC INTERFACES
// ============================================

/**
 * Updates the disabled/enabled state of the Undo and Redo buttons.
 *
 * @param canUndo - Whether there is a state in history to revert to.
 * @param canRedo - Whether there is a state in the future stack to restore.
 */
export function updateUndoRedoButtons(canUndo: boolean, canRedo: boolean): void {
  const undoBtn = document.getElementById("btn-undo") as HTMLButtonElement;
  const redoBtn = document.getElementById("btn-redo") as HTMLButtonElement;

  if (undoBtn) undoBtn.disabled = !canUndo;
  if (redoBtn) redoBtn.disabled = !canRedo;
}

/**
 * Make dosing container and warnings container visible (after init of calc); also make +/- step controls visible
 *
 * @returns void
 */
export function showProtocolUI(): void {
  const dosingContainer = document.querySelector(
    ".dosing-strategy-container",
  ) as HTMLElement;
  const warningsContainer = document.querySelector(
    ".warnings-container",
  ) as HTMLElement;
  const stepBtnHintContainer = document.querySelector(
    ".step-controls-footer",
  ) as HTMLElement;

  if (dosingContainer) {
    dosingContainer.classList.remove("oit-hidden-on-init");
  }
  if (warningsContainer) {
    warningsContainer.classList.remove("oit-hidden-on-init");
  }
  if (stepBtnHintContainer) {
    stepBtnHintContainer.classList.remove("oit-hidden-on-init");
  }
}

/**
 * Updates the enabled/disabled state of the Food B settings section.
 * Food B selection is only permitted after a Food A has been selected.
 *
 * @param protocol - current protocol state
 */
export function updateFoodBDisabledState(protocol: Protocol | null): void {
  const foodBContainer = document.querySelector(
    ".food-b-container",
  ) as HTMLElement;
  if (!foodBContainer) return;

  const hasFoodA = protocol && protocol.foodA;

  if (hasFoodA) {
    foodBContainer.classList.remove("disabled");
    const searchInput = document.getElementById(
      "food-b-search",
    ) as HTMLInputElement;
    const clearBtn = document.getElementById(
      "clear-food-b",
    ) as HTMLButtonElement;
    if (searchInput) {
      searchInput.disabled = false;
    }
    if (clearBtn) {
      clearBtn.disabled = false;
    }
  } else {
    foodBContainer.classList.add("disabled");
    const searchInput = document.getElementById(
      "food-b-search",
    ) as HTMLInputElement;
    const clearBtn = document.getElementById(
      "clear-food-b",
    ) as HTMLButtonElement;
    if (searchInput) {
      searchInput.disabled = true;
      searchInput.value = "";
    }
    if (clearBtn) {
      clearBtn.disabled = true;
    }
  }
}

/**
 * Renders the Tab Bar with active state and status indicators.
 * Each tab represents an independent protocol workspace.
 *
 * @param tabs - Array of current tab metadata from WorkspaceManager
 * @param activeId - The ID of the currently active tab to highlight
 */
export function renderTabs(tabs: Tab[], activeId: string): void {
  const container = document.getElementById("oit-tabs-list");
  if (!container) return;

  let html = "";
  tabs.forEach(tab => {
    const isActive = tab.id === activeId;
    const activeClass = isActive ? "active" : "";

    // Determine Status Dot Color based on validation severity
    let statusClass = "";
    let statusTitle = "";
    const protocol = tab.state.getProtocol();
    if (protocol) {
      // Internal validation check for the status dot
      const warnings = validateProtocol(protocol);
      if (warnings.some((w: Warning) => w.severity === "red")) {
        statusClass = "status-red";
        statusTitle = "Critical Warnings";
      } else if (warnings.some((w: Warning) => w.severity === "yellow")) {
        statusClass = "status-yellow";
        statusTitle = "Cautionary Warnings";
      } else {
        statusClass = "status-green";
        statusTitle = "No Warnings";
      }
    }

    html += `
      <div class="oit-tab ${activeClass}" data-tab-id="${tab.id}">
        <span class="status-dot ${statusClass}" title="${statusTitle}"></span>
        <span class="tab-title">${escapeHtml(tab.title)}</span>
        <span class="oit-tab-close" data-tab-close="${tab.id}" title="Close Tab">×</span>
      </div>
    `;
  });

  // Always add the "+" button if under the tab limit
  if (tabs.length < 5) {
    html += `<div class="oit-tab-add" title="Add New Tab">+</div>`;
  }

  container.innerHTML = html;
}

/**
 * Resets all text and numeric input fields in the settings area.
 * Prevents stale data from leaking between tabs.
 */
function resetInputs() {
  const containers = document.querySelectorAll('.settings-container, .oit-toolbar');

  containers.forEach(container => {
    const inputs = container.querySelectorAll('input[type="text"], input[type="number"], input[type="search"], textarea');
    inputs.forEach(input => {
      (input as HTMLInputElement | HTMLTextAreaElement).value = "";
    });
  });
}

/**
 * Renders the "Empty State" UI when no protocol is loaded.
 * Toggles visibility of the instruction container and mount points.
 */
function renderEmptyState() {
  const emptyStateContainer = document.getElementById("empty-state-container");
  const protocolTableMount = document.getElementById("protocol-table-mount");

  const dosingContainer = document.querySelector(".dosing-strategy-container") as HTMLElement;
  const warningsContainer = document.querySelector(".warnings-container") as HTMLElement;
  const stepControls = document.querySelector(".step-controls-footer") as HTMLElement;
  const bottomSection = document.querySelector(".bottom-section") as HTMLElement;

  // Show Zola instructions, Hide Lit table mount
  if (emptyStateContainer) emptyStateContainer.style.display = "block";
  if (protocolTableMount) protocolTableMount.style.display = "none";

  // Hide protocol-specific UI sections
  if (dosingContainer) dosingContainer.classList.add("oit-hidden-on-init");
  if (warningsContainer) warningsContainer.classList.add("oit-hidden-on-init");
  if (stepControls) stepControls.classList.add("oit-hidden-on-init");
  if (bottomSection) bottomSection.classList.add("oit-hidden-on-init");

  // Reset Food A / B inputs to prevent leaking
  resetInputs();
}


/**
 * Renders the dosing strategy toggle buttons.
 *
 * @param protocol - The current protocol state.
 */
export function renderDosingStrategy(protocol: Protocol | null): void {
  if (!protocol) return;

  const container = document.querySelector(
    ".dosing-strategy-container",
  ) as HTMLElement;

  const html = `
    <h3>Dosing Strategy (resets all steps on change)</h3>
    <div class="setting-row">
      <div class="toggle-group">
        <button class="toggle-btn ${protocol.dosingStrategy === DosingStrategy.STANDARD ? "active" : ""}" data-strategy="STANDARD">Standard</button>
        <button class="toggle-btn ${protocol.dosingStrategy === DosingStrategy.SLOW ? "active" : ""}" data-strategy="SLOW">Slow</button>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

/**
 * Orchestrates the rendering of the interactive protocol table using lit-html.
 * Handles display toggling between the instructional empty state and the active table.
 *
 * @param protocol - The current protocol state.
 * @param customNote - The text content of the custom note.
 * @param isLoggedIn - Current authentication status.
 * @param warnings - Pre-calculated warnings array.
 */
export function renderProtocolTable(protocol: Protocol | null, customNote: string, isLoggedIn: boolean, warnings: Warning[]): void {
  const emptyStateContainer = document.getElementById("empty-state-container");
  const protocolTableMount = document.getElementById("protocol-table-mount");

  if (!protocol) {
    renderEmptyState();
    // Update Warnings to clear them
    const warningsContainer = document.querySelector(".warnings-container") as HTMLElement;
    if (warningsContainer) warningsContainer.innerHTML = "";
    return;
  }

  // Ensure UI is visible if protocol exists
  showProtocolUI();

  // Toggle visibility to show the reactive Lit-html table
  if (emptyStateContainer) emptyStateContainer.style.display = "none";
  if (protocolTableMount) protocolTableMount.style.display = "table";

  // Check for severe warnings for button disabling
  const hasSevereWarnings = warnings.some(w => w.severity === 'red');

  // Mount/Update the Lit-html component
  if (protocolTableMount) {
    render(ProtocolTable(protocol, warnings), protocolTableMount);
  }

  // Update Notes and Exports (Bottom Section)
  updateBottomSection(customNote, isLoggedIn, hasSevereWarnings);
}

/**
 * Updates the visibility and content of the bottom section (Notes and Exports).
 *
 * @param customNote - Current note text.
 * @param isLoggedIn - Whether restricted controls should be visible.
 * @param hasSevereWarnings - Whether export functionality should be restricted.
 */
export function updateBottomSection(customNote: string, isLoggedIn: boolean, hasSevereWarnings: boolean) {
  const bottomSection = document.querySelector(".bottom-section");
  if (!bottomSection) return;

  // Ensure the section is visible (handles the oit-hidden-on-init class removal)
  bottomSection.classList.remove("oit-hidden-on-init");

  const activeStates = workspace.getAllProtocolStates().filter(s => s.getProtocol());
  const isBatch = activeStates.length > 1;

  // Delegate to specific renderers
  updatePublicExports(customNote, isBatch);
  updateRestrictedControls(isLoggedIn, hasSevereWarnings);
}

/**
 * Updates text content and labels for public-facing export buttons.
 *
 * @param customNote - New note text to display.
 * @param isBatch - Whether multiple tabs are active.
 * Updates text content and labels for public-facing export buttons.
 */
function updatePublicExports(customNote: string, isBatch: boolean) {
  const textarea = document.getElementById("custom-note") as HTMLTextAreaElement;
  if (textarea && textarea.value !== customNote) {
    textarea.value = customNote;
  }

  const asciiBtn = document.getElementById("export-ascii");
  const pdfBtn = document.getElementById("export-pdf");

  if (asciiBtn) {
    asciiBtn.textContent = isBatch ? "Copy All (Clipboard)" : "Copy to Clipboard";
  }
  if (pdfBtn && pdfBtn.textContent !== "Generating...") {
    pdfBtn.textContent = isBatch ? "Export All (PDF)" : "Export PDF";
  }
}

/**
 * Updates the restricted "Request to Save Protocol" button based on auth and safety checks.
 *
 * @param isLoggedIn - Determines visibility of the wrapper.
 * @param hasSevereWarnings - Determines disabled state of the button.
 */
function updateRestrictedControls(isLoggedIn: boolean, hasSevereWarnings: boolean) {
  const wrapper = document.getElementById("save-request-wrapper");
  const btn = document.getElementById("btn-trigger-save-request") as HTMLButtonElement;

  if (!wrapper || !btn) return;

  if (!isLoggedIn) {
    wrapper.style.display = "none";
    return;
  }

  wrapper.style.display = "block";

  if (hasSevereWarnings) {
    btn.disabled = true;
    btn.textContent = "Fix Critical Warnings First";
    btn.title = "Protocol has red warnings";
    btn.classList.add("disabled-state");
  } else {
    btn.disabled = false;
    btn.textContent = "Request to Save Protocol";
    btn.title = "";
    btn.classList.remove("disabled-state");
  }
}

/**
 * Renders the warnings sidebar, grouping issues by step and severity.
 *
 * @param protocol - The current protocol state.
 * @param rulesURL - Link to the detailed validation rules documentation.
 * @param warnings - Pre-calculated warnings array.
 */
export function updateWarnings(protocol: Protocol | null, rulesURL: string, warnings: Warning[]): void {
  if (!protocol) return;

  const container = document.querySelector(
    ".warnings-container",
  ) as HTMLElement;

  if (warnings.length === 0) {
    container.innerHTML = `
      <div class="no-warnings">
      Protocol passes internal checks: see <a href="${rulesURL}" target="_blank">here</a> for the issues we check for.<br><br>THIS DOES NOT GUARANTEE THE PROTOCOL IS VALID.<br>DOSES MUST STILL BE VERIFIED/REVIEWED.
      </div>
    `;
    return;
  }

  const redCount = warnings.filter(w => w.severity === 'red').length;
  const yellowCount = warnings.filter(w => w.severity === 'yellow').length;

  // Grouping Warnings by scope: Global or Step-Specific
  const globalWarnings: Warning[] = [];
  const stepWarnings = new Map<number, Warning[]>();

  warnings.forEach(w => {
    if (w.stepIndex !== undefined && w.stepIndex !== null) {
      if (!stepWarnings.has(w.stepIndex)) {
        stepWarnings.set(w.stepIndex, []);
      }
      stepWarnings.get(w.stepIndex)!.push(w);
    } else {
      globalWarnings.push(w);
    }
  });

  const sortedSteps = Array.from(stepWarnings.keys()).sort((a, b) => a - b);
  let html = "";

  html += `<div class="warnings-summary-header">`;
  if (redCount > 0) {
    html += `<span class="summary-badge red"><strong>${redCount}</strong> Critical</span>`;
  }
  if (yellowCount > 0) {
    html += `<span class="summary-badge yellow"><strong>${yellowCount}</strong> Caution</span>`;
  }
  html += `</div>`;

  // Render Global Warnings (if any)
  if (globalWarnings.length > 0) {
    const isRed = globalWarnings.some(w => w.severity === 'red');
    html += renderWarningBlock("Protocol Issues", globalWarnings, isRed ? 'red' : 'yellow');
  }

  // Render Step Warnings (grouped by severity within)
  // Each step gets ONE block, containing all its warnings (red + yellow mixed)
  sortedSteps.forEach(index => {
    const list = stepWarnings.get(index)!;
    // Sort: Red warnings first, then yellow
    list.sort((a, b) => {
      if (a.severity === b.severity) return 0;
      return a.severity === 'red' ? -1 : 1;
    });

    const isRed = list.some(w => w.severity === 'red');
    html += renderWarningBlock(`Step ${index}`, list, isRed ? 'red' : 'yellow');
  });

  container.innerHTML = html;
}

/**
 * Helper to render a stylized block of warnings.
 *
 * @param title - Header text for the block.
 * @param warnings - List of warning objects.
 * @param blockSeverity - Overall severity determining visual style.
 * @returns HTML string.
 */
function renderWarningBlock(title: string, warnings: Warning[], blockSeverity: 'red' | 'yellow'): string {
  const cssClass = `warning-group severity-${blockSeverity}`;

  let html = `<div class="${cssClass}">`;
  html += `<div class="warning-header">${escapeHtml(title)}</div>`;
  html += `<ul class="warning-list">`;

  html += warnings.map(w => {
    // Remove redundant prefix if present ("Step X: ...")
    let msg = w.message;
    const prefix = `${title}: `;
    if (msg.startsWith(prefix)) {
      msg = msg.substring(prefix.length);
      if (msg.length > 0) msg = msg.charAt(0).toUpperCase() + msg.slice(1);
    } else if (msg.startsWith("Step ")) {
      // generic "Step N: " removal if title matched partially
      const parts = msg.split(": ");
      if (parts.length > 1 && parts[0].includes("Step")) {
        msg = parts.slice(1).join(": ");
        if (msg.length > 0) msg = msg.charAt(0).toUpperCase() + msg.slice(1);
      }
    }

    const itemClass = w.severity === 'red' ? 'item-red' : 'item-yellow';
    const content = w.severity === 'red' ? `<strong>${escapeHtml(msg)}</strong>` : escapeHtml(msg);

    return `<li class="${itemClass}">${content}</li>`;
  }).join("");

  html += `</ul></div>`;
  return html;
}

/**
 * Renders the decoded debug payload into the debug result container.
 *
 * @param payload - The decoded payload metadata.
 */
export function renderDebugResult(payload: ReadableHistoryPayload | null): void {
  if (!payload) return;
  const container = document.getElementById("debug-result-container");
  if (!container) return;

  const currentCommit = __COMMIT_HASH__;
  const payloadVersion = payload.version || "On dev mode, no version-commit hash yet";
  const isMismatch = !payloadVersion.includes(currentCommit);

  let warningHtml = "";
  if (isMismatch) {
    warningHtml = `
      <div class="version-mismatch-warning">
        <strong>VERSION MISMATCH</strong><br/>
        QR code was generated with a different version of the tool.<br/>
        <strong>Payload Version:</strong> ${escapeHtml(payloadVersion)}<br/>
        <strong>Current tool hash:</strong> ${currentCommit}<br/><br/>
        While the below is good enough for a snapshot, consider switching to the commit hash found in the payload version.
      </div>
    `;
  }

  const html = `
    <div class="debug-result-content">
      ${warningHtml}
      <p><strong>Version:</strong> ${escapeHtml(payload.version)}</p>
      <p><strong>Timestamp:</strong> ${escapeHtml(payload.timestamp)}</p>
      <details>
        <summary>History Log (${payload.historyLog.length} items)</summary>
        <ul class="history-log">
          ${payload.historyLog.map((item: string) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      </details>
      <details>
        <summary>Full Protocol JSON</summary>
        <pre class="json-log">${escapeHtml(JSON.stringify(payload.protocol, null, 2))}</pre>
      </details>
      ${payload.warnings && payload.warnings.length > 0
      ? `<details>
            <summary class="warning-summary">Warnings (${payload.warnings.length})</summary>
            <ul class="warnings-log">
              ${payload.warnings.map((w: ReadableWarning) => `<li>${escapeHtml(w.code)} (Step ${w.stepIndex ?? "N/A"})</li>`).join("")}
            </ul>
          </details>`
      : ""
    }
    </div>
  `;
  container.innerHTML = html;
}
