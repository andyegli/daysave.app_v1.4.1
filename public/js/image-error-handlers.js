/**
 * Image Error Handlers
 * Handles image loading errors and fallbacks for CSP compliance
 */

document.addEventListener('DOMContentLoaded', function() {
  console.log('🖼️ Image error handlers loaded');
  
  // Handle image loading errors and show fallback icons
  function handleImageError(img) {
    console.log('🚫 Image failed to load:', img.src);
    img.style.display = 'none';
    
    // Show the next sibling (fallback icon)
    if (img.nextElementSibling) {
      img.nextElementSibling.style.display = 'flex';
    }
  }
  
  // Set up error handlers for existing images
  const images = document.querySelectorAll('img[data-fallback="true"]');
  images.forEach(function(img) {
    img.addEventListener('error', function() {
      handleImageError(this);
    });
  });
  
  // Set up observer for dynamically added images
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.nodeType === 1) { // Element node
          const newImages = node.querySelectorAll ? node.querySelectorAll('img[data-fallback="true"]') : [];
          newImages.forEach(function(img) {
            img.addEventListener('error', function() {
              handleImageError(this);
            });
          });
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('✅ Image error handlers initialized');
});