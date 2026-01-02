import type { Handler, HandlerResponse } from '@netlify/functions';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';

/**
 * Netlify Function: Login Handler
 * Authenticates a user against credentials stored in secret Netlify environment variables
 * On success, issues a signed JWT inside an HttpOnly, Secure cookie
 * @param event - The Netlify event object containing the POST body
 * @returns JSON success message with Set-Cookie header or error status
 */
export const handler: Handler = async (event) => {
	if (event.httpMethod !== 'POST') {
		return { statusCode: 405, body: 'Method Not Allowed' };
	}

	try {
		const body = event.body ? JSON.parse(event.body) : {};
		const { username, password } = body;

		// LOAD + PARSE USERS
		// AUTH_USERS={"test":"testpassword","test1":"testpassword1"}
		const validUsers = JSON.parse(process.env.AUTH_USERS || '{}');

		// VERIFY CREDENTIALS
		if (!validUsers[username] || validUsers[username] !== password) {
			return {
				statusCode: 401,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message: "Invalid credentials" }),
			} as HandlerResponse;
		}

		// GENERATE JWT
		const secret = process.env.JWT_SECRET;
		if (!secret) {
			console.error("JWT_SECRET MISSING, please check Netlify vars")
			throw new Error("JWT_SECRET is missing");
		}

		if (!process.env.TOKEN_EXPIRY_HOURS) {
			console.error("No TOKEN_EXPIRY_HOURS set in Netlify env vars. Defaults to 24h in this case.")
		}

		const expiryHours = parseInt(process.env.TOKEN_EXPIRY_HOURS || '24', 10);
		const token = jwt.sign({ user: username }, secret, {
			expiresIn: expiryHours * 3600 // expiresIn is in seconds so need to convert
		});

		// SERIALIZE COOKIE
		const authCookie = cookie.serialize('nf_jwt', token, {
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
			body: JSON.stringify({ success: true, user: username }),
		};

	} catch (error) {
		console.error("Login error:", error);
		return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: "Internal Server Error" };
	}
};
