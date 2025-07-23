/**
 * Content List Enhancements JavaScript
 * Handles image fallbacks, 4-line text clamping, and thumbnail fixes
 */

$(document).ready(function() {
  console.log('📄 Content List Enhancements: Loading...');
  
  // Enhanced 4-line text truncation handling
  handleTextTruncation();
  
  // Initialize image error handling for thumbnails
  initializeImageErrorHandling();
  
  // Fix thumbnail URLs for localhost SSL issues
  fixThumbnailUrls();
});

function handleTextTruncation() {
  console.log('🔧 4-line fix: CSS webkit-line-clamp is handling this properly, skipping JS override');
  
  // CSS is already handling line-clamp with !important rules
  // No additional JavaScript manipulation needed
}

function fixThumbnailUrls() {
  console.log('🔧 Fixing thumbnail URLs for localhost...');
  
  // Fix SSL protocol issues for localhost thumbnails
  if (window.location.hostname === 'localhost') {
    $('img[src^="https://localhost"]').each(function() {
      const currentSrc = $(this).attr('src');
      const fixedSrc = currentSrc.replace('https://localhost', `http://localhost:${window.location.port || 3000}`);
      $(this).attr('src', fixedSrc);
      console.log(`🔧 Fixed thumbnail URL: ${currentSrc} → ${fixedSrc}`);
    });
  }
}

function initializeImageErrorHandling() {
  console.log('🖼️ Initializing image error handling');
  
  // Handle thumbnail image load errors with fallback
  $(document).on('error', 'img[data-fallback="true"]', function() {
    const $img = $(this);
    const fallbackIcon = $img.attr('data-fallback-icon') || 'bi-file-earmark-text';
    const fallbackColor = $img.attr('data-fallback-color') || '#6c757d';
    
    console.log(`🚫 Image failed to load: ${$img.attr('src')}`);
    
    // Replace failed image with icon
    const $icon = $(`<i class="${fallbackIcon} fs-1" style="color: ${fallbackColor}"></i>`);
    
    // Maintain the same styling as the image container
    const $container = $img.parent();
    $container.empty().append($icon);
    $container.addClass('d-flex align-items-center justify-content-center');
  });
  
  // Handle onerror events for images with nextElementSibling fallback
  $(document).on('error', 'img[onerror]', function() {
    const $img = $(this);
    const $fallback = $img.next('i');
    
    console.log(`🚫 Image failed to load: ${$img.attr('src')}`);
    
    if ($fallback.length) {
      $img.hide();
      $fallback.show().css('display', 'flex');
    }
  });
  
  console.log('✅ Image error handling initialized');
}

/**
 * Handle badge interactions
 */
function handleBadgeInteractions() {
  // Handle "more tags" badges
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('more-tags-badge')) {
      const badge = e.target;
      const contentId = badge.getAttribute('data-content-id');
      const contentTitle = badge.getAttribute('data-content-title');
      const allTagsData = badge.getAttribute('data-all-tags');
      
      console.log('Badge clicked:', {
        element: badge,
        contentId: contentId,
        contentTitle: contentTitle,
        allTagsData: allTagsData,
        text: badge.textContent.trim()
      });
      
      // Additional badge handling logic can be added here
    }
  });
}

// Initialize badge interactions
document.addEventListener('DOMContentLoaded', handleBadgeInteractions); 