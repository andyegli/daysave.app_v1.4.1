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
  console.log('🖼️ Initializing enhanced image error handling and aspect ratio fixes');
  
  // Fix thumbnail aspect ratios on load
  $(document).on('load', '.thumbnail-container img', function() {
    const $img = $(this);
    fixThumbnailAspectRatio($img);
  });
  
  // Fix aspect ratios for already loaded images
  $('.thumbnail-container img').each(function() {
    const $img = $(this);
    if (this.complete && this.naturalHeight !== 0) {
      fixThumbnailAspectRatio($img);
    }
  });
  
  // Handle thumbnail image load errors with fallback
  $(document).on('error', 'img[data-fallback="true"]', function() {
    const $img = $(this);
    const fallbackIcon = $img.attr('data-fallback-icon') || 'bi-file-earmark-text';
    const fallbackColor = $img.attr('data-fallback-color') || '#6c757d';
    
    console.log(`🚫 Image failed to load: ${$img.attr('src')}`);
    
    // Check if we're in a thumbnail container
    const $container = $img.closest('.thumbnail-container');
    if ($container.length > 0) {
      // Use fallback icon class for thumbnail containers
      const $icon = $(`<i class="${fallbackIcon} fallback-icon" style="color: ${fallbackColor}"></i>`);
      $img.replaceWith($icon);
    } else {
      // Legacy fallback for other images
      const $icon = $(`<i class="${fallbackIcon} fs-1" style="color: ${fallbackColor}"></i>`);
      const $parent = $img.parent();
      $parent.empty().append($icon);
      $parent.addClass('d-flex align-items-center justify-content-center');
    }
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
  
  console.log('✅ Enhanced image error handling initialized');
}

function fixThumbnailAspectRatio($img) {
  const img = $img[0];
  if (!img.naturalWidth || !img.naturalHeight) return;
  
  const aspectRatio = img.naturalWidth / img.naturalHeight;
  const $container = $img.closest('.thumbnail-container');
  
  // Always use contain for images to prevent stretching
  // Video thumbnails will use cover (set by CSS class)
  if ($container.hasClass('video-thumb')) {
    // Videos: use cover for better visual appeal
    $img.css({
      'object-fit': 'cover',
      'width': '100%',
      'height': '100%'
    });
    console.log(`🎬 Applied cover fit for video thumbnail (ratio: ${aspectRatio.toFixed(2)})`);
  } else {
    // Images: always use contain to prevent stretching
    $img.css({
      'object-fit': 'contain',
      'max-width': '100%',
      'max-height': '100%',
      'width': 'auto',
      'height': 'auto',
      'background': '#fff'
    });
    console.log(`🖼️ Applied contain fit for image thumbnail (ratio: ${aspectRatio.toFixed(2)})`);
  }
  
  // Add loaded class for potential styling
  $container.addClass('image-loaded');
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