import { html } from "lit-html";
import type { SearchResult } from "../../types";
import type { SearchCallbacks } from "../searchUI";
import { SEARCH_DISPLAY_LIMIT } from "../../constants";

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
  callbacks: SearchCallbacks
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
      <!-- Custom Food Item (Always Index 0) -->
      <div 
        class="search-result-item ${activeIndex === 0 ? "highlighted" : ""}" 
        data-index="0"
        @click=${handleSelectCustom}
      >
        <strong>Create Custom Food:</strong> ${query || "New food"}
      </div>

      <!-- Search Results -->
      ${displayResults.map((result, i) => {
    const itemIndex = i + 1;
    const isHighlighted = activeIndex === itemIndex;

    return html`
          <div 
            class="search-result-item ${isHighlighted ? "highlighted" : ""}" 
            data-index="${itemIndex}"
            @click=${() => handleSelectResult(result)}
          >
            ${result.type === "protocol"
        ? html`<strong>Protocol:</strong> ${result.data.name}`
        : html`
                  ${result.data.Food}
                  <span class="food-type"> - ${result.data.Type} - Protein: ${result.data["Mean protein in grams"].toFixed(1)} g/${result.data["Serving size"]} ${result.data.Type === "SOLID" ? "g" : "ml"}</span>
                `
      }
          </div>
        `;
  })}
    </div>
  `;
};
