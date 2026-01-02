import { HttpError } from "../types";

/**
 * Fetcher for secure assets
 * Handles the URL construction and basic HTTP error throwing
 * Calls netlify function
 * @param filepath - from within secure_assets
 * @param format - how you want the data returned
 * throws errors dep on error code https
 */
export async function loadSecureAsset(filepath: string, format: 'auto' | 'buffer' | 'blob' | 'json') {
  const response = await fetch(`/.netlify/functions/get-secure-asset?file=${filepath}`);

  // Handle Auth Errors
  if (response.status === 401) {
    return new HttpError("Unauthorized: No session found", 401);
  }
  if (response.status === 403) {
    return new HttpError("Forbidden: Session expired or invalid", 403);
  }
  if (!response.ok) {
    return new HttpError("Unknown Err", 404);
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
