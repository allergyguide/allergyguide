// _ts/core/ui/auth-modals.ts
import { html, nothing, render } from "lit-html";
import { supabase } from "../api/supabase";
import {
	lockAndSignOut,
	loginAndUnlock,
	prefetchSalts,
	unlockVault,
} from "../auth/login-client";

// Turnstile helper
// Official Cloudflare Testing Key (Always Passes)
// https://developers.cloudflare.com/turnstile/troubleshooting/testing/

const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";
let turnstileWidgetId: string | null | undefined = null;

function renderTurnstile() {
	// If an old widget exists, completely remove it from Turnstile's memory
	if (turnstileWidgetId) {
		try {
			turnstile.remove(turnstileWidgetId);
		} catch {
			// Catch silently just in case the widget was already destroyed
		}
		turnstileWidgetId = null; // Clear the ID!
	}
	const sitekey = window.location.hostname.includes("netlify.app")
		? TURNSTILE_TEST_SITE_KEY
		: "0x4AAAAAACK7_weh_BsWxOhN";

	try {
		turnstileWidgetId = turnstile.render("#turnstile-widget", { sitekey });
	} catch (err) {
		console.error("Failed to render Turnstile:", err);
	}
}

// ----------------------------------------------------
// LOGIN TEMPLATE (Supabase Identity)
// ----------------------------------------------------
export const loginTemplate = (
	onSuccess: () => Promise<void>,
	errorMsg = "",
) => html`
	<div class="core-modal-overlay core-auth-modal-overlay">
		<div class="core-modal-content core-modal-sm core-auth-login-content">
			<h2>Custom Access</h2>
			<p class="login-instruction">Sign in to access provisioned & custom resources.</p>
			
			<form @submit=${async (e: Event) => {
				e.preventDefault();
				const email = (
					document.getElementById("login-email") as HTMLInputElement
				).value;
				const pwdInput = document.getElementById(
					"login-password",
				) as HTMLInputElement;
				const password = pwdInput.value;

				const submitBtn = document.getElementById(
					"btn-login-submit",
				) as HTMLButtonElement;

				const token = turnstileWidgetId
					? turnstile.getResponse(turnstileWidgetId)
					: "";

				if (!token)
					return renderAuthUI(
						"LOGIN",
						onSuccess,
						"Please complete the Cloudflare Turnstile.",
					);

				// disable button on click to avoid doubling
				submitBtn.disabled = true;

				// Supabase Handles Auth + Turnstile together!
				try {
					// This one function now handles both identity and crypto!
					await loginAndUnlock(email, password, token);
					await onSuccess(); // Reloads the page, and the user will bypass the Unlock modal!
				} catch (err: unknown) {
					if (turnstileWidgetId) turnstile.reset(turnstileWidgetId);
					submitBtn.disabled = false;
					pwdInput.value = "";
					renderAuthUI(
						"LOGIN",
						onSuccess,
						err instanceof Error ? err.message : "Authentication failed.",
					);
				}
			}}>
				<div class="core-auth-form-group">
					<label>Email</label>
					<input type="email" id="login-email" class="core-input" required placeholder="Enter email" autocomplete="username">
				</div>
				<div class="core-auth-form-group">
					<label>Password</label>
					<input type="password" id="login-password" class="core-input" required placeholder="Enter password" autocomplete="current-password">
				</div>
				<div class="core-auth-error-message">${errorMsg}</div>
				<div id="turnstile-widget"></div>
				<div class="core-auth-modal-buttons">
					<button type="button" class="core-btn core-btn-secondary" @click=${() => renderAuthUI("HIDDEN")}>Cancel</button>
					<button type="submit" id="btn-login-submit" class="core-btn core-btn-primary">Login</button>
				</div>
			</form>
		</div>
	</div>
`;

// ----------------------------------------------------
// UNLOCK TEMPLATE (Local Crypto Vault)
// ----------------------------------------------------
export const unlockTemplate = (
	userEmail: string,
	onSuccess: () => Promise<void>,
	errorMsg = "",
) => html`
	<div class="core-modal-overlay core-auth-modal-overlay">
		<div class="core-modal-content core-modal-sm core-auth-login-content">
			<p>Welcome back, <strong>${userEmail}</strong>.</p>
			
			<form @submit=${async (e: Event) => {
				e.preventDefault();
				const pwdInput = document.getElementById(
					"unlock-password",
				) as HTMLInputElement;
				const password = pwdInput.value;
				const submitBtn = document.getElementById(
					"btn-unlock-submit",
				) as HTMLButtonElement;

				// disable button while calculating PBKDF2 (prevents double-clicks)
				submitBtn.disabled = true;

				// Call the orchestrator
				const success = await unlockVault(password);
				if (success) {
					await onSuccess();
				} else {
					pwdInput.value = "";
					submitBtn.disabled = false;
					renderAuthUI("UNLOCK", onSuccess, "Incorrect password.");
				}
			}}>
				<div class="core-auth-form-group">
					<label>Password</label>
					<input type="password" id="unlock-password" class="core-input" required placeholder="Enter password" autocomplete="current-password">
				</div>
				<div class="core-auth-error-message">${errorMsg}</div>
				
				<div class="core-auth-modal-buttons">
					<button type="button" class="core-btn core-btn-secondary" @click=${() => lockAndSignOut()}>Not you? Sign out</button>
					<button type="submit" id="btn-unlock-submit" class="core-btn core-btn-primary">Login</button>
				</div>
			</form>
		</div>
	</div>
`;

// ----------------------------------------------------
// RENDER CONTROLLER
// ----------------------------------------------------

let currentModalState: "LOGIN" | "UNLOCK" | "HIDDEN" = "HIDDEN";
// A single, global event listener for the Escape key
document.addEventListener("keydown", (e: KeyboardEvent) => {
	if (e.key === "Escape" && currentModalState !== "HIDDEN") {
		if (currentModalState === "LOGIN") {
			// User canceled logging in: just hide the modal
			renderAuthUI("HIDDEN");
		} else if (currentModalState === "UNLOCK") {
			// User canceled unlocking; safely wipe identity and reload
			lockAndSignOut();
		}
	}
});

export function renderAuthUI(
	state: "LOGIN" | "UNLOCK" | "HIDDEN",
	onSuccess?: () => Promise<void>,
	errorMsg = "",
) {
	const mountNode = document.getElementById("auth-modal-mount");
	if (!mountNode) return;

	// Update the module state so the ESC key knows what to do
	currentModalState = state;

	if (state === "HIDDEN") {
		document.body.style.overflow = ""; // Restore scrolling
		render(nothing, mountNode);
		return;
	} else {
		document.body.style.overflow = "hidden"; // Lock background scroll

		// Fire a single warmup ping to establish TLS connections ahead of time; this will also work for other tools
		fetch("/.netlify/functions/oit-bootstrap", {
			headers: { "x-warmup": "true" },
		}).catch(() => {});
	}

	if (state === "LOGIN" && onSuccess) {
		render(loginTemplate(onSuccess, errorMsg), mountNode);
		setTimeout(renderTurnstile, 0);
		setTimeout(() => {
			const emailInput = document.getElementById(
				"login-email",
			) as HTMLInputElement | null;
			if (emailInput) {
				emailInput.focus();

				// Prefetch salts as early as possible to hide the ~1s cold RPC latency: fire on both debounced input and blur
				const isValidEmail = (v: string) =>
					/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

				let debounceTimer: ReturnType<typeof setTimeout>;
				emailInput.addEventListener("input", () => {
					clearTimeout(debounceTimer);
					debounceTimer = setTimeout(() => {
						if (isValidEmail(emailInput.value)) prefetchSalts(emailInput.value);
					}, 400);
				});

				emailInput.addEventListener("blur", () => {
					clearTimeout(debounceTimer);
					if (isValidEmail(emailInput.value)) prefetchSalts(emailInput.value);
				});
			}
		}, 0);
	}

	if (state === "UNLOCK" && onSuccess) {
		supabase.auth.getSession().then(({ data }) => {
			const email = data.session?.user.email || "User";
			render(unlockTemplate(email, onSuccess, errorMsg), mountNode);
			// We already know the email from the session
			if (data.session?.user.email) prefetchSalts(data.session.user.email);
		});
	}
}
