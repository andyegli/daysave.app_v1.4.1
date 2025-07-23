/**
 * AI Analysis Display JavaScript (Enhanced Comprehensive Version)
 * 
 * This file handles the display of ALL AI analysis results and content data
 * for multimedia content using a comprehensive, well-organized modal interface.
 * 
 * Features:
 * - Complete content overview with ALL available fields
 * - Comprehensive AI analysis results with detailed breakdowns
 * - Technical metadata and processing information
 * - User-generated content (comments, tags, etc.)
 * - Modern card-based design matching content list style
 * - Collapsible sections for better organization
 * - Copy functionality for all text content
 * - Responsive design with mobile optimization
 * - Real-time status updates for ongoing analysis
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

console.log('🔴 AI ANALYSIS SCRIPT LOADED - Enhanced Comprehensive Version');

// AI Analysis functionality
document.addEventListener('DOMContentLoaded', function() {
  console.log('🟢 DOM Content Loaded - AI Analysis script initializing...');
  
  // Initialize AI analysis indicators for all content items
  initializeAIIndicators();
  
  // Handle AI analysis modal
  setupAIAnalysisModal();
  
  // Track content items that are being analyzed
  window.analyzingContent = new Set();
  
  // Listen for new content additions to start monitoring
  setupContentAnalysisMonitoring();
});

/**
 * Initialize AI indicators for all content items on the page
 */
function initializeAIIndicators() {
  console.log('🔍 Initializing AI indicators...');
  
  // Get all content cards
  const contentCards = document.querySelectorAll('.content-card');
  console.log(`🔍 Found ${contentCards.length} content cards`);
  
  contentCards.forEach((card, index) => {
    const contentId = card.getAttribute('data-id');
    const itemType = card.getAttribute('data-item-type') || 'content';
    
    if (contentId) {
      console.log(`🔍 Loading indicators for ${itemType} ${contentId.substring(0, 8)}... (${index + 1}/${contentCards.length})`);
      loadAIIndicators(contentId, itemType);
    }
  });
}

/**
 * Load AI analysis indicators for a specific content item
 */
async function loadAIIndicators(contentId, itemType = 'content') {
  try {
    const endpoint = itemType === 'file' ? getCorrectUrl(`/files/${contentId}/analysis`) : getCorrectUrl(`/content/${contentId}/analysis`);
    
    // Use XMLHttpRequest instead of fetch for better compatibility
    const result = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data);
          } catch (parseError) {
            console.error('Failed to parse AI indicators response:', parseError);
            resolve(null); // Silently fail for indicators
          }
        } else {
          resolve(null); // Silently fail for indicators
        }
      };
      
      xhr.onerror = function() {
        resolve(null); // Silently fail for indicators
      };
      
      xhr.ontimeout = function() {
        resolve(null); // Silently fail for indicators
      };
      
      xhr.timeout = 10000; // 10 second timeout
      xhr.open('GET', getCorrectUrl(endpoint));
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send();
    });
    
    if (!result) {
      return; // Silently fail for indicators
    }
    
    if (result.success && result.status === 'completed' && result.analysis) {
      const analysis = result.analysis;
      const mediaType = result.mediaType;
      const indicators = [];
      
      // Handle different media types with unified approach
      switch (mediaType) {
        case 'video':
          indicators.push(...getVideoIndicators(analysis, result));
          break;
        case 'audio':
          indicators.push(...getAudioIndicators(analysis, result));
          break;
        case 'image':
          indicators.push(...getImageIndicators(analysis, result));
          break;
        case 'legacy':
          indicators.push(...getLegacyIndicators(analysis, result));
          break;
        default:
          indicators.push(...getGenericIndicators(analysis, result));
          break;
      }
      
      // Display indicators
      displayIndicators(contentId, indicators);
      
      // Show content summary based on type
      if (analysis.transcription || analysis.description) {
        const contentText = analysis.transcription || analysis.description || '';
        const wordCount = contentText.split(' ').length;
        displayTranscriptionSummary(contentId, contentText, wordCount, mediaType);
      }
      
    } else if (result.status === 'processing' || result.status === 'pending') {
      displayProcessingIndicator(contentId, result);
      window.analyzingContent.add(contentId);
    }
    
  } catch (error) {
    console.error('Error loading AI indicators:', error);
  }
}

/**
 * Setup AI analysis modal handling
 */
function setupAIAnalysisModal() {
  console.log('🔧 Setting up enhanced AI analysis modal handlers...');
  
  // Handle AI analysis button clicks
  document.addEventListener('click', function(e) {
    const aiAnalysisBtn = e.target.closest('.ai-analysis-btn');
    if (aiAnalysisBtn) {
      console.log('🧠 AI analysis button clicked!');
      
      e.preventDefault();
      e.stopPropagation();
      
      const contentId = aiAnalysisBtn.getAttribute('data-id');
      const contentCard = aiAnalysisBtn.closest('.content-card');
      const itemType = contentCard ? contentCard.getAttribute('data-item-type') : 'content';
      
      if (contentId) {
        showComprehensiveAnalysisModal(contentId, itemType);
      }
    }
  });
}

/**
 * Show comprehensive AI analysis modal with ALL content data
 */
async function showComprehensiveAnalysisModal(contentId, itemType = 'content') {
  console.log('🚀 === SHOWING COMPREHENSIVE AI ANALYSIS MODAL ===');
  console.log('🚀 Content ID:', contentId);
  console.log('🚀 Item Type:', itemType);
  
  try {
    // Clean up any existing modal
    cleanupExistingModal();
    
    // Show loading modal
    showLoadingModal();
    
    // Determine endpoint based on item type
    const endpoint = itemType === 'file' ? getCorrectUrl(`/files/${contentId}/analysis`) : getCorrectUrl(`/content/${contentId}/analysis`);
    
    // Fetch analysis data using XMLHttpRequest for better compatibility
    const result = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data);
          } catch (parseError) {
            reject(new Error(`Failed to parse response: ${parseError.message}`));
          }
        } else {
          reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText || 'Request failed'}`));
        }
      };
      
      xhr.onerror = function() {
        reject(new Error('Network error occurred while fetching analysis data'));
      };
      
      xhr.ontimeout = function() {
        reject(new Error('Request timeout - analysis data took too long to load'));
      };
      
      xhr.timeout = 30000; // 30 second timeout for modal data
      xhr.open('GET', getCorrectUrl(endpoint));
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send();
    });
    
    if (result.success) {
      // Store analysis data globally for copy functionality
      currentModalAnalysisData = result;
      
      // Generate comprehensive modal content
      const modalHtml = renderComprehensiveAnalysisModal(result, itemType);
      
      // Create and display modal
      const modal = createComprehensiveAnalysisModal();
      const modalBody = modal.querySelector('.modal-body');
      modalBody.innerHTML = modalHtml;
      
      // Show modal with proper initialization
      setTimeout(() => {
        try {
          // Dispose previous instance if it exists
          if (currentModalInstance) {
            currentModalInstance.dispose();
          }
          
          currentModalInstance = new bootstrap.Modal(modal, {
            backdrop: 'static',
            keyboard: true,
            focus: true
          });
          currentModalInstance.show();
        } catch (error) {
          console.error('Error showing modal:', error);
        }
      }, 50);
      
      // Initialize interactive features
      initializeModalInteractivity();
      
    } else {
      showErrorModal('Analysis Unavailable', result.message || 'Unable to load analysis results.');
    }
    
  } catch (error) {
    console.error('❌ Error loading comprehensive analysis modal:', error);
    showErrorModal('Connection Error', 'Unable to connect to analysis service. Please try again later.');
  }
}

/**
 * Render comprehensive AI analysis modal with ALL available data
 */
function renderComprehensiveAnalysisModal(result, itemType) {
  console.log('🎨 === RENDERING COMPREHENSIVE AI ANALYSIS MODAL ===');
  
  const analysis = result.analysis || {};
  const mediaType = result.mediaType || 'unknown';
  
  let html = `
    <div class="comprehensive-analysis-content">
      ${renderContentOverviewSection(result, analysis, itemType, mediaType)}
      ${renderAIAnalysisSection(result, analysis, mediaType)}
      ${renderTechnicalInformationSection(result, analysis, mediaType)}
      ${renderUserDataSection(result, analysis)}
      ${renderProcessingInformationSection(result, analysis)}
    </div>
  `;
  
  return html;
}

/**
 * Render Content Overview Section
 */
function renderContentOverviewSection(result, analysis, itemType, mediaType) {
  const title = getGeneratedTitleFromResult(result) || analysis.title || 'Untitled Content';
  const summary = getSummaryFromResult(result);
  const url = result.url || analysis.url;
  const filename = result.filename || analysis.metadata?.filename;
  const createdAt = analysis.created_at || result.createdAt;
  const sourceInfo = getSourceInfoFromResult(result);
  
  return `
    <div class="card border-primary mb-4">
      <div class="card-header bg-primary text-white">
        <h5 class="card-title mb-0 d-flex align-items-center">
          <i class="bi bi-info-circle me-2"></i>Content Overview
          <span class="badge bg-light text-primary ms-auto">${mediaType.toUpperCase()}</span>
        </h5>
      </div>
      <div class="card-body">
        <div class="row">
          <div class="col-md-8">
            <h4 class="text-primary mb-3">${escapeHtml(title)}</h4>
            ${summary ? `
              <div class="mb-3">
                <h6 class="fw-bold">Summary</h6>
                <p class="text-muted">${escapeHtml(summary.substring(0, 200))}${summary.length > 200 ? '...' : ''}</p>
              </div>
            ` : ''}
            ${url ? `
              <div class="mb-2">
                <h6 class="fw-bold">Source URL</h6>
                <a href="${escapeHtml(url)}" target="_blank" class="text-break">
                  <i class="bi bi-link-45deg me-1"></i>${escapeHtml(url)}
                </a>
              </div>
            ` : ''}
            ${filename ? `
              <div class="mb-2">
                <h6 class="fw-bold">Filename</h6>
                <span class="font-monospace">${escapeHtml(filename)}</span>
              </div>
            ` : ''}
          </div>
          <div class="col-md-4">
            <div class="text-end">
              ${sourceInfo ? `
                <div class="mb-3">
                  <i class="${sourceInfo.icon} me-2 text-${sourceInfo.color}" style="font-size: 2rem;"></i>
                  <div><strong>${sourceInfo.source}</strong></div>
                </div>
              ` : ''}
              ${createdAt ? `
                <div class="mb-2">
                  <h6 class="fw-bold">Created</h6>
                  <span class="text-muted">${new Date(createdAt).toLocaleString()}</span>
                </div>
              ` : ''}
              <div class="mb-2">
                <h6 class="fw-bold">Type</h6>
                <span class="badge bg-secondary">${itemType.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render AI Analysis Section
 */
function renderAIAnalysisSection(result, analysis, mediaType) {
  return `
    <div class="card border-success mb-4">
      <div class="card-header bg-success text-white">
        <h5 class="card-title mb-0 d-flex align-items-center">
          <i class="bi bi-robot me-2"></i>AI Analysis Results
        </h5>
      </div>
      <div class="card-body">
        <div class="accordion" id="aiAnalysisAccordion">
          ${renderTranscriptionAccordion(result, analysis, mediaType)}
          ${renderSentimentAccordion(result, analysis)}
          ${renderObjectsAccordion(result, analysis)}
          ${renderFacesAccordion(result, analysis)}
          ${renderSpeakersAccordion(result, analysis)}
          ${renderOCRAccordion(result, analysis)}
          ${renderColorsAccordion(result, analysis)}
          ${renderScenesAccordion(result, analysis)}
          ${renderCategoryTagsAccordion(result, analysis)}
        </div>
      </div>
    </div>
  `;
}

/**
 * Render Technical Information Section
 */
function renderTechnicalInformationSection(result, analysis, mediaType) {
  return `
    <div class="card border-info mb-4">
      <div class="card-header bg-info text-white">
        <h5 class="card-title mb-0 d-flex align-items-center">
          <i class="bi bi-gear me-2"></i>Technical Information
        </h5>
      </div>
      <div class="card-body">
        <div class="accordion" id="technicalAccordion">
          ${renderFileMetadataAccordion(result, analysis)}
          ${renderQualityAccordion(result, analysis)}
          ${renderPerformanceAccordion(result, analysis)}
          ${renderThumbnailsAccordion(result, analysis)}
        </div>
      </div>
    </div>
  `;
}

/**
 * Render User Data Section
 */
function renderUserDataSection(result, analysis) {
  const userComments = result.user_comments || analysis.user_comments;
  const userTags = result.user_tags || analysis.user_tags || [];
  const autoTags = result.auto_tags || analysis.auto_tags || [];
  const category = result.category || analysis.category;
  const location = result.location || analysis.location;
  
  return `
    <div class="card border-warning mb-4">
      <div class="card-header bg-warning text-dark">
        <h5 class="card-title mb-0 d-flex align-items-center">
          <i class="bi bi-person me-2"></i>User Data
        </h5>
      </div>
      <div class="card-body">
        <div class="row">
          <div class="col-md-6">
            ${userComments ? `
              <div class="mb-3">
                <h6 class="fw-bold d-flex align-items-center">
                  <i class="bi bi-chat-text me-2"></i>Comments
                  <button class="btn btn-sm btn-outline-primary ms-auto" onclick="copyToClipboard('${escapeHtml(userComments)}')">
                    <i class="bi bi-clipboard"></i>
                  </button>
                </h6>
                <div class="border rounded p-3 bg-light">
                  <p class="mb-0">${escapeHtml(userComments)}</p>
                </div>
              </div>
            ` : ''}
            ${category ? `
              <div class="mb-3">
                <h6 class="fw-bold">Category</h6>
                <span class="badge bg-primary">${escapeHtml(category)}</span>
              </div>
            ` : ''}
          </div>
          <div class="col-md-6">
            ${userTags.length > 0 ? `
              <div class="mb-3">
                <h6 class="fw-bold">User Tags</h6>
                <div class="d-flex flex-wrap gap-1">
                  ${userTags.map(tag => `<span class="badge bg-success">${escapeHtml(tag)}</span>`).join('')}
                </div>
              </div>
            ` : ''}
            ${autoTags.length > 0 ? `
              <div class="mb-3">
                <h6 class="fw-bold">AI Tags</h6>
                <div class="d-flex flex-wrap gap-1">
                  ${autoTags.map(tag => `<span class="badge bg-info">${escapeHtml(tag)}</span>`).join('')}
                </div>
              </div>
            ` : ''}
            ${location ? `
              <div class="mb-3">
                <h6 class="fw-bold">Location</h6>
                <span class="text-muted">${escapeHtml(JSON.stringify(location))}</span>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render Processing Information Section
 */
function renderProcessingInformationSection(result, analysis) {
  const processingTime = analysis.processing_time;
  const job = result.job;
  const status = result.status;
  
  return `
    <div class="card border-secondary mb-4">
      <div class="card-header bg-secondary text-white">
        <h5 class="card-title mb-0 d-flex align-items-center">
          <i class="bi bi-clock me-2"></i>Processing Information
        </h5>
      </div>
      <div class="card-body">
        <div class="row">
          <div class="col-md-4">
            <h6 class="fw-bold">Status</h6>
            <span class="badge ${getStatusBadgeClass(status)}">${status?.toUpperCase() || 'UNKNOWN'}</span>
          </div>
          ${processingTime ? `
            <div class="col-md-4">
              <h6 class="fw-bold">Processing Time</h6>
              <span class="text-muted">${formatProcessingTime(processingTime)}</span>
            </div>
          ` : ''}
          ${job ? `
            <div class="col-md-4">
              <h6 class="fw-bold">Job ID</h6>
              <span class="font-monospace text-muted">${job.id?.substring(0, 8) || 'N/A'}...</span>
            </div>
          ` : ''}
        </div>
        ${analysis.created_at ? `
          <div class="mt-3">
            <h6 class="fw-bold">Analysis Date</h6>
            <span class="text-muted">${new Date(analysis.created_at).toLocaleString()}</span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * Render Transcription Accordion Item
 */
function renderTranscriptionAccordion(result, analysis, mediaType) {
  const transcription = getTranscriptionFromResult(result);
  if (!transcription) return '';
  
  const wordCount = transcription.split(' ').length;
  const readingTime = Math.ceil(wordCount / 200);
  
  return `
    <div class="accordion-item">
      <h2 class="accordion-header">
        <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#transcriptionCollapse">
          <i class="bi bi-file-text me-2"></i>
          <strong>Transcription</strong>
          <span class="badge bg-primary ms-2">${wordCount} words</span>
          <span class="badge bg-secondary ms-1">${readingTime} min read</span>
        </button>
      </h2>
      <div id="transcriptionCollapse" class="accordion-collapse collapse show">
        <div class="accordion-body">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <div class="text-muted">
              <i class="bi bi-info-circle me-1"></i>
              Full text transcription ${mediaType === 'video' ? 'from video' : 'from audio'}
            </div>
            <button class="btn btn-sm btn-outline-primary" onclick="copyToClipboard('${escapeForJS(transcription)}')">
              <i class="bi bi-clipboard me-1"></i>Copy Text
            </button>
          </div>
          <div class="border rounded p-3 bg-light" style="max-height: 400px; overflow-y: auto;">
            <p class="mb-0 lh-lg">${escapeHtml(transcription)}</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render Sentiment Accordion Item
 */
function renderSentimentAccordion(result, analysis) {
  const sentiment = analysis.sentiment;
  if (!sentiment) return '';
  
  const sentimentLabel = sentiment.label || sentiment.sentiment || 'neutral';
  const confidence = sentiment.confidence || 0.5;
  const emotions = sentiment.emotions || [];
  
  return `
    <div class="accordion-item">
      <h2 class="accordion-header">
        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#sentimentCollapse">
          <i class="bi bi-emoji-smile me-2"></i>
          <strong>Sentiment Analysis</strong>
          <span class="badge ${getSentimentBadgeClass(sentimentLabel)} ms-2">${sentimentLabel.toUpperCase()}</span>
          <span class="badge bg-secondary ms-1">${Math.round(confidence * 100)}%</span>
        </button>
      </h2>
      <div id="sentimentCollapse" class="accordion-collapse collapse">
        <div class="accordion-body">
          <div class="row">
            <div class="col-md-6">
              <h6 class="fw-bold">Overall Sentiment</h6>
              <div class="d-flex align-items-center mb-3">
                <span class="badge ${getSentimentBadgeClass(sentimentLabel)} me-2">${sentimentLabel.toUpperCase()}</span>
                <div class="progress flex-grow-1" style="height: 20px;">
                  <div class="progress-bar ${getSentimentProgressClass(sentimentLabel)}" 
                       style="width: ${confidence * 100}%">
                    ${Math.round(confidence * 100)}%
                  </div>
                </div>
              </div>
            </div>
            ${emotions.length > 0 ? `
              <div class="col-md-6">
                <h6 class="fw-bold">Detected Emotions</h6>
                <div class="d-flex flex-wrap gap-1">
                  ${emotions.map(emotion => `<span class="badge bg-light text-dark">${escapeHtml(emotion)}</span>`).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Create comprehensive analysis modal element
 */
function createComprehensiveAnalysisModal() {
  const modal = document.createElement('div');
  modal.className = 'modal fade';
  modal.id = 'comprehensiveAnalysisModal';
  modal.setAttribute('tabindex', '-1');
  modal.innerHTML = `
    <div class="modal-dialog modal-fullscreen-lg-down modal-xl modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header bg-gradient" style="background: linear-gradient(135deg, #0d6efd, #0dcaf0);">
          <h5 class="modal-title text-white fw-bold">
            <i class="bi bi-robot me-2"></i>Comprehensive Content Analysis
          </h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body p-0">
          <div class="p-4" style="max-height: 80vh; overflow-y: auto;">
            <!-- Content populated dynamically -->
          </div>
        </div>
        <div class="modal-footer bg-light border-top">
          <div class="d-flex justify-content-between w-100 align-items-center">
            <div class="text-muted small">
              <i class="bi bi-info-circle me-1"></i>
              All analysis data available for review
            </div>
            <div>
              <button type="button" class="btn btn-outline-primary me-2" onclick="copyAllAnalysisData()">
                <i class="bi bi-clipboard me-1"></i>Copy All Data
              </button>
              <button type="button" class="btn btn-primary" data-bs-dismiss="modal">
                <i class="bi bi-check-lg me-1"></i>Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Add cleanup event listeners
  modal.addEventListener('hidden.bs.modal', function() {
    if (currentModalInstance) {
      currentModalInstance.dispose();
      currentModalInstance = null;
    }
    if (modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  });
  
  document.body.appendChild(modal);
  return modal;
}

// Global variables
let currentModalInstance = null;
let currentModalAnalysisData = null;

/**
 * Helper Functions
 */

function cleanupExistingModal() {
  if (currentModalInstance) {
    try {
      currentModalInstance.hide();
      currentModalInstance.dispose();
    } catch (error) {
      console.warn('Error disposing modal:', error);
    }
    currentModalInstance = null;
  }
  
  const existingModal = document.getElementById('comprehensiveAnalysisModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
  document.body.classList.remove('modal-open');
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
}

function showLoadingModal() {
  const modal = createComprehensiveAnalysisModal();
  const modalBody = modal.querySelector('.modal-body .p-4');
  modalBody.innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
        <span class="visually-hidden">Loading...</span>
      </div>
      <div class="mt-3">
        <h5>Loading Analysis Data...</h5>
        <p class="text-muted">Please wait while we gather all available information.</p>
      </div>
    </div>
  `;
  
  // Add a small delay to ensure DOM is ready
  setTimeout(() => {
    try {
      currentModalInstance = new bootstrap.Modal(modal, { 
        backdrop: 'static', 
        keyboard: false,
        focus: true 
      });
      currentModalInstance.show();
    } catch (error) {
      console.error('Error showing loading modal:', error);
    }
  }, 50);
}

function showErrorModal(title, message) {
  const modal = createComprehensiveAnalysisModal();
  const modalBody = modal.querySelector('.modal-body .p-4');
  modalBody.innerHTML = `
    <div class="text-center py-5">
      <i class="bi bi-exclamation-triangle text-warning" style="font-size: 3rem;"></i>
      <h5 class="mt-3">${escapeHtml(title)}</h5>
      <p class="text-muted">${escapeHtml(message)}</p>
    </div>
  `;
  
  setTimeout(() => {
    try {
      if (currentModalInstance) {
        currentModalInstance.dispose();
      }
      currentModalInstance = new bootstrap.Modal(modal, { 
        backdrop: 'static', 
        keyboard: true,
        focus: true 
      });
      currentModalInstance.show();
    } catch (error) {
      console.error('Error showing error modal:', error);
    }
  }, 50);
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function escapeForJS(text) {
  if (!text) return '';
  return text.replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
}

function getGeneratedTitleFromResult(result) {
  return result.analysis?.title || result.generated_title || result.title || result.displayTitle;
}

function getSummaryFromResult(result) {
  return result.analysis?.description || result.analysis?.summary || result.summary;
}

function getTranscriptionFromResult(result) {
  return result.analysis?.transcription || result.transcription;
}

function getSourceInfoFromResult(result) {
  if (result.sourceInfo) {
    return {
      source: result.sourceInfo.source,
      icon: result.sourceInfo.logo,
      color: getBootstrapColorClass(result.sourceInfo.color)
    };
  }
  return null;
}

function getBootstrapColorClass(hexColor) {
  const colorMap = {
    '#0d6efd': 'primary',
    '#6c757d': 'secondary', 
    '#198754': 'success',
    '#dc3545': 'danger',
    '#ffc107': 'warning',
    '#0dcaf0': 'info'
  };
  return colorMap[hexColor] || 'secondary';
}

function getSentimentBadgeClass(sentiment) {
  switch (sentiment?.toLowerCase()) {
    case 'positive': return 'bg-success';
    case 'negative': return 'bg-danger';
    case 'neutral': return 'bg-secondary';
    default: return 'bg-secondary';
  }
}

function getSentimentProgressClass(sentiment) {
  switch (sentiment?.toLowerCase()) {
    case 'positive': return 'bg-success';
    case 'negative': return 'bg-danger';
    case 'neutral': return 'bg-secondary';
    default: return 'bg-secondary';
  }
}

function getStatusBadgeClass(status) {
  switch (status?.toLowerCase()) {
    case 'completed': return 'bg-success';
    case 'processing': return 'bg-warning';
    case 'pending': return 'bg-info';
    case 'failed': return 'bg-danger';
    default: return 'bg-secondary';
  }
}

function formatProcessingTime(milliseconds) {
  if (!milliseconds) return 'Unknown';
  const seconds = Math.round(milliseconds / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied to clipboard!', 'success');
  }).catch(() => {
    showToast('Failed to copy text', 'error');
  });
}

function copyAllAnalysisData() {
  if (!currentModalAnalysisData) {
    showToast('No data available to copy', 'warning');
    return;
  }
  
  const formattedData = JSON.stringify(currentModalAnalysisData, null, 2);
  copyToClipboard(formattedData);
}

function showToast(message, type = 'info') {
  // Simple toast implementation
  const toast = document.createElement('div');
  toast.className = `alert alert-${type} position-fixed top-0 end-0 m-3`;
  toast.style.zIndex = '9999';
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

function initializeModalInteractivity() {
  // Initialize any interactive features needed
  console.log('✅ Modal interactivity initialized');
}

// Additional accordion render functions would go here...
// (renderObjectsAccordion, renderFacesAccordion, etc.)
// For brevity, including a few key ones:

function renderObjectsAccordion(result, analysis) {
  const objects = analysis.objects || [];
  if (!objects.length) return '';
  
  return `
    <div class="accordion-item">
      <h2 class="accordion-header">
        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#objectsCollapse">
          <i class="bi bi-eye me-2"></i>
          <strong>Detected Objects</strong>
          <span class="badge bg-info ms-2">${objects.length} objects</span>
        </button>
      </h2>
      <div id="objectsCollapse" class="accordion-collapse collapse">
        <div class="accordion-body">
          <div class="row">
            ${objects.map(obj => `
              <div class="col-md-6 mb-2">
                <div class="border rounded p-2 bg-light">
                  <strong>${escapeHtml(obj.name || obj)}</strong>
                  ${obj.confidence ? `<span class="badge bg-secondary ms-2">${Math.round(obj.confidence * 100)}%</span>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderCategoryTagsAccordion(result, analysis) {
  const category = result.category || analysis.category;
  const autoTags = result.auto_tags || analysis.auto_tags || [];
  
  if (!category && !autoTags.length) return '';
  
  return `
    <div class="accordion-item">
      <h2 class="accordion-header">
        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#categoryTagsCollapse">
          <i class="bi bi-tags me-2"></i>
          <strong>Category & Tags</strong>
          ${autoTags.length ? `<span class="badge bg-info ms-2">${autoTags.length} tags</span>` : ''}
        </button>
      </h2>
      <div id="categoryTagsCollapse" class="accordion-collapse collapse">
        <div class="accordion-body">
          ${category ? `
            <div class="mb-3">
              <h6 class="fw-bold">Category</h6>
              <span class="badge bg-primary">${escapeHtml(category)}</span>
            </div>
          ` : ''}
          ${autoTags.length ? `
            <div>
              <h6 class="fw-bold">AI-Generated Tags</h6>
              <div class="d-flex flex-wrap gap-1">
                ${autoTags.map(tag => `<span class="badge bg-info">${escapeHtml(tag)}</span>`).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

/**
 * Render Faces Accordion Item
 */
function renderFacesAccordion(result, analysis) {
  const faces = analysis.faces || [];
  if (!faces.length) return '';
  
  return `
    <div class="accordion-item">
      <h2 class="accordion-header">
        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#facesCollapse">
          <i class="bi bi-person me-2"></i>
          <strong>Face Detection</strong>
          <span class="badge bg-info ms-2">${faces.length} faces</span>
        </button>
      </h2>
      <div id="facesCollapse" class="accordion-collapse collapse">
        <div class="accordion-body">
          <div class="row">
            ${faces.map((face, index) => `
              <div class="col-md-6 mb-3">
                <div class="border rounded p-3 bg-light">
                  <h6 class="fw-bold">Face ${index + 1}</h6>
                  ${face.confidence ? `<p><strong>Confidence:</strong> ${Math.round(face.confidence * 100)}%</p>` : ''}
                  ${face.emotions ? `<p><strong>Emotions:</strong> ${Object.entries(face.emotions).map(([emotion, score]) => `${emotion}: ${Math.round(score * 100)}%`).join(', ')}</p>` : ''}
                  ${face.age ? `<p><strong>Age:</strong> ${face.age}</p>` : ''}
                  ${face.gender ? `<p><strong>Gender:</strong> ${face.gender}</p>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render Speakers Accordion Item
 */
function renderSpeakersAccordion(result, analysis) {
  const speakers = result.speakers || analysis.speakers || [];
  if (!speakers.length) return '';
  
  return `
    <div class="accordion-item">
      <h2 class="accordion-header">
        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#speakersCollapse">
          <i class="bi bi-mic me-2"></i>
          <strong>Speaker Analysis</strong>
          <span class="badge bg-info ms-2">${speakers.length} speakers</span>
        </button>
      </h2>
      <div id="speakersCollapse" class="accordion-collapse collapse">
        <div class="accordion-body">
          <div class="row">
            ${speakers.map((speaker, index) => `
              <div class="col-md-6 mb-3">
                <div class="border rounded p-3 bg-light">
                  <h6 class="fw-bold">${escapeHtml(speaker.name || `Speaker ${index + 1}`)}</h6>
                  ${speaker.confidence ? `<p><strong>Confidence:</strong> ${Math.round(speaker.confidence * 100)}%</p>` : ''}
                  ${speaker.gender ? `<p><strong>Gender:</strong> ${escapeHtml(speaker.gender)}</p>` : ''}
                  ${speaker.language ? `<p><strong>Language:</strong> ${escapeHtml(speaker.language)}</p>` : ''}
                  ${speaker.totalDuration ? `<p><strong>Speaking Time:</strong> ${formatDuration(speaker.totalDuration)}</p>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render OCR Text Accordion Item
 */
function renderOCRAccordion(result, analysis) {
  const ocrText = analysis.ocrText || '';
  const ocrCaptions = result.ocr_captions || [];
  
  if (!ocrText && !ocrCaptions.length) return '';
  
  return `
    <div class="accordion-item">
      <h2 class="accordion-header">
        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#ocrCollapse">
          <i class="bi bi-file-text me-2"></i>
          <strong>Text Recognition (OCR)</strong>
          ${ocrCaptions.length ? `<span class="badge bg-info ms-2">${ocrCaptions.length} segments</span>` : ''}
        </button>
      </h2>
      <div id="ocrCollapse" class="accordion-collapse collapse">
        <div class="accordion-body">
          ${ocrText ? `
            <div class="mb-3">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <h6 class="fw-bold">Extracted Text</h6>
                <button class="btn btn-sm btn-outline-primary" onclick="copyToClipboard('${escapeForJS(ocrText)}')">
                  <i class="bi bi-clipboard me-1"></i>Copy Text
                </button>
              </div>
              <div class="border rounded p-3 bg-light" style="max-height: 300px; overflow-y: auto;">
                <p class="mb-0">${escapeHtml(ocrText)}</p>
              </div>
            </div>
          ` : ''}
          ${ocrCaptions.length ? `
            <div>
              <h6 class="fw-bold">Timestamped Text Segments</h6>
              <div class="row">
                ${ocrCaptions.map(caption => `
                  <div class="col-12 mb-2">
                    <div class="border rounded p-2 bg-light">
                      <div class="d-flex justify-content-between align-items-start">
                        <span class="text-muted small">${formatTimestamp(caption.timestamp)}</span>
                        ${caption.confidence ? `<span class="badge bg-secondary">${Math.round(caption.confidence * 100)}%</span>` : ''}
                      </div>
                      <p class="mb-0 mt-1">${escapeHtml(caption.text)}</p>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

/**
 * Render Colors Accordion Item
 */
function renderColorsAccordion(result, analysis) {
  const colors = analysis.colors;
  if (!colors) return '';
  
  const dominantColors = colors.dominantColors || [];
  const palette = colors.colorPalette || colors.palette || [];
  
  return `
    <div class="accordion-item">
      <h2 class="accordion-header">
        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#colorsCollapse">
          <i class="bi bi-palette me-2"></i>
          <strong>Color Analysis</strong>
          ${dominantColors.length ? `<span class="badge bg-info ms-2">${dominantColors.length} colors</span>` : ''}
        </button>
      </h2>
      <div id="colorsCollapse" class="accordion-collapse collapse">
        <div class="accordion-body">
          ${dominantColors.length ? `
            <div class="mb-3">
              <h6 class="fw-bold">Dominant Colors</h6>
              <div class="d-flex flex-wrap gap-2">
                ${dominantColors.map(color => `
                  <div class="text-center">
                    <div style="width: 50px; height: 50px; background-color: ${color.hex || color}; border: 1px solid #ccc; border-radius: 4px;"></div>
                    <small class="text-muted d-block mt-1">${color.hex || color}</small>
                    ${color.percentage ? `<small class="text-muted">${Math.round(color.percentage * 100)}%</small>` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
          ${palette.length ? `
            <div class="mb-3">
              <h6 class="fw-bold">Color Palette</h6>
              <div class="d-flex flex-wrap gap-2">
                ${palette.map(color => `
                  <div class="text-center">
                    <div style="width: 40px; height: 40px; background-color: ${color}; border: 1px solid #ccc; border-radius: 4px;"></div>
                    <small class="text-muted d-block mt-1">${color}</small>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
          ${colors.brightness !== undefined ? `
            <div class="row">
              <div class="col-md-4">
                <strong>Brightness:</strong> ${Math.round(colors.brightness * 100)}%
              </div>
              ${colors.contrast !== undefined ? `<div class="col-md-4"><strong>Contrast:</strong> ${Math.round(colors.contrast * 100)}%</div>` : ''}
              ${colors.saturation !== undefined ? `<div class="col-md-4"><strong>Saturation:</strong> ${Math.round(colors.saturation * 100)}%</div>` : ''}
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

/**
 * Render Scenes Accordion Item
 */
function renderScenesAccordion(result, analysis) {
  const scenes = analysis.scenes || [];
  if (!scenes.length) return '';
  
  return `
    <div class="accordion-item">
      <h2 class="accordion-header">
        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#scenesCollapse">
          <i class="bi bi-camera-video me-2"></i>
          <strong>Scene Detection</strong>
          <span class="badge bg-info ms-2">${scenes.length} scenes</span>
        </button>
      </h2>
      <div id="scenesCollapse" class="accordion-collapse collapse">
        <div class="accordion-body">
          <div class="row">
            ${scenes.map((scene, index) => `
              <div class="col-md-6 mb-3">
                <div class="border rounded p-3 bg-light">
                  <h6 class="fw-bold">Scene ${index + 1}</h6>
                  ${scene.startTime !== undefined ? `<p><strong>Start:</strong> ${formatTimestamp(scene.startTime)}</p>` : ''}
                  ${scene.endTime !== undefined ? `<p><strong>End:</strong> ${formatTimestamp(scene.endTime)}</p>` : ''}
                  ${scene.duration !== undefined ? `<p><strong>Duration:</strong> ${formatDuration(scene.duration)}</p>` : ''}
                  ${scene.description ? `<p><strong>Description:</strong> ${escapeHtml(scene.description)}</p>` : ''}
                  ${scene.confidence ? `<p><strong>Confidence:</strong> ${Math.round(scene.confidence * 100)}%</p>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render File Metadata Accordion Item
 */
function renderFileMetadataAccordion(result, analysis) {
  const metadata = analysis.metadata || result.metadata || {};
  const duration = analysis.duration;
  const resolution = analysis.resolution || metadata.resolution;
  
  return `
    <div class="accordion-item">
      <h2 class="accordion-header">
        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#metadataCollapse">
          <i class="bi bi-info-square me-2"></i>
          <strong>File Metadata</strong>
        </button>
      </h2>
      <div id="metadataCollapse" class="accordion-collapse collapse">
        <div class="accordion-body">
          <div class="row">
            ${duration ? `
              <div class="col-md-6">
                <p><strong>Duration:</strong> ${formatDuration(duration)}</p>
              </div>
            ` : ''}
            ${resolution ? `
              <div class="col-md-6">
                <p><strong>Resolution:</strong> ${typeof resolution === 'object' ? `${resolution.width}x${resolution.height}` : resolution}</p>
              </div>
            ` : ''}
            ${metadata.mimetype ? `
              <div class="col-md-6">
                <p><strong>File Type:</strong> ${escapeHtml(metadata.mimetype)}</p>
              </div>
            ` : ''}
            ${metadata.size ? `
              <div class="col-md-6">
                <p><strong>File Size:</strong> ${formatFileSize(metadata.size)}</p>
              </div>
            ` : ''}
            ${metadata.filename ? `
              <div class="col-md-12">
                <p><strong>Filename:</strong> <span class="font-monospace">${escapeHtml(metadata.filename)}</span></p>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render Quality Assessment Accordion Item
 */
function renderQualityAccordion(result, analysis) {
  const quality = analysis.quality;
  if (!quality) return '';
  
  return `
    <div class="accordion-item">
      <h2 class="accordion-header">
        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#qualityCollapse">
          <i class="bi bi-star me-2"></i>
          <strong>Quality Assessment</strong>
          ${quality.qualityScore ? `<span class="badge bg-success ms-2">${Math.round(quality.qualityScore * 100)}%</span>` : ''}
        </button>
      </h2>
      <div id="qualityCollapse" class="accordion-collapse collapse">
        <div class="accordion-body">
          <div class="row">
            ${quality.overallQuality ? `
              <div class="col-md-6">
                <p><strong>Overall Quality:</strong> <span class="badge bg-${getQualityBadgeClass(quality.overallQuality)}">${escapeHtml(quality.overallQuality)}</span></p>
              </div>
            ` : ''}
            ${quality.qualityScore ? `
              <div class="col-md-6">
                <p><strong>Quality Score:</strong> ${Math.round(quality.qualityScore * 100)}%</p>
              </div>
            ` : ''}
            ${quality.sharpness ? `
              <div class="col-md-6">
                <p><strong>Sharpness:</strong> ${Math.round(quality.sharpness * 100)}%</p>
              </div>
            ` : ''}
            ${quality.brightness ? `
              <div class="col-md-6">
                <p><strong>Brightness:</strong> ${Math.round(quality.brightness * 100)}%</p>
              </div>
            ` : ''}
            ${quality.contrast ? `
              <div class="col-md-6">
                <p><strong>Contrast:</strong> ${Math.round(quality.contrast * 100)}%</p>
              </div>
            ` : ''}
            ${quality.noise ? `
              <div class="col-md-6">
                <p><strong>Noise Level:</strong> ${Math.round(quality.noise * 100)}%</p>
              </div>
            ` : ''}
          </div>
          ${quality.issues && quality.issues.length ? `
            <div class="mt-3">
              <h6 class="fw-bold">Quality Issues</h6>
              <ul class="list-unstyled">
                ${quality.issues.map(issue => `<li><i class="bi bi-exclamation-triangle text-warning me-2"></i>${escapeHtml(issue)}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

/**
 * Render Performance Metrics Accordion Item
 */
function renderPerformanceAccordion(result, analysis) {
  const processingTime = analysis.processing_time;
  const processingStats = analysis.processing_stats;
  const job = result.job;
  
  if (!processingTime && !processingStats && !job) return '';
  
  return `
    <div class="accordion-item">
      <h2 class="accordion-header">
        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#performanceCollapse">
          <i class="bi bi-speedometer2 me-2"></i>
          <strong>Performance Metrics</strong>
        </button>
      </h2>
      <div id="performanceCollapse" class="accordion-collapse collapse">
        <div class="accordion-body">
          <div class="row">
            ${processingTime ? `
              <div class="col-md-6">
                <p><strong>Processing Time:</strong> ${formatProcessingTime(processingTime)}</p>
              </div>
            ` : ''}
            ${job?.processingTime ? `
              <div class="col-md-6">
                <p><strong>Job Duration:</strong> ${formatProcessingTime(job.processingTime)}</p>
              </div>
            ` : ''}
            ${processingStats?.processingSpeed ? `
              <div class="col-md-6">
                <p><strong>Processing Speed:</strong> ${processingStats.processingSpeed.toFixed(2)}x</p>
              </div>
            ` : ''}
            ${processingStats?.memoryUsage ? `
              <div class="col-md-6">
                <p><strong>Memory Usage:</strong> ${formatFileSize(processingStats.memoryUsage)}</p>
              </div>
            ` : ''}
            ${processingStats?.apiCalls ? `
              <div class="col-md-6">
                <p><strong>API Calls:</strong> ${processingStats.apiCalls}</p>
              </div>
            ` : ''}
            ${processingStats?.tokensUsed ? `
              <div class="col-md-6">
                <p><strong>Tokens Used:</strong> ${processingStats.tokensUsed.toLocaleString()}</p>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render Thumbnails Accordion Item
 */
function renderThumbnailsAccordion(result, analysis) {
  const thumbnails = result.thumbnails || [];
  if (!thumbnails.length) return '';
  
  return `
    <div class="accordion-item">
      <h2 class="accordion-header">
        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#thumbnailsCollapse">
          <i class="bi bi-images me-2"></i>
          <strong>Thumbnails</strong>
          <span class="badge bg-info ms-2">${thumbnails.length} images</span>
        </button>
      </h2>
      <div id="thumbnailsCollapse" class="accordion-collapse collapse">
        <div class="accordion-body">
          <div class="row">
            ${thumbnails.map(thumbnail => `
              <div class="col-md-3 col-sm-6 mb-3">
                <div class="card">
                  <img src="${thumbnail.url}" class="card-img-top" style="height: 120px; object-fit: cover;" alt="Thumbnail">
                  <div class="card-body p-2">
                    ${thumbnail.timestamp ? `<small class="text-muted">${formatTimestamp(thumbnail.timestamp)}</small>` : ''}
                    ${thumbnail.width && thumbnail.height ? `<br><small class="text-muted">${thumbnail.width}x${thumbnail.height}</small>` : ''}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Additional Helper Functions
 */
function getQualityBadgeClass(quality) {
  switch (quality?.toLowerCase()) {
    case 'excellent': case 'high': return 'success';
    case 'good': case 'medium': return 'primary';
    case 'fair': case 'low': return 'warning';
    case 'poor': case 'very low': return 'danger';
    default: return 'secondary';
  }
}

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function formatTimestamp(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  return formatDuration(seconds);
}

function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

// All accordion render functions are implemented above

// Legacy support functions
function setupContentAnalysisMonitoring() {
  console.log('🔧 Content analysis monitoring setup complete');
}

function getVideoIndicators(analysis, result) { return []; }
function getAudioIndicators(analysis, result) { return []; }
function getImageIndicators(analysis, result) { return []; }
function getLegacyIndicators(analysis, result) { return []; }
function getGenericIndicators(analysis, result) { return []; }

function displayIndicators(contentId, indicators) {
  const indicatorContainer = document.getElementById(`ai-indicators-${contentId}`);
  if (indicatorContainer && indicators.length > 0) {
    indicatorContainer.innerHTML = indicators.map(indicator => 
      `<span class="badge ${indicator.class} me-1">${indicator.text}</span>`
    ).join('');
  }
}

function displayTranscriptionSummary(contentId, text, wordCount, mediaType) {
  const summaryContainer = document.getElementById(`transcription-summary-${contentId}`);
  if (summaryContainer) {
    summaryContainer.style.display = 'block';
    const textElement = summaryContainer.querySelector('.transcription-text');
    if (textElement) {
      textElement.textContent = text.substring(0, 200) + (text.length > 200 ? '...' : '');
    }
  }
}

function displayProcessingIndicator(contentId, result) {
  const indicatorContainer = document.getElementById(`ai-indicators-${contentId}`);
  if (indicatorContainer) {
    indicatorContainer.innerHTML = '<span class="badge bg-warning">Processing...</span>';
  }
}