import type { Handler, HandlerResponse } from '@netlify/functions';
import { normalize, resolve } from 'path';
import { promises as fs } from 'fs';
import { readFileSync, existsSync } from 'fs';
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

// Helper to check if a value is a likely file path 
const isFilePath = (str: string) => str.includes('/') || str.includes('.');

/**
 * Recursively traverses an arbitrary configuration object (JSON) to collect all strings that appear to be file paths
 * It normalizes paths (e.g., resolving 'foo//bar' to 'foo/bar') to ensure consistent comparison against requested filenames.
 *
 * @param {any} config - The user configuration object (can be string, array, or nested object)
 * @param {Set<string>} [paths] - An accumulator Set used during recursion. Defaults to a new Set
 * @returns {Set<string>} A Set containing all unique, normalized file paths found within the config
 */
function getAllFilePaths(config: any, paths: Set<string> = new Set()): Set<string> {
  if (typeof config === 'string') {
    // Normalize the path (resolves '..', '//', and converts slashes for OS)
    if (isFilePath(config)) {
      paths.add(normalize(config));
    }
  } else if (Array.isArray(config)) {
    config.forEach(item => getAllFilePaths(item, paths));
  } else if (config && typeof config === 'object') {
    Object.values(config).forEach(val => getAllFilePaths(val, paths));
  }
  return paths;
}

/**
 * Netlify Function: Secure Asset Handler
 * Serves private assets (.jsons, .pdfs) from within a protected directory secure_assets/ which is built during build-time
 * NOTE: ONLY WORKS FOR JSONS AND PDFS AT THIS TIME.
 *
 * It authenticates the user via a JWT cookie and checks specific file permissions before serving the content
 * @param event - The Netlify event object containing headers and query parameters
 * @returns A response containing the base64 encoded file or an error status
 */
export const handler: Handler = async (event) => {
  // EXTRACT COOKIE and JWT TOKEN
  const cookies = cookie.parse(event.headers.cookie || '');
  const token = cookies.nf_jwt;

  if (!token) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: "Unauthorized: No session found" })
    };
  }

  let username = '';

  // VERIFY JWT & GET USER
  try {
    if (!process.env.JWT_SECRET) throw new Error("Missing JWT_SECRET");

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as UserToken;
    username = decoded.user;
  } catch (err) {
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: "Forbidden: Session expired or invalid" })
    };
  }

  // PARSE REQUESTED FILENAME, AND MAKE SURE IT'S VALID
  // Normalize it too
  let filename = event.queryStringParameters?.file;
  if (!filename || filename.includes('..') || filename.includes('\\')) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: "Invalid filename" })
    };
  }
  filename = normalize(filename);

  // CHANGE FILENAME IF GENERIC `me.json` REQUESTED TO GRAB USER CONFIG
  if (filename === 'me.json') {
    filename = `user_configs/${username}_config.json`;
  }

  // AUTHORIZATION LOGIC
  let hasAccess = false;
  // ---
  // A. Check if User in Admin 
  const adminUsers = JSON.parse(process.env.ADMIN_USERS || '[]');
  if (adminUsers.includes(username)) {
    hasAccess = true;
  }
  // B. everyone should have access to their own config file
  else if (filename === `user_configs/${username}_config.json`) {
    hasAccess = true;
  }
  // C. Check if the requested file is listed INSIDE their config file
  // This serves as their source of truth for user permissions
  else {
    try {
      // Load their config from disk
      const configPath = resolve(`./secure_assets/user_configs/${username}_config.json`);

      if (existsSync(configPath)) {
        const configRaw = readFileSync(configPath, 'utf-8');
        const configJson = JSON.parse(configRaw);

        const allowedFiles = getAllFilePaths(configJson);

        // Check if the requested filename appears anywhere in their config
        if (allowedFiles.has(filename)) {
          hasAccess = true;
        }
      }
    } catch (e) {
      console.error(`Error reading config for authorization: ${e}`);
      hasAccess = false; // should be false anyway but this is to be safe
    }
  }

  if (!hasAccess) {
    console.log(`User ${username} denied access to ${filename}`);
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: "Forbidden: Access Denied" })
    };
  }

  // ============================================================

  // RESOLVE FILE PATH
  try {
    const secureRoot = resolve('./secure_assets');
    // Resolve the full path of the requested file
    const filePath = resolve(secureRoot, filename);

    // security check
    if (!filePath.startsWith(secureRoot)) {
      console.error(`Path traversal attempt by ${username}: ${filename}`);
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "Forbidden" })
      };
    }

    // Check existence asynchronously
    try {
      await fs.access(filePath);
    } catch {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "File not found" })
      };
    }

    // file exists, so serve file as b64
    const ext = filename.split('.').pop()?.toLowerCase();
    const contentTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'json': 'application/json',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'svg': 'image/svg+xml'
    };
    const contentType = contentTypes[ext || ''] || 'application/octet-stream';

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
    } as HandlerResponse;

  } catch (err) {
    console.error(`Error serving file ${filename}:`, err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: "Internal Server Error" })
    };
  }
};
