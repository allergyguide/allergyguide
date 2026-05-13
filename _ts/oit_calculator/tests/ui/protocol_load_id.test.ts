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
});
