/**
 * Direct API calls to netlify serverless functions
 */
import { HttpError, type OfcBootstrapResponse } from "../types";

/**
 * Fetches the consolidated bootstrap data from the serverless function
 * This endpoint provides provisioned food lists and authentication confirmation
 *
 * @returns {Promise<OfcBootstrapResponse | null>} The bootstrap data if authenticated, or null if the session is unauthorized
 * @throws {HttpError} If the server returns a non-OK status other than 401/403
 */
export async function fetchOFCBootstrap(): Promise<OfcBootstrapResponse | null> {
	const response = await fetch("/.netlify/functions/ofc-bootstrap");

	if (response.status === 401 || response.status === 403) {
		return null;
	}

	if (!response.ok) {
		throw new HttpError(
			`Failed to fetch OFC index bootstrap: ${response.statusText}`,
			response.status,
		);
	}

	return await response.json();
}
