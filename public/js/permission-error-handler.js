/**
 * Permission Error Handler
 * 
 * Handles permission-related errors gracefully with user-friendly messages
 * and proper navigation back to safe areas
 */

class PermissionErrorHandler {
  constructor() {
    this.init();
  }

  init() {
    // Handle AJAX permission errors globally
    this.setupAjaxErrorHandler();
    
    // Handle form submission errors
    this.setupFormErrorHandler();
    
    // Setup back navigation
    this.setupBackNavigation();
  }

  /**
   * Setup global AJAX error handling for permission issues
   */
  setupAjaxErrorHandler() {
    // jQuery AJAX error handler (if jQuery is available)
    if (typeof $ !== 'undefined') {
      $(document).ajaxError((event, xhr, settings, thrownError) => {
        if (xhr.status === 403) {
          this.handlePermissionError(xhr.responseJSON || { error: 'Access denied' });
        }
      });
    }

    // Fetch API error handler (modern approach)
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        if (response.status === 403) {
          const errorData = await response.json().catch(() => ({ error: 'Access denied' }));
          this.handlePermissionError(errorData);
          throw new Error('Permission denied');
        }
        
        return response;
      } catch (error) {
        throw error;
      }
    };
  }

  /**
   * Setup form error handling
   */
  setupFormErrorHandler() {
    document.addEventListener('submit', async (event) => {
      const form = event.target;
      if (!form.matches('form[data-permission-check]')) return;

      event.preventDefault();
      
      try {
        const formData = new FormData(form);
        const response = await fetch(form.action, {
          method: form.method || 'POST',
          body: formData
        });

        if (response.status === 403) {
          const errorData = await response.json().catch(() => ({ error: 'Access denied' }));
          this.handlePermissionError(errorData);
          return;
        }

        // If successful, submit the form normally
        form.submit();
        
      } catch (error) {
        console.error('Form submission error:', error);
      }
    });
  }

  /**
   * Handle permission errors with user-friendly messages
   */
  handlePermissionError(errorData) {
    const { error, required, missing, current } = errorData;
    
    let title = 'Access Denied';
    let message = 'You do not have permission to perform this action.';
    let details = '';

    // Customize message based on error type
    if (missing && missing.length > 0) {
      message = 'You need additional permissions to perform this action.';
      details = `Required permissions: ${missing.join(', ')}`;
    } else if (required && required.length > 0) {
      message = 'This action requires specific permissions.';
      details = `Required permissions: ${required.join(', ')}`;
    } else if (current) {
      message = `Your current subscription (${current}) does not include this feature.`;
      details = 'Please upgrade your subscription to access this functionality.';
    }

    // Show the error modal
    this.showPermissionModal(title, message, details);
  }

  /**
   * Show permission error modal
   */
  showPermissionModal(title, message, details) {
    // Remove existing modal if present
    const existingModal = document.getElementById('permissionErrorModal');
    if (existingModal) {
      existingModal.remove();
    }

    // Create modal HTML
    const modalHtml = `
      <div class="modal fade" id="permissionErrorModal" tabindex="-1" aria-labelledby="permissionErrorModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header bg-danger text-white">
              <h5 class="modal-title" id="permissionErrorModalLabel">
                <i class="fas fa-shield-alt me-2"></i>${title}
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div class="d-flex align-items-start">
                <div class="flex-shrink-0">
                  <i class="fas fa-exclamation-triangle text-warning fa-2x"></i>
                </div>
                <div class="flex-grow-1 ms-3">
                  <p class="mb-2"><strong>${message}</strong></p>
                  ${details ? `<p class="text-muted small mb-0">${details}</p>` : ''}
                </div>
              </div>
              
              <div class="mt-3 p-3 bg-light rounded">
                <h6 class="mb-2"><i class="fas fa-info-circle text-info me-1"></i>What can you do?</h6>
                <ul class="mb-0 small">
                  <li>Contact your administrator to request additional permissions</li>
                  <li>Check if you're logged in with the correct account</li>
                  <li>Return to the dashboard to access features available to your role</li>
                </ul>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" onclick="window.history.back()">
                <i class="fas fa-arrow-left me-1"></i>Go Back
              </button>
              <button type="button" class="btn btn-primary" onclick="window.location.href='/dashboard'">
                <i class="fas fa-home me-1"></i>Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Show modal (Bootstrap 5)
    const modal = new bootstrap.Modal(document.getElementById('permissionErrorModal'));
    modal.show();

    // Auto-hide after 10 seconds
    setTimeout(() => {
      modal.hide();
    }, 10000);
  }

  /**
   * Setup back navigation helpers
   */
  setupBackNavigation() {
    // Add click handlers for back buttons
    document.addEventListener('click', (event) => {
      if (event.target.matches('[data-action="go-back"]')) {
        event.preventDefault();
        this.goBack();
      }
    });
  }

  /**
   * Smart back navigation
   */
  goBack() {
    // If there's history, go back
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Otherwise, go to dashboard
      window.location.href = '/dashboard';
    }
  }

  /**
   * Show a simple toast notification for minor permission issues
   */
  showPermissionToast(message, type = 'warning') {
    // Remove existing toast
    const existingToast = document.getElementById('permissionToast');
    if (existingToast) {
      existingToast.remove();
    }

    const toastHtml = `
      <div class="toast-container position-fixed top-0 end-0 p-3">
        <div id="permissionToast" class="toast align-items-center text-white bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
          <div class="d-flex">
            <div class="toast-body">
              <i class="fas fa-shield-alt me-2"></i>${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', toastHtml);

    const toast = new bootstrap.Toast(document.getElementById('permissionToast'));
    toast.show();
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.permissionErrorHandler = new PermissionErrorHandler();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PermissionErrorHandler;
}
