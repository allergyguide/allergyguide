/**
 * Core UI orchestration and main template
 */
import { html, nothing, render, type TemplateResult } from "lit-html";
import { coreToolbarTemplate } from "../../core/ui/toolbar";
import { appState } from "../state/state";
import type { Food, OfcState } from "../types";
import { protocolModalTemplate } from "./protocol-modal";
import { resultsTableTemplate } from "./results-table";

let lastSearchQuery = "";
let isFirstRender = true;

export interface AppOptions {
	onLogin: () => void;
	onLogout: () => void;
	version: string;
	changelogUrl: string;
}

/**
 * Initializes the OFC index application by subscribing to state changes and rendering the UI
 * Also handles the transition from the static skeleton loader to the interactive app
 *
 * @param mountPoint - The DOM element where the app should be rendered
 * @param options - Configuration options and callbacks
 */
export function initApp(mountPoint: HTMLElement, options: AppOptions) {
	appState.subscribe((state) => {
		const filteredFoods = appState.getFilteredFoods();
		render(appTemplate(state, filteredFoods, options), mountPoint);

		// Handoff: hide skeleton and show app on first successful render
		if (isFirstRender) {
			const container = mountPoint.closest(".ofc_index");
			if (container) {
				const skeleton = container.querySelector(
					".ofc-skeleton-container",
				) as HTMLElement;
				if (skeleton) {
					skeleton.style.display = "none";
				}
				container.classList.remove("ofc-loading");
			}
			isFirstRender = false;
		}

		// Reset scroll to top if search query changed
		if (state.debouncedSearchQuery !== lastSearchQuery) {
			const tableWrapper = mountPoint.querySelector(".ofc-table-wrapper");
			if (tableWrapper) {
				tableWrapper.scrollTop = 0;
			}
			lastSearchQuery = state.debouncedSearchQuery;
		}
	});
}

/**
 * Main application template that composes the toolbar, search box, results table, and modal
 *
 * @param state - Current application state
 * @param filteredFoods - Array of foods filtered by the search query
 * @param options - Configuration options and callbacks
 * @returns {TemplateResult} The lit-html template result
 */
const appTemplate = (
	state: OfcState,
	filteredFoods: Food[],
	options: AppOptions,
): TemplateResult => html`
    <div class="ofc-container">
        <!-- Declarative Toolbar -->
        ${coreToolbarTemplate({
					isLoggedIn: state.isLoggedIn,
					userEmail: state.email,
					version: options.version,
					changelogUrl: options.changelogUrl,
					onLogin: options.onLogin,
					onLogout: options.onLogout,
				})}

        <!-- Search Header -->
        <div class="ofc-header">
            <div class="search-box">
                <input 
                    type="text" 
                    .value=${state.searchQuery}
                    @input=${(e: InputEvent) => appState.setSearchQuery((e.target as HTMLInputElement).value)}
                    placeholder="Search for foods..."
                    class="ofc-search-input"
                />
                ${
									state.searchQuery
										? html`
                    <button class="ofc-clear-btn" @click=${() => appState.setSearchQuery("")}>×</button>
                `
										: nothing
								}
            </div>
        </div>

        <!-- Results Info or Instructions -->
        ${
					state.debouncedSearchQuery.trim()
						? html`
            <div class="ofc-results-info">
                Found ${filteredFoods.length >= 100 ? "100+" : filteredFoods.length} foods
            </div>
        `
						: html`
            <div class="ofc-instructions">
                <p>Start typing to look through the database!</p>
                <p>Search through <strong>${
									state.publicFoods.length + state.provisionedFoods.length
								}</strong> foods to find their protein content and generate a <a href="https://pubmed.ncbi.nlm.nih.gov/39560049/" target="_blank" rel="noopener noreferrer" class="changelog-link">PRACTALL</a> challenge protocol.</p>
                <p>
                  If needed, edit the food name, protein content per serving size, and protein content per step.
                </p>
            </div>
        `
				}

        <!-- Food Table -->
        ${resultsTableTemplate(filteredFoods)}

        ${
					state.debouncedSearchQuery.trim() && filteredFoods.length === 0
						? html`
            <div class="ofc-no-results">No foods match your search "${state.debouncedSearchQuery}".</div>
        `
						: nothing
				}

        <!-- Modal -->
        ${state.selectedFood ? protocolModalTemplate(state) : nothing}
    </div>
`;
