import { withSWRCache } from "../../core/api/cache";
import { supabase } from "../../core/api/supabase";
import { CACHE_TTL_MS, SWR_CACHE_PREFIX } from "../../core/constants";
import { HttpError, type OfcBootstrapResponse } from "../types";

/**
 * Fetches consolidated bootstrap data from the edge function
 * Provides provisioned food lists and authentication confirmation
 * Uses a Stale-While-Revalidate (SWR) caching strategy via localStorage for instant loads.
 *
 * @returns {Promise<OfcBootstrapResponse | null>} Bootstrap data if authenticated, or null if unauthorized
 * @throws {HttpError} If server returns a non-OK status other than 401/403
 */
export async function fetchOFCBootstrap(): Promise<OfcBootstrapResponse | null> {
	return withSWRCache(
		`${SWR_CACHE_PREFIX}OFC_BOOTSTRAP`,
		CACHE_TTL_MS,
		fetchOFCBootstrapLive,
	);
}

async function fetchOFCBootstrapLive(): Promise<OfcBootstrapResponse | null> {
	const {
		data: { session },
	} = await supabase.auth.getSession();

	if (!session) {
		return null;
	}

	const response = await fetch("/.netlify/functions/ofc-bootstrap", {
		headers: {
			Authorization: `Bearer ${session.access_token}`,
		},
	});

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
