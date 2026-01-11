/**
 * @module
 *
 * Workspace Manager for Multi-Tab support.
 * Manages multiple ProtocolState instances.
 */
import { ProtocolState, type Listener } from "./protocolState";
import { type Protocol, type TabListener, type Tab } from "../types";


/**
 * Manages multiple OIT protocol workspaces (tabs).
 * 
 * This manager multiplexes UI listeners to the currently active ProtocolState.
 * It handles tab lifecycle events (add, close, switch), title derivation from protocol state, and enforces tab limits for unauthenticated users.
 */
export class WorkspaceManager {
  private tabs: Tab[] = [];
  private activeTabId: string;
  private listeners: Listener[] = [];
  private tabListeners: TabListener[] = [];
  private isLoggedIn: boolean = false;

  constructor() {
    // Initialize with 1 empty tab
    this.activeTabId = crypto.randomUUID();
    const initialState = new ProtocolState();
    this.tabs.push({
      id: this.activeTabId,
      state: initialState,
      title: "Untitled 1"
    });

    // Subscribe internally to the active tab to propagate events to external listeners
    this.bindToActiveTab();
  }

  /**
   * Internal listener that forwards events from the active ProtocolState to Workspace subscribers.
   * Also updates the active tab's title based on the selected Food A.
   * 
   * @param protocol - The new protocol state
   * @param note - The current custom note
   */
  private proxyListener: Listener = (protocol: Protocol | null, note: string) => {
    // Update the title of the active tab based on the protocol
    const activeTab = this.tabs.find(t => t.id === this.activeTabId);
    if (activeTab) {
      if (protocol && protocol.foodA) {
        // Truncate if too long
        activeTab.title = protocol.foodA.name.length > 20
          ? protocol.foodA.name.substring(0, 20) + "..."
          : protocol.foodA.name;
      } else {
        activeTab.title = `Untitled ${this.tabs.indexOf(activeTab) + 1}`;
      }
    }

    // Notify tab listeners because title might have changed
    this.notifyTabsListeners();

    // Propagate to external protocol listeners (e.g. table renderer)
    this.listeners.forEach(fn => fn(protocol, note));
  }

  /**
   * Binds the internal proxy listener to the currently active tab's state.
   */
  private bindToActiveTab() {
    const activeState = this.getActive();
    activeState.subscribe(this.proxyListener);
  }

  /**
   * Unbinds the internal proxy listener from the currently active tab's state.
   */
  private unbindFromActiveTab() {
    const activeState = this.getActive();
    activeState.unsubscribe(this.proxyListener);
  }

  /**
   * Subscribes a listener to changes in the *Active* protocol and note.
   * Mimics the single-tab ProtocolState.subscribe behavior.
   * 
   * @param listener - Callback function to receive protocol updates
   */
  public subscribe(listener: Listener) {
    this.listeners.push(listener);
    // Emit current state immediately
    const activeState = this.getActive();
    listener(activeState.getProtocol(), activeState.getCustomNote());
  }

  /**
   * Subscribes a listener to changes in the tab list (add/remove/switch/title).
   * 
   * @param callback - Callback function receiving the full tab list and active ID
   */
  public subscribeToTabs(callback: TabListener) {
    this.tabListeners.push(callback);
    callback(this.tabs, this.activeTabId);
  }

  /**
   * Notifies all tab listeners of a change in the tab environment.
   */
  private notifyTabsListeners() {
    this.tabListeners.forEach(cb => cb(this.tabs, this.activeTabId));
  }

  /**
   * Switches the active workspace to the tab with the specified ID.
   * Resets UI state by unbinding from the old state and binding to the new one.
   * 
   * @param id - UUID of the tab to activate
   */
  public setActive(id: string) {
    const targetTab = this.tabs.find(t => t.id === id);
    if (!targetTab || this.activeTabId === id) return;

    // Unsubscribe from old tab
    this.unbindFromActiveTab();

    // Switch
    this.activeTabId = id;

    // Subscribe to new tab (will trigger proxyListener immediately which notifies UI)
    this.bindToActiveTab();

    // Notify tab listeners of switch
    this.notifyTabsListeners();
  }

  /**
   * Adds a new empty tab to the workspace.
   * Enforces a maximum of 5 tabs and restricts multi-tab usage to logged-in users.
   */
  public addTab(): void {
    // Safety guards (enforced by UI, but kept here for state integrity)
    if (!this.isLoggedIn && this.tabs.length >= 1) {
      console.warn("Public users limited to 1 tab.");
      return;
    }
    if (this.tabs.length >= 5) {
      console.warn("Maximum 5 tabs allowed.");
      return;
    }

    // make new tab and add to Tabs then setActive
    const newId = crypto.randomUUID();
    const newState = new ProtocolState();
    this.tabs.push({
      id: newId,
      state: newState,
      title: `Untitled ${this.tabs.length + 1}`
    });

    // Switch to new tab
    this.setActive(newId);
  }

  /**
   * Closes the tab with the specified ID.
   * If the closed tab was active, another tab is activated.
   * If it was the only tab, it is reset instead of removed.
   * 
   * @param id - UUID of the tab to close
   */
  public closeTab(id: string): void {
    const index = this.tabs.findIndex(t => t.id === id);
    if (index === -1) return; // ideally this never occurs

    // If it's the only tab, reset it instead of closing.
    if (this.tabs.length === 1) {
      this.tabs[0].state.setProtocol(null, "Reset Tab");
      this.tabs[0].state.setCustomNote("", { skipRender: false });
      this.tabs[0].title = "Untitled 1";
      this.notifyTabsListeners();
      return;
    }

    // If closing active tab, switch to another.
    const isClosingActive = (id === this.activeTabId);
    if (isClosingActive) {
      // 1. Unbind from the tab we are about to destroy
      this.unbindFromActiveTab();

      // 2. Remove it
      this.tabs.splice(index, 1);

      // 3. Pick new active
      const newIndex = Math.max(0, index - 1);
      this.activeTabId = this.tabs[newIndex].id;

      // 4. Bind to new
      this.bindToActiveTab();
    } else {
      // ie the user removes a tab currently in the background
      // Just remove it
      this.tabs.splice(index, 1);
    }

    this.notifyTabsListeners();
  }

  /**
   * @returns The ProtocolState of the currently active tab.
   */
  public getActive(): ProtocolState {
    return this.tabs.find(t => t.id === this.activeTabId)!.state;
  }

  /**
   * @returns An array of all ProtocolState instances across all tabs.
   */
  public getAllProtocolStates(): ProtocolState[] {
    return this.tabs.map(t => t.state);
  }

  /**
   * @returns The full list of tab metadata objects.
   */
  public getTabs(): Tab[] {
    return this.tabs;
  }

  /**
   * Updates the workspace's internal authentication flag to enforce tab limits.
   * 
   * @param loggedIn - Current login status
   */
  public setAuth(loggedIn: boolean) {
    this.isLoggedIn = loggedIn;
  }
}
