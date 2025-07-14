/**
 * AI Analysis Display JavaScript
 * 
 * This file handles the display of AI analysis results for multimedia content
 * including transcriptions, sentiment analysis, thumbnails, speakers, and OCR results.
 * 
 * Features:
 * - Load AI analysis results from the server
 * - Display multimedia analysis indicators in content cards
 * - Show detailed analysis results in modal
 * - Handle thumbnails, transcriptions, and speaker identification
 * - Real-time status updates for ongoing analysis
 */

// AI Analysis functionality
document.addEventListener('DOMContentLoaded', function() {
  
  // Initialize AI analysis indicators for all content items
  initializeAIIndicators();
  
  // Handle AI analysis modal
  setupAIAnalysisModal();
  
  // Check for ongoing analysis every 5 seconds (more responsive)
  setInterval(checkOngoingAnalysis, 5000);
  
  // Track content items that are being analyzed
  window.analyzingContent = new Set();
  
  // Listen for new content additions to start monitoring
  setupContentAnalysisMonitoring();
});

/**
 * Initialize AI analysis indicators for all content items
 * Shows badges for available analysis results
 */
async function initializeAIIndicators() {
  const contentCards = document.querySelectorAll('[data-id]');
  
  for (const card of contentCards) {
    const contentId = card.getAttribute('data-id');
    if (contentId) {
      await loadAIIndicators(contentId);
    }
  }
}

/**
 * Load AI analysis indicators for a specific content item
 * @param {string} contentId - Content ID to load indicators for
 * @returns {boolean} - True if indicators were updated/added
 */
async function loadAIIndicators(contentId) {
  try {
    // Detect if this is a file or content item by checking the page context
    const isFilePage = window.location.pathname.includes('/files');
    const endpoint = isFilePage ? `/files/${contentId}/analysis` : `/content/${contentId}/analysis`;
    
    const response = await fetch(endpoint);
    const result = await response.json();
    
    const indicatorContainer = document.getElementById(`ai-indicators-${contentId}`);
    if (!indicatorContainer) return;
    
    // Clear existing indicators
    indicatorContainer.innerHTML = '';
    
    if (result.success && result.status === 'completed') {
      const analysis = result.analysis;
      const indicators = [];
      
      // Transcription/Description indicator and summary
      if (analysis.transcription && analysis.transcription.length > 0) {
        const wordCount = analysis.transcription.split(' ').length;
        
        // Use contentType from response if available, otherwise detect from metadata
        let contentType = result.contentType || 'video'; // default
        
        // Check if this is image analysis based on metadata or transcription content
        if (contentType === 'image' || 
            (analysis.metadata && analysis.metadata.imageAnalysis) ||
            (analysis.transcription.toLowerCase().includes('image') || 
             analysis.transcription.toLowerCase().includes('photo') ||
             analysis.transcription.toLowerCase().includes('picture'))) {
          contentType = 'image';
        } else if (contentType === 'audio' || 
                   (analysis.metadata && analysis.metadata.fileCategory === 'audio')) {
          contentType = 'audio';
        }
        
        // Set appropriate indicator based on content type
        let indicatorIcon, indicatorTitle;
        switch (contentType) {
          case 'image':
            indicatorIcon = 'bi-image';
            indicatorTitle = `Image Description: ${wordCount} words`;
            break;
          case 'audio':
            indicatorIcon = 'bi-mic';
            indicatorTitle = `Audio Transcription: ${wordCount} words`;
            break;
          case 'video':
          default:
            indicatorIcon = 'bi-file-text';
            indicatorTitle = `Video Transcription: ${wordCount} words`;
            break;
        }
        
        indicators.push({
          icon: indicatorIcon,
          color: 'bg-primary',
          text: `${wordCount}w`,
          title: indicatorTitle
        });
        
        // Show transcription/description summary in content card
        displayTranscriptionSummary(contentId, analysis.transcription, wordCount, contentType);
      }
      
      // Sentiment indicator
      if (analysis.sentiment && analysis.sentiment.label) {
        const sentimentColors = {
          'positive': 'bg-success',
          'negative': 'bg-danger',
          'neutral': 'bg-secondary'
        };
        const color = sentimentColors[analysis.sentiment.label] || 'bg-secondary';
        indicators.push({
          icon: 'bi-emoji-smile',
          color: color,
          text: analysis.sentiment.label.charAt(0).toUpperCase(),
          title: `Sentiment: ${analysis.sentiment.label} (${Math.round(analysis.sentiment.confidence * 100)}%)`
        });
      }
      
      // Thumbnails indicator
      if (result.thumbnails && result.thumbnails.length > 0) {
        indicators.push({
          icon: 'bi-image',
          color: 'bg-info',
          text: result.thumbnails.length,
          title: `${result.thumbnails.length} thumbnails generated`
        });
      }
      
      // Speakers indicator
      if (result.speakers && result.speakers.length > 0) {
        indicators.push({
          icon: 'bi-people',
          color: 'bg-warning',
          text: result.speakers.length,
          title: `${result.speakers.length} speakers identified`
        });
      }
      
      // OCR indicator
      if (result.ocr_captions && result.ocr_captions.length > 0) {
        indicators.push({
          icon: 'bi-eye',
          color: 'bg-dark',
          text: 'OCR',
          title: `${result.ocr_captions.length} text regions detected`
        });
      }
      
      // Language indicator
      if (analysis.language && analysis.language !== 'unknown') {
        indicators.push({
          icon: 'bi-translate',
          color: 'bg-secondary',
          text: analysis.language.toUpperCase(),
          title: `Language: ${analysis.language}`
        });
      }
      
      // Render indicators
      indicators.forEach(indicator => {
        const badge = document.createElement('span');
        badge.className = `badge ${indicator.color} d-flex align-items-center`;
        badge.style.fontSize = '0.7rem';
        badge.title = indicator.title;
        badge.innerHTML = `<i class="bi ${indicator.icon} me-1"></i>${indicator.text}`;
        indicatorContainer.appendChild(badge);
      });
      
      // Show AI analysis button if we have indicators
      const aiButton = document.querySelector(`.ai-analysis-btn[data-id="${contentId}"]`);
      if (aiButton) {
        if (indicators.length > 0) {
          aiButton.style.display = 'inline-block';
          aiButton.classList.remove('btn-outline-info');
          aiButton.classList.add('btn-info');
        } else {
          aiButton.style.display = 'none';
        }
      }
      
      return true; // Indicators were successfully loaded
      
    } else {
      // No analysis available (status is 'not_analyzed' or other)
      const noAnalysisBadge = document.createElement('span');
      noAnalysisBadge.className = 'badge bg-light text-dark';
      noAnalysisBadge.style.fontSize = '0.7rem';
      noAnalysisBadge.textContent = 'No AI analysis';
      indicatorContainer.appendChild(noAnalysisBadge);
      
      // Hide AI analysis button
      const aiButton = document.querySelector(`.ai-analysis-btn[data-id="${contentId}"]`);
      if (aiButton) {
        aiButton.style.display = 'none';
      }
      
      return false; // No analysis available
    }
    
  } catch (error) {
    console.error('Error loading AI indicators:', error);
    
    // Show error indicator
    const indicatorContainer = document.getElementById(`ai-indicators-${contentId}`);
    if (indicatorContainer) {
      indicatorContainer.innerHTML = '';
      const errorBadge = document.createElement('span');
      errorBadge.className = 'badge bg-light text-dark';
      errorBadge.style.fontSize = '0.7rem';
      errorBadge.textContent = 'No AI analysis';
      indicatorContainer.appendChild(errorBadge);
    }
    
    // Hide AI analysis button
    const aiButton = document.querySelector(`.ai-analysis-btn[data-id="${contentId}"]`);
    if (aiButton) {
      aiButton.style.display = 'none';
    }
    
    return false; // Error occurred
  }
}

/**
 * Setup AI Analysis Modal functionality
 */
function setupAIAnalysisModal() {
  const modal = document.getElementById('aiAnalysisModal');
  if (!modal) return;
  
  // Handle modal show event
  modal.addEventListener('show.bs.modal', function (event) {
    const button = event.relatedTarget;
    const contentId = button.getAttribute('data-id');
    
    if (contentId) {
      loadAIAnalysisModal(contentId);
    }
  });
}

/**
 * Load AI analysis results into the modal
 * @param {string} contentId - Content ID to load analysis for
 */
async function loadAIAnalysisModal(contentId) {
  const modalBody = document.getElementById('aiAnalysisModalBody');
  if (!modalBody) return;
  
  // Show loading state
  modalBody.innerHTML = `
    <div class="text-center">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-2">Loading AI analysis results...</p>
    </div>
  `;
  
  try {
    // Detect if this is a file or content item by checking the page context
    const isFilePage = window.location.pathname.includes('/files');
    const endpoint = isFilePage ? `/files/${contentId}/analysis` : `/content/${contentId}/analysis`;
    
    const response = await fetch(endpoint);
    const result = await response.json();
    
    if (result.success && result.status === 'completed') {
      renderAIAnalysisModal(result);
    } else {
      modalBody.innerHTML = `
        <div class="alert alert-info">
          <i class="bi bi-info-circle me-2"></i>
          No AI analysis results available for this content.
        </div>
      `;
    }
    
  } catch (error) {
    console.error('Error loading AI analysis:', error);
    modalBody.innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle me-2"></i>
        Error loading AI analysis results.
      </div>
    `;
  }
}

/**
 * Render AI analysis results in the modal
 * @param {Object} result - Analysis result object
 */
function renderAIAnalysisModal(result) {
  const modalBody = document.getElementById('aiAnalysisModalBody');
  const analysis = result.analysis;
  
  let html = '';
  
  // Analysis Overview
  html += `
    <div class="row mb-4">
      <div class="col-md-6">
        <h6 class="fw-bold">Analysis Overview</h6>
        <ul class="list-unstyled">
          <li><strong>Title:</strong> ${analysis.title || 'N/A'}</li>
          <li><strong>Duration:</strong> ${formatDuration(analysis.duration)}</li>
          <li><strong>Language:</strong> ${analysis.language || 'Unknown'}</li>
          <li><strong>Quality Score:</strong> ${analysis.quality_score || 'N/A'}/100</li>
        </ul>
      </div>
      <div class="col-md-6">
        <h6 class="fw-bold">Processing Stats</h6>
        <ul class="list-unstyled">
          <li><strong>Processing Time:</strong> ${formatProcessingTime(analysis.processing_time)}</li>
          <li><strong>Analyzed:</strong> ${formatDate(analysis.created_at)}</li>
        </ul>
      </div>
    </div>
  `;
  
  // Sentiment Analysis
  if (analysis.sentiment && analysis.sentiment.label) {
    const sentimentColor = getSentimentColor(analysis.sentiment.label);
    html += `
      <div class="mb-4">
        <h6 class="fw-bold">
          <i class="bi bi-emoji-smile me-2"></i>Sentiment Analysis
        </h6>
        <div class="d-flex align-items-center">
          <span class="badge ${sentimentColor} me-2">${analysis.sentiment.label.toUpperCase()}</span>
          <div class="progress flex-grow-1" style="height: 20px;">
            <div class="progress-bar ${sentimentColor.replace('bg-', 'bg-')}" 
                 role="progressbar" 
                 style="width: ${analysis.sentiment.confidence * 100}%"
                 aria-valuenow="${analysis.sentiment.confidence * 100}" 
                 aria-valuemin="0" 
                 aria-valuemax="100">
              ${Math.round(analysis.sentiment.confidence * 100)}%
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  // Summary with Edit and Copy functionality
  // Enhanced summary section with inline editing and copy-to-clipboard features
  html += `
    <div class="mb-4">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <h6 class="fw-bold mb-0">
          <i class="bi bi-file-earmark-text me-2"></i>Content Summary
        </h6>
        <div class="btn-group" role="group">
          <button class="btn btn-sm btn-outline-primary" onclick="copySummaryToClipboard()" title="Copy Summary">
            <i class="bi bi-clipboard me-1"></i>Copy
          </button>
          <button class="btn btn-sm btn-outline-secondary" onclick="editSummary('${result.analysis.id}')" title="Edit Summary">
            <i class="bi bi-pencil me-1"></i>Edit
          </button>
        </div>
      </div>
  `;
  
  if (analysis.summary && analysis.summary.length > 0) {
    html += `
      <div class="border rounded p-3 bg-light" id="summaryContent">
        <p class="mb-0 fst-italic" id="summaryText">${analysis.summary}</p>
      </div>
      <div class="d-none" id="summaryEditMode">
        <textarea class="form-control mb-2" id="summaryEditArea" rows="4" placeholder="Enter summary...">${analysis.summary}</textarea>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-success" onclick="saveSummary('${result.analysis.id}')">
            <i class="bi bi-check-lg me-1"></i>Save
          </button>
          <button class="btn btn-sm btn-secondary" onclick="cancelSummaryEdit()">
            <i class="bi bi-x-lg me-1"></i>Cancel
          </button>
        </div>
      </div>
    `;
  } else {
    html += `
      <div class="border rounded p-3 bg-light-subtle" id="summaryContent">
        <div class="text-center text-muted">
          <i class="bi bi-info-circle me-2"></i>
          <em>Summary not available</em>
        </div>
        <small class="text-muted d-block mt-2">
          AI summarization may not be available for this content type, 
          or the content may be too short to generate a meaningful summary.
        </small>
      </div>
      <div class="d-none" id="summaryEditMode">
        <textarea class="form-control mb-2" id="summaryEditArea" rows="4" placeholder="Enter summary..."></textarea>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-success" onclick="saveSummary('${result.analysis.id}')">
            <i class="bi bi-check-lg me-1"></i>Save
          </button>
          <button class="btn btn-sm btn-secondary" onclick="cancelSummaryEdit()">
            <i class="bi bi-x-lg me-1"></i>Cancel
          </button>
        </div>
      </div>
    `;
  }
  
  html += `</div>`;
  
  // Transcription/Image Description
  if (analysis.transcription && analysis.transcription.length > 0) {
    const wordCount = analysis.transcription.split(' ').length;
    const sentences = analysis.transcription.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const estimatedReadingTime = Math.ceil(wordCount / 200); // Average reading speed: 200 words/minute
    
    // Use contentType from response if available, otherwise detect from metadata
    let contentType = result.contentType || 'video'; // default
    let sectionTitle = 'Full Transcription';
    let sectionIcon = 'bi-file-text';
    
    // Determine content type and appropriate display
    if (contentType === 'image' || 
        (analysis.metadata && analysis.metadata.imageAnalysis) ||
        (analysis.transcription.toLowerCase().includes('image') || 
         analysis.transcription.toLowerCase().includes('photo') ||
         analysis.transcription.toLowerCase().includes('picture'))) {
      contentType = 'image';
      sectionTitle = 'AI Image Description';
      sectionIcon = 'bi-image';
    } else if (contentType === 'audio' || 
               (analysis.metadata && analysis.metadata.fileCategory === 'audio')) {
      contentType = 'audio';
      sectionTitle = 'Audio Transcription';
      sectionIcon = 'bi-mic';
    }
    
    html += `
      <div class="mb-4">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h6 class="fw-bold mb-0">
            <i class="${sectionIcon} me-2"></i>${sectionTitle}
          </h6>
          <button class="btn btn-sm btn-outline-primary" onclick="copyTranscriptionToClipboard()">
            <i class="bi bi-clipboard me-1"></i>Copy
          </button>
        </div>
        <div class="d-flex justify-content-between align-items-center mb-2">
          <div>
            <span class="badge bg-primary me-2">${wordCount} words</span>
            <span class="badge bg-secondary me-2">${sentences.length} ${contentType === 'image' ? 'segments' : 'sentences'}</span>
            <span class="badge bg-info">~${estimatedReadingTime} min read</span>
            ${contentType === 'image' ? '<span class="badge bg-warning ms-1">AI Generated</span>' : ''}
          </div>
        </div>
        <div class="border rounded p-3 bg-light" style="max-height: 300px; overflow-y: auto; line-height: 1.6;" id="transcriptionContent">
          <p class="mb-0">${analysis.transcription}</p>
        </div>
      </div>
    `;
  }
  
  // Thumbnails
  if (result.thumbnails && result.thumbnails.length > 0) {
    html += `
      <div class="mb-4">
        <h6 class="fw-bold">
          <i class="bi bi-image me-2"></i>Generated Thumbnails (${result.thumbnails.length})
        </h6>
        <div class="row g-2">
    `;
    
    result.thumbnails.slice(0, 8).forEach(thumbnail => {
      const keyMomentBadge = thumbnail.is_key_moment ? 
        '<span class="badge bg-warning position-absolute top-0 start-0 m-1">Key</span>' : '';
      
      html += `
        <div class="col-md-3 col-sm-4 col-6">
          <div class="position-relative">
            <img src="${thumbnail.url}" class="img-fluid rounded" alt="Thumbnail at ${formatTimestamp(thumbnail.timestamp)}">
            ${keyMomentBadge}
            <div class="position-absolute bottom-0 end-0 bg-dark text-white px-1 rounded-top-start" style="font-size: 0.7rem;">
              ${formatTimestamp(thumbnail.timestamp)}
            </div>
          </div>
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
  }
  
  // Speakers
  if (result.speakers && result.speakers.length > 0) {
    html += `
      <div class="mb-4">
        <h6 class="fw-bold">
          <i class="bi bi-people me-2"></i>Identified Speakers (${result.speakers.length})
        </h6>
        <div class="row g-2">
    `;
    
    result.speakers.forEach(speaker => {
      const confidenceColor = speaker.confidence > 0.8 ? 'success' : speaker.confidence > 0.6 ? 'warning' : 'danger';
      html += `
        <div class="col-md-6">
          <div class="card">
            <div class="card-body p-2">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <strong>${speaker.name || 'Unknown Speaker'}</strong>
                  <br>
                  <small class="text-muted">
                    ${speaker.gender || 'Unknown'} • ${speaker.language || 'Unknown'}
                  </small>
                </div>
                <span class="badge bg-${confidenceColor}">
                  ${Math.round(speaker.confidence * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
  }
  
  // OCR Captions
  if (result.ocr_captions && result.ocr_captions.length > 0) {
    html += `
      <div class="mb-4">
        <h6 class="fw-bold">
          <i class="bi bi-eye me-2"></i>Text Recognition (${result.ocr_captions.length} regions)
        </h6>
        <div class="border rounded p-3 bg-light" style="max-height: 150px; overflow-y: auto;">
    `;
    
    result.ocr_captions.forEach(ocr => {
      html += `
        <div class="d-flex justify-content-between align-items-center mb-1">
          <span>${ocr.text}</span>
          <small class="text-muted">${formatTimestamp(ocr.timestamp)}</small>
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
  }
  
  modalBody.innerHTML = html;
}

/**
 * Check for ongoing analysis and update indicators
 */
async function checkOngoingAnalysis() {
  const contentCards = document.querySelectorAll('[data-id]');
  
  for (const card of contentCards) {
    const contentId = card.getAttribute('data-id');
    const indicatorContainer = document.getElementById(`ai-indicators-${contentId}`);
    
    if (!indicatorContainer) continue;
    
    // Check if this content is being analyzed or has no indicators yet
    const hasNoIndicators = indicatorContainer.children.length === 0;
    const isBeingAnalyzed = window.analyzingContent && window.analyzingContent.has(contentId);
    
    if (hasNoIndicators || isBeingAnalyzed) {
      console.log(`🔄 Checking analysis status for content ${contentId}`);
      
      // Show loading indicator if being analyzed
      if (isBeingAnalyzed && hasNoIndicators) {
        showAnalysisLoadingIndicator(contentId);
      }
      
      // Check if analysis is complete
      const wasUpdated = await loadAIIndicators(contentId);
      
      // If analysis completed, remove from analyzing set and show success
      if (wasUpdated && isBeingAnalyzed) {
        window.analyzingContent.delete(contentId);
        showAnalysisCompletedNotification(contentId);
        
        // Refresh the content card to show updated data
        await refreshContentCard(contentId);
      }
    }
  }
}

/**
 * Display transcription summary in content card
 * Enhanced to handle both video transcriptions and image descriptions
 * @param {string} contentId - Content ID
 * @param {string} transcription - Full transcription text or image description
 * @param {number} wordCount - Number of words in transcription/description
 * @param {string} contentType - Type of content ('video', 'audio', 'image', or auto-detect)
 */
function displayTranscriptionSummary(contentId, transcription, wordCount, contentType = 'auto') {
  const summaryContainer = document.getElementById(`transcription-summary-${contentId}`);
  if (!summaryContainer) return;
  
  // Auto-detect content type if not specified
  if (contentType === 'auto') {
    if (transcription.includes('Image description') || transcription.includes('photo') || transcription.includes('picture')) {
      contentType = 'image';
    } else if (transcription.includes('Speaker') || transcription.includes('audio')) {
      contentType = 'audio';
    } else {
      contentType = 'video';
    }
  }
  
  // Show the summary container
  summaryContainer.style.display = 'block';
  
  // Create summary text (first 120 characters for better image descriptions)
  const maxLength = contentType === 'image' ? 120 : 100;
  const summaryText = transcription.length > maxLength ? 
    transcription.substring(0, maxLength) + '...' : 
    transcription;
  
  // Update the summary content
  const transcriptionTextElement = summaryContainer.querySelector('.transcription-text');
  if (transcriptionTextElement) {
    transcriptionTextElement.textContent = summaryText;
    transcriptionTextElement.classList.remove('text-muted');
    transcriptionTextElement.classList.add('text-dark');
  }
  
  // Update the header with appropriate content type
  const headerElement = summaryContainer.querySelector('.fw-semibold');
  const iconElement = summaryContainer.querySelector('i');
  
  if (headerElement && iconElement) {
    let headerText, iconClass;
    
    switch (contentType) {
      case 'image':
        headerText = `AI Image Description (${wordCount} words)`;
        iconClass = 'bi-image me-1 text-primary';
        break;
      case 'audio':
        headerText = `Audio Transcription (${wordCount} words)`;
        iconClass = 'bi-mic me-1 text-primary';
        break;
      case 'video':
      default:
        headerText = `Video Transcription (${wordCount} words)`;
        iconClass = 'bi-file-text me-1 text-primary';
        break;
    }
    
    headerElement.textContent = headerText;
    iconElement.className = iconClass;
  }
}

/**
 * Utility Functions
 */

function formatDuration(seconds) {
  if (!seconds || seconds === 0) return 'N/A';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatProcessingTime(ms) {
  if (!ms) return 'N/A';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString();
}

function formatTimestamp(seconds) {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getSentimentColor(sentiment) {
  const colors = {
    'positive': 'bg-success',
    'negative': 'bg-danger',
    'neutral': 'bg-secondary'
  };
  return colors[sentiment] || 'bg-secondary';
}

/**
 * Copy transcription/description content to clipboard
 * Handles both video transcriptions and image descriptions
 */
function copyTranscriptionToClipboard() {
  const transcriptionContent = document.getElementById('transcriptionContent');
  if (!transcriptionContent) return;
  
  const text = transcriptionContent.textContent || transcriptionContent.innerText;
  
  // Determine content type for appropriate success message
  let contentType = 'content';
  if (text.toLowerCase().includes('image') || text.toLowerCase().includes('photo') || text.toLowerCase().includes('picture')) {
    contentType = 'image description';
  } else if (text.toLowerCase().includes('speaker') || text.toLowerCase().includes('audio')) {
    contentType = 'transcription';
  } else {
    contentType = 'transcription';
  }
  
  if (navigator.clipboard && window.isSecureContext) {
    // Use modern clipboard API
    navigator.clipboard.writeText(text).then(() => {
      showCopySuccess(`${contentType.charAt(0).toUpperCase() + contentType.slice(1)} copied to clipboard!`);
    }).catch(err => {
      console.error(`Failed to copy ${contentType}:`, err);
      fallbackCopyToClipboard(text);
    });
  } else {
    // Fallback for older browsers
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
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  try {
    document.execCommand('copy');
    showCopySuccess('Summary copied to clipboard!');
  } catch (err) {
    console.error('Failed to copy content:', err);
    alert('Failed to copy content. Please select and copy manually.');
  }
  
  document.body.removeChild(textArea);
}

/**
 * Show copy success feedback
 */
function showCopySuccess() {
  const copyButton = document.querySelector('.btn-outline-primary');
  if (copyButton) {
    const originalText = copyButton.innerHTML;
    copyButton.innerHTML = '<i class="bi bi-check me-1"></i>Copied!';
    copyButton.classList.remove('btn-outline-primary');
    copyButton.classList.add('btn-success');
    
    setTimeout(() => {
      copyButton.innerHTML = originalText;
      copyButton.classList.remove('btn-success');
      copyButton.classList.add('btn-outline-primary');
    }, 2000);
  }
}

/**
 * Setup content analysis monitoring for new content
 */
function setupContentAnalysisMonitoring() {
  // Listen for form submissions that add new content
  const addContentForm = document.getElementById('addContentForm');
  if (addContentForm) {
    addContentForm.addEventListener('submit', function(e) {
      // When content is added, we'll get the content ID from the response
      // and start monitoring it for analysis completion
      console.log('🎬 New content being added, will monitor for analysis...');
    });
  }
}

/**
 * Show loading indicator for content being analyzed
 * @param {string} contentId - Content ID being analyzed
 */
function showAnalysisLoadingIndicator(contentId) {
  const indicatorContainer = document.getElementById(`ai-indicators-${contentId}`);
  if (!indicatorContainer) return;
  
  // Clear existing content and show loading spinner
  indicatorContainer.innerHTML = '';
  
  const loadingBadge = document.createElement('span');
  loadingBadge.className = 'badge bg-warning d-flex align-items-center';
  loadingBadge.style.fontSize = '0.7rem';
  loadingBadge.innerHTML = `
    <div class="spinner-border spinner-border-sm me-1" role="status" style="width: 12px; height: 12px;">
      <span class="visually-hidden">Loading...</span>
    </div>
    Analyzing...
  `;
  
  indicatorContainer.appendChild(loadingBadge);
}

/**
 * Show analysis completed notification
 * @param {string} contentId - Content ID that completed analysis
 */
function showAnalysisCompletedNotification(contentId) {
  console.log(`✅ Analysis completed for content ${contentId}`);
  
  // Create a temporary success notification
  const toast = document.createElement('div');
  toast.className = 'alert alert-success position-fixed';
  toast.style.cssText = 'top: 80px; right: 20px; z-index: 9999; opacity: 0.95; max-width: 300px;';
  toast.innerHTML = `
    <div class="d-flex align-items-center">
      <i class="bi bi-check-circle-fill me-2"></i>
      <div>
        <strong>Analysis Complete!</strong><br>
        <small>Transcription and sentiment analysis ready</small>
      </div>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 5000);
}

/**
 * Refresh content card to show updated analysis data
 * @param {string} contentId - Content ID to refresh
 */
async function refreshContentCard(contentId) {
  try {
    console.log(`🔄 Refreshing content card ${contentId}`);
    
    // Find the content card
    const contentCard = document.querySelector(`[data-id="${contentId}"]`);
    if (!contentCard) {
      console.log(`❌ Content card not found for ${contentId}`);
      return;
    }
    
    // Add a subtle animation to indicate refresh
    contentCard.style.transition = 'transform 0.3s ease';
    contentCard.style.transform = 'scale(1.02)';
    
    setTimeout(() => {
      contentCard.style.transform = 'scale(1)';
    }, 300);
    
    // Refresh the analysis indicators and transcription summary
    await loadAIIndicators(contentId);
    
    // Get updated content data from server
    try {
      const response = await fetch(`/content/${contentId}/analysis`);
      const result = await response.json();
      
      if (result.success && result.status === 'completed' && result.analysis) {
        const analysis = result.analysis;
        
        // Update title if it has changed
        const titleElement = contentCard.querySelector('.card-title');
        if (titleElement && analysis.title && analysis.title !== 'Content Analysis') {
          titleElement.textContent = analysis.title;
          titleElement.title = analysis.title;
        }
        
        // Update thumbnail if available
        const thumbnailContainer = contentCard.querySelector('.flex-shrink-0');
        if (thumbnailContainer && analysis.metadata && analysis.metadata.thumbnail) {
          const existingImage = thumbnailContainer.querySelector('img');
          if (existingImage) {
            existingImage.src = analysis.metadata.thumbnail;
          } else {
            // Replace icon with thumbnail
            const link = thumbnailContainer.querySelector('a');
            if (link) {
              link.innerHTML = `<img src="${analysis.metadata.thumbnail}" class="img-fluid" alt="Thumbnail">`;
            }
          }
        }
        
        // Update auto tags if available
        const tagsContainer = contentCard.querySelector('.d-flex.flex-wrap.gap-1');
        if (tagsContainer && analysis.auto_tags && analysis.auto_tags.length > 0) {
          // Find existing auto tags and update them
          const existingAutoTags = tagsContainer.querySelectorAll('.badge.bg-info');
          
          // Remove old auto tags
          existingAutoTags.forEach(tag => tag.remove());
          
          // Add new auto tags
          analysis.auto_tags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'badge bg-info';
            tagElement.textContent = tag;
            tagsContainer.appendChild(tagElement);
          });
        }
        
        // Update category display if available
        if (analysis.category) {
          // Add category badge if not exists
          const categoryBadge = document.createElement('span');
          categoryBadge.className = 'badge bg-warning';
          categoryBadge.textContent = analysis.category;
          const tagsContainer = contentCard.querySelector('.d-flex.flex-wrap.gap-1');
          if (tagsContainer) {
            tagsContainer.appendChild(categoryBadge);
          }
        }
        
        console.log(`✅ Content card ${contentId} refreshed with new data`);
      }
    } catch (error) {
      console.error(`❌ Error fetching updated content data for ${contentId}:`, error);
    }
    
    console.log(`✅ Content card ${contentId} refreshed`);
    
  } catch (error) {
    console.error(`❌ Error refreshing content card ${contentId}:`, error);
  }
}

/**
 * Start monitoring content analysis progress
 * @param {string} contentId - Content ID to monitor
 */
function startMonitoringContentAnalysis(contentId) {
  // Check every 5 seconds
  const interval = setInterval(async () => {
    const status = await checkOngoingAnalysis();
    if (status.completed.includes(contentId)) {
      clearInterval(interval);
      showAnalysisCompletedNotification(contentId);
      await refreshContentCard(contentId);
    }
  }, 5000);
}

/**
 * Summary Management Functions
 * Enhanced functionality for AI-generated content summaries
 */

/**
 * Copy summary content to clipboard
 * Handles both modern clipboard API and fallback methods
 * @returns {void}
 */
function copySummaryToClipboard() {
  const summaryText = document.getElementById('summaryText');
  if (!summaryText) {
    alert('No summary available to copy');
    return;
  }
  
  const text = summaryText.textContent || summaryText.innerText;
  
  // Get the copy button for visual feedback
  const copyButton = document.querySelector('button[onclick="copySummaryToClipboard()"]');
  
  if (navigator.clipboard && window.isSecureContext) {
    // Use modern clipboard API for secure contexts
    navigator.clipboard.writeText(text).then(() => {
      showCopySuccess('Summary copied to clipboard!');
      showButtonCopyFeedback(copyButton);
    }).catch(err => {
      console.error('Failed to copy summary:', err);
      fallbackCopyToClipboard(text);
      showButtonCopyFeedback(copyButton);
    });
  } else {
    // Fallback for older browsers or non-secure contexts
    fallbackCopyToClipboard(text);
    showButtonCopyFeedback(copyButton);
  }
}

/**
 * Show visual feedback on the copy button
 * @param {HTMLElement} button - The copy button element
 */
function showButtonCopyFeedback(button) {
  if (!button) return;
  
  const originalHTML = button.innerHTML;
  const originalClasses = button.className;
  
  // Change button appearance to show success
  button.innerHTML = '<i class="bi bi-check-lg me-1"></i>Copied!';
  button.className = button.className.replace('btn-outline-primary', 'btn-success');
  button.disabled = true;
  
  // Reset button after 2 seconds
  setTimeout(() => {
    button.innerHTML = originalHTML;
    button.className = originalClasses;
    button.disabled = false;
  }, 2000);
}

/**
 * Enter edit mode for summary
 * Switches from display mode to inline editing mode
 * @param {string} contentId - Content ID being edited
 * @returns {void}
 */
function editSummary(contentId) {
  const summaryContent = document.getElementById('summaryContent');
  const summaryEditMode = document.getElementById('summaryEditMode');
  
  if (summaryContent && summaryEditMode) {
    // Switch to edit mode
    summaryContent.classList.add('d-none');
    summaryEditMode.classList.remove('d-none');
    
    // Focus on textarea and position cursor at end
    const textarea = document.getElementById('summaryEditArea');
    if (textarea) {
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }
  }
}

/**
 * Cancel summary edit mode
 * Returns to display mode without saving changes
 * @returns {void}
 */
function cancelSummaryEdit() {
  const summaryContent = document.getElementById('summaryContent');
  const summaryEditMode = document.getElementById('summaryEditMode');
  
  if (summaryContent && summaryEditMode) {
    // Switch back to display mode
    summaryContent.classList.remove('d-none');
    summaryEditMode.classList.add('d-none');
    
    // Reset textarea to original value
    const textarea = document.getElementById('summaryEditArea');
    const originalText = document.getElementById('summaryText');
    if (textarea && originalText) {
      textarea.value = originalText.textContent || originalText.innerText || '';
    }
  }
}

/**
 * Save summary changes to database
 * Persists edited summary content and updates UI
 * @param {string} contentId - Content ID to update
 * @returns {Promise<void>}
 */
async function saveSummary(contentId) {
  const textarea = document.getElementById('summaryEditArea');
  if (!textarea) return;
  
  const newSummary = textarea.value.trim();
  
  try {
    // Detect if this is a file or content item by checking the page context
    const isFilePage = window.location.pathname.includes('/files');
    const endpoint = isFilePage ? `/files/${contentId}` : `/content/${contentId}`;
    
    // Send PUT request to update content or file
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: newSummary
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Update the display with new summary
      const summaryText = document.getElementById('summaryText');
      const summaryContent = document.getElementById('summaryContent');
      
      if (newSummary) {
        // Update existing summary
        summaryText.textContent = newSummary;
        summaryContent.innerHTML = `<p class="mb-0 fst-italic" id="summaryText">${newSummary}</p>`;
      } else {
        // Show placeholder when summary is empty
        summaryContent.innerHTML = `
          <div class="text-center text-muted">
            <i class="bi bi-info-circle me-2"></i>
            <em>Summary not available</em>
          </div>
          <small class="text-muted d-block mt-2">
            AI summarization may not be available for this content type, 
            or the content may be too short to generate a meaningful summary.
          </small>
        `;
      }
      
      // Exit edit mode
      cancelSummaryEdit();
      
      // Show success feedback
      showCopySuccess('Summary updated successfully!');
      
    } else {
      throw new Error(result.error || 'Failed to update summary');
    }
    
  } catch (error) {
    console.error('Error updating summary:', error);
    alert('Failed to update summary. Please try again.');
  }
}

/**
 * Enhanced copy success notification
 * Shows a dismissible toast notification for user feedback
 * @param {string} message - Message to display (default: 'Copied to clipboard!')
 * @returns {void}
 */
function showCopySuccess(message = 'Copied to clipboard!') {
  // Remove existing success message to prevent duplicates
  const existing = document.querySelector('.copy-success-toast');
  if (existing) {
    existing.remove();
  }
  
  // Create new success toast notification
  const toast = document.createElement('div');
  toast.className = 'copy-success-toast position-fixed top-0 end-0 m-3 alert alert-success alert-dismissible fade show';
  toast.style.zIndex = '9999';
  toast.innerHTML = `
    <i class="bi bi-check-circle me-2"></i>
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  document.body.appendChild(toast);
  
  // Auto-remove toast after 3 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.remove();
    }
  }, 3000);
}

/**
 * Copy content summary from content card
 * Copies the transcription summary text from the content card to clipboard
 * @param {string} contentId - Content ID to copy summary from
 * @returns {void}
 */
function copyContentSummary(contentId) {
  const summaryContainer = document.getElementById(`transcription-summary-${contentId}`);
  if (!summaryContainer) {
    alert('No summary available to copy');
    return;
  }
  
  const transcriptionText = summaryContainer.querySelector('.transcription-text');
  if (!transcriptionText) {
    alert('No summary text found');
    return;
  }
  
  const text = transcriptionText.textContent || transcriptionText.innerText;
  
  // Don't copy loading text
  if (text.includes('Loading transcription')) {
    alert('Summary is still loading, please wait...');
    return;
  }
  
  if (navigator.clipboard && window.isSecureContext) {
    // Use modern clipboard API for secure contexts
    navigator.clipboard.writeText(text).then(() => {
      showCopySuccess('Content summary copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy content summary:', err);
      fallbackCopyToClipboard(text);
    });
  } else {
    // Fallback for older browsers or non-secure contexts
    fallbackCopyToClipboard(text);
  }
} 