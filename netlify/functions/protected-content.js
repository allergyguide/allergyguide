// netlify/functions/protected-content.js
exports.handler = async (event) => {
  try {
    // Parse environment variables
    // These need to be present in Netlify and secure
    const users = JSON.parse(process.env.AUTH_USERS || "{}");
    const tokenExpiryHours = parseInt(process.env.TOKEN_EXPIRY_HOURS || "24");
    const githubToken = process.env.GITHUB_TOKEN;
    const githubOwner = process.env.GITHUB_OWNER; // e.g., "your-username"
    const githubRepo = process.env.GITHUB_REPO;   // e.g., "private-content"

    if (!githubToken || !githubOwner || !githubRepo) {
      console.error('Missing required environment variables');
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    // Extract and validate path parameter
    const { path } = event.queryStringParameters || {};
    if (!path) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing path parameter' })
      };
    }

    // Validate path (security check)
    if (path.includes('..') || path.startsWith('/') || !path.match(/\.(html|md)$/i)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid path format. Use relative paths ending in .html or .md' })
      };
    }

    // Handle authentication
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Basic ")) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Authentication required' })
      };
    }

    // Decode and validate credentials
    let username, password;
    try {
      const base64Credentials = authHeader.split(" ")[1];
      [username, password] = Buffer.from(base64Credentials, 'base64').toString().split(":");
    } catch (e) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid authentication format' })
      };
    }

    if (!users[username] || users[username] !== password) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Invalid credentials' })
      };
    }

    // Fetch content from GitHub
    const githubUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${path}`;
    console.log(`Fetching: ${githubUrl}`);

    let githubResponse;
    try {
      githubResponse = await fetch(githubUrl, {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3.raw',
          'User-Agent': 'Netlify-Function'
        }
      });
    } catch (fetchError) {
      console.error('GitHub fetch error:', fetchError);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to connect to content source' })
      };
    }

    if (!githubResponse.ok) {
      if (githubResponse.status === 404) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Content not found' })
        };
      } else if (githubResponse.status === 403) {
        console.error('GitHub API rate limit or permission error');
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Content access denied' })
        };
      } else {
        console.error(`GitHub API error: ${githubResponse.status}`);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Failed to fetch content' })
        };
      }
    }

    const content = await githubResponse.text();
    const fileType = path.toLowerCase().endsWith('.html') ? 'html' : 'md';

    // Generate token with expiry
    const tokenData = {
      username,
      exp: Date.now() + (tokenExpiryHours * 60 * 60 * 1000)
    };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        fileType,
        tokenData,
        path
      })
    };

  } catch (error) {
    console.error('Unexpected error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
