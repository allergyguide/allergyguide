import type { Context } from "@netlify/edge-functions";
import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import { HttpError } from "./utils.ts";

export interface UserToken {
	uuid: string;
	email: string;
}

// https://docs.netlify.com/build/edge-functions/environment-variables/
let supabaseUrl: string | undefined;
let supabaseKey: string | undefined;

/**
 * Lazily reads and caches Supabase connection env vars
 * Resolution is deferred to runtime to prevent build-time failures during static analysis, especially for netlify deploys
 *
 * @returns {{ supabaseUrl: string; supabaseKey: string }} The resolved Supabase URL and publishable key
 * @throws {Error} If either env var is missing at runtime
 */
function getEnvVars(): { supabaseUrl: string; supabaseKey: string } {
	if (supabaseUrl && supabaseKey) return { supabaseUrl, supabaseKey };

	supabaseUrl = Netlify.env.get("SUPABASE_URL") || process.env?.SUPABASE_URL;
	supabaseKey =
		Netlify.env.get("SUPABASE_PUBLISHABLE_KEY") ||
		process.env?.SUPABASE_PUBLISHABLE_KEY;

	if (!supabaseUrl || !supabaseKey) {
		throw new Error("Missing Supabase env vars");
	}

	return { supabaseUrl, supabaseKey };
}

/**
 * Authenticates a user by reading and verifying their Supabase session from HTTP cookies
 *
 * Parses the chunked Supabase SSR cookies from the incoming request using `@supabase/ssr`'s `createServerClient`, then cryptographically verifies the JWT via `getClaims()` (JWKS validation)
 * If a silent token refresh occurs, the refreshed cookies are written back via `context.cookies`, which Netlify's edge runtime automatically merges into the outgoing response
 *
 * @param req - The standard web Request object
 * @param context - The Netlify Edge Function context, used to write refreshed cookies back to the response
 * @returns {Promise<UserToken>} The decoded user token payload containing their UUID and email
 *
 * @throws {HttpError} 403 - If no valid session cookie is present, or if the token is expired or tampered with
 * @throws {HttpError} 500 - If an unexpected error occurs during verification
 */
export async function authenticateUser(
	req: Request,
	context: Context,
): Promise<UserToken> {
	try {
		const { supabaseUrl, supabaseKey } = getEnvVars();

		// Initialize the server client purely to parse the cookie chunks securely
		const ssrClient = createServerClient(supabaseUrl, supabaseKey, {
			auth: {
				detectSessionInUrl: false,
			},
			cookieOptions: {
				name: "allergyguide_auth_token",
			},
			// https://supabase.com/docs/guides/auth/server-side/creating-a-client
			// As of @supabase/ssr v0.3.0+, get/set/remove are deprecated.
			// Using getAll and setAll prevents edge cases around CDN caching and multiple token refreshes.
			cookies: {
				getAll() {
					// parseCookieHeader extracts the raw HTTP string into the expected { name, value }[] array
					return parseCookieHeader(req.headers.get("Cookie") ?? "").filter(
						(c): c is { name: string; value: string } =>
							typeof c.value === "string",
					);
				},
				setAll(cookiesToSet) {
					// Called by @supabase/ssr on silent token refresh
					// Netlify's edge runtime should automatically merges context.cookies into the outgoing response headers
					// so no explicit Set-Cookie manipulation is needed
					cookiesToSet.forEach(({ name, value, options }) => {
						let sameSite: "Strict" | "Lax" | "None" | undefined;
						if (typeof options.sameSite === "string") {
							const lower = options.sameSite.toLowerCase();
							if (lower === "lax") sameSite = "Lax";
							else if (lower === "strict") sameSite = "Strict";
							else if (lower === "none") sameSite = "None";
						} else if (options.sameSite === true) {
							sameSite = "Strict";
						}

						context.cookies.set({
							name,
							value,
							domain: options.domain,
							path: options.path,
							maxAge: options.maxAge,
							expires: options.expires,
							httpOnly: options.httpOnly,
							secure: options.secure,
							sameSite,
						});
					});
				},
			},
		});

		// Verify the JWT cryptographically (this will fetch JWKS if not cached internally)
		const { data, error } = await ssrClient.auth.getClaims();

		if (error || !data?.claims) {
			console.error("Token verification failed:", error);
			throw new HttpError("Forbidden: Invalid token", 403);
		}

		return {
			uuid: data.claims.sub, // The user's UUID
			email: data.claims.email || "",
		};
	} catch (err) {
		if (err instanceof HttpError) {
			throw err;
		} else {
			console.error("Unhandled Server Error during authorization:", err);
			throw new HttpError("Internal error", 500);
		}
	}
}
