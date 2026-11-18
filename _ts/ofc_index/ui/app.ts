/**
 * Core UI orchestration and main template
 */
import { html, nothing, render, type TemplateResult } from "lit-html";
import { showFeedbackModal } from "../../core/ui/feedback-modal";
import { coreToolbarTemplate } from "../../core/ui/toolbar";
import { appState } from "../state/state";
import type { Food, OfcState } from "../types";
import { CLOSE_ICON } from "./icons";
import {
	portionTableTemplate,
	registerPortionTableRenderer,
} from "./portion-table";
import { protocolModalTemplate } from "./protocol-modal";
import { resultsTableTemplate } from "./results-table";

let lastSearchQuery = "";
let isFirstRender = true;

// ---------------------------------------------------------------------------
// Tab state
// ---------------------------------------------------------------------------

type ActiveTab = "calculator" | "portions";
let activeTab: ActiveTab = "calculator";

const TABS: { id: ActiveTab; label: string }[] = [
	{ id: "calculator", label: "OFC Index" },
	{ id: "portions", label: "Portion Reference" },
];

/**
 * Tab bar following the WAI-ARIA tabs pattern: roving tabindex, arrow/Home/End keys move and activate
 */
const tabBarTemplate = (onSwitch: () => void): TemplateResult => {
	const select = (id: ActiveTab, focus: boolean) => {
		activeTab = id;
		onSwitch();
		if (focus) document.getElementById(`ofc-tab-${id}`)?.focus();
	};
	const onKeydown = (e: KeyboardEvent) => {
		const idx = TABS.findIndex((t) => t.id === activeTab);
		let next = -1;
		if (e.key === "ArrowRight") next = (idx + 1) % TABS.length;
		else if (e.key === "ArrowLeft")
			next = (idx - 1 + TABS.length) % TABS.length;
		else if (e.key === "Home") next = 0;
		else if (e.key === "End") next = TABS.length - 1;
		if (next === -1) return;
		e.preventDefault();
		select(TABS[next].id, true);
	};

	return html`
		<div class="ofc-tab-bar" role="tablist" aria-label="OFC tool sections" @keydown=${onKeydown}>
			${TABS.map(
				(tab) => html`
					<button
						role="tab"
						id="ofc-tab-${tab.id}"
						class="ofc-tab ${activeTab === tab.id ? "ofc-tab--active" : ""}"
						aria-selected=${activeTab === tab.id ? "true" : "false"}
						aria-controls="ofc-panel-${tab.id}"
						tabindex=${activeTab === tab.id ? "0" : "-1"}
						@click=${() => select(tab.id, false)}
					>${tab.label}</button>
				`,
			)}
		</div>
	`;
};

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
	/** Element focused before the protocol dialog opened, restored when it closes */
	let returnFocusTo: HTMLElement | null = null;
	let wasModalOpen = false;

	/** Shared re-render trigger used by both AppState and portion-table filter */
	const doRender = () => {
		const state = appState.getState();
		const filteredFoods = appState.getFilteredFoods();
		const isModalOpen = state.selectedFood !== null;
		if (isModalOpen && !wasModalOpen) {
			returnFocusTo = document.activeElement as HTMLElement | null;
		}

		render(appTemplate(state, filteredFoods, options, doRender), mountPoint);

		// Dialog focus management: move focus in on open, give it back on close
		if (isModalOpen && !wasModalOpen) {
			mountPoint.querySelector<HTMLElement>(".ofc-modal")?.focus();
		} else if (!isModalOpen && wasModalOpen) {
			const target = returnFocusTo?.isConnected
				? returnFocusTo
				: mountPoint.querySelector<HTMLElement>(".ofc-search-input");
			target?.focus();
			returnFocusTo = null;
		}
		wasModalOpen = isModalOpen;

		// Reset scroll to top if search query changed
		if (state.debouncedSearchQuery !== lastSearchQuery) {
			const tableWrapper = mountPoint.querySelector(".ofc-table-wrapper");
			if (tableWrapper) {
				tableWrapper.scrollTop = 0;
			}
			lastSearchQuery = state.debouncedSearchQuery;
		}
	};

	// Allow the portion table to trigger re-renders on filter changes
	registerPortionTableRenderer(doRender);

	appState.subscribe((_state) => {
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
		doRender();
	});
}

/**
 * Main application template that composes the toolbar, search box, results table, and modal
 *
 * @param state - Current application state
 * @param filteredFoods - Array of foods filtered by the search query
 * @param options - Configuration options and callbacks
 * @param rerender - Re-renders the whole app (used by the tab bar)
 * @returns {TemplateResult} The lit-html template result
 */
const appTemplate = (
	state: OfcState,
	filteredFoods: Food[],
	options: AppOptions,
	rerender: () => void,
): TemplateResult => html`
    <div class="ofc-container">
        <!-- Tab Bar -->
        ${tabBarTemplate(rerender)}

        <div
            role="tabpanel"
            id="ofc-panel-${activeTab}"
            aria-labelledby="ofc-tab-${activeTab}"
        >
        ${
					activeTab === "calculator"
						? html`
				<!-- Declarative Toolbar -->
				${coreToolbarTemplate({
					isLoggedIn: state.isLoggedIn,
					userEmail: state.email,
					version: options.version,
					changelogUrl: options.changelogUrl,
					onLogin: options.onLogin,
					onLogout: options.onLogout,
					showFeedback: true,
					onFeedback: () =>
						showFeedbackModal({
							headerMessage:
								"Questions or concerns about the OFC Index? Let us know!",
						}),
					customAssetsSyncStatus: state.customAssetsSyncStatus,
				})}

				<!-- Search Header -->
				<div class="ofc-header">
					<div class="search-box">
						<input
							type="text"
							.value=${state.searchQuery}
							@input=${(e: InputEvent) => appState.setSearchQuery((e.target as HTMLInputElement).value)}
							placeholder="Search for foods..."
							aria-label="Search foods"
							autocomplete="off"
							class="ofc-search-input"
						/>
						${
							state.searchQuery
								? html`<button
										class="ofc-clear-btn"
										aria-label="Clear search"
										@click=${(e: Event) => {
											appState.setSearchQuery("");
											(
												(e.currentTarget as HTMLElement)
													.previousElementSibling as HTMLInputElement | null
											)?.focus();
										}}
									>${CLOSE_ICON}</button>`
								: nothing
						}
					</div>
				</div>

				<!-- Results count: persistent live region so screen readers hear each update -->
				<div class="ofc-results-info" role="status">${
					state.debouncedSearchQuery.trim()
						? `Found ${filteredFoods.length >= 100 ? "100+" : filteredFoods.length} ${filteredFoods.length === 1 ? "food" : "foods"}`
						: ""
				}</div>

				<!-- Instructions -->
				${
					state.debouncedSearchQuery.trim()
						? nothing
						: html`
					<div class="ofc-instructions">
						<p>Start typing to look through the database!</p>
						<p>Search through <strong>${state.publicFoods.length + state.provisionedFoods.length}</strong> foods to find their protein content and generate a <a href="https://pubmed.ncbi.nlm.nih.gov/39560049/" target="_blank" rel="noopener noreferrer" class="changelog-link">PRACTALL</a> challenge protocol.</p>
						<p>If needed, edit the food name, protein content per serving size, and protein content per step.</p>
					</div>
				`
				}

				<!-- Food Table -->
				${resultsTableTemplate(filteredFoods)}

				${
					state.debouncedSearchQuery.trim() && filteredFoods.length === 0
						? html`<div class="ofc-no-results">No foods match your search "${state.debouncedSearchQuery}".</div>`
						: nothing
				}

				<!-- Modal -->
				${state.selectedFood ? protocolModalTemplate(state) : nothing}
			`
						: portionTableTemplate()
				}
        </div>
    </div>
`;
