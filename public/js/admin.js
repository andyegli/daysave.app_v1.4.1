// Admin JavaScript functionality
document.addEventListener('DOMContentLoaded', function() {
  console.log('DEBUG: Admin JavaScript loaded');
  
  // Handle delete user confirmations
  const deleteButtons = document.querySelectorAll('.delete-user-btn');
  deleteButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      
      const username = this.getAttribute('data-username');
      const confirmed = confirm(`Delete user "${username}"?`);
      
      if (confirmed) {
        // Submit the form
        this.closest('form').submit();
      }
    });
  });
  
  console.log('DEBUG: Admin event listeners set up');
}); 