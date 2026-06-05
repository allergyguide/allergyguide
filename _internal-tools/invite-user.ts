// test_admin_invite.ts
// `npx tsx _internal-tools/invite-user.ts dr.smith@example.com`

import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { ENV_VARS } from "../scripts/build-config.mjs";

const SUPABASE_URL = ENV_VARS.SUPABASE_URL;
const SUPABASE_SECRET_KEY = ENV_VARS.SUPABASE_SECRET_KEY;

/**
 * URL the signup invitation link should direct to
 * On prod this should be "http://allergyguide.ca/signup"
 */
export const REDIRECT_URL = "http://localhost:8888/signup";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
	},
});

const PRIVATE_REPO_PATH = resolve(
	__dirname,
	`../../allergyguide-private/private-tools/user_configs`,
);

async function inviteAndProvision(email: string) {
	console.log(`Starting provisioning for ${email}...`);

	// FAIL FAST: Check if the directory actually exists
	if (!existsSync(PRIVATE_REPO_PATH)) {
		console.error(`ERROR: The configuration directory does not exist.`);
		console.error(`Attempted Path: ${PRIVATE_REPO_PATH}`);
		console.error(`Aborting process. No user was invited in Supabase.`);
		return;
	}

	console.log(`Sending invite via Resend to: ${email}`);
	console.log(`   (User will be redirected to: ${REDIRECT_URL})`);

	// Invite via Supabase
	const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
		email,
		{
			redirectTo: REDIRECT_URL, // Update for production
		},
	);

	if (error || !data.user) {
		console.error("❌ Supabase Invite Failed:", error?.message);
		return;
	}

	const uuid = data.user.id;
	console.log(`✅ Supabase Identity created. UUID: ${uuid}`);

	// Generate the default JSON config
	const defaultConfig = {
		name: email.split("@")[0],
		uuid: uuid,
		tools: {
			oit_calculator: {
				provisioned_foods: ["shared-tool-assets/brand_foods.json"],
				provisioned_protocols: [],
				handouts: [
					"protocol",
					"oit_calculator/_master_oit_patient_resource.pdf",
				],
			},
			ofc_index: {
				provisioned_foods: ["shared-tool-assets/brand_foods.json"],
			},
		},
	};

	const filePath = resolve(PRIVATE_REPO_PATH, `${uuid}_config.json`);

	// Write to the local file system
	try {
		writeFileSync(filePath, JSON.stringify(defaultConfig, null, 2));
		console.log(`✅ Config file created at ${filePath}`);
	} catch (fsErr) {
		console.error("❌ Failed to write config file:", fsErr);
		return;
	}

	// Commit
	try {
		console.log("Committing to GitHub...");
		// Executes git commands in the directory of your private repo
		const fileName = `${uuid}_config.json`;
		execFileSync("git", ["add", fileName], { cwd: PRIVATE_REPO_PATH });
		execFileSync(
			"git",
			["commit", "-m", `Provision config for ${email}`, "--only", fileName],
			{ cwd: PRIVATE_REPO_PATH },
		);
		console.log("✅ Successfully committed locally");
	} catch (gitErr) {
		console.error(
			"❌ Adding config failed. You may need to do this manually.",
			gitErr,
		);
	}

	console.log("User provisioned");
}

function isValidEmail(email: string): boolean {
	// Basic null/type check
	if (!email || typeof email !== "string") return false;

	// Length check (RFC 5321: max 254 characters total)
	if (email.length > 254) return false;

	// Extract the local part to check the 64-character limit
	const parts = email.split("@");
	if (parts.length !== 2 || parts[0].length > 64) return false;

	// regex for structure and characters
	const emailRegex =
		/^(?!\.)(?!.*\.\.)[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

	return emailRegex.test(email);
}

// Grab email from command line args: `npx tsx invite-user.ts dr.smith@example.com`
const targetEmail = process.argv[2];
if (targetEmail && isValidEmail(targetEmail)) {
	inviteAndProvision(targetEmail);
} else {
	console.error("provide a valid email address.");
}
