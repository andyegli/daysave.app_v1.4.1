/**
 * Groups & Relationships Tab Management
 * Handles tab switching and initialization of appropriate data
 */

document.addEventListener('DOMContentLoaded', function() {
  console.log('Groups & Relationships tabs initializing...');
  
  const tabs = document.querySelectorAll('[data-bs-toggle="tab"]');
  
  tabs.forEach(tab => {
    tab.addEventListener('shown.bs.tab', function(event) {
      const targetTab = event.target.getAttribute('data-bs-target');
      
      if (targetTab === '#relationships' && typeof initializeContactRelationships === 'function') {
        // Reload relationships when switching to relationships tab
        console.log('Initializing contact relationships...');
        initializeContactRelationships();
      } else if (targetTab === '#groups' && typeof initializeContactGroups === 'function') {
        // Reload groups when switching to groups tab
        console.log('Initializing contact groups...');
        initializeContactGroups();
      }
    });
  });
  
  console.log('Groups & Relationships tabs initialized successfully');
});