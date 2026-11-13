import { supabase } from "../api/supabase";
import { renderAuthUI } from "../ui/auth-modals";
import { lockAndSignOut } from "./login-client";

/**
 * Shared failure path when a tool's profile (bootstrap) load fails after unlock
 *
 * Signs out silently only on 401/403 (access really gone).
 * On server, network or unknown errors: the session and key stay, so a reload retries without a password. Then shows the login modal with the reason.
 *
 * @param e - The caught error; each tool has its own HttpError class, so the status is read from `statusCode`
 * @param toolName - Used in the "lacks access" message, e.g. "the OIT Calculator"
 * @param setAuthState - The tool's appState.setAuthState
 * @param onRetry - Callback for the login modal (the tool's handleSuccessfulAuth)
 */
export async function handleProfileLoadError(
	e: unknown,
	toolName: string,
	setAuthState: (isLoggedIn: boolean, email: string | null) => void,
	onRetry: () => Promise<void>,
): Promise<void> {
	const code = (e as { statusCode?: unknown } | null)?.statusCode;
	const status = typeof code === "number" ? code : null;

	if (status === 401 || status === 403) {
		await lockAndSignOut(null); // null = no redirect, keep the modal open
		setAuthState(false, null);
	} else {
		// Still signed in: show that in the toolbar so it matches the session
		const {
			data: { session },
		} = await supabase.auth.getSession();
		setAuthState(!!session, session?.user.email ?? null);
	}

	let message =
		"An unexpected error occurred while loading your profile. Reload the page to try again.";
	if (status === 401) {
		console.debug("No active session or token expired:", e);
		message = "Your session has expired. Please log in again.";
	} else if (status === 403) {
		console.debug("Failed to load user config (Not Provisioned):", e);
		message = `Login successful, but this account lacks access to ${toolName}.`;
	} else if (status !== null && status >= 500) {
		console.warn("User load failed (Server Error):", e);
		message =
			"Server error retrieving your profile. Reload the page to try again.";
	} else if (status !== null) {
		console.warn(`User load failed (${status}):`, e);
	} else if (e instanceof TypeError) {
		// fetch() rejects with TypeError when the connection drops
		console.error("User load failed (Network):", e);
		message =
			"Network or connection error. Check your internet and reload the page.";
	} else {
		// e.g. malformed config or missing key: not the user's connection
		console.error("Undefined err while loading profile:", e);
	}

	renderAuthUI("LOGIN", onRetry, message);
}
