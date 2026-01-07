// protected.js
class ProtectedContentLoader {
  constructor() {
    // Use relative URLs - works for both local dev and production
    this.baseUrl = '/.netlify/functions/protected-content';
    this.imageUrl = '/.netlify/functions/protected-image';
    this.storageKey = 'auth-token-data';
    this.imageCache = new Map();
    this.debug = true; // Enable debug logging
  }

  log(message, data = null) {
    if (this.debug) {
      console.log(`[ProtectedLoader] ${message}`, data || '');
    }
  }

  // Check if stored token is still valid
  isTokenValid(tokenData) {
    if (!tokenData || !tokenData.exp) return false;
    return Date.now() < tokenData.exp;
  }

  // Get stored token data
  getStoredToken() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.warn('Failed to parse stored token:', e);
      localStorage.removeItem(this.storageKey);
      return null;
    }
  }

  // Store token data
  storeToken(tokenData, credentials) {
    const dataToStore = {
      ...tokenData,
      token: btoa(`${credentials.username}:${credentials.password}`)
    };
    localStorage.setItem(this.storageKey, JSON.stringify(dataToStore));
  }

  // Clear stored token
  clearToken() {
    localStorage.removeItem(this.storageKey);
    this.imageCache.clear();
  }

  // Show login form
  showLoginForm(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
            <div class="protected-login-form">
              <h4>Protected Content - Login Required</h4>
              <form class="login-form">
                <div class="form-group">
                  <label for="${containerId}-username">Username:</label>
                  <input type="text" id="${containerId}-username" name="username" required>
                </div>
                <div class="form-group">
                  <label for="${containerId}-password">Password:</label>
                  <input type="password" id="${containerId}-password" name="password" required>
                </div>
                <button type="submit" class="login-button">
                  Access Content
                </button>
                <div id="${containerId}-error" class="login-error" style="display: none;"></div>
              </form>
            </div>
          `;
        const form = container.querySelector('.login-form');
        if (form) {
            form.addEventListener('submit', (event) => {
                event.preventDefault();
                this.submitLogin(containerId);
            });
        }
    }
  }

  // Handle form submission
  async submitLogin(containerId) {
    const usernameField = document.getElementById(`${containerId}-username`);
    const passwordField = document.getElementById(`${containerId}-password`);
    const errorDiv = document.getElementById(`${containerId}-error`);
    const button = document.querySelector(`#${containerId} .login-button`);

    if (!usernameField || !passwordField) {
      console.error('Login form fields not found');
      return;
    }

    const username = usernameField.value.trim();
    const password = passwordField.value;

    if (!username || !password) {
      this.showLoginError(containerId, 'Please enter both username and password');
      return;
    }

    // Show loading state
    button.textContent = 'Authenticating...';
    button.disabled = true;
    errorDiv.style.display = 'none';

    try {
      const credentials = { username, password };
      const path = document.getElementById(containerId).getAttribute('data-protected-path');

      // Try to authenticate and fetch content
      await this.authenticateAndLoadContent(containerId, path, credentials);

    } catch (error) {
      this.log('Login failed:', error);

      // Reset button state
      button.textContent = 'Access Content';
      button.disabled = false;

      if (error.message.includes('401') || error.message.includes('Invalid credentials') || error.message.includes('Authentication')) {
        this.showLoginError(containerId, 'Invalid credentials. Please try again.');
      } else {
        this.showLoginError(containerId, error.message || 'Authentication failed. Please try again.');
      }
    }
  }

  // Show login error
  showLoginError(containerId, message) {
    const errorDiv = document.getElementById(`${containerId}-error`);
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
    }
  }

  // Authenticate and load content (separated from main flow)
  async authenticateAndLoadContent(containerId, path, credentials) {
    const token = btoa(`${credentials.username}:${credentials.password}`);

    // Fetch content with credentials
    const contentData = await this.fetchContent(path, token);

    // Store the token data
    if (contentData.tokenData) {
      this.storeToken(contentData.tokenData, credentials);
    }

    // Get current token for image processing
    const currentTokenData = this.getStoredToken();
    const currentToken = currentTokenData ? currentTokenData.token : null;

    // Get base path for images (directory of the content file)
    const basePath = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';

    // Process and render content
    await this.renderContent(contentData.content, contentData.fileType, containerId, currentToken, basePath);
    this.log('Content rendered successfully after login');
  }

  // Prompt user for credentials (now returns form instead of prompt)
  async promptCredentials(containerId) {
    return new Promise((resolve) => {
      // Show login form instead of prompting
      this.showLoginForm(containerId);
      resolve(null); // Return null to indicate form is shown
    });
  }

  // Fetch protected content
  async fetchContent(path, token) {
    const url = `${this.baseUrl}?path=${encodeURIComponent(path)}`;
    this.log('Fetching content from:', url);

    try {
      const response = await fetch(url, {
        headers: { 'Authorization': `Basic ${token}` }
      });

      this.log('Response status:', response.status);
      this.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        // Get the raw response text for debugging
        const responseText = await response.text();
        this.log('Error response body:', responseText);

        // Try to parse as JSON, fall back to text
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          // If it's not JSON, it's probably an HTML error page
          if (responseText.includes('<html') || responseText.includes('<!DOCTYPE')) {
            throw new Error(`Function returned HTML instead of JSON. Status: ${response.status}. This usually means the function isn't deployed or there's a server error.`);
          }
          errorData = { error: responseText };
        }

        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const responseText = await response.text();
      this.log('Success response body:', responseText);

      try {
        return JSON.parse(responseText);
      } catch (e) {
        this.log('Failed to parse JSON response:', e);
        throw new Error('Invalid JSON response from server');
      }
    } catch (fetchError) {
      this.log('Fetch error:', fetchError);
      if (fetchError.name === 'TypeError' && fetchError.message.includes('fetch')) {
        throw new Error('Network error - please check your connection');
      }
      throw fetchError;
    }
  }

  // Fetch protected image and convert to data URL
  async fetchImage(imagePath, token) {
    // Check cache first
    const cacheKey = `${imagePath}-${token}`;
    if (this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey);
    }

    const url = `${this.imageUrl}?path=${imagePath}`;
    console.log(`Fetch URL: ${url}`)

    try {
      const response = await fetch(url, {
        headers: { 'Authorization': `Basic ${token}` }
      });

      if (!response.ok) {
        throw new Error(`Failed to load image: ${imagePath}`);
      }

      const data = await response.json();
      console.log("GitHub API response in fetchImage():", data);
      const dataUrl = `data:${data.contentType};base64,${data.content}`;

      // Cache the result
      this.imageCache.set(cacheKey, dataUrl);
      return dataUrl;
    } catch (error) {
      console.warn(`Failed to load protected image ${imagePath}:`, error);
      return null;
    }
  }

  // Process images in content - replace src with data URLs
  async processImages(content, token, basePath = '') {
    if (!token) return content;

    // Find all img tags with src attributes
    const imgRegex = /<img([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi;
    const images = [];
    let match;

    while ((match = imgRegex.exec(content)) !== null) {
      const fullMatch = match[0];
      const beforeSrc = match[1];
      let srcPath = match[2];
      const afterSrc = match[3];

      // Decode HTML entities in the src path
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = srcPath;
      srcPath = tempDiv.textContent || tempDiv.innerText || srcPath;

      this.log('Processing image src:', { original: match[2], decoded: srcPath });

      // Only process relative paths or absolute paths that should be from the private repo
      // Skip external URLs and data URLs
      if (!srcPath.startsWith('http') && !srcPath.startsWith('data:')) {
        let fullPath;

        if (srcPath.startsWith('/')) {
          srcPath = "static" + srcPath;
          // Absolute path - remove leading slash and combine with base path
          const relativePath = srcPath.substring(1); // Remove leading /
          fullPath = basePath ? `${basePath}/${relativePath}` : relativePath;
        } else {
          srcPath = "static/" + srcPath;
          // Relative path - combine directly with base path
          fullPath = basePath ? `${basePath}/${srcPath}` : srcPath;
        }

        this.log('Image path resolution:', { srcPath, basePath, fullPath });

        images.push({
          fullMatch,
          beforeSrc,
          srcPath,
          afterSrc,
          fullPath
        });
      }
    }

    // Fetch all images in parallel
    const imagePromises = images.map(async (img) => {
      this.log(`Fetching image from: ${img.srcPath}`);
      const dataUrl = await this.fetchImage(img.srcPath, token);
      this.log(`Image fetch result for ${img.srcPath}:`, dataUrl ? 'success' : 'failed');
      return { ...img, dataUrl };
    });

    const imageResults = await Promise.all(imagePromises);

    // Replace image sources in content
    let processedContent = content;
    imageResults.forEach(({ fullMatch, beforeSrc, afterSrc, dataUrl, srcPath }) => {
      if (dataUrl) {
        const newImg = `<img${beforeSrc}src="${dataUrl}"${afterSrc}>`;
        processedContent = processedContent.replace(fullMatch, newImg);
        this.log(`Successfully replaced image: ${srcPath}`);
      } else {
        // If image failed to load, add error class and alt text
        const newImg = `<img${beforeSrc}src="#" alt="Failed to load: ${srcPath}" class="protected-image-error"${afterSrc}>`;
        processedContent = processedContent.replace(fullMatch, newImg);
        this.log(`Failed to load image: ${srcPath}`);
      }
    });

    return processedContent;
  }

  // Render content based on file type
  async renderContent(content, fileType, containerId, token, basePath) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id '${containerId}' not found`);
    }

    // Process images first
    const processedContent = await this.processImages(content, token, basePath);

    if (fileType === 'html') {
      container.innerHTML = processedContent;
    } else if (fileType === 'md') {
      if (typeof marked === 'undefined') {
        throw new Error('Marked library not loaded for Markdown rendering');
      }
      container.innerHTML = marked.parse(processedContent);
    } else {
      container.textContent = processedContent;
    }
  }

  // Show error message
  showError(containerId, message) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `<div class="protected-error" style="color: #dc3545; padding: 1rem; border: 1px solid #dc3545; border-radius: 4px; background: #f8d7da;">
            <strong>Error:</strong> ${message}
          </div>`;
    }
  }

  // Show loading state
  showLoading(containerId, loadingText = 'Loading protected content...') {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `<div class="protected-loading">${loadingText}</div>`;
    }
  }

  // Main method to load protected content
  async loadProtectedContent(containerId, path) {
    const container = document.getElementById(containerId);
    const loadingText = container?.getAttribute('data-loading-text') || 'Loading protected content...';

    this.log('Starting to load protected content', { containerId, path });
    this.showLoading(containerId, loadingText);

    try {
      let tokenData = this.getStoredToken();

      // Check if we have a valid token
      if (!tokenData || !this.isTokenValid(tokenData)) {
        this.log('No valid token found, showing login form');
        await this.promptCredentials(containerId);
        return; // Exit here - form will handle the rest
      } else {
        this.log('Using stored token');
      }

      // Attempt to fetch content with stored token
      try {
        const token = tokenData.token;
        this.log('Attempting to fetch content with stored token');
        const contentData = await this.fetchContent(path, token);

        this.log('Content fetch successful:', contentData);

        // Get current token for image processing
        const currentToken = tokenData.token;

        // Get base path for images (directory of the content file)
        const basePath = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';

        // Process and render content
        await this.renderContent(contentData.content, contentData.fileType, containerId, currentToken, basePath);
        this.log('Content rendered successfully');

      } catch (error) {
        this.log('Stored token failed:', error.message);
        // If stored token was invalid or expired, show login form
        if (error.message.includes('401') || error.message.includes('Authentication') || error.message.includes('Invalid credentials')) {
          this.clearToken();
          this.log('Token expired/invalid, showing login form');
          await this.promptCredentials(containerId);
          return;
        } else {
          throw error;
        }
      }

    } catch (error) {
      this.log('Error loading protected content:', error);
      console.error('Failed to load protected content:', error);
      this.showError(containerId, error.message || 'Failed to load content');
    }
  }
}

// Global instance
window.protectedLoader = new ProtectedContentLoader();

// Auto-load content for elements with data-protected-path attribute
document.addEventListener('DOMContentLoaded', () => {
  const protectedElements = document.querySelectorAll('[data-protected-path]');
  protectedElements.forEach(element => {
    const path = element.getAttribute('data-protected-path');
    if (path) {
      window.protectedLoader.loadProtectedContent(element.id, path);
    }
  });
});

// Global logout function
window.logoutProtectedContent = function() {
  window.protectedLoader.clearToken();
  const protectedElements = document.querySelectorAll('[data-protected-path]');
  protectedElements.forEach(element => {
    element.innerHTML = '<div class="protected-logged-out">Logged out. <a href="#" class="reload-link">Reload</a> to access content.</div>';
    const reloadLink = element.querySelector('.reload-link');
    if (reloadLink) {
        reloadLink.addEventListener('click', (event) => {
            event.preventDefault();
            location.reload();
        });
    }
  });
};

// mark that scripts have been loaded
if (!window.config) window.config = {};
if (!window.config.extra) window.config.extra = {};
window.config.extra.protected_content_script_loaded = true;

