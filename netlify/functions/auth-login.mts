/**
 * @module
 * Serverless function to authenticate users and issue JWT cookies.
 */
import type { Handler, HandlerResponse } from '@netlify/functions';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import bcrypt from 'bcryptjs';
import { resolve } from 'path';
import { promises as fs } from 'fs';
import { getAllFilePaths } from './utils.mts';
import { createClient } from '@supabase/supabase-js';

// INITIALIZE SUPABASE ADMIN
const supabaseAdmin = createClient(
	process.env.SUPABASE_URL!,
	process.env.SUPABASE_SECRET_KEY!
);


/**
 * Verifies a user's turnstile response token against the cloudflare API.
 *
 * This function sends a POST request to `https://challenges.cloudflare.com/turnstile/v0/siteverify` with the provided secret and token. It internally handles network errors by logging them and returning `false`.
 *
 * @param turnstile_secret - from .env
 * @param turnstileTokenResponse - solution token returned from the frontend turnstile widget
 * 
 * @returns A `Promise` that resolves to:
 * - `true` if the turnstile was successfully verified.
 * - `false` if the verification failed, the token was invalid, or the API request encountered an error.
 */
export async function verifyTurnstile(turnstile_secret: string, turnstileTokenResponse: string): Promise<boolean> {
	const body = new URLSearchParams();
	body.append('secret', turnstile_secret);
	body.append('response', turnstileTokenResponse);

	try {
		const turnstileVerify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
			method: 'POST',
			body: body
		});

		const turnstileData = await turnstileVerify.json();
		return turnstileData.success === true;
	}
	catch (err) {
		console.error('Turnstile validation error:', err);
		return false;
	}
}


/**
 * Netlify Function: Login Handler
 * Authenticates a user against credentials in database.
 * On success:
 * 1. Issues a signed Netlify-compatible JWT inside an HttpOnly, Secure cookie.
 * 2. Returns a signed Supabase-compatible JWT in the JSON body for client-side RLS access.
 * 
 * @param event - The Netlify event object containing the POST body
 * @returns JSON success message with Set-Cookie header or error status
 */
export const handler: Handler = async (event) => {
	// WARM UP HANDLER if the frontend sends an OPTIONS request (or a specific ping)
	if (event.httpMethod === 'OPTIONS' || event.headers['x-warmup'] === 'true') {
		return {
			statusCode: 200,
			body: 'Warmed up'
		};
	}

	if (event.httpMethod !== 'POST') {
		return {
			statusCode: 405,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ message: "Method Not Allowed" })
		};
	}

	try {
		const body = event.body ? JSON.parse(event.body) : {};
		const { username, password, turnstileToken } = body;

		// VERIFY TURNSTILE FIRST
		// We do this before checking passwords to prevent brute force timing attacks
		if (!process.env.TURNSTILE_SECRET) throw new Error("No TURNSTILE_SECRET set in environment variables")
		if (!turnstileToken) {
			return {
				statusCode: 400,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message: "Turnstile missing" })
			};
		}

		// For debugging and use in private deploys, use dummy secret
		// see https://developers.cloudflare.com/turnstile/troubleshooting/testing/
		const CLOUDFLARE_TEST_SECRET = "1x0000000000000000000000000000000AA";
		let turnstile_secret = process.env.TURNSTILE_SECRET;

		// If we are on a netlify.app URL (deploy preview) 
		const host = event.headers['host'] || "";
		if (host.includes("netlify.app")) {
			turnstile_secret = CLOUDFLARE_TEST_SECRET;
		}

		const turnstileVerified = await verifyTurnstile(turnstile_secret, turnstileToken)
		if (!turnstileVerified) {
			return {
				statusCode: 400,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message: "Invalid Turnstile" })
			};
		}

		// lookup user in database
		const { data: userRecord, error } = await supabaseAdmin
			.from('authorized_users')
			.select('auth_hash') // the bcrypt hash
			.eq('username', username)
			.eq('is_active', true)
			.single();

		if (error || !userRecord) {
			// return generic err message
			return {
				statusCode: 401,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message: "Invalid credentials" }),
			} as HandlerResponse;
		}

		// Verify Password 
		const match = await bcrypt.compare(password, userRecord.auth_hash);
		if (!match) {
			return {
				statusCode: 401,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message: "Invalid credentials" }),
			} as HandlerResponse;
		}

		// -------
		// AUTH WAS SUCCESSFUL
		// -------

		// READ USER CONFIG & EXTRACT PERMISSIONS
		let permissions: string[] = [];
		try {
			const configPath = resolve(`./secure_assets/user_configs/${username}_config.json`);
			const configRaw = await fs.readFile(configPath, 'utf-8');
			const userConfig = JSON.parse(configRaw);

			// Flatten config to just a list of allowed paths
			permissions = Array.from(getAllFilePaths(userConfig));
		} catch (e) {
			console.error(`Could not load config for ${username} during login:`, e);
			return {
				statusCode: 403,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message: `Could not load config for ${username} during login.` }),
			} as HandlerResponse;
		}

		// GENERATE TOKENS A) FOR NETLIFY AND B) FOR SUPABASE
		const nfSecret = process.env.JWT_SECRET;
		const supabaseSecret = process.env.SUPABASE_JWT_SECRET;
		if (!nfSecret || !supabaseSecret) {
			console.error("Either NF or SB jwt secret vars are missing")
			throw new Error("A JWT_SECRET is missing");
		}

		if (!process.env.TOKEN_EXPIRY_HOURS) {
			console.error("No TOKEN_EXPIRY_HOURS set in Netlify env vars. Defaults to 24h in this case.")
		}

		const expiryHours = parseInt(process.env.TOKEN_EXPIRY_HOURS || '24', 10);

		// Sign with 'permissions' array instead of full 'config' object
		const nfToken = jwt.sign({
			username: username,
			permissions: permissions
		},
			nfSecret,
			{
				expiresIn: expiryHours * 3600 // expiresIn is in seconds so need to convert
			});

		const dbToken = jwt.sign({
			role: 'authenticated',
			sub: username, // Important: must match auth.uid() in RLS
		}, process.env.SUPABASE_JWT_SECRET!,
			{
				expiresIn: expiryHours * 3600
			});

		// SERIALIZE COOKIE
		const authCookie = cookie.serialize('nf_jwt', nfToken, {
			httpOnly: true,
			secure: true, // Requires HTTPS (Netlify provides this automatically)
			sameSite: 'strict',
			path: '/',
			maxAge: expiryHours * 3600,
		});

		return {
			statusCode: 200,
			headers: {
				'Set-Cookie': authCookie,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				success: true,
				username: username,
				dbToken: dbToken,
				expiryHours: expiryHours
			}),
		};

	} catch (error) {
		console.error("Login error:", error);
		return {
			statusCode: 500,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ message: "Internal Server Error" })
		};
	}
};
