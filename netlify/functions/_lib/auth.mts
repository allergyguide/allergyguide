import type { HandlerEvent } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { HttpError } from "./utils.mts";

export interface UserToken {
	uuid: string;
	email: string;
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY)
	throw new Error();

const supabase = createClient(
	process.env.SUPABASE_URL,
	process.env.SUPABASE_PUBLISHABLE_KEY,
);

/**
 * Authenticates a user by extracting and verifying their Supabase access token.
 *
 * Parses the `nf_jwt` cookie from the incoming event headers and verifies it against the server's `JWT_SECRET`. If successful, it returns the decoded user payload.
 *
 * @param event - The serverless event object containing the request headers.
 * @returns {Promise<UserToken>} The decoded user token payload their UUID.
 *
 * @throws {HttpError} 401 - If the Bearer token is missing
 * @throws {HttpError} 403 - If the provided token is expired, tampered with, or otherwise invalid.
 * @throws {HttpError} 500 - If something else very strange has occurred
 */
export async function authenticateUser(
	event: HandlerEvent,
): Promise<UserToken> {
	try {
		const authHeader = event.headers.authorization || "";
		if (!authHeader.startsWith("Bearer ")) {
			throw new HttpError("Unauthorized: Missing or invalid Bearer token", 401);
		}

		const token = authHeader.replace("Bearer ", "");
		const { data, error } = await supabase.auth.getClaims(token);
		if (error || !data) {
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
