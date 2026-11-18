/**
 * UI component for displaying the filtered list of food items
 */
import { html, type TemplateResult } from "lit-html";
import { appState } from "../state/state";
import { type Food, SourceType } from "../types";
import { getMeasuringUnit } from "../utils";
import { BRAND_ICON, USER_ICON } from "./icons";

/**
 * Template for the results table. Displays food name, protein content, and serving size
 * Clicking a row selects the food and opens the protocol modal
 *
 * @param filteredFoods - Array of foods to display
 * @returns {TemplateResult} The table template result
 */
export const resultsTableTemplate = (
	filteredFoods: Food[],
): TemplateResult => html`
    <div class="ofc-table-wrapper" ?hidden=${filteredFoods.length === 0}>
        <table class="ofc-table">
            <thead>
                <tr>
                    <th>Food Name</th>
                    <th class="ofc-num">Protein (g)</th>
                    <th class="ofc-num ofc-col-serving">Serving Size</th>
                </tr>
            </thead>
            <tbody>
                ${filteredFoods.map(
									(food) => html`
                    <tr class="ofc-row" @click=${() => appState.setSelectedFood(food)}>
                        <td class="food-name-cell">
                            <button class="ofc-food-select-btn" @click=${(
															e: Event,
														) => {
															e.stopPropagation();
															appState.setSelectedFood(food);
														}}>
                                ${food.source === SourceType.BRAND ? BRAND_ICON : ""}
                                ${food.source === SourceType.USER ? USER_ICON : ""}
                                ${food.name}
                            </button>
                        </td>
                        <td class="ofc-num">
                            ${food.gramsInServing.toFixed(2)}
                            <span class="ofc-per-serving">per ${food.servingSize.toFixed(2)} ${getMeasuringUnit(food)}</span>
                        </td>
                        <td class="ofc-num ofc-col-serving">${food.servingSize.toFixed(2)} ${getMeasuringUnit(food)}</td>
                    </tr>
                `,
								)}
            </tbody>
        </table>
    </div>
`;
