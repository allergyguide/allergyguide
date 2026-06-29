/// <reference types="@netlify/edge-functions" />
import { getStore } from "@netlify/blobs";

/**
 * Returns a Netlify Blobs store client for the allergyguide-secure-assets store
 *
 */
export function getBlobStore() {
	return getStore({
		name: "allergyguide-secure-assets",
	});
}
