import { DEK_STORAGE_KEY, VAULT_SYNC_CHANNEL } from "../constants";

// A dedicated channel for secure tab-to-tab communication
const vaultChannel = new BroadcastChannel(VAULT_SYNC_CHANNEL);

// auto-bind the listener immediately
vaultChannel.addEventListener("message", (event) => {
	const { type, payload } = event.data;

	if (type === "REQUEST_DEK") {
		const activeDek = sessionStorage.getItem(DEK_STORAGE_KEY);
		if (activeDek) {
			vaultChannel.postMessage({
				type: "PROVIDE_DEK",
				payload: activeDek,
			});
		}
	}

	if (type === "PROVIDE_DEK" && payload) {
		if (!sessionStorage.getItem(DEK_STORAGE_KEY)) {
			sessionStorage.setItem(DEK_STORAGE_KEY, payload);
			window.dispatchEvent(new Event("dek-synced"));
		}
	}
});

/**
 * Requests the DEK from other open tabs
 *
 * @param timeoutMs - Milliseconds to wait before timing out
 * @returns {Promise<boolean>} Promise resolving to true if a DEK was received
 */
export async function requestDekFromTabs(timeoutMs = 200): Promise<boolean> {
	return new Promise((resolve) => {
		// If no other tab answers in timeoutMs, assume we are the only tab open
		const timeout = setTimeout(() => {
			window.removeEventListener("dek-synced", syncHandler);
			resolve(false);
		}, timeoutMs);

		// Listen for the custom event fired by our channel listener above
		const syncHandler = () => {
			clearTimeout(timeout);
			window.removeEventListener("dek-synced", syncHandler);
			resolve(true); // We got it!
		};
		window.addEventListener("dek-synced", syncHandler);

		vaultChannel.postMessage({ type: "REQUEST_DEK" });
	});
}
