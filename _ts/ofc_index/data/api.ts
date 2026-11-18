import { withSWRCache } from "../../core/api/cache";
import { supabase } from "../../core/api/supabase";
import { CACHE_TTL_MS, SWR_CACHE_PREFIX } from "../../core/constants";
import { HttpError, type OfcBootstrapResponse } from "../types";

const CACHE_KEY = `${SWR_CACHE_PREFIX}OFC_BOOTSTRAP`;

/**
 * Fetches consolidated bootstrap data from the edge function
 * Provides provisioned food lists and authentication confirmation
 * Uses a Stale-While-Revalidate (SWR) caching strategy via localStorage for instant loads.
 *
 * @returns {Promise<OfcBootstrapResponse | null>} Bootstrap data, or null if there is no Supabase session
 * @throws {HttpError} If the server returns a non-OK status (401/403 included)
 */
export async function fetchOFCBootstrap(): Promise<OfcBootstrapResponse | null> {
	return withSWRCache(CACHE_KEY, CACHE_TTL_MS, fetchOFCBootstrapLive);
}

async function fetchOFCBootstrapLive(): Promise<OfcBootstrapResponse | null> {
	const {
		data: { session },
	} = await supabase.auth.getSession();

	if (!session) {
		return null;
	}

	const response = await fetch("/.netlify/functions/ofc-bootstrap");

	if (!response.ok) {
		if (response.status === 401 || response.status === 403) {
			// Drop any cached copy so revoked access stops working on the next load
			try {
				localStorage.removeItem(CACHE_KEY);
			} catch {}
		}
		throw new HttpError(
			`Failed to fetch OFC index bootstrap: ${response.statusText}`,
			response.status,
		);
	}

	return await response.json();
}
