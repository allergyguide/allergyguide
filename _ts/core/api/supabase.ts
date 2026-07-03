import { createBrowserClient } from "@supabase/ssr";
import { AUTH_STORAGE_KEY, SUPABASE_COOKIE_EXPIRY } from "../constants";

declare const __SUPABASE_URL__: string;
declare const __SUPABASE_PUBLISHABLE_KEY__: string;

if (!__SUPABASE_URL__ || !__SUPABASE_PUBLISHABLE_KEY__) {
	console.error("Supabase URL / publishable key are missing.");
}

/**
 * Singleton Supabase Client imported by all UI components and core modules for unified auth state
 */
export const supabase = createBrowserClient(
	__SUPABASE_URL__,
	__SUPABASE_PUBLISHABLE_KEY__,
	{
		auth: {
			autoRefreshToken: true,
			detectSessionInUrl: true,
		},
		cookieOptions: {
			name: AUTH_STORAGE_KEY,
			sameSite: "lax",
			secure: true,
			maxAge: SUPABASE_COOKIE_EXPIRY,
		},
	},
);
