/**
 * Content Upload Toggle JavaScript
 * Handles the toggle between URL and file upload in the Add Content modal
 */

document.addEventListener('DOMContentLoaded', function() {
  initializeContentUploadToggle();
});

function initializeContentUploadToggle() {
  const urlToggle = document.getElementById('urlContentType');
  const fileToggle = document.getElementById('fileContentType');
  const urlSection = document.getElementById('urlContentSection');
  const fileSection = document.getElementById('fileContentSection');
  const urlBtnText = document.getElementById('urlBtnText');
  const fileBtnText = document.getElementById('fileBtnText');
  const urlInput = document.getElementById('contentUrl');
  const fileInput = document.getElementById('contentFiles');
  const addContentForm = document.getElementById('addContentForm');
  
  // Only initialize if elements exist
  if (!urlToggle || !fileToggle || !addContentForm) {
    return;
  }
  
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
      urlInput.classList.remove('is-invalid');
      
      // Update form action and method for file upload
      addContentForm.action = '/files/upload';
      addContentForm.method = 'POST';
    } else {
      // Switch to URL mode  
      urlSection.style.display = 'block';
      fileSection.style.display = 'none';
      urlBtnText.style.display = 'inline';
      fileBtnText.style.display = 'none';
      
      // Make URL required in URL mode
      urlInput.setAttribute('required', 'required');
      
      // Clear file selection
      if (fileInput) {
        fileInput.value = '';
        hideFilesPreview();
      }
      
      // Reset form for content submission
      addContentForm.removeAttribute('action');
      addContentForm.removeAttribute('method');
    }
  }
  
  // Add event listeners for toggle
  urlToggle.addEventListener('change', toggleContentType);
  fileToggle.addEventListener('change', toggleContentType);
  
  // File selection preview
  if (fileInput) {
    fileInput.addEventListener('change', showFilesPreview);
  }
  
  // Override form submission for file uploads
  addContentForm.addEventListener('submit', function(e) {
    if (fileToggle.checked) {
      e.preventDefault();
      handleFileUploadSubmission();
    }
    // Let normal content submission proceed for URL mode
  });
}

// Show selected files preview
function showFilesPreview() {
  const fileInput = document.getElementById('contentFiles');
  const preview = document.getElementById('selectedFilesPreview');
  const filesList = document.getElementById('filesList');
  
  if (!fileInput || !preview || !filesList) return;
  
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
  if (preview) {
    preview.style.display = 'none';
  }
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

// Handle file upload form submission
async function handleFileUploadSubmission() {
  const fileInput = document.getElementById('contentFiles');
  const progressSection = document.getElementById('uploadProgressSection');
  const progressBar = document.getElementById('uploadProgressBar');
  const submitBtn = document.getElementById('addContentBtn');
  const originalBtnText = submitBtn.innerHTML;
  const alertDiv = document.getElementById('addContentAlert');
  
  // Validate files are selected
  if (!fileInput.files || fileInput.files.length === 0) {
    showUploadAlert('Please select at least one file to upload.', 'warning');
    return;
  }
  
  // Prepare form data
  const formData = new FormData();
  
  // Add files
  for (let i = 0; i < fileInput.files.length; i++) {
    formData.append('files', fileInput.files[i]);
  }
  
  // Add common fields
  const commentField = document.getElementById('contentComment');
  const tagsField = document.getElementById('contentTags');
  const groupsField = document.getElementById('contentGroups');
  
  if (commentField) formData.append('comments', commentField.value);
  if (tagsField) formData.append('tags', tagsField.value);
  
  // Add group assignments
  if (groupsField) {
    const groupSelections = Array.from(groupsField.selectedOptions).map(opt => opt.value);
    groupSelections.forEach(groupId => {
      formData.append('group_ids', groupId);
    });
  }
  
  try {
    // Show progress
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Uploading...';
    if (progressSection) progressSection.style.display = 'block';
    
    // Upload files
    const response = await fetch('/files/upload', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (result.success) {
      showUploadAlert(`Successfully uploaded ${result.uploaded.length} file(s)! Redirecting...`, 'success');
      
      // Close modal and refresh page
      const modal = bootstrap.Modal.getInstance(document.getElementById('addContentModal'));
      if (modal) modal.hide();
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      throw new Error(result.message || 'Upload failed');
    }
    
  } catch (error) {
    console.error('File upload error:', error);
    showUploadAlert(`Upload failed: ${error.message}`, 'danger');
  } finally {
    // Reset UI
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
    if (progressSection) progressSection.style.display = 'none';
    if (progressBar) {
      progressBar.style.width = '0%';
      progressBar.textContent = '0%';
    }
  }
}

// Show upload alert messages
function showUploadAlert(message, type = 'info') {
  const alertDiv = document.getElementById('addContentAlert');
  if (alertDiv) {
    alertDiv.className = `alert alert-${type} mt-2`;
    alertDiv.textContent = message;
    alertDiv.classList.remove('d-none');
  }
} 