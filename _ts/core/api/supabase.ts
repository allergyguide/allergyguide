import { createClient } from "@supabase/supabase-js";
import { AUTH_STORAGE_KEY } from "../constants";

declare const __SUPABASE_URL__: string;
declare const __SUPABASE_PUBLISHABLE_KEY__: string;

if (!__SUPABASE_URL__ || !__SUPABASE_PUBLISHABLE_KEY__) {
	console.error("Supabase URL / publishable key are missing.");
}

/**
 * Singleton Supabase Client imported by all UI components and core modules for unified auth state
 */
export const supabase = createClient(
	__SUPABASE_URL__,
	__SUPABASE_PUBLISHABLE_KEY__,
	{
		auth: {
			// Identity Session
			// This persists in localStorage
			persistSession: true,
			storageKey: AUTH_STORAGE_KEY, // cleaner than default keyname

			// Automatically refresh the token in the background before it expires
			autoRefreshToken: true,

			// tells client to actively look for `#access_token=...` hash in the URL for new user onboarding when the user clicks an invite link
			detectSessionInUrl: true,
		},
	},
);
