import type { Handler } from '@netlify/functions';
import { resolve } from 'path';
import { promises as fs } from 'fs';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';

/**
 * Interface representing the decoded JWT payload.
 */
interface UserToken {
  user: string;
  iat: number;
  exp: number;
}

/**
 * Netlify Function: Secure Asset Handler
 * Serves private assets (e.g. .jsons, .pdfs) from within a protected directory secure_assets/ which is built during run-time
 * NOTE: ONLY WORKS FOR JSONS AND PDFS AT THIS TIME
 *
 * It authenticates the user via a JWT cookie and checks specific file permissions before serving the content
 * @param event - The Netlify event object containing headers and query parameters
 * @returns A response containing the base64 encoded file or an error status
 */
export const handler: Handler = async (event) => {
  // EXTRACT COOKIE
  const cookies = cookie.parse(event.headers.cookie || '');
  const token = cookies.nf_jwt;

  if (!token) {
    return { statusCode: 401, body: "Unauthorized: No session found" };
  }

  let user = '';

  // VERIFY JWT & GET USER
  try {
    if (!process.env.JWT_SECRET) throw new Error("Missing JWT_SECRET");

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as UserToken;
    user = decoded.user;
  } catch (err) {
    return { statusCode: 403, body: "Forbidden: Session expired or invalid" };
  }

  // PARSE FILENAME
  let filename = event.queryStringParameters?.file;

  if (!filename || filename.includes('..') || filename.includes('\\')) {
    return { statusCode: 400, body: "Invalid filename" };
  }

  // CHANGE FILENAME IF GENERIC `me.json` REQUESTED TO GRAB USER CONFIG
  if (filename === 'me.json') {
    filename = `user_configs/${user}_config.json`;
  }

  // Authorization, check against permissions for user
  // Format: { "username": ["file1.json", "file2.pdf"] } or { "admin": ["*"] }
  const allPermissions = JSON.parse(process.env.USER_PERMISSIONS || '{}');
  const userFiles = allPermissions[user] || [];

  // Check if user has wildcard "*" OR explicit file access
  const hasAccess = userFiles.includes('*') || userFiles.includes(filename);

  if (!hasAccess) {
    console.log(`User ${user} tried to access ${filename} but was denied.`);
    return { statusCode: 403, body: "Forbidden: You do not have access to this resource." };
  }
  // ============================================================

  // RESOLVE FILE PATH
  try {
    const secureRoot = resolve('./secure_assets');
    // Resolve the full path of the requested file
    const filePath = resolve(secureRoot, filename);

    // security check
    if (!filePath.startsWith(secureRoot)) {
      console.error(`Path traversal attempt by ${user}: ${filename}`);
      return { statusCode: 403, body: "Forbidden" };
    }

    // Check existence asynchronously
    try {
      await fs.access(filePath);
    } catch {
      return { statusCode: 404, body: "File not found" };
    }

    // file exists, so serve file as b64
    const ext = filename.split('.').pop()?.toLowerCase();
    const contentType = ext === 'pdf' ? 'application/pdf' : 'application/json';

    // read and return
    const fileBuffer = await fs.readFile(filePath);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
      body: fileBuffer.toString('base64'),
      isBase64Encoded: true,
    };

  } catch (err) {
    console.error(`Error serving file ${filename}:`, err);
    return { statusCode: 500, body: "Internal Server Error" };
  }
};
