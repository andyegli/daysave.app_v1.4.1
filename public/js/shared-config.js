/**
 * Shared Configuration for DaySave Frontend
 * Contains common variables and utilities used across multiple JavaScript files
 */

// Global namespace to avoid variable conflicts
window.DaySaveConfig = window.DaySaveConfig || {};

// Detect if we're using nginx proxy vs direct access
window.DaySaveConfig.IS_NGINX_PROXY = (window.location.protocol === 'https:' && window.location.hostname === 'localhost' && !window.location.port);

// Log the access method once
console.log('🔍 DaySave Config - Access method detected:', window.DaySaveConfig.IS_NGINX_PROXY ? 'NGINX PROXY (https://localhost)' : 'DIRECT ACCESS');

/**
 * Helper function to fix localhost SSL protocol issues
 * Used across multiple modules to ensure consistent URL handling
 */
window.DaySaveConfig.getCorrectUrl = function(path) {
  // If using nginx proxy, always return relative URLs to maintain session cookies
  if (window.DaySaveConfig.IS_NGINX_PROXY) {
    console.log('🔧 DaySave getCorrectUrl (nginx): keeping relative:', path);
    return path;
  }
  
  // Original logic for direct access
  if (window.location.hostname === 'localhost') {
    // If path is already a full URL, don't modify it
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path.replace('https://localhost', 'http://localhost');
    }
    // Convert relative paths to absolute HTTP URLs
    if (path.startsWith('/')) {
      const url = `http://localhost:${window.location.port || 3000}${path}`;
      console.log('🔧 DaySave getCorrectUrl (direct): converted to:', url);
      return url;
    }
  }
  return path;
};

/**
 * Common request interception for localhost protocol fixes
 */
if (window.location.hostname === 'localhost' && !window.DaySaveConfig.interceptorsSetup) {
  console.log('🛡️ Localhost detected - applying safe protocol enforcement');
  
  // Store original methods safely
  const _originalXHROpen = XMLHttpRequest.prototype.open;
  const _originalFetch = window.fetch;
  
  // AGGRESSIVE XHR override with detailed logging
  XMLHttpRequest.prototype.open = function(method, url, async = true, user, password) {
    // Convert HTTPS to HTTP for localhost  
    if (typeof url === 'string' && url.includes('https://localhost')) {
      const newUrl = url.replace('https://localhost', 'http://localhost');
      console.log('🔧 XHR Protocol Fix:', url, '→', newUrl);
      url = newUrl;
    }
    
    // Fix relative URLs to absolute HTTP URLs for localhost
    if (typeof url === 'string' && url.startsWith('/') && window.location.hostname === 'localhost') {
      url = `http://localhost:${window.location.port || 3000}${url}`;
      console.log('🔧 XHR Relative URL Fixed:', url);
    }
    
    // Handle timeout conflict for sync requests
    if (async === false && this.timeout) {
      this.timeout = 0; // Clear timeout for sync requests
    }
    
    return _originalXHROpen.call(this, method, url, async, user, password);
  };
  
  // AGGRESSIVE fetch override with detailed logging
  window.fetch = function(url, options = {}) {
    if (typeof url === 'string' && url.includes('https://localhost')) {
      const newUrl = url.replace('https://localhost', 'http://localhost');
      console.log('🔧 Fetch Protocol Fix:', url, '→', newUrl);
      url = newUrl;
    }
    
    // Fix relative URLs to absolute HTTP URLs for localhost - but preserve proxy routing
    if (typeof url === 'string' && url.startsWith('/') && window.location.hostname === 'localhost') {
      // For nginx proxy (https://localhost without port), keep URLs relative to maintain session cookies
      if (window.location.protocol === 'https:' && !window.location.port) {
        console.log('🔧 Fetch: Keeping relative URL for nginx proxy:', url);
        // Don't modify the URL - keep it relative
      } else {
        // For direct access (localhost:3000), convert to HTTP
        url = `http://localhost:${window.location.port || 3000}${url}`;
        console.log('🔧 Fetch Relative URL Fixed:', url);
      }
    }
    
    return _originalFetch.call(this, url, options);
  };

  // Mark interceptors as setup to prevent duplicate setup
  window.DaySaveConfig.interceptorsSetup = true;
}

console.log('✅ DaySave shared configuration loaded');
