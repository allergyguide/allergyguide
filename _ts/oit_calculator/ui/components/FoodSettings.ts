import Decimal from "decimal.js";
import { html, nothing, render } from "lit-html";
import { live } from "lit-html/directives/live.js";
import { appState, workspace } from "../../state/instances";
import type { ProtocolState } from "../../state/protocolState";
import type { WorkspaceManager } from "../../state/workspaceManager";
import { type Food, FoodAStrategy, FoodType, SourceType } from "../../types";
import { formatAmount, formatNumber, getMeasuringUnit } from "../../utils";
import {
	handleFoodANameChange,
	handleFoodAProteinChange,
	handleFoodAServingSizeChange,
	handleFoodAStrategyChange,
	handleFoodAThresholdChange,
	handleFoodATypeChange,
	handleFoodBNameChange,
	handleFoodBProteinChange,
	handleFoodBServingSizeChange,
	handleFoodBThresholdChange,
	handleFoodBTypeChange,
} from "../actions/settingsActions";
import { saveCustomFood } from "../actions/vaultActions";

const validateFoodName = (name: string, currentId?: string): string => {
	const trimmed = name.trim();
	if (trimmed.length === 0) return "Name cannot be empty.";

	const isDuplicate = appState
		.getUserFoods()
		.some(
			(f) =>
				f.name.toLowerCase() === trimmed.toLowerCase() &&
				(f as { id?: string }).id !== currentId,
		);
	if (isDuplicate) return "A food with this name already exists.";

	return "";
};

/**
 * Helper to render source badges (BRAND, USER) and food metadata pills
 */
function renderBadge(
	food: Food,
	isDirty: boolean,
	errorMsg: string,
	targetSlot: "A" | "B",
	driftTooltip?: string,
) {
	const activeState = workspace.getActive();
	const isSaving = activeState.getSavingFoodKey() === targetSlot;

	const driftIcon = driftTooltip
		? html`<span class="info-tooltip drift-icon" data-tooltip="${driftTooltip}">ⓘ</span>`
		: nothing;

	if (isSaving) {
		return html`
			<div class="food-metadata-pill">
				<div class="oit-spin oit-saving-indicator">
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-arrow-repeat" viewBox="0 0 16 16">
						<path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"/>
						<path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"/>
					</svg>
				</div>
			</div>
		`;
	}

	switch (food.source) {
		case SourceType.BRAND:
			return html`
        <div class="food-metadata-pill oit-fade-in">
          <a
            href="${food.source_url}"
            class="badge badge-brand"
            target="_blank"
            rel="noopener noreferrer"
            title="Verify Nutrition Label"
          >BRAND ↗</a>
		  ${
				isDirty && appState.isLoggedIn
					? html`
			<div class="food-dirty-actions fade-in-actions">
			  <button
			  class="oit-save-as-btn"
			  title="Save As New Food"
			  ?disabled=${errorMsg !== ""}
			  @click=${() => {
					saveCustomFood(food, true, targetSlot);
				}}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-plus-square" viewBox="0 0 16 16">
            <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
          </svg>
        </button>
			</div>
		  `
					: nothing
			}
          ${driftIcon}
        </div>
      `;
		case SourceType.USER:
			return html`
        <div class="food-metadata-pill oit-fade-in">
          <span class="badge badge-custom">CUSTOM</span>
		  ${
				isDirty && appState.isLoggedIn
					? html`
			<div class="food-dirty-actions fade-in-actions">
			  ${
					food.id
						? html`<button class="oit-update-btn" title="Update Food in Library"
					  ?disabled=${errorMsg !== ""}
						@click=${() => saveCustomFood(food, false, targetSlot)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-floppy" viewBox="0 0 16 16">
                  <path d="M11 2H9v3h2V2Z"/>
                  <path d="M1.5 0h11.586a1.5 1.5 0 0 1 1.06.44l1.415 1.414A1.5 1.5 0 0 1 16 2.914V14.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 14.5v-13A1.5 1.5 0 0 1 1.5 0ZM1 1.5v13a.5.5 0 0 0 .5.5H2v-4.5A1.5 1.5 0 0 1 3.5 9h9a1.5 1.5 0 0 1 1.5 1.5V15h.5a.5.5 0 0 0 .5-.5V2.914a.5.5 0 0 0-.146-.353l-1.415-1.415A.5.5 0 0 0 13.086 1H13v4.5A1.5 1.5 0 0 1 11.5 7h-7A1.5 1.5 0 0 1 3 5.5V1H1.5a.5.5 0 0 0-.5.5Zm3 0v4.5a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5V1H4Zm9 13.5v-4.5a.5.5 0 0 0-.5-.5h-9a.5.5 0 0 0-.5.5V15h10Z"/>
                </svg>
              </button>`
						: nothing
				}
			  <button class="oit-save-as-btn" title="Save As New Food"
			  ?disabled=${errorMsg !== ""}
			  @click=${() => saveCustomFood(food, true, targetSlot)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-plus-square" viewBox="0 0 16 16">
            <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
          </svg>
        </button>
			</div>
		  `
					: nothing
			}
          ${driftIcon}
        </div>
      `;
		default:
			return driftTooltip
				? html`<div class="food-metadata-pill">${driftIcon}</div>`
				: nothing;
	}
}

/**
 * Shared template for Food details (Name, Protein, Serving Size, Form).
 * Provides a common set of inputs for both Food A and Food B settings sections.
 *
 * @param state - The active protocol state.
 * @param food - The food object to render (Food A or Food B).
 * @param idPrefix - Prefix for HTML IDs to ensure uniqueness (e.g., "food-a" or "food-b").
 * @param handlers - Callback functions for handling input changes via settingsActions.
 * @param options - UI configuration options (e.g., whether to allow the 'Capsule' form).
 * @returns A lit-html TemplateResult.
 */
const baseFoodForm = (
	state: ProtocolState,
	food: Food,
	idPrefix: "food-a" | "food-b",
	handlers: {
		onName: (state: ProtocolState, val: string) => void;
		onProtein: (state: ProtocolState, val: string) => void;
		onServing: (state: ProtocolState, val: string) => void;
		onType: (state: ProtocolState, type: FoodType) => void;
	},
	options: { allowCapsules: boolean },
) => {
	const isCapsule = food.type === FoodType.CAPSULE;
	const unit = food.type === FoodType.SOLID ? "g" : "ml";

	const errorMsg = validateFoodName(food.name, food.id);

	// --- DIRTY & DRIFT CALCULATION ---
	let driftTooltip = "";
	let isDirty = false;

	const targetSlot = idPrefix === "food-a" ? "A" : "B";

	if (food.source === SourceType.USER) {
		if (!food.id) {
			isDirty = true;
		} else {
			const masterFood = appState.foodsById.get(food.id);
			if (!masterFood) {
				driftTooltip = `⚠️ ${food.name} is not in your custom library.`;
				isDirty = true; // Mark as dirty so they can Save/Restore it
			} else {
				const masterProtein = new Decimal(masterFood.gramsInServing);
				const masterServing = new Decimal(masterFood.servingSize);

				const proteinDiff = !masterProtein.equals(food.gramsInServing);
				const servingDiff = !masterServing.equals(food.servingSize);
				const nameDiff = masterFood.name.trim() !== food.name.trim();
				const typeDiff = masterFood.type !== food.type;
				const charDiff = proteinDiff || servingDiff || typeDiff;
				const hasDrifted = charDiff || nameDiff;

				isDirty = workspace
					.getActive()
					.isFoodDirty(targetSlot, appState.foodsById);

				// Show drift tooltip ONLY if NOT dirty (i.e. user loaded an outdated protocol but hasn't started editing this food yet)
				if (!isDirty && hasDrifted) {
					let formattedDate = "unknown";
					if ("last_updated" in masterFood && masterFood.last_updated) {
						formattedDate = new Date(
							masterFood.last_updated,
						).toLocaleDateString("en-CA", {
							year: "numeric",
							month: "short",
							day: "numeric",
						});
					}

					const formattedInfo =
						masterFood.type !== FoodType.CAPSULE
							? `${formatNumber(
									masterProtein,
									1,
								)} g / ${masterFood.servingSize} ${getMeasuringUnit(
									masterFood as unknown as Food,
								)}`
							: "capsule";

					if (nameDiff && charDiff) {
						driftTooltip = `'${food.name}' was updated to '${masterFood.name}' on ${formattedDate}, ${formattedInfo}.`;
					} else if (nameDiff) {
						driftTooltip = `'${food.name}' had its name updated to '${masterFood.name}' on ${formattedDate}.`;
					} else {
						driftTooltip = `${masterFood.name} was updated on ${formattedDate} to: ${formattedInfo}.`;
					}
				}
			}
		}
	} else if (food.id) {
		// BRAND / PROVISIONED
		const masterFood = appState.foodsById.get(food.id);
		if (masterFood) {
			if ("is_active" in masterFood && masterFood.is_active === false) {
				driftTooltip = `${masterFood.name} is deprecated and no longer maintained. Please switch.`;
			} else {
				const masterProtein = new Decimal(masterFood.gramsInServing);
				const masterServing = new Decimal(masterFood.servingSize);

				const proteinDiff = !masterProtein.equals(food.gramsInServing);
				const servingDiff = !masterServing.equals(food.servingSize);
				const nameDiff = masterFood.name.trim() !== food.name.trim();
				const typeDiff = masterFood.type !== food.type;
				const charDiff = proteinDiff || servingDiff || typeDiff;

				if (nameDiff || charDiff) {
					let formattedDate = "unknown";
					if ("last_updated" in masterFood && masterFood.last_updated) {
						formattedDate = new Date(
							masterFood.last_updated,
						).toLocaleDateString("en-CA", {
							year: "numeric",
							month: "short",
							day: "numeric",
						});
					}

					const formattedInfo =
						masterFood.type !== FoodType.CAPSULE
							? `${formatNumber(
									masterProtein,
									1,
								)} g / ${masterFood.servingSize} ${getMeasuringUnit(
									masterFood as unknown as Food,
								)}`
							: "capsule";

					if (nameDiff && charDiff) {
						driftTooltip = `'${food.name}' was updated to '${masterFood.name}' on ${formattedDate}, ${formattedInfo}.`;
					} else if (nameDiff) {
						driftTooltip = `'${food.name}' had its name updated to '${masterFood.name}' on ${formattedDate}.`;
					} else {
						driftTooltip = `${masterFood.name} was updated on ${formattedDate} to: ${formattedInfo}.`;
					}
				}
			}
		}
	}

	return html`
<div class="food-name-container">
<input
  type="text"
  class="food-name-input ${errorMsg ? "oit-input-error" : ""}"
  id="${idPrefix}-name"
  .value="${food.name}"
  @input="${(e: Event) => handlers.onName(state, (e.target as HTMLInputElement).value)}"
  placeholder="Enter food name here ..."
/>
${renderBadge(food, isDirty, errorMsg, targetSlot, driftTooltip)}
</div>
${
	errorMsg
		? html`<div class="oit-error-message oit-slide-up">${errorMsg}</div>`
		: nothing
}

<div class="setting-row">
      <label>Protein:</label>
      <div class="input-unit-group">
        <input
          type="number"
          min="0"
          id="${idPrefix}-protein"
          .value="${live(food.gramsInServing.toFixed(1))}"
          step="0.1"
          ?disabled="${isCapsule}"
          @change="${(e: Event) => handlers.onProtein(state, (e.target as HTMLInputElement).value)}"
        />
        <span>g per</span>
        <input
          type="number"
          min="0"
          id="${idPrefix}-serving-size"
          .value="${live(food.servingSize.toFixed(1))}"
          step="0.1"
          ?disabled="${isCapsule}"
          @change="${(e: Event) => handlers.onServing(state, (e.target as HTMLInputElement).value)}"
        />
        <span>${unit}</span>
      </div>
    </div>
    <div class="input-warning-text">
      Always verify with the Nutrition Facts label.
    </div>
    <div class="setting-row">
      <label>Form:</label>
      <div class="toggle-group">
        <button
          class="toggle-btn ${food.type === FoodType.SOLID ? "active" : ""}"
          @click="${() => handlers.onType(state, FoodType.SOLID)}"
        >Solid</button>
        <button
          class="toggle-btn ${food.type === FoodType.LIQUID ? "active" : ""}"
          @click="${() => handlers.onType(state, FoodType.LIQUID)}"
        >Liquid</button>
        ${
					options.allowCapsules
						? html`
          <button
            class="toggle-btn ${food.type === FoodType.CAPSULE ? "active" : ""}"
            @click="${() => handlers.onType(state, FoodType.CAPSULE)}"
          >Capsule</button>
        `
						: ""
				}
      </div>
    </div>
  `;
};

/**
 * Renders the Food A (Primary Food) settings component into the specified mount point.
 * Includes basic food details and advanced configuration like dilution strategy and thresholds.
 *
 * @param ws - The workspace manager providing access to the active protocol state.
 * @param mount - The DOM element where the lit-html template should be rendered.
 */
export function renderFoodASettings(
	ws: WorkspaceManager,
	mount: HTMLElement,
): void {
	const activeState = ws.getActive();
	const protocol = activeState.getProtocol();

	// if no protocol defined, then HTMLElement defined by mount set as empty
	if (!protocol) {
		render(nothing, mount);
		return;
	}

	const isCapsule = protocol.foodA.type === FoodType.CAPSULE;
	const unit = protocol.foodA.type === FoodType.SOLID ? "g" : "ml";

	// build lit-html template
	const template = html`
    <div class="food-a-settings oit-fade-in">
      ${baseFoodForm(
				activeState,
				protocol.foodA,
				"food-a",
				{
					onName: handleFoodANameChange,
					onProtein: handleFoodAProteinChange,
					onServing: handleFoodAServingSizeChange,
					onType: handleFoodATypeChange,
				},
				{ allowCapsules: true },
			)}

      <details
        class="oit-advanced-settings"
        ?open="${activeState.isAdvancedSettingsOpen}"
        style="${isCapsule ? "display: none;" : "display: block;"}"
        @toggle="${(e: Event) => activeState.setAdvancedSettingsOpen((e.target as HTMLDetailsElement).open)}"
      >
        <summary>Advanced Configuration</summary>
        <div class="advanced-settings-content oit-slide-up">
          <div class="setting-row">
            <label>Dilution strategy:</label>
            <div class="toggle-group">
              <button
                class="toggle-btn ${protocol.foodAStrategy === FoodAStrategy.DILUTE_INITIAL ? "active" : ""}"
                @click="${() => handleFoodAStrategyChange(activeState, FoodAStrategy.DILUTE_INITIAL)}"
              >Initial dilution</button>
              <button
                class="toggle-btn ${protocol.foodAStrategy === FoodAStrategy.DILUTE_ALL ? "active" : ""}"
                @click="${() => handleFoodAStrategyChange(activeState, FoodAStrategy.DILUTE_ALL)}"
              >Dilution throughout</button>
              <button
                class="toggle-btn ${protocol.foodAStrategy === FoodAStrategy.DILUTE_NONE ? "active" : ""}"
                @click="${() => handleFoodAStrategyChange(activeState, FoodAStrategy.DILUTE_NONE)}"
              >No dilutions</button>
            </div>
          </div>
          ${
						protocol.foodAStrategy === FoodAStrategy.DILUTE_INITIAL
							? html`
            <div class="setting-row threshold-setting">
              <label>Directly dose when neat amount ≥</label>
              <div class="input-unit-group">
                <input
                  type="number"
                  id="food-a-threshold"
                  min="0"
                  .value="${live(formatAmount(protocol.diThreshold, unit))}"
                  step="0.1"
                  @change="${(e: Event) => handleFoodAThresholdChange(activeState, (e.target as HTMLInputElement).value)}"
                />
                <span>${unit}</span>
                <span class="info-tooltip" data-tooltip="Once you can measure at least this much food, switch from dilution to direct doses.">
                ⓘ
                </span>
              </div>
            </div>
          `
							: ""
					}
        </div>
      </details>
    </div>
  `;

	render(template, mount);
}

/**
 * Renders the Food B (Transition Food) settings component into the specified mount point.
 * Includes basic food details and the transition threshold setting.
 *
 * @param ws - The workspace manager providing access to the active protocol state.
 * @param mount - The DOM element where the lit-html template should be rendered.
 */
export function renderFoodBSettings(
	ws: WorkspaceManager,
	mount: HTMLElement,
): void {
	const activeState = ws.getActive();
	const protocol = activeState.getProtocol();
	if (!protocol?.foodB) {
		render(nothing, mount);
		return;
	}
	if (!protocol.foodBThreshold) {
		throw new Error(
			"Invariant failed: foodB is defined but foodBThreshold is missing in renderFoodBSettings",
		);
	}

	const template = html`
    <div class="food-b-settings oit-fade-in">
      ${baseFoodForm(
				activeState,
				protocol.foodB,
				"food-b",
				{
					onName: handleFoodBNameChange,
					onProtein: handleFoodBProteinChange,
					onServing: handleFoodBServingSizeChange,
					onType: handleFoodBTypeChange,
				},
				{ allowCapsules: false },
			)}

      <div class="setting-row threshold-setting">
        <label>Transition when daily amount ≥</label>
        <div class="input-unit-group">
          <input
            type="number"
            id="food-b-threshold"
            min="0"
            .value="${live(formatAmount(protocol.foodBThreshold.amount, protocol.foodBThreshold.unit))}"
            step="0.1"
            @change="${(e: Event) => handleFoodBThresholdChange(activeState, (e.target as HTMLInputElement).value)}"
          />
          <span>${protocol.foodBThreshold.unit}</span>
          <span class="info-tooltip" data-tooltip="Once you can measure at least this much food, transition from the first food to this food.">
          ⓘ
          </span>
        </div>
      </div>
    </div>
  `;

	render(template, mount);
}
