import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkspaceManager } from '../../state/workspaceManager';
import { ProtocolState } from '../../state/protocolState';

describe('State: WorkspaceManager', () => {
  let manager: WorkspaceManager;

  beforeEach(() => {
    manager = new WorkspaceManager();
  });

  describe('Initialization', () => {
    it('should start with 1 "Untitled 1" tab', () => {
      const tabs = manager.getTabs();
      expect(tabs.length).toBe(1);
      expect(tabs[0].title).toBe("Untitled 1");
      expect(manager.getActive()).toBeInstanceOf(ProtocolState);
    });
  });

  describe('Tab Management (Add/Remove)', () => {
    it('should add a new tab and switch to it (Logged In)', () => {
      manager.setAuth(true); // Simulate login
      manager.addTab();

      const tabs = manager.getTabs();
      expect(tabs.length).toBe(2);
      expect(tabs[1].title).toBe("Untitled 2");
      
      // Should switch active to new tab
      expect(manager.getActive()).toBe(tabs[1].state);
    });

    it('should enforce 5 tab limit', () => {
      manager.setAuth(true);
      // Add 4 more (Total 5)
      manager.addTab();
      manager.addTab();
      manager.addTab();
      manager.addTab(); 
      expect(manager.getTabs().length).toBe(5);

      // Attempt 6th
      manager.addTab();
      expect(manager.getTabs().length).toBe(5);
    });

    it('should prevent public users from adding tabs', () => {
      manager.setAuth(false); // Public
      manager.addTab();
      expect(manager.getTabs().length).toBe(1);
    });

    it('should close a background tab', () => {
      manager.setAuth(true);
      manager.addTab(); // Tab 2 (Active)
      manager.addTab(); // Tab 3 (Active)
      
      // Capture references before mutation
      const allTabs = [...manager.getTabs()]; // Shallow copy
      const tab1Id = allTabs[0].id;
      const tab2Id = allTabs[1].id; // The one to close
      const tab3State = allTabs[2].state; // The active one

      manager.closeTab(tab2Id);

      const currentTabs = manager.getTabs();
      expect(currentTabs.length).toBe(2);
      
      // Active should remain Tab 3 (which was active)
      expect(manager.getActive()).toBe(tab3State);
      
      // Tab 1 should still exist at index 0
      expect(currentTabs[0].id).toBe(tab1Id);
      // Tab 2 should be gone, so index 1 should now be Tab 3
      expect(currentTabs[1].state).toBe(tab3State);
    });

    it('should switch to previous tab when closing active tab', () => {
      manager.setAuth(true);
      manager.addTab(); // Tab 2 (Active)
      
      const tabs = manager.getTabs();
      const tab1Id = tabs[0].id;
      const tab2Id = tabs[1].id;

      // Close Active (Tab 2)
      manager.closeTab(tab2Id);

      expect(manager.getTabs().length).toBe(1);
      expect(manager.getTabs()[0].id).toBe(tab1Id);
      // Active should be Tab 1
      expect(manager.getActive()).toBe(tabs[0].state);
    });

    it('should reset (not remove) the last remaining tab', () => {
      manager.setAuth(true);
      const tabs = manager.getTabs();
      const tab1Id = tabs[0].id;

      // Dirty the state
      manager.getActive().setCustomNote("Dirty Note");
      expect(manager.getActive().getCustomNote()).toBe("Dirty Note");

      // Close the only tab
      manager.closeTab(tab1Id);

      expect(manager.getTabs().length).toBe(1);
      // ID should persist (or state reset) - implementation keeps ID but resets state
      expect(manager.getTabs()[0].id).toBe(tab1Id);
      expect(manager.getActive().getCustomNote()).toBe("");
    });

    it('should return all protocol states', () => {
      manager.setAuth(true);
      manager.addTab(); // Tab 2

      const states = manager.getAllProtocolStates();
      expect(states.length).toBe(2);
      expect(states[0]).toBeInstanceOf(ProtocolState);
      expect(states[1]).toBeInstanceOf(ProtocolState);
      expect(states[0]).not.toBe(states[1]);
    });

    it('should switch to the remaining tab if closing the first tab (index 0) when it is active', () => {
      manager.setAuth(true);
      manager.addTab(); // Tab 2 is active (Index 1)

      const tabs = manager.getTabs();
      const t1 = tabs[0];
      const t2 = tabs[1];

      // Switch back to Tab 1
      manager.setActive(t1.id);

      // Close Tab 1 (Active)
      manager.closeTab(t1.id);

      // Should remove Tab 1, Tab 2 becomes Tab 1 (Index 0) and Active
      expect(manager.getTabs().length).toBe(1);
      expect(manager.getActive()).toBe(t2.state);
      expect(manager.getTabs()[0].id).toBe(t2.id);
    });
  });

  describe('Listeners & Proxy', () => {
    it('should proxy events from the active tab only', () => {
      manager.setAuth(true);
      const listener = vi.fn();
      manager.subscribe(listener);

      // Initial emit
      expect(listener).toHaveBeenCalledTimes(1);

      // Change Tab 1 State -> Should Fire
      manager.getActive().setCustomNote("Note 1");
      expect(listener).toHaveBeenCalledWith(null, "Note 1");

      // Add Tab 2
      manager.addTab();
      // Listener fires immediately on switch
      expect(listener).toHaveBeenLastCalledWith(null, ""); 

      // Change Tab 2 State -> Should Fire
      manager.getActive().setCustomNote("Note 2");
      expect(listener).toHaveBeenLastCalledWith(null, "Note 2");

      // Switch back to Tab 1
      manager.setActive(manager.getTabs()[0].id);
      // Listener fires with Tab 1 state
      expect(listener).toHaveBeenLastCalledWith(null, "Note 1");
    });

    it('should update tab titles via proxy listener', () => {
      manager.setAuth(true);
      const tabs = manager.getTabs();
      
      // Mock protocol update
      const mockProtocol: any = { 
        foodA: { name: "Peanut" }, 
        steps: [] 
      };
      
      manager.getActive().setProtocol(mockProtocol, "Set Protocol");
      
      expect(tabs[0].title).toBe("Peanut");
    });
  });
});
