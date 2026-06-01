import { supabase } from "../api/supabase";
import { deriveAuthHash, deriveKEK } from "../crypto/derivation";
import { base64ToBuffer, bufferToBase64 } from "../crypto/encoding";
import { unwrapDEK } from "../crypto/encryption";
import { requestDekFromTabs } from "./tab-sync";

// In-memory reference for the active tab to avoid constant sessionStorage lookups
let activeDEK: CryptoKey | null = null;

// prevents race condition and double reload
let isNavigatingAway = false;

export type VaultState = "UNAUTHENTICATED" | "LOCKED" | "UNLOCKED";

// Listen for global auth state changes (this fires across all tabs natively via Supabase)
// Remove DEK, force reload
supabase.auth.onAuthStateChange((event) => {
	if (event === "SIGNED_OUT" && !isNavigatingAway) {
		activeDEK = null;
		sessionStorage.removeItem("active_dek");

		// Force a page reload to clear any decrypted UI state from the DOM
		// This also includes assets not from Supabase too
		window.location.reload();
	}
});

/**
 * Initializes vault by checking identity, local storage, and other tabs
 *
 * @returns {Promise<VaultState>} Current state of the vault
 */
export async function determineVaultState(): Promise<VaultState> {
	// Check Identity
	const {
		data: { session },
	} = await supabase.auth.getSession();
	if (!session) return "UNAUTHENTICATED";

	// Check Local Crypto State (sessionStorage)
	const storedDekBase64 = sessionStorage.getItem("active_dek");
	if (storedDekBase64) {
		activeDEK = await hydrateDek(storedDekBase64);
		return "UNLOCKED";
	}

	// Check Other Tabs (BroadcastChannel)
	const gotDekFromTab = await requestDekFromTabs();
	if (gotDekFromTab) {
		const syncedDekBase64 = sessionStorage.getItem("active_dek");
		if (!syncedDekBase64)
			throw new Error(
				"Cannot find active DEK despite requestDekFromTabs() passing",
			);

		activeDEK = await hydrateDek(syncedDekBase64);
		return "UNLOCKED";
	}

	// Identity is verified, but DEK is missing
	return "LOCKED";
}

/**
 * Fetches salts, derives KEK, unwraps the DEK using the password, and saves it to sessionStorage
 *
 * @param password - user password
 * @returns {Promise<boolean>} Promise resolving to true if vault was successfully unlocked
 */
export async function unlockVault(password: string): Promise<boolean> {
	try {
		const {
			data: { session },
		} = await supabase.auth.getSession();
		if (!session) throw new Error("No active user session.");

		// Fetch Salts via RPC
		const { data: salts, error: rpcErr } = await supabase.rpc(
			"get_user_salts",
			{
				user_email: session.user.email,
			},
		);
		if (rpcErr || !salts)
			throw new Error("Could not retrieve encryption parameters.");

		// Derive the Key Encryption Key (KEK)
		const kek = await deriveKEK(password, salts.kek_salt);

		// Fetch the Encrypted DEK from Postgres
		const { data: userData, error: dbErr } = await supabase
			.from("authorized_users")
			.select("encrypted_dek, dek_iv")
			.eq("id", session.user.id)
			.single();
		if (dbErr || !userData) throw new Error("Encrypted DEK not found");

		// Unwrap the DEK
		activeDEK = await unwrapDEK(userData.encrypted_dek, userData.dek_iv, kek);

		// Persist to sessionStorage so it survives page reloads
		const rawDekBuffer = await window.crypto.subtle.exportKey("raw", activeDEK);
		sessionStorage.setItem("active_dek", bufferToBase64(rawDekBuffer));

		return true;
	} catch {
		return false; // UI can handle the login fail from this function
	}
}

/**
 * Derives keys, authenticates with Supabase, unwraps the DEK, and stores it in sessionStorage
 *
 * @param email - User email
 * @param password - user password
 * @param captchaToken - Turnstile token
 * @throws {Error} If login, derivation, or decryption fails
 */
export async function loginAndUnlock(
	email: string,
	password: string,
	captchaToken: string,
): Promise<void> {
	try {
		// Fetch Salts via anonymous RPC BEFORE logging in
		const { data: salts, error: rpcErr } = await supabase.rpc(
			"get_user_salts",
			{
				user_email: email,
			},
		);
		if (rpcErr || !salts)
			throw new Error("Could not retrieve encryption parameters.");

		// Derive the Auth Hash and KEK from the user password
		const [authHash, kek] = await Promise.all([
			deriveAuthHash(password, salts.auth_salt),
			deriveKEK(password, salts.kek_salt),
		]);

		// Log into Supabase using the derived Auth Hash and turnstile token
		const { data: authData, error: authErr } =
			await supabase.auth.signInWithPassword({
				email,
				password: authHash,
				options: { captchaToken },
			});
		if (authErr || !authData.session)
			throw new Error(authErr?.message || "Login failed.");

		// Fetch the Encrypted DEK from Postgres
		const { data: userData, error: dbErr } = await supabase
			.from("authorized_users")
			.select("encrypted_dek, dek_iv")
			.eq("id", authData.session.user.id)
			.single();
		if (dbErr || !userData) throw new Error("Encrypted DEK not found.");

		// Unwrap DEK and persist to sessionStorage
		activeDEK = await unwrapDEK(userData.encrypted_dek, userData.dek_iv, kek);
		const rawDekBuffer = await window.crypto.subtle.exportKey("raw", activeDEK);
		sessionStorage.setItem("active_dek", bufferToBase64(rawDekBuffer));
	} catch (err) {
		console.error("Login and unlock failed:", err);
		// In failure clean up session
		// blind the listener first to prevent reload on current page
		isNavigatingAway = true;
		await supabase.auth.signOut();
		isNavigatingAway = false;
		throw err;
	}
}

/**
 * Wipes local memory and terminates the Supabase session for signing out or switching users
 *
 * @param redirect_url - Optional URL to redirect to after signing out
 */
export async function lockAndSignOut(
	redirect_url?: string | null,
): Promise<void> {
	// Set the flag so the listener ignores this event
	isNavigatingAway = true;
	activeDEK = null;
	sessionStorage.removeItem("active_dek");

	const { error } = await supabase.auth.signOut();
	if (error) {
		console.error("Error communicating sign out to Supabase:", error);
	}

	if (redirect_url === null) {
		// Silent Wipe (null): Stay on the exact page, don't refresh; use when you want to account for hydration fails (403) so the modal stays open
		isNavigatingAway = false;
	} else if (redirect_url) {
		// Specific Redirect (e.g. "/")
		window.location.href = redirect_url;
	} else {
		// Default Behavior (no argument): Hard reload the current page
		window.location.reload();
	}
}

/**
 * Retrieves the active DEK for data fetching and saving modules
 *
 * @returns {CryptoKey} The active Data Encryption Key
 * @throws {Error} If vault is locked
 */
export function getActiveDEK(): CryptoKey {
	if (!activeDEK) throw new Error("Vault locked: no access to DEK.");
	return activeDEK;
}

async function hydrateDek(base64Str: string): Promise<CryptoKey> {
	const rawBuffer = base64ToBuffer(base64Str);
	return await window.crypto.subtle.importKey(
		"raw",
		rawBuffer as BufferSource,
		{ name: "AES-GCM", length: 256 },
		true, // Must remain extractable if we need to sync it to another tab later
		["encrypt", "decrypt"],
	);
}
