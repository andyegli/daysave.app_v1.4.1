/**
 * Global Nginx Proxy Detection
 * This file must be loaded first to set up global proxy detection
 */

// Global nginx proxy detection that all other scripts can use
window.IS_NGINX_PROXY = (window.location.protocol === 'https:' && window.location.hostname === 'localhost' && !window.location.port);
window.ACCESS_METHOD = window.IS_NGINX_PROXY ? 'NGINX PROXY (https://localhost)' : 'DIRECT ACCESS';

console.log('🔍 GLOBAL ACCESS METHOD DETECTED:', window.ACCESS_METHOD);

// Global URL correction function
window.getCorrectUrl = function(path) {
  // If using nginx proxy, always return relative URLs to maintain session cookies
  if (window.IS_NGINX_PROXY) {
    console.log('🔧 getCorrectUrl (nginx): keeping relative:', path);
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
      console.log('🔧 getCorrectUrl (direct): converted to:', url);
      return url;
    }
  }
  return path;
};

// Override fetch globally if on localhost
if (window.location.hostname === 'localhost') {
  const _originalFetch = window.fetch;
  
  window.fetch = function(url, options = {}) {
    console.log('🔍 GLOBAL FETCH:', url, 'Proxy mode:', window.IS_NGINX_PROXY);
    
    // Fix relative URLs
    if (typeof url === 'string' && url.startsWith('/')) {
      if (window.IS_NGINX_PROXY) {
        console.log('🔧 Global Fetch: Keeping relative URL for nginx proxy:', url);
        // Keep it relative
      } else {
        url = `http://localhost:${window.location.port || 3000}${url}`;
        console.log('🔧 Global Fetch: Converted to absolute URL:', url);
      }
    }
    
    return _originalFetch.call(this, url, options);
  };
}

console.log('✅ Global nginx proxy detection and URL handling initialized');
