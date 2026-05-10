/**
 * @module
 *
 * Search UI components (dropdowns, navigation)
 * Does rely on glue from actions.ts
 */
import { render, nothing } from "lit-html";
import { SearchDropdown } from "./components/SearchDropdown";
import type { FoodData, ProtocolData, SearchResult } from "../types";
import { performSearch } from "../core/search";
import { AppState } from "../state/appState";
import { selectCustomFood, selectProtocol, selectFoodA, selectFoodB } from "./actions";
import { SEARCH_DISPLAY_LIMIT } from "../constants";

// State for dropdown navigation
let activeIndex: number = -1;
let currentDropdownInputId: string = "";
let currentResults: SearchResult[] = [];
let currentQuery: string = "";
let currentCallbacks: SearchCallbacks | null = null;
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

const GLOBAL_CALLBACKS: SearchCallbacks = {
  onSelectCustom: (name, inputId) => {
    selectCustomFood(name, inputId);
    hideSearchDropdown(inputId);
  },
  onSelectProtocol: (data) => {
    selectProtocol(data);
    if (currentDropdownInputId) hideSearchDropdown(currentDropdownInputId);
  },
  onSelectFoodA: (data) => {
    selectFoodA(data);
    hideSearchDropdown("food-a-search");
  },
  onSelectFoodB: (data) => {
    selectFoodB(data);
    hideSearchDropdown("food-b-search");
  }
};

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
      showSearchDropdown(inputId, results, query, GLOBAL_CALLBACKS);
    };

    // Debounced search while typing
    input.addEventListener("input", (e) => {
      const query = (e.target as HTMLInputElement).value;
      if (searchDebounceTimer) clearTimeout(searchDebounceTimer);

      searchDebounceTimer = window.setTimeout(() => {
        activeIndex = -1; // Reset navigation on type
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
* Uses lit-html to render into the dedicated mount point
*
* @param inputId - DOM ID of the input element (e.g., "food-a-search").
* @param results - Array of SearchResult
* @param query - current text value of the input, used for the "Custom" entry
* @param callbacks - interface containing methods to handle selection
*/
export function showSearchDropdown(
  inputId: string,
  results: SearchResult[],
  query: string,
  callbacks: SearchCallbacks
): void {
  const mountId = `${inputId}-dropdown-mount`;
  const mount = document.getElementById(mountId);
  if (!mount) return;

  // Update internal state for navigation
  currentDropdownInputId = inputId;
  currentResults = results;
  currentQuery = query;
  currentCallbacks = callbacks;

  if (results.length === 0 && !query.trim()) {
    render(nothing, mount);
    return;
  }

  // there's stuff, render
  render(SearchDropdown(inputId, results, query, activeIndex, callbacks), mount);

  const dropdown = mount.querySelector('.search-dropdown');
  if (dropdown) {
    if (activeIndex === -1) {
      // ensures that new searches / typing resets scroll position
      dropdown.scrollTop = 0;
    } else {
      // Handle scrolling after render with the user keying up or down
      const activeItem = dropdown.querySelector(`[data-index="${activeIndex}"]`);
      if (activeItem) {
        activeItem.scrollIntoView({
          block: "nearest",
          behavior: "auto",
        });
      }
    }
  }
}

/**
 * Remove and reset the autocomplete dropdown for a given input
 *
 * @param inputId - DOM ID of the input associated with the dropdown to hide
 */
export function hideSearchDropdown(inputId: string): void {
  const mountId = `${inputId}-dropdown-mount`;
  const mount = document.getElementById(mountId);
  if (mount) {
    render(nothing, mount);
  }

  if (currentDropdownInputId === inputId) {
    // reset everything
    activeIndex = -1;
    currentDropdownInputId = "";
    currentResults = [];
    currentQuery = "";
  }
}

/**
 * Keyboard navigation for the autocomplete dropdown.
 */
export function navigateDropdown(direction: "up" | "down"): void {
  if (!currentDropdownInputId || !currentCallbacks) return;

  const totalItems = currentResults.slice(0, SEARCH_DISPLAY_LIMIT).length + 1; // +1 for Custom Food
  if (totalItems === 0) return;

  // Update index
  if (direction === "down") {
    activeIndex = (activeIndex + 1) % totalItems;
  } else {
    activeIndex = activeIndex <= 0 ? totalItems - 1 : activeIndex - 1;
  }

  // Re-render
  showSearchDropdown(currentDropdownInputId, currentResults, currentQuery, currentCallbacks);
}

/**
 * Programmatically "click" the currently highlighted autocomplete item.
 */
export function selectHighlightedDropdownItem(): void {
  if (!currentDropdownInputId || activeIndex < 0 || !currentCallbacks) return;

  if (activeIndex === 0) {
    currentCallbacks.onSelectCustom(currentQuery || "New Food", currentDropdownInputId);
  } else {
    const resultIndex = activeIndex - 1;
    const results = currentResults.slice(0, SEARCH_DISPLAY_LIMIT);
    if (resultIndex < results.length) {
      const result = results[resultIndex];
      if (result.type === "protocol") {
        currentCallbacks.onSelectProtocol(result.data);
      } else {
        if (currentDropdownInputId === "food-a-search") {
          currentCallbacks.onSelectFoodA(result.data);
        } else {
          currentCallbacks.onSelectFoodB(result.data);
        }
      }
    }
  }
  hideSearchDropdown(currentDropdownInputId);
}
