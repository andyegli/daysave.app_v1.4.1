// Content Management JavaScript
// This file handles all content management functionality

// Show subscription error with upgrade options
function showSubscriptionError(errorData) {
  const alert = document.getElementById('addContentAlert');
  alert.className = 'alert alert-warning mt-2';
  
  const upgradeUrl = errorData.upgradeUrl || '/subscription/plans';
  const supportUrl = errorData.supportUrl || '/subscription/manage';
  
  alert.innerHTML = `
    <div class="d-flex align-items-start">
      <i class="fas fa-crown me-3 mt-1" style="color: #ffd700; font-size: 1.2em;"></i>
      <div class="flex-grow-1">
        <h6 class="alert-heading mb-2">${errorData.error || 'Subscription Limit Reached'}</h6>
        <p class="mb-2">${errorData.message}</p>
        ${errorData.upgradeMessage ? `<p class="mb-3 text-muted small">${errorData.upgradeMessage}</p>` : ''}
        <div class="d-flex gap-2">
          <a href="${upgradeUrl}" class="btn btn-primary btn-sm">
            <i class="fas fa-arrow-up me-1"></i> Upgrade Now
          </a>
          ${supportUrl ? `<a href="${supportUrl}" class="btn btn-outline-secondary btn-sm">
            <i class="fas fa-cog me-1"></i> Manage Subscription
          </a>` : ''}
        </div>
      </div>
    </div>
  `;
  
  alert.classList.remove('d-none');
}

// Handle Add Content Form Submission
document.addEventListener('DOMContentLoaded', function() {
  // Initialize content type toggle functionality
  initializeContentTypeToggle();
  
  const form = document.getElementById('addContentForm');
  if (form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      // Check which content type is selected
      const isFileUpload = document.getElementById('fileContentType').checked;
      
      if (isFileUpload) {
        await handleFileUpload(form);
      } else {
        await handleUrlContent(form);
      }
    });
  }
});

// Initialize content type toggle functionality
function initializeContentTypeToggle() {
  const urlToggle = document.getElementById('urlContentType');
  const fileToggle = document.getElementById('fileContentType');
  const urlSection = document.getElementById('urlContentSection');
  const fileSection = document.getElementById('fileContentSection');
  const urlBtnText = document.getElementById('urlBtnText');
  const fileBtnText = document.getElementById('fileBtnText');
  const urlInput = document.getElementById('contentUrl');
  const fileInput = document.getElementById('contentFiles');
  
  // Toggle between URL and File upload modes
  function toggleContentType() {
    if (fileToggle.checked) {
      // Switch to file upload mode
      urlSection.style.display = 'none';
      fileSection.style.display = 'block';
      urlBtnText.style.display = 'none';
      fileBtnText.style.display = 'inline';
      
      // Remove required from URL input
      urlInput.removeAttribute('required');
      
      // Clear any URL validation errors
      urlInput.classList.remove('is-invalid');
    } else {
      // Switch to URL mode
      urlSection.style.display = 'block';
      fileSection.style.display = 'none';
      urlBtnText.style.display = 'inline';
      fileBtnText.style.display = 'none';
      
      // Make URL required in URL mode
      urlInput.setAttribute('required', 'required');
      
      // Clear file selection
      fileInput.value = '';
      hideFilesPreview();
    }
  }
  
  // Add event listeners
  if (urlToggle && fileToggle) {
    urlToggle.addEventListener('change', toggleContentType);
    fileToggle.addEventListener('change', toggleContentType);
  }
  
  // File selection preview
  if (fileInput) {
    fileInput.addEventListener('change', showFilesPreview);
  }
}

// Show selected files preview
function showFilesPreview() {
  const fileInput = document.getElementById('contentFiles');
  const preview = document.getElementById('selectedFilesPreview');
  const filesList = document.getElementById('filesList');
  
  if (fileInput.files.length > 0) {
    let filesHtml = '';
    for (let i = 0; i < fileInput.files.length; i++) {
      const file = fileInput.files[i];
      const fileSize = (file.size / 1024 / 1024).toFixed(2);
      const fileIcon = getFileIcon(file.type);
      
      filesHtml += `
        <div class="d-flex align-items-center mb-2 p-2 border rounded bg-white">
          <i class="${fileIcon} me-2 text-primary"></i>
          <div class="flex-grow-1">
            <div class="fw-medium">${file.name}</div>
            <small class="text-muted">${file.type} • ${fileSize} MB</small>
          </div>
        </div>
      `;
    }
    
    filesList.innerHTML = filesHtml;
    preview.style.display = 'block';
  } else {
    hideFilesPreview();
  }
}

// Hide files preview
function hideFilesPreview() {
  const preview = document.getElementById('selectedFilesPreview');
  preview.style.display = 'none';
}

// Get appropriate icon for file type
function getFileIcon(mimeType) {
  if (mimeType.startsWith('image/')) {
    return 'bi bi-image';
  } else if (mimeType.startsWith('video/')) {
    return 'bi bi-camera-video';
  } else if (mimeType.startsWith('audio/')) {
    return 'bi bi-music-note';
  } else if (mimeType.includes('pdf')) {
    return 'bi bi-file-pdf';
  } else if (mimeType.includes('word') || mimeType.includes('document')) {
    return 'bi bi-file-word';
  } else if (mimeType.includes('text')) {
    return 'bi bi-file-text';
  } else {
    return 'bi bi-file-earmark';
  }
}

// Handle file upload submission
async function handleFileUpload(form) {
  const fileInput = document.getElementById('contentFiles');
  const progressSection = document.getElementById('uploadProgressSection');
  const progressBar = document.getElementById('uploadProgressBar');
  const submitBtn = document.getElementById('addContentBtn');
  const originalBtnText = submitBtn.innerHTML;
  
  // Validate files are selected
  if (!fileInput.files || fileInput.files.length === 0) {
    showAlert('Please select at least one file to upload.', 'warning');
    return;
  }
  
  // Prepare form data
  const formData = new FormData();
  
  // Add files
  for (let i = 0; i < fileInput.files.length; i++) {
    formData.append('files', fileInput.files[i]);
  }
  
  // Add common fields
  formData.append('comments', form.querySelector('#contentComment').value);
  formData.append('tags', form.querySelector('#contentTags').value);
  
  // Add group assignments
  const groupSelections = Array.from(form.querySelector('#contentGroups').selectedOptions).map(opt => opt.value);
  groupSelections.forEach(groupId => {
    formData.append('group_ids', groupId);
  });
  
  try {
    // Show progress
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Uploading...';
    progressSection.style.display = 'block';
    
    // Create XMLHttpRequest for progress tracking
    const xhr = new XMLHttpRequest();
    
    // Track upload progress
    xhr.upload.addEventListener('progress', function(e) {
      if (e.lengthComputable) {
        const percentComplete = (e.loaded / e.total) * 100;
        progressBar.style.width = percentComplete + '%';
        progressBar.textContent = Math.round(percentComplete) + '%';
      }
    });
    
    // Handle response
    const response = await new Promise((resolve, reject) => {
      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
        }
      };
      
      xhr.onerror = function() {
        reject(new Error('Network error occurred'));
      };
      
      // Ensure correct protocol for localhost (fix SSL errors)
      const uploadUrl = window.location.hostname === 'localhost' ? 
        `http://localhost:${window.location.port || 3000}/files/upload` : 
        '/files/upload';
      
      xhr.open('POST', uploadUrl);
      xhr.send(formData);
    });
    
    if (response.success) {
      showAlert(`Successfully uploaded ${response.uploaded.length} file(s)! They will appear in your content list.`, 'success');
      
      // Close modal and refresh page
      const modal = bootstrap.Modal.getInstance(document.getElementById('addContentModal'));
      modal.hide();
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      throw new Error(response.message || 'Upload failed');
    }
    
  } catch (error) {
    console.error('File upload error:', error);
    showAlert(`Upload failed: ${error.message}`, 'danger');
  } finally {
    // Reset UI
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
    progressSection.style.display = 'none';
    progressBar.style.width = '0%';
    progressBar.textContent = '0%';
  }
}

// Handle URL content submission (existing functionality)
async function handleUrlContent(form) {
  const formData = new FormData(form);
  const data = {
    url: formData.get('url'),
    user_comments: formData.get('user_comments'),
    user_tags: formData.get('user_tags') ? formData.get('user_tags').split(',').map(t => t.trim()).filter(Boolean) : [],
    group_ids: Array.from(form.querySelector('#contentGroups').selectedOptions).map(opt => opt.value)
  };
  
  try {
    const res = await fetch('/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    // Handle subscription-related errors
    if (res.status === 429 || res.status === 403 || res.status === 413) {
      const errorResult = await res.json();
      showSubscriptionError(errorResult);
      return;
    }
    
    const result = await res.json();
    const alert = document.getElementById('addContentAlert');
    if (result.success) {
      alert.className = 'alert alert-success mt-2';
      let message = 'Content added successfully!';
      
      // Check if multimedia analysis was triggered
      if (result.multimedia_analysis && result.multimedia_analysis.status === 'started') {
        message += ' AI analysis is running in the background and will update automatically when complete.';
        
        // Start monitoring the new content for analysis completion
        if (result.content && result.content.id && typeof startMonitoringContentAnalysis === 'function') {
          startMonitoringContentAnalysis(result.content.id);
          console.log(`🎬 Started monitoring analysis for new content: ${result.content.id}`);
        }
        
        // Reload page after a shorter delay to show the new content
        setTimeout(() => { window.location.reload(); }, 1000);
      } else {
        // For non-multimedia content, reload immediately
        setTimeout(() => { window.location.reload(); }, 1000);
      }
      
      alert.textContent = message;
      alert.classList.remove('d-none');
    } else {
      alert.className = 'alert alert-danger mt-2';
      alert.textContent = result.error || 'Failed to add content.';
      alert.classList.remove('d-none');
    }
  } catch (err) {
    const alert = document.getElementById('addContentAlert');
    alert.className = 'alert alert-danger mt-2';
    alert.textContent = 'Error adding content: ' + err.message;
    alert.classList.remove('d-none');
  }
}

// Helper function to show alerts (for file upload feedback)
function showAlert(message, type = 'info') {
  const alert = document.getElementById('addContentAlert');
  if (alert) {
    alert.className = `alert alert-${type} mt-2`;
    alert.textContent = message;
    alert.classList.remove('d-none');
  }
}
  
  // Handle delete content buttons (updated to handle both content and file items)
  document.querySelectorAll('.delete-content-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const itemId = this.getAttribute('data-id');
      const itemType = this.getAttribute('data-item-type') || 'content';
      
      // DEBUG: Log all attributes to see what's being read
      console.log('🗑️ Delete button clicked for item:', { 
        itemId, 
        itemType,
        allAttributes: {
          'data-id': this.getAttribute('data-id'),
          'data-item-type': this.getAttribute('data-item-type'),
          'data-item-type-debug': this.hasAttribute('data-item-type'),
          'className': this.className,
          'outerHTML': this.outerHTML
        }
      });
      
      if (!itemId) {
        alert('No item ID found.');
        return;
      }
      
      // Determine item name for confirmation
      const itemName = itemType === 'file' ? 'file' : 'content';
      
      if (!confirm(`Are you sure you want to delete this ${itemName}?`)) {
        console.log('🚫 Delete cancelled by user');
        return;
      }
      
      btn.disabled = true;
      
      try {
        // Use appropriate endpoint based on item type
        let endpoint = itemType === 'file' ? `/files/${itemId}` : `/content/${itemId}`;
        
        // FALLBACK: If delete fails with 404 on /content/:id, try /files/:id
        console.log('📡 Making delete request to:', endpoint);
        
        let res = await fetch(endpoint, {
          method: 'DELETE'
        });
        
        // If content endpoint fails with 404, try files endpoint
        if (!res.ok && res.status === 404 && endpoint.startsWith('/content/')) {
          console.log('🔄 Content endpoint failed, trying files endpoint...');
          endpoint = `/files/${itemId}`;
          res = await fetch(endpoint, {
            method: 'DELETE'
          });
        }
        
        if (res.ok) {
          console.log('✅ Item deleted successfully');
          // Show success message briefly before reload
          const alert = document.createElement('div');
          alert.className = 'alert alert-success alert-dismissible fade show';
          alert.innerHTML = `
            <i class="fas fa-check-circle"></i> ${itemName.charAt(0).toUpperCase() + itemName.slice(1)} deleted successfully
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
          `;
          document.querySelector('.container-fluid').insertAdjacentElement('afterbegin', alert);
          
          // Reload page after short delay
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          const result = await res.json().catch(() => ({}));
          console.error('❌ Failed to delete item:', result.error);
          alert(result.error || `Failed to delete ${itemName}.`);
        }
      } catch (err) {
        console.error('❌ Error deleting item:', err);
        alert(`Error deleting ${itemName}: ` + err.message);
      } finally {
        btn.disabled = false;
      }
    });
  });
  
  // Handle bulk actions
  document.getElementById('bulkDeleteBtn')?.addEventListener('click', async function() {
    const selectedIds = Array.from(document.querySelectorAll('.content-select-checkbox:checked'))
      .map(cb => cb.getAttribute('data-id'));
    
    if (selectedIds.length === 0) {
      alert('Please select content to delete');
      return;
    }
    
    if (confirm(`Are you sure you want to delete ${selectedIds.length} content items?`)) {
      try {
        const res = await fetch('/content/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', ids: selectedIds })
        });
        if (res.ok) {
          window.location.reload();
        } else {
          alert('Failed to delete content');
        }
      } catch (err) {
        alert('Error deleting content');
      }
    }
  });
  
  // Handle select all checkbox
  document.getElementById('selectAllCheckbox')?.addEventListener('change', function() {
    const checkboxes = document.querySelectorAll('.content-select-checkbox');
    checkboxes.forEach(cb => cb.checked = this.checked);
  });

  // Edit Content logic
  var editContentModal = document.getElementById('editContentModal');
  if (editContentModal) {
    editContentModal.addEventListener('show.bs.modal', function(event) {
      var btn = event.relatedTarget;
      console.log('DEBUG: Edit modal show event, btn:', btn);
      if (!btn) return;
      var card = btn.closest('.content-card');
      console.log('DEBUG: Found card:', card);
      if (!card) return;
      var itemId = btn.getAttribute('data-id');
      var title = card.querySelector('.card-title').textContent.trim();
      var url = card.querySelector('.flex-shrink-0 a') ? card.querySelector('.flex-shrink-0 a').href : '';
      var commentEl = card.querySelector('.card-text');
      var comment = commentEl ? (commentEl.getAttribute('title') || commentEl.textContent.trim() || '') : '';
      var tags = Array.from(card.querySelectorAll('.tag-badge')).map(b => b.textContent.trim());
      console.log('DEBUG: Setting edit modal fields:', {itemId, title, url, comment, tags});
      document.getElementById('editContentId').value = itemId;
      document.getElementById('editContentTitle').value = title;
      document.getElementById('editContentUrl').value = url;
      document.getElementById('editContentComment').value = comment;
      document.getElementById('editContentTags').value = tags.join(', ');
      // Groups: not handled in this simple version
    });
  }

  // Show full comment logic
  document.querySelectorAll('.show-full-comment').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const card = link.closest('.content-card');
      const title = card.querySelector('.card-title').textContent.trim();
      // Always use the full comment from the card's .card-text title attribute if available
      const commentEl = card.querySelector('.card-text');
      const comment = commentEl ? (commentEl.getAttribute('title') || commentEl.textContent.trim() || '') : '';
      console.log('DEBUG: Show more clicked, full comment:', comment);
      let html = `<div><strong>Title:</strong> ${title}</div>`;
      html += `<div><strong>Comment:</strong> ${comment}</div>`;
      document.getElementById('viewContentModalBody').innerHTML = html;
      const viewModal = new bootstrap.Modal(document.getElementById('viewContentModal'));
      viewModal.show();
    });
  });

  // Handle edit form submission
  document.getElementById('editContentForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const form = e.target;
    const id = form.id.value;
    const data = {
      title: form.title.value,
      user_comments: form.user_comments.value,

      user_tags: form.user_tags.value.split(',').map(t => t.trim()).filter(Boolean),
      group_ids: Array.from(form.group_ids.selectedOptions).map(opt => opt.value)
    };
    try {
      const res = await fetch(`/content/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      const alert = document.getElementById('editContentAlert');
      if (result.success) {
        alert.className = 'alert alert-success mt-2';
        alert.textContent = 'Content updated successfully!';
        alert.classList.remove('d-none');
        setTimeout(() => { window.location.reload(); }, 1000);
      } else {
        alert.className = 'alert alert-danger mt-2';
        alert.textContent = result.error || 'Failed to update content.';
        alert.classList.remove('d-none');
      }
    } catch (err) {
      const alert = document.getElementById('editContentAlert');
      alert.className = 'alert alert-danger mt-2';
      alert.textContent = 'Error updating content: ' + err.message;
      alert.classList.remove('d-none');
    }
  });

  // View Content logic
  document.querySelectorAll('.card-title[data-bs-toggle="modal"]').forEach(titleEl => {
    titleEl.addEventListener('click', function() {
      try {
        const card = titleEl.closest('.content-card');
        if (!card) throw new Error('No .content-card found for title');
        const itemId = titleEl.getAttribute('data-id');
        const title = titleEl.textContent.trim();
        const commentEl = card.querySelector('.card-text');
        const comment = commentEl ? (commentEl.getAttribute('title') || commentEl.textContent.trim() || '') : '';
        const url = card.querySelector('.flex-shrink-0 a')?.getAttribute('href') || '';
        const tags = Array.from(card.querySelectorAll('.tag-badge')).map(b => b.textContent.trim());
        let html = `<div><strong>Title:</strong> ${title}</div>`;
        if (url) html += `<div><strong>URL:</strong> <a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a></div>`;
        if (comment) html += `<div><strong>Comment:</strong> ${comment}</div>`;
        if (tags.length) html += `<div><strong>Tags:</strong> ${tags.map(t => `<span class='badge bg-success mx-1'>${t}</span>`).join('')}</div>`;
        document.getElementById('viewContentModalBody').innerHTML = html;
      } catch (err) {
        console.error('Error opening content modal:', err);
        document.getElementById('viewContentModalBody').innerHTML = '<div class="text-danger">Failed to load content details.</div>';
      }
    });
  });

// DEBUG: Log all delete buttons when page loads
document.addEventListener('DOMContentLoaded', function() {
  console.log('🔍 DEBUG: Checking all delete buttons on page load');
  const deleteButtons = document.querySelectorAll('.delete-content-btn');
  console.log(`Found ${deleteButtons.length} delete buttons`);
  
  deleteButtons.forEach((btn, index) => {
    console.log(`Button ${index + 1}:`, {
      'data-id': btn.getAttribute('data-id'),
      'data-item-type': btn.getAttribute('data-item-type'),
      'hasDataItemType': btn.hasAttribute('data-item-type'),
      'className': btn.className,
      'outerHTML': btn.outerHTML.substring(0, 200) + '...' // Truncate for readability
    });
  });
  
  // Also check the content cards
  const contentCards = document.querySelectorAll('.content-card');
  console.log(`Found ${contentCards.length} content cards`);
  
  contentCards.forEach((card, index) => {
    console.log(`Card ${index + 1}:`, {
      'data-id': card.getAttribute('data-id'),
      'data-item-type': card.getAttribute('data-item-type'),
      'className': card.className
    });
  });
});

// Copy content summary function (CSP-compliant)
function copyContentSummary(contentId) {
  const summaryElement = document.querySelector(`#transcription-summary-${contentId} .transcription-text`);
  if (summaryElement) {
    const summaryText = summaryElement.textContent.trim();
    
    if (summaryText && summaryText !== 'Loading transcription...') {
      navigator.clipboard.writeText(summaryText).then(() => {
        // Show brief success feedback
        const button = document.querySelector(`[data-content-id="${contentId}"]`);
        if (button) {
          const originalHtml = button.innerHTML;
          button.innerHTML = '<i class="bi bi-check" style="font-size: 0.7rem;"></i>';
          button.classList.add('btn-success');
          button.classList.remove('btn-outline-primary');
          
          setTimeout(() => {
            button.innerHTML = originalHtml;
            button.classList.remove('btn-success');
            button.classList.add('btn-outline-primary');
          }, 1500);
        }
      }).catch(err => {
        console.error('Failed to copy summary:', err);
        alert('Failed to copy summary to clipboard');
      });
    } else {
      alert('No summary available to copy');
    }
  }
}

// Handle copy summary buttons (CSP-compliant event delegation)
document.addEventListener('click', function(e) {
  if (e.target.closest('.copy-summary-btn')) {
    const button = e.target.closest('.copy-summary-btn');
    const contentId = button.getAttribute('data-content-id');
    
    if (contentId) {
      copyContentSummary(contentId);
    }
  }
}); 