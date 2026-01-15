/**
 * @module
 * Serverless function to serve protected assets (JSON/PDF) securely.
 */
import type { Handler, HandlerResponse } from '@netlify/functions';
import { normalize, resolve } from 'path';
import { promises as fs } from 'fs';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';

/**
 * Interface representing the decoded JWT payload.
 */
interface UserToken {
  username: string;
  permissions: string[];
  iat: number;
  exp: number;
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
  let tokenPermissions: string[];

  // VERIFY JWT & GET USER
  try {
    if (!process.env.JWT_SECRET) throw new Error("Missing JWT_SECRET");

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as UserToken;
    username = decoded.username;
    tokenPermissions = decoded.permissions;
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

  // HANDLE BOOTSTRAP REQUEST (Server-Side Aggregation)
  if (filename === 'oit_calculator-bootstrap') {
    try {
      const secureRoot = resolve('./secure_assets');
      const configPath = resolve(secureRoot, `user_configs/${username}_config.json`);

      // A. Read User Config
      const configRaw = await fs.readFile(configPath, 'utf-8');
      const userConfig = JSON.parse(configRaw);

      if (!userConfig.tools?.oit_calculator) {
        console.warn(`User ${username} logged in but lacks oit_calculator config.`);
        return {
          statusCode: 403,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: "Forbidden: No OIT Configuration found" })
        };
      }

      const oitConfig = userConfig.tools.oit_calculator;

      // B. Read Assets Parallel
      // Use catch() to return empty array if a specific file is missing/broken

      // path traversal security check
      const foodsPath = resolve(secureRoot, oitConfig.custom_foods);
      if (!foodsPath.startsWith(secureRoot)) throw new Error("Invalid custom foods path");
      const protocolsPath = resolve(secureRoot, oitConfig.custom_protocols);
      if (!protocolsPath.startsWith(secureRoot)) throw new Error("Invalid custom protocols path");

      const [foodsRaw, protocolsRaw] = await Promise.all([

        fs.readFile(foodsPath, 'utf-8').catch(e => {
          console.error(`Failed to load foods for ${username}:`, e);
          return "[]";
        }),
        fs.readFile(protocolsPath, 'utf-8').catch(e => {
          console.error(`Failed to load protocols for ${username}:`, e);
          return "[]";
        })
      ]);

      const responseData = {
        username: username,
        customFoods: JSON.parse(foodsRaw),
        protocols: JSON.parse(protocolsRaw),
        handouts: oitConfig.handouts || []
      };

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        },
        body: JSON.stringify(responseData)
      };

    } catch (err) {
      console.error(`Error in oit_calculator bootstrap for ${username}:`, err);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "Bootstrap failed" })
      };
    }
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
  // C. Check permissions
  else {
    // Check Flattened Permissions in Token 
    if (tokenPermissions && tokenPermissions.includes(filename)) {
      hasAccess = true;
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
    let cacheControl = 'private, no-cache, no-store, must-revalidate'; // Default 
    // Allow limited caching for PDFs (Static Handouts)
    if (ext === 'pdf') {
      // "private" = specific to this user (don't put on shared CDN)
      // "max-age=3600" = keep in browser RAM/Disk for 1 hour
      cacheControl = 'private, max-age=3600';
    }

    // read and return
    const fileBuffer = await fs.readFile(filePath);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': cacheControl,
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
