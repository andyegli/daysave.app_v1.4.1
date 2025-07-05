document.addEventListener('DOMContentLoaded', function() {
  console.log('DEBUG: Content management page loaded');
  
  // Individual clear filter buttons
  document.querySelectorAll('.clear-filter-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const targetSelector = btn.getAttribute('data-target');
      console.log('DEBUG: Clear button clicked for target:', targetSelector);
      
                const target = document.querySelector(targetSelector);
          if (target) {
            console.log('DEBUG: Found target element:', target.tagName, target.id);
            
            // Clear the input value
            if (target.tagName === 'SELECT' && target.multiple) {
              // Clear multi-select by deselecting all options
              Array.from(target.options).forEach(opt => opt.selected = false);
              console.log('DEBUG: Cleared multi-select options');
            } else {
              // Clear regular input
              target.value = '';
              console.log('DEBUG: Cleared target value to:', target.value);
            }
            
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
  
  // Auto-submit on change for category and source filters
  ['#categoryFilter', '#sourceFilter'].forEach(sel => {
    const el = document.querySelector(sel);
    if (el) {
      el.addEventListener('change', function() {
        console.log('DEBUG: Multi-select filter changed, submitting form');
        document.getElementById('filterForm').submit();
      });
    }
  });
  
  // Tag input: submit on Enter
  const tagInput = document.getElementById('filterTag');
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
      const filterInputs = ['#filterTag', '#filterFrom', '#filterTo', '#categoryFilter', '#sourceFilter'];
      filterInputs.forEach(selector => {
        const input = document.querySelector(selector);
        if (input) {
          if (input.tagName === 'SELECT' && input.multiple) {
            // Clear multi-select by deselecting all options
            Array.from(input.options).forEach(opt => opt.selected = false);
          } else {
            // Clear regular input
            input.value = '';
          }
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
}); 