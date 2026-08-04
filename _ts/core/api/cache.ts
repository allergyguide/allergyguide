import { supabase } from "./supabase";

interface SWRCacheEntry<T> {
	userId: string;
	timestamp: number;
	data: T;
}

/**
 * A Stale-While-Revalidate cache wrapper for authenticated requests
 * Uses localStorage for persistence across sessions, scoped to the current user
 * Intended for data that is NOT sensitive
 *
 * NOTE: Background revalidation updates localStorage but does NOT notify the active application state
 * If new data is fetched during revalidation, the UI will not reflect those updates until the next page reload
 *
 * @param key The unique string key used to store the cache in localStorage
 * @param ttlMs The cache time-to-live in milliseconds
 * @param fetcher The function to call to fetch the live data
 * @returns The cached data if valid, otherwise the live fetched data
 */
export async function withSWRCache<T>(
	key: string,
	ttlMs: number,
	fetcher: () => Promise<T>,
): Promise<T> {
	const {
		data: { session },
	} = await supabase.auth.getSession();

	if (!session) {
		return await fetcher();
	}

	let cachedRaw: string | null = null;
	try {
		cachedRaw = localStorage.getItem(key);
	} catch (e) {
		console.warn("Failed to read from SWR cache:", e);
	}
	if (cachedRaw) {
		try {
			const cacheObj = JSON.parse(cachedRaw) as SWRCacheEntry<T>;
			const now = Date.now();
			if (
				cacheObj.userId === session.user.id &&
				now - cacheObj.timestamp < ttlMs &&
				cacheObj.data !== undefined
			) {
				// Fire background fetch to silently revalidate
				fetcher()
					.then(async (data) => {
						const {
							data: { session: currentSession },
						} = await supabase.auth.getSession();
						if (currentSession?.user.id !== session.user.id) return;
						try {
							localStorage.setItem(
								key,
								JSON.stringify({
									userId: session.user.id,
									timestamp: Date.now(),
									data: data,
								} as SWRCacheEntry<T>),
							);
						} catch (e) {
							console.warn("Failed to write to SWR cache:", e);
						}
					})
					.catch((e) =>
						console.error(`SWR background revalidate failed for ${key}:`, e),
					);
				return cacheObj.data;
			}
		} catch {
			// Malformed cache, fall through to live fetch
		}
	}

	const data = await fetcher();
	try {
		localStorage.setItem(
			key,
			JSON.stringify({
				userId: session.user.id,
				timestamp: Date.now(),
				data: data,
			} as SWRCacheEntry<T>),
		);
	} catch (e) {
		console.warn("Failed to write to SWR cache:", e);
	}

	return data;
}
