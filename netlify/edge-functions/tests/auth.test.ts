import type { Context } from "@netlify/edge-functions";
import { createServerClient } from "@supabase/ssr";
import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authenticateUser } from "../_lib/auth.ts";

vi.mock("@supabase/ssr", () => ({
	createServerClient: vi.fn(),
	parseCookieHeader: vi.fn(() => []),
}));

const mockGetClaims = (result: unknown) =>
	vi
		.mocked(createServerClient)
		.mockReturnValue({ auth: { getClaims: async () => result } } as never);

const run = () =>
	authenticateUser(new Request("https://x.test"), {} as Context);

describe("authenticateUser", () => {
	beforeEach(() => {
		vi.stubGlobal("Netlify", { env: { get: () => "x" } });
	});

	it("returns 503 when Supabase is unreachable", async () => {
		mockGetClaims({
			data: null,
			error: new AuthRetryableFetchError("down", 0),
		});
		await expect(run()).rejects.toMatchObject({ statusCode: 503 });
	});

	it("returns 401 for an invalid token", async () => {
		mockGetClaims({
			data: null,
			error: new AuthApiError("bad jwt", 400, "bad_jwt"),
		});
		await expect(run()).rejects.toMatchObject({ statusCode: 401 });
	});

	it("returns 401 with no session", async () => {
		mockGetClaims({ data: null, error: null });
		await expect(run()).rejects.toMatchObject({ statusCode: 401 });
	});

	it("returns the user for valid claims", async () => {
		mockGetClaims({
			data: { claims: { sub: "u1", email: "a@b.c" } },
			error: null,
		});
		await expect(run()).resolves.toEqual({ uuid: "u1", email: "a@b.c" });
	});
});
