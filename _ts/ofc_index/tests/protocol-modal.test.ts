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

	it("does not refill a cleared box with 1, so retyping 250 gives 250 (not 1250)", () => {
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
		expect(appState.getState().modalServingSize).toBe(1);

		input.value = "250";
		input.dispatchEvent(new Event("input"));
		expect(input.value).toBe("250");
		expect(appState.getState().modalServingSize).toBe(250);
	});
});
