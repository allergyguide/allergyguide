/// <reference types="@netlify/edge-functions" />
import { createClient } from "@supabase/supabase-js";
import { HttpError } from "./utils.ts";

export interface UserToken {
	uuid: string;
	email: string;
}

// https://docs.netlify.com/build/edge-functions/environment-variables/
const supabaseUrl =
	Netlify.env.get("SUPABASE_URL") || process.env?.SUPABASE_URL;
const supabaseKey =
	Netlify.env.get("SUPABASE_PUBLISHABLE_KEY") ||
	process.env?.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
	throw new Error("Missing Supabase env vars");
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Authenticates a user by extracting and verifying their Supabase access token
 *
 * Parses the authorization header from the incoming Request and verifies it. If successful, it returns the decoded user payload
 *
 * @param req - The standard web Request object
 * @returns {Promise<UserToken>} The decoded user token payload their UUID
 *
 * @throws {HttpError} 401 - If the Bearer token is missing
 * @throws {HttpError} 403 - If the provided token is expired, tampered with, or otherwise invalid
 * @throws {HttpError} 500 - If something else very strange has occurred
 */
export async function authenticateUser(req: Request): Promise<UserToken> {
	try {
		const authHeader = req.headers.get("authorization") || "";
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
