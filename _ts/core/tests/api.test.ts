// _ts/core/tests/api.test.ts

import { describe, expect, it, vi } from "vitest";

// Mock @supabase/ssr
vi.mock("@supabase/ssr", () => ({
	createBrowserClient: vi.fn().mockReturnValue({ auth: {} }),
}));

describe("API Module: Supabase", () => {
	it("should initialize supabase client", async () => {
		const { supabase } = await import("../api/supabase");
		const { createBrowserClient } = await import("@supabase/ssr");

		expect(supabase).toBeDefined();
		expect(createBrowserClient).toHaveBeenCalledWith(
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
