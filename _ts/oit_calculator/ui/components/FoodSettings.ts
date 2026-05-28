import Decimal from "decimal.js";
import { html, nothing, render } from "lit-html";
import { live } from "lit-html/directives/live.js";
import { appState } from "../../state/instances";
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

/**
 * Helper to render source badges (BRAND, USER) and food metadata pills
 */
function renderBadge(food: Food, driftTooltip?: string) {
	const driftIcon = driftTooltip
		? html`<span class="info-tooltip drift-icon" data-tooltip="${driftTooltip}">ⓘ</span>`
		: nothing;

	switch (food.source) {
		case SourceType.BRAND:
			return html`
        <div class="food-metadata-pill">
          <a
            href="${food.source_url}"
            class="badge badge-brand"
            target="_blank"
            rel="noopener noreferrer"
            title="Verify Nutrition Label"
          >BRAND ↗</a>
          ${driftIcon}
        </div>
      `;
		case SourceType.USER:
			return html`
        <div class="food-metadata-pill">
          <span class="badge badge-custom">CUSTOM</span>
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
	idPrefix: string,
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

	// DRIFT CHECK
	let driftTooltip = "";
	if (food.id) {
		const masterFood = appState.foodsById.get(food.id);
		if (masterFood) {
			if ("is_active" in masterFood && masterFood.is_active === false) {
				driftTooltip = `DEPRECATED FOOD: ${masterFood.name} is no longer maintained. Please switch.`;
			} else {
				const masterProtein = new Decimal(masterFood.gramsInServing);
				const masterServing = new Decimal(masterFood.servingSize);

				const proteinDiff = !masterProtein.equals(food.gramsInServing);
				const servingDiff = !masterServing.equals(food.servingSize);
				const nameDiff = masterFood.name.trim() !== food.name.trim();

				if (proteinDiff || servingDiff || nameDiff) {
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
					driftTooltip = `${masterFood.name} was updated on ${formattedDate}. Latest protein is: ${formatNumber(
						masterProtein,
						1,
					)} g / ${masterFood.servingSize} ${getMeasuringUnit(
						masterFood as unknown as Food,
					)}.`;
				}
			}
		}
	}

	return html`
<div class="food-name-container">
<input
  type="text"
  class="food-name-input"
  id="${idPrefix}-name"
  .value="${food.name}"
  @input="${(e: Event) => handlers.onName(state, (e.target as HTMLInputElement).value)}"
/>
${renderBadge(food, driftTooltip)}
</div>
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
    <div class="food-a-settings">
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
        <div class="advanced-settings-content">
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
    <div class="food-b-settings">
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
