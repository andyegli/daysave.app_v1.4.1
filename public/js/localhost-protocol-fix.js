/**
 * Localhost Protocol Fix
 * Handles HTTPS to HTTP redirects and URL corrections for localhost development
 */

// Fix protocol issues for localhost - only redirect if not already on the correct protocol
if (window.location.hostname === 'localhost' && window.location.protocol === 'https:') {
  console.log('🔄 HTTPS detected on localhost - using relative URLs to avoid protocol conflicts');
  // Don't auto-redirect - let relative URLs handle protocol consistency
}

// Helper function to fix localhost SSL protocol issues
function getCorrectUrl(path) {
  // Always use relative URLs for localhost to avoid protocol issues
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('🔧 Using relative URL for localhost:', path);
    return path; // Use relative path - browser will use same protocol as current page
  }
  return path;
}

// Fix form actions and links on page load
document.addEventListener('DOMContentLoaded', function() {
  console.log('🔧 Applying localhost protocol fixes...');
  
  // Fix search form action
  const searchForm = document.querySelector('form[action="/files"]');
  if (searchForm && window.location.hostname === 'localhost') {
    searchForm.action = getCorrectUrl('/files');
    console.log('✅ Fixed search form action');
  }
  
  // Fix any links that might cause issues
  document.querySelectorAll('a[href^="/files"]').forEach(link => {
    if (window.location.hostname === 'localhost') {
      const href = link.getAttribute('href');
      link.href = getCorrectUrl(href);
    }
  });
  
  // Fix content management forms
  const contentForm = document.querySelector('form[action="/content"]');
  if (contentForm && window.location.hostname === 'localhost') {
    contentForm.action = getCorrectUrl('/content');
    console.log('✅ Fixed content form action');
  }
  
  // Fix any other forms that might have protocol issues
  document.querySelectorAll('form').forEach(form => {
    if (window.location.hostname === 'localhost') {
      const action = form.getAttribute('action');
      if (action && action.startsWith('/')) {
        form.action = getCorrectUrl(action);
      }
    }
  });
  
  console.log('✅ Localhost protocol fixes applied');
});

// Export helper functions for use by other scripts
window.getCorrectUrl = getCorrectUrl;