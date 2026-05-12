import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, html } from "lit-html";
import { activeSafe } from "../../../ui/directives/activeSafe";
import Decimal from "decimal.js";

describe("activeSafe directive", () => {
	let container: HTMLDivElement;

	beforeEach(() => {
		container = document.createElement("div");
		document.body.appendChild(container);
	});

	afterEach(() => {
		document.body.removeChild(container);
	});

	it("should set the initial value", () => {
		render(html`<input ${activeSafe("1.0")}>`, container);
		const input = container.querySelector("input")!;
		expect(input.value).toBe("1.0");
	});

	it("should update the value if mathematically different", () => {
		const t = (val: any) => html`<input ${activeSafe(val)}>`;
		render(t("1.0"), container);
		const input = container.querySelector("input")!;

		render(t("2.0"), container);
		expect(input.value).toBe("2.0");
	});

	it("should NOT update the value if mathematically equivalent and focused", () => {
		const t = (val: any) => html`<input ${activeSafe(val)}>`;
		render(t("1.0"), container);
		const input = container.querySelector("input")!;

		// In JSDOM, we need to explicitly focus
		input.focus();
		expect(document.activeElement).toBe(input);

		input.value = "1."; // User is typing "1.0" but has only typed "1."

		// Trigger a re-render with state "1.0"
		render(t("1.0"), container);

		// It should NOT have overwritten the user's "1." because "1." is mathematically equal to "1.0"
		expect(input.value).toBe("1.");
	});

	it("should update the value even if mathematically equivalent if NOT focused", () => {
		const t = (val: any) => html`<input ${activeSafe(val)}>`;
		// This handles cases like an Undo action while focused on another field
		render(t("1.0"), container);
		const input = container.querySelector("input")!;
		input.value = "1.";

		// Ensure not focused
		input.blur();
		expect(document.activeElement).not.toBe(input);

		render(t("1.0"), container);
		expect(input.value).toBe("1.0");
	});

	it("should apply formatting on blur", () => {
		const formatter = (v: any) => new Decimal(v).toFixed(1);
		const t = (val: any) => html`<input ${activeSafe(val, formatter)}>`;
		render(t(1), container);
		const input = container.querySelector("input")!;

		expect(input.value).toBe("1.0");

		input.focus();
		input.value = "1.23"; // User types something messy

		// Simulate blur event
		input.dispatchEvent(new Event("blur"));

		// It should have snapped back to "1.0" (the formatted state value)
		expect(input.value).toBe("1.0");
	});

	it("should preserve invalid input while focused to avoid interrupting the user", () => {
		const t = (val: any) => html`<input ${activeSafe(val)}>`;
		render(t("1.0"), container);
		const input = container.querySelector("input")!;

		input.focus();
		input.value = "abc"; // Garbage

		// Re-render with valid state
		render(t("1.0"), container);

		// Should NOT have overwritten garbage while focused
		expect(input.value).toBe("abc");

		// Should still cleanup on blur
		input.dispatchEvent(new Event("blur"));
		expect(input.value).toBe("1.0");
	});

	it('should NOT overwrite intermediate characters (like ".") while focused', () => {
		const t = (val: any) => html`<input ${activeSafe(val)}>`;
		render(t("0"), container);
		const input = container.querySelector("input")!;

		input.focus();
		input.value = "."; // User types just a dot

		// Re-render with state "0"
		render(t("0"), container);

		// It should NOT have overwritten the user's "." with "0"
		expect(input.value).toBe(".");
	});

	it('should NOT overwrite intermediate characters (like "-") while focused', () => {
		const t = (val: any) => html`<input ${activeSafe(val)}>`;
		render(t("0"), container);
		const input = container.querySelector("input")!;

		input.focus();
		input.value = "-"; // User types just a minus

		// Re-render with state "0"
		render(t("0"), container);

		// It should NOT have overwritten the user's "-" with "0"
		expect(input.value).toBe("-");
	});

	it("should respect custom formatter precision", () => {
		// Liquid format: 1 decimal place
		const liquidFormatter = (v: any) => new Decimal(v).toFixed(1);
		// Solid format: 2 decimal places
		const solidFormatter = (v: any) => new Decimal(v).toFixed(2);

		const t = (val: any, fmt: any) => html`<input ${activeSafe(val, fmt)}>`;

		render(t(1.234, liquidFormatter), container);
		let input = container.querySelector("input")!;
		expect(input.value).toBe("1.2");

		render(t(1.234, solidFormatter), container);
		input = container.querySelector("input")!;
		expect(input.value).toBe("1.23");
	});
});
