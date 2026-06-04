/**
 * Simple state management
 * Subscription model for UI reactivity, search memoization
 */

import fuzzysort from "fuzzysort";
import {
	PRACTALL_5_STEPS,
	PRACTALL_7_STEPS,
	SEARCH_DEBOUNCE_MS,
	SEARCH_RESULTS_LIMIT,
} from "../constants";
import type { Food, OfcState } from "../types";
import { debounce } from "../utils";

/**
 * Global application state store
 * Manages authentication, food data, search results, and modal calculation state
 */
export class AppState {
	private state: OfcState = {
		isLoggedIn: false,
		email: null,
		publicFoods: [],
		provisionedFoods: [],
		searchableFoods: [],
		searchQuery: "",
		debouncedSearchQuery: "",
		selectedFood: null,
		modalGramsInServing: 0,
		modalServingSize: 100,
		modalSteps5: [...PRACTALL_5_STEPS],
		modalSteps7: [...PRACTALL_7_STEPS],
	};

	private listeners: ((state: OfcState) => void)[] = [];

	/**
	 * Internal debounced function to update the searchable query to prevent expensive fuzzy search operations on every keystroke
	 */
	private debouncedUpdateSearch = debounce((query: string) => {
		this.state.debouncedSearchQuery = query;
		this.notify();
	}, SEARCH_DEBOUNCE_MS);

	/**
	 * Subscribes a listener function to state changes
	 *
	 * @param listener - Function to execute whenever the state is updated
	 * @returns {Function} An unsubscribe function
	 */
	subscribe(listener: (state: OfcState) => void): () => void {
		this.listeners.push(listener);
		listener(this.state);
		return () => {
			this.listeners = this.listeners.filter((l) => l !== listener);
		};
	}

	/**
	 * Notifies all active listeners of a state change
	 */
	private notify() {
		for (const listener of this.listeners) {
			listener(this.state);
		}
	}

	/**
	 * Updates the authentication status and email
	 */
	setAuthState(isLoggedIn: boolean, email: string | null) {
		this.state.isLoggedIn = isLoggedIn;
		this.state.email = email;
		this.notify();
	}

	/**
	 * Updates the food collections and pre-computes search keys for performance
	 *
	 * @param publicFoods - Array of foods from the CNF database
	 * @param provisionedFoods - Array of foods provisioned for the user
	 */
	setFoods(publicFoods: Food[], provisionedFoods: Food[] = []) {
		this.state.publicFoods = publicFoods;
		this.state.provisionedFoods = provisionedFoods;

		// Pre-compute searchable foods once to optimize performance
		this.state.searchableFoods = [...provisionedFoods, ...publicFoods].map(
			(f) => {
				const searchKey = `${f.name} ${f.keywords?.join(" ") || ""}`.trim();
				return {
					...f,
					preparedKey: fuzzysort.prepare(searchKey),
				};
			},
		);

		this.notify();
	}

	/**
	 * Sets the raw search query and triggers a debounced update of the filtered results
	 */
	setSearchQuery(query: string) {
		this.state.searchQuery = query;
		this.notify();
		this.debouncedUpdateSearch(query);
	}

	/**
	 * Sets the food currently selected for protocol generation
	 * Initializes modal parameters from the food's default values
	 *
	 * @param food - The selected food item or null to close the modal.
	 */
	setSelectedFood(food: Food | null) {
		// Use a shallow copy to prevent edits in the modal from mutating the source array
		this.state.selectedFood = food ? { ...food } : null;

		if (this.state.selectedFood) {
			this.state.modalGramsInServing = this.state.selectedFood.gramsInServing;
			this.state.modalServingSize = this.state.selectedFood.servingSize;
			this.state.modalSteps5 = [...PRACTALL_5_STEPS];
			this.state.modalSteps7 = [...PRACTALL_7_STEPS];
		}
		this.notify();
	}

	/**
	 * Updates the temporary display name of the selected food in the modal
	 */
	updateSelectedFoodName(name: string) {
		if (this.state.selectedFood) {
			this.state.selectedFood.name = name;
			this.notify();
		}
	}

	/**
	 * Updates the protein content (g) used for dose calculations in the modal
	 */
	setModalGramsInServing(val: number) {
		const safeVal = Math.max(0, val);
		this.state.modalGramsInServing = safeVal;
		this.notify();
	}

	/**
	 * Updates the serving size used for dose calculations in the modal
	 * Enforces a minimum of 1 to avoid division by zero
	 */
	setModalServingSize(val: number) {
		const safeVal = Math.max(1, val);
		this.state.modalServingSize = safeVal;
		this.notify();
	}

	/**
	 * Updates an individual protein step value for a specific protocol
	 *
	 * @param practall - The protocol type ("5" or "7")
	 * @param index - The step index (0-based)
	 * @param value - The new protein amount in mg
	 */
	updateModalStep(practall: "5" | "7", index: number, value: number) {
		const safeVal = Math.max(0, value);
		if (practall === "5") {
			const newSteps = [...this.state.modalSteps5];
			newSteps[index] = safeVal;
			this.state.modalSteps5 = newSteps;
		} else {
			const newSteps = [...this.state.modalSteps7];
			newSteps[index] = safeVal;
			this.state.modalSteps7 = newSteps;
		}
		this.notify();
	}

	/**
	 * Returns a snapshot of the current state
	 */
	getState() {
		return { ...this.state };
	}

	private lastSearchQuery = "";
	private lastSearchableFoods: Food[] = [];
	private cachedResults: Food[] = [];

	/**
	 * Performs a fuzzy search on the consolidated food list
	 * Memoized
	 *
	 * @returns {Food[]} An array of matching food items, limited to certain num of results (ie 100)
	 */
	getFilteredFoods(): Food[] {
		const { debouncedSearchQuery, searchableFoods } = this.state;

		if (!debouncedSearchQuery.trim()) {
			return []; // Start with an empty list
		}

		// Memoization: check if search query or food list changed
		if (
			debouncedSearchQuery === this.lastSearchQuery &&
			searchableFoods === this.lastSearchableFoods
		) {
			return this.cachedResults;
		}

		const results = fuzzysort.go(debouncedSearchQuery, searchableFoods, {
			key: "preparedKey",
			limit: SEARCH_RESULTS_LIMIT,
			threshold: -10000,
		});

		this.cachedResults = results.map((r) => r.obj as Food);
		this.lastSearchQuery = debouncedSearchQuery;
		this.lastSearchableFoods = searchableFoods;

		return this.cachedResults;
	}
}

/**
 * Singleton instance of the application state
 */
export const appState = new AppState();
