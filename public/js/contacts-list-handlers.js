/**
 * Contacts List Page Handlers
 * Debug and event handlers for the contacts list page
 */

document.addEventListener('DOMContentLoaded', function() {
  console.log('Contacts list handlers initializing...');
  
  // Debug Groups & Relations button click
  const groupsBtn = document.getElementById('groupsRelationsBtn');
  if (groupsBtn) {
    groupsBtn.addEventListener('click', function(e) {
      console.log('🔍 Groups & Relations button clicked!');
      console.log('🔗 Navigating to:', this.href);
      // Let the default navigation happen
    });
  }
  
  console.log('Contacts list handlers initialized successfully');
});