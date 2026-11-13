import { html, render } from "lit-html";
import { supabase } from "../core/api/supabase";
import {
	determineVaultState,
	getActiveDEK,
	lockAndSignOut,
	setSignedInHook,
} from "../core/auth/login-client";
import { handleProfileLoadError } from "../core/auth/profile-load-error";
import { decryptDocuments, fetchAllEncryptedDocuments } from "../core/data/db";
import { renderAuthUI } from "../core/ui/auth-modals";
import {
	handleUserLoad,
	loadCustomFoods,
	loadPublicFoods,
} from "./data/loader";
import { appState } from "./state/state";
import type { Food, FoodData, UserLoadResult } from "./types";
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
export async function handleSuccessfulAuth() {
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
		await handleProfileLoadError(
			e,
			"the OFC index",
			(isLoggedIn, email) => appState.setAuthState(isLoggedIn, email),
			handleSuccessfulAuth,
		);
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
	let sessionEmail: string | null;
	try {
		const {
			data: { session },
		} = await supabase.auth.getSession();
		sessionEmail = session?.user.email ?? null;
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

	const changelogLink =
		(
			document.querySelector(
				".ofc-skeleton-container .changelog-link",
			) as HTMLAnchorElement
		)?.href || "#";

	// init UI (removes skeleton) before the profile loads, so public search works even if the edge function is slow
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

	if (vaultState === "UNAUTHENTICATED") {
		// Public mode => publicFoods
		appState.setAuthState(false, null);
	} else if (vaultState === "LOCKED") {
		// Logged in to Supabase, but DEK missing: force unlock
		renderAuthUI("UNLOCK", handleSuccessfulAuth);
	} else if (vaultState === "UNLOCKED") {
		// Show the signed-in toolbar now; provisioned foods appear when the profile loads
		appState.setAuthState(true, sessionEmail);
		void handleSuccessfulAuth();
	}
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initializeOFC);
} else {
	initializeOFC();
}
