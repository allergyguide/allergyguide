/**
 * Application entry point
 * Initialization, global event listeners, data bootstrapping
 */

import { handleUserLoad, loadPublicFoods } from "./data/loader";
import { appState } from "./state/state";
import { initApp } from "./ui/app";
import { attachLoginModalListeners } from "./ui/login-modal";

/**
 * Main initialization function
 *
 * 1. Find the mount point in the DOM
 * 2. Set up global state subscriptions
 * 3. Register global keyboard shortcuts
 * 4. Parallel loading of public and user-specific food data
 * 5. Mount the Lit-html application and wire up login modal
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

	// Start loading public data
	const publicFoodsPromise = loadPublicFoods();

	// Check for user login and load provisioned data
	const userLoadPromise = handleUserLoad();

	// Wire up login modal
	attachLoginModalListeners(async () => {
		const userResult = await handleUserLoad();
		const publicFoods = await publicFoodsPromise;
		appState.setAuthState(userResult.isLoggedIn, userResult.username);
		appState.setFoods(publicFoods, userResult.foods);
		return true;
	});

	try {
		const [publicFoods, userResult] = await Promise.all([
			publicFoodsPromise,
			userLoadPromise,
		]);

		appState.setAuthState(userResult.isLoggedIn, userResult.username);
		appState.setFoods(publicFoods, userResult.foods);
		console.log("OFC Index Data loaded successfully");

		// Init UI to replace skeleton UI in shortcode html, now that data is loaded
		initApp(mountPoint);
	} catch (e) {
		console.error("Failed to load OFC index data", e);
	}
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initializeOFC);
} else {
	initializeOFC();
}
