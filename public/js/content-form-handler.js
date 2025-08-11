/**
 * Content Form Handler with Progress Tracking
 * 
 * Handles content submission and triggers progress tracking for real-time feedback
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('📝 Content form handler loaded');
    
    const addContentForm = document.getElementById('addContentForm');
    const contentUrlInput = document.getElementById('contentUrl');
    const bulkUrlsTextarea = document.getElementById('bulkContentUrls');
    
    if (addContentForm) {
        addContentForm.addEventListener('submit', handleContentSubmission);
    }
    
    // Handle content form submission with progress tracking
    async function handleContentSubmission(event) {
        event.preventDefault();
        
        const formData = new FormData(addContentForm);
        const url = formData.get('url');
        const bulkUrls = formData.get('bulk_urls');
        
        // Check if this is a URL submission (not file upload)
        const isUrlSubmission = url && url.trim() !== '';
        const isBulkSubmission = bulkUrls && bulkUrls.trim() !== '';
        
        if (isUrlSubmission || isBulkSubmission) {
            console.log('📊 URL submission detected - enabling progress tracking');
            
            // Show submission feedback
            showSubmissionFeedback('Starting content analysis...', 'info');
            
            // For single URL submissions, especially YouTube
            if (isUrlSubmission && isYouTubeUrl(url)) {
                console.log('🎬 YouTube URL detected - will show detailed progress');
                showSubmissionFeedback('YouTube video detected - starting comprehensive analysis...', 'warning');
            }
        }
        
        try {
            // Submit the form normally
            const response = await fetch(addContentForm.action, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (response.ok) {
                // Success - hide modal and show success message
                const modal = bootstrap.Modal.getInstance(document.getElementById('addContentModal'));
                if (modal) modal.hide();
                
                showSuccessMessage('Content submitted successfully! Processing in background...');
                
                // If we have an operation ID, subscribe to progress updates
                if (result.operationId && window.progressTracker) {
                    window.progressTracker.subscribeToOperation(result.operationId);
                    
                    // Emit custom event for operation start
                    document.dispatchEvent(new CustomEvent('operationStarted', {
                        detail: { operationId: result.operationId }
                    }));
                }
                
                // Reset form
                addContentForm.reset();
                
                // Refresh the page after a short delay to show new content
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
                
            } else {
                showSubmissionFeedback(`Error: ${result.error || 'Submission failed'}`, 'danger');
            }
            
        } catch (error) {
            console.error('❌ Form submission error:', error);
            showSubmissionFeedback(`Error: ${error.message}`, 'danger');
        }
    }
    
    // Check if URL is a YouTube URL
    function isYouTubeUrl(url) {
        return url && (url.includes('youtube.com') || url.includes('youtu.be'));
    }
    
    // Show submission feedback in the modal
    function showSubmissionFeedback(message, type) {
        const alertDiv = document.getElementById('addContentAlert');
        if (alertDiv) {
            alertDiv.className = `alert alert-${type}`;
            alertDiv.innerHTML = `
                <div class="d-flex align-items-center">
                    <div class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
                    <div>${message}</div>
                </div>
            `;
            alertDiv.classList.remove('d-none');
        }
    }
    
    // Show success message outside modal
    function showSuccessMessage(message) {
        // Create or update success toast
        let toast = document.getElementById('contentSuccessToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'contentSuccessToast';
            toast.className = 'toast position-fixed top-0 end-0 m-3';
            toast.style.zIndex = '9999';
            toast.innerHTML = `
                <div class="toast-header bg-success text-white">
                    <i class="bi bi-check-circle-fill me-2"></i>
                    <strong class="me-auto">Content Submitted</strong>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            `;
            document.body.appendChild(toast);
        } else {
            toast.querySelector('.toast-body').textContent = message;
        }
        
        // Show the toast
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    }
    
    // Enhanced URL validation with progress hints
    if (contentUrlInput) {
        contentUrlInput.addEventListener('input', function() {
            const url = this.value.trim();
            
            if (isYouTubeUrl(url)) {
                // Show helpful hint for YouTube URLs
                showUrlTypeHint('YouTube video detected - will include transcription analysis', 'warning');
            } else if (url && (url.includes('instagram.com') || url.includes('tiktok.com') || url.includes('twitter.com'))) {
                showUrlTypeHint('Social media content detected', 'info');
            } else if (url && url.length > 10) {
                showUrlTypeHint('URL content will be analyzed for metadata and content', 'secondary');
            } else {
                hideUrlTypeHint();
            }
        });
    }
    
    // Show URL type hint
    function showUrlTypeHint(message, type) {
        let hint = document.getElementById('urlTypeHint');
        if (!hint) {
            hint = document.createElement('div');
            hint.id = 'urlTypeHint';
            hint.className = 'form-text';
            contentUrlInput.parentNode.appendChild(hint);
        }
        
        hint.innerHTML = `<span class="badge bg-${type} me-1">${message}</span>`;
        hint.style.display = 'block';
    }
    
    // Hide URL type hint
    function hideUrlTypeHint() {
        const hint = document.getElementById('urlTypeHint');
        if (hint) {
            hint.style.display = 'none';
        }
    }
    
    console.log('✅ Content form handler initialized with progress tracking');
});
