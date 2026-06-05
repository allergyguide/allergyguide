/**
 * @module
 * Handles network requests for secure assets and to request protocol saving (email to dev).
 */
import { supabase } from "../../core/api/supabase";
import { HttpError, type OITBootstrapResponse } from "../types";

/**
 * Attempts to safely extract a human-readable error message from a non successful HTTP response.
 *
 * Accounts for both JSON payloads and plain text/HTML responses. Noticed giant HTML error pages being returned before, so text responses are safely truncated to 100 characters.
 *
 * @param response - The failed fetch `Response` object to parse.
 * @returns A promise resolving to the extracted error string, or `null` if the body cannot be read.
 */
async function getErrorMessage(response: Response): Promise<string | null> {
	try {
		// is response JSON?
		const text = await response.text(); // Stream consumed safely as text
		const contentType = response.headers.get("content-type");

		if (contentType?.includes("application/json") && text) {
			const json = JSON.parse(text);
			return json.message || json.error || JSON.stringify(json);
		}
		// Otherwise, return text but limit the length in case it's a giant HTML page
		return text.length > 100 ? `${text.substring(0, 100)}...` : text;
	} catch (e) {
		// Fallback if parsing fails
		console.error(`Could not read error body: `, e);
		return null;
	}
}

/**
 * Validates a fetch `Response`, throwing a standardized `HttpError` if the network request failed.
 *
 * If the response is not `ok`, it attempts to parse the server's specific error payload, and if not possible provides generic fallback err messages.
 *
 * @param response - The fetch `Response` object to validate.
 * @throws {HttpError} Throws an error containing the server message (or fallback) and the HTTP status code.
 */
export async function ensureResponseOk(response: Response) {
	if (response.ok) return;

	// There's been an error of some sort: try to extract message
	const serverMessage = await getErrorMessage(response);
	if (serverMessage) {
		// basically propagate err from endpoint
		throw new HttpError(serverMessage, response.status);
	}

	// in case message from endpoint err response is malformed or strange
	const fallbacks: Record<number, string> = {
		400: "Bad request",
		401: "Unauthorized: No session found",
		403: "Forbidden: Session expired or invalid",
		404: "File not found",
		500: "Internal server error",
	};

	throw new HttpError(
		fallbacks[response.status] || "An unexpected error occurred",
		response.status,
	);
}

/** Helper to grab the active token */
async function getAuthHeaders(): Promise<Record<string, string>> {
	const {
		data: { session },
		error,
	} = await supabase.auth.getSession();
	if (error || !session) {
		throw new HttpError("Unauthorized: No active session", 401);
	}
	return {
		"Content-Type": "application/json",
		Authorization: `Bearer ${session.access_token}`,
	};
}

/**
 * Fetches the user's provisioned foods, protocols, and config through bootstrap netlify endpoint
 *
 * @returns A promise resolving to the `OITBootstrapResponse` containing the user's provisioned data.
 * @throws {HttpError} If the network request fails, session is unauthorized, or the server returns non-JSON content.
 */
export async function fetchOITBootstrap(): Promise<OITBootstrapResponse> {
	const headers = await getAuthHeaders();
	const response = await fetch("/.netlify/functions/oit-bootstrap", {
		headers,
	});
	await ensureResponseOk(response);

	const contentType = response.headers.get("content-type");
	if (contentType?.includes("application/json")) {
		return (await response.json()) as OITBootstrapResponse;
	}
	throw new HttpError(
		"Server returned success but response was not JSON",
		response.status,
	);
}

/**
 * Fetcher for secure assets
 * Handles the URL construction and basic HTTP error throwing
 * Calls netlify function
 * @param filepath - from within secure_assets
 * @param format - how you want the data returned
 * @throws various auth errors 400, 401, 403, 404, 500, ...
 */
export async function loadSecureAsset(
	filepath: string,
	format: "auto" | "buffer" | "blob" | "json",
) {
	const headers = await getAuthHeaders();
	const response = await fetch(
		`/.netlify/functions/get-secure-asset?file=${filepath}`,
		{
			headers: { Authorization: headers.Authorization },
		},
	);

	await ensureResponseOk(response);

	// Return Requested Format
	if (format === "buffer") {
		return await response.arrayBuffer();
	}

	if (format === "json") {
		return await response.json();
	}

	// 'auto' mode (Default behavior)
	const contentType = response.headers.get("content-type");

	if (contentType?.includes("application/json")) {
		return await response.json();
	} else if (contentType?.includes("application/pdf")) {
		const blob = await response.blob();
		return URL.createObjectURL(blob);
	}

	return await response.text();
}
