// _ts/core/tests/auth.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "../api/supabase";
import {
	determineVaultState,
	getActiveDEK,
	lockAndSignOut,
	loginAndUnlock,
	unlockVault,
} from "../auth/login-client";
import { requestDekFromTabs } from "../auth/tab-sync";

// Mock Supabase
vi.mock("../api/supabase", () => ({
	supabase: {
		auth: {
			getSession: vi.fn(),
			signInWithPassword: vi.fn(),
			signOut: vi.fn(),
			onAuthStateChange: vi.fn(),
			updateUser: vi.fn(),
		},
		rpc: vi.fn(),
		from: vi.fn(() => ({
			select: vi.fn(() => ({
				eq: vi.fn(() => ({
					single: vi.fn(),
				})),
			})),
			upsert: vi.fn(),
		})),
	},
}));

// Mock Tab Sync
vi.mock("../auth/tab-sync", () => ({
	requestDekFromTabs: vi.fn(),
}));

// Helper to generate a valid 32-byte key in base64
function generateValidDekB64() {
	const bytes = new Uint8Array(32).fill(1);
	const binary = String.fromCharCode(...bytes);
	return btoa(binary);
}

describe("Auth Module: Login Client", () => {
	beforeEach(async () => {
		sessionStorage.clear();
		(supabase.auth.signOut as any).mockResolvedValue({ error: null });
		await lockAndSignOut(null); // Reset activeDEK and sessionStorage
		vi.clearAllMocks();
	});

	describe("determineVaultState", () => {
		it("should return UNAUTHENTICATED if no session", async () => {
			(supabase.auth.getSession as any).mockResolvedValue({
				data: { session: null },
			});

			const state = await determineVaultState();
			expect(state).toBe("UNAUTHENTICATED");
		});

		it("should return LOCKED if session exists but no DEK", async () => {
			(supabase.auth.getSession as any).mockResolvedValue({
				data: {
					session: { user: { id: "user-123", email: "test@example.com" } },
				},
			});
			(requestDekFromTabs as any).mockResolvedValue(false);

			const state = await determineVaultState();
			expect(state).toBe("LOCKED");
		});

		it("should return UNLOCKED if DEK is in sessionStorage", async () => {
			(supabase.auth.getSession as any).mockResolvedValue({
				data: {
					session: { user: { id: "user-123", email: "test@example.com" } },
				},
			});

			sessionStorage.setItem("active_dek", generateValidDekB64());

			const state = await determineVaultState();
			expect(state).toBe("UNLOCKED");
			expect(getActiveDEK()).toBeDefined();
		});

		it("should return UNLOCKED if DEK is retrieved from other tabs", async () => {
			(supabase.auth.getSession as any).mockResolvedValue({
				data: {
					session: { user: { id: "user-123", email: "test@example.com" } },
				},
			});

			(requestDekFromTabs as any).mockImplementation(async () => {
				sessionStorage.setItem("active_dek", generateValidDekB64());
				return true;
			});

			const state = await determineVaultState();
			expect(state).toBe("UNLOCKED");
			expect(getActiveDEK()).toBeDefined();
		});
	});

	describe("lockAndSignOut", () => {
		it("should clear session and sessionStorage", async () => {
			sessionStorage.setItem("active_dek", generateValidDekB64());

			await lockAndSignOut(null);

			expect(sessionStorage.getItem("active_dek")).toBeNull();
			expect(supabase.auth.signOut).toHaveBeenCalled();
			expect(() => getActiveDEK()).toThrow();
		});

		it("should log error if signOut fails", async () => {
			const consoleSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});
			(supabase.auth.signOut as any).mockResolvedValue({
				error: new Error("Signout Fail"),
			});

			await lockAndSignOut(null);

			expect(consoleSpy).toHaveBeenCalledWith(
				"Error communicating sign out to Supabase:",
				expect.any(Error),
			);
			consoleSpy.mockRestore();
		});
	});

	describe("unlockVault", () => {
		it("should successfully unlock vault with correct password", async () => {
			const mockSession = {
				user: { id: "user-123", email: "test@example.com" },
			};
			(supabase.auth.getSession as any).mockResolvedValue({
				data: { session: mockSession },
			});

			// Mock RPC for salts
			(supabase.rpc as any).mockResolvedValue({
				data: { auth_salt: "a1b2", kek_salt: "c3d4" },
				error: null,
			});

			// Mock DB fetch for encrypted DEK
			const { deriveKEK } = await import("../crypto/derivation");
			const { wrapDEK, generateDEK } = await import("../crypto/encryption");

			const password = "password123";
			const kek = await deriveKEK(password, "c3d4");
			const dek = await generateDEK();
			const { encryptedDekBase64, ivBase64 } = await wrapDEK(dek, kek);

			const mockSingle = vi.fn().mockResolvedValue({
				data: { encrypted_dek: encryptedDekBase64, dek_iv: ivBase64 },
				error: null,
			});
			const mockEq = vi.fn(() => ({ single: mockSingle }));
			const mockSelect = vi.fn(() => ({ eq: mockEq }));
			(supabase.from as any).mockReturnValue({ select: mockSelect });

			const success = await unlockVault(password);

			expect(success).toBe(true);
			expect(sessionStorage.getItem("active_dek")).toBeDefined();
			expect(getActiveDEK()).toBeDefined();
		});

		it("should return false if session is missing", async () => {
			(supabase.auth.getSession as any).mockResolvedValue({
				data: { session: null },
			});
			const success = await unlockVault("password");
			expect(success).toBe(false);
		});
	});

	describe("loginAndUnlock", () => {
		it("should successfully log in and unlock vault", async () => {
			const email = "test@example.com";
			const password = "password123";
			const captchaToken = "mock-captcha";
			const mockSession = { user: { id: "user-123", email } };

			// Mock salts RPC (anonymous)
			(supabase.rpc as any).mockResolvedValue({
				data: { auth_salt: "a1b2", kek_salt: "c3d4" },
				error: null,
			});

			// Mock Supabase sign in
			(supabase.auth.signInWithPassword as any).mockResolvedValue({
				data: { session: mockSession },
				error: null,
			});

			// Mock DB fetch for encrypted DEK
			const { deriveKEK } = await import("../crypto/derivation");
			const { wrapDEK, generateDEK } = await import("../crypto/encryption");
			const kek = await deriveKEK(password, "c3d4");
			const dek = await generateDEK();
			const { encryptedDekBase64, ivBase64 } = await wrapDEK(dek, kek);

			const mockSingle = vi.fn().mockResolvedValue({
				data: { encrypted_dek: encryptedDekBase64, dek_iv: ivBase64 },
				error: null,
			});
			const mockEq = vi.fn(() => ({ single: mockSingle }));
			const mockSelect = vi.fn(() => ({ eq: mockEq }));
			(supabase.from as any).mockReturnValue({ select: mockSelect });

			await loginAndUnlock(email, password, captchaToken);

			expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
				email,
				password: expect.any(String), // Derived Auth Hash
				options: { captchaToken },
			});
			expect(getActiveDEK()).toBeDefined();
			expect(sessionStorage.getItem("active_dek")).toBeDefined();
		});

		it("should sign out if login fails", async () => {
			(supabase.rpc as any).mockResolvedValue({
				data: { auth_salt: "a1b2", kek_salt: "c3d4" },
				error: null,
			});
			(supabase.auth.signInWithPassword as any).mockResolvedValue({
				data: { session: null },
				error: { message: "Invalid credentials" },
			});

			await expect(loginAndUnlock("e", "p", "c")).rejects.toThrow(
				"Invalid credentials",
			);
			expect(supabase.auth.signOut).toHaveBeenCalled();
		});
	});
});
