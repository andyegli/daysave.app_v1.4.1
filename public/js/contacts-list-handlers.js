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
    const computedStyle = window.getComputedStyle(groupsBtn);
    console.log('🔍 Button accessibility check:', {
      hasClickHandler: typeof groupsBtn.onclick === 'function',
      hasEventListeners: groupsBtn.hasAttribute('onclick'),
      isVisible: groupsBtn.offsetParent !== null,
      computedDisplay: computedStyle.display,
      pointerEvents: computedStyle.pointerEvents,
      zIndex: computedStyle.zIndex,
      position: computedStyle.position
    });
    
    // Add multiple event listeners for debugging
    ['click', 'mousedown', 'mouseup', 'touchstart', 'touchend'].forEach(eventType => {
      groupsBtn.addEventListener(eventType, function(e) {
        console.log(`🎯 ${eventType.toUpperCase()} event fired on Groups & Relations button!`);
        if (eventType === 'click') {
          console.log('🔥 CLICK EVENT DETAILS:', {
            type: e.type,
            target: e.target.tagName,
            currentTarget: e.currentTarget.tagName,
            bubbles: e.bubbles,
            cancelable: e.cancelable,
            defaultPrevented: e.defaultPrevented,
            eventPhase: e.eventPhase,
            isTrusted: e.isTrusted,
            timeStamp: e.timeStamp
          });
        }
      }, true); // Use capture phase
    });
    
    // Test click programmatically - DISABLED to prevent loops
    // setTimeout(() => {
    //   console.log('🧪 Testing programmatic click...');
    //   try {
    //     groupsBtn.click();
    //     console.log('✅ Programmatic click executed');
    //   } catch (error) {
    //     console.error('❌ Programmatic click failed:', error);
    //   }
    // }, 2000);
    
    // Simplified emergency navigation workaround
    console.log('✅ SIMPLE FIX: Installing direct navigation handler');
    
    // Store original href
    const originalHref = groupsBtn.href;
    
    // Simple click handler that forces navigation
    groupsBtn.addEventListener('click', function(e) {
      console.log('🎯 CLICK DETECTED: Groups & Relations button clicked!');
      e.preventDefault();
      e.stopPropagation();
      
      console.log('🚀 NAVIGATING: Going to groups-relationships page...');
      setTimeout(() => {
        window.location.href = originalHref;
      }, 100); // Small delay to prevent loops
      
      return false;
    }, { capture: true });
    
    console.log('✅ SIMPLE FIX: Navigation handler installed for:', originalHref);
    
    // Check for overlapping elements
    setTimeout(() => {
      const rect = groupsBtn.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const elementAtCenter = document.elementFromPoint(centerX, centerY);
      
      console.log('🎯 Element detection at button center:', {
        expectedButton: groupsBtn === elementAtCenter,
        actualElement: elementAtCenter?.tagName,
        actualElementId: elementAtCenter?.id,
        actualElementClass: elementAtCenter?.className,
        isChildOfButton: groupsBtn.contains(elementAtCenter),
        buttonRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        centerPoint: { x: centerX, y: centerY }
      });
    }, 500);
  } else {
    console.error('❌ Groups & Relations button not found on page');
  }
  
  console.log('Contacts list handlers initialized successfully');
});