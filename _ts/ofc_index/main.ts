import { supabase } from "../core/api/supabase";
import {
	determineVaultState,
	getActiveDEK,
	lockAndSignOut,
} from "../core/auth/login-client";
import {
	decryptDocuments,
	type EncryptedDocument,
	fetchAllEncryptedDocuments,
} from "../core/data/db";
import { renderAuthUI } from "../core/ui/auth-modals";
import {
	handleUserLoad,
	loadCustomFoods,
	loadPublicFoods,
} from "./data/loader";
import { appState } from "./state/state";
import { type FoodData, HttpError, type UserLoadResult } from "./types";
import { initApp } from "./ui/app";

/** Build-time injected version string */
declare const __VERSION_OFC_INDEX__: string;

// Module-level promise to cache background network fetches
let networkDataPromise: Promise<[UserLoadResult, EncryptedDocument[]]> | null =
	null;

/**
 * Shared callback for successful authentication and vault unlock
 * Orchestrates loading of protected assets
 */
async function handleSuccessfulAuth() {
	try {
		if (!networkDataPromise) {
			networkDataPromise = Promise.all([
				handleUserLoad(),
				fetchAllEncryptedDocuments(["custom_food"]).catch((err) => {
					console.error("Failed to fetch encrypted custom user data:", err);
					return [];
				}),
			]);
		}

		const [userResult, encryptedRows] = await networkDataPromise;

		const dek = getActiveDEK();
		const customFoodDocs = await decryptDocuments<FoodData>(
			encryptedRows,
			dek,
			"custom_food",
		);
		const customFoods = await loadCustomFoods(customFoodDocs);

		const currentPublicFoods = appState.getState().publicFoods;

		appState.setAuthState(userResult.isLoggedIn, userResult.email);
		appState.setFoods(currentPublicFoods, [
			...userResult.foods,
			...customFoods,
		]);

		// Hide the modal on success
		renderAuthUI("HIDDEN");
	} catch (e) {
		// Revert the local identity silently (pass null so it doesn't redirect) on any failure
		await lockAndSignOut(null);

		let userFacingMessage =
			"An unexpected error occurred while loading your profile.";

		if (e instanceof HttpError) {
			if (e.statusCode === 401) {
				console.debug("No active session or token expired:", e);
				userFacingMessage = "Your session has expired. Please log in again.";
			} else if (e.statusCode === 403) {
				console.debug("Failed to load user config (Not Provisioned):", e);
				userFacingMessage =
					"Login successful, but this account lacks access to this tool.";
			} else if (e.statusCode >= 500) {
				console.warn("User load failed (Server Error):", e);
				userFacingMessage =
					"Server error retrieving your profile. Please try again later.";
			} else {
				console.warn(`User load failed (${e.statusCode}):`, e);
			}
		} else {
			// Non-HTTP error (e.g., TypeError from JSON parsing, Network drop)
			console.error("Undefined err in handleSuccessfulAuth: ", e);
			userFacingMessage =
				"Network or connection error. Please check your internet and try again.";
		}

		renderAuthUI("LOGIN", handleSuccessfulAuth, userFacingMessage);
	} finally {
		networkDataPromise = null; // ensure clear after use or error
	}
}

/**
 * Main initialization function
 *
 * 1. Finds mount point in DOM
 * 2. Sets up global state subscriptions
 * 3. Registers global keyboard shortcuts
 * 4. Determines identity and vault state
 * 5. Mounts Lit-html application
 */
async function initializeOFC() {
	const mountPoint = document.getElementById("ofc-app-mount");
	if (!mountPoint) {
		console.error("OFC index mount point (#ofc-app-mount) not found");
		return;
	}

	// Subscribe to state changes for side effects
	appState.subscribe((state) => {
		// Handle body scroll lock when modal is open
		if (state.selectedFood) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
	});

	// Global key listener for Escape
	window.addEventListener("keydown", (e) => {
		if (e.key === "Escape") {
			appState.setSelectedFood(null);
		}
	});

	// --- AUTHENTICATION AND DATA LOAD ---

	// public data and session check in parallel
	const publicFoodsPromise = loadPublicFoods();
	const sessionPromise = supabase.auth.getSession();

	// Start vault state resolution
	const vaultStatePromise = determineVaultState();

	const {
		data: { session },
	} = await sessionPromise;
	if (session) {
		// start network fetch without waiting for DEK
		networkDataPromise = Promise.all([
			handleUserLoad(),
			fetchAllEncryptedDocuments(["custom_food"]).catch((err) => {
				console.error("Failed to fetch encrypted custom user data:", err);
				return [];
			}),
		]);

		networkDataPromise.catch(() => {});
	}

	// Load public data and check auth in parallel
	const [publicFoods, vaultState] = await Promise.all([
		publicFoodsPromise,
		vaultStatePromise,
	]);
	appState.setFoods(publicFoods, []);

	if (vaultState === "UNAUTHENTICATED") {
		// Public mode => publicFoods
		appState.setAuthState(false, null);
	} else if (vaultState === "LOCKED") {
		// Logged in to Supabase, but DEK missing: force unlock
		renderAuthUI("UNLOCK", handleSuccessfulAuth);
	} else if (vaultState === "UNLOCKED") {
		try {
			// Fully Authenticated and Decrypted! Load user data
			if (!networkDataPromise) {
				networkDataPromise = Promise.all([
					handleUserLoad(),
					fetchAllEncryptedDocuments(["custom_food"]).catch((err) => {
						console.error("Failed to fetch encrypted custom user data:", err);
						return [];
					}),
				]);
			}

			const [userResult, encryptedRows] = await networkDataPromise;
			const dek = getActiveDEK();
			const customFoodDocs = await decryptDocuments<FoodData>(
				encryptedRows,
				dek,
				"custom_food",
			);
			const customFoods = await loadCustomFoods(customFoodDocs);

			appState.setAuthState(userResult.isLoggedIn, userResult.email);
			appState.setFoods(publicFoods, [...userResult.foods, ...customFoods]);
		} finally {
			networkDataPromise = null;
		}
	}

	const changelogLink =
		(
			document.querySelector(
				".ofc-skeleton-container .changelog-link",
			) as HTMLAnchorElement
		)?.href || "#";

	// init UI (removes skeleton)
	initApp(mountPoint, {
		onLogin: () => renderAuthUI("LOGIN", handleSuccessfulAuth),
		onLogout: async () => {
			if (confirm("Are you sure you want to log out?")) {
				await lockAndSignOut();
			}
		},
		version: __VERSION_OFC_INDEX__,
		changelogUrl: changelogLink,
	});
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initializeOFC);
} else {
	initializeOFC();
}
