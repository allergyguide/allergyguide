/**
 * @module
 *
 * Search UI components (dropdowns, navigation)
 * Does rely on glue from actions.ts
 */
import { escapeHtml } from "../utils";
import type { FoodData, ProtocolData } from "../types";
import { performSearch } from "../core/search";
import { AppState } from "../state/appState";
import { selectCustomFood, selectProtocol, selectFoodA, selectFoodB } from "./actions";

// State for dropdown navigation
let currentDropdownIndex: number = -1;
let currentDropdownInputId: string = "";
let searchDebounceTimer: number | null = null;

/**
 * Interface defining the callback handlers for various search selection events
 * helps decouple the UI interaction (selecting an item) from specific state update logic in `actions.ts`
 */
export interface SearchCallbacks {
  onSelectCustom: (name: string, inputId: string) => void;
  onSelectProtocol: (data: ProtocolData) => void;
  onSelectFoodA: (data: FoodData) => void;
  onSelectFoodB: (data: FoodData) => void;
}

/**
 * Initialize search input listeners for Food A and Food B
 * Sets up following behavior for both search inputs:
 * 1. Input: Triggers a debounced (150ms) fuzzy search against the AppState indices
 * 2. Keydown: Handles keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
 * 3. Blur: Hides the dropdown after a short delay (to allow click events to register)
 *
 * @param appState - The application state containing the prepared Fuse.js/Fuzzysort indices.
 */
export function initSearchEvents(appState: AppState): void {
  const setupSearch = (inputId: string, type: "protocol" | "food") => {
    const input = document.getElementById(inputId) as HTMLInputElement;
    if (!input) return;

    // Helper 
    const triggerSearch = (query: string) => {
      // no search on empty strings 
      if (!query || !query.trim()) return;

      const results = performSearch(query, type, appState.foodsIndex, appState.protocolsIndex);
      showSearchDropdown(inputId, results, query, {
        onSelectCustom: selectCustomFood,
        onSelectProtocol: selectProtocol,
        onSelectFoodA: selectFoodA,
        onSelectFoodB: selectFoodB
      });
    };

    // Debounced search while typing
    input.addEventListener("input", (e) => {
      const query = (e.target as HTMLInputElement).value;
      if (searchDebounceTimer) clearTimeout(searchDebounceTimer);

      searchDebounceTimer = window.setTimeout(() => {
        triggerSearch(query);
      }, 150);
    });

    // FOCUS: Immediate search to reshow dropdown if returning to the field
    input.addEventListener("focus", () => {
      triggerSearch(input.value);
    });

    // CLICK: Immediate search to reshow dropdown if field is already focused but dropdown was closed 
    input.addEventListener("click", () => {
      triggerSearch(input.value);
    });

    // KEYDOWN: Navigation
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); navigateDropdown("down"); }
      else if (e.key === "ArrowUp") { e.preventDefault(); navigateDropdown("up"); }
      else if (e.key === "Enter") { e.preventDefault(); selectHighlightedDropdownItem(); }
      else if (e.key === "Escape") { hideSearchDropdown(inputId); }
    });

    // BLUR: Hide
    input.addEventListener("blur", () => {
      setTimeout(() => hideSearchDropdown(inputId), 150);
    });
  };

  setupSearch("food-a-search", "protocol");
  setupSearch("food-b-search", "food");
}

/**
 * Resets the search UI state for both Food A and Food B inputs.
 * Clears the input text, hides any visible autocomplete dropdowns,
 * and cancels pending search debounce timers.
 */
export function resetSearch(): void {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  
  const aInput = document.getElementById("food-a-search") as HTMLInputElement;
  const bInput = document.getElementById("food-b-search") as HTMLInputElement;
  
  if (aInput) {
    aInput.value = "";
    hideSearchDropdown("food-a-search");
  }
  if (bInput) {
    bInput.value = "";
    hideSearchDropdown("food-b-search");
  }
}

/**
* Render the autocomplete dropdown below a specific search input
* Constructs dropdown menu, including:
* - custom (always index 0) 
* - A list of up to 50 search results (Protocols or Foods)
* - Attaches click listeners to each item to trigger the appropriate callback
*
* @param inputId - DOM ID of the input element (e.g., "food-a-search").
* @param results - Array of search results (mixed objects of ProtocolData or FoodData)
* @param query - current text value of the input, used for the "Custom" entry
* @param callbacks - interface containing methods to handle selection
*/
export function showSearchDropdown(
  inputId: string,
  results: any[],
  query: string,
  callbacks: SearchCallbacks
): void {
  const input = document.getElementById(inputId) as HTMLInputElement;
  if (!input || !input.parentElement) return;

  const container = input.parentElement;

  // Remove existing dropdown
  const existingDropdown = container.querySelector(".search-dropdown");
  if (existingDropdown) {
    existingDropdown.remove();
  }

  if (results.length === 0 && !query.trim()) return;

  const dropdown = document.createElement("div");
  dropdown.className = "search-dropdown";

  // Reset dropdown navigation state
  currentDropdownIndex = -1;
  currentDropdownInputId = inputId;

  // Always add custom option first
  const customItem = document.createElement("div");
  customItem.className = "search-result-item";
  customItem.setAttribute("data-index", "0");
  customItem.innerHTML = `<strong>Create Custom Food:</strong> ${escapeHtml(query || "New food")}`;
  customItem.addEventListener("click", () => {
    callbacks.onSelectCustom(query || "New Food", inputId);
    hideSearchDropdown(inputId);
  });
  dropdown.appendChild(customItem);

  // Add search results
  // limit of 50 HARD CODED HERE consider moving out
  const displayResults = results.slice(0, 50);
  for (let i = 0; i < displayResults.length; i++) {
    const result = displayResults[i];
    const item = document.createElement("div");
    item.className = "search-result-item";
    item.setAttribute("data-index", String(i + 1));

    if (result.obj.name) {
      // Protocol result
      item.innerHTML = `<strong>Protocol:</strong> ${escapeHtml(result.obj.name)}`;
      item.addEventListener("click", () => {
        callbacks.onSelectProtocol(result.obj);
        hideSearchDropdown(inputId);
      });
    } else {
      // Food result
      const foodData: FoodData = result.obj;

      item.innerHTML = `
        ${escapeHtml(foodData.Food)}
        <span class="food-type"> - ${escapeHtml(foodData.Type)} - Protein: ${foodData["Mean protein in grams"].toFixed(1)} g/${foodData["Serving size"]} ${foodData.Type === "SOLID" ? "g" : "ml"}</span>
      `;
      item.addEventListener("click", () => {
        if (inputId === "food-a-search") {
          callbacks.onSelectFoodA(foodData);
        } else {
          callbacks.onSelectFoodB(foodData);
        }
        hideSearchDropdown(inputId);
      });
    }

    dropdown.appendChild(item);
  }

  container.appendChild(dropdown);
}

/**
 * Remove and reset the autocomplete dropdown for a given input
 * removes `.search-dropdown` element
 * Resets internal navigation state (`currentDropdownIndex`)
 *
 * @param inputId - DOM ID of the input associated with the dropdown to hide
 */
export function hideSearchDropdown(inputId: string): void {
  const input = document.getElementById(inputId) as HTMLInputElement;
  if (!input || !input.parentElement) return;

  const container = input.parentElement;
  const dropdown = container.querySelector(".search-dropdown");
  if (dropdown) {
    dropdown.remove();
  }
  currentDropdownIndex = -1;
  currentDropdownInputId = "";
}

/**
 * Keyboard navigation for the autocomplete dropdown.
 */
export function navigateDropdown(direction: "up" | "down"): void {
  if (!currentDropdownInputId) return;

  const input = document.getElementById(
    currentDropdownInputId,
  ) as HTMLInputElement;
  if (!input || !input.parentElement) return;

  const container = input.parentElement;
  const dropdown = container.querySelector(".search-dropdown");
  if (!dropdown) return;

  const items = Array.from(dropdown.querySelectorAll(".search-result-item"));
  if (items.length === 0) return;

  // Remove current highlight
  if (currentDropdownIndex >= 0 && currentDropdownIndex < items.length) {
    items[currentDropdownIndex].classList.remove("highlighted");
  }

  // Update index
  if (direction === "down") {
    currentDropdownIndex = (currentDropdownIndex + 1) % items.length;
  } else {
    currentDropdownIndex =
      currentDropdownIndex <= 0 ? items.length - 1 : currentDropdownIndex - 1;
  }

  // Add new highlight
  items[currentDropdownIndex].classList.add("highlighted");

  // Scroll into view
  items[currentDropdownIndex].scrollIntoView({
    block: "nearest",
    behavior: "smooth",
  });
}

/**
 * Programmatically "click" the currently highlighted autocomplete item.
 */
export function selectHighlightedDropdownItem(): void {
  if (!currentDropdownInputId || currentDropdownIndex < 0) return;

  const input = document.getElementById(
    currentDropdownInputId,
  ) as HTMLInputElement;
  if (!input || !input.parentElement) return;

  const container = input.parentElement;
  const dropdown = container.querySelector(".search-dropdown");
  if (!dropdown) return;

  const items = Array.from(dropdown.querySelectorAll(".search-result-item"));
  if (currentDropdownIndex < items.length) {
    (items[currentDropdownIndex] as HTMLElement).click();
  }
}
