import type { Handler, HandlerResponse } from '@netlify/functions';
import jwt from 'jsonwebtoken';
import querystring from 'querystring';
import cookie from 'cookie';
import bcrypt from 'bcryptjs';

/**
 * Verifies a user's hCaptcha response token against the hCaptcha API.
 *
 * This function sends a POST request to `https://hcaptcha.com/siteverify` with the provided secret and token. It internally handles network errors by logging them and returning `false`.
 *
 * @param hcaptcha_secret - from .env
 * @param captchaTokenResponse - solution token returned from the frontend hCaptcha widget (e.g., `h-captcha-response`).
 * 
 * @returns A `Promise` that resolves to:
 * - `true` if the captcha was successfully verified.
 * - `false` if the verification failed, the token was invalid, or the API request encountered an error.
 */
export async function verifyCaptcha(hcaptcha_secret: string, captchaTokenResponse: string): Promise<boolean> {
	const verifyParams = querystring.stringify({
		secret: hcaptcha_secret,
		response: captchaTokenResponse,
		sitekey: "eb228250-c24c-4114-bc68-7430c89ae0b0"
	});

	let captchaVerify: Response;
	try {
		captchaVerify = await fetch('https://hcaptcha.com/siteverify', {
			method: 'POST', // MUST be POST
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: verifyParams
		});
	}
	catch (err) {
		console.error("Not able to reach hcaptcha.com to verify captcha", err)
		return false;
	}

	const captchaData = await captchaVerify.json();

	if (!captchaData.success) {
		return false
	} else {
		return true
	}
}


/**
 * Netlify Function: Login Handler
 * Authenticates a user against credentials stored in secret Netlify environment variables
 * On success, issues a signed JWT inside an HttpOnly, Secure cookie
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
		const { username, password, captchaToken } = body;

		// VERIFY CAPTCHA FIRST
		// We do this before checking passwords to prevent brute force timing attacks
		if (!process.env.HCAPTCHA_SECRET) throw new Error("No HCAPTCHA_SECRET set in environment variables")
		if (!captchaToken) {
			return {
				statusCode: 400,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message: "Captcha missing" })
			};
		}
		const captchaVerified = await verifyCaptcha(process.env.HCAPTCHA_SECRET, captchaToken)
		if (!captchaVerified) {
			return {
				statusCode: 400,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message: "Invalid Captcha" })
			};
		}

		// LOAD + PARSE USERS
		// AUTH_USERS={"test":"$2a$10$..."}
		const validUsers = JSON.parse(process.env.AUTH_USERS || '{}');
		const storedHash = validUsers[username];

		// VERIFY CREDENTIALS
		// bcrypt.compare returns a promise
		if (!storedHash || !(await bcrypt.compare(password, storedHash))) {
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
		return {
			statusCode: 500,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ message: "Internal Server Error" })
		};
	}
};
