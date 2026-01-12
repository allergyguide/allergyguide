/**
 * @module
 *
 * Modal dialog management (Clickwrap, etc.)
 */
/// <reference types="cloudflare-turnstile" />

import { OIT_CLICKWRAP_ACCEPTED_KEY, CLICKWRAP_EXPIRY_DAYS } from "../constants";
import {
  HttpError
} from "../types"
import { requestSaveProtocol } from "../data/api";
import { workspace } from "../state/instances";
import { serializeProtocol } from "../utils";
import { generateAsciiContent } from "../export/exports";
import { login } from "../data/auth";
import { validateProtocol } from "../core/validator";

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

let turnstileWidgetId: string | null | undefined = null;
// ------------------

// Official Cloudflare Testing Key (Always Passes)
// https://developers.cloudflare.com/turnstile/troubleshooting/testing/
const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";

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
    if (typeof expiry !== 'number') return false;
    return new Date().getTime() < expiry;
  } catch (e) {
    return false;
  }
}

/**
 * Stores a clickwrap acceptance token in localStorage with a X-day expiry.
 */
export function setClickwrapAcceptToken(): void {
  const expiry = new Date().getTime() + CLICKWRAP_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  localStorage.setItem(OIT_CLICKWRAP_ACCEPTED_KEY, JSON.stringify({ expiry }));
}

/**
 * Displays the clickwrap modal.
 */
export function showClickwrapModal(): void {
  if (clickwrapModal) {
    clickwrapModal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Lock scroll
  }
}

/**
 * Hides the clickwrap modal and resets its state.
 */
export function hideClickwrapModal(): void {
  if (clickwrapModal) {
    clickwrapModal.style.display = 'none';
    document.body.style.overflow = ''; // Restore scroll
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
export function attachClickwrapEventListeners(onGenerate: () => Promise<void>): void {
  clickwrapModal = document.getElementById('oit-clickwrap-modal');
  clickwrapCheckbox0 = document.getElementById('clickwrap-checkbox-0') as HTMLInputElement;
  clickwrapCheckbox1 = document.getElementById('clickwrap-checkbox-1') as HTMLInputElement;
  clickwrapCheckbox2 = document.getElementById('clickwrap-checkbox-2') as HTMLInputElement;
  clickwrapCheckbox3 = document.getElementById('clickwrap-checkbox-3') as HTMLInputElement;
  clickwrapCheckbox4 = document.getElementById('clickwrap-checkbox-4') as HTMLInputElement;
  clickwrapGenerateBtn = document.getElementById('clickwrap-generate-btn') as HTMLButtonElement;
  clickwrapCancelBtn = document.getElementById('clickwrap-cancel-btn') as HTMLButtonElement;

  // all checkboxes must exist to continue
  if (!clickwrapModal || !clickwrapCheckbox0 || !clickwrapCheckbox1 || !clickwrapCheckbox2 || !clickwrapCheckbox3 || !clickwrapCheckbox4 || !clickwrapGenerateBtn || !clickwrapCancelBtn) {
    return;
  }

  // all checkboxes must be clicked to continue
  const validateCheckboxes = () => {
    if (clickwrapGenerateBtn) {
      clickwrapGenerateBtn.disabled = !(clickwrapCheckbox0?.checked && clickwrapCheckbox1?.checked && clickwrapCheckbox2?.checked && clickwrapCheckbox3?.checked && clickwrapCheckbox4?.checked);
    }
  };

  clickwrapCheckbox0.addEventListener('change', validateCheckboxes);
  clickwrapCheckbox1.addEventListener('change', validateCheckboxes);
  clickwrapCheckbox2.addEventListener('change', validateCheckboxes);
  clickwrapCheckbox3.addEventListener('change', validateCheckboxes);
  clickwrapCheckbox4.addEventListener('change', validateCheckboxes);
  clickwrapCancelBtn.addEventListener('click', hideClickwrapModal);

  // allow ESC to get out of modal
  document.addEventListener('keydown', (e) => {
    if (e.key === "Escape" && clickwrapModal && clickwrapModal.style.display === 'flex') {
      hideClickwrapModal();
    }
  });

  // on clicking of generation button once available, set token, hide modal, and trigger PDF gen
  clickwrapGenerateBtn.addEventListener('click', async () => {
    setClickwrapAcceptToken();
    hideClickwrapModal();
    await onGenerate();
  });
}

/**
 * Renders the Turnstile widget if it hasn't been rendered yet.
 */
function ensureTurnstileRendered() {
  const widgetContainer = document.getElementById("turnstile-widget");
  if (!widgetContainer || !turnstile) return;

  // If already rendered, just reset it
  if (turnstileWidgetId) {
    turnstile.reset(turnstileWidgetId);
    return;
  }

  let sitekey = "0x4AAAAAACK7_weh_BsWxOhN";

  // for private netlify deploys
  if (window.location.hostname.includes("netlify.app")) {
    sitekey = TURNSTILE_TEST_SITE_KEY;
  }

  // Render
  try {
    turnstileWidgetId = turnstile.render("#turnstile-widget", {
      sitekey: sitekey,
    });
  } catch (err) {
    console.error("Failed to render Turnstile:", err);
  }
}


/**
 * Attach listeners to the login modal.
 * @param onLoginAttempt - Callback that triggers data loading. Must return TRUE if load succeeded, FALSE otherwise.
 */
export function attachLoginModalListeners(onLoginAttempt: () => Promise<boolean>) {
  const loginBtn = document.getElementById("btn-login-trigger"); // The button in the main UI
  const modal = document.getElementById("oit-login-modal");
  const form = document.getElementById("oit-login-form") as HTMLFormElement;
  const errorMsg = document.getElementById("oit-login-error");
  const cancelBtn = document.getElementById("btn-login-cancel");

  if (!loginBtn || !modal || !form) return;

  // Show Modal
  loginBtn.addEventListener("click", () => {
    modal.style.display = "flex";
    document.body.style.overflow = 'hidden'; // Lock scroll
    if (errorMsg) errorMsg.textContent = "";

    // init turnstile
    ensureTurnstileRendered();

    // PING auth-login, warm up netlify function
    fetch('/.netlify/functions/auth-login', {
      method: 'OPTIONS',
    }).catch(() => {
    });
  });

  // Hide Modal
  const hide = () => {
    modal.style.display = "none";
    document.body.style.overflow = ''; // Restore scroll
    form.reset();
    if (turnstileWidgetId) turnstile.reset(turnstileWidgetId);
  };

  if (cancelBtn) cancelBtn.addEventListener("click", hide);

  // Allow ESC to close
  document.addEventListener('keydown', (e) => {
    if (e.key === "Escape" && modal && modal.style.display === 'flex') {
      hide();
    }
  });

  // Submit
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = (document.getElementById("login-username") as HTMLInputElement).value;
    const password = (document.getElementById("login-password") as HTMLInputElement).value;
    const submitBtn = form.querySelector("button[type='submit']") as HTMLButtonElement;

    // GET TURNSTILE TOKEN
    const turnstileToken = turnstileWidgetId ? turnstile.getResponse(turnstileWidgetId) : "";
    if (!turnstileToken) {
      if (errorMsg) errorMsg.textContent = "Please complete the Turnstile verification.";
      return;
    }

    try {
      submitBtn.textContent = "Logging in...";
      submitBtn.disabled = true;
      if (errorMsg) errorMsg.textContent = "";

      // AUTH password
      const authSuccess = await login(username, password, turnstileToken);

      if (authSuccess) {
        const loadSuccess = await onLoginAttempt();
        if (loadSuccess) {
          hide();
          localStorage.setItem('oit_session_active', JSON.stringify({
            valid: true,
            expiresAt: authSuccess.expiresAt,
            username: authSuccess.username
          }));
        } else {
          // FAIL: Keep modal open, show error to user
          // This implies auth worked, but they don't have the OIT tool config or lacks permissions
          if (errorMsg) errorMsg.textContent = "Login successful, but this account lacks access to the OIT Calculator.";
          // Reset turnstile because the token is single-use
          if (turnstileWidgetId) turnstile.reset(turnstileWidgetId);
        }
      }
    } catch (error) {
      // ALWAYS RESET TURNSTILE ON ERROR (Token cannot be reused)
      if (turnstileWidgetId) turnstile.reset(turnstileWidgetId);

      if (errorMsg) {
        if (error instanceof HttpError) {
          if (error.status === 401 || error.status === 403) {
            errorMsg.textContent = "Invalid username or password.";
          }
          else if (error.status === 400) {
            errorMsg.textContent = "Turnstile validation failed. Please try again.";
          }
          else if (error.status === 500) {
            errorMsg.textContent = "Configuration Error: Netlify function API unavailable or internal err";
          } else {
            errorMsg.textContent = "Login failed. Please try again.";
          }
        } else {
          console.log(error);
          errorMsg.textContent = "Login failed. Please try again.";
        }
      }
    } finally {
      submitBtn.textContent = "Login";
      submitBtn.disabled = false;
    }
  });
}

/**
 * Attaches event listeners for the "Request Save Protocol" feature.
 * 
 * This includes:
 * 1. Event delegation for the trigger button (since it's toggled by renderers).
 * 2. Modal cancellation and form resetting.
 * 3. Form submission handling, which serializes the active state and calls the API.
 */
export function attachSaveRequestListeners() {
  const modal = document.getElementById("oit-save-request-modal");
  const cancelBtn = document.getElementById("btn-save-req-cancel");
  const form = document.getElementById("save-request-form") as HTMLFormElement;

  document.body.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target && target.id === 'btn-trigger-save-request') {
      if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Lock scroll
      }
    }
  });

  const closeModal = () => {
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = ''; // Restore scroll
      form.reset();
    }
  };

  if (cancelBtn && modal) {
    cancelBtn.addEventListener('click', closeModal);
  }

  // Allow ESC to close
  document.addEventListener('keydown', (e) => {
    if (e.key === "Escape" && modal && modal.style.display === 'flex') {
      closeModal();
    }
  });

  if (form && modal) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById("btn-save-req-submit") as HTMLButtonElement;
      const originalText = submitBtn.textContent;

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending...";

        const currentProtocol = workspace.getActive().getProtocol();
        const currentNote = workspace.getActive().getCustomNote();
        if (!currentProtocol) throw new Error("No active protocol");
        const warnings = validateProtocol(currentProtocol);

        const warningsString = warnings.length > 0
          ? warnings.map(w => `[${w.severity.toUpperCase()}] ${w.stepIndex !== undefined ? `Step ${w.stepIndex}: ` : ""}${w.message}`).join("\n")
          : "No active warnings.";

        const protocolData = serializeProtocol(currentProtocol, currentNote);
        const ascii = generateAsciiContent([{
          protocol: currentProtocol,
          customNote: currentNote,
          history: workspace.getActive().getHistory()
        }]);

        const name = (document.getElementById("req-protocol-name") as HTMLInputElement).value;
        const email = (document.getElementById("req-email") as HTMLInputElement).value;
        const context = (document.getElementById("req-context") as HTMLInputElement).value;

        await requestSaveProtocol({
          protocolData: protocolData,
          ascii: ascii,
          protocolName: name,
          userEmail: email,
          context: context,
          warnings: warningsString
        });

        console.log("Request sent successfully.");
        closeModal();
      } catch (err: any) {
        console.error(`Error with Protocol Save Request submission: ${err.message}`);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }
}
