import { HttpError } from "../types";

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
