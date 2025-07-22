/**
 * Content List Enhancements
 * Handles UI enhancements for the content list page including:
 * - 4-line text display forcing
 * - Image error handling
 * - CSP-compliant event handling
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize all enhancements
  initializeFourLineTextDisplay();
  initializeImageErrorHandling();
});

/**
 * Force 4-line text display with JavaScript fallback
 * DISABLED: CSS webkit-line-clamp is working properly, no need for JS override
 */
function initializeFourLineTextDisplay() {
  console.log('🔧 4-line fix: CSS webkit-line-clamp is handling this properly, skipping JS override');
  return; // Skip JavaScript override since CSS is working
  
  const transcriptionTexts = document.querySelectorAll('.force-4-lines .text-content');
  console.log('🔍 Found transcription texts:', transcriptionTexts.length);
  
  transcriptionTexts.forEach(function(element, index) {
    console.log(`🎯 Processing element ${index + 1}:`, element);
    
    const originalText = element.textContent.trim();
    const container = element.parentElement;
    
    console.log(`📝 Original text length: ${originalText.length}`);
    console.log(`📝 Text preview: "${originalText.substring(0, 100)}..."`);
    
    // AGGRESSIVELY remove any existing line-clamp CSS from all related elements
    const allRelatedElements = [element, container, element.parentElement, element.parentElement?.parentElement];
    allRelatedElements.forEach(el => {
      if (el) {
        el.style.display = 'block';
        el.style.webkitLineClamp = 'unset';
        el.style.webkitBoxOrient = 'unset';
        el.style.webkitBox = 'unset';
        el.style.textOverflow = 'unset';
        el.classList.remove('line-clamp-2', 'line-clamp-1', 'line-clamp-3');
      }
    });
    
    // Set up the container with proper styling
    const lineHeight = 22; // 1.6 * 13.6px (0.85rem)
    const maxHeight = lineHeight * 4; // 88px for 4 lines
    
    container.style.height = maxHeight + 'px';
    container.style.minHeight = maxHeight + 'px';
    container.style.maxHeight = maxHeight + 'px';
    container.style.overflow = 'hidden';
    container.style.lineHeight = '1.6';
    container.style.fontSize = '0.85rem';
    
    // Completely reset the text element to allow natural flow
    element.style.cssText = `
      display: block !important;
      line-height: 1.6 !important;
      font-size: 0.85rem !important;
      height: auto !important;
      max-height: none !important;
      overflow: visible !important;
      white-space: normal !important;
      word-wrap: break-word !important;
      text-overflow: unset !important;
      -webkit-line-clamp: unset !important;
      -webkit-box-orient: unset !important;
    `;
    
    console.log(`📏 Container height set to: ${maxHeight}px`);
    console.log(`📏 Element scrollHeight: ${element.scrollHeight}px`);
    
    if (element.scrollHeight > maxHeight) {
      console.log(`✂️ Text needs truncation. ScrollHeight: ${element.scrollHeight}px > MaxHeight: ${maxHeight}px`);
      
      // Text is longer than 4 lines, we need to truncate
      let testText = originalText;
      let lastGoodText = originalText;
      let iterations = 0;
      const maxIterations = 50;
      
      // Binary search to find the maximum text that fits in 4 lines
      while (testText.length > 0 && iterations < maxIterations) {
        iterations++;
        element.textContent = testText + '...';
        
        console.log(`🔄 Iteration ${iterations}: Testing text length ${testText.length}, scrollHeight: ${element.scrollHeight}px`);
        
        if (element.scrollHeight <= maxHeight) {
          lastGoodText = testText + '...';
          console.log(`✅ Found good text at length: ${testText.length}`);
          break;
        }
        
        // Remove words from the end
        const words = testText.split(' ');
        if (words.length <= 1) break;
        words.pop();
        testText = words.join(' ');
      }
      
      element.textContent = lastGoodText;
      console.log(`🎯 Final text set: "${lastGoodText.substring(0, 100)}..."`);
    } else {
      console.log(`✅ Text fits in ${maxHeight}px without truncation`);
    }
    
    console.log(`📊 Final element scrollHeight: ${element.scrollHeight}px`);
  });
  
  console.log('✅ 4-line fix script completed');
}

/**
 * Handle image loading errors with CSP-compliant approach
 */
function initializeImageErrorHandling() {
  console.log('🖼️ Initializing image error handling');
  
  // Find all images that need error handling
  const thumbnailImages = document.querySelectorAll('img[data-fallback]');
  
  thumbnailImages.forEach(function(img) {
    img.addEventListener('error', function() {
      console.log('🚫 Image failed to load:', img.src);
      
      // Get fallback data
      const fallbackIcon = img.getAttribute('data-fallback-icon') || 'bi-file-earmark-text';
      const fallbackColor = img.getAttribute('data-fallback-color') || '#6c757d';
      
      // Hide the image
      img.style.display = 'none';
      
      // Create fallback icon
      const iconElement = document.createElement('i');
      iconElement.className = `${fallbackIcon} fs-1`;
      iconElement.style.color = fallbackColor;
      
      // Replace image with icon
      img.parentNode.appendChild(iconElement);
    });
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