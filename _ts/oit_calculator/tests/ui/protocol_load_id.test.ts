import { beforeEach, describe, expect, it } from "vitest";
import { workspace } from "../../state/instances";
import { selectProtocol } from "../../ui/actions";
import { SAMPLE_PROTOCOL } from "../../utils";

describe("Protocol Loading ID Injection", () => {
	beforeEach(() => {
		workspace.getActive().setProtocol(null, "Reset");
	});

	it("should inject UUIDs when loading a protocol from ProtocolData (template)", () => {
		selectProtocol(SAMPLE_PROTOCOL);
		const protocol = workspace.getActive().getProtocol();
		expect(protocol).not.toBeNull();
		if (protocol) {
			expect(protocol.steps.length).toBeGreaterThan(0);
			protocol.steps.forEach((step) => {
				expect(step.id).toBeDefined();
				expect(step.id).toMatch(/^[0-9a-f-]{36}$/i);
			});
		}
	});

	it("replaces the previous note and keeps a Food B threshold of 0", () => {
		const tab = workspace.getActive();
		tab.setCustomNote("old patient note");
		const { custom_note: _, ...noNote } = SAMPLE_PROTOCOL;

		selectProtocol({ ...noNote, food_b_threshold: 0 });

		expect(tab.getCustomNote()).toBe("");
		expect(tab.getProtocol()?.foodBThreshold?.amount.toString()).toBe("0");
	});
});
