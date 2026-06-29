/// <reference types="@netlify/edge-functions" />
import { getStore } from "@netlify/blobs";

/**
 * Returns a Netlify Blobs store client for the allergyguide-secure-assets store
 *
 */
export function getBlobStore() {
	return getStore({
		name: "allergyguide-secure-assets",
		siteID: Netlify.env.get("NETLIFY_SITE_ID") || "",
		token:
			Netlify.env.get("NETLIFY_AUTH_TOKEN") ||
			Netlify.env.get("NETLIFY_API_TOKEN") ||
			"",
	});
}
