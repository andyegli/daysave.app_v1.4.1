/**
 * File Management JavaScript
 * Handles file upload, drag-and-drop, progress tracking, and file operations
 */

class FileManager {
  constructor() {
    this.selectedFiles = [];
    this.uploadSettings = null;
    this.init();
  }

  /**
   * Initialize file manager
   */
  async init() {
    try {
      // Load upload settings
      await this.loadUploadSettings();
      
      // Setup event listeners
      this.setupEventListeners();
      
      console.log('File Manager initialized');
    } catch (error) {
      console.error('Error initializing file manager:', error);
    }
  }

  /**
   * Load upload settings from server
   */
  async loadUploadSettings() {
    try {
      const response = await fetch('/files/api/settings');
      if (response.ok) {
        this.uploadSettings = await response.json();
        this.updateUploadUI();
      }
    } catch (error) {
      console.error('Error loading upload settings:', error);
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // File input change
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    }

    // Drag and drop
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
      uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
      uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
      uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
      uploadArea.addEventListener('click', () => fileInput?.click());
    }

    // Upload form submission
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
      uploadForm.addEventListener('submit', (e) => this.handleUpload(e));
    }

    // Modal events
    const uploadModal = document.getElementById('uploadModal');
    if (uploadModal) {
      uploadModal.addEventListener('hidden.bs.modal', () => this.resetUploadForm());
    }
  }

  /**
   * Update upload UI with current settings
   */
  updateUploadUI() {
    if (!this.uploadSettings) return;

    // Update file input accept attribute
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
      const acceptTypes = this.uploadSettings.allowedFileTypes.join(',');
      fileInput.setAttribute('accept', acceptTypes);
    }

    // Update upload instructions
    const instructions = document.querySelector('.upload-instructions p');
    if (instructions) {
      instructions.innerHTML = `
        or click to browse<br>
        <small class="text-muted">
          Max size: ${this.uploadSettings.maxFileSizeMB}MB | 
          Supported: Images, Audio, Video, Documents
        </small>
      `;
    }
  }

  /**
   * Handle drag over event
   */
  handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    const uploadArea = document.getElementById('uploadArea');
    uploadArea.classList.add('border-primary', 'bg-light');
  }

  /**
   * Handle drag leave event
   */
  handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    const uploadArea = document.getElementById('uploadArea');
    uploadArea.classList.remove('border-primary', 'bg-light');
  }

  /**
   * Handle drop event
   */
  handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const uploadArea = document.getElementById('uploadArea');
    uploadArea.classList.remove('border-primary', 'bg-light');

    const files = Array.from(e.dataTransfer.files);
    this.addFiles(files);
  }

  /**
   * Handle file input selection
   */
  handleFileSelect(e) {
    const files = Array.from(e.target.files);
    this.addFiles(files);
  }

  /**
   * Add files to selection
   */
  addFiles(files) {
    // Validate and add files
    const validFiles = [];
    const errors = [];

    files.forEach(file => {
      const validation = this.validateFile(file);
      if (validation.isValid) {
        validFiles.push(file);
      } else {
        errors.push({
          filename: file.name,
          errors: validation.errors
        });
      }
    });

    // Add valid files
    this.selectedFiles = [...this.selectedFiles, ...validFiles];
    
    // Show errors if any
    if (errors.length > 0) {
      this.showValidationErrors(errors);
    }

    // Update UI
    this.updateFilesList();
    this.updateUploadButton();
  }

  /**
   * Validate individual file
   */
  validateFile(file) {
    const errors = [];

    // Check file size
    if (this.uploadSettings && file.size > this.uploadSettings.maxFileSize) {
      errors.push(`File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds maximum ${this.uploadSettings.maxFileSizeMB}MB`);
    }

    // Check file type
    if (this.uploadSettings && !this.uploadSettings.allowedFileTypes.includes(file.type)) {
      errors.push(`File type ${file.type || 'unknown'} is not supported`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Show validation errors
   */
  showValidationErrors(errors) {
    const errorHtml = errors.map(error => 
      `<div class="alert alert-warning alert-dismissible fade show" role="alert">
        <strong>${error.filename}:</strong> ${error.errors.join(', ')}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>`
    ).join('');

    const container = document.createElement('div');
    container.innerHTML = errorHtml;
    document.querySelector('.modal-body').insertBefore(container, document.getElementById('selectedFilesList'));
  }

  /**
   * Update files list display
   */
  updateFilesList() {
    const filesList = document.getElementById('filesList');
    const selectedFilesList = document.getElementById('selectedFilesList');

    if (this.selectedFiles.length === 0) {
      selectedFilesList.style.display = 'none';
      return;
    }

    selectedFilesList.style.display = 'block';
    
    const filesHtml = this.selectedFiles.map((file, index) => `
      <div class="d-flex justify-content-between align-items-center p-2 border rounded mb-2">
        <div class="d-flex align-items-center">
          <i class="fas fa-file me-2 ${this.getFileIcon(file.type)}"></i>
          <div>
            <div class="fw-bold">${file.name}</div>
            <small class="text-muted">${(file.size / 1024 / 1024).toFixed(2)} MB • ${file.type || 'Unknown type'}</small>
          </div>
        </div>
        <button type="button" class="btn btn-sm btn-outline-danger" onclick="fileManager.removeFile(${index})">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `).join('');

    filesList.innerHTML = filesHtml;
  }

  /**
   * Get appropriate icon for file type
   */
  getFileIcon(mimeType) {
    if (!mimeType) return 'text-secondary';
    
    if (mimeType.startsWith('image/')) return 'text-success';
    if (mimeType.startsWith('audio/')) return 'text-primary';
    if (mimeType.startsWith('video/')) return 'text-danger';
    if (mimeType.includes('pdf')) return 'text-danger';
    if (mimeType.includes('text')) return 'text-info';
    
    return 'text-secondary';
  }

  /**
   * Remove file from selection
   */
  removeFile(index) {
    this.selectedFiles.splice(index, 1);
    this.updateFilesList();
    this.updateUploadButton();
  }

  /**
   * Update upload button state
   */
  updateUploadButton() {
    const uploadButton = document.getElementById('uploadButton');
    if (uploadButton) {
      uploadButton.disabled = this.selectedFiles.length === 0;
    }
  }

  /**
   * Handle upload form submission
   */
  async handleUpload(e) {
    e.preventDefault();

    if (this.selectedFiles.length === 0) {
      alert('Please select files to upload');
      return;
    }

    try {
      // Prepare form data
      const formData = new FormData();
      
      // Add files
      this.selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      // Add other form data
      const comments = document.getElementById('uploadComments')?.value;
      const tags = document.getElementById('uploadTags')?.value;
      const groups = Array.from(document.getElementById('uploadGroups')?.selectedOptions || [])
        .map(option => option.value);

      if (comments) formData.append('comments', comments);
      if (tags) formData.append('tags', tags);
      groups.forEach(groupId => formData.append('group_ids', groupId));

      // Show progress
      this.showUploadProgress();

      // Upload files
      const response = await fetch('/files/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include' // Ensure cookies are included for authentication
      });

      console.log('Upload response status:', response.status);
      console.log('Upload response headers:', response.headers);

      // Handle different response types
      let result;
      
      if (response.status === 401) {
        // Authentication required - redirect to login
        result = {
          success: false,
          error: 'Authentication required',
          message: 'Please log in to upload files'
        };
        // Redirect to login after showing error
        setTimeout(() => {
          window.location.href = '/auth/login';
        }, 2000);
      } else if (response.status === 302) {
        // Redirect response (likely to login)
        result = {
          success: false,
          error: 'Authentication required',
          message: 'Please log in to upload files'
        };
        // Redirect to login after showing error
        setTimeout(() => {
          window.location.href = '/auth/login';
        }, 2000);
      } else {
        // Success response
        try {
          const contentType = response.headers.get('content-type');
          console.log('Success response content-type:', contentType);
          if (contentType && contentType.includes('application/json')) {
            result = await response.json();
            console.log('Upload result:', result);
          } else {
            // Non-JSON response (might be a redirect)
            result = {
              success: true,
              message: 'Upload completed successfully'
            };
          }
        } catch (jsonError) {
          console.error('Error parsing success response:', jsonError);
          // If JSON parsing fails but response was OK, assume success
          result = {
            success: true,
            message: 'Upload completed successfully'
          };
        }
      }

      // Hide progress
      this.hideUploadProgress();

      // Show results
      this.showUploadResults(result);

      if (result.success) {
        setTimeout(() => {
          window.location.reload(); // Refresh page to show new files
        }, 2000);
      }

    } catch (error) {
      console.error('Upload error:', error);
      this.hideUploadProgress();
      
      // Check if this is a network error vs other error
      let errorMessage = 'Network error - please check your connection';
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        errorMessage = 'Connection error - please check your internet connection and try again';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      this.showUploadResults({
        success: false,
        error: 'Upload failed',
        message: errorMessage
      });
    }
  }

  /**
   * Show upload progress
   */
  showUploadProgress() {
    document.getElementById('uploadProgress').style.display = 'block';
    document.getElementById('uploadButton').disabled = true;
    
    // Simulate progress (since we can't track real progress with fetch)
    let progress = 0;
    this.progressInterval = setInterval(() => {
      progress += Math.random() * 20;
      if (progress > 90) progress = 90;
      
      document.getElementById('progressBar').style.width = `${progress}%`;
      document.getElementById('progressText').textContent = `${Math.round(progress)}%`;
    }, 200);
  }

  /**
   * Hide upload progress
   */
  hideUploadProgress() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }
    
    document.getElementById('progressBar').style.width = '100%';
    document.getElementById('progressText').textContent = '100%';
    
    setTimeout(() => {
      document.getElementById('uploadProgress').style.display = 'none';
      document.getElementById('uploadButton').disabled = false;
    }, 500);
  }

  /**
   * Show upload results
   */
  showUploadResults(result) {
    const resultsDiv = document.getElementById('uploadResults');
    resultsDiv.style.display = 'block';

    let html = '';

    if (result.success) {
      html += `<div class="alert alert-success">
        <i class="fas fa-check-circle"></i> 
        Successfully uploaded ${result.summary.successful} of ${result.summary.total} files
      </div>`;

      if (result.uploaded.length > 0) {
        html += '<h6>Uploaded Files:</h6><ul>';
        result.uploaded.forEach(file => {
          html += `<li class="text-success">${file.filename} (${(file.size / 1024 / 1024).toFixed(2)} MB)</li>`;
        });
        html += '</ul>';
      }
    }

    if (result.errors && result.errors.length > 0) {
      html += '<div class="alert alert-warning"><h6>Upload Errors:</h6><ul>';
      result.errors.forEach(error => {
        html += `<li><strong>${error.filename}:</strong> ${error.errors.join(', ')}</li>`;
      });
      html += '</ul></div>';
    }

    if (!result.success && result.error) {
      html += `<div class="alert alert-danger">
        <i class="fas fa-exclamation-triangle"></i> 
        ${result.error}: ${result.message || 'Unknown error occurred'}
      </div>`;
    }

    resultsDiv.innerHTML = html;
  }

  /**
   * Reset upload form
   */
  resetUploadForm() {
    this.selectedFiles = [];
    document.getElementById('uploadForm').reset();
    document.getElementById('selectedFilesList').style.display = 'none';
    document.getElementById('uploadProgress').style.display = 'none';
    document.getElementById('uploadResults').style.display = 'none';
    this.updateUploadButton();
    
    // Clear any error messages
    const alerts = document.querySelectorAll('.modal-body .alert');
    alerts.forEach(alert => alert.remove());
  }
}

/**
 * File Operations
 */

/**
 * Edit file metadata
 */
async function editFile(fileId) {
  try {
    const response = await fetch(`/files/${fileId}`);
    if (!response.ok) throw new Error('Failed to load file details');
    
    // For now, redirect to file details page
    // TODO: Implement inline editing modal
    window.location.href = `/files/${fileId}`;
  } catch (error) {
    console.error('Error editing file:', error);
    alert('Failed to edit file: ' + error.message);
  }
}

/**
 * Delete file
 */
async function deleteFile(fileId, filename) {
  if (!confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone.`)) {
    return;
  }

  try {
    const response = await fetch(`/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();

    if (result.success) {
      // Show success message
      const alertHtml = `
        <div class="alert alert-success alert-dismissible fade show" role="alert">
          <i class="fas fa-check-circle"></i> File "${filename}" deleted successfully
          <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
      `;
      document.querySelector('.container-fluid').insertAdjacentHTML('afterbegin', alertHtml);
      
      // Reload page after short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      throw new Error(result.message || 'Delete failed');
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    alert('Failed to delete file: ' + error.message);
  }
}

/**
 * Utility Functions
 */

/**
 * Format file size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file type category
 */
function getFileCategory(mimeType) {
  if (!mimeType) return 'unknown';
  
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('application/') || mimeType.startsWith('text/')) return 'document';
  
  return 'unknown';
}

// Initialize file manager when DOM is loaded
let fileManager;
document.addEventListener('DOMContentLoaded', () => {
  fileManager = new FileManager();
  
  console.log('File management JavaScript loaded');
  
  // Add event listener for delete buttons
  document.addEventListener('click', (e) => {
    console.log('Click event triggered on:', e.target);
    
    if (e.target.closest('.delete-file-btn')) {
      console.log('Delete button clicked');
      e.preventDefault();
      const btn = e.target.closest('.delete-file-btn');
      const fileId = btn.dataset.fileId;
      const filename = btn.dataset.filename;
      console.log('File ID:', fileId, 'Filename:', filename);
      deleteFile(fileId, filename);
    }
  });
}); 