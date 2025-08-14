/**
 * Localhost Protocol Fix
 * Handles dynamic protocol and URL management for development and production
 */

console.log('🔄 Localhost Protocol Fix: ENABLED');

/**
 * Get the correct URL for the current environment
 * Uses the current protocol and hostname to build relative URLs
 */
function getCorrectUrl(path) {
  // Always use relative URLs when possible
  if (path && path.startsWith('/')) {
    console.log('🔧 getCorrectUrl: Using relative path:', path);
    return path;
  }
  
  // For absolute URLs, use the current origin
  const origin = window.location.origin;
  const cleanPath = path ? path.replace(/^\/+/, '/') : '/';
  const fullUrl = origin + cleanPath;
  
  console.log('🔧 getCorrectUrl: Built URL:', fullUrl);
  return fullUrl;
}

/**
 * Get the base URL for API calls
 * Uses the current protocol and hostname
 */
function getBaseUrl() {
  return window.location.origin;
}

document.addEventListener('DOMContentLoaded', function() {
  console.log('🏠 Localhost Protocol Fix: Initialized');
  console.log('🌐 Current origin:', window.location.origin);
  console.log('🔒 Protocol:', window.location.protocol);
});

// Export functions for global use
window.getCorrectUrl = getCorrectUrl;
window.getBaseUrl = getBaseUrl;

console.log('✅ Localhost Protocol Fix: ENABLED and configured');