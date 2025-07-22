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
  const searchInput = document.getElementById('filterSearch');
  const contentTypeSelect = document.getElementById('filterContentType');
  const statusSelect = document.getElementById('filterStatus');
  const sortSelect = document.getElementById('filterSort');
  const limitSelect = document.getElementById('filterLimit');
  
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
      const filterInputs = ['#filterTag', '#filterFrom', '#filterTo', '#filterSearch'];
      filterInputs.forEach(selector => {
        const input = document.querySelector(selector);
        if (input) {
          input.value = '';
          console.log('DEBUG: Cleared input:', selector);
        }
      });
      
      // Reset select dropdowns to default values
      const selectInputs = [
        { selector: '#filterContentType', value: 'all' },
        { selector: '#filterStatus', value: 'all' },
        { selector: '#filterSort', value: 'newest' },
        { selector: '#filterLimit', value: '10' }
      ];
      selectInputs.forEach(({ selector, value }) => {
        const select = document.querySelector(selector);
        if (select) {
          select.value = value;
          console.log('DEBUG: Reset select:', selector, 'to:', value);
        }
      });
      
      // Submit the form to refresh the page with no filters
      console.log('DEBUG: Submitting form after clearing all filters');
      document.getElementById('filterForm').submit();
    });
  } else {
    console.log('DEBUG: Clear All Filters button not found');
  }
  
  // ✨ ITEMS PER PAGE: Handle limit changes with user feedback
  if (limitSelect) {
    console.log('DEBUG: Setting up limit select functionality');
    
    limitSelect.addEventListener('change', function() {
      console.log('DEBUG: Items per page changed to:', this.value);
      
      // Show loading indicator
      const form = document.getElementById('filterForm');
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      
      // Provide user feedback
      submitBtn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Loading...';
      submitBtn.disabled = true;
      
      // Add CSS animation for loading
      submitBtn.style.transition = 'all 0.3s ease';
      
      // Reset to page 1 when changing items per page (users expect to see the first page)
      const pageInput = form.querySelector('input[name="page"]');
      if (pageInput) {
        pageInput.value = '1';
        console.log('DEBUG: Reset to page 1 due to limit change');
      }
      
      // Submit form after a brief delay for better UX
      setTimeout(() => {
        console.log('DEBUG: Submitting form with new limit');
        form.submit();
      }, 100);
    });
  } else {
    console.log('DEBUG: Limit select element not found');
  }
  
  // ✨ SORT BY: Handle sort changes with user feedback
  if (sortSelect) {
    console.log('DEBUG: Setting up sort select functionality');
    
    sortSelect.addEventListener('change', function() {
      console.log('DEBUG: Sort order changed to:', this.value);
      
      // Show loading indicator
      const form = document.getElementById('filterForm');
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      
      // Provide user feedback
      submitBtn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Sorting...';
      submitBtn.disabled = true;
      
      // Add CSS animation for loading
      submitBtn.style.transition = 'all 0.3s ease';
      
      // Reset to page 1 when changing sort order (users expect to see the first page)
      const pageInput = form.querySelector('input[name="page"]');
      if (pageInput) {
        pageInput.value = '1';
        console.log('DEBUG: Reset to page 1 due to sort change');
      }
      
      // Submit form after a brief delay for better UX
      setTimeout(() => {
        console.log('DEBUG: Submitting form with new sort order');
        form.submit();
      }, 100);
    });
  } else {
    console.log('DEBUG: Sort select element not found');
  }
  
  // Individual filter reset buttons (for specific filters)
  document.addEventListener('click', function(e) {
    const clearBtn = e.target.closest('.clear-filter-btn');
    if (!clearBtn) return;
    
    e.preventDefault();
    const targetSelector = clearBtn.getAttribute('data-target');
    const targetElement = document.querySelector(targetSelector);
    
    if (targetElement) {
      console.log('DEBUG: Clearing individual filter:', targetSelector);
      
      if (targetElement.tagName === 'SELECT') {
        // Handle select dropdowns with appropriate default values
        if (targetSelector === '#filterLimit') {
          targetElement.value = '10';
        } else if (targetSelector === '#filterSort') {
          targetElement.value = 'newest';
        } else if (targetSelector === '#filterContentType' || targetSelector === '#filterStatus') {
          targetElement.value = 'all';
        }
      } else {
        // Handle input fields
        targetElement.value = '';
      }
      
      // Auto-submit form for instant feedback
      targetElement.dispatchEvent(new Event('change'));
    }
  });
  
  console.log('DEBUG: Content filters setup complete');
}); 