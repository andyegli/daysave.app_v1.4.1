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
  
  // Check for ongoing analysis every 10 seconds
  setInterval(checkOngoingAnalysis, 10000);
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
 */
async function loadAIIndicators(contentId) {
  try {
    const response = await fetch(`/content/${contentId}/analysis`);
    const result = await response.json();
    
    const indicatorContainer = document.getElementById(`ai-indicators-${contentId}`);
    if (!indicatorContainer) return;
    
    // Clear existing indicators
    indicatorContainer.innerHTML = '';
    
    if (result.success && result.status === 'completed') {
      const analysis = result.analysis;
      const indicators = [];
      
      // Transcription indicator and summary
      if (analysis.transcription && analysis.transcription.length > 0) {
        const wordCount = analysis.transcription.split(' ').length;
        indicators.push({
          icon: 'bi-file-text',
          color: 'bg-primary',
          text: `${wordCount}w`,
          title: `Transcription: ${wordCount} words`
        });
        
        // Show transcription summary in content card
        displayTranscriptionSummary(contentId, analysis.transcription, wordCount);
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
    const response = await fetch(`/content/${contentId}/analysis`);
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
  
  // Transcription
  if (analysis.transcription && analysis.transcription.length > 0) {
    const wordCount = analysis.transcription.split(' ').length;
    const sentences = analysis.transcription.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const estimatedReadingTime = Math.ceil(wordCount / 200); // Average reading speed: 200 words/minute
    
    html += `
      <div class="mb-4">
        <h6 class="fw-bold">
          <i class="bi bi-file-text me-2"></i>Full Transcription
        </h6>
        <div class="d-flex justify-content-between align-items-center mb-2">
          <div>
            <span class="badge bg-primary me-2">${wordCount} words</span>
            <span class="badge bg-secondary me-2">${sentences.length} sentences</span>
            <span class="badge bg-info">~${estimatedReadingTime} min read</span>
          </div>
          <button class="btn btn-sm btn-outline-primary" onclick="copyTranscriptionToClipboard()">
            <i class="bi bi-clipboard me-1"></i>Copy
          </button>
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
    
    if (indicatorContainer && indicatorContainer.children.length === 0) {
      // No indicators yet, check if analysis is complete
      await loadAIIndicators(contentId);
    }
  }
}

/**
 * Display transcription summary in content card
 * @param {string} contentId - Content ID
 * @param {string} transcription - Full transcription text
 * @param {number} wordCount - Number of words in transcription
 */
function displayTranscriptionSummary(contentId, transcription, wordCount) {
  const summaryContainer = document.getElementById(`transcription-summary-${contentId}`);
  if (!summaryContainer) return;
  
  // Show the summary container
  summaryContainer.style.display = 'block';
  
  // Create summary text (first 100 characters)
  const summaryText = transcription.length > 100 ? 
    transcription.substring(0, 100) + '...' : 
    transcription;
  
  // Update the summary content
  const transcriptionTextElement = summaryContainer.querySelector('.transcription-text');
  if (transcriptionTextElement) {
    transcriptionTextElement.textContent = summaryText;
    transcriptionTextElement.classList.remove('text-muted');
    transcriptionTextElement.classList.add('text-dark');
  }
  
  // Update the word count in the header
  const headerElement = summaryContainer.querySelector('.fw-semibold');
  if (headerElement) {
    headerElement.textContent = `Transcription Summary (${wordCount} words)`;
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
 * Copy transcription to clipboard
 */
function copyTranscriptionToClipboard() {
  const transcriptionContent = document.getElementById('transcriptionContent');
  if (!transcriptionContent) return;
  
  const text = transcriptionContent.textContent || transcriptionContent.innerText;
  
  if (navigator.clipboard && window.isSecureContext) {
    // Use modern clipboard API
    navigator.clipboard.writeText(text).then(() => {
      showCopySuccess();
    }).catch(err => {
      console.error('Failed to copy transcription:', err);
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
    showCopySuccess();
  } catch (err) {
    console.error('Failed to copy transcription:', err);
    alert('Failed to copy transcription. Please select and copy manually.');
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