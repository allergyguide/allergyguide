import dotenv from "dotenv";

dotenv.config({ override: true });

// ==========================================
// CONFIGURATION & SETUP
// ==========================================

// VERIFY NETLIFY ENV VARS EXIST - CRASH IF NOT
const GITHUB_TOKEN = process.env.PRIVATE_TOKEN;
const REPO_NAME = process.env.GITHUB_REPO;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRY_HOURS = process.env.TOKEN_EXPIRY_HOURS;
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
const ADMIN_USERS = process.env.ADMIN_USERS;

if (!REPO_NAME || !GITHUB_OWNER || !GITHUB_TOKEN) {
	console.error("No GitHub repo or token found. Check netlify settings");
	process.exit(1);
}
const GITHUB_REPO = `${GITHUB_OWNER}/${REPO_NAME}`; // e.g., "username/repo-name"

if (
	!JWT_SECRET ||
	!TOKEN_EXPIRY_HOURS ||
	!TURNSTILE_SECRET ||
	!RESEND_API_KEY
) {
	console.error(
		"Check your .env and netlify env vars, missing at least one of jwt token stuff, turnstile secret, resend api key",
	);
	process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY || !SUPABASE_JWT_SECRET) {
	console.error("no supabase stuff please check");
	process.exit(1);
}

if (!ADMIN_USERS) {
	console.error("No admin users defined");
	process.exit(1);
}

export const ENV_VARS = {
	GITHUB_TOKEN,
	GITHUB_REPO,
	JWT_SECRET,
	TOKEN_EXPIRY_HOURS,
	TURNSTILE_SECRET,
	RESEND_API_KEY,
	SUPABASE_URL,
	SUPABASE_SECRET_KEY,
	SUPABASE_JWT_SECRET,
	ADMIN_USERS,
};
