/**
 * Contacts List Page Handlers
 * Debug and event handlers for the contacts list page
 */

document.addEventListener('DOMContentLoaded', function() {
  console.log('Contacts list handlers initializing...');
  
  // Enhanced Groups & Relations button click handler
  const groupsBtn = document.getElementById('groupsRelationsBtn');
  if (groupsBtn) {
    console.log('✅ Found Groups & Relations button, adding enhanced click handler');
    
    // Test if the button is visible and clickable
    setTimeout(() => {
      const buttonRect = groupsBtn.getBoundingClientRect();
      console.log('📐 Button position:', {
        visible: buttonRect.width > 0 && buttonRect.height > 0,
        top: buttonRect.top,
        left: buttonRect.left,
        width: buttonRect.width,
        height: buttonRect.height
      });
    }, 100);
    
    groupsBtn.addEventListener('click', function(e) {
      console.log('🔍 Groups & Relations button clicked!');
      console.log('🔗 Target URL:', this.href);
      console.log('🔗 Current URL:', window.location.href);
      console.log('📱 Event details:', {
        type: e.type,
        bubbles: e.bubbles,
        cancelable: e.cancelable,
        defaultPrevented: e.defaultPrevented
      });
      
      // Prevent any potential event bubbling issues
      e.stopPropagation();
      e.preventDefault();
      
      // Multiple navigation approaches for maximum compatibility
      const targetUrl = this.href || '/contacts/groups-relationships';
      
      console.log('🚀 Attempting navigation to:', targetUrl);
      
      // Method 1: Direct location change
      try {
        window.location.href = targetUrl;
        console.log('✅ Method 1: Direct navigation attempted');
        return false;
      } catch (error) {
        console.error('❌ Method 1 failed:', error);
      }
      
      // Method 2: Location assign (if method 1 failed)
      try {
        window.location.assign(targetUrl);
        console.log('✅ Method 2: Location assign attempted');
        return false;
      } catch (error) {
        console.error('❌ Method 2 failed:', error);
      }
      
      // Method 3: Window open in same window (last resort)
      try {
        window.open(targetUrl, '_self');
        console.log('✅ Method 3: Window open attempted');
        return false;
      } catch (error) {
        console.error('❌ Method 3 failed:', error);
      }
      
      console.error('❌ All navigation methods failed!');
      return false;
    });
    
    // Debug: Log button attributes
    console.log('📋 Button attributes:', {
      id: groupsBtn.id,
      href: groupsBtn.href,
      className: groupsBtn.className,
      innerHTML: groupsBtn.innerHTML,
      tagName: groupsBtn.tagName,
      disabled: groupsBtn.disabled
    });
    
    // Test button accessibility
    console.log('🔍 Button accessibility check:', {
      hasClickHandler: typeof groupsBtn.onclick === 'function',
      hasEventListeners: groupsBtn.hasAttribute('onclick'),
      isVisible: groupsBtn.offsetParent !== null,
      computedDisplay: window.getComputedStyle(groupsBtn).display
    });
  } else {
    console.error('❌ Groups & Relations button not found on page');
  }
  
  console.log('Contacts list handlers initialized successfully');
});