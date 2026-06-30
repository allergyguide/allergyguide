// _ts/core/constants.ts

/**
 * Number of iterations for PBKDF2-HMAC-SHA256 key derivation
 *
 * Used for deriving the KEK and auth hash
 * Changing this value is a breaking change requiring credential rotation and DEK re-wrapping
 */
export const PBKDF2_ITERATIONS = 150000;

/**
 * Key used to store the encrypted DEK in sessionStorage
 */
export const DEK_STORAGE_KEY = "active_dek";

/**
 * Name of the BroadcastChannel for secure tab-to-tab communication
 */
export const VAULT_SYNC_CHANNEL = "vault_sync";

/**
 * Key used by Supabase client to persist the authentication session
 */
export const AUTH_STORAGE_KEY = "allergyguide_auth_token";

/**
 * Default Time-To-Live (TTL) for cached assets via localStorage (24 hours in milliseconds)
 */
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Prefix for all SWR cache keys in localStorage. Used to easily clear them on logout.
 */
export const SWR_CACHE_PREFIX = "AG_SWR_CACHE_";
