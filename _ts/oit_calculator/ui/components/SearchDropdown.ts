import { html, nothing } from "lit-html";
import { SEARCH_DISPLAY_LIMIT } from "../../constants";
import { FoodType, type SearchResult, SourceType } from "../../types";
import { getMeasuringUnit } from "../../utils";
import type { SearchCallbacks } from "../searchUI";

/**
 * Helper to render source icons (BRAND, USER)
 */
function renderSourceIcon(source: SourceType) {
	switch (source) {
		case SourceType.BRAND:
			return html`
        <svg class="icon icon-brand" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      `;
		case SourceType.USER:
			return html`
        <svg class="icon icon-user" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
      `;
		default:
			return nothing;
	}
}

/**
 * Lit-html template for the search dropdown component
 *
 * @param inputId - The ID of the associated search input
 * @param results - Array of search results (flattened protocols + foods)
 * @param query - The current search query
 * @param activeIndex - The index of the currently highlighted item (-1 for none)
 * @param callbacks - Search event callbacks
 */
export const SearchDropdown = (
	inputId: string,
	results: SearchResult[],
	query: string,
	activeIndex: number,
	callbacks: SearchCallbacks,
) => {
	const displayResults = results.slice(0, SEARCH_DISPLAY_LIMIT);

	const handleSelectCustom = () => {
		callbacks.onSelectCustom(query || "New Food", inputId);
	};

	const handleSelectResult = (result: SearchResult) => {
		if (result.type === "protocol") {
			callbacks.onSelectProtocol(result.data);
		} else {
			if (inputId === "food-a-search") {
				callbacks.onSelectFoodA(result.data);
			} else {
				callbacks.onSelectFoodB(result.data);
			}
		}
	};

	return html`
    <div class="search-dropdown">
      <!-- Search Results -->
      ${displayResults.map((result, i) => {
				const isHighlighted = activeIndex === i;

				return html`
          <div
            class="search-result-item ${isHighlighted ? "highlighted" : ""}"
            data-index="${i}"
            @click=${() => handleSelectResult(result)}
          >
            ${
							result.type === "protocol"
								? html`<strong>Protocol:</strong> ${result.data.name}`
								: html`
								  <div class="search-result-content">
								    ${renderSourceIcon(result.data.source)}
								    <span class="food-name">${result.data.name}</span>
								    <div class="food-info">
								      ${
												result.data.type !== FoodType.CAPSULE
													? `${result.data.gramsInServing.toFixed(1)} g/${result.data.servingSize} ${getMeasuringUnit(result.data)}`
													: "capsule"
											}
								    </div>
								  </div>
								`
						}
          </div>
        `;
			})}

      <!-- Custom Food Item (Sticky at Bottom) -->
      <div
        class="search-result-item sticky-bottom ${activeIndex === displayResults.length ? "highlighted" : ""}"
        data-index="${displayResults.length}"
        @click=${handleSelectCustom}
      >
        <strong>Create Custom Food:</strong> ${query || "New food"}
      </div>
    </div>
  `;
};
