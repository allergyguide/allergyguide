/**
 * @module
 *
 * Modal dialog management (Clickwrap, etc.)
 */
/// <reference types="cloudflare-turnstile" />

import {
	CLICKWRAP_EXPIRY_DAYS,
	OIT_CLICKWRAP_ACCEPTED_KEY,
} from "../constants";

// STATE
// ------------------
let clickwrapModal: HTMLElement | null = null;
let clickwrapCheckbox0: HTMLInputElement | null = null;
let clickwrapCheckbox1: HTMLInputElement | null = null;
let clickwrapCheckbox2: HTMLInputElement | null = null;
let clickwrapCheckbox3: HTMLInputElement | null = null;
let clickwrapCheckbox4: HTMLInputElement | null = null;
let clickwrapGenerateBtn: HTMLButtonElement | null = null;
let clickwrapCancelBtn: HTMLButtonElement | null = null;

/**
 * Checks if the user has a valid, non-expired clickwrap acceptance token
 *
 * @returns {boolean} True if the token is valid, false otherwise
 */
export function isClickwrapAccepted(): boolean {
	const stored = localStorage.getItem(OIT_CLICKWRAP_ACCEPTED_KEY);
	if (!stored) return false;

	try {
		const { expiry } = JSON.parse(stored);
		if (typeof expiry !== "number") return false;
		return Date.now() < expiry;
	} catch {
		return false;
	}
}

/**
 * Stores a clickwrap acceptance token in localStorage with a X-day expiry.
 */
export function setClickwrapAcceptToken(): void {
	const expiry = Date.now() + CLICKWRAP_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
	localStorage.setItem(OIT_CLICKWRAP_ACCEPTED_KEY, JSON.stringify({ expiry }));
}

/**
 * Displays the clickwrap modal.
 */
export function showClickwrapModal(): void {
	if (clickwrapModal) {
		clickwrapModal.style.display = "flex";
		document.body.style.overflow = "hidden"; // Lock scroll
	}
}

/**
 * Hides the clickwrap modal and resets its state.
 */
export function hideClickwrapModal(): void {
	if (clickwrapModal) {
		clickwrapModal.style.display = "none";
		document.body.style.overflow = ""; // Restore scroll
		if (clickwrapCheckbox0) clickwrapCheckbox0.checked = false;
		if (clickwrapCheckbox1) clickwrapCheckbox1.checked = false;
		if (clickwrapCheckbox2) clickwrapCheckbox2.checked = false;
		if (clickwrapCheckbox3) clickwrapCheckbox3.checked = false;
		if (clickwrapCheckbox4) clickwrapCheckbox4.checked = false;
		if (clickwrapGenerateBtn) clickwrapGenerateBtn.disabled = true;
	}
}

/**
 * Attach event listeners to the clickwrap modal elements.
 */
export function attachClickwrapEventListeners(
	onGenerate: () => Promise<void>,
): void {
	clickwrapModal = document.getElementById("oit-clickwrap-modal");
	clickwrapCheckbox0 = document.getElementById(
		"clickwrap-checkbox-0",
	) as HTMLInputElement;
	clickwrapCheckbox1 = document.getElementById(
		"clickwrap-checkbox-1",
	) as HTMLInputElement;
	clickwrapCheckbox2 = document.getElementById(
		"clickwrap-checkbox-2",
	) as HTMLInputElement;
	clickwrapCheckbox3 = document.getElementById(
		"clickwrap-checkbox-3",
	) as HTMLInputElement;
	clickwrapCheckbox4 = document.getElementById(
		"clickwrap-checkbox-4",
	) as HTMLInputElement;
	clickwrapGenerateBtn = document.getElementById(
		"clickwrap-generate-btn",
	) as HTMLButtonElement;
	clickwrapCancelBtn = document.getElementById(
		"clickwrap-cancel-btn",
	) as HTMLButtonElement;

	// all checkboxes must exist to continue
	if (
		!clickwrapModal ||
		!clickwrapCheckbox0 ||
		!clickwrapCheckbox1 ||
		!clickwrapCheckbox2 ||
		!clickwrapCheckbox3 ||
		!clickwrapCheckbox4 ||
		!clickwrapGenerateBtn ||
		!clickwrapCancelBtn
	) {
		return;
	}

	// all checkboxes must be clicked to continue
	const validateCheckboxes = () => {
		if (clickwrapGenerateBtn) {
			clickwrapGenerateBtn.disabled = !(
				clickwrapCheckbox0?.checked &&
				clickwrapCheckbox1?.checked &&
				clickwrapCheckbox2?.checked &&
				clickwrapCheckbox3?.checked &&
				clickwrapCheckbox4?.checked
			);
		}
	};

	clickwrapCheckbox0.addEventListener("change", validateCheckboxes);
	clickwrapCheckbox1.addEventListener("change", validateCheckboxes);
	clickwrapCheckbox2.addEventListener("change", validateCheckboxes);
	clickwrapCheckbox3.addEventListener("change", validateCheckboxes);
	clickwrapCheckbox4.addEventListener("change", validateCheckboxes);
	clickwrapCancelBtn.addEventListener("click", hideClickwrapModal);

	// allow ESC to get out of modal
	document.addEventListener("keydown", (e) => {
		if (
			e.key === "Escape" &&
			clickwrapModal &&
			clickwrapModal.style.display === "flex"
		) {
			hideClickwrapModal();
		}
	});

	// on clicking of generation button once available, set token, hide modal, and trigger PDF gen
	clickwrapGenerateBtn.addEventListener("click", async () => {
		setClickwrapAcceptToken();
		hideClickwrapModal();
		await onGenerate();
	});
}
