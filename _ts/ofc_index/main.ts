import { html, render } from "lit-html";
import { supabase } from "../core/api/supabase";
import {
	determineVaultState,
	getActiveDEK,
	lockAndSignOut,
	setSignedInHook,
} from "../core/auth/login-client";
import { decryptDocuments, fetchAllEncryptedDocuments } from "../core/data/db";
import { renderAuthUI } from "../core/ui/auth-modals";
import {
	handleUserLoad,
	loadCustomFoods,
	loadPublicFoods,
} from "./data/loader";
import { appState } from "./state/state";
import {
	type Food,
	type FoodData,
	HttpError,
	type UserLoadResult,
} from "./types";
import { initApp } from "./ui/app";

/** Build-time injected version string */
declare const __VERSION_OFC_INDEX__: string;

interface UserFetches {
	bootstrap: Promise<UserLoadResult>;
	encryptedDocs: ReturnType<typeof fetchAllEncryptedDocuments>;
}

/** Session-only fetches (no DEK needed), started early and consumed by handleSuccessfulAuth */
let pendingFetches: UserFetches | null = null;

/** Starts session-only fetches. Overwrites any stale fetches from a previous session */
function startUserFetches(): UserFetches {
	const bootstrap = handleUserLoad();
	bootstrap.catch(() => {});
	const encryptedDocs = fetchAllEncryptedDocuments(["custom_food"]);
	encryptedDocs.catch(() => {});
	pendingFetches = { bootstrap, encryptedDocs };
	return pendingFetches;
}

/**
 * Decrypts custom foods in the background and appends them after the provisioned foods
 */
function loadCustomFoodsInBackground(
	encryptedDocs: UserFetches["encryptedDocs"],
	provisionedFoods: Food[],
) {
	appState.setSyncStatus("loading");
	const dek = getActiveDEK();

	encryptedDocs
		.then(async (encryptedRows) => {
			const customFoodDocs = await decryptDocuments<FoodData>(
				encryptedRows,
				dek,
				"custom_food",
			);
			appState.setFoods(appState.getState().publicFoods, [
				...provisionedFoods,
				...loadCustomFoods(customFoodDocs),
			]);
			appState.setSyncStatus("success");
		})
		.catch((err) => {
			console.error("Failed to load custom assets:", err);
			appState.setSyncStatus("error");
		});
}

/**
 * Shared callback for an unlocked vault (fresh login, unlock, or page load with a DEK)
 * Loads protected assets; on failure signs out silently and shows the login modal with the reason
 */
async function handleSuccessfulAuth() {
	const { bootstrap, encryptedDocs } = pendingFetches ?? startUserFetches();
	pendingFetches = null; // consumed; the next login starts fresh fetches

	try {
		const userResult = await bootstrap;

		appState.setAuthState(true, userResult.email);
		appState.setFoods(appState.getState().publicFoods, userResult.foods);

		// Hide the modal on success
		renderAuthUI("HIDDEN");

		loadCustomFoodsInBackground(encryptedDocs, userResult.foods);
	} catch (e) {
		// Sign out silently (null = no redirect) only when access is really gone
		// but on network/server errors keep the session and key so a reload retries without a password
		if (
			e instanceof HttpError &&
			(e.statusCode === 401 || e.statusCode === 403)
		) {
			await lockAndSignOut(null);
			appState.setAuthState(false, null);
		} else {
			// Still signed in: show that in the toolbar so it matches the session
			const {
				data: { session },
			} = await supabase.auth.getSession();
			appState.setAuthState(!!session, session?.user.email ?? null);
		}

		let userFacingMessage =
			"An unexpected error occurred while loading your profile. Reload the page to try again.";

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
					"Server error retrieving your profile. Reload the page to try again.";
			} else {
				console.warn(`User load failed (${e.statusCode}):`, e);
			}
		} else {
			// Non-HTTP error (e.g., TypeError from JSON parsing, Network drop)
			console.error("Undefined err in handleSuccessfulAuth: ", e);
			userFacingMessage =
				"Network or connection error. Check your internet and reload the page.";
		}

		renderAuthUI("LOGIN", handleSuccessfulAuth, userFacingMessage);
	}
}

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
	const vaultStatePromise = determineVaultState();

	let publicFoods: Food[];
	let vaultState: Awaited<typeof vaultStatePromise>;
	try {
		const {
			data: { session },
		} = await supabase.auth.getSession();
		// start network fetch without waiting for DEK
		if (session) startUserFetches();
		// On fresh login, start them as soon as Supabase sign-in returns
		setSignedInHook(startUserFetches);

		[publicFoods, vaultState] = await Promise.all([
			publicFoodsPromise,
			vaultStatePromise,
		]);
	} catch (e) {
		console.error("OFC index failed to start:", e);
		render(
			html`<p class="ofc-warning-text">Couldn't load the food database. Reload the page to try again.</p>`,
			mountPoint,
		);
		return;
	}
	appState.setFoods(publicFoods, []);

	if (vaultState === "UNAUTHENTICATED") {
		// Public mode => publicFoods
		const instructions = document.querySelector(
			".ofc-instructions",
		) as HTMLElement;
		if (instructions?.dataset.originalHtml) {
			instructions.innerHTML = instructions.dataset.originalHtml;
		}
		appState.setAuthState(false, null);
	} else if (vaultState === "LOCKED") {
		// Logged in to Supabase, but DEK missing: force unlock
		renderAuthUI("UNLOCK", handleSuccessfulAuth);
	} else if (vaultState === "UNLOCKED") {
		// Fully authenticated and decrypted: load user data
		await handleSuccessfulAuth();
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
