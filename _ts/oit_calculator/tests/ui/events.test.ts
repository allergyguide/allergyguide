import { beforeEach, describe, expect, it, vi } from "vitest";
import { workspace } from "../../state/instances";
import { attachKeyboardShortcuts } from "../../ui/events";

describe("UI Events: Keyboard Shortcuts", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
		document.body.style.overflow = "";
		vi.clearAllMocks();

		// Reset workspace and active tab
		const activeTab = workspace.getActive();
		activeTab.setProtocol(null, "Reset");
	});

	it("should block undo/redo when body overflow is hidden (modal open)", () => {
		const activeTab = workspace.getActive();
		const undoSpy = vi.spyOn(activeTab, "undo");
		const redoSpy = vi.spyOn(activeTab, "redo");

		// Attach shortcuts if not already attached (this is a bit hacky as it might double attach)
		attachKeyboardShortcuts();

		// Simulate modal open
		document.body.style.overflow = "hidden";

		// Trigger Ctrl+Z
		const event = new KeyboardEvent("keydown", {
			key: "z",
			ctrlKey: true,
			bubbles: true,
		});
		document.dispatchEvent(event);

		expect(undoSpy).not.toHaveBeenCalled();

		// Trigger Ctrl+Shift+Z
		const redoEvent = new KeyboardEvent("keydown", {
			key: "z",
			ctrlKey: true,
			shiftKey: true,
			bubbles: true,
		});
		document.dispatchEvent(redoEvent);

		expect(redoSpy).not.toHaveBeenCalled();
	});

	it("should allow undo/redo when body overflow is NOT hidden", () => {
		const activeTab = workspace.getActive();
		const undoSpy = vi.spyOn(activeTab, "undo");

		// Attach shortcuts
		attachKeyboardShortcuts();

		// Ensure body is clean
		document.body.style.overflow = "";

		// Trigger Ctrl+Z
		const event = new KeyboardEvent("keydown", {
			key: "z",
			ctrlKey: true,
			bubbles: true,
		});
		document.dispatchEvent(event);

		expect(undoSpy).toHaveBeenCalled();
	});
});
