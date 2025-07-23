/**
 * Enhanced Status Button System
 * Handles progressive status updates (waiting → processing → analysed/incomplete)
 */

$(document).ready(function() {
  console.log('🔄 Status Button System: Initializing...');
  initializeStatusButtons();
});

function initializeStatusButtons() {
  console.log('🔄 Initializing enhanced status buttons...');
  
  // Initialize all status buttons
  $('.analysis-status-btn').each(function() {
    const contentId = $(this).data('id');
    const itemType = $(this).data('item-type');
    
    if (contentId) {
      console.log(`🔍 Updating status for ${itemType} ${contentId.substring(0,8)}...`);
      updateStatusButton(contentId, itemType);
    }
  });
  
  // Handle status button clicks
  $('.analysis-status-btn').off('click').on('click', function(e) {
    e.preventDefault();
    const contentId = $(this).data('id');
    const itemType = $(this).data('item-type');
    
    if (contentId) {
      showAnalysisProgress(contentId, itemType);
    }
  });
}

function updateStatusButton(contentId, itemType) {
  const endpoint = itemType === 'file' ? `/files/${contentId}/analysis` : `/content/api/${contentId}/status`;
  
  // Use HTTP for localhost to avoid SSL errors
  const url = window.location.hostname === 'localhost' ? 
    `http://localhost:${window.location.port || 3000}${endpoint}` : 
    endpoint;
  
  $.ajax({
    url: url,
    type: 'GET',
    timeout: 10000,
    success: function(response) {
      if (response.success) {
        const status = response.status;
        const progress = response.progress || 0;
        
        // Store analysis data for modal display
        const $button = $(`#status-btn-${contentId}`);
        $button.data('analysis-response', response);
        
        setStatusButtonState(contentId, status, progress);
        console.log(`✅ Status updated for ${contentId.substring(0,8)}: ${status} (${progress}%)`);
        
        // If still processing or waiting, check again in a few seconds
        if (status === 'processing' || status === 'waiting') {
          setTimeout(() => {
            updateStatusButton(contentId, itemType);
          }, 4000); // Check again in 4 seconds
        }
      } else {
        setStatusButtonState(contentId, 'waiting', 0);
        console.log(`⚠️ No analysis data for ${contentId.substring(0,8)}, setting to waiting`);
      }
    },
    error: function(xhr, status, error) {
      console.log(`❌ Failed to check status for ${contentId.substring(0,8)}: ${error}`);
      // For 404 errors (content not found), assume it's analysed
      if (xhr.status === 404) {
        setStatusButtonState(contentId, 'analysed', 100);
      } else {
        setStatusButtonState(contentId, 'waiting', 0);
      }
    }
  });
}

function setStatusButtonState(contentId, status, progress = 0) {
  const button = $(`#status-btn-${contentId}`);
  const statusText = button.find('.status-text');
  const progressFill = button.find('.progress-fill');
  
  if (button.length === 0) {
    console.log(`⚠️ Status button not found for ${contentId}`);
    return;
  }
  
  // Reset all classes
  button.removeClass('waiting processing analysed incomplete');
  
  switch (status) {
    case 'waiting':
    case 'not_analyzed':
      button.addClass('waiting');
      statusText.text('Waiting');
      progressFill.css('width', '0%');
      break;
      
    case 'processing':
    case 'pending':
      button.addClass('processing');
      statusText.text(`Processing ${Math.round(progress)}%`);
      progressFill.css('width', `${progress}%`);
      break;
      
    case 'completed':
    case 'analysed':
      button.addClass('analysed');
      statusText.text('Analysed');
      progressFill.css('width', '100%');
      break;
      
    case 'failed':
    case 'error':
      button.addClass('incomplete');
      statusText.text('Incomplete');
      progressFill.css('width', '0%');
      break;
      
    default:
      button.addClass('waiting');
      statusText.text('Unknown');
      progressFill.css('width', '0%');
  }
  
  console.log(`📊 Set status for ${contentId.substring(0,8)}: ${status} (${progress}%)`);
}

function showAnalysisProgress(contentId, itemType) {
  // Show loading state
  $('#progressModalContent').html(`
    <div class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-2">Loading analysis details...</p>
    </div>
  `);
  
  // Try to get cached data from button first
  const $button = $(`#status-btn-${contentId}`);
  const cachedResponse = $button.data('analysis-response');
  
  if (cachedResponse) {
    displayAnalysisSteps(cachedResponse, itemType);
    return;
  }
  
  // Otherwise fetch fresh data
  const endpoint = itemType === 'file' ? `/files/${contentId}/analysis` : `/content/api/${contentId}/status`;
  
  // Use HTTP for localhost to avoid SSL errors
  const url = window.location.hostname === 'localhost' ? 
    `http://localhost:${window.location.port || 3000}${endpoint}` : 
    endpoint;
  
  $.ajax({
    url: url,
    type: 'GET',
    success: function(response) {
      if (response.success) {
        displayAnalysisSteps(response, itemType);
      } else {
        displayError('No analysis data available');
      }
    },
    error: function() {
      displayError('Failed to load analysis details');
    }
  });
}

function displayAnalysisSteps(data, itemType) {
  let steps = [];
  
  // Check if this is the new status API format or the old analysis format
  if (data.features && Array.isArray(data.features)) {
    // New status API format
    steps = data.features.map(feature => ({
      name: feature.name,
      completed: feature.completed,
      icon: getFeatureIcon(feature.name)
    }));
  } else {
    // Old analysis format (for files)
    steps = [
      { name: 'Content Download', completed: !!data.analysis, icon: 'bi-download' },
      { name: 'Media Processing', completed: !!data.analysis?.duration, icon: 'bi-gear' },
      { name: 'AI Transcription', completed: !!data.analysis?.transcription, icon: 'bi-mic' },
      { name: 'AI Summary', completed: !!data.analysis?.description || !!data.analysis?.summary, icon: 'bi-text-paragraph' },
      { name: 'Thumbnail Generation', completed: !!data.thumbnails?.length, icon: 'bi-images' },
      { name: 'Tag Generation', completed: !!data.auto_tags?.length, icon: 'bi-tags' },
      { name: 'Sentiment Analysis', completed: !!data.analysis?.sentiment, icon: 'bi-emoji-smile' }
    ];
  }

  let html = `
    <div class="row">
      <div class="col-md-6">
        <h6 class="fw-bold mb-3">Analysis Steps</h6>
        <div class="list-group">
  `;

  steps.forEach(step => {
    const icon = step.completed ? 'bi-check-circle-fill text-success' : 'bi-x-circle text-danger';
    html += `
      <div class="list-group-item d-flex align-items-center">
        <i class="${icon} me-2"></i>
        <i class="${step.icon} me-2 text-muted"></i>
        <span>${step.name}</span>
      </div>
    `;
  });

  html += `
        </div>
      </div>
      <div class="col-md-6">
        <h6 class="fw-bold mb-3">Analysis Results</h6>
        <div class="small">
          <p><strong>Status:</strong> <span class="badge bg-${getStatusBadgeClass(data.status)}">${data.status}</span></p>
          <p><strong>Progress:</strong> ${data.progress || 0}%</p>
  `;

  // Add details based on data format
  if (data.analysis) {
    if (data.analysis.transcriptionLength > 0) {
      html += `<p><strong>Transcription:</strong> ${data.analysis.transcriptionLength} characters</p>`;
    }
    if (data.analysis.summaryLength > 0) {
      html += `<p><strong>Summary:</strong> ${data.analysis.summaryLength} characters</p>`;
    }
    if (data.analysis.tagCount > 0) {
      html += `<p><strong>Tags:</strong> ${data.analysis.tagCount} generated</p>`;
    }
    if (data.analysis.thumbnailCount > 0) {
      html += `<p><strong>Thumbnails:</strong> ${data.analysis.thumbnailCount} generated</p>`;
    }
  } else {
    // Old format
    if (data.analysis?.title) {
      html += `<p><strong>Title:</strong> ${data.analysis.title}</p>`;
    }
    if (data.mediaType) {
      html += `<p><strong>Media Type:</strong> ${data.mediaType}</p>`;
    }
    if (data.thumbnails?.length) {
      html += `<p><strong>Thumbnails:</strong> ${data.thumbnails.length} generated</p>`;
    }
    if (data.analysis?.processing_time) {
      html += `<p><strong>Processing Time:</strong> ${formatProcessingTime(data.analysis.processing_time)}</p>`;
    }
  }

  html += `
        </div>
      </div>
    </div>
  `;

  $('#progressModalContent').html(html);
}

function getFeatureIcon(featureName) {
  const iconMap = {
    'Download': 'bi-download',
    'Processing': 'bi-gear',
    'Transcription': 'bi-mic',
    'Summary': 'bi-text-paragraph',
    'Thumbnails': 'bi-images',
    'Tags': 'bi-tags',
    'Sentiment': 'bi-emoji-smile',
    'Title': 'bi-file-text'
  };
  return iconMap[featureName] || 'bi-check-circle';
}

function displayError(message) {
  $('#progressModalContent').html(`
    <div class="alert alert-warning">
      <i class="bi bi-exclamation-triangle me-2"></i>
      ${message}
    </div>
  `);
}

function getStatusBadgeClass(status) {
  switch (status?.toLowerCase()) {
    case 'completed': return 'success';
    case 'processing': return 'warning';
    case 'pending': return 'info';
    case 'failed': return 'danger';
    default: return 'secondary';
  }
}

function formatProcessingTime(timeMs) {
  if (!timeMs) return 'Unknown';
  const seconds = Math.round(timeMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
} 