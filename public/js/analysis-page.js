/**
 * Analysis Page JavaScript
 * Handles functionality for the dedicated AI analysis results pages
 */

// Initialize when DOM is loaded (vanilla JS)
document.addEventListener('DOMContentLoaded', function() {
  console.log('Analysis Page JavaScript loaded');
  
  // Handle trigger analysis button clicks (CSP-compliant)
  document.addEventListener('click', function(e) {
    if (e.target.closest('[data-action="trigger-analysis"]')) {
      e.preventDefault();
      triggerAnalysis(e);
    }
  });
});

/**
 * Trigger analysis for content/file that hasn't been processed yet
 */
function triggerAnalysis(event) {
  // Get the current page URL to determine if this is content or file analysis
  const currentPath = window.location.pathname;
  const isFile = currentPath.includes('/files/');
  const id = currentPath.split('/')[2]; // Extract ID from URL path
  
  if (!id) {
    alert('Unable to determine content ID for analysis trigger.');
    return;
  }
  
  // Show loading state
  const button = event ? event.target.closest('button') : null;
  let originalText = '';
  
  if (button) {
    originalText = button.innerHTML;
    button.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Starting Analysis...';
    button.disabled = true;
  }
  
  // Determine the endpoint based on content type
  const endpoint = isFile ? `/files/${id}/reprocess` : `/content/${id}/reprocess`;
  
  // Trigger the actual reprocessing
  triggerReprocessing(endpoint, button, originalText);
}

/**
 * Trigger actual reprocessing via API
 */
async function triggerReprocessing(endpoint, button, originalText) {
  try {
    console.log('🔄 Triggering reprocessing:', endpoint);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      // Success - show success message and reload page to show updated analysis
      alert('✅ Reprocessing started successfully! The page will reload to show the updated analysis.');
      window.location.reload();
    } else {
      // Error from server
      const errorMsg = result.message || result.error || 'Unknown error occurred';
      alert('❌ Reprocessing failed: ' + errorMsg);
      console.error('Reprocessing error:', result);
    }
  } catch (error) {
    // Network or other error
    console.error('Reprocessing request failed:', error);
    alert('❌ Failed to start reprocessing: ' + error.message);
  } finally {
    // Restore button state
    if (button && originalText) {
      button.innerHTML = originalText;
      button.disabled = false;
    }
  }
}

/**
 * Copy text to clipboard with feedback
 */
function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    // Use modern clipboard API
    navigator.clipboard.writeText(text).then(() => {
      showCopyFeedback('Text copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      fallbackCopyToClipboard(text);
    });
  } else {
    // Fallback for older browsers or non-HTTPS
    fallbackCopyToClipboard(text);
  }
}

/**
 * Fallback copy method for older browsers
 */
function fallbackCopyToClipboard(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  try {
    document.execCommand('copy');
    showCopyFeedback('Text copied to clipboard!');
  } catch (err) {
    console.error('Fallback copy failed: ', err);
    showCopyFeedback('Copy failed. Please select and copy manually.');
  }
  
  document.body.removeChild(textArea);
}

/**
 * Show copy feedback message
 */
function showCopyFeedback(message) {
  // Create temporary feedback element
  const feedback = document.createElement('div');
  feedback.className = 'position-fixed top-0 start-50 translate-middle-x mt-3 alert alert-success alert-dismissible fade show';
  feedback.style.zIndex = '9999';
  feedback.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  document.body.appendChild(feedback);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    if (feedback.parentNode) {
      feedback.parentNode.removeChild(feedback);
    }
  }, 3000);
}

/**
 * Initialize page functionality when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
  // Auto-scroll to first content section if page loaded with hash
  if (window.location.hash) {
    const element = document.querySelector(window.location.hash);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }
  
  // Add copy buttons to long text sections
  addCopyButtons();
  
  // Initialize tooltips if Bootstrap is available
  if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl);
    });
  }
});

/**
 * Add copy buttons to text sections for better UX
 */
function addCopyButtons() {
  // Add copy button to transcription
  const transcriptionSection = document.querySelector('.transcription-text');
  if (transcriptionSection) {
    addCopyButtonToElement(transcriptionSection, 'Copy Transcription');
  }
  
  // Add copy button to summary
  const summarySection = document.querySelector('.summary-text');
  if (summarySection) {
    addCopyButtonToElement(summarySection, 'Copy Summary');
  }
}

/**
 * Add a copy button to a specific element
 */
function addCopyButtonToElement(element, buttonText) {
  const copyButton = document.createElement('button');
  copyButton.className = 'btn btn-sm btn-outline-primary position-absolute top-0 end-0 mt-2 me-2';
  copyButton.innerHTML = '<i class="bi bi-clipboard me-1"></i>' + buttonText;
  copyButton.title = buttonText;
  
  // Make parent container relative for absolute positioning
  const parentContainer = element.closest('.card-body') || element.parentElement;
  if (parentContainer) {
    parentContainer.style.position = 'relative';
    parentContainer.appendChild(copyButton);
    
    copyButton.addEventListener('click', function() {
      copyToClipboard(element.textContent);
    });
  }
}

/**
 * Handle thumbnail click events for larger view
 */
function viewThumbnail(thumbnailSrc, index) {
  // Create modal for larger thumbnail view
  const modal = document.createElement('div');
  modal.className = 'modal fade';
  modal.innerHTML = `
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Thumbnail ${index + 1}</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body text-center">
          <img src="${thumbnailSrc}" class="img-fluid" alt="Thumbnail ${index + 1}">
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    // Clean up modal when hidden
    modal.addEventListener('hidden.bs.modal', function() {
      document.body.removeChild(modal);
    });
  }
}

// Expose functions globally for use in templates
window.triggerAnalysis = triggerAnalysis;
window.copyToClipboard = copyToClipboard;
window.viewThumbnail = viewThumbnail; 