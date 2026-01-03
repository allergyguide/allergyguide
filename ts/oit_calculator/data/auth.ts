import { HttpError } from "../types";

export async function login(username: string, password: string): Promise<boolean> {

  try {
    const response = await fetch('/.netlify/functions/auth-login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    // make sure its a SON - if it's not... then you're getting a malformed response, or the netlify function is not up and running properly?
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.error("Received non-JSON response from login NF:", text.substring(0, 100)); // Log first 100 chars
      throw new HttpError('Configuration Error: Login API unavailable', 500);
    }

    if (response.ok) {
      console.log("Logged in!");
      return true
    } else if (response.status === 405) {
      throw new HttpError('Method not allowed', 405)
    }
    else if (response.status === 401) {
      throw new HttpError('Invalid credentials', 401)
    }
    else if (response.status === 500) {
      throw new HttpError('Internal server err', 500)
    }
  } catch (err) {
    throw err
  }
  return false
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

