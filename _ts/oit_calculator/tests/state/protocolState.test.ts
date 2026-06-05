import Decimal from "decimal.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProtocolState } from "../../state/protocolState";
import { DosingStrategy, FoodAStrategy, FoodType, SourceType } from "../../types";

describe("State: ProtocolState", () => {
	let state: ProtocolState;

	const mockProtocol = (name: string) => ({
		source: SourceType.USER,
		dosingStrategy: DosingStrategy.STANDARD,
		foodA: {
			name,
			type: FoodType.SOLID,
			gramsInServing: new Decimal(1),
			servingSize: new Decimal(100),
			source: SourceType.GENERIC,
			getMgPerUnit: () => new Decimal(10),
		},
		foodAStrategy: FoodAStrategy.DILUTE_INITIAL,
		diThreshold: new Decimal(0.5),
		steps: [],
		config: {} as any,
	});

	beforeEach(() => {
		state = new ProtocolState();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should update state immediately", () => {
		const p = mockProtocol("P1");
		state.setProtocol(p, "Action 1");
		expect(state.getProtocol()).toBe(p);
	});

	it("should push to history immediately when not debounced", () => {
		const p1 = mockProtocol("P1");
		const p2 = mockProtocol("P2");
		state.setProtocol(p1, "Action 1");
		state.setProtocol(p2, "Action 2");

		expect(state.getProtocol()).toBe(p2);
		expect(state.getCanUndo()).toBe(true);

		state.undo();
		expect(state.getProtocol()).toBe(p1);
	});

	it("should debounce history pushing", () => {
		const p1 = mockProtocol("P1");
		const p2 = mockProtocol("P2");
		const p3 = mockProtocol("P3");

		state.setProtocol(p1, "Initial"); // Not debounced

		// Start debounced sequence
		state.setProtocol(p2, "Typing 1", { debounceHistory: true });
		// Should have pushed p1 to history
		expect(state.getHistory().length).toBe(2); // [p1, p2]

		state.setProtocol(p3, "Typing 2", { debounceHistory: true });
		// Should NOT have pushed p2 to history yet
		expect(state.getHistory().length).toBe(2); // [p1, p3]

		// Advance time
		vi.advanceTimersByTime(500); // Default is 300ms

		const p4 = mockProtocol("P4");
		state.setProtocol(p4, "New Action", { debounceHistory: true });
		// Now it should have pushed p3 to history
		expect(state.getHistory().length).toBe(3); // [p1, p3, p4]
	});

	it("should clear redo stack on new action", () => {
		state.setProtocol(mockProtocol("P1"), "A1");
		state.setProtocol(mockProtocol("P2"), "A2");
		state.undo();
		expect(state.getCanRedo()).toBe(true);

		state.setProtocol(mockProtocol("P3"), "A3");
		expect(state.getCanRedo()).toBe(false);
	});

	it("should emit correct contexts for different actions", () => {
		const listener = vi.fn();
		state.subscribe(listener);
		// Initial emit
		expect(listener).toHaveBeenLastCalledWith(null, "", "structural");

		state.setProtocol(mockProtocol("P1"), "Initial", {
			debounceHistory: false,
		});
		expect(listener).toHaveBeenLastCalledWith(
			expect.anything(),
			"",
			"structural",
		);

		state.setProtocol(mockProtocol("P2"), "Typing", { debounceHistory: true });
		expect(listener).toHaveBeenLastCalledWith(expect.anything(), "", "input");

		state.undo();
		expect(listener).toHaveBeenLastCalledWith(expect.anything(), "", "history");

		state.redo();
		expect(listener).toHaveBeenLastCalledWith(expect.anything(), "", "history");
	});

	it("should manage savingFoodKey state", () => {
		const listener = vi.fn();
		state.subscribe(listener);

		expect(state.getSavingFoodKey()).toBeNull();

		state.setSavingFoodKey("A");
		expect(state.getSavingFoodKey()).toBe("A");
		expect(listener).toHaveBeenLastCalledWith(
			state.getProtocol(),
			"",
			"structural",
		);

		state.setSavingFoodKey(null);
		expect(state.getSavingFoodKey()).toBeNull();
	});
});
