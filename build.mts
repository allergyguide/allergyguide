import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { loadTypstBinary, compileTypst } from './build-typ.mjs'
import { buildTS } from './build-ts.mjs'
import { verifyUsersData } from './build-utils.mjs';
import dotenv from "dotenv";

dotenv.config({ override: true });

// ==========================================
// CONFIGURATION & SETUP
// ==========================================

// VERIFY NETLIFY ENV VARS EXIST - CRASH IF NOT
const GITHUB_TOKEN = process.env.PRIVATE_TOKEN;
const GITHUB_REPO = `${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}`;   // e.g., "username/repo-name"
const AUTH_USERS = process.env.AUTH_USERS;
const USER_PERMISSIONS = process.env.USER_PERMISSIONS;
const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRY_HOURS = process.env.TOKEN_EXPIRY_HOURS;

if (!GITHUB_REPO || !GITHUB_TOKEN) {
  console.error("No GitHub repo or token found. Check netlify settings")
  process.exit(1);
}

if (!AUTH_USERS || !USER_PERMISSIONS || !JWT_SECRET || !TOKEN_EXPIRY_HOURS) {
  console.error("Check your .env and netlify env vars, missing at least one of auth users, user permissions, jwt token stuff")
  process.exit(1);

}

// VERIFY USER SECURITY CONFIGURATION
console.log("---------------------------");
verifyUsersData();
console.log("---------------------------\n");

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

// TYPST
// Download binary if required, compile .typ to .pdf
console.log("---------------------------");
loadTypstBinary();
compileTypst(commit_hash);
console.log("---------------------------\n");

// TS COMPILE AND BUILD
console.log("---------------------------");
await buildTS(toolVersioning, commit_hash);
console.log("---------------------------\n");
