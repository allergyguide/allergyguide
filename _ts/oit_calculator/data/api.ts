/**
 * @module
 * Handles network requests for secure assets and to request protocol saving (email to dev).
 */
import {
	HttpError,
	type OITBootstrapResponse,
	type SaveRequestPayload,
} from "../types";

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

/**
 * Fetches the user's provisioned foods, protocols, and config through bootstrap netlify endpoint
 *
 * @returns A promise resolving to the `OITBootstrapResponse` containing the user's provisioned data.
 * @throws {HttpError} If the network request fails, session is unauthorized, or the server returns non-JSON content.
 */
export async function fetchOITBootstrap(): Promise<OITBootstrapResponse> {
	const response = await fetch("/.netlify/functions/oit-bootstrap");
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
	const response = await fetch(
		`/.netlify/functions/get-secure-asset?file=${filepath}`,
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

/**
 * Sends a request to save a protocol through netlify function.
 *
 * This triggers an email workflow via the Resend API to notify administrators and provide a confirmation receipt to the user.
 *
 * @param payload - The protocol data and user metadata.
 * @returns A Promise that resolves to true if the request was successfully accepted.
 * @throws {HttpError} If the server returns a non-200 status or if the session is invalid.
 */
export async function requestSaveProtocol(
	payload: SaveRequestPayload,
): Promise<boolean> {
	const response = await fetch(
		"/.netlify/functions/oit-request-save-protocol",
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		},
	);

	await ensureResponseOk(response);
	return true;
}
