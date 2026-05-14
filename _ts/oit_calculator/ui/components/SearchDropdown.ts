import { html } from "lit-html";
import { SEARCH_DISPLAY_LIMIT } from "../../constants";
import type { SearchResult } from "../../types";
import type { SearchCallbacks } from "../searchUI";

/**
 * Lit-html template for the search dropdown component
 *
 * @param inputId - The ID of the associated search input
 * @param results - Array of search results
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
                  ${result.data.name}
                  <span class="food-type"> - ${result.data.type} - Protein: ${result.data.gramsInServing.toFixed(1)} g/${result.data.servingSize} ${result.data.type === "SOLID" ? "g" : "ml"}</span>
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
