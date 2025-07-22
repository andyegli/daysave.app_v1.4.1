/**
 * Content Upload Toggle JavaScript
 * Handles the toggle between URL and file upload in the Add Content modal
 */

document.addEventListener('DOMContentLoaded', function() {
  initializeContentUploadToggle();
});

function initializeContentUploadToggle() {
  const singleUrlToggle = document.getElementById('singleUrlContentType');
  const bulkUrlToggle = document.getElementById('bulkUrlContentType');
  const fileToggle = document.getElementById('fileContentType');
  const singleUrlSection = document.getElementById('singleUrlContentSection');
  const bulkUrlSection = document.getElementById('bulkUrlContentSection');
  const fileSection = document.getElementById('fileContentSection');
  const singleUrlBtnText = document.getElementById('singleUrlBtnText');
  const bulkUrlBtnText = document.getElementById('bulkUrlBtnText');
  const fileBtnText = document.getElementById('fileBtnText');
  const pathBtnText = document.getElementById('pathBtnText');
  const urlInput = document.getElementById('contentUrl');
  const bulkUrlInput = document.getElementById('bulkContentUrls');
  const fileInput = document.getElementById('contentFiles');
  const fileSelectMethod = document.getElementById('fileSelectMethod');
  const filePathMethod = document.getElementById('filePathMethod');
  const addContentForm = document.getElementById('addContentForm');
  
  // Only initialize if elements exist
  if (!singleUrlToggle || !bulkUrlToggle || !fileToggle || !addContentForm) {
    return;
  }
  
  // Toggle between different content input modes
  function toggleContentType() {
    // Hide all sections first
    singleUrlSection.style.display = 'none';
    bulkUrlSection.style.display = 'none';
    fileSection.style.display = 'none';
    singleUrlBtnText.style.display = 'none';
    bulkUrlBtnText.style.display = 'none';
    fileBtnText.style.display = 'none';
    pathBtnText.style.display = 'none';
    
    // Clear validation states
    if (urlInput) {
      urlInput.removeAttribute('required');
      urlInput.classList.remove('is-invalid');
    }
    if (bulkUrlInput) {
      bulkUrlInput.classList.remove('is-invalid');
    }
    
    if (singleUrlToggle.checked) {
      // Single URL mode
      singleUrlSection.style.display = 'block';
      singleUrlBtnText.style.display = 'inline';
      urlInput.setAttribute('required', 'required');
      
      // Reset form for content submission
      addContentForm.removeAttribute('action');
      addContentForm.removeAttribute('method');
      
    } else if (bulkUrlToggle.checked) {
      // Bulk URL mode
      bulkUrlSection.style.display = 'block';
      bulkUrlBtnText.style.display = 'inline';
      
      // Reset form for bulk URL submission
      addContentForm.removeAttribute('action');
      addContentForm.removeAttribute('method');
      
    } else if (fileToggle.checked) {
      // File upload mode
      fileSection.style.display = 'block';
      
      // Show appropriate button text based on file method
      toggleFileMethod();
      
      // Clear file selection
      if (fileInput) {
        fileInput.value = '';
        hideFilesPreview();
      }
      
      // Update form for file upload
      addContentForm.action = '/files/upload';
      addContentForm.method = 'POST';
    }
  }
  
  // Toggle between file selection methods
  function toggleFileMethod() {
    const fileSelectSection = document.getElementById('fileSelectSection');
    const filePathSection = document.getElementById('filePathSection');
    
    if (fileSelectMethod && fileSelectMethod.checked) {
      // File selection mode
      fileSelectSection.style.display = 'block';
      filePathSection.style.display = 'none';
      fileBtnText.style.display = 'inline';
      pathBtnText.style.display = 'none';
    } else if (filePathMethod && filePathMethod.checked) {
      // File path mode
      fileSelectSection.style.display = 'none';
      filePathSection.style.display = 'block';
      fileBtnText.style.display = 'none';
      pathBtnText.style.display = 'inline';
    }
  }
  
  // Add event listeners for main content type toggle
  singleUrlToggle.addEventListener('change', toggleContentType);
  bulkUrlToggle.addEventListener('change', toggleContentType);
  fileToggle.addEventListener('change', toggleContentType);
  
  // Add event listeners for file method toggle
  if (fileSelectMethod) fileSelectMethod.addEventListener('change', toggleFileMethod);
  if (filePathMethod) filePathMethod.addEventListener('change', toggleFileMethod);
  
  // File selection preview
  if (fileInput) {
    fileInput.addEventListener('change', showFilesPreview);
  }
  
  // Bulk URL validation and preview
  if (bulkUrlInput) {
    bulkUrlInput.addEventListener('input', validateAndPreviewUrls);
  }
  
  // File path validation and preview
  const bulkFilePathInput = document.getElementById('bulkFilePaths');
  if (bulkFilePathInput) {
    bulkFilePathInput.addEventListener('input', validateAndPreviewPaths);
  }
  
  // Preview button handlers
  const previewUrlsBtn = document.getElementById('previewUrlsBtn');
  const previewPathsBtn = document.getElementById('previewPathsBtn');
  
  if (previewUrlsBtn) {
    previewUrlsBtn.addEventListener('click', toggleUrlPreview);
  }
  if (previewPathsBtn) {
    previewPathsBtn.addEventListener('click', togglePathPreview);
  }
  
  // Override form submission for different modes
  addContentForm.addEventListener('submit', function(e) {
    if (bulkUrlToggle.checked) {
      e.preventDefault();
      handleBulkUrlSubmission();
    } else if (fileToggle.checked) {
      e.preventDefault();
      if (filePathMethod.checked) {
        handleFilePathSubmission();
      } else {
        handleFileUploadSubmission();
      }
    }
    // Let normal content submission proceed for single URL mode
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

// Validate and preview URLs from bulk input
function validateAndPreviewUrls() {
  const bulkUrlInput = document.getElementById('bulkContentUrls');
  const urlPreviewSection = document.getElementById('urlPreviewSection');
  const urlCount = document.getElementById('urlCount');
  
  if (!bulkUrlInput || !urlPreviewSection || !urlCount) return;
  
  const text = bulkUrlInput.value.trim();
  if (text.length === 0) {
    urlPreviewSection.style.display = 'none';
    return;
  }
  
  // Extract and validate URLs
  const lines = text.split('\n');
  const validUrls = [];
  
  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && isValidUrl(trimmedLine)) {
      validUrls.push(trimmedLine);
    }
  });
  
  // Remove duplicates
  const uniqueUrls = [...new Set(validUrls)];
  
  if (uniqueUrls.length > 0) {
    urlCount.textContent = uniqueUrls.length;
    urlPreviewSection.style.display = 'block';
  } else {
    urlPreviewSection.style.display = 'none';
  }
}

// Validate and preview file paths from bulk input
function validateAndPreviewPaths() {
  const bulkPathInput = document.getElementById('bulkFilePaths');
  const pathPreviewSection = document.getElementById('pathPreviewSection');
  const pathCount = document.getElementById('pathCount');
  
  if (!bulkPathInput || !pathPreviewSection || !pathCount) return;
  
  const text = bulkPathInput.value.trim();
  if (text.length === 0) {
    pathPreviewSection.style.display = 'none';
    return;
  }
  
  // Extract and validate file paths
  const lines = text.split('\n');
  const validPaths = [];
  
  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && isValidFilePath(trimmedLine)) {
      validPaths.push(trimmedLine);
    }
  });
  
  // Remove duplicates
  const uniquePaths = [...new Set(validPaths)];
  
  if (uniquePaths.length > 0) {
    pathCount.textContent = uniquePaths.length;
    pathPreviewSection.style.display = 'block';
  } else {
    pathPreviewSection.style.display = 'none';
  }
}

// Toggle URL preview list visibility
function toggleUrlPreview() {
  const urlPreviewList = document.getElementById('urlPreviewList');
  const previewBtn = document.getElementById('previewUrlsBtn');
  const bulkUrlInput = document.getElementById('bulkContentUrls');
  
  if (!urlPreviewList || !previewBtn || !bulkUrlInput) return;
  
  if (urlPreviewList.classList.contains('d-none')) {
    // Show preview
    const text = bulkUrlInput.value.trim();
    const lines = text.split('\n');
    const validUrls = [];
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && isValidUrl(trimmedLine)) {
        validUrls.push(trimmedLine);
      }
    });
    
    const uniqueUrls = [...new Set(validUrls)];
    
    let previewHtml = '<div class="list-group">';
    uniqueUrls.forEach((url, index) => {
      previewHtml += `
        <div class="list-group-item d-flex align-items-center">
          <i class="bi bi-link-45deg me-2 text-primary"></i>
          <div class="flex-grow-1">
            <div class="fw-medium">${url}</div>
            <small class="text-muted">URL ${index + 1}</small>
          </div>
        </div>
      `;
    });
    previewHtml += '</div>';
    
    urlPreviewList.innerHTML = previewHtml;
    urlPreviewList.classList.remove('d-none');
    previewBtn.innerHTML = '<i class="bi bi-eye-slash"></i> Hide';
  } else {
    // Hide preview
    urlPreviewList.classList.add('d-none');
    previewBtn.innerHTML = '<i class="bi bi-eye"></i> Preview';
  }
}

// Toggle path preview list visibility
function togglePathPreview() {
  const pathPreviewList = document.getElementById('pathPreviewList');
  const previewBtn = document.getElementById('previewPathsBtn');
  const bulkPathInput = document.getElementById('bulkFilePaths');
  
  if (!pathPreviewList || !previewBtn || !bulkPathInput) return;
  
  if (pathPreviewList.classList.contains('d-none')) {
    // Show preview
    const text = bulkPathInput.value.trim();
    const lines = text.split('\n');
    const validPaths = [];
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && isValidFilePath(trimmedLine)) {
        validPaths.push(trimmedLine);
      }
    });
    
    const uniquePaths = [...new Set(validPaths)];
    
    let previewHtml = '<div class="list-group">';
    uniquePaths.forEach((path, index) => {
      const fileName = path.split('/').pop() || path.split('\\').pop() || path;
      const fileExt = fileName.split('.').pop().toLowerCase();
      const fileIcon = getFileIconFromExtension(fileExt);
      
      previewHtml += `
        <div class="list-group-item d-flex align-items-center">
          <i class="${fileIcon} me-2 text-primary"></i>
          <div class="flex-grow-1">
            <div class="fw-medium">${fileName}</div>
            <small class="text-muted">${path}</small>
          </div>
        </div>
      `;
    });
    previewHtml += '</div>';
    
    pathPreviewList.innerHTML = previewHtml;
    pathPreviewList.classList.remove('d-none');
    previewBtn.innerHTML = '<i class="bi bi-eye-slash"></i> Hide';
  } else {
    // Hide preview
    pathPreviewList.classList.add('d-none');
    previewBtn.innerHTML = '<i class="bi bi-eye"></i> Preview';
  }
}

// Handle bulk URL submission
async function handleBulkUrlSubmission() {
  const bulkUrlInput = document.getElementById('bulkContentUrls');
  const submitBtn = document.getElementById('addContentBtn');
  const originalBtnText = submitBtn.innerHTML;
  
  if (!bulkUrlInput) {
    showUploadAlert('Bulk URL input not found.', 'danger');
    return;
  }
  
  const text = bulkUrlInput.value.trim();
  if (text.length === 0) {
    showUploadAlert('Please enter at least one URL.', 'warning');
    return;
  }
  
  // Extract and validate URLs
  const lines = text.split('\n');
  const validUrls = [];
  
  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && isValidUrl(trimmedLine)) {
      validUrls.push(trimmedLine);
    }
  });
  
  const uniqueUrls = [...new Set(validUrls)];
  
  if (uniqueUrls.length === 0) {
    showUploadAlert('No valid URLs found. Please check your input.', 'warning');
    return;
  }
  
  try {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Processing URLs...';
    
    // Get common fields
    const commentField = document.getElementById('contentComment');
    const tagsField = document.getElementById('contentTags');
    const groupsField = document.getElementById('contentGroups');
    
    const commonData = {
      user_comments: commentField ? commentField.value : '',
      user_tags: tagsField ? tagsField.value.split(',').map(t => t.trim()).filter(Boolean) : [],
      group_ids: groupsField ? Array.from(groupsField.selectedOptions).map(opt => opt.value) : []
    };
    
    let successCount = 0;
    let failureCount = 0;
    const errors = [];
    
    // Process URLs in batches to avoid overwhelming the server
    const batchSize = 5;
    for (let i = 0; i < uniqueUrls.length; i += batchSize) {
      const batch = uniqueUrls.slice(i, i + batchSize);
      const batchPromises = batch.map(async (url) => {
        try {
          const response = await fetch('/content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: url,
              ...commonData
            })
          });
          
          if (response.ok) {
            successCount++;
          } else {
            const errorResult = await response.json();
            failureCount++;
            errors.push(`${url}: ${errorResult.error || 'Unknown error'}`);
          }
        } catch (error) {
          failureCount++;
          errors.push(`${url}: ${error.message}`);
        }
      });
      
      await Promise.all(batchPromises);
      
      // Update progress
      const processed = Math.min(i + batchSize, uniqueUrls.length);
      submitBtn.innerHTML = `<i class="bi bi-hourglass-split"></i> Processing... ${processed}/${uniqueUrls.length}`;
    }
    
    // Show results
    let message = `Bulk import completed! ${successCount} URLs added successfully.`;
    if (failureCount > 0) {
      message += ` ${failureCount} failed.`;
    }
    
    showUploadAlert(message, successCount > 0 ? 'success' : 'warning');
    
    if (successCount > 0) {
      // Close modal and refresh page
      const modal = bootstrap.Modal.getInstance(document.getElementById('addContentModal'));
      if (modal) modal.hide();
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
    
  } catch (error) {
    console.error('Bulk URL import error:', error);
    showUploadAlert(`Bulk import failed: ${error.message}`, 'danger');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
  }
}

// Handle file path submission
async function handleFilePathSubmission() {
  const bulkPathInput = document.getElementById('bulkFilePaths');
  const submitBtn = document.getElementById('addContentBtn');
  const originalBtnText = submitBtn.innerHTML;
  
  if (!bulkPathInput) {
    showUploadAlert('File path input not found.', 'danger');
    return;
  }
  
  const text = bulkPathInput.value.trim();
  if (text.length === 0) {
    showUploadAlert('Please enter at least one file path.', 'warning');
    return;
  }
  
  // Extract and validate file paths
  const lines = text.split('\n');
  const validPaths = [];
  
  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && isValidFilePath(trimmedLine)) {
      validPaths.push(trimmedLine);
    }
  });
  
  const uniquePaths = [...new Set(validPaths)];
  
  if (uniquePaths.length === 0) {
    showUploadAlert('No valid file paths found. Please check your input.', 'warning');
    return;
  }
  
  try {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Processing Paths...';
    
    // Get common fields
    const commentField = document.getElementById('contentComment');
    const tagsField = document.getElementById('contentTags');
    const groupsField = document.getElementById('contentGroups');
    
    const formData = new FormData();
    formData.append('file_paths', JSON.stringify(uniquePaths));
    
    if (commentField) formData.append('comments', commentField.value);
    if (tagsField) formData.append('tags', tagsField.value);
    
    if (groupsField) {
      const groupSelections = Array.from(groupsField.selectedOptions).map(opt => opt.value);
      groupSelections.forEach(groupId => {
        formData.append('group_ids', groupId);
      });
    }
    
    // Send to a new endpoint that handles file paths
    const response = await fetch('/files/import-paths', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (result.success) {
      const successCount = result.imported ? result.imported.length : 0;
      const failureCount = result.errors ? result.errors.length : 0;
      
      let message = `Path import completed! ${successCount} files imported successfully.`;
      if (failureCount > 0) {
        message += ` ${failureCount} failed.`;
      }
      
      showUploadAlert(message, successCount > 0 ? 'success' : 'warning');
      
      if (successCount > 0) {
        // Close modal and refresh page
        const modal = bootstrap.Modal.getInstance(document.getElementById('addContentModal'));
        if (modal) modal.hide();
        
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } else {
      throw new Error(result.message || 'Path import failed');
    }
    
  } catch (error) {
    console.error('File path import error:', error);
    showUploadAlert(`Path import failed: ${error.message}`, 'danger');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
  }
}

// Utility functions
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

function isValidFilePath(path) {
  // Basic file path validation
  const trimmedPath = path.trim();
  return trimmedPath.length > 0 && 
         (trimmedPath.includes('/') || trimmedPath.includes('\\')) &&
         trimmedPath.includes('.');
}

function getFileIconFromExtension(extension) {
  const ext = extension.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) {
    return 'bi bi-image';
  } else if (['mp4', 'avi', 'mov', 'mkv', 'webm', 'wmv'].includes(ext)) {
    return 'bi bi-camera-video';
  } else if (['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a'].includes(ext)) {
    return 'bi bi-music-note';
  } else if (ext === 'pdf') {
    return 'bi bi-file-pdf';
  } else if (['doc', 'docx'].includes(ext)) {
    return 'bi bi-file-word';
  } else if (['txt', 'md'].includes(ext)) {
    return 'bi bi-file-text';
  } else {
    return 'bi bi-file-earmark';
  }
} 