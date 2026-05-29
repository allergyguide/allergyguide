/**
 * Handles the logic and display for the user authentication modal
 * Note: HTML for this modal is shared with the OIT calculator in templates/shortcodes/oit_calculator_components/login_modal.html
 * So there's lots of legacy logic
 */
import { login } from "../data/auth";
import { HttpError } from "../types";

let turnstileWidgetId: string | null | undefined = null;

/**
 * Displays the login modal and initializes the Turnstile security check
 */
export function showLoginModal() {
	const modal = document.getElementById("oit-login-modal");
	const errorMsg = document.getElementById("oit-login-error");
	if (!modal) return;

	modal.style.display = "flex";
	document.body.style.overflow = "hidden";
	if (errorMsg) errorMsg.textContent = "";
	ensureTurnstileRendered();
}

/**
 * Hides the login modal and restores page scrolling
 */
export function hideLoginModal() {
	const modal = document.getElementById("oit-login-modal");
	if (modal) {
		modal.style.display = "none";
		document.body.style.overflow = "";
	}
}

/**
 * Attaches event listeners to the login form and cancel button
 *
 * @param onLoginAttempt - Callback function executed after a successful login to refresh data
 */
export function attachLoginModalListeners(
	onLoginAttempt: () => Promise<boolean>,
) {
	const modal = document.getElementById("oit-login-modal");
	const form = document.getElementById("oit-login-form") as HTMLFormElement;
	const errorMsg = document.getElementById("oit-login-error");
	const cancelBtn = document.getElementById("btn-login-cancel");

	if (!modal || !form) return;

	cancelBtn?.addEventListener("click", () => {
		hideLoginModal();
	});

	form.addEventListener("submit", async (e) => {
		e.preventDefault();
		if (errorMsg) errorMsg.textContent = "Logging in...";

		const username = (
			document.getElementById("login-username") as HTMLInputElement
		).value;
		const password = (
			document.getElementById("login-password") as HTMLInputElement
		).value;
		const turnstileToken =
			turnstileWidgetId !== null && turnstileWidgetId !== undefined
				? turnstile.getResponse(turnstileWidgetId)
				: "";

		if (!turnstileToken) {
			if (errorMsg)
				errorMsg.textContent = "Please complete the security check.";
			return;
		}

		try {
			const result = await login(username, password, turnstileToken);
			if (result.valid) {
				localStorage.setItem(
					"oit_session_active",
					JSON.stringify({
						valid: true,
						username: result.username,
						expiresAt: result.expiresAt,
					}),
				);

				const success = await onLoginAttempt();
				if (success) {
					hideLoginModal();
					form.reset();
					if (turnstileWidgetId !== null && turnstileWidgetId !== undefined) {
						turnstile.reset(turnstileWidgetId);
					}
				} else {
					if (errorMsg)
						errorMsg.textContent =
							"Login succeeded but failed to load your clinical data.";
				}
			}
		} catch (err) {
			if (errorMsg) {
				errorMsg.textContent =
					err instanceof HttpError
						? err.message
						: "An unexpected error occurred.";
			}
			if (turnstileWidgetId !== null && turnstileWidgetId !== undefined) {
				turnstile.reset(turnstileWidgetId);
			}
		}
	});
}

/**
 * Ensures the Cloudflare Turnstile widget is rendered in the login modal
 * Uses a different sitekey for Netlify preview environments
 */
function ensureTurnstileRendered() {
	if (turnstileWidgetId !== null) return;

	const container = document.getElementById("turnstile-widget");
	if (!container) return;

	let sitekey = "0x4AAAAAACK7_weh_BsWxOhN";

	// for private netlify deploys
	if (window.location.hostname.includes("netlify.app")) {
		sitekey = "1x00000000000000000000AA";
	}

	try {
		turnstileWidgetId = turnstile.render("#turnstile-widget", {
			sitekey: sitekey,
		});
	} catch (err) {
		console.error("Failed to render Turnstile:", err);
	}
}
