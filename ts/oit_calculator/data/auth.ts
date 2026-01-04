import { HttpError } from "../types";

/**
 * Authenticates a user via the Netlify login function.
 *
 * Use this function to validate credentials and the captcha token against the backend.
 *
 * @param username - The user's login identifier.
 * @param password - The raw password string.
 * @param captchaToken - The verification token received from the client-side captcha widget.
 *
 * @returns A Promise that resolves to `true` only upon successful authentication.
 *
 * @throws {HttpError} on 400, 401, 405, 500, or HTML/Network failures.
 */
export async function login(username: string, password: string, captchaToken: string): Promise<boolean> {
  const response = await fetch('/.netlify/functions/auth-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, captchaToken })
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
    console.log("Logged in!");
    return true
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
    throw new HttpError(serverMessage || 'Captcha failed', 400);
  }
  if (response.status === 401) {
    throw new HttpError('Invalid credentials', 401)
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
 * This function sends a POST request to the `/.netlify/functions/auth-logout` endpoint, instructing the backend to clear the `nf_jwt` HTTP-only cookie.
 * @returns A Promise that resolves to `true` if the logout request was sent successfully, or `false` if a network error occurred.
 */
export async function logout() {
  try {
    await fetch('/.netlify/functions/auth-logout', {
      method: 'POST', // Use POST to prevent browser pre-fetching from logging you out
    });
    return true;
  } catch (err) {
    console.error("Logout failed", err);
    return false;
  }
}

