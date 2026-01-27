/**
 * @module
 *
 * DOM Rendering logic
 */
import { Method, FoodType, DosingStrategy, FoodAStrategy } from "../types";
import type { Protocol, Warning, Unit, Food, Step, ReadableHistoryPayload, Tab, ReadableWarning } from "../types";
import { formatNumber, formatAmount, escapeHtml, getMeasuringUnit } from "../utils";
import { validateProtocol } from "../core/validator";
import { workspace } from "../state/instances";

// Need global commit hash 
declare const __COMMIT_HASH__: string;

// ============================================
// MODULE SPECIFIC INTERFACES
// ============================================
/**
 * Specification for a section header row (e.g., "Peanut", "CustomFood").
 */
interface HeaderRowSpec {
  type: 'header';
  text: string;
}
/**
 * Specification for a protocol step row.
 * Intended to contain pre-formatted values to facilitate easy diffing against the DOM
 */
interface StepRowSpec {
  type: 'step';
  step: Step;
  rowClass: string;
  food: Food;
  targetMgVal: string;
  mixFoodAmountVal: string;
  dailyAmountVal: string;
  mixUnit: Unit;
}
/**
 * Union type representing any expected row in the protocol table.
 */
export type RowSpec = HeaderRowSpec | StepRowSpec;

/**
 * Update undo redo button status states
 *
 * @returns void
 */
export function updateUndoRedoButtons(canUndo: boolean, canRedo: boolean): void {
  const undoBtn = document.getElementById("btn-undo") as HTMLButtonElement;
  const redoBtn = document.getElementById("btn-redo") as HTMLButtonElement;

  // Simple toggle button possible based on state
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
 * Updates enabled/disabled state of the Food B settings section based on Food A. user can only select food B once a Food A has been selected
 *
 * Toggles `.disabled` CSS class on the container
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
 * Renders the Tab Bar with active state and close buttons.
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

    // Determine Status Dot Color and Tooltip
    let statusClass = "";
    let statusTitle = "";
    const protocol = tab.state.getProtocol();
    if (protocol) {
      const warnings = validateProtocol(protocol);
      if (warnings.some(w => w.severity === "red")) {
        statusClass = "status-red";
        statusTitle = "Critical Warnings";
      } else if (warnings.some(w => w.severity === "yellow")) {
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

  // Always add the "+" button if tabs < 5 (Max limit handled in logic too, but good UX to hide/disable)
  if (tabs.length < 5) {
    html += `<div class="oit-tab-add" title="Add New Tab">+</div>`;
  }

  container.innerHTML = html;
}

/**
 * Resets all text and numeric input fields within the settings and toolbar areas.
 * This prevents "ghost data" from a previously active tab leaking into a new or empty tab.
 */
function resetInputs() {
  // Select all text-like inputs within the calculator settings
  const containers = document.querySelectorAll('.settings-container, .oit-toolbar');

  containers.forEach(container => {
    // select inputs and textareas 
    const inputs = container.querySelectorAll('input[type="text"], input[type="number"], input[type="search"], textarea');
    inputs.forEach(input => {
      (input as HTMLInputElement | HTMLTextAreaElement).value = "";
    });
  });
}

/**
 * Renders the "Empty State" UI when no protocol is loaded in the active tab.
 * Displays Quick Start instructions by cloning the `#empty-state-template`.
 * Also hides protocol-specific sections and clears all relevant inputs.
 * Fairly brittle to changes in HTML structure of shortcode 
 */
function renderEmptyState() {
  const tableContainer = document.querySelector(".output-container table") as HTMLElement;
  const template = document.getElementById("empty-state-template") as HTMLTemplateElement;
  const dosingContainer = document.querySelector(".dosing-strategy-container") as HTMLElement;
  const warningsContainer = document.querySelector(".warnings-container") as HTMLElement;
  const stepControls = document.querySelector(".step-controls-footer") as HTMLElement;
  const bottomSection = document.querySelector(".bottom-section") as HTMLElement;

  // Hide UI Sections
  if (dosingContainer) dosingContainer.classList.add("oit-hidden-on-init");
  if (warningsContainer) warningsContainer.classList.add("oit-hidden-on-init");
  if (stepControls) stepControls.classList.add("oit-hidden-on-init");
  if (bottomSection) bottomSection.classList.add("oit-hidden-on-init");

  // Reset Food A / B inputs to prevent leaking
  resetInputs();

  // Clear Table and Show Instructions
  if (tableContainer && template) {
    // clear cur table, clone template, inject it
    tableContainer.innerHTML = "";
    const clone = template.content.cloneNode(true);
    tableContainer.appendChild(clone);
  }
}

/**
 * Render Food A and Food B settings panels... name, protein, serving size, form toggle, 
 * Uses patching to preserve focus. No event listeners attached here
 *
 * @returns void
 */
/**
 * Renders or updates the settings panels for Food A and Food B: name, protein, serving size, form toggle, threshold if applicable
 *
 * Uses DOM patching strategy: checks if the settings markup already exists and updates the input values and toggle states in-place
 *
 * specific behaviors:
 * - Food A is always rendered; conditionally adds/removes the "Direct Dose Threshold"
 * - Food B renders only if `protocol.foodB` is defined
 *
 * @param protocol - current active protocol. If null, the function performs no action
*/
export function renderFoodSettings(protocol: Protocol | null): void {
  // HARD CODED SELECTOR OF CONTAINERS
  const foodAContainer = document.querySelector(".food-a-container") as HTMLElement;
  const foodBContainer = document.querySelector(".food-b-container") as HTMLElement;

  // If no protocol, we handled clearing in renderEmptyState
  if (!protocol) {
    const settingsA = foodAContainer.querySelector(".food-a-settings");
    if (settingsA) settingsA.remove();

    const settingsB = foodBContainer.querySelector(".food-b-settings");
    if (settingsB) settingsB.remove();
    return;
  }

  // --- FOOD A ---
  let foodASettings = foodAContainer.querySelector(".food-a-settings");

  // If settings don't exist, build them from scratch
  if (!foodASettings) {
    const html = buildFoodAHTML(protocol);
    foodAContainer.insertAdjacentHTML("beforeend", html);
    foodASettings = foodAContainer.querySelector(".food-a-settings"); // foodASettings prev null to be in this scope, need to update so that it can be accessed again for threshold if DI
  } else {
    // Patch existing Food A settings, hard coded selectors here
    patchSettingsInput(foodASettings as HTMLElement, "#food-a-name", protocol.foodA.name);
    patchSettingsInput(foodASettings as HTMLElement, "#food-a-protein", protocol.foodA.gramsInServing.toFixed(1));
    patchSettingsInput(foodASettings as HTMLElement, "#food-a-serving-size", protocol.foodA.servingSize.toFixed(1));

    // Update unit spans with form form switch
    const formUnit = protocol.foodA.type === FoodType.SOLID ? "g" : "ml";
    updateSpan(foodASettings as HTMLElement, ".input-unit-group span:last-of-type", formUnit);

    // Patch Toggles (Form)
    updateToggle(foodASettings as HTMLElement, '[data-action="toggle-food-a-solid"]', protocol.foodA.type === FoodType.SOLID);
    updateToggle(foodASettings as HTMLElement, '[data-action="toggle-food-a-liquid"]', protocol.foodA.type === FoodType.LIQUID);
    updateToggle(foodASettings as HTMLElement, '[data-action="toggle-food-a-capsule"]', protocol.foodA.type === FoodType.CAPSULE);

    // Patch Toggles (Strategy)
    updateToggle(foodASettings as HTMLElement, '[data-action="food-a-strategy-initial"]', protocol.foodAStrategy === FoodAStrategy.DILUTE_INITIAL);
    updateToggle(foodASettings as HTMLElement, '[data-action="food-a-strategy-all"]', protocol.foodAStrategy === FoodAStrategy.DILUTE_ALL);
    updateToggle(foodASettings as HTMLElement, '[data-action="food-a-strategy-none"]', protocol.foodAStrategy === FoodAStrategy.DILUTE_NONE);

    // Disable protein/serving size inputs if Capsule
    const isCapsuleA = protocol.foodA.type === FoodType.CAPSULE;
    updateInputDisabledState(foodASettings as HTMLElement, "#food-a-protein", isCapsuleA);
    updateInputDisabledState(foodASettings as HTMLElement, "#food-a-serving-size", isCapsuleA);
  }

  // Shared Logic (Runs after Create or Patch Food A settings)
  // Patch Threshold Section (Conditional)
  const advancedSettings = (foodASettings as HTMLElement).querySelector(".oit-advanced-settings") as HTMLDetailsElement;

  // Hide advanced settings if Capsule
  if (advancedSettings) {
    const isCapsuleA = protocol.foodA.type === FoodType.CAPSULE;
    advancedSettings.style.display = isCapsuleA ? 'none' : 'block';
  }

  const thresholdContainer = advancedSettings?.querySelector(".threshold-setting");

  // Sync open state
  if (advancedSettings) {
    // Only force it if it differs, to avoid interfering with browser animation logic if any
    const shouldBeOpen = workspace.getActive().isAdvancedSettingsOpen;
    if (advancedSettings.open !== shouldBeOpen) {
      advancedSettings.open = shouldBeOpen;
    }
  }

  const formUnit = protocol.foodA.type === FoodType.SOLID ? "g" : "ml";

  if (protocol.foodAStrategy === FoodAStrategy.DILUTE_INITIAL) {
    if (!thresholdContainer && advancedSettings) {
      // Add it if missing ... which can happen if a different dilute strat is chosen
      const html = `
          <div class="setting-row threshold-setting">
            <label>Directly dose when neat amount ≥</label>
            <div class="input-unit-group">
              <input type="number" id="food-a-threshold" min="0" value="${formatAmount(protocol.diThreshold, formUnit)}" step="0.1" />
              <span>${formUnit}</span>
            </div>
          </div>`;
      advancedSettings.insertAdjacentHTML("beforeend", html);
    } else if (thresholdContainer) {
      // Update it
      patchSettingsInput(thresholdContainer as HTMLElement, "#food-a-threshold", formatAmount(protocol.diThreshold, formUnit));
      updateSpan(thresholdContainer as HTMLElement, "span", formUnit);
    }
  } else {
    // Remove threshold container if present if not on dilution strat for food A
    if (thresholdContainer) thresholdContainer.remove();
  }

  // --- FOOD B ---
  if (protocol.foodB) {
    let foodBSettings = foodBContainer.querySelector(".food-b-settings");
    if (!foodBSettings) {
      const html = buildFoodBHTML(protocol);
      foodBContainer.insertAdjacentHTML("beforeend", html);
    } else {
      // Patch Food B settings: name, protein, serving size
      patchSettingsInput(foodBSettings as HTMLElement, "#food-b-name", protocol.foodB.name);
      patchSettingsInput(foodBSettings as HTMLElement, "#food-b-protein", protocol.foodB.gramsInServing.toFixed(1));
      patchSettingsInput(foodBSettings as HTMLElement, "#food-b-serving-size", protocol.foodB.servingSize.toFixed(1));

      const formUnit = protocol.foodB.type === FoodType.SOLID ? "g" : "ml";
      updateSpan(foodBSettings as HTMLElement, ".input-unit-group span:last-of-type", formUnit);

      updateToggle(foodBSettings as HTMLElement, '[data-action="toggle-food-b-solid"]', protocol.foodB.type === FoodType.SOLID);
      updateToggle(foodBSettings as HTMLElement, '[data-action="toggle-food-b-liquid"]', protocol.foodB.type === FoodType.LIQUID);

      // Threshold
      if (protocol.foodBThreshold) {
        patchSettingsInput(foodBSettings as HTMLElement, "#food-b-threshold", formatAmount(protocol.foodBThreshold.amount, protocol.foodBThreshold.unit));
        updateSpan(foodBSettings as HTMLElement, ".threshold-setting span", protocol.foodBThreshold.unit);
      }
    }
  } else {
    // Cleanup Food B if it exists but shouldn't
    const existing = foodBContainer.querySelector(".food-b-settings");
    if (existing) existing.remove();
  }
}

// ------------------------------
// Helpers for renderFoodSettings
// ------------------------------
/**
 * Generates complete HTML string for the Food A settings panel based on arguement protocol state
 *
 * @param protocol current protocol configuration containing Food A details
 * @returns A string of HTML representing the `.food-a-settings`
 */
function buildFoodAHTML(protocol: Protocol): string {
  const isCapsule = protocol.foodA.type === FoodType.CAPSULE;
  const disabledAttr = isCapsule ? 'disabled' : '';
  const advancedStyle = isCapsule ? 'style="display: none;"' : '';

  return `
    <div class="food-a-settings">
      <input type="text" class="food-name-input" id="food-a-name" value="${escapeHtml(protocol.foodA.name)}" />
      <div class="setting-row">
        <label>Protein:</label>
        <div class="input-unit-group">
          <input type="number" min="0" max="${protocol.foodA.servingSize}" id="food-a-protein" value="${protocol.foodA.gramsInServing.toFixed(1)}" step="0.1" ${disabledAttr} />
          <span>g per</span>
          <input type="number" min="0" id="food-a-serving-size" value="${protocol.foodA.servingSize.toFixed(1)}" step="0.1" ${disabledAttr} />
          <span>${protocol.foodA.type === FoodType.SOLID ? "g" : "ml"}</span>
        </div>
      </div>
      <div class="input-warning-text">
        Manufacturers can change formulations. Always verify these values match the Nutrition Facts label.
      </div>
      <div class="setting-row">
        <label>Form:</label>
        <div class="toggle-group">
          <button class="toggle-btn ${protocol.foodA.type === FoodType.SOLID ? "active" : ""}" data-action="toggle-food-a-solid">Solid</button>
          <button class="toggle-btn ${protocol.foodA.type === FoodType.LIQUID ? "active" : ""}" data-action="toggle-food-a-liquid">Liquid</button>
          <button class="toggle-btn ${protocol.foodA.type === FoodType.CAPSULE ? "active" : ""}" data-action="toggle-food-a-capsule">Capsule</button>
        </div>
      </div>
      <details class="oit-advanced-settings" ${advancedStyle}>
        <summary>Advanced Configuration</summary>
        <div class="setting-row">
          <label>Dilution strategy:</label>
          <div class="toggle-group">
            <button class="toggle-btn ${protocol.foodAStrategy === FoodAStrategy.DILUTE_INITIAL ? "active" : ""}" data-action="food-a-strategy-initial">Initial dilution</button>
            <button class="toggle-btn ${protocol.foodAStrategy === FoodAStrategy.DILUTE_ALL ? "active" : ""}" data-action="food-a-strategy-all">Dilution throughout</button>
            <button class="toggle-btn ${protocol.foodAStrategy === FoodAStrategy.DILUTE_NONE ? "active" : ""}" data-action="food-a-strategy-none">No dilutions</button>
          </div>
        </div>
        ${protocol.foodAStrategy === FoodAStrategy.DILUTE_INITIAL
      ? `
        <div class="setting-row threshold-setting">
          <label>Directly dose when neat amount ≥</label>
          <div class="input-unit-group">
            <input type="number" id="food-a-threshold" min="0" value="${formatAmount(protocol.diThreshold, protocol.foodA.type === FoodType.SOLID ? "g" : "ml")}" step="0.1" />
            <span>${protocol.foodA.type === FoodType.SOLID ? "g" : "ml"}</span>
            <span class="info-tooltip" data-tooltip="Once you can measure at least this much food, switch from dilution to direct doses.">
            ⓘ
            </span>
          </div>
        </div>
        `
      : ""
    }
      </details>
    </div>
  `;
}

/**
 * Generates complete HTML string for the Food B settings panel based on arguement protocol state
 *
 * @param protocol current protocol configuration containing Food B details
 * @returns string HTML representing the `.food-b-settings` or "" if no food B was selected
 */
function buildFoodBHTML(protocol: Protocol): string {
  if (!protocol.foodB) return "";
  return `
      <div class="food-b-settings">
        <input type="text" class="food-name-input" id="food-b-name" value="${escapeHtml(protocol.foodB.name)}" />
        <div class="setting-row">
          <label>Protein:</label>
          <div class="input-unit-group">
            <input type="number" id="food-b-protein" min="0" max="${protocol.foodB.servingSize}" value="${protocol.foodB.gramsInServing.toFixed(1)}" step="0.1" />
            <span>g per</span>
            <input type="number" id="food-b-serving-size" min="0" value="${protocol.foodB.servingSize.toFixed(1)}" step="0.1" />
            <span>${protocol.foodB.type === FoodType.SOLID ? "g" : "ml"}</span>
          </div>
        </div>
        <div class="input-warning-text">
          Manufacturers can change formulations. Always verify these values match the Nutrition Facts label.
        </div>
        <div class="setting-row">
          <label>Form:</label>
          <div class="toggle-group">
            <button class="toggle-btn ${protocol.foodB.type === FoodType.SOLID ? "active" : ""}" data-action="toggle-food-b-solid">Solid</button>
            <button class="toggle-btn ${protocol.foodB.type === FoodType.LIQUID ? "active" : ""}" data-action="toggle-food-b-liquid">Liquid</button>
          </div>
        </div>
        <div class="setting-row threshold-setting">
          <label>Transition when daily amount ≥</label>
          <div class="input-unit-group">
            <input type="number" id="food-b-threshold" value="${formatAmount(protocol.foodBThreshold!.amount, protocol.foodBThreshold!.unit)}" step="0.1" min="0" />
            <span>${protocol.foodBThreshold!.unit}</span>
            <span class="info-tooltip" data-tooltip="Once you can measure at least this much food, transition from the first food to this food.">
            ⓘ
            </span>
          </div>
        </div>
      </div>
    `;
}

/**
 * Updates input's value if it differs from the new value: goal => preserving user focus
 *
 * @param container - The parent element containing the input
 * @param selector - CSS selector to locate the specific input element
 * @param newVal - The target value string to apply
 */
function patchSettingsInput(container: HTMLElement, selector: string, newVal: string) {
  const input = container.querySelector(selector) as HTMLInputElement;
  if (!input) return;
  if (input.value !== newVal) input.value = newVal;
}

/**
 * Updates input's disabled state
 *
 * @param container - The parent element containing the input
 * @param selector - CSS selector to locate the specific input element
 * @param disabled - Whether the input should be disabled
 */
function updateInputDisabledState(container: HTMLElement, selector: string, disabled: boolean) {
  const input = container.querySelector(selector) as HTMLInputElement;
  if (!input) return;
  if (input.disabled !== disabled) input.disabled = disabled;
}

/**
 * Updates visual state of toggle button by adding or removing the 'active' class
 *
 * @param container - The parent element containing the toggle button
 * @param selector - CSS selector to locate the button
 * @param isActive - True to add the 'active' class, false to remove it
 */
function updateToggle(container: HTMLElement, selector: string, isActive: boolean) {
  const btn = container.querySelector(selector);
  if (!btn) return;
  if (isActive) btn.classList.add("active");
  else btn.classList.remove("active");
}

/**
 * Updates the text content of a span element if it differs from the provided text.
 * Helper mainly for refreshing dynamic unit labels (ie., "g" vs "ml")
 *
 * @param container - The parent element containing the span
 * @param selector - CSS selector to locate the span
 * @param text - The new text content to display
 */
function updateSpan(container: HTMLElement, selector: string, text: string) {
  const span = container.querySelector(selector);
  if (!span) return;
  if (span.textContent !== text) span.textContent = text;
}


/**
 * Render dosing strategy buttons based on passed protocol
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
 * Renders the main protocol table into the DOM using a diffing/patching strategy.
 * 
 * This function calculates the expected layout, compares it to the current DOM,
 * and either patches specific values in-place (to preserve focus) or rebuilds 
 * the table if the structure has changed.
 *
 * @param protocol - The current protocol state. If null, a table with instructions is rendered.
 * @param customNote - The current text content of the custom note.
 * @param isLoggedIn - Authentication status; used to determine if restricted controls are visible.
 */
export function renderProtocolTable(protocol: Protocol | null, customNote: string, isLoggedIn: boolean): void {
  if (!protocol) {
    renderEmptyState();
    // Update Warnings to clear them
    const warningsContainer = document.querySelector(".warnings-container") as HTMLElement;
    if (warningsContainer) warningsContainer.innerHTML = "";
    return;
  }

  // Ensure UI is visible if protocol exists
  showProtocolUI();

  const tableContainer = document.querySelector(
    ".output-container table",
  ) as HTMLElement;
  const tbody = tableContainer.querySelector("tbody");

  // Get warnings, need to know which steps / rows to highlight
  // See if there are any red warnings too for later
  const warnings = validateProtocol(protocol);
  const hasSevereWarnings = warnings.some(w => w.severity === 'red');
  const stepWarnings = new Map<number, "red" | "yellow">();
  for (const warning of warnings) {
    if (warning.stepIndex !== undefined) {
      const existing = stepWarnings.get(warning.stepIndex);
      if (!existing || (warning.severity === "red" && existing === "yellow")) {
        stepWarnings.set(warning.stepIndex, warning.severity);
      }
    }
  }

  // Determine expected rows structure; contents of expectedRows can be used to render the fullTable if required
  const expectedRows: RowSpec[] = [];
  let lastWasFoodA = true;

  for (const step of protocol.steps) {
    const isStepFoodB = step.food === "B";

    // Header check if foodB has started or not, and to add food A header to very start
    if (isStepFoodB && lastWasFoodA) {
      expectedRows.push({ type: 'header', text: protocol.foodB!.name });
      lastWasFoodA = false;
    } else if (!isStepFoodB && step.stepIndex === 1) {
      expectedRows.push({ type: 'header', text: protocol.foodA.name });
    }

    // generate the class for the row with warnings
    const warningClass = stepWarnings.get(step.stepIndex);
    const rowClass = warningClass ? `warning-highlight-${warningClass}` : "";

    const food = isStepFoodB ? protocol.foodB! : protocol.foodA;
    const mixUnit: Unit = getMeasuringUnit(food);

    expectedRows.push({
      type: 'step',
      step,
      rowClass, // contains warning information
      food,
      targetMgVal: formatNumber(step.targetMg, 1),
      mixFoodAmountVal: step.method === Method.DILUTE ? formatAmount(step.mixFoodAmount!, mixUnit) : "",
      dailyAmountVal: formatAmount(step.dailyAmount, step.dailyAmountUnit),
      mixUnit
    });
  }

  // Check if either no table rows exist or actual # rows in tbody is not the same as expectedRows (ie a step has been deleted or added) a full table rebuild should occur
  let needsFullRebuild = !tbody || tbody.children.length !== expectedRows.length;
  // Other reasons to trigger a full rebuild even if step # matches:
  // Step / header mismatch
  // Input mismatch: If a user toggles a step from Direct to Dilute (or the calculator logic switches it automatically), the structure of that cell changes from a text node to an input element. Patching does not account for this
  if (!needsFullRebuild && tbody) {
    const rows = Array.from(tbody.children) as HTMLTableRowElement[];
    // Edge case: if we are coming from empty state, the tbody might have 1 row with colspan instructions
    // if expectedRows > 1, we definitely need rebuild. If expectedRows=0, handled by null check above.
    // Basically check if first row is the instruction row
    if (rows.length === 1 && rows[0].firstElementChild?.hasAttribute('colspan')) {
      needsFullRebuild = true;
    } else {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const spec = expectedRows[i];
        if (spec.type === 'header') {
          if (!row.classList.contains('food-section-header')) {
            needsFullRebuild = true;
            break;
          }
        } else {
          if (row.classList.contains('food-section-header')) {
            needsFullRebuild = true;
            break;
          }
          // Check method consistency to ensure input vs n/a matches
          const mixCell = row.querySelector('.col-mix-food');
          if (!mixCell) {
            needsFullRebuild = true;
            break;
          }
          const hasInput = !!mixCell.querySelector('input');
          const shouldHaveInput = spec.step.method === Method.DILUTE;
          if (hasInput !== shouldHaveInput) {
            needsFullRebuild = true;
            break;
          }

          // Check daily amount consistency (Capsule is text, others are input)
          const daCell = row.querySelector('.col-daily-amount');
          if (!daCell) {
            needsFullRebuild = true;
            break;
          }
          const daHasInput = !!daCell.querySelector('input');
          const daShouldHaveInput = spec.step.method !== Method.CAPSULE;
          if (daHasInput !== daShouldHaveInput) {
            needsFullRebuild = true;
            break;
          }
        }
      }
    }
  }

  if (needsFullRebuild) {
    renderFullTable(tableContainer, expectedRows);
    // Update Notes and Exports (Bottom Section)
    // this needs to occur here to remove the hidden on init
    updateBottomSection(customNote, isLoggedIn, hasSevereWarnings);
    return;
  }

  // Patch values if no full rebuild was needed
  if (tbody) {
    const rows = Array.from(tbody.children) as HTMLTableRowElement[];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const spec = expectedRows[i];

      if (spec.type === 'header') {
        // patch header text (food name) if different
        const cell = row.firstElementChild as HTMLTableCellElement;
        if (cell.textContent !== spec.text) cell.textContent = spec.text;
      } else {
        // Step Row

        // patch class for styling changes
        if (row.className !== spec.rowClass) row.className = spec.rowClass;

        // patch step Num (col 0, inside actions-cell)
        const stepNumSpan = row.querySelector('.step-number');
        if (stepNumSpan && stepNumSpan.textContent !== String(spec.step.stepIndex)) {
          stepNumSpan.textContent = String(spec.step.stepIndex);
        }

        // patch button data-step associated with each action cell
        row.querySelectorAll('button').forEach(btn => {
          if (btn.getAttribute('data-step') !== String(spec.step.stepIndex)) {
            btn.setAttribute('data-step', String(spec.step.stepIndex));
          }
        });

        // Inputs - targetMg, mixFoodAmount, dailyAmount
        patchInput(row, '.editable[data-field="targetMg"]', spec.targetMgVal, spec.step.stepIndex);
        if (spec.step.method === Method.DILUTE) {
          patchInput(row, '.editable[data-field="mixFoodAmount"]', spec.mixFoodAmountVal, spec.step.stepIndex);
        }
        patchInput(row, '.editable[data-field="dailyAmount"]', spec.dailyAmountVal, spec.step.stepIndex);

        // Method Text
        const methodCell = row.querySelector('.col-method');
        if (methodCell && methodCell.textContent !== spec.step.method) methodCell.textContent = spec.step.method;

        // Water / Servings
        if (spec.step.method === Method.DILUTE) {
          const waterCell = row.querySelector('.col-mix-water');
          if (waterCell) {
            const text = `${formatAmount(spec.step.mixWaterAmount!, "ml")} ml`;
            const html = `${text}\n<span style="color: var(--oit-text-secondary); font-size: 0.85rem;"> (${formatNumber(spec.step.servings!, 1)} servings)</span>\n`;

            // Simple check:
            if (!waterCell.innerHTML.includes(text) || !waterCell.innerHTML.includes(formatNumber(spec.step.servings!, 1))) {
              waterCell.innerHTML = html; // set
            }
          }
        }

        // patch Units
        if (spec.step.method === Method.DILUTE) {
          const mixCell = row.querySelector('.col-mix-food');
          const unitSpan = mixCell ? mixCell.querySelector('span') : null;
          if (unitSpan && unitSpan.textContent?.trim() !== spec.mixUnit) unitSpan.textContent = ` ${spec.mixUnit}`;
        }

        const daCell = row.querySelector('.col-daily-amount');
        const daUnitSpan = daCell ? daCell.querySelector('span') : null;
        if (daUnitSpan && daUnitSpan.textContent?.trim() !== spec.step.dailyAmountUnit) daUnitSpan.textContent = ` ${spec.step.dailyAmountUnit}`;
      }
    }
  }

  // Update Notes and Exports (Bottom Section)
  updateBottomSection(customNote, isLoggedIn, hasSevereWarnings);
}

/**
 * Completely rebuilds and renders the protocol table HTML based on the provided row spec
 *
 * @param tableContainer - DOM element (table) where the HTML will be injected
 * @param expectedRows 
 */
function renderFullTable(tableContainer: HTMLElement, expectedRows: RowSpec[]) {
  let html = `
    <thead>
      <tr>
        <th>Step</th>
        <th>Protein (mg)</th>
        <th>Method</th>
        <th>Amount for mixture</th>
        <th>Water for mixture</th>
        <th>Daily amount</th>
      </tr>
    </thead>
    <tbody>
  `;

  // spec generated in `renderProtocolTable()`
  for (const spec of expectedRows) {
    if (spec.type === 'header') {
      html += `
        <tr class="food-section-header">
          <td colspan="6">${escapeHtml(spec.text)}</td>
        </tr>
      `;
    } else {
      const step = spec.step;
      html += `<tr class="${spec.rowClass}">`;

      // Actions + Step number
      html += `
        <td class="col-actions">
          <div class="actions-cell">
            <button class="btn-add-step" data-step="${step.stepIndex}">+</button>
            <button class="btn-remove-step" data-step="${step.stepIndex}">−</button>
            <span class="step-number">${step.stepIndex}</span>
          </div>
        </td>
      `;

      // Protein (editable)
      html += `
        <td class="col-protein">
          <input
            class="editable"
            type="number"
            data-step="${step.stepIndex}"
            data-field="targetMg"
            value="${spec.targetMgVal}"
            step="0.1"
            min="0"
          />
        </td>
      `;

      // Method
      html += `
        <td class="col-method">${step.method}</td>
      `;

      // Amount for mixture
      if (step.method === Method.DILUTE) {
        html += `
          <td class="col-mix-food">
            <input
              class="editable"
              type="number"
              data-step="${step.stepIndex}"
              data-field="mixFoodAmount"
              min="0"
              value="${spec.mixFoodAmountVal}"
              step="0.01"
            />
            <span> ${spec.mixUnit}</span>
          </td>
        `;
      } else {
        html += `<td class="na-cell col-mix-food">n/a</td>`;
      }

      // Water for mixture
      if (step.method === Method.DILUTE) {
        html += `
          <td class="non-editable col-mix-water">
            ${formatAmount(step.mixWaterAmount!, "ml")} ml
            <span style="color: var(--oit-text-secondary); font-size: 0.85rem;"> (${formatNumber(step.servings!, 1)} servings)</span>
          </td>
        `;
      } else {
        html += `<td class="na-cell col-mix-water">n/a</td>`;
      }

      // Daily amount
      if (step.method === Method.CAPSULE) {
        html += `
          <td class="col-daily-amount non-editable">
            Capsule
          </td>
        `;
      } else {
        html += `
          <td class="col-daily-amount">
            <input
              class="editable"
              type="number"
              data-step="${step.stepIndex}"
              data-field="dailyAmount"
              value="${spec.dailyAmountVal}"
              step="0.1"
              min="0"
            />
            <span> ${step.dailyAmountUnit}</span>
          </td>
        `;
      }

      html += `</tr>`;
    }
  }
  html += `</tbody>`;
  tableContainer.innerHTML = html;
}

/**
 * Updates the visibility and state of the bottom section controls (Exports, Save Request, Notes).
 * Decouples layout generation from logic by manipulating static HTML.
 *
 * @param customNote - The current custom note text.
 * @param isLoggedIn - User authentication status.
 * @param hasSevereWarnings - If true, disables the "Save Request" button.
 */
export function updateBottomSection(customNote: string, isLoggedIn: boolean, hasSevereWarnings: boolean) {
  const bottomSection = document.querySelector(".bottom-section");
  if (!bottomSection) return;

  // Ensure the section is visible (handles the oit-hidden-on-init class removal)
  bottomSection.classList.remove("oit-hidden-on-init");

  // Determine if we are in batch mode (multiple tabs with protocols)
  const activeStates = workspace.getAllProtocolStates().filter(s => s.getProtocol());
  const isBatch = activeStates.length > 1;

  // Delegate to specific renderers
  updatePublicExports(customNote, isBatch);
  updateRestrictedControls(isLoggedIn, hasSevereWarnings);
}

/**
 * Updates public export controls (specifically the custom note textarea and export button text).
 *
 * @param customNote - New note text to display.
 * @param isBatch - Whether multiple tabs are active.
 */
function updatePublicExports(customNote: string, isBatch: boolean) {
  const textarea = document.getElementById("custom-note") as HTMLTextAreaElement;
  // Only update if changed to avoid cursor jumping if user is typing
  if (textarea && textarea.value !== customNote) {
    textarea.value = customNote;
  }

  // Update button labels for batch export
  const asciiBtn = document.getElementById("export-ascii");
  const pdfBtn = document.getElementById("export-pdf");

  if (asciiBtn) {
    asciiBtn.textContent = isBatch ? "Copy All (Clipboard)" : "Copy to Clipboard";
  }
  if (pdfBtn) {
    // Only update if it's not currently generating
    if (pdfBtn.textContent !== "Generating...") {
      pdfBtn.textContent = isBatch ? "Export All (PDF)" : "Export PDF";
    }
  }
}

/**
 * Updates the Restricted "Request to Save Protocol" button state.
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

  // Is Logged In
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
 * Updates a specific input field within a table row while preserving user focus and typing state
 *
 * @param row - HTML element representing the table row (tr)
 * @param selector - CSS selector to find the specific input within the row
 * @param newVal - new value string to apply.
 * @param stepIndex - index of step
 */
function patchInput(row: HTMLElement, selector: string, newVal: string, stepIndex: number) {
  const input = row.querySelector(selector) as HTMLInputElement;
  if (!input) return;

  // Ensure data-step is correct (if we re-used a row from a different index, which we try to avoid)
  if (input.getAttribute('data-step') !== String(stepIndex)) {
    input.setAttribute('data-step', String(stepIndex));
  }

  if (document.activeElement === input) {
    // If the input is empty and the new value is "0", don't overwrite it. Let the user keep the field empty while typing
    if (input.value.trim() === "" && parseFloat(newVal) === 0) return;

    const currentNum = parseFloat(input.value);
    const newNum = parseFloat(newVal);
    // Avoid overwriting if numerically equivalent (handles "1." vs "1")
    if (currentNum === newNum) return;
    input.value = newVal;
  } else {
    if (input.value !== newVal) input.value = newVal;
  }
}

/**
 * Update warnings sidebar.
 * Groups first by step, then severity
 */
export function updateWarnings(protocol: Protocol | null, rulesURL: string): void {
  if (!protocol) return;

  const warnings = validateProtocol(protocol);
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

  // counts
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

  // Render summary header
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
    // Determine overall block severity
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
 * Helper to render a unified warning block (card).
 * @param title - The title of the block (e.g., "Step 5")
 * @param warnings - List of warnings to display
 * @param blockSeverity - 'red' or 'yellow'. Determines the border color.
 */
function renderWarningBlock(title: string, warnings: Warning[], blockSeverity: 'red' | 'yellow'): string {
  // CSS class for the block container
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

    // Individual item styling
    const itemClass = w.severity === 'red' ? 'item-red' : 'item-yellow';

    // Red warnings get bold text
    const content = w.severity === 'red' ? `<strong>${escapeHtml(msg)}</strong>` : escapeHtml(msg);

    return `<li class="${itemClass}">${content}</li>`;
  }).join("");

  html += `</ul></div>`;
  return html;
}

/**
 * Renders the decoded debug payload into the debug result container
 *
 * @param payload - The decoded user history payload
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
