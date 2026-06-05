/**
 * @module
 * State management for the active protocol, including history (undo/redo).
 */
import Decimal from "decimal.js";
import deepEqual from "fast-deep-equal";
import { HISTORY_DEBOUNCE_MS } from "../constants";
import {
	type FoodData,
	type HistoryItem,
	type Protocol,
	type ProtocolData,
	type ProtocolListener,
	SourceType,
	type UpdateContext,
} from "../types";
import { serializeProtocol } from "../utils";

/**
 * State manager for a single OIT Protocol (one tab).
 *
 * Holds protocol data and custom notes for a specific instance.
 * Manages an Undo/Redo history stack with debouncing support.
 */
export class ProtocolState {
	private MAX_HISTORY = 100;

	// History management
	private current: HistoryItem | null = null;
	private history: HistoryItem[] = []; // Past
	private future: HistoryItem[] = []; // Future (Redo)
	private customNote: string = "";

	/** UI state for the advanced settings accordion */
	public isAdvancedSettingsOpen: boolean = false;

	/** UI state to track which food slot is currently being saved to the database */
	private savingFoodKey: "A" | "B" | null = null;

	// State for dirty checks
	private baselineProtocolState: ProtocolData | null = null;
	private foodABaselineHash: string | null = null;
	private foodBBaselineHash: string | null = null;

	private listeners: ProtocolListener[] = [];

	// Debounce tracking
	private historyDebounceTimer: number | null = null;

	/**
	 * Returns the current Protocol object.
	 *
	 * @returns The active protocol or null if not yet initialized.
	 */
	public getProtocol(): Protocol | null {
		return this.current ? this.current.protocol : null;
	}

	/**
	 * Sets the baseline for dirty state comparison for the protocolState
	 * Excludes last_updated from the comparison
	 */
	public setBaseline() {
		const p = this.getProtocol();
		if (!p) {
			this.baselineProtocolState = null;
			return;
		}

		// Serialize it to strip Decimals and normalize structure
		const serialized = serializeProtocol(p, this.customNote);

		// Strip volatile metadata
		serialized.last_updated = undefined;

		this.baselineProtocolState = serialized;
		this.notify("structural"); // Trigger UI refresh for Save button color
	}

	/**
	 * Sets the baseline for a specific food (A or B)
	 * Clears the dirty state for that specific food without affecting the protocol baseline
	 */
	public setFoodBaseline(foodKey: "A" | "B") {
		const p = this.getProtocol();
		if (!p) return;

		const food = foodKey === "A" ? p.foodA : p.foodB;
		if (!food) {
			if (foodKey === "A") this.foodABaselineHash = null;
			else this.foodBBaselineHash = null;
			return;
		}

		const hash = JSON.stringify({ ...food, last_updated: undefined });
		if (foodKey === "A") this.foodABaselineHash = hash;
		else this.foodBBaselineHash = hash;

		this.notify("structural");
	}

	/**
	 * Helper to reset all baselines (Protocol, Food A, Food B)
	 * Use when loading a completely new protocol from the library
	 */
	public setAllBaselines() {
		this.setBaseline();
		this.setFoodBaseline("A");
		this.setFoodBaseline("B");
	}

	/**
	 * @returns true if the protocol has changed since the last baseline
	 */
	public isDirty(): boolean {
		const p = this.getProtocol();
		if (!p) return false;
		if (!p.id) return true; // Brand new is always dirty
		if (!this.baselineProtocolState) return true;

		// Serialize current state
		const currentSerialized = serializeProtocol(p, this.customNote);

		// Strip volatile metadata
		currentSerialized.last_updated = undefined;

		// Deep compare standard JS objects
		return !deepEqual(currentSerialized, this.baselineProtocolState);
	}

	/**
	 * Checks if a specific food has changed since its last specific baseline
	 *
	 * 1. If it lacks an ID, it's a new custom food -> Dirty
	 * 2. If it matches the global library (globalFoods) -> Clean
	 * 3. Otherwise, compare against its local session baselineHash
	 */
	public isFoodDirty(
		foodKey: "A" | "B",
		globalFoods?: Map<string, FoodData>,
	): boolean {
		const p = this.getProtocol();
		if (!p) return false;

		const currentFood = foodKey === "A" ? p.foodA : p.foodB;
		if (!currentFood) return false;

		// If it lacks an ID, it's a brand new custom food -> Dirty
		if (!currentFood.id) return true;

		// Global Library Check (Satisfies manual drift resolution UX)
		if (globalFoods) {
			const masterFood = globalFoods.get(currentFood.id);
			if (masterFood) {
				const masterProtein = new Decimal(masterFood.gramsInServing);
				const masterServing = new Decimal(masterFood.servingSize);

				const proteinMatch = masterProtein.equals(currentFood.gramsInServing);
				const servingMatch = masterServing.equals(currentFood.servingSize);
				const nameMatch = masterFood.name.trim() === currentFood.name.trim();
				const typeMatch = masterFood.type === currentFood.type;

				if (proteinMatch && servingMatch && nameMatch && typeMatch) {
					return false; // It perfectly matches the library, hide Update buttons
				}
			}
		}

		// Local Baseline Fallback
		const baselineHash =
			foodKey === "A" ? this.foodABaselineHash : this.foodBBaselineHash;

		if (!baselineHash) return true;

		const currentHash = JSON.stringify({
			...currentFood,
			last_updated: undefined,
		});
		return currentHash !== baselineHash;
	}

	/**
	 * Returns the full rich history stack.
	 * The current state is always the last element in the returned array.
	 *
	 * @returns Array of history items.
	 */
	public getHistory(): HistoryItem[] {
		const list = [...this.history];
		if (this.current) list.push(this.current);
		return list;
	}

	/**
	 * Returns the current custom note text.
	 */
	public getCustomNote(): string {
		return this.customNote;
	}

	/**
	 * Updates the visibility state of the advanced settings UI.
	 *
	 * @param isOpen - Whether the advanced settings section should be expanded.
	 */
	public setAdvancedSettingsOpen(isOpen: boolean) {
		this.isAdvancedSettingsOpen = isOpen;
		this.notify("structural");
	}

	/**
	 * Sets which food slot is currently in a processing/saving state
	 *
	 * @param key - "A", "B", or null
	 */
	public setSavingFoodKey(key: "A" | "B" | null) {
		this.savingFoodKey = key;
		this.notify("structural");
	}

	/**
	 * @returns The slot currently being saved, if any
	 */
	public getSavingFoodKey(): "A" | "B" | null {
		return this.savingFoodKey;
	}

	/**
	 * @returns true if the protocol has changed since the last baseline.
	 */
	public getCanUndo(): boolean {
		return this.history.length > 0;
	}

	/**
	 * @returns `true` if there are future states available to redo
	 */
	public getCanRedo(): boolean {
		return this.future.length > 0;
	}

	/**
	 * Update protocol with a mandatory action label
	 * @param p New protocol
	 * @param label Description of the action (e.g., "Changed target from 100 to 200")
	 * @param options.addToHistory Default true
	 * @param options.debounceHistory If true, groups rapid updates into a single undo step Default false
	 * @param options.isLoad If true, skips protocol-level chain of custody breaking (e.g. initial load)
	 */
	public setProtocol(
		p: Protocol | null,
		label: string,
		options?: {
			addToHistory?: boolean;
			debounceHistory?: boolean;
			isLoad?: boolean;
		},
	) {
		const addToHistory = options?.addToHistory ?? true;
		const debounceHistory = options?.debounceHistory ?? false;
		const isLoad = options?.isLoad ?? false;

		if (!p) {
			this.clearAll();
			return;
		}

		let finalP = p;

		// enforce chain of custody
		// If it's not a fresh load and the protocol isn't already a USER protocol, strip its identity to convert it into a new USER document.
		if (!isLoad && finalP.source !== SourceType.USER) {
			finalP = {
				...finalP,
				source: SourceType.USER,
				id: undefined,
			};
		}

		if (addToHistory) {
			this.manageHistoryPush(debounceHistory);
			this.future = [];
		}

		this.applyNewState(finalP, label, debounceHistory ? "input" : "structural");
	}

	/**
	 * Resets the entire state (current, history, and future stacks).
	 */
	private clearAll() {
		this.current = null;
		this.history = [];
		this.future = [];
		this.clearDebounce();
		this.notify("structural");
	}

	/**
	 * Manages the logic for pushing the current state onto the history stack.
	 * Supports debouncing to group rapid consecutive updates (like typing).
	 *
	 * @param debounce - Whether to apply debouncing logic.
	 */
	private manageHistoryPush(debounce: boolean) {
		if (!this.current) return;

		if (debounce) {
			if (this.historyDebounceTimer === null) {
				this.pushToHistoryStack(this.current);
			}
			this.resetDebounceTimer();
		} else {
			this.clearDebounce();
			this.pushToHistoryStack(this.current);
		}
	}

	/**
	 * Pushes an item onto the history stack and enforces the maximum history limit.
	 */
	private pushToHistoryStack(item: HistoryItem) {
		this.history.push(item);
		if (this.history.length > this.MAX_HISTORY) {
			this.history.shift();
		}
	}

	/**
	 * Resets the history debounce timer.
	 */
	private resetDebounceTimer() {
		this.clearDebounce();
		this.historyDebounceTimer = window.setTimeout(() => {
			this.historyDebounceTimer = null;
		}, HISTORY_DEBOUNCE_MS);
	}

	/**
	 * Applies new protocol state and notifies all subscribers.
	 *
	 * @param p - The new protocol.
	 * @param label - Action label.
	 * @param context - The context of the update (input, structural, or history).
	 */
	private applyNewState(p: Protocol, label: string, context: UpdateContext) {
		this.current = {
			protocol: p,
			label: label,
			timestamp: Date.now(),
		};
		// TODO: to be removed in future
		console.debug(label);
		this.notify(context);
	}

	/**
	 * Reverts the protocol to the previous state in history.
	 */
	public undo() {
		this.clearDebounce(); // Ensure we don't finish a typing sequence after an undo
		if (this.history.length === 0) return;

		const previous = this.history.pop();
		if (previous && this.current) {
			this.future.push(this.current);
			this.current = previous;
			this.notify("history");
		}
	}

	/**
	 * Advances the protocol to the next state in the redo stack.
	 */
	public redo() {
		this.clearDebounce();
		if (this.future.length === 0) return;

		const next = this.future.pop();
		if (next && this.current) {
			this.history.push(this.current);
			this.current = next;
			this.notify("history");
		}
	}

	/**
	 * Clears the active history debounce timer.
	 */
	private clearDebounce() {
		if (this.historyDebounceTimer !== null) {
			window.clearTimeout(this.historyDebounceTimer);
			this.historyDebounceTimer = null;
		}
	}

	/**
	 * Updates the custom note text.
	 * Custom notes are tracked separately and do not affect undo/redo history.
	 *
	 * @param note - new text string for the note.
	 * @param options - Configuration options
	 * @param options.skipRender - If `true`, listeners will be notified with "input" context instead of "structural"
	 */
	public setCustomNote(note: string, options?: { skipRender: boolean }) {
		this.customNote = note;
		this.notify(options?.skipRender ? "input" : "structural");
	}

	/**
	 * Registers a callback function to be executed whenever the state changes.
	 * The listener is immediately called with the current state upon subscription.
	 *
	 * @param listener - The subscriber callback function.
	 */
	public subscribe(listener: ProtocolListener) {
		this.listeners.push(listener);
		// Emit current protocol inside the HistoryItem
		listener(
			this.current ? this.current.protocol : null,
			this.customNote,
			"structural",
		);
	}

	/**
	 * Removes a previously registered listener.
	 *
	 * @param listener - The callback function to remove.
	 */
	public unsubscribe(listener: ProtocolListener) {
		this.listeners = this.listeners.filter((l) => l !== listener);
	}

	/**
	 * Broadcasts the current state to all registered listeners.
	 *
	 * @param context - The context of why the notification was triggered.
	 */
	private notify(context: UpdateContext) {
		const p = this.current ? this.current.protocol : null;
		this.listeners.forEach((fn) => {
			fn(p, this.customNote, context);
		});
	}
}
