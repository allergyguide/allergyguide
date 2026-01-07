import type { Protocol, HistoryItem } from "../types";

type Listener = (protocol: Protocol | null, note: string) => void;

/**
 * State manager for OIT Calculator
 * Holds central state (Protocol and Custom Notes), manages Undo/Redo history stack, handles event subscriptions for UI updates
 */
export class ProtocolState {
  private MAX_HISTORY = 100;

  // History management 
  private current: HistoryItem | null = null;
  private history: HistoryItem[] = []; // Past
  private future: HistoryItem[] = [];  // Future (Redo)

  private customNote: string = "";
  private listeners: Listener[] = [];

  /**
   * @returns current Protocol object or null if not yet initialized
   */
  public getProtocol(): Protocol | null {
    return this.current ? this.current.protocol : null;
  }

  /**
   * @returns Full rich history including current state, which is *always the last element*
   */
  public getHistory(): HistoryItem[] {
    const list = [...this.history];
    if (this.current) list.push(this.current);
    return list;
  }

  public getCustomNote(): string {
    return this.customNote;
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
   */
  public setProtocol(
    p: Protocol | null,
    label: string,
    options: { addToHistory?: boolean } = { addToHistory: true }
  ) {
    // If setting null, just clear everything
    if (!p) {
      this.current = null;
      this.history = [];
      this.future = [];
      this.notify();
      return;
    }

    const newItem: HistoryItem = {
      protocol: p,
      label: label,
      timestamp: Date.now()
    };

    console.debug(label);

    if (this.current && options.addToHistory) {
      this.history.push(this.current);
      if (this.history.length > this.MAX_HISTORY) this.history.shift();
      this.future = [];
    }

    this.current = newItem;
    this.notify();
  }

  public undo() {
    if (this.history.length === 0) return;

    const previous = this.history.pop();
    if (previous && this.current) {
      this.future.push(this.current);
      this.current = previous;
      this.notify();
    }
  }

  public redo() {
    if (this.future.length === 0) return;

    const next = this.future.pop();
    if (next && this.current) {
      this.history.push(this.current);
      this.current = next;
      this.notify();
    }
  }

  /**
   * Updates the custom note content
   * Note custom note is tracked separately from the Protocol object; excluded from undo/redo history 
   *
   * @param note - new text string for the note.
   * @param options - Configuration options
   * @param options.skipRender - If `true`, listeners will NOT be notified of this change 
   */
  public setCustomNote(note: string, options?: { skipRender: boolean }) {
    this.customNote = note;
    if (!options?.skipRender) this.notify();
  }

  public subscribe(listener: Listener) {
    this.listeners.push(listener);
    // Emit current protocol inside the HistoryItem
    listener(this.current ? this.current.protocol : null, this.customNote);
  }

  private notify() {
    const p = this.current ? this.current.protocol : null;
    this.listeners.forEach(fn => fn(p, this.customNote));
  }
}
