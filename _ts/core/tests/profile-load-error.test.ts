import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "../api/supabase";
import { lockAndSignOut } from "../auth/login-client";
import { handleProfileLoadError } from "../auth/profile-load-error";
import { renderAuthUI } from "../ui/auth-modals";

vi.mock("../api/supabase", () => ({
	supabase: { auth: { getSession: vi.fn() } },
}));
vi.mock("../auth/login-client", () => ({ lockAndSignOut: vi.fn() }));
vi.mock("../ui/auth-modals", () => ({ renderAuthUI: vi.fn() }));

const httpError = (statusCode: number) =>
	Object.assign(new Error("x"), { statusCode });

describe("handleProfileLoadError", () => {
	const retry = vi.fn();
	const setAuthState = vi.fn();

	beforeEach(() => {
		vi.mocked(supabase.auth.getSession).mockResolvedValue({
			data: { session: { user: { email: "user@example.com" } } },
		} as never);
	});

	it.each([
		[httpError(401), true, "session has expired"],
		[httpError(403), true, "lacks access to the Tool"],
		[httpError(503), false, "Server error"],
		[new TypeError("Failed to fetch"), false, "Network"],
		[new SyntaxError("bad JSON"), false, "unexpected error"],
	])("%s: signs out=%s, message has %s", async (err, signsOut, text) => {
		await handleProfileLoadError(err, "the Tool", setAuthState, retry);
		expect(vi.mocked(lockAndSignOut).mock.calls.length > 0).toBe(signsOut);
		expect(setAuthState).toHaveBeenCalledWith(
			!signsOut,
			signsOut ? null : "user@example.com",
		);
		expect(renderAuthUI).toHaveBeenCalledWith(
			"LOGIN",
			retry,
			expect.stringContaining(text),
		);
	});
});
