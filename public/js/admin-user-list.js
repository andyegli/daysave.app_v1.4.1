// Admin User List JavaScript - CSP Compliant
// Handles user search, filtering, and actions

document.addEventListener('DOMContentLoaded', function() {
  // Auto-submit search form on Enter
  const searchInput = document.getElementById('search');
  if (searchInput) {
    searchInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('searchForm').submit();
      }
    });
  }
  
  // Auto-submit on limit change
  const limitSelect = document.getElementById('limit');
  if (limitSelect) {
    limitSelect.addEventListener('change', function() {
      document.getElementById('searchForm').submit();
    });
  }
  
  // Real-time search (debounced)
  let searchTimeout;
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        if (this.value.length >= 3 || this.value.length === 0) {
          document.getElementById('searchForm').submit();
        }
      }, 500);
    });
  }
  
  // Handle delete confirmations
  const deleteButtons = document.querySelectorAll('.delete-user-btn');
  deleteButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      
      const username = this.getAttribute('data-username');
      
      // Modern confirmation dialog
      if (confirm(`Are you sure you want to delete user "${username}"?\n\nThis action cannot be undone.`)) {
        showLoading();
        this.closest('form').submit();
      }
    });
  });
  
  // Handle export button
  const exportBtn = document.getElementById('export-users-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportUsers);
  }
  
  // Handle select all checkbox
  const selectAllBtn = document.getElementById('selectAll');
  if (selectAllBtn) {
    selectAllBtn.addEventListener('change', toggleSelectAll);
  }
  
  // Handle action buttons with confirmation
  setupActionButtons();
  
  // Show loading on form submit
  const searchForm = document.getElementById('searchForm');
  if (searchForm) {
    searchForm.addEventListener('submit', showLoading);
  }
  
  // Hide loading on page load
  window.addEventListener('load', hideLoading);
});

// Select all functionality
function toggleSelectAll() {
  const selectAll = document.getElementById('selectAll');
  const checkboxes = document.querySelectorAll('.user-checkbox');
  
  checkboxes.forEach(checkbox => {
    checkbox.checked = selectAll.checked;
  });
}

// Export functionality
function exportUsers() {
  const searchParams = new URLSearchParams(window.location.search);
  const exportUrl = `/admin/users/export?${searchParams.toString()}`;
  
  showLoading();
  window.location.href = exportUrl;
  
  setTimeout(() => {
    hideLoading();
  }, 2000);
}

// Setup action buttons with confirmation
function setupActionButtons() {
  // Enable/Disable user buttons
  const toggleButtons = document.querySelectorAll('[data-action="toggle-user"]');
  toggleButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      const action = this.textContent.trim().includes('Enable') ? 'enable' : 'disable';
      const username = this.getAttribute('data-username');
      
      if (confirm(`Are you sure you want to ${action} user ${username}?`)) {
        this.closest('form').submit();
      }
    });
  });
  
  // Reset password buttons
  const resetButtons = document.querySelectorAll('[data-action="reset-password"]');
  resetButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      const username = this.getAttribute('data-username');
      
      if (confirm(`Are you sure you want to reset the password for ${username}?`)) {
        this.closest('form').submit();
      }
    });
  });
  
  // Verify email buttons
  const verifyButtons = document.querySelectorAll('[data-action="verify-email"]');
  verifyButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      const username = this.getAttribute('data-username');
      
      if (confirm(`Are you sure you want to verify the email for ${username}?`)) {
        this.closest('form').submit();
      }
    });
  });
}

// Loading overlay functions
function showLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.classList.add('active');
  }
}

function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.classList.remove('active');
  }
}

// Make functions globally available for any remaining inline calls
window.toggleSelectAll = toggleSelectAll;
window.exportUsers = exportUsers; 