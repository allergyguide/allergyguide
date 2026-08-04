// _ts/signup.ts
import { createClient, type Session } from "@supabase/supabase-js";
import { html, nothing, render, type TemplateResult } from "lit-html";
import { deriveAuthHash, deriveKEK } from "./core/crypto/derivation";
import { bufferToHex } from "./core/crypto/encoding";
import { generateDEK, wrapDEK } from "./core/crypto/encryption";

declare const __SUPABASE_URL__: string;
declare const __SUPABASE_PUBLISHABLE_KEY__: string;

const supabase = createClient(__SUPABASE_URL__, __SUPABASE_PUBLISHABLE_KEY__);
const mountNode = document.getElementById("signup-mount");

type OnboardingState =
	| "LOADING"
	| "ALREADY_SETUP"
	| "SETUP"
	| "SUCCESS"
	| "ERROR";

let currentState: OnboardingState = "LOADING";
let userEmail = "";
let userId = "";
let isProcessing = false;
let isUnderstood = false;
let isTermsAccepted = false;
let errorMessage = "";
let complexityError = "";
let matchError = false;

let passwordValue = "";
let confirmValue = "";

function validatePasswordComplexity(password: string): string | null {
	if (password.length < 10)
		return "Password must be at least 10 characters long.";
	if (!/[A-Z]/.test(password))
		return "Password must contain an uppercase letter.";
	if (!/[a-z]/.test(password))
		return "Password must contain a lowercase letter.";
	if (!/[0-9]/.test(password)) return "Password must contain a number.";
	if (!/[^A-Za-z0-9]/.test(password))
		return "Password must contain a special character (e.g., !@#$%).";
	return null;
}

async function handleSetup(e: Event) {
	e.preventDefault();

	errorMessage = "";
	complexityError = "";

	if (!isUnderstood) {
		errorMessage = "You must confirm you understand the recovery risk.";
		updateUI();
		return;
	}

	if (!isTermsAccepted) {
		errorMessage = "You must accept the Terms of Use.";
		updateUI();
		return;
	}

	const password = passwordValue;
	const confirm = confirmValue;

	const complexity = validatePasswordComplexity(password);
	if (complexity) {
		complexityError = complexity;
		updateUI();
		return;
	}

	if (password !== confirm) {
		errorMessage = "Passwords do not match.";
		confirmValue = "";
		matchError = true;
		updateUI();
		return;
	}

	// Lock UI
	isProcessing = true;
	updateUI();

	// Yield to the browser's render thread so it can paint the "Securing Account..." UI
	await new Promise((resolve) => setTimeout(resolve, 50));

	try {
		// Generate real cryptographic salts (16 bytes = 32 hex characters)
		const authSaltBytes = window.crypto.getRandomValues(new Uint8Array(16));
		const kekSaltBytes = window.crypto.getRandomValues(new Uint8Array(16));
		const authSaltHex = bufferToHex(authSaltBytes);
		const kekSaltHex = bufferToHex(kekSaltBytes);

		// Derive the Auth Hash and KEK
		const [authHash, kek] = await Promise.all([
			deriveAuthHash(password, authSaltHex),
			deriveKEK(password, kekSaltHex),
		]);

		// Generate a brand new DEK and encrypt it with the KEK
		const dek = await generateDEK();
		const { encryptedDekBase64, ivBase64 } = await wrapDEK(dek, kek);

		// Set Permanent Password
		const { error: authError } = await supabase.auth.updateUser({
			password: authHash,
		});
		if (authError) throw new Error(`Auth Error: ${authError.message}`);

		// Insert Metadata
		const { error: dbError } = await supabase.from("authorized_users").insert([
			{
				id: userId,
				auth_salt: authSaltHex,
				kek_salt: kekSaltHex,
				encrypted_dek: encryptedDekBase64,
				dek_iv: ivBase64,
				setup_complete: true,
			},
		]);
		if (dbError) throw new Error(`Database Error: ${dbError.message}`);

		// Success!
		currentState = "SUCCESS";
	} catch (err: unknown) {
		console.error(err);
		errorMessage =
			err instanceof Error ? err.message : "An unexpected error occurred.";
	} finally {
		isProcessing = false;
		updateUI();
	}
}

const loadingTemplate = () => html`
  <div class="signup-container">
    <div class="signup-card loading-state">
      <div class="spinner"></div>
      <p>Verifying secure link...</p>
    </div>
  </div>
`;

const errorTemplate = () => html`
  <div class="signup-container">
    <div class="signup-card center-text">
      <div class="status-icon error-icon">✕</div>
      <h3>Invalid Link</h3>
      <p>${errorMessage || "This invite link is invalid or has expired."}</p>
      <div class="signup-actions">
        <a href="/" class="core-btn core-btn-secondary">Go to homepage</a>
      </div>
    </div>
  </div>
`;

const alreadySetupTemplate = () => html`
  <div class="signup-container">
    <div class="signup-card center-text">
      <div class="status-icon success-icon">✓</div>
      <h3>Setup Complete</h3>
      <p>You have already set up your password and secured your account.</p>
      <div class="signup-actions">
        <a href="/" class="core-btn core-btn-primary">Homepage</a>
      </div>
    </div>
  </div>
`;

const setupTemplate = () => html`
  <div class="signup-container">
    <div class="signup-card">
      <div class="signup-header">
        <h3>Secure Your Account</h3>
        <p class="user-identity">Email: <strong>${userEmail}</strong></p>
      </div>

      <div class="warning-box">
        <div class="warning-title">
          <span class="warning-icon">!</span>
          Critical Privacy Warning
        </div>
        <p>Your password encrypts your custom data (i.e. foods and protocols you've created), and we store no copies of your password.</p>
        <p><strong>If you lose this password, your data is gone forever: we have no way to recover it.</strong></p>
      </div>

      <form class="signup-form" @submit=${handleSetup}>
        <div class="form-group">
          <label for="input-password">Password</label>
          <input 
            type="password" 
            id="input-password" 
            class="core-input" 
            .value=${passwordValue}
            @input=${(e: Event) => {
							passwordValue = (e.target as HTMLInputElement).value;
							if (passwordValue.length === 0) {
								complexityError = ""; // Don't yell at them if it's empty
							} else {
								complexityError =
									validatePasswordComplexity(passwordValue) || "";
							}
							matchError =
								confirmValue.length > 0 && passwordValue !== confirmValue;
							errorMessage = ""; // Clear generic errors on type
							updateUI();
						}}
            ?disabled=${isProcessing} 
            required
            autocomplete="new-password"
          >
          ${
						complexityError
							? html`<div class="inline-error">${complexityError}</div>`
							: nothing
					}
        </div>
        <div class="form-group">
          <label for="input-confirm">Confirm Password</label>
          <input 
            type="password" 
            id="input-confirm" 
            .value=${confirmValue}
            @input=${(e: Event) => {
							confirmValue = (e.target as HTMLInputElement).value;
							matchError =
								confirmValue.length > 0 && passwordValue !== confirmValue;
							errorMessage = ""; // Clear generic errors on type
							updateUI();
						}}
            class="core-input" 
            ?disabled=${isProcessing} 
            required
            autocomplete="new-password"
          >
          ${
						matchError && confirmValue.length > 0
							? html`<div class="inline-error">Passwords do not match.</div>`
							: nothing
					}
        </div>

        <div class="checkbox-group">
          <label class="checkbox-container">
            <input 
              type="checkbox" 
              id="check-understand" 
              ?disabled=${isProcessing}
              .checked=${isUnderstood}
              @change=${(e: Event) => {
								isUnderstood = (e.target as HTMLInputElement).checked;
								updateUI();
							}}
            >
            <span class="checkmark"></span>
            I understand that my data cannot be recovered if I lose this password.
          </label>
          <label class="checkbox-container" style="margin-top: 1rem;">
            <input 
              type="checkbox" 
              id="check-terms" 
              ?disabled=${isProcessing}
              .checked=${isTermsAccepted}
              @change=${(e: Event) => {
								isTermsAccepted = (e.target as HTMLInputElement).checked;
								updateUI();
							}}
            >
            <span class="checkmark"></span>
            I acknowledge the Medical Disclaimer and agree to the <a href="/termsofuse" target="_blank" rel="noopener noreferrer">Terms of Use</a>.
          </label>
        </div>

        ${
					errorMessage
						? html`<div class="error-message">${errorMessage}</div>`
						: nothing
				}

        <div class="signup-actions">
          <button 
            type="submit" 
            id="btn-submit" 
            class="core-btn core-btn-primary full-width"
            ?disabled=${isProcessing || !isUnderstood || !isTermsAccepted || Boolean(complexityError) || matchError || !passwordValue}
          >
            ${isProcessing ? "Securing Account..." : "Set Password & Secure Account"}
          </button>
        </div>
      </form>
    </div>
  </div>
`;

const successTemplate = () => html`
  <div class="signup-container">
    <div class="signup-card center-text">
      <div class="status-icon success-icon pulse">✓</div>
      <h3>Account created!</h3>
      <p>Your password has been set.</p>
      <div class="signup-actions">
        <a href="/" class="core-btn core-btn-primary">Go to homepage</a>
      </div>
    </div>
  </div>
`;

function updateUI() {
	if (!mountNode) return;

	let content: TemplateResult | typeof nothing = nothing;
	switch (currentState) {
		case "LOADING":
			content = loadingTemplate();
			break;
		case "ALREADY_SETUP":
			content = alreadySetupTemplate();
			break;
		case "SETUP":
			content = setupTemplate();
			break;
		case "ERROR":
			content = errorTemplate();
			break;
		case "SUCCESS":
			content = successTemplate();
			break;
	}

	render(content, mountNode);
}

async function processSession(session: Session) {
	// If we're already setup or success, don't re-check
	if (currentState === "ALREADY_SETUP" || currentState === "SUCCESS") return;

	userEmail = session.user.email || "Unknown";
	userId = session.user.id;

	try {
		// Check if user is already set up in the database
		const { data: userData } = await supabase
			.from("authorized_users")
			.select("setup_complete")
			.eq("id", session.user.id)
			.maybeSingle();

		if (userData?.setup_complete) {
			currentState = "ALREADY_SETUP";
		} else {
			currentState = "SETUP";
		}
	} catch (err) {
		console.error("Initialization error:", err);
		currentState = "SETUP";
	} finally {
		updateUI();
	}
}

export async function initializeInviteReceiver() {
	updateUI();

	// 1. Actively grab the session (Handles both fresh URL hashes AND Refreshes)
	const {
		data: { session },
		error,
	} = await supabase.auth.getSession();

	if (error || !session) {
		currentState = "ERROR";
		errorMessage = "We could not verify your link. It may have expired.";
		updateUI();
	} else {
		await processSession(session);
	}

	supabase.auth.onAuthStateChange(async (_event, session) => {
		// Ignore background events if we are actively processing the setup
		if (isProcessing) return;

		if (!session) {
			currentState = "ERROR";
			errorMessage =
				"We could not verify your invite link. It may have expired.";
			updateUI();
			return;
		}

		await processSession(session);
	});
}

// Global initialization
initializeInviteReceiver();
