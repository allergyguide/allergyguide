/**
 *
 * Handles authentication logic (login/logout) and session persistence.
 */
import { HttpError } from "../types";

/**
 * Result of a successful authentication attempt.
 */
export interface AuthLoginResult {
	/** Whether the login was successful */
	valid: boolean;
	/** Unix timestamp (ms) when the session expires */
	expiresAt: number;
	/** The username of the authenticated user */
	username: string;
}

/**
 * Performs a login request against the Netlify serverless auth function
 *
 * @param username - User's account identifier
 * @param password - User's password
 * @param turnstileToken - Cloudflare Turnstile verification token
 * @returns {Promise<AuthLoginResult>} A promise resolving to the login result
 * @throws {HttpError} If authentication fails or server error occurs
 */
export async function login(
	username: string,
	password: string,
	turnstileToken: string,
): Promise<AuthLoginResult> {
	const response = await fetch("/.netlify/functions/auth-login", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			username,
			password,
			turnstileToken: turnstileToken,
		}),
	});

	if (response.ok) {
		const data = await response.json();
		const expiryHours = data.expiryHours || 24;
		const expiresAt = Date.now() + expiryHours * 60 * 60 * 1000;

		return {
			valid: true,
			expiresAt: expiresAt,
			username: username,
		};
	}

	let serverMessage = "";
	try {
		const data = await response.json();
		serverMessage = data.message || data.error || "Login failed";
	} catch {
		serverMessage = "Login failed";
	}

	throw new HttpError(serverMessage, response.status);
}

/**
 * Clears the local session and notifies the server to invalidate the auth cookie
 *
 * @returns {Promise<boolean>} True if logout was successful
 */
export async function logout(): Promise<boolean> {
	try {
		localStorage.removeItem("oit_session_active");
		await fetch("/.netlify/functions/auth-logout", {
			method: "POST",
		});
		return true;
	} catch (err) {
		console.error("Logout failed", err);
		return false;
	}
}
