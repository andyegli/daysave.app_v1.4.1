/**
 * File Management JavaScript
 * Handles file operations, modals, drag & drop, and AI analysis integration
 */

// Helper function to fix localhost SSL protocol issues
function getCorrectUrl(path) {
  if (window.location.hostname === 'localhost') {
    // If path is already a full URL, don't modify it
    if (path.startsWith('http://') || path.startsWith('https://')) {
      // Convert HTTPS to HTTP for localhost
      return path.replace('https://localhost', 'http://localhost');
    }
    // If it's a relative path, make it absolute HTTP
    if (path.startsWith('/')) {
      return `http://localhost:${window.location.port || 3000}${path}`;
    }
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
  
  // Refresh statistics on page load and periodically
  refreshStatistics();
  setInterval(refreshStatistics, 30000); // Refresh every 30 seconds
  
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
    
    // File detail action handlers (CSP-compliant)
    $(document).on('click', '[data-action="download-file"]', function(e) {
      e.preventDefault();
      downloadFileAction();
    });
    
    $(document).on('click', '[data-action="copy-url"]', function(e) {
      e.preventDefault();
      copyFileUrlAction();
    });
    
    $(document).on('click', '[data-action="edit-metadata"]', function(e) {
      e.preventDefault();
      editFileMetadataAction();
    });
    
    $(document).on('click', '[data-action="delete-file"]', function(e) {
      e.preventDefault();
      deleteFileConfirmAction();
    });
    
    // Handle edit form submission (CSP-compliant)
    $(document).on('submit', '#editForm', async function(e) {
      e.preventDefault();
      
      try {
        const formData = new FormData(e.target);
        const data = {
          comments: formData.get('comments'),
          tags: formData.get('tags')
        };
        
        const fileId = window.fileId;
        if (!fileId) {
          throw new Error('File ID not found');
        }
        
        const response = await fetch(`/files/${fileId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
          // Close modal and reload page
          bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
          // Refresh statistics before reload
          if (typeof refreshStatistics === 'function') {
            refreshStatistics().then(() => location.reload());
          } else {
            location.reload();
          }
        } else {
          throw new Error(result.message || 'Update failed');
        }
      } catch (error) {
        showAlert('Failed to update file: ' + error.message, 'error');
      }
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
  
  // Prevent duplicate uploads with a submission lock
let isFileManagementUploading = false;

/**
 * Initialize upload modal functionality
 */
function initializeUploadModal() {
  const uploadForm = $('#uploadForm');
  
  if (uploadForm.length) {
    uploadForm.on('submit', function(e) {
      e.preventDefault();
      
      // Prevent duplicate submissions
      if (isFileManagementUploading) {
        console.log('🚫 File management upload already in progress, ignoring duplicate submission');
        return;
      }
      
      isFileManagementUploading = true;
      
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
                // Refresh statistics before reload
                if (typeof refreshStatistics === 'function') {
                  refreshStatistics().then(() => {
                    // Fix for localhost HTTPS/HTTP protocol issues
                    if (window.location.hostname === 'localhost') {
                      window.location.href = `http://localhost:${window.location.port || 3000}${window.location.pathname}${window.location.search}`;
                    } else {
                      window.location.reload();
                    }
                  });
                } else {
                  // Fix for localhost HTTPS/HTTP protocol issues
                  if (window.location.hostname === 'localhost') {
                    window.location.href = `http://localhost:${window.location.port || 3000}${window.location.pathname}${window.location.search}`;
                  } else {
                    window.location.reload();
                  }
                }
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
            // Restore button and reset upload lock
            isFileManagementUploading = false; // Reset upload lock
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
  
  /**
   * File detail action functions (CSP-compliant)
   */
  function downloadFileAction() {
    const fileUrl = window.fileUrl;
    if (fileUrl) {
      const correctedUrl = getCorrectUrl(fileUrl);
      window.open(correctedUrl, '_blank');
    } else {
      showAlert('File URL not found', 'error');
    }
  }
  
  async function copyFileUrlAction() {
    const fileUrl = window.fileUrl || getCorrectUrl(`/files/${window.fileId}`);
    if (fileUrl) {
      try {
        await navigator.clipboard.writeText(fileUrl);
        showAlert('File URL copied to clipboard', 'success');
      } catch (error) {
        showAlert('Failed to copy URL to clipboard', 'error');
      }
    } else {
      showAlert('File URL not found', 'error');
    }
  }
  
  function editFileMetadataAction() {
    const editModal = new bootstrap.Modal(document.getElementById('editModal'));
    editModal.show();
  }
  
  function deleteFileConfirmAction() {
    const fileId = window.fileId || $('[data-file-id]').data('file-id');
    const filename = window.filename || $('[data-filename]').data('filename') || 'this file';
    
    if (fileId) {
      if (confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone.`)) {
        deleteFileAction(fileId);
      }
    } else {
      showAlert('File ID not found', 'error');
    }
  }
  
  /**
   * Delete file action - moved from inline script for CSP compliance
   */
  async function deleteFileAction(fileId) {
    try {
      const response = await fetch(`/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Redirect to files list with success message
        sessionStorage.setItem('deleteSuccess', 'File deleted successfully');
        const redirectUrl = getCorrectUrl('/files');
        window.location.href = redirectUrl;
      } else {
        throw new Error(result.message || 'Delete failed');
      }
    } catch (error) {
      showAlert('Failed to delete file: ' + error.message, 'error');
    }
  }
  
  /**
   * Show delete success message if redirected from delete
   */
  function checkDeleteSuccess() {
    const deleteSuccess = sessionStorage.getItem('deleteSuccess');
    if (deleteSuccess) {
      sessionStorage.removeItem('deleteSuccess');
      showAlert(deleteSuccess, 'success');
    }
  }
  
  // Check for delete success message on page load
  checkDeleteSuccess();

  // Export functions for global access if needed
  window.FileManager = {
    deleteFile,
    shareFile,
    showAlert,
    loadAIIndicators,
    downloadFileAction,
    copyFileUrlAction,
    editFileMetadataAction,
    deleteFileConfirmAction,
    refreshStatistics
  };
});

/**
 * Refresh file statistics dynamically
 */
async function refreshStatistics() {
  try {
    const response = await fetch('/files/api/stats', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      console.warn('Failed to refresh statistics:', response.status);
      return;
    }
    
    const stats = await response.json();
    
    // Update statistics display elements
    const totalFilesElement = document.querySelector('[class*="bg-primary"] h3');
    const totalSizeElement = document.querySelector('[class*="bg-success"] h3'); 
    const cloudFilesElement = document.querySelector('[class*="bg-info"] h3');
    const localFilesElement = document.querySelector('[class*="bg-warning"] h3');
    
    if (totalFilesElement) {
      totalFilesElement.textContent = stats.totalFiles || 0;
    }
    
    if (totalSizeElement) {
      const sizeMB = ((stats.totalSize || 0) / 1024 / 1024).toFixed(1);
      totalSizeElement.textContent = `${sizeMB} MB`;
    }
    
    if (cloudFilesElement) {
      cloudFilesElement.textContent = stats.cloudFiles || 0;
    }
    
    if (localFilesElement) {
      localFilesElement.textContent = stats.localFiles || 0;
    }
    
    console.log('📊 Statistics refreshed:', stats);
    
  } catch (error) {
    console.error('Error refreshing statistics:', error);
  }
} 