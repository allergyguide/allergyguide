import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "../api/supabase";
import {
	lockAndSignOut,
	loginAndUnlock,
	unlockVault,
} from "../auth/login-client";
import { renderAuthUI } from "../ui/auth-modals";

// Mock Supabase
vi.mock("../api/supabase", () => ({
	supabase: {
		auth: {
			getSession: vi.fn(),
		},
	},
}));

// Mock login-client
vi.mock("../auth/login-client", () => ({
	loginAndUnlock: vi.fn(),
	unlockVault: vi.fn(),
	lockAndSignOut: vi.fn(),
	prefetchSalts: vi.fn(),
}));

describe("UI Module: Auth Modals", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		document.body.innerHTML = '<div id="auth-modal-mount"></div>';

		// Mock global turnstile
		(globalThis as any).turnstile = {
			render: vi.fn().mockReturnValue("widget-id"),
			remove: vi.fn(),
			reset: vi.fn(),
			getResponse: vi.fn().mockReturnValue("mock-token"),
		};
	});

	it("renderAuthUI('LOGIN') should render login template and init turnstile", async () => {
		renderAuthUI("LOGIN", async () => {});

		const mount = document.getElementById("auth-modal-mount");
		expect(mount?.innerHTML).toContain("Custom Access");
		expect(mount?.innerHTML).toContain('id="turnstile-widget"');

		// renderTurnstile is called via setTimeout
		await vi.waitFor(() => {
			expect((globalThis as any).turnstile.render).toHaveBeenCalled();
		});
	});

	it("should log error if turnstile render fails", async () => {
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		(globalThis as any).turnstile.render.mockImplementationOnce(() => {
			throw new Error("Render Fail");
		});

		renderAuthUI("LOGIN", async () => {});

		await vi.waitFor(() => {
			expect(consoleSpy).toHaveBeenCalledWith(
				"Failed to render Turnstile:",
				expect.any(Error),
			);
		});
		consoleSpy.mockRestore();
	});

	it("renderAuthUI('UNLOCK') should render unlock template with user email", async () => {
		(supabase.auth.getSession as any).mockResolvedValue({
			data: { session: { user: { email: "test@example.com" } } },
		});

		renderAuthUI("UNLOCK", async () => {});

		await vi.waitFor(() => {
			const mount = document.getElementById("auth-modal-mount");
			expect(mount?.innerHTML).toContain("test@example.com");
			expect(mount?.innerHTML).toContain('id="unlock-password"');
		});
	});

	it("renderAuthUI('HIDDEN') should clear the mount node", () => {
		// First render something
		renderAuthUI("LOGIN", async () => {});
		expect(document.getElementById("auth-modal-mount")?.innerHTML).not.toBe("");

		renderAuthUI("HIDDEN");
		// Lit renders a comment for 'nothing'
		const html = document
			.getElementById("auth-modal-mount")
			?.innerHTML.replace("<!---->", "");
		expect(html).toBe("");
	});

	it("login form submission should call loginAndUnlock", async () => {
		const onSuccess = vi.fn();
		renderAuthUI("LOGIN", onSuccess);

		await vi.waitFor(() =>
			expect((globalThis as any).turnstile.render).toHaveBeenCalled(),
		);

		const form = document.querySelector("form");
		const emailInput = document.getElementById(
			"login-email",
		) as HTMLInputElement;
		const pwdInput = document.getElementById(
			"login-password",
		) as HTMLInputElement;

		emailInput.value = "test@example.com";
		pwdInput.value = "password";

		form?.dispatchEvent(
			new Event("submit", { bubbles: true, cancelable: true }),
		);

		expect(loginAndUnlock).toHaveBeenCalledWith(
			"test@example.com",
			"password",
			"mock-token",
		);

		// Wait for onSuccess (it's async in the submit handler)
		await vi.waitFor(() => expect(onSuccess).toHaveBeenCalled());
	});

	it("login form submission should show error on failure and reset turnstile", async () => {
		renderAuthUI("LOGIN", async () => {});
		await vi.waitFor(() =>
			expect((globalThis as any).turnstile.render).toHaveBeenCalled(),
		);

		const form = document.querySelector("form");
		(loginAndUnlock as any).mockRejectedValue(new Error("Network Error"));

		form?.dispatchEvent(
			new Event("submit", { bubbles: true, cancelable: true }),
		);

		await vi.waitFor(() => {
			expect(
				document.querySelector(".core-auth-error-message")?.textContent,
			).toBe("Network Error");
			expect((globalThis as any).turnstile.reset).toHaveBeenCalledWith(
				"widget-id",
			);
		});
	});

	it("unlock form submission should show error on incorrect password and stay in UNLOCK state", async () => {
		(supabase.auth.getSession as any).mockResolvedValue({
			data: { session: { user: { email: "test@example.com" } } },
		});
		const onSuccess = vi.fn();
		renderAuthUI("UNLOCK", onSuccess);

		await vi.waitFor(() => {
			const input = document.getElementById("unlock-password");
			if (!input) throw new Error("not ready");
		});

		const form = document.querySelector("form");
		(unlockVault as any).mockResolvedValue(false);

		form?.dispatchEvent(new Event("submit"));

		await vi.waitFor(() => {
			expect(
				document.querySelector(".core-auth-error-message")?.textContent,
			).toBe("Incorrect password.");
			// Verify that we are still in UNLOCK state (the password input still exists)
			expect(document.getElementById("unlock-password")).not.toBeNull();
		});
	});

	it("Escape key should close LOGIN modal", () => {
		renderAuthUI("LOGIN", async () => {});

		const event = new KeyboardEvent("keydown", { key: "Escape" });
		document.dispatchEvent(event);

		const html = document
			.getElementById("auth-modal-mount")
			?.innerHTML.replace("<!---->", "");
		expect(html).toBe("");
	});

	it("Escape key should call lockAndSignOut for UNLOCK modal", () => {
		// Mock getSession for renderAuthUI internal call
		(supabase.auth.getSession as any).mockResolvedValue({
			data: { session: { user: { email: "test@example.com" } } },
		});

		renderAuthUI("UNLOCK", async () => {});

		const event = new KeyboardEvent("keydown", { key: "Escape" });
		document.dispatchEvent(event);

		expect(lockAndSignOut).toHaveBeenCalled();
	});
});
