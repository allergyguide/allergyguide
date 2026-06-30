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

	const cachedRaw = localStorage.getItem(key);
	if (cachedRaw) {
		try {
			const cacheObj = JSON.parse(cachedRaw) as SWRCacheEntry<T>;
			const now = Date.now();
			if (
				cacheObj.userId === session.user.id &&
				now - cacheObj.timestamp < ttlMs &&
				cacheObj.data
			) {
				// Fire background fetch to silently revalidate
				fetcher()
					.then((data) => {
						localStorage.setItem(
							key,
							JSON.stringify({
								userId: session.user.id,
								timestamp: Date.now(),
								data: data,
							} as SWRCacheEntry<T>),
						);
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
	localStorage.setItem(
		key,
		JSON.stringify({
			userId: session.user.id,
			timestamp: Date.now(),
			data: data,
		} as SWRCacheEntry<T>),
	);

	return data;
}
