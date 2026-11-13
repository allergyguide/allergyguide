import { render } from "lit-html";
import { afterEach, describe, expect, it } from "vitest";
import { appState } from "../state/state";
import { FoodType, SourceType } from "../types";
import { protocolModalTemplate } from "../ui/protocol-modal";

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
