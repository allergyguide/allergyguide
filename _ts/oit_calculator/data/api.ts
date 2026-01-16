/**
 * @module
 * Handles network requests for secure assets and to request protocol saving (email to dev).
 */
import { HttpError, type SaveRequestPayload } from "../types";

/**
 * Fetcher for secure assets
 * Handles the URL construction and basic HTTP error throwing
 * Calls netlify function
 * @param filepath - from within secure_assets
 * @param format - how you want the data returned
 * @throws various auth errors 400, 401, 403, 404, 500, ...
 */
export async function loadSecureAsset(filepath: string, format: 'auto' | 'buffer' | 'blob' | 'json') {
  const response = await fetch(`/.netlify/functions/get-secure-asset?file=${filepath}`);

  // Handle Auth Errors
  if (response.status === 400) {
    throw new HttpError("Invalid filename requested", 400);
  }
  if (response.status === 401) {
    throw new HttpError("Unauthorized: No session found", 401);
  }
  if (response.status === 403) {
    throw new HttpError("Forbidden: Session expired or invalid", 403);
  }
  if (response.status === 404) {
    throw new HttpError("File not found", 404);
  }
  if (response.status === 500) {
    throw new HttpError("Internal server error", 500);
  }
  if (!response.ok) {
    let errorMessage = 'Unknown Err';

    try {
      // is response JSON?
      const contentType = response.headers.get("content-type");

      if (contentType && contentType.indexOf("application/json") !== -1) {
        const json = await response.json();
        errorMessage = json.message || json.error || JSON.stringify(json);
      } else {
        // Otherwise, get text, but limit the length in case it's a giant HTML page
        const text = await response.text();
        errorMessage = text.length > 100 ? text.substring(0, 100) + '...' : text;
      }
    } catch (e) {
      // Fallback if parsing fails 
      errorMessage = 'Could not read error body';
    }

    // Throw the error
    throw new HttpError(`Error: ${errorMessage}`, response.status);
  }

  // Return Requested Format
  if (format === 'buffer') {
    return await response.arrayBuffer();
  }

  if (format === 'json') {
    return await response.json();
  }

  // 'auto' mode (Default behavior)
  const contentType = response.headers.get('content-type');

  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  } else if (contentType && contentType.includes('application/pdf')) {
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  return await response.text();
}

/**
 * Sends a request to save a protocol through netlify function.
 * 
 * This triggers an email workflow via the Resend API to notify administrators and provide a confirmation receipt to the user.
 * 
 * @param payload - The protocol data and user metadata.
 * @returns A Promise that resolves to true if the request was successfully accepted.
 * @throws {HttpError} If the server returns a non-200 status or if the session is invalid.
 */
export async function requestSaveProtocol(payload: SaveRequestPayload): Promise<boolean> {
  const response = await fetch('/.netlify/functions/request-save-oit-protocol', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let msg = "Failed to send request";
    try {
      const data = await response.json();
      msg = data.message || msg;
    } catch (e) { }
    throw new HttpError(msg, response.status);
  }

  return true;
}
