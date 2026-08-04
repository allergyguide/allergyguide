/// <reference types="@netlify/edge-functions" />
import { getStore } from "@netlify/blobs";

/**
 * Returns a Netlify Blobs store client for the allergyguide-secure-assets store
 *
 * During local development (netlify dev), it explicitly passes credentials to read from the remote production blob store rather than the empty local emulator
 */
export function getBlobStore() {
	const isLocal = Netlify.env.get("NETLIFY_DEV") === "true";

	return getStore({
		name: "allergyguide-secure-assets",
		siteID: isLocal ? Netlify.env.get("NETLIFY_SITE_ID") : undefined,
		token: isLocal ? Netlify.env.get("NETLIFY_AUTH_TOKEN") : undefined,
	});
}
