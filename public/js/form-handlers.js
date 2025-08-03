/**
 * Form Event Handlers
 * Handles form submissions and select changes for CSP compliance
 */

document.addEventListener('DOMContentLoaded', function() {
  console.log('📝 Form handlers loaded');
  
  // Handle form auto-submission for sort and limit selects
  const autoSubmitSelects = document.querySelectorAll('#filterSort, #filterLimit');
  autoSubmitSelects.forEach(function(select) {
    select.addEventListener('change', function() {
      console.log('📊 Auto-submitting form for:', this.id);
      this.form.submit();
    });
  });
  
  console.log('✅ Form handlers initialized');
});