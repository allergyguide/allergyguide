/**
 * UI component for displaying the filtered list of food items
 */
import { html, type TemplateResult } from "lit-html";
import { appState } from "../state/state";
import { type Food, SourceType } from "../types";
import { getMeasuringUnit } from "../utils";

/**
 * SVG icon representing a verified brand or provisioned food source
 */
export const BRAND_ICON = html`
    <svg class="icon icon-brand" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
`;

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
                    <th class="text-right">Protein (g)</th>
                    <th class="text-right">Serving Size</th>
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
                                ${food.name}
                            </button>
                        </td>
                        <td class="text-right">${food.gramsInServing.toFixed(2)}</td>
                        <td class="text-right">${food.servingSize.toFixed(2)} ${getMeasuringUnit(food)}</td>
                    </tr>
                `,
								)}
            </tbody>
        </table>
    </div>
`;
