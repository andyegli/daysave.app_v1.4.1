/**
 * Debug script to understand form submission behavior
 * Add this to content page to debug the issue
 */

console.log('🔍 Debug Form Submission Script Loaded');

document.addEventListener('DOMContentLoaded', function() {
  console.log('🔍 DOM Content Loaded - Setting up debug listeners');
  
  const form = document.getElementById('addContentForm');
  if (!form) {
    console.error('❌ addContentForm not found!');
    return;
  }
  
  console.log('✅ Found addContentForm:', form);
  
  // Check what event listeners are attached
  const listeners = getEventListeners ? getEventListeners(form) : 'getEventListeners not available';
  console.log('📋 Current event listeners on form:', listeners);
  
  // Add our own listener with highest priority
  form.addEventListener('submit', function(e) {
    console.log('🚨 FORM SUBMIT INTERCEPTED BY DEBUG SCRIPT');
    console.log('Event details:', {
      defaultPrevented: e.defaultPrevented,
      target: e.target.id,
      type: e.type,
      bubbles: e.bubbles,
      cancelable: e.cancelable
    });
    
    // Check form content
    const formData = new FormData(form);
    console.log('📝 Form data:');
    for (let [key, value] of formData.entries()) {
      console.log(`  ${key}: ${value}`);
    }
    
    // Check which toggle is selected
    const singleUrl = document.getElementById('singleUrlToggle');
    const bulkUrl = document.getElementById('bulkUrlToggle');
    const fileToggle = document.getElementById('fileToggle');
    
    console.log('📊 Toggle states:', {
      singleUrl: singleUrl?.checked,
      bulkUrl: bulkUrl?.checked,
      fileToggle: fileToggle?.checked
    });
    
    // Prevent the form submission for debugging
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    console.log('🛑 Form submission prevented by debug script');
    
    // Try to manually call the content management submission
    console.log('🔄 Attempting manual JSON submission...');
    
    const url = document.getElementById('contentUrl')?.value;
    const comments = document.getElementById('contentComment')?.value;
    const tags = document.getElementById('contentTags')?.value;
    
    if (url) {
      console.log('📤 Sending JSON request manually...');
      fetch('/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          url: url,
          user_comments: comments || '',
          user_tags: tags ? tags.split(',').map(t => t.trim()) : []
        })
      })
      .then(response => {
        console.log('📥 Manual submission response:', response.status);
        return response.json();
      })
      .then(data => {
        console.log('✅ Manual submission result:', data);
        if (data.success) {
          alert('SUCCESS: Content submitted manually via JSON!');
          location.reload();
        } else {
          alert('ERROR: ' + (data.error || 'Unknown error'));
        }
      })
      .catch(error => {
        console.error('❌ Manual submission failed:', error);
        alert('FETCH ERROR: ' + error.message);
      });
    } else {
      console.error('❌ No URL found in form');
    }
    
    return false;
  }, true); // Use capture phase to get priority
  
  console.log('✅ Debug submit listener attached');
});

// Also listen to window load
window.addEventListener('load', function() {
  console.log('🔍 Window loaded - checking script load order');
  
  // Check what scripts are loaded
  const scripts = Array.from(document.querySelectorAll('script[src]'));
  console.log('📜 Loaded scripts:');
  scripts.forEach((script, index) => {
    console.log(`  ${index + 1}. ${script.src}`);
  });
});
