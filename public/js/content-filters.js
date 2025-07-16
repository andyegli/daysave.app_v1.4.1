console.log('DEBUG: content-filters.js loaded successfully');
console.log('DEBUG: Script execution started');
console.log('DEBUG: Document ready state:', document.readyState);

document.addEventListener('DOMContentLoaded', function() {
  console.log('DEBUG: DOM Content Loaded event fired');
  
  // Test if JavaScript is running at all
  try {
    console.log('DEBUG: JavaScript execution test - SUCCESS');
    // Uncomment the line below to test if JavaScript is blocked by CSP
    // alert('JavaScript is running!');
  } catch (error) {
    console.error('DEBUG: JavaScript execution test - FAILED:', error);
  }
  
  // Test if Bootstrap is available
  try {
    if (typeof bootstrap !== 'undefined') {
      console.log('DEBUG: Bootstrap is available:', bootstrap);
      console.log('DEBUG: Bootstrap version:', bootstrap.VERSION);
    } else {
      console.log('DEBUG: Bootstrap is NOT available');
    }
  } catch (error) {
    console.error('DEBUG: Bootstrap test failed:', error);
  }
  
  // Test if jQuery is available
  try {
    if (typeof $ !== 'undefined') {
      console.log('DEBUG: jQuery is available:', $.fn.jquery);
    } else {
      console.log('DEBUG: jQuery is NOT available');
    }
  } catch (error) {
    console.error('DEBUG: jQuery test failed:', error);
  }
  
  // Get filter elements
  const tagInput = document.getElementById('filterTag');
  const fromDate = document.getElementById('filterFrom');
  const toDate = document.getElementById('filterTo');
  
  console.log('DEBUG: Tag input element:', tagInput);
  console.log('DEBUG: From date element:', fromDate);
  console.log('DEBUG: To date element:', toDate);
  
  // Individual clear filter buttons
  const clearButtons = document.querySelectorAll('.clear-filter-btn');
  console.log('DEBUG: Found clear buttons:', clearButtons.length);
  clearButtons.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const targetSelector = btn.getAttribute('data-target');
      console.log('DEBUG: Clear button clicked for target:', targetSelector);
      
      const target = document.querySelector(targetSelector);
      if (target) {
        console.log('DEBUG: Found target element:', target.tagName, target.id);
        
        // Clear the input value
        target.value = '';
        console.log('DEBUG: Cleared target value to:', target.value);
        
        // Submit the form immediately
        console.log('DEBUG: Submitting form after clear');
        document.getElementById('filterForm').submit();
      } else {
        console.log('DEBUG: Target element not found:', targetSelector);
      }
    });
  });
  
  // Auto-submit on change for date pickers
  ['#filterFrom', '#filterTo'].forEach(sel => {
    const el = document.querySelector(sel);
    if (el) {
      el.addEventListener('change', function() {
        console.log('DEBUG: Date filter changed, submitting form');
        document.getElementById('filterForm').submit();
      });
    }
  });
  
  // Check if form exists
  const filterForm = document.getElementById('filterForm');
  console.log('DEBUG: Filter form element:', filterForm);
  
  // Tag input: submit on Enter
  if (tagInput) {
    tagInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        console.log('DEBUG: Tag filter Enter pressed, submitting form');
        document.getElementById('filterForm').submit();
      }
    });
  }
  
  // Clear All Filters button
  const clearAllBtn = document.getElementById('clearAllFilters');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', function(e) {
      e.preventDefault();
      console.log('DEBUG: Clear All Filters button clicked');
      
      // Clear all filter inputs
      const filterInputs = ['#filterTag', '#filterFrom', '#filterTo'];
      filterInputs.forEach(selector => {
        const input = document.querySelector(selector);
        if (input) {
          input.value = '';
          console.log('DEBUG: Cleared input:', selector);
        }
      });
      
      // Submit the form to refresh the page with no filters
      console.log('DEBUG: Submitting form after clearing all filters');
      document.getElementById('filterForm').submit();
    });
  } else {
    console.log('DEBUG: Clear All Filters button not found');
  }
  
  console.log('DEBUG: Content filters setup complete');
}); 