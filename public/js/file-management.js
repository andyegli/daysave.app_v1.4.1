/**
 * File Management JavaScript
 * Handles file operations, modals, drag & drop, and AI analysis integration
 */

// Helper function to fix localhost SSL protocol issues
function getCorrectUrl(path) {
  if (window.location.hostname === 'localhost') {
    return `http://localhost:${window.location.port || 3000}${path}`;
  }
  return path;
}

$(document).ready(function() {
  console.log('File Management JavaScript loaded');
  
  // Initialize components
  initializeFileOperations();
  initializeUploadModal();
  initializeFileModals();
  initializeAIAnalysisIntegration();
  
  /**
   * Initialize file operations (delete, share, etc.)
   */
  function initializeFileOperations() {
    // Delete file handler
    $(document).on('click', '.delete-file-btn', function(e) {
      e.preventDefault();
      const fileId = $(this).data('id') || $(this).data('file-id');
      const filename = $(this).data('filename');
      
      if (confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone.`)) {
        deleteFile(fileId);
      }
    });
    
    // Share file handler
    $(document).on('click', '.share-file-btn', function(e) {
      e.preventDefault();
      const fileId = $(this).data('id');
      shareFile(fileId);
    });
    
    // Copy summary handler
    $(document).on('click', '.copy-summary-btn', function(e) {
      e.preventDefault();
      const contentId = $(this).data('content-id');
      copySummaryToClipboard(contentId);
    });
    
    // Show full comment handler
    $(document).on('click', '.show-full-comment', function(e) {
      e.preventDefault();
      const fileId = $(this).data('id');
      showFullComment(fileId);
    });
  }
  
  /**
   * Initialize upload modal functionality
   */
  function initializeUploadModal() {
    const uploadForm = $('#uploadForm');
    
    if (uploadForm.length) {
      uploadForm.on('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const submitBtn = $(this).find('button[type="submit"]');
        const originalText = submitBtn.html();
        
        // Show loading state
        submitBtn.prop('disabled', true).html('<i class="bi bi-hourglass-split"></i> Uploading...');
        
        $.ajax({
          url: getCorrectUrl('/files/upload'),
          type: 'POST',
          data: formData,
          processData: false,
          contentType: false,
          success: function(response) {
            if (response.success) {
              // Show success message
              showAlert('success', `Successfully uploaded ${response.uploaded.length} file(s)`);
              
              // Close modal and refresh page
              $('#uploadModal').modal('hide');
              setTimeout(() => {
                window.location.reload();
              }, 1000);
            } else {
              showAlert('error', 'Upload failed: ' + (response.message || 'Unknown error'));
            }
          },
          error: function(xhr, status, error) {
            console.error('Upload error:', error);
            let errorMessage = 'Upload failed';
            
            if (xhr.responseJSON && xhr.responseJSON.message) {
              errorMessage = xhr.responseJSON.message;
            } else if (xhr.responseText) {
              try {
                const errorData = JSON.parse(xhr.responseText);
                errorMessage = errorData.message || errorMessage;
              } catch (e) {
                // Ignore JSON parse error
              }
            }
            
            showAlert('error', errorMessage);
          },
          complete: function() {
            // Restore button
            submitBtn.prop('disabled', false).html(originalText);
          }
        });
      });
    }
  }
  
  /**
   * Initialize file modals (view, edit, etc.)
   */
  function initializeFileModals() {
    // View file modal
    $(document).on('click', '[data-bs-target="#viewFileModal"]', function(e) {
      const fileId = $(this).data('id');
      if (fileId) {
        loadFileDetails(fileId);
      }
    });
  }
  
  /**
   * Initialize AI analysis integration
   */
  function initializeAIAnalysisIntegration() {
    // Load AI indicators for all files on page load
    $('.content-card[data-item-type="file"]').each(function() {
      const fileId = $(this).data('id');
      if (fileId) {
        loadAIIndicators(fileId);
      }
    });
  }
  
  /**
   * Delete a file
   */
  function deleteFile(fileId) {
    $.ajax({
      url: getCorrectUrl(`/files/${fileId}`),
      type: 'DELETE',
      success: function(response) {
        if (response.success) {
          showAlert('success', 'File deleted successfully');
          
          // Remove the file card from the page
          $(`.content-card[data-id="${fileId}"]`).fadeOut(300, function() {
            $(this).remove();
          });
        } else {
          showAlert('error', 'Failed to delete file: ' + (response.message || 'Unknown error'));
        }
      },
      error: function(xhr, status, error) {
        console.error('Delete error:', error);
        showAlert('error', 'Failed to delete file');
      }
    });
  }
  
  /**
   * Share a file
   */
  function shareFile(fileId) {
    // Create share URL with correct protocol
    const baseUrl = window.location.hostname === 'localhost' ? 
      `http://localhost:${window.location.port || 3000}` : 
      window.location.origin;
    const shareUrl = `${baseUrl}/files/${fileId}`;
    
    // Copy to clipboard
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(function() {
        showAlert('success', 'Share URL copied to clipboard');
      }).catch(function(err) {
        console.error('Failed to copy:', err);
        fallbackCopyToClipboard(shareUrl);
      });
    } else {
      fallbackCopyToClipboard(shareUrl);
    }
  }
  
  /**
   * Copy summary to clipboard
   */
  function copySummaryToClipboard(contentId) {
    const summaryElement = $(`#transcription-summary-${contentId} .text-content`);
    const summaryText = summaryElement.text().trim();
    
    if (summaryText) {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(summaryText).then(function() {
          showAlert('success', 'Summary copied to clipboard');
        }).catch(function(err) {
          console.error('Failed to copy:', err);
          fallbackCopyToClipboard(summaryText);
        });
      } else {
        fallbackCopyToClipboard(summaryText);
      }
    }
  }
  
  /**
   * Fallback copy to clipboard method
   */
  function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      showAlert('success', 'Copied to clipboard');
    } catch (err) {
      console.error('Fallback copy failed:', err);
      showAlert('error', 'Failed to copy to clipboard');
    }
    
    document.body.removeChild(textArea);
  }
  
  /**
   * Show full comment in a modal or expand inline
   */
  function showFullComment(fileId) {
    // For now, we'll just show an alert - can be enhanced later
    showAlert('info', 'Full comment view - feature to be implemented');
  }
  
  /**
   * Load file details for view modal
   */
  function loadFileDetails(fileId) {
    const modalBody = $('#viewFileModalBody');
    
    // Show loading
    modalBody.html(`
      <div class="d-flex justify-content-center">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
    `);
    
    $.ajax({
      url: getCorrectUrl(`/files/${fileId}`),
      type: 'GET',
      success: function(response) {
        // Since this is likely to return HTML, we'll show a simple message for now
        const viewUrl = window.location.hostname === 'localhost' ? 
          `http://localhost:${window.location.port || 3000}/files/${fileId}` : 
          `/files/${fileId}`;
        modalBody.html(`
          <p>File details loaded successfully.</p>
          <p><a href="${viewUrl}" target="_blank" class="btn btn-primary">
            <i class="bi bi-box-arrow-up-right"></i> View Full Details
          </a></p>
        `);
      },
      error: function(xhr, status, error) {
        console.error('Failed to load file details:', error);
        modalBody.html(`
          <div class="alert alert-danger">
            <i class="bi bi-exclamation-triangle"></i>
            Failed to load file details. Please try again.
          </div>
        `);
      }
    });
  }
  
  /**
   * Load AI indicators for a file
   */
  function loadAIIndicators(fileId) {
    const indicatorContainer = $(`#ai-indicators-${fileId}`);
    
    if (indicatorContainer.length === 0) return;
    
    // Check if file has analysis data by looking for existing summary
    const summaryContainer = $(`#transcription-summary-${fileId}`);
    const hasVisibleSummary = summaryContainer.is(':visible') && summaryContainer.find('.text-content').text().trim().length > 0;
    
    if (hasVisibleSummary) {
      // File has analysis data - show AI indicators
      indicatorContainer.html(`
        <span class="badge bg-success small" title="AI Analysis Available">
          <i class="bi bi-check-circle"></i>
        </span>
      `);
    } else {
      // Check if this is a multimedia file that should have analysis
      const fileCard = $(`.content-card[data-id="${fileId}"]`);
      const hasAIAnalysisBtn = fileCard.find('.ai-analysis-btn').length > 0;
      
      if (hasAIAnalysisBtn) {
        // This is a multimedia file - check analysis status
        checkAnalysisStatus(fileId, indicatorContainer);
      }
    }
  }
  
  /**
   * Check analysis status for a multimedia file
   */
  function checkAnalysisStatus(fileId, indicatorContainer) {
    $.ajax({
      url: getCorrectUrl(`/files/${fileId}/analysis`),
      type: 'GET',
      success: function(response) {
        if (response.success) {
          if (response.status === 'completed') {
            indicatorContainer.html(`
              <span class="badge bg-success small" title="AI Analysis Complete">
                <i class="bi bi-check-circle"></i>
              </span>
            `);
            
            // If analysis is complete but summary is not showing, update it
            updateSummaryDisplay(fileId, response);
          } else if (response.status === 'processing') {
            indicatorContainer.html(`
              <span class="badge bg-warning small" title="AI Analysis In Progress">
                <i class="bi bi-hourglass-split"></i>
              </span>
            `);
          } else if (response.status === 'not_analyzed') {
            indicatorContainer.html(`
              <span class="badge bg-secondary small" title="Not Analyzed">
                <i class="bi bi-dash-circle"></i>
              </span>
            `);
          }
        }
      },
      error: function(xhr, status, error) {
        // Don't show error indicators for failed checks
        console.log(`Analysis check failed for file ${fileId}:`, error);
      }
    });
  }
  
  /**
   * Update summary display if analysis data is available but not showing
   */
  function updateSummaryDisplay(fileId, analysisData) {
    const summaryContainer = $(`#transcription-summary-${fileId}`);
    
    if (summaryContainer.length && !summaryContainer.is(':visible')) {
      const analysisText = analysisData.analysis?.description || 
                           analysisData.analysis?.transcription || 
                           analysisData.analysis?.summary || '';
      
      if (analysisText.trim()) {
        summaryContainer.find('.text-content').text(analysisText);
        summaryContainer.show();
      }
    }
  }
  
  /**
   * Show alert message
   */
  function showAlert(type, message) {
    const alertTypes = {
      success: 'alert-success',
      error: 'alert-danger',
      warning: 'alert-warning',
      info: 'alert-info'
    };
    
    const alertClass = alertTypes[type] || 'alert-info';
    const iconMap = {
      success: 'bi-check-circle',
      error: 'bi-exclamation-triangle',
      warning: 'bi-exclamation-triangle',
      info: 'bi-info-circle'
    };
    const icon = iconMap[type] || 'bi-info-circle';
    
    const alertHtml = `
      <div class="alert ${alertClass} alert-dismissible fade show position-fixed" 
           style="top: 20px; right: 20px; z-index: 9999; min-width: 300px;" role="alert">
        <i class="${icon}"></i> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>
    `;
    
    $('body').append(alertHtml);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      $('.alert').fadeOut();
    }, 5000);
  }
  
  // Export functions for global access if needed
  window.FileManager = {
    deleteFile,
    shareFile,
    showAlert,
    loadAIIndicators
  };
}); 