import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { loadTypstBinary, compileTypst } from './build-typ.mjs'
import { buildTS } from './build-ts.mjs'
import { verifyUsersData, copyLegacyJS } from './build-utils.mjs';
import dotenv from "dotenv";

dotenv.config({ override: true });

// ==========================================
// CONFIGURATION & SETUP
// ==========================================

// VERIFY NETLIFY ENV VARS EXIST - CRASH IF NOT
const GITHUB_TOKEN = process.env.PRIVATE_TOKEN;
const GITHUB_REPO = `${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}`;   // e.g., "username/repo-name"
const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRY_HOURS = process.env.TOKEN_EXPIRY_HOURS;
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

if (!GITHUB_REPO || !GITHUB_TOKEN) {
  console.error("No GitHub repo or token found. Check netlify settings")
  process.exit(1);
}

if (!JWT_SECRET || !TOKEN_EXPIRY_HOURS || !TURNSTILE_SECRET || !RESEND_API_KEY) {
  console.error("Check your .env and netlify env vars, missing at least one of jwt token stuff, turnstile secret, resend api key")
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY || !SUPABASE_JWT_SECRET) {
  console.error("no supabase stuff please check")
  process.exit(1);
}

// GET GIT COMMIT HASH FOR VERSION STAMPING
let commit_hash: string;
try {
  commit_hash = execSync('git rev-parse --short HEAD').toString().trim();
} catch (error) {
  console.error("Failed to find commit_hash", error)
  process.exit(1);
}

// GET TOOLS VERSIONING
if (!existsSync('./tools_versioning.json')) {
  console.error("tools_versioning.json not found");
  process.exit(1);
}
const toolVersioning = JSON.parse(readFileSync('./tools_versioning.json', 'utf-8'));

// ==========================================
// BUILD PROCESS
// ==========================================

// VERIFY USER SECURITY CONFIGURATION
// By this time the secure_assets/ folder should already be built
console.log("-----VERIFY USER SECURITY CONFIGURATION-----");
await verifyUsersData();
console.log("---------------------------\n");

// TYPST
// Download binary if required, compile .typ to .pdf
console.log("-----TYPST LOAD AND COMPILE-----");
loadTypstBinary();
compileTypst(commit_hash);
console.log("---------------------------\n");

// MOVE LEGACY JS INTO static/js
console.log("-----COPY LEGACY JS INTO JS/-----");
copyLegacyJS(); // for the future, this MUST remain sync; don't want it to clear /js during TS compilation
console.log("---------------------------\n");

// TS COMPILE AND BUILD
console.log("-----TS COMPILE AND BUILD-----");
await buildTS(toolVersioning, commit_hash);
console.log("---------------------------\n");
