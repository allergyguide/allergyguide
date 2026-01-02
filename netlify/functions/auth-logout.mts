import type { Handler } from '@netlify/functions';
import cookie from 'cookie';

/**
 * Netlify Function: Logout Handler
 * Invalidates the user session by overwriting the existing JWT cookie with an immediately expiring cookie
 * @returns JSON success message with a Set-Cookie header that clears the session
 */
export const handler: Handler = async () => {
  // Clear the cookie by setting maxAge to -1 (or 0)
  // CRITICAL: The path, secure, and httpOnly flags MUST match the login cookie
  const authCookie = cookie.serialize('nf_jwt', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: -1, // Expire immediately
  });

  return {
    statusCode: 200,
    headers: {
      'Set-Cookie': authCookie,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: "Logged out successfully" }),
  };
};
