/**
 * Contacts List Page Handlers
 * Debug and event handlers for the contacts list page
 */

document.addEventListener('DOMContentLoaded', function() {
  console.log('Contacts list handlers initializing...');
  
  // Simple Groups & Relations button handler - Let browser handle navigation naturally
  const groupsBtn = document.getElementById('groupsRelationsBtn');
  if (groupsBtn) {
    console.log('✅ Found Groups & Relations button');
    console.log('🔗 Button URL:', groupsBtn.href);
    console.log('🚀 IMPORTANT: Letting browser handle navigation naturally (no JavaScript override)');
    console.log('🎯 Try clicking the button now - it should work with normal browser navigation');
  } else {
    console.error('❌ Groups & Relations button not found on page');
  }
  
  console.log('Contacts list handlers initialized successfully');
});