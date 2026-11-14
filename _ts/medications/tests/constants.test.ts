import { afterEach, describe, expect, it, vi } from "vitest";
import { getSavedProvince, saveProvince } from "../constants";

describe("province storage", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		localStorage.clear();
	});

	it("round-trips a known province", () => {
		saveProvince("ON");
		expect(getSavedProvince()).toBe("ON");
	});

	it("falls back to All for an unknown saved value", () => {
		localStorage.setItem("med-province", "Ontario");
		expect(getSavedProvince()).toBe("All");
	});

	it("does not throw when storage is blocked", () => {
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new DOMException("blocked", "SecurityError");
		});
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new DOMException("blocked", "SecurityError");
		});
		expect(getSavedProvince()).toBe("All");
		expect(() => saveProvince("BC")).not.toThrow();
	});
});
