/**
 * Content Reprocessing Functionality
 * Handles reprocessing of content items for AI analysis
 */

// Handle reprocess button clicks
document.addEventListener('DOMContentLoaded', function() {
  console.log('🔄 Content reprocess functionality loaded');
  
  // Reprocess content functionality
  document.querySelectorAll('.reprocess-content-btn').forEach(function(button) {
    button.addEventListener('click', function() {
      const contentId = this.getAttribute('data-id');
      const itemType = this.getAttribute('data-item-type');
      
      // Confirm reprocessing
      if (!confirm('Are you sure you want to reprocess this item? This will re-run the AI analysis pipeline.')) {
        return;
      }
      
      // Disable button and show loading state
      const originalHtml = this.innerHTML;
      this.disabled = true;
      this.innerHTML = '<i class="bi bi-arrow-clockwise spin" style="font-size: 0.8rem;"></i>';
      
      // Make API request
      const endpoint = itemType === 'file' ? `/files/${contentId}/reprocess` : `/content/${contentId}/reprocess`;
      
      fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // Show success message (fallback if SweetAlert not available)
          if (typeof Swal !== 'undefined') {
            const Toast = Swal.mixin({
              toast: true,
              position: 'top-end',
              showConfirmButton: false,
              timer: 3000,
              timerProgressBar: true
            });
            
            Toast.fire({
              icon: 'success',
              title: 'Reprocessing started! Analysis will update shortly.'
            });
          } else {
            alert('Reprocessing started! Analysis will update shortly.');
          }
          
          // Update status button to show processing
          const statusBtn = document.getElementById(`status-btn-${contentId}`);
          if (statusBtn) {
            statusBtn.innerHTML = '<span class="status-text">Processing...</span><div class="progress-fill"></div>';
            statusBtn.className = 'btn btn-sm w-100 analysis-status-btn btn-warning';
          }
        } else {
          throw new Error(data.message || 'Reprocessing failed');
        }
      })
      .catch(error => {
        console.error('Reprocess error:', error);
        alert('Error starting reprocessing: ' + error.message);
      })
      .finally(() => {
        // Restore button state
        this.disabled = false;
        this.innerHTML = originalHtml;
      });
    });
  });
});

// Add spinning animation for loading state
document.addEventListener('DOMContentLoaded', function() {
  if (!document.getElementById('spin-animation-style')) {
    const style = document.createElement('style');
    style.id = 'spin-animation-style';
    style.textContent = `
      .spin {
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
});