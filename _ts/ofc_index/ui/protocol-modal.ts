/**
 * UI component for the food challenge protocol modal
 */
import { html, nothing, type TemplateResult } from "lit-html";
import { live } from "lit-html/directives/live.js";
import {
	calculateSteps,
	type DosingStep,
	proteinPerGram,
} from "../core/calculations";
import { appState } from "../state/state";
import { type Food, type OfcState, SourceType } from "../types";
import { getMeasuringUnit } from "../utils";
import { BRAND_ICON, USER_ICON } from "./results-table";

/**
 * Main template for the protocol generation modal
 * Calculates dosing steps based on the currently selected food and protein parameters
 *
 * @param state - Current application state
 * @returns {TemplateResult | typeof nothing} The modal template or nothing if no food is selected
 */
export const protocolModalTemplate = (
	state: OfcState,
): TemplateResult | typeof nothing => {
	if (!state.selectedFood) {
		return nothing;
	}
	const food = state.selectedFood;

	// Calculate protein per gram for the core calculation engine
	const ratio = proteinPerGram(
		state.modalGramsInServing,
		state.modalServingSize,
	);

	const unit = getMeasuringUnit(food);

	const steps5 = calculateSteps(state.modalSteps5, ratio, unit);
	const steps7 = calculateSteps(state.modalSteps7, ratio, unit);

	const isServingZero = state.modalServingSize <= 0;
	const isExceeding = state.modalGramsInServing > state.modalServingSize;
	const isZero = state.modalGramsInServing <= 0;
	const isInvalid = isServingZero || isExceeding || isZero;

	let warningMsg = "";
	if (isServingZero) warningMsg = "Serving size must be above zero.";
	else if (isExceeding) warningMsg = "Protein exceeds serving size.";
	else if (isZero) warningMsg = "Protein content is zero.";

	return html`
        <div class="ofc-modal-backdrop">
            <div class="ofc-modal" @click=${(e: Event) => e.stopPropagation()}>
                <button class="ofc-modal-close" @click=${() => appState.setSelectedFood(null)}>×</button>
                
                <div class="ofc-modal-header">
                    <h3 class="ofc-editable-name">
                        ${food.source === SourceType.BRAND ? BRAND_ICON : ""}
                        ${food.source === SourceType.USER ? USER_ICON : ""}
                        <input 
                            type="text" 
                            .value=${live(food.name)}
                            @input=${(e: InputEvent) => appState.updateSelectedFoodName((e.target as HTMLInputElement).value)}
                            class="ofc-name-edit-input"
                        />
                    </h3>
                    ${
											food.source_url
												? html`
                        <a href="${food.source_url}" target="_blank" class="ofc-source-link">Verify Nutrition Facts ↗</a>
                    `
												: nothing
										}
                </div>

                <div class="ofc-inputs-container">
                    <div class="ofc-modal-controls ${isInvalid ? "ofc-input-error" : ""}">
                        <label>
                            <input 
                                id="ofc-modal-protein"
                                type="number" 
                                step="0.01"
                                min="0"
                                .value=${live(displayValue("ofc-modal-protein", state.modalGramsInServing.toString()))}
                                @input=${(e: InputEvent) => appState.setModalGramsInServing(parseFloat((e.target as HTMLInputElement).value) || 0)}
                            />
                            (g) protein per
                        </label>
                        <label>
                            <input 
                                id="ofc-modal-serving"
                                type="number"
                                step="any"
                                min="0"
                                .value=${live(displayValue("ofc-modal-serving", state.modalServingSize.toString()))}
                                @input=${(e: InputEvent) => appState.setModalServingSize(parseFloat((e.target as HTMLInputElement).value) || 0)}
                            />
                            (${unit}) serving
                        </label>
                    </div>
                    ${
											isInvalid
												? html`
                        <p class="ofc-warning-text">
                            ${warningMsg}
                        </p>
                    `
												: html`
                        <p class="ofc-disclaimer">
                            <i><strong>Calculation aid only</strong>. Verify protein concentration with labels.</i>
                        </p>
                    `
										}
                </div>

                <div class="ofc-tables-container">
                    ${protocolTableTemplate("5", food, steps5, state, isInvalid)}
                    ${protocolTableTemplate("7", food, steps7, state, isInvalid)}
                </div>
            </div>
        </div>
    `;
};

/**
 * Keeps what the user is typing in the focused input (e.g. an empty box) instead of overwriting it with the
 * normalised state value; other inputs get the formatted value so they stay reactive
 */
export const displayValue = (inputId: string, formatted: string): string => {
	const active = document.activeElement;
	if (active && active.id === inputId) {
		return (active as HTMLInputElement).value;
	}
	return formatted;
};

/**
 * Template for an individual PRACTALL protocol table
 *
 * @param practall - Protocol type ("5" or "7")
 * @param food - The selected food item
 * @param steps - Calculated dosing steps
 * @param state - Current application state
 * @param isInvalid - Inputs are invalid, so copying is disabled
 * @returns {TemplateResult} The table template result
 */
const protocolTableTemplate = (
	practall: "5" | "7",
	food: Food,
	steps: DosingStep[],
	state: OfcState,
	isInvalid: boolean,
): TemplateResult => {
	const unit = getMeasuringUnit(food);

	return html`
    <div class="ofc-protocol-wrapper">
        <div class="ofc-table-header">
            <span>${practall === "5" ? "PRACTALL-5" : "PRACTALL-7"}</span>
            <button class="ofc-copy-btn" ?disabled=${isInvalid} @click=${async (
							e: Event,
						) => {
							const btn = e.currentTarget as HTMLButtonElement;
							btn.textContent = (await copyToClipboard(food, steps, state))
								? "Copied"
								: "Copy failed";
							setTimeout(() => {
								btn.textContent = "Copy";
							}, 1500);
						}}>Copy</button>
        </div>
        <div class="ofc-table-scroll">
            <table class="ofc-protocol-table">
                <thead>
                    <tr>
                        <th>Step</th>
                        <th>Food (${unit})</th>
                        <th>Protein (mg)</th>
                        <th>Cumulative dose (mg)</th>
                    </tr>
                </thead>
                <tbody>
                    ${steps.map((step, idx) => {
											const foodInputId = `practall-${practall}-food-${idx}`;
											const proteinInputId = `practall-${practall}-protein-${idx}`;

											return html`
                        <tr>
                            <td>${step.step}</td>
                            <td>
                                <input 
                                    id=${foodInputId}
                                    type="number"
                                    step="any"
                                    min="0"
                                    aria-label="Step ${step.step} food amount in ${unit}"
                                    .value=${live(displayValue(foodInputId, step.foodGrams.toFixed(2)))}
                                    @input=${(e: InputEvent) => {
																			const raw = (e.target as HTMLInputElement)
																				.value;
																			appState.updateModalStepByFood(
																				practall,
																				idx,
																				raw.trim() === ""
																					? 0
																					: parseFloat(raw) || 0,
																			);
																		}}
                                    @blur=${(e: Event) => {
																			(e.target as HTMLInputElement).value =
																				step.foodGrams.toFixed(2);
																		}}
                                />
                            </td>
                            <td>
                                <input 
                                    id=${proteinInputId}
                                    type="number" 
                                    step="any"
                                    min="0"
                                    aria-label="Step ${step.step} protein in mg"
                                    .value=${live(displayValue(proteinInputId, step.targetMg.toString()))}
                                    @input=${(e: InputEvent) => {
																			const raw = (e.target as HTMLInputElement)
																				.value;
																			appState.updateModalStep(
																				practall,
																				idx,
																				raw.trim() === ""
																					? 0
																					: parseFloat(raw) || 0,
																			);
																		}}
                                    @blur=${(e: Event) => {
																			(e.target as HTMLInputElement).value =
																				step.targetMg.toString();
																		}}
                                />
                            </td>
                            <td>${step.cumulativeMg.toFixed(2)}</td>
                        </tr>
                    `;
										})}
                </tbody>
            </table>
        </div>
    </div>
`;
};

/**
 * Generates an ASCII representation of the protocol and copies it to the system clipboard
 *
 * @param food - The selected food item
 * @param steps - Calculated dosing steps
 * @param state - Current application state
 * @returns {Promise<boolean>} Whether the copy succeeded
 */
async function copyToClipboard(
	food: Food,
	steps: DosingStep[],
	state: OfcState,
): Promise<boolean> {
	let text = `Food challenge: ${food.name} (${state.modalGramsInServing} g per ${state.modalServingSize} ${getMeasuringUnit(food)})\n---\n`;
	steps.forEach((s) => {
		text += `Step ${s.step}: ${s.foodGrams.toFixed(2)} ${s.unit} (${s.targetMg.toFixed(1)} mg protein; ${s.cumulativeMg.toFixed(1)} mg total)\n`;
	});

	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch (err) {
		console.error("Failed to copy: ", err);
		return false;
	}
}
