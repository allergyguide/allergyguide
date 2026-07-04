/**
 * @module OIT-Calculator
 * @author Joshua Yu
 * @license GPLv3
 *
 * Main entry point for OIT Calculator
 *
 */

// ============================================
// IMPORTS
// ============================================

import Decimal from "decimal.js";
import { supabase } from "../core/api/supabase";
import {
	determineVaultState,
	getActiveDEK,
	lockAndSignOut,
} from "../core/auth/login-client";
import { decryptDocuments, fetchAllEncryptedDocuments } from "../core/data/db";
import { runCrudTest } from "../core/data/test-crud";
import { renderAuthUI } from "../core/ui/auth-modals";
import { VALIDATION_DEBOUNCE_MS } from "./constants";
import { validateProtocol } from "./core/validator";
import { loadPublicDatabases, loadUserConfiguration } from "./data/loader";
import { appState, initializeAppState, workspace } from "./state/instances";
import {
	type FoodData,
	HttpError,
	type OITBootstrapResponse,
	type ProtocolData,
	type Warning,
} from "./types";
import {
	renderFoodASettings,
	renderFoodBSettings,
} from "./ui/components/FoodSettings";
import { initGlobalEvents } from "./ui/events";
import {
	copyActiveProtocolAsProvisioned,
	initExportEvents,
	prefetchPdfLibraries,
	triggerPdfGeneration,
} from "./ui/exports";
import { attachClickwrapEventListeners } from "./ui/modals";
// UI
import {
	renderDosingStrategy,
	renderProtocolTable,
	renderTabs,
	renderToolbar,
	showProtocolUI,
	updateFoodBDisabledState,
	updateUndoRedoButtons,
	updateWarnings,
} from "./ui/renderers";
import { initSearchEvents } from "./ui/searchUI";

// And current tool version
declare const __VERSION_OIT_CALCULATOR__: string;

// Configure Decimal.js
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// ============================================
// INITIALIZATION
// ============================================

// Module-level promise to cache background network fetches
let bootstrapPromise: Promise<OITBootstrapResponse> | null = null;
let encryptedDocsPromise: ReturnType<typeof fetchAllEncryptedDocuments> | null =
	null;

// 1. Create the hydration callback
export const handleSuccessfulAuth = async () => {
	try {
		if (!bootstrapPromise) {
			bootstrapPromise = loadUserConfiguration();
		}

		if (!encryptedDocsPromise) {
			encryptedDocsPromise = fetchAllEncryptedDocuments([
				"custom_food",
				"custom_protocol",
			]);
		}

		const userData = await bootstrapPromise;

		appState.addProvisionedData(
			userData.provisioned_foods,
			userData.provisioned_protocols,
			userData.handouts,
		);

		appState.setAuthState(true, userData.email);

		// Everything worked! Close the modal
		renderAuthUI("HIDDEN");

		// Fetch and decrypt custom assets in the background
		appState.setSyncStatus("loading");
		const dek = getActiveDEK();

		encryptedDocsPromise
			.then(async (encryptedRows) => {
				const [customFoods, customProtocols] = await Promise.all([
					decryptDocuments<FoodData>(encryptedRows, dek, "custom_food"),
					decryptDocuments<ProtocolData>(encryptedRows, dek, "custom_protocol"),
				]);

				appState.setUserData(
					customFoods.map((doc) => doc.data),
					customProtocols.map((doc) => doc.data),
				);
				appState.setSyncStatus("success");
			})
			.catch((err) => {
				console.error("Failed to load custom assets:", err);
				appState.setSyncStatus("error");
			});
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
					"Login successful, but this account lacks access to the OIT Calculator.";
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

		// Keep the modal open and show the error!
		renderAuthUI("LOGIN", handleSuccessfulAuth, userFacingMessage);
	} finally {
		// Ensure the promise is cleared regardless of success or failure
		// so subsequent auth changes (e.g. logout then login or retries) get fresh data
		bootstrapPromise = null;
		encryptedDocsPromise = null;
	}
};

/**
 * Initialize the OIT calculator after DOM is ready
 */
async function initializeCalculator(): Promise<void> {
	// Get URL for rules page
	const urlContainer = document.getElementById("url-container");
	const rulesUrl = urlContainer ? urlContainer.dataset.targetUrl : "";
	if (!rulesUrl)
		throw new Error("Missing url-container dataset: rulesUrl is required");

	// start public data and session check in parallel
	const publicDataPromise = loadPublicDatabases();
	const sessionPromise = supabase.auth.getSession();

	// Start vault state resolution
	const vaultStatePromise = determineVaultState();

	const {
		data: { session },
	} = await sessionPromise;
	if (session) {
		// start network fetch without waiting for DEK
		bootstrapPromise = loadUserConfiguration();
		bootstrapPromise.catch(() => {});

		encryptedDocsPromise = fetchAllEncryptedDocuments([
			"custom_food",
			"custom_protocol",
		]);
		encryptedDocsPromise.catch(() => {});
	}

	const [publicData, vaultState] = await Promise.all([
		publicDataPromise,
		vaultStatePromise,
	]);

	// Init AppState and Subscribers
	initializeAppState(publicData, rulesUrl);

	// Cache for warnings to avoid flickering during debounced updates
	let cachedWarnings: Warning[] = [];
	let validationTimer: number | null = null;

	const onLogin = () => renderAuthUI("LOGIN", handleSuccessfulAuth);
	const onLogout = async () => {
		if (confirm("Are you sure you want to log out?")) {
			await lockAndSignOut();
		}
	};

	const changelogLink =
		(document.querySelector(".changelog-link") as HTMLAnchorElement)?.href ||
		"#";

	// Wire up restricted mode login button
	document
		.getElementById("btn-restricted-login")
		?.addEventListener("click", onLogin);

	const getToolbarProps = () => ({
		isLoggedIn: appState.isLoggedIn,
		userEmail: appState.email,
		version: __VERSION_OIT_CALCULATOR__,
		changelogUrl: changelogLink,
		onLogin,
		onLogout,
		customAssetsSyncStatus: appState.customAssetsSyncStatus,
	});

	appState.subscribeToAuth((isLoggedIn) => {
		// Update workspace auth
		workspace.setAuth(isLoggedIn);

		// Handle restricted mode CSS toggle
		const container = document.querySelector(".oit_calculator");
		if (container) {
			if (isLoggedIn) container.classList.add("is-logged-in");
			else container.classList.remove("is-logged-in");
		}

		// Render interactive toolbar
		renderToolbar(getToolbarProps());

		// Force UI refresh if protocol exists
		const p = workspace.getActive().getProtocol();
		if (p) {
			cachedWarnings = validateProtocol(p);
			renderProtocolTable(
				p,
				workspace.getActive().getCustomNote(),
				cachedWarnings,
			);
			updateWarnings(p, appState.warningsPageURL, cachedWarnings); // for sidebar
		}
	});

	// SETUP AUTH
	// Determine identity and vault state
	if (vaultState === "UNAUTHENTICATED") {
		// Public mode. Application is usable with publicFoods.
		appState.setAuthState(false, null);
		// renderToolbar is called by subscribeToAuth via setAuthState
	} else if (vaultState === "LOCKED") {
		// They are logged in to Supabase, but the DEK is missing in this tab.
		// Force them to unlock before loading the calculator.
		renderAuthUI("UNLOCK", handleSuccessfulAuth);
	} else if (vaultState === "UNLOCKED") {
		// 3. Fully Authenticated and Decrypted! Load the user data.
		renderAuthUI("HIDDEN");

		try {
			if (!bootstrapPromise) {
				// Fallback just in case (e.g. session was briefly false but vault unlocked, edge case)
				bootstrapPromise = loadUserConfiguration();
			}

			const userData = await bootstrapPromise;

			appState.addProvisionedData(
				userData.provisioned_foods,
				userData.provisioned_protocols,
				userData.handouts,
			);

			appState.setAuthState(true, userData.email);

			// Start background processing of custom assets
			appState.setSyncStatus("loading");
			const dek = getActiveDEK();

			if (!encryptedDocsPromise) {
				encryptedDocsPromise = fetchAllEncryptedDocuments([
					"custom_food",
					"custom_protocol",
				]);
			}

			encryptedDocsPromise
				.then(async (encryptedRows) => {
					const [customFoods, customProtocols] = await Promise.all([
						decryptDocuments<FoodData>(encryptedRows, dek, "custom_food"),
						decryptDocuments<ProtocolData>(
							encryptedRows,
							dek,
							"custom_protocol",
						),
					]);
					appState.setUserData(
						customFoods.map((doc) => doc.data),
						customProtocols.map((doc) => doc.data),
					);
					appState.setSyncStatus("success");
				})
				.catch((err) => {
					console.error("Failed to load custom assets:", err);
					appState.setSyncStatus("error");
				});
		} catch {
			console.error(
				"Failed to load provisioned assets. User may not have access.",
			);
			// Optionally handle 403s here
		} finally {
			bootstrapPromise = null; // Clear it for subsequent re-auths
			encryptedDocsPromise = null;
		}
	}

	// Initialize global delegated events (settings, table, dosing, misc)
	initGlobalEvents();

	// Initialize search inputs
	initSearchEvents(appState);

	// Initialize export listeners
	initExportEvents();

	// Subscribe workspace to renderers
	// This listener fires whenever the ACTIVE protocol changes
	// OR when the active tab switches
	workspace.subscribe((protocol, note, context) => {
		// Mount food A and B settings. These functions handle a null protocol already
		const aMount = document.getElementById("food-a-settings-mount");
		const bMount = document.getElementById("food-b-settings-mount");
		if (aMount) renderFoodASettings(workspace, aMount);
		if (bMount) renderFoodBSettings(workspace, bMount);

		// Always update toolbar to reflect current protocol dirty state
		renderToolbar(getToolbarProps());

		if (protocol) {
			showProtocolUI();
			renderDosingStrategy(protocol);
			updateFoodBDisabledState(protocol);

			const activeState = workspace.getActive();
			updateUndoRedoButtons(activeState.getCanUndo(), activeState.getCanRedo());

			// debouncer for validation engine
			if (validationTimer !== null) {
				window.clearTimeout(validationTimer);
			}

			if (context === "input") {
				// DEBOUNCED PATH; if the user is editing a numerical field, ideally the validation engine doesn't run immediately but after a slight debounce after they stop typing. ,
				renderProtocolTable(protocol, note, cachedWarnings);
				// first tho, render immediately with cached warnings to keep math snappy but colors stable

				validationTimer = window.setTimeout(() => {
					cachedWarnings = validateProtocol(protocol);
					renderProtocolTable(protocol, note, cachedWarnings);

					updateWarnings(protocol, appState.warningsPageURL, cachedWarnings);
					validationTimer = null;
				}, VALIDATION_DEBOUNCE_MS);
			} else {
				// INSTANT PATH (Structural, History, Load), no debounce needed
				cachedWarnings = validateProtocol(protocol);
				renderProtocolTable(protocol, note, cachedWarnings);
				updateWarnings(protocol, appState.warningsPageURL, cachedWarnings);
			}
		} else {
			// NO ACTIVE PROTOCOL: clear timers, warnings[], etc. and then freshly re-render
			if (validationTimer !== null) {
				clearTimeout(validationTimer);
				validationTimer = null;
			}
			cachedWarnings = [];
			renderProtocolTable(null, "", []);
			updateFoodBDisabledState(null);
			updateUndoRedoButtons(false, false);
			updateWarnings(null, appState.warningsPageURL, []);
		}
	});

	/**
	 * Subscribe to Tab list changes to re-render the Tab Bar.
	 */
	workspace.subscribeToTabs((tabs, activeId) => {
		renderTabs(tabs, activeId);
	});

	// Set up clickwrap modal
	attachClickwrapEventListeners(triggerPdfGeneration);

	// Check for debug mode
	const urlParams = new URLSearchParams(window.location.search);
	if (urlParams.get("debug") === "true") {
		const debugPanel = document.getElementById("oit-debug-panel");
		if (debugPanel) {
			debugPanel.style.display = "block";
			// Wire up the CRUD test button!
			const crudBtn = document.getElementById(
				"btn-run-crud-test",
			) as HTMLButtonElement;
			if (crudBtn) {
				crudBtn.addEventListener("click", async () => {
					crudBtn.innerText = "Running...";
					crudBtn.disabled = true;

					await runCrudTest();

					crudBtn.innerText = "Run Database Test";
					crudBtn.disabled = false;
				});
			}

			const exportBtn = document.getElementById(
				"btn-export-provisioned",
			) as HTMLButtonElement;
			if (exportBtn) {
				exportBtn.addEventListener("click", () => {
					copyActiveProtocolAsProvisioned();
				});
			}
		}
	}

	// start loading some of the heavy libraries needed for export
	prefetchPdfLibraries();

	console.log("OIT Calculator initialized");
}

const init = async () => {
	try {
		await initializeCalculator();
	} catch (e) {
		console.error("Critical init error", e);
		const calc = document.querySelector(".oit_calculator");
		if (!calc) {
			throw new Error(
				"Critical Error: .oit_calculator container not found in DOM",
			);
		}
		calc.innerHTML = `<div>Failed to load application data. Please refresh or contact support.</div>`;
	}
};

// Initialize when DOM is ready (but not during tests)
if (typeof process === "undefined" || process.env.NODE_ENV !== "test") {
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}
}
