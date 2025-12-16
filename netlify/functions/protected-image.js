// netlify/functions/protected-image.js
exports.handler = async (event) => {
  try {
    // Parse environment variables
    const users = JSON.parse(process.env.AUTH_USERS || "{}");
    const githubToken = process.env.GITHUB_TOKEN;
    const githubOwner = process.env.GITHUB_OWNER;
    const githubRepo = process.env.GITHUB_REPO;

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

    // Validate path (security check) - allow common image extensions
    const imageExtensions = /\.(jpg|jpeg|png|gif|svg|webp|bmp|ico)$/i;
    if (path.includes('..') || path.startsWith('/') || !imageExtensions.test(path)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid image path format' })
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

    // Fetch image from GitHub
    const githubUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${path}`;
    console.log(`Fetching image: ${githubUrl}`);

    let githubResponse;
    try {
      githubResponse = await fetch(githubUrl, {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json', // Get metadata including content
          'User-Agent': 'Netlify-Function'
        }
      });
    } catch (fetchError) {
      console.error('GitHub fetch error:', fetchError);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to connect to image source' })
      };
    }

    if (!githubResponse.ok) {
      if (githubResponse.status === 404) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Image not found' })
        };
      } else if (githubResponse.status === 403) {
        console.error('GitHub API rate limit or permission error');
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Image access denied' })
        };
      } else {
        console.error(`GitHub API error: ${githubResponse.status}`);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Failed to fetch image' })
        };
      }
    }

    const imageData = await githubResponse.json();

    // Verify it's a file (not a directory)
    if (imageData.type !== 'file') {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Path is not a file' })
      };
    }

    // Determine content type based on file extension
    const getContentType = (filename) => {
      const ext = filename.toLowerCase().split('.').pop();
      const mimeTypes = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'svg': 'image/svg+xml',
        'webp': 'image/webp',
        'bmp': 'image/bmp',
        'ico': 'image/x-icon'
      };
      return mimeTypes[ext] || 'application/octet-stream';
    };

    const contentType = getContentType(imageData.name);
    let base64Content = imageData.content;

    if (!base64Content) {
      // Content was too large — fetch from download_url
      if (!imageData.download_url) {
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Missing download_url for large file' })
        };
      }

      const imageBinaryRes = await fetch(imageData.download_url, {
        headers: {
          Authorization: `token ${githubToken}` // Might not be needed for raw URLs
        }
      });

      if (!imageBinaryRes.ok) {
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Failed to fetch image binary' })
        };
      }

      const arrayBuffer = await imageBinaryRes.arrayBuffer();
      base64Content = Buffer.from(arrayBuffer).toString('base64');
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=3600'
      },
      body: JSON.stringify({
        content: base64Content,
        contentType: contentType,
        filename: imageData.name,
        size: imageData.size
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
