// _ts/core/tests/api.test.ts

import { describe, expect, it, vi } from "vitest";

// Mock @supabase/supabase-js
vi.mock("@supabase/supabase-js", () => ({
	createClient: vi.fn().mockReturnValue({ auth: {} }),
}));

describe("API Module: Supabase", () => {
	it("should initialize supabase client", async () => {
		const { supabase } = await import("../api/supabase");
		const { createClient } = await import("@supabase/supabase-js");

		expect(supabase).toBeDefined();
		expect(createClient).toHaveBeenCalledWith(
			"https://mock-testing-url.supabase.co",
			"mock-publishable-key",
			expect.any(Object),
		);
	});

	it("should log error if global vars are missing", async () => {
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		// Temporarily delete globals
		const oldUrl = (globalThis as any).__SUPABASE_URL__;
		(globalThis as any).__SUPABASE_URL__ = undefined;

		// Reset modules and re-import
		vi.resetModules();
		await import("../api/supabase");

		expect(consoleSpy).toHaveBeenCalledWith(
			"Supabase URL / publishable key are missing.",
		);

		// Restore
		(globalThis as any).__SUPABASE_URL__ = oldUrl;
		consoleSpy.mockRestore();
	});
});
