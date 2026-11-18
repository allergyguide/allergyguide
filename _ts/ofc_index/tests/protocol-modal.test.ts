import { render } from "lit-html";
import { afterEach, describe, expect, it } from "vitest";
import { calculateSteps, proteinPerGram } from "../core/calculations";
import { appState } from "../state/state";
import { FoodType, SourceType } from "../types";
import {
	formatProtocolText,
	protocolModalTemplate,
} from "../ui/protocol-modal";

describe("protocol modal serving size input", () => {
	let unsubscribe: () => void = () => {};

	afterEach(() => {
		unsubscribe();
		appState.setSelectedFood(null);
		document.body.innerHTML = "";
	});

	it("keeps a cleared box empty and flags it, so retyping 250 gives 250 (not 1250)", () => {
		const container = document.createElement("div");
		document.body.appendChild(container);
		appState.setSelectedFood({
			name: "Peanut",
			gramsInServing: 25,
			servingSize: 100,
			type: FoodType.SOLID,
			group: "Legumes",
			source: SourceType.GENERIC,
		});
		unsubscribe = appState.subscribe((s) =>
			render(protocolModalTemplate(s), container),
		);

		const input = container.querySelector(
			"#ofc-modal-serving",
		) as HTMLInputElement;
		input.focus();

		input.value = "";
		input.dispatchEvent(new Event("input"));
		expect(input.value).toBe("");
		expect(appState.getState().modalServingSize).toBe(0);
		expect(container.textContent).toContain("Serving size must be above zero.");
		for (const btn of container.querySelectorAll(".ofc-copy-btn")) {
			expect((btn as HTMLButtonElement).disabled).toBe(true);
		}

		input.value = "250";
		input.dispatchEvent(new Event("input"));
		expect(input.value).toBe("250");
		expect(appState.getState().modalServingSize).toBe(250);
	});

	it("uses a fractional serving size as typed (0.5 is not rounded up to 1)", () => {
		const container = document.createElement("div");
		document.body.appendChild(container);
		appState.setSelectedFood({
			name: "Milk",
			gramsInServing: 0.2,
			servingSize: 1,
			type: FoodType.LIQUID,
			group: "Dairy",
			source: SourceType.GENERIC,
		});
		unsubscribe = appState.subscribe((s) =>
			render(protocolModalTemplate(s), container),
		);

		const input = container.querySelector(
			"#ofc-modal-serving",
		) as HTMLInputElement;
		input.focus();
		input.value = "0.5";
		input.dispatchEvent(new Event("input"));

		expect(appState.getState().modalServingSize).toBe(0.5);
		expect(container.textContent).not.toContain(
			"Protein exceeds serving size.",
		);
	});
});

describe("formatProtocolText", () => {
	const peanut = {
		name: "Peanut",
		gramsInServing: 25,
		servingSize: 100,
		type: FoodType.SOLID,
		group: "Legumes",
		source: SourceType.GENERIC,
	};

	it("copies an edited fractional dose exactly as shown (2.75 mg is not rounded to 2.8)", () => {
		const steps = calculateSteps([2.75, 10], proteinPerGram(25, 100), "g");
		const text = formatProtocolText(peanut, steps, 25, 100);

		expect(text).toContain("Food challenge: Peanut (25 g per 100 g)");
		expect(text).toContain("Step 1: 0.01 g (2.75 mg protein; 2.75 mg total)");
		expect(text).toContain("Step 2: 0.04 g (10 mg protein; 12.75 mg total)");
	});
});

describe("protocol dialog", () => {
	let unsubscribe: () => void = () => {};

	afterEach(() => {
		unsubscribe();
		appState.setSelectedFood(null);
		document.body.innerHTML = "";
	});

	function openModal(): HTMLElement {
		const container = document.createElement("div");
		document.body.appendChild(container);
		appState.setSelectedFood({
			name: "Peanut",
			gramsInServing: 25,
			servingSize: 100,
			type: FoodType.SOLID,
			group: "Legumes",
			source: SourceType.GENERIC,
		});
		unsubscribe = appState.subscribe((s) =>
			render(protocolModalTemplate(s), container),
		);
		return container.querySelector(".ofc-modal") as HTMLElement;
	}

	it("is a labelled modal dialog with a labelled close button", () => {
		const modal = openModal();
		expect(modal.getAttribute("role")).toBe("dialog");
		expect(modal.getAttribute("aria-modal")).toBe("true");
		expect(modal.getAttribute("aria-label")).toContain("Peanut");
		expect(
			modal.querySelector(".ofc-modal-close")?.getAttribute("aria-label"),
		).toBe("Close protocol");
	});

	it("closes on Escape pressed inside the dialog", () => {
		const modal = openModal();
		modal.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
		);
		expect(appState.getState().selectedFood).toBeNull();
	});

	it("wraps Tab from the last control back to the first", () => {
		const modal = openModal();
		const focusable = modal.querySelectorAll<HTMLElement>(
			"button:not([disabled]), input:not([disabled]), a[href]",
		);
		const last = focusable[focusable.length - 1];
		last.focus();
		modal.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Tab", bubbles: true }),
		);
		expect(document.activeElement).toBe(focusable[0]);
	});

	it("marks inputs invalid and announces the warning when protein exceeds serving", () => {
		const modal = openModal();
		appState.setModalGramsInServing(200);
		const protein = modal.querySelector("#ofc-modal-protein") as HTMLElement;
		expect(protein.getAttribute("aria-invalid")).toBe("true");
		expect(protein.getAttribute("aria-describedby")).toBe("ofc-modal-warning");
		expect(
			modal.querySelector("#ofc-modal-warning")?.getAttribute("role"),
		).toBe("alert");
	});
});
