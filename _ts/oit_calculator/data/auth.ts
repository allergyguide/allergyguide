import { HttpError, type AuthLoginResult } from "../types";

/**
 * Authenticates a user via the Netlify login function.
 *
 * Use this function to validate credentials and the turnstile token against the backend.
 *
 * @param username - The user's login identifier.
 * @param password - The raw password string.
 * @param turnstileToken - The verification token received from the client-side turnstile widget.
 *
 * @returns A Promise that resolves to an `AuthLoginResult` upon successful authentication.
 *
 * @throws {HttpError} on 400, 401, 405, 500, or HTML/Network failures.
 */
export async function login(username: string, password: string, turnstileToken: string): Promise<AuthLoginResult> {
  const response = await fetch('/.netlify/functions/auth-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, turnstileToken: turnstileToken })
  });

  // Handle HTML/Crash responses 
  // make sure its a JSON - if it's not... then you're getting a malformed response, or the netlify function is not up and running properly
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    const text = await response.text();
    console.error("Received non-JSON response from login NF:", text.substring(0, 100)); // Log first 100 chars
    throw new HttpError('Configuration Error: Login API unavailable', 500);
  }

  // Handle success
  if (response.ok) {
    const data = await response.json();
    const expiryHours = data.expiryHours || 24; // Default if missing
    const expiresAt = Date.now() + (expiryHours * 60 * 60 * 1000);

    return {
      valid: true,
      expiresAt: expiresAt,
      username: username
    }
  }

  // Handle errs
  let serverMessage = '';
  try {
    const data = await response.json();
    serverMessage = data.message || data.error || JSON.stringify(data) || '';
  } catch (e) {
    // Body was JSON but malformed, or empty
  }
  if (response.status === 400) {
    throw new HttpError(serverMessage || 'Turnstile failed', 400);
  }
  if (response.status === 401) {
    throw new HttpError('Invalid credentials', 401)
  }
  if (response.status === 403) {
    throw new HttpError('No config available for user', 403)
  }
  if (response.status === 405) {
    throw new HttpError('Method not allowed', 405)
  }
  // Catch-all for 500s or other unknown errors
  // Use the server message if we found one, otherwise a generic fallback
  throw new HttpError(serverMessage || `Unknown login error (${response.status})`, response.status);
}

/**
 * Terminates the current user session.
 * This function sends a POST request to the `/.netlify/functions/auth-logout` endpoint, instructing the backend to clear the `nf_jwt` HTTP-only cookie, and removes the `oit_session_active` flag from local storage.
 * @returns A Promise that resolves to `true` if the logout request was sent successfully, or `false` if a network error occurred.
 */
export async function logout() {
  try {
    localStorage.removeItem('oit_session_active');
    await fetch('/.netlify/functions/auth-logout', {
      method: 'POST', // Use POST to prevent browser pre-fetching from logging you out
    });
    return true;
  } catch (err) {
    console.error("Logout failed", err);
    return false;
  }
}

