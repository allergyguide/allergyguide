/**
 * @module
 * State management for the active protocol, including history (undo/redo).
 */
import { HISTORY_DEBOUNCE_MS } from "../constants";
import type {
	HistoryItem,
	Protocol,
	ProtocolListener,
	UpdateContext,
} from "../types";

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
	 * @returns true if there is history available to undo.
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
	 */
	public setProtocol(
		p: Protocol | null,
		label: string,
		options?: { addToHistory?: boolean; debounceHistory?: boolean },
	) {
		const addToHistory = options?.addToHistory ?? true;
		const debounceHistory = options?.debounceHistory ?? false;

		if (!p) {
			this.clearAll();
			return;
		}

		if (addToHistory) {
			this.manageHistoryPush(debounceHistory);
			this.future = [];
		}

		this.applyNewState(p, label, debounceHistory ? "input" : "structural");
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
	 * @param options.skipRender - If `true`, listeners will NOT be notified of this change
	 */
	public setCustomNote(note: string, options?: { skipRender: boolean }) {
		this.customNote = note;
		if (!options?.skipRender) this.notify("structural");
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
