import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { buildGenetics } from "./build-genetics.mts";
import { buildTS } from "./build-ts.mjs";
import { compileTypst, loadTypstBinary } from "./build-typ.mjs";
import { copyLegacyJS, verifyUsersData } from "./build-utils.mjs";

// ==========================================
// CONFIGURATION & SETUP
// ==========================================

// GET GIT COMMIT HASH FOR VERSION STAMPING
let commit_hash: string;
try {
	commit_hash = execSync("git rev-parse --short HEAD").toString().trim();
} catch (error) {
	console.error("Failed to find commit_hash", error);
	process.exit(1);
}

// GET TOOLS VERSIONING
if (!existsSync("./tools_versioning.json")) {
	console.error("tools_versioning.json not found");
	process.exit(1);
}
const toolVersioning = JSON.parse(
	readFileSync("./tools_versioning.json", "utf-8"),
);

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

// FETCH GENETICS PANEL DATA
console.log("-----FETCHING UP TO DATE GENETICS PANEL DATA-----");
await buildGenetics();
console.log("---------------------------\n");

// MOVE LEGACY JS INTO static/js
console.log("-----COPY LEGACY JS INTO JS/-----");
copyLegacyJS(); // for the future, this MUST remain sync; don't want it to clear /js during TS compilation
console.log("---------------------------\n");

// TS COMPILE AND BUILD
console.log("-----TS COMPILE AND BUILD-----");
await buildTS(toolVersioning, commit_hash);
console.log("---------------------------\n");
