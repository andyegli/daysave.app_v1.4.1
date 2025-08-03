/**
 * Localhost Protocol Fix
 * Handles HTTPS to HTTP redirects and URL corrections for localhost development
 */

// Fix protocol issues for localhost
if (window.location.hostname === 'localhost' && window.location.protocol === 'https:') {
  console.log('🔄 Redirecting from HTTPS to HTTP for localhost...');
  window.location.href = `http://localhost:${window.location.port || 3000}${window.location.pathname}${window.location.search}`;
}

// Helper function to fix localhost SSL protocol issues
function getCorrectUrl(path) {
  if (window.location.hostname === 'localhost') {
    return `http://localhost:${window.location.port || 3000}${path}`;
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