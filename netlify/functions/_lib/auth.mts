import cookie from 'cookie';
import jwt from 'jsonwebtoken';
import { HttpError } from './utils.mts';

/**
 * Interface representing the decoded JWT payload.
 */
export interface UserToken {
  username: string;
  permissions: string[];
  iat: number;
  exp: number;
}

export function authenticateUser(event): UserToken {
  const cookies = cookie.parse(event.headers.cookie || '');
  const token = cookies.nf_jwt;

  if (!token) {
    throw new HttpError("Unauthorized, no session found", 401)
  }
  if (!process.env.JWT_SECRET) {
    throw new HttpError("Internal Server Error: Missing JWT_SECRET", 500);
  }

  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as UserToken; // Returns UserToken
  } catch (err) {
    // have token, but ? expired or invalid
    throw new HttpError("Forbidden: Session expired or invalid", 403);
  }
}
