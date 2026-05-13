import cookie from "cookie";
import jwt from "jsonwebtoken";
import { HttpError } from "./utils.mts";

/**
 * Interface representing the decoded JWT payload.
 */
export interface UserToken {
	username: string;
	permissions: string[];
	iat: number;
	exp: number;
}

/**
 * Authenticates a user by extracting and verifying their JWT from the request cookies.
 *
 * Parses the `nf_jwt` cookie from the incoming event headers and verifies it against the server's `JWT_SECRET`. If successful, it returns the decoded user payload.
 *
 * @param event - The serverless event object containing the request headers.
 * @returns {UserToken} The decoded user token payload containing username, permissions, and expiry.
 *
 * @throws {HttpError} 401 - If the `nf_jwt` cookie is missing (no active session).
 * @throws {HttpError} 403 - If the provided token is expired, tampered with, or otherwise invalid.
 * @throws {HttpError} 500 - If the `JWT_SECRET` environment variable is missing from the server configuration.
 */
export function authenticateUser(event): UserToken {
	const cookies = cookie.parse(event.headers.cookie || "");
	const token = cookies.nf_jwt;

	if (!token) {
		throw new HttpError("Unauthorized, no session found", 401);
	}
	if (!process.env.JWT_SECRET) {
		throw new HttpError("Internal Server Error: Missing JWT_SECRET", 500);
	}

	try {
		return jwt.verify(token, process.env.JWT_SECRET) as UserToken; // Returns UserToken
	} catch {
		// have token, but ? expired or invalid
		throw new HttpError("Forbidden: Session expired or invalid", 403);
	}
}
