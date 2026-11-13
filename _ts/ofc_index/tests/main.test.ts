import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "../../core/api/supabase";
import { lockAndSignOut } from "../../core/auth/login-client";
import { fetchAllEncryptedDocuments } from "../../core/data/db";
import { renderAuthUI } from "../../core/ui/auth-modals";
import { handleUserLoad } from "../data/loader";
import { handleSuccessfulAuth } from "../main";
import { HttpError } from "../types";

vi.mock("../../core/api/supabase", () => ({
	supabase: { auth: { getSession: vi.fn() } },
}));
vi.mock("../../core/auth/login-client", () => ({
	determineVaultState: vi.fn(),
	getActiveDEK: vi.fn(),
	lockAndSignOut: vi.fn(),
	setSignedInHook: vi.fn(),
}));
vi.mock("../../core/data/db", () => ({
	decryptDocuments: vi.fn(),
	fetchAllEncryptedDocuments: vi.fn(),
}));
vi.mock("../../core/ui/auth-modals", () => ({ renderAuthUI: vi.fn() }));
vi.mock("../data/loader", () => ({
	handleUserLoad: vi.fn(),
	loadCustomFoods: vi.fn(),
	loadPublicFoods: vi.fn(),
}));

describe("handleSuccessfulAuth on profile load failure", () => {
	beforeEach(() => {
		vi.mocked(fetchAllEncryptedDocuments).mockResolvedValue([]);
		vi.mocked(supabase.auth.getSession).mockResolvedValue({
			data: { session: { user: { email: "user@example.com" } } },
		} as never);
	});

	it.each([401, 403])("signs out on %i", async (status) => {
		vi.mocked(handleUserLoad).mockRejectedValue(new HttpError("x", status));
		await handleSuccessfulAuth();
		expect(lockAndSignOut).toHaveBeenCalledWith(null);
		expect(renderAuthUI).toHaveBeenCalledWith(
			"LOGIN",
			handleSuccessfulAuth,
			expect.any(String),
		);
	});

	it.each([
		["a 500", new HttpError("x", 500)],
		["a 503", new HttpError("x", 503)],
		["a network error", new TypeError("Failed to fetch")],
	])("keeps the session on %s", async (_label, err) => {
		vi.mocked(handleUserLoad).mockRejectedValue(err);
		await handleSuccessfulAuth();
		expect(lockAndSignOut).not.toHaveBeenCalled();
		expect(renderAuthUI).toHaveBeenCalledWith(
			"LOGIN",
			handleSuccessfulAuth,
			expect.any(String),
		);
	});
});
