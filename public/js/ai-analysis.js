/**
 * AI Analysis Display JavaScript (Updated for New Architecture)
 * 
 * This file handles the display of AI analysis results for multimedia content
 * using both the new modular processor architecture and legacy data formats.
 * 
 * Features:
 * - Load AI analysis results from new processor models (VideoAnalysis, AudioAnalysis, ImageAnalysis)
 * - Handle legacy MultimediaAnalyzer data format for backward compatibility
 * - Display multimedia analysis indicators in content cards
 * - Show detailed analysis results in modal with unified formatting
 * - Handle thumbnails, transcriptions, and speaker identification
 * - Real-time status updates for ongoing analysis with ProcessingJob tracking
 * - Unified result formatting for consistent display across all processors
 */

console.log('🔴 AI ANALYSIS SCRIPT LOADED - This should appear first!');
console.log('🔴 Script timestamp:', new Date().toISOString());

// AI Analysis functionality
document.addEventListener('DOMContentLoaded', function() {
  console.log('🟢 DOM Content Loaded - AI Analysis script initializing...');
  
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
 * Initialize AI indicators for all content items on the page
 */
function initializeAIIndicators() {
  const contentCards = document.querySelectorAll('.content-card');
  contentCards.forEach(card => {
    const contentId = card.getAttribute('data-id');
    if (contentId) {
      loadAIIndicators(contentId);
    }
  });
}

/**
 * Load and display AI analysis indicators for a content item
 * Updated to handle new unified result format
 */
async function loadAIIndicators(contentId) {
  try {
    const response = await fetch(`/content/${contentId}/analysis`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'same-origin'
    });
    
    // Handle authentication errors
    if (response.status === 401 || response.status === 403) {
      console.log(`Authentication error for content ${contentId}, skipping AI indicators`);
      return;
    }
    
    // Handle HTML responses (redirects to login)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      console.log(`HTML response received for content ${contentId}, likely redirected to login`);
      return;
    }
    
    const result = await response.json();
    
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
          // Handle unknown or mixed types
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
      // Show processing indicator
      displayProcessingIndicator(contentId, result);
      
      // Track for real-time updates
      window.analyzingContent.add(contentId);
      
    } else if (result.status === 'not_analyzed') {
      // Show no analysis indicator (optional)
      displayNoAnalysisIndicator(contentId);
    }
    
  } catch (error) {
    console.error('Error loading AI indicators:', error);
  }
}

/**
 * Get indicators for video analysis results
 */
function getVideoIndicators(analysis, result) {
  const indicators = [];
  
  // Transcription indicator
  if (analysis.transcription && analysis.transcription.length > 0) {
    const wordCount = analysis.transcription.split(' ').length;
    indicators.push({
      icon: 'bi-file-text',
      color: 'bg-primary',
      text: `${wordCount}w`,
      title: `Video Transcription: ${wordCount} words`
    });
  }
  
  // Video-specific indicators
  if (analysis.duration) {
    indicators.push({
      icon: 'bi-clock',
      color: 'bg-info',
      text: formatDuration(analysis.duration),
      title: `Duration: ${formatDuration(analysis.duration)}`
    });
  }
  
  // Objects detected
  if (analysis.objects && analysis.objects.length > 0) {
    indicators.push({
      icon: 'bi-eye',
      color: 'bg-success',
      text: `${analysis.objects.length}`,
      title: `${analysis.objects.length} objects detected`
    });
  }
  
  // OCR text
  if (result.ocr_captions && result.ocr_captions.length > 0) {
    indicators.push({
      icon: 'bi-fonts',
      color: 'bg-warning',
      text: 'OCR',
      title: `${result.ocr_captions.length} text segments extracted`
    });
  }
  
  // Sentiment
  if (analysis.sentiment) {
    indicators.push({
      icon: 'bi-emoji-smile',
      color: getSentimentColor(analysis.sentiment.overall?.label || analysis.sentiment.label),
      text: (analysis.sentiment.overall?.label || analysis.sentiment.label).charAt(0).toUpperCase(),
      title: `Sentiment: ${analysis.sentiment.overall?.label || analysis.sentiment.label}`
    });
  }
  
  return indicators;
}

/**
 * Get indicators for audio analysis results
 */
function getAudioIndicators(analysis, result) {
  const indicators = [];
  
  // Transcription indicator
  if (analysis.transcription && analysis.transcription.length > 0) {
    const wordCount = analysis.transcription.split(' ').length;
    indicators.push({
      icon: 'bi-mic',
      color: 'bg-primary',
      text: `${wordCount}w`,
      title: `Audio Transcription: ${wordCount} words`
    });
  }
  
  // Duration
  if (analysis.duration) {
    indicators.push({
      icon: 'bi-clock',
      color: 'bg-info',
      text: formatDuration(analysis.duration),
      title: `Duration: ${formatDuration(analysis.duration)}`
    });
  }
  
  // Speakers
  if (analysis.speakers && analysis.speakers.length > 0) {
    indicators.push({
      icon: 'bi-people',
      color: 'bg-success',
      text: `${analysis.speakers.length}`,
      title: `${analysis.speakers.length} speakers identified`
    });
  }
  
  // Language
  if (analysis.language && analysis.language !== 'unknown') {
    indicators.push({
      icon: 'bi-translate',
      color: 'bg-secondary',
      text: analysis.language.toUpperCase(),
      title: `Language: ${analysis.language}`
    });
  }
  
  // Sentiment
  if (analysis.sentiment) {
    indicators.push({
      icon: 'bi-emoji-smile',
      color: getSentimentColor(analysis.sentiment.overall?.label || analysis.sentiment.label),
      text: (analysis.sentiment.overall?.label || analysis.sentiment.label).charAt(0).toUpperCase(),
      title: `Sentiment: ${analysis.sentiment.overall?.label || analysis.sentiment.label}`
    });
  }
  
  return indicators;
}

/**
 * Get indicators for image analysis results
 */
function getImageIndicators(analysis, result) {
  const indicators = [];
  
  // AI Description indicator
  if (analysis.description && analysis.description.length > 0) {
    const wordCount = analysis.description.split(' ').length;
    indicators.push({
      icon: 'bi-image',
      color: 'bg-primary',
      text: `${wordCount}w`,
      title: `AI Image Description: ${wordCount} words`
    });
  }
  
  // Objects detected
  if (analysis.objects && analysis.objects.length > 0) {
    indicators.push({
      icon: 'bi-eye',
      color: 'bg-success',
      text: `${analysis.objects.length}`,
      title: `${analysis.objects.length} objects detected`
    });
  }
  
  // OCR text
  if (analysis.ocrText && analysis.ocrText.length > 0) {
    const wordCount = analysis.ocrText.split(' ').length;
    indicators.push({
      icon: 'bi-fonts',
      color: 'bg-warning',
      text: `${wordCount}w`,
      title: `OCR: ${wordCount} words extracted`
    });
  }
  
  // Faces detected
  if (analysis.faces && analysis.faces.length > 0) {
    indicators.push({
      icon: 'bi-person',
      color: 'bg-info',
      text: `${analysis.faces.length}`,
      title: `${analysis.faces.length} faces detected`
    });
  }
  
  // Colors analyzed
  if (analysis.colors) {
    indicators.push({
      icon: 'bi-palette',
      color: 'bg-secondary',
      text: 'COL',
      title: 'Color analysis available'
    });
  }
  
  return indicators;
}

/**
 * Get indicators for legacy analysis results (backward compatibility)
 */
function getLegacyIndicators(analysis, result) {
  const indicators = [];
  
  // Transcription indicator (legacy format)
  if (analysis.transcription && analysis.transcription.length > 0) {
    const wordCount = analysis.transcription.split(' ').length;
    
    // Try to determine content type from legacy data
    let iconClass = 'bi-file-text';
    let titlePrefix = 'Transcription';
    
    if (analysis.metadata && analysis.metadata.imageAnalysis) {
      iconClass = 'bi-image';
      titlePrefix = 'Image Description';
    } else if (analysis.transcription.toLowerCase().includes('image') || 
               analysis.transcription.toLowerCase().includes('photo')) {
      iconClass = 'bi-image';
      titlePrefix = 'Image Description';
    }
    
    indicators.push({
      icon: iconClass,
      color: 'bg-primary',
      text: `${wordCount}w`,
      title: `${titlePrefix}: ${wordCount} words`
    });
  }
  
  // Sentiment (legacy format)
  if (analysis.sentiment) {
    // Handle different sentiment data formats (label, sentiment field, or direct string)
    const sentimentLabel = analysis.sentiment.label || analysis.sentiment.sentiment || analysis.sentiment || 'neutral';
    const finalLabel = typeof sentimentLabel === 'string' ? sentimentLabel : 'neutral';
    indicators.push({
      icon: 'bi-emoji-smile',
      color: getSentimentColor(finalLabel),
      text: finalLabel.charAt(0).toUpperCase(),
      title: `Sentiment: ${finalLabel}`
    });
  }
  
  // Duration (legacy format)
  if (analysis.duration) {
    indicators.push({
      icon: 'bi-clock',
      color: 'bg-info',
      text: formatDuration(analysis.duration),
      title: `Duration: ${formatDuration(analysis.duration)}`
    });
  }
  
  return indicators;
}

/**
 * Get indicators for generic/unknown analysis results
 */
function getGenericIndicators(analysis, result) {
  const indicators = [];
  
  // Generic content indicator
  if (analysis.transcription || analysis.description) {
    const text = analysis.transcription || analysis.description;
    const wordCount = text.split(' ').length;
    indicators.push({
      icon: 'bi-file-text',
      color: 'bg-primary',
      text: `${wordCount}w`,
      title: `Content: ${wordCount} words`
    });
  }
  
  return indicators;
}

/**
 * Display indicators in the content card
 */
function displayIndicators(contentId, indicators) {
  const indicatorsContainer = document.getElementById(`ai-indicators-${contentId}`);
  if (!indicatorsContainer) return;
  
  indicatorsContainer.innerHTML = '';
  
  indicators.forEach(indicator => {
    const badge = document.createElement('span');
    badge.className = `badge ${indicator.color} text-white d-flex align-items-center`;
    badge.style.fontSize = '0.7rem';
    badge.style.padding = '0.25rem 0.5rem';
    badge.title = indicator.title;
    badge.innerHTML = `<i class="${indicator.icon} me-1"></i>${indicator.text}`;
    
    indicatorsContainer.appendChild(badge);
  });
}

/**
 * Display processing indicator
 */
function displayProcessingIndicator(contentId, result) {
  const indicatorsContainer = document.getElementById(`ai-indicators-${contentId}`);
  if (!indicatorsContainer) return;
  
  const progress = result.job ? result.job.progress : 0;
  const stage = result.job ? result.job.currentStage : 'processing';
  
  indicatorsContainer.innerHTML = `
    <span class="badge bg-warning text-dark d-flex align-items-center" style="font-size: 0.7rem; padding: 0.25rem 0.5rem;" 
          title="Analysis in progress: ${progress}% complete">
      <div class="spinner-border spinner-border-sm me-1" role="status" style="width: 0.8rem; height: 0.8rem;">
        <span class="visually-hidden">Loading...</span>
      </div>
      ${progress}%
    </span>
  `;
}

/**
 * Display no analysis indicator
 */
function displayNoAnalysisIndicator(contentId) {
  const indicatorsContainer = document.getElementById(`ai-indicators-${contentId}`);
  if (!indicatorsContainer) return;
  
  indicatorsContainer.innerHTML = `
    <span class="badge bg-light text-muted d-flex align-items-center" style="font-size: 0.7rem; padding: 0.25rem 0.5rem;" 
          title="No AI analysis available">
      <i class="bi bi-dash-circle me-1"></i>None
    </span>
  `;
}

/**
 * Setup AI analysis modal handling
 */
function setupAIAnalysisModal() {
  console.log('🔧 Setting up AI analysis modal handlers...');
  
  // Debug: Check what AI analysis buttons exist on the page
  const aiButtons = document.querySelectorAll('.ai-analysis-btn');
  console.log('🔍 Found AI analysis buttons:', aiButtons.length);
  aiButtons.forEach((btn, index) => {
    console.log(`🔍 Button ${index}:`, btn);
    console.log(`🔍 Button ${index} data-id:`, btn.getAttribute('data-id'));
  });
  
  // Handle modal trigger (legacy class)
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('ai-analysis-trigger') || 
        e.target.closest('.ai-analysis-trigger')) {
      console.log('📊 AI analysis trigger clicked (legacy)');
      e.preventDefault();
      
      const trigger = e.target.classList.contains('ai-analysis-trigger') ? 
                     e.target : e.target.closest('.ai-analysis-trigger');
      
      const contentId = trigger.getAttribute('data-content-id');
      console.log('📊 Content ID from trigger:', contentId);
      if (contentId) {
        showAIAnalysisModal(contentId);
      }
    }
  });
  
  // Handle AI analysis button clicks (current implementation)
  document.addEventListener('click', function(e) {
    const aiAnalysisBtn = e.target.closest('.ai-analysis-btn');
    if (aiAnalysisBtn) {
      console.log('🧠 AI analysis button clicked!');
      console.log('🧠 Button element:', aiAnalysisBtn);
      console.log('🧠 Button classes:', aiAnalysisBtn.className);
      console.log('🧠 Button attributes:', aiAnalysisBtn.attributes);
      
      e.preventDefault();
      e.stopPropagation();
      
      const contentId = aiAnalysisBtn.getAttribute('data-id');
      console.log('🧠 Content ID from button:', contentId);
      
      if (contentId) {
        console.log('🧠 Calling showAIAnalysisModal with contentId:', contentId);
        showAIAnalysisModal(contentId);
      } else {
        console.error('❌ No content ID found on AI analysis button');
      }
    }
  });
  
  console.log('✅ AI analysis modal handlers set up successfully');
}

/**
 * Show AI analysis modal with detailed results
 */
async function showAIAnalysisModal(contentId) {
  console.log('🚀 === STARTING AI ANALYSIS MODAL ===');
  console.log('🚀 Content ID:', contentId);
  console.log('🚀 Content ID type:', typeof contentId);
  console.log('🚀 Content ID length:', contentId?.length);
  
  try {
    console.log(`🔍 Loading AI analysis for content: ${contentId.substring(0, 8)}...`);
    
    // Check if modal already exists and remove it
    const existingModal = document.getElementById('aiAnalysisModal');
    if (existingModal) {
      console.log('🗑️ Removing existing modal...');
      existingModal.remove();
    }
    
    console.log('📞 Making fetch request to:', `/content/${contentId}/analysis`);
    
    const response = await fetch(`/content/${contentId}/analysis`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'same-origin'
    });
    
    console.log('📡 Response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: {
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length')
      }
    });
    
    // Check for authentication errors
    if (response.status === 401 || response.status === 403) {
      console.error('🚫 Authentication error:', response.status);
      throw new Error('Authentication required. Please refresh the page and log in again.');
    }
    
    // Check for HTML responses (redirects to login)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      console.error('🚫 HTML response detected (likely redirect):', contentType);
      throw new Error('Session expired. Please refresh the page and log in again.');
    }
    
    if (!response.ok) {
      console.error('🚫 Non-OK response:', response.status, response.statusText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    console.log('📥 Parsing JSON response...');
    const result = await response.json();
    console.log('📡 API Response:', { 
      success: result.success, 
      status: result.status, 
      mediaType: result.mediaType,
      hasAnalysis: !!result.analysis,
      fullResult: result
    });
    
    if (result.success) {
      console.log('✅ Success! Rendering modal with analysis data...');
      console.log('🎨 Calling renderAIAnalysisModal...');
      const modalHtml = renderAIAnalysisModal(result);
      console.log('🎨 Modal HTML generated:', modalHtml ? 'YES' : 'NO');
      console.log('🎨 Modal HTML length:', modalHtml?.length);
      
      // Create or update modal
      console.log('🏗️ Creating modal...');
      let modal = document.getElementById('aiAnalysisModal');
      if (!modal) {
        console.log('🏗️ Modal does not exist, creating new one...');
        modal = createAIAnalysisModal();
        console.log('🏗️ Modal created:', !!modal);
      } else {
        console.log('🏗️ Using existing modal');
      }
      
      console.log('📝 Setting modal body content...');
      const modalBody = modal.querySelector('.modal-body');
      console.log('📝 Modal body found:', !!modalBody);
      if (modalBody) {
        modalBody.innerHTML = modalHtml;
        console.log('📝 Modal body content set');
      } else {
        console.error('❌ Modal body not found!');
      }
      
      // Show modal
      console.log('🎭 Showing modal with Bootstrap...');
      const bsModal = new bootstrap.Modal(modal);
      bsModal.show();
      
      console.log('✅ Modal displayed successfully');
      
    } else {
      console.error('❌ API returned success=false:', result.message || 'Unknown error');
      console.error('❌ Full result object:', result);
      
      // Show error modal instead of leaving user with spinning wheel
      showErrorModal('Analysis Unavailable', result.message || 'Unable to load analysis results for this content.');
    }
    
  } catch (error) {
    console.error('❌ Error loading AI analysis modal:', error);
    console.error('❌ Error stack:', error.stack);
    
    // Show error modal instead of leaving user with spinning wheel
    showErrorModal('Connection Error', 'Unable to connect to analysis service. Please try again later.');
  }
  
  console.log('🏁 === AI ANALYSIS MODAL COMPLETE ===');
}

/**
 * Show error modal when analysis fails to load
 */
function showErrorModal(title, message) {
  console.log('🚨 === SHOWING ERROR MODAL ===');
  console.log('🚨 Title:', title);
  console.log('🚨 Message:', message);
  
  let modal = document.getElementById('aiAnalysisModal');
  console.log('🚨 Existing modal found:', !!modal);
  
  if (!modal) {
    console.log('🚨 Creating new modal for error...');
    modal = createAIAnalysisModal();
    console.log('🚨 Modal created:', !!modal);
  }
  
  const modalTitle = modal.querySelector('.modal-title');
  const modalBody = modal.querySelector('.modal-body');
  
  console.log('🚨 Modal title element found:', !!modalTitle);
  console.log('🚨 Modal body element found:', !!modalBody);
  
  modalTitle.textContent = title;
  modalBody.innerHTML = `
    <div class="alert alert-warning" role="alert">
      <i class="bi bi-exclamation-triangle me-2"></i>
      ${message}
    </div>
  `;
  
  console.log('🚨 Showing error modal...');
  const bsModal = new bootstrap.Modal(modal);
  bsModal.show();
  console.log('🚨 Error modal shown successfully');
}

/**
 * Render AI analysis modal content with unified format
 */
function renderAIAnalysisModal(result) {
  console.log('🎨 === RENDERING AI ANALYSIS MODAL ===');
  console.log('🎨 Result object:', result);
  console.log('🎨 Has analysis:', !!result.analysis);
  console.log('🎨 Media type:', result.mediaType);
  
  const analysis = result.analysis;
  const mediaType = result.mediaType;
  
  console.log('🎨 Analysis object:', analysis);
  console.log('🎨 Media type extracted:', mediaType);
  
  // Start with compact header
  let html = `
    <div class="ai-analysis-content">
      <div class="d-flex align-items-center mb-4">
        <i class="bi bi-robot me-2 text-primary" style="font-size: 1.5rem;"></i>
        <h5 class="fw-bold mb-0 me-2">Analysis Results</h5>
        <span class="badge bg-secondary">${mediaType?.toUpperCase() || 'UNKNOWN'}</span>
      </div>
  `;

  // 1. SUMMARY (Priority #1)
  const summary = getSummaryFromResult(result);
  if (summary) {
    html += `
      <div class="mb-4">
        <h6 class="fw-bold">
          <i class="bi bi-file-earmark-text me-2"></i>Summary
        </h6>
        <div class="border rounded p-3 bg-light">
          <p class="mb-0">${summary}</p>
        </div>
      </div>
    `;
  }

  // 2. SENTIMENT ANALYSIS (Priority #2)
  html += renderSentimentSection(analysis, result);

  // 3. TRANSCRIPTION (Priority #3)
  html += renderTranscriptionSection(analysis, mediaType);

  // 4. CATEGORY & TAGS (Priority #4)
  html += renderCategoryAndTagsSection(result);

  // 5. REST OF AI PIPELINE OUTPUT
  html += renderDetectedObjectsSection(analysis);
  html += renderSpeakersSection(analysis, result);
  html += renderOCRSection(analysis);
  html += renderFacesSection(analysis);
  html += renderColorsSection(analysis);
  html += renderScenesSection(analysis);
  html += renderThumbnailsSection(result);
  html += renderTechnicalInfoSection(analysis, result);
  html += renderProcessingInfoSection(analysis, result);
  
  html += '</div>';
  
  return html;
}

/**
 * Get summary from various sources in the result
 */
function getSummaryFromResult(result) {
  const analysis = result.analysis;
  
  // Try different sources for summary
  if (analysis.summary && analysis.summary.trim()) {
    return analysis.summary;
  }
  
  // Check content record level
  if (result.summary && result.summary.trim()) {
    return result.summary;
  }
  
  // Try metadata
  if (analysis.metadata && analysis.metadata.summary) {
    return analysis.metadata.summary;
  }
  
  return null;
}

/**
 * Render sentiment analysis section
 */
function renderSentimentSection(analysis, result) {
  let html = '';
  
  // Try different sources for sentiment
  let sentiment = analysis.sentiment;
  if (!sentiment && result.sentiment) {
    sentiment = result.sentiment;
  }
  
  if (sentiment) {
    // Handle different sentiment data formats
    const sentimentLabel = sentiment.label || sentiment.sentiment || sentiment;
    
    if (sentimentLabel && typeof sentimentLabel === 'string') {
      const sentimentColor = getSentimentColor(sentimentLabel);
      const confidence = sentiment.confidence || sentiment.score || 0.5;
      
      html += `
        <div class="mb-4">
          <h6 class="fw-bold">
            <i class="bi bi-emoji-smile me-2"></i>Sentiment Analysis
          </h6>
          <div class="d-flex align-items-center">
            <span class="badge ${sentimentColor} me-2">${sentimentLabel.toUpperCase()}</span>
            <div class="progress flex-grow-1" style="height: 20px;">
              <div class="progress-bar ${sentimentColor.replace('bg-', 'bg-')}" 
                   role="progressbar" 
                   style="width: ${confidence * 100}%"
                   aria-valuenow="${confidence * 100}" 
                   aria-valuemin="0" 
                   aria-valuemax="100">
                ${Math.round(confidence * 100)}%
              </div>
            </div>
          </div>
          ${sentiment.emotions && sentiment.emotions.length > 0 ? `
            <div class="mt-2">
              <small class="text-muted">
                <strong>Emotions:</strong> ${sentiment.emotions.join(', ')}
              </small>
            </div>
          ` : ''}
        </div>
      `;
    }
  }
  
  return html;
}

/**
 * Render transcription section based on media type
 */
function renderTranscriptionSection(analysis, mediaType) {
  let html = '';
  
  // Get transcription text
  let transcriptionText = '';
  let title = 'Content Analysis';
  let icon = 'bi-file-text';
  
  if (analysis.transcription && analysis.transcription.trim()) {
    transcriptionText = analysis.transcription;
    if (mediaType === 'video') {
      title = 'Video Transcription';
      icon = 'bi-play-circle';
    } else if (mediaType === 'audio') {
      title = 'Audio Transcription';
      icon = 'bi-mic';
    }
  } else if (analysis.description && analysis.description.trim()) {
    transcriptionText = analysis.description;
    title = 'AI Description';
    icon = 'bi-image';
  }
  
  if (transcriptionText) {
    const wordCount = transcriptionText.split(' ').length;
    const sentences = transcriptionText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const estimatedReadingTime = Math.ceil(wordCount / 200);
    
    html += `
      <div class="mb-4">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h6 class="fw-bold mb-0">
            <i class="${icon} me-2"></i>${title}
          </h6>
          <button class="btn btn-sm btn-outline-primary" onclick="copyToClipboard('${transcriptionText.replace(/'/g, "\\'")}')">
            <i class="bi bi-clipboard me-1"></i>Copy
          </button>
        </div>
        <div class="d-flex justify-content-between align-items-center mb-2">
          <div>
            <span class="badge bg-primary me-2">${wordCount} words</span>
            <span class="badge bg-secondary me-2">${sentences.length} sentences</span>
            <span class="badge bg-info">~${estimatedReadingTime} min read</span>
          </div>
        </div>
        <div class="border rounded p-3 bg-light" style="max-height: 300px; overflow-y: auto; line-height: 1.6;">
          <p class="mb-0">${transcriptionText}</p>
        </div>
      </div>
    `;
  }
  
  return html;
}

/**
 * Render category and tags section
 */
function renderCategoryAndTagsSection(result) {
  let html = '';
  
  // Get category and tags from various sources
  const category = result.category || result.analysis?.category;
  const autoTags = result.auto_tags || result.analysis?.auto_tags || [];
  const userTags = result.user_tags || result.analysis?.user_tags || [];
  
  if (category || autoTags.length > 0 || userTags.length > 0) {
    html += `
      <div class="mb-4">
        <h6 class="fw-bold">
          <i class="bi bi-tags me-2"></i>Category & Tags
        </h6>
    `;
    
    if (category) {
      html += `
        <div class="mb-2">
          <strong>Category:</strong>
          <span class="badge bg-primary ms-2">${category}</span>
        </div>
      `;
    }
    
    if (autoTags.length > 0) {
      html += `
        <div class="mb-2">
          <strong>AI Generated Tags:</strong>
          <div class="mt-1">
            ${autoTags.map(tag => `<span class="badge bg-success me-1 mb-1">${tag}</span>`).join('')}
          </div>
        </div>
      `;
    }
    
    if (userTags.length > 0) {
      html += `
        <div class="mb-2">
          <strong>User Tags:</strong>
          <div class="mt-1">
            ${userTags.map(tag => `<span class="badge bg-warning text-dark me-1 mb-1">${tag}</span>`).join('')}
          </div>
        </div>
      `;
    }
    
    html += '</div>';
  }
  
  return html;
}

/**
 * Render detected objects section
 */
function renderDetectedObjectsSection(analysis) {
  if (!analysis.objects || analysis.objects.length === 0) return '';
  
  return `
    <div class="mb-4">
      <h6 class="fw-bold">
        <i class="bi bi-eye me-2"></i>Detected Objects (${analysis.objects.length})
      </h6>
      <div class="row">
        ${analysis.objects.map(obj => `
          <div class="col-md-4 mb-2">
            <div class="card">
              <div class="card-body p-2">
                <strong>${obj.name}</strong><br>
                <small class="text-muted">Confidence: ${Math.round((obj.confidence || 0) * 100)}%</small>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * Render speakers section
 */
function renderSpeakersSection(analysis, result) {
  const speakers = analysis.speakers || result.speakers || [];
  if (speakers.length === 0) return '';
  
  return `
    <div class="mb-4">
      <h6 class="fw-bold">
        <i class="bi bi-people me-2"></i>Identified Speakers (${speakers.length})
      </h6>
      <div class="row">
        ${speakers.map(speaker => `
          <div class="col-md-6 mb-2">
            <div class="card">
              <div class="card-body p-2">
                <strong>${speaker.name || `Speaker ${speaker.id}`}</strong><br>
                <small class="text-muted">
                  Confidence: ${Math.round((speaker.confidence || 0) * 100)}%
                  ${speaker.gender ? ` • ${speaker.gender}` : ''}
                  ${speaker.language ? ` • ${speaker.language}` : ''}
                </small>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * Render OCR text section
 */
function renderOCRSection(analysis) {
  const ocrText = analysis.ocrText || (analysis.ocr_captions && analysis.ocr_captions.map(c => c.text).join(' '));
  if (!ocrText || !ocrText.trim()) return '';
  
  const wordCount = ocrText.split(' ').length;
  
  return `
    <div class="mb-4">
      <h6 class="fw-bold">
        <i class="bi bi-fonts me-2"></i>Extracted Text (OCR)
      </h6>
      <div class="d-flex justify-content-between align-items-center mb-2">
        <span class="badge bg-warning text-dark">${wordCount} words extracted</span>
        <button class="btn btn-sm btn-outline-primary" onclick="copyToClipboard('${ocrText.replace(/'/g, "\\'")}')">
          <i class="bi bi-clipboard me-1"></i>Copy
        </button>
      </div>
      <div class="border rounded p-3 bg-light" style="max-height: 200px; overflow-y: auto;">
        <p class="mb-0">${ocrText}</p>
      </div>
    </div>
  `;
}

/**
 * Render faces section
 */
function renderFacesSection(analysis) {
  if (!analysis.faces || analysis.faces.length === 0) return '';
  
  return `
    <div class="mb-4">
      <h6 class="fw-bold">
        <i class="bi bi-person me-2"></i>Detected Faces (${analysis.faces.length})
      </h6>
      <div class="row">
        ${analysis.faces.map((face, index) => `
          <div class="col-md-4 mb-2">
            <div class="card">
              <div class="card-body p-2">
                <strong>Face ${index + 1}</strong><br>
                <small class="text-muted">
                  ${face.gender ? `${face.gender}` : 'Unknown gender'}
                  ${face.age ? ` • ~${face.age} years` : ''}
                  ${face.confidence ? ` • ${Math.round(face.confidence * 100)}% confidence` : ''}
                </small>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * Render colors section
 */
function renderColorsSection(analysis) {
  if (!analysis.colors || !analysis.colors.dominantColors) return '';
  
  return `
    <div class="mb-4">
      <h6 class="fw-bold">
        <i class="bi bi-palette me-2"></i>Color Analysis
      </h6>
      <div class="d-flex flex-wrap gap-2">
        ${analysis.colors.dominantColors.map(color => `
          <div class="d-flex align-items-center">
            <div class="color-swatch me-2" style="width: 20px; height: 20px; background-color: ${color.hex || color.rgb}; border: 1px solid #ccc; border-radius: 3px;"></div>
            <small>${color.name || color.hex || 'Unknown'}</small>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * Render scenes section
 */
function renderScenesSection(analysis) {
  if (!analysis.scenes || analysis.scenes.length === 0) return '';
  
  return `
    <div class="mb-4">
      <h6 class="fw-bold">
        <i class="bi bi-camera-reels me-2"></i>Scene Detection (${analysis.scenes.length})
      </h6>
      <div class="row">
        ${analysis.scenes.map((scene, index) => `
          <div class="col-md-6 mb-2">
            <div class="card">
              <div class="card-body p-2">
                <strong>Scene ${index + 1}</strong><br>
                <small class="text-muted">
                  ${scene.start ? `Start: ${formatDuration(scene.start)}` : ''}
                  ${scene.duration ? ` • Duration: ${formatDuration(scene.duration)}` : ''}
                  ${scene.confidence ? ` • ${Math.round(scene.confidence * 100)}% confidence` : ''}
                </small>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * Render thumbnails section
 */
function renderThumbnailsSection(result) {
  const thumbnails = result.thumbnails || [];
  if (thumbnails.length === 0) return '';
  
  return `
    <div class="mb-4">
      <h6 class="fw-bold">
        <i class="bi bi-images me-2"></i>Generated Thumbnails (${thumbnails.length})
      </h6>
      <div class="row">
        ${thumbnails.map(thumb => `
          <div class="col-md-3 mb-2">
            <div class="card">
              <img src="${thumb.url}" class="card-img-top" alt="Thumbnail" style="height: 100px; object-fit: cover;">
              <div class="card-body p-2">
                <small class="text-muted">
                  ${thumb.timestamp ? `${formatDuration(thumb.timestamp)}` : ''}
                  ${thumb.size ? ` • ${thumb.size}` : ''}
                </small>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * Render technical information section
 */
function renderTechnicalInfoSection(analysis, result) {
  let html = '';
  
  // Collect technical info
  const techInfo = [];
  
  if (analysis.duration) {
    techInfo.push(`Duration: ${formatDuration(analysis.duration)}`);
  }
  
  if (analysis.metadata) {
    if (analysis.metadata.resolution) techInfo.push(`Resolution: ${analysis.metadata.resolution}`);
    if (analysis.metadata.fps) techInfo.push(`FPS: ${analysis.metadata.fps}`);
    if (analysis.metadata.bitrate) techInfo.push(`Bitrate: ${analysis.metadata.bitrate}`);
    if (analysis.metadata.codec) techInfo.push(`Codec: ${analysis.metadata.codec}`);
    if (analysis.metadata.fileSize) techInfo.push(`Size: ${formatFileSize(analysis.metadata.fileSize)}`);
  }
  
  if (analysis.language) {
    techInfo.push(`Language: ${analysis.language}`);
  }
  
  if (techInfo.length > 0) {
    html += `
      <div class="mb-4">
        <h6 class="fw-bold">
          <i class="bi bi-info-circle me-2"></i>Technical Information
        </h6>
        <div class="row">
          ${techInfo.map(info => `
            <div class="col-md-6 mb-1">
              <small class="text-muted">${info}</small>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  return html;
}

/**
 * Render processing information section
 */
function renderProcessingInfoSection(analysis, result) {
  let html = '';
  
  if (analysis.processing_time || analysis.created_at || result.job) {
    html += `
      <div class="mb-4">
        <h6 class="fw-bold">
          <i class="bi bi-clock me-2"></i>Processing Information
        </h6>
        <div class="row">
          ${analysis.processing_time ? `
            <div class="col-md-6">
              <small class="text-muted"><strong>Processing Time:</strong> ${formatProcessingTime(analysis.processing_time)}</small>
            </div>
          ` : ''}
          ${analysis.created_at ? `
            <div class="col-md-6">
              <small class="text-muted"><strong>Analyzed:</strong> ${new Date(analysis.created_at).toLocaleString()}</small>
            </div>
          ` : ''}
          ${result.job && result.job.status ? `
            <div class="col-md-6">
              <small class="text-muted"><strong>Status:</strong> ${result.job.status}</small>
            </div>
          ` : ''}
          ${result.job && result.job.progress ? `
            <div class="col-md-6">
              <small class="text-muted"><strong>Progress:</strong> ${result.job.progress}%</small>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
  
  return html;
}

/**
 * Render video-specific analysis
 */
function renderVideoAnalysis(analysis, result) {
  let html = '';
  
  // Video metadata
  if (analysis.duration || analysis.metadata) {
    html += `
      <div class="mb-4">
        <h6 class="fw-bold">
          <i class="bi bi-play-circle me-2"></i>Video Information
        </h6>
        <div class="row">
          ${analysis.duration ? `
            <div class="col-md-6">
              <p><strong>Duration:</strong> ${formatDuration(analysis.duration)}</p>
            </div>
          ` : ''}
          ${analysis.metadata?.resolution ? `
            <div class="col-md-6">
              <p><strong>Resolution:</strong> ${analysis.metadata.resolution}</p>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
  
  // Transcription
  if (analysis.transcription) {
    html += renderTranscriptionSection(analysis.transcription, 'Video Transcription', 'bi-file-text');
  }
  
  // Objects detected
  if (analysis.objects && analysis.objects.length > 0) {
    html += renderObjectsSection(analysis.objects);
  }
  
  // Scenes
  if (analysis.scenes && analysis.scenes.length > 0) {
    html += renderScenesSection(analysis.scenes);
  }
  
  return html;
}

/**
 * Render audio-specific analysis
 */
function renderAudioAnalysis(analysis, result) {
  let html = '';
  
  // Audio metadata
  if (analysis.duration || analysis.language) {
    html += `
      <div class="mb-4">
        <h6 class="fw-bold">
          <i class="bi bi-music-note me-2"></i>Audio Information
        </h6>
        <div class="row">
          ${analysis.duration ? `
            <div class="col-md-6">
              <p><strong>Duration:</strong> ${formatDuration(analysis.duration)}</p>
            </div>
          ` : ''}
          ${analysis.language ? `
            <div class="col-md-6">
              <p><strong>Language:</strong> ${analysis.language}</p>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
  
  // Transcription
  if (analysis.transcription) {
    html += renderTranscriptionSection(analysis.transcription, 'Audio Transcription', 'bi-mic');
  }
  
  // Speakers
  if (analysis.speakers && analysis.speakers.length > 0) {
    html += renderSpeakersSection(analysis.speakers);
  }
  
  return html;
}

/**
 * Render image-specific analysis
 */
function renderImageAnalysis(analysis, result) {
  let html = '';
  
  // AI Description
  if (analysis.description) {
    html += renderTranscriptionSection(analysis.description, 'AI Image Description', 'bi-image');
  }
  
  // Objects detected
  if (analysis.objects && analysis.objects.length > 0) {
    html += renderObjectsSection(analysis.objects);
  }
  
  // OCR Text
  if (analysis.ocrText) {
    html += renderOCRSection(analysis.ocrText);
  }
  
  // Faces
  if (analysis.faces && analysis.faces.length > 0) {
    html += renderFacesSection(analysis.faces);
  }
  
  // Colors
  if (analysis.colors) {
    html += renderColorsSection(analysis.colors);
  }
  
  return html;
}

/**
 * Render legacy analysis (backward compatibility)
 */
function renderLegacyAnalysis(analysis, result) {
  let html = '';
  
  // Legacy transcription/description
  if (analysis.transcription) {
    const isImage = analysis.metadata?.imageAnalysis || 
                   analysis.transcription.toLowerCase().includes('image');
    const title = isImage ? 'AI Image Description' : 'Content Transcription';
    const icon = isImage ? 'bi-image' : 'bi-file-text';
    
    html += renderTranscriptionSection(analysis.transcription, title, icon);
  }
  
  // Legacy summary
  if (analysis.summary && analysis.summary !== analysis.transcription) {
    html += `
      <div class="mb-4">
        <h6 class="fw-bold">
          <i class="bi bi-file-earmark-text me-2"></i>Summary
        </h6>
        <div class="border rounded p-3 bg-light">
          <p class="mb-0">${analysis.summary}</p>
        </div>
      </div>
    `;
  }
  
  return html;
}

/**
 * Render generic analysis
 */
function renderGenericAnalysis(analysis, result) {
  let html = '';
  
  if (analysis.transcription || analysis.description) {
    const content = analysis.transcription || analysis.description;
    html += renderTranscriptionSection(content, 'Content Analysis', 'bi-file-text');
  }
  
  return html;
}

/**
 * Render common sections (sentiment, summary, etc.)
 */
function renderCommonSections(analysis, result) {
  let html = '';
  
  // Sentiment Analysis
  if (analysis.sentiment) {
    const sentiment = analysis.sentiment.overall || analysis.sentiment;
    // Handle different sentiment data formats (label, sentiment field, or direct string)
    const sentimentLabel = sentiment.label || sentiment.sentiment || sentiment;
    if (sentimentLabel && typeof sentimentLabel === 'string') {
      const sentimentColor = getSentimentColor(sentimentLabel);
      html += `
        <div class="mb-4">
          <h6 class="fw-bold">
            <i class="bi bi-emoji-smile me-2"></i>Sentiment Analysis
          </h6>
          <div class="d-flex align-items-center">
            <span class="badge ${sentimentColor} me-2">${sentimentLabel.toUpperCase()}</span>
            <div class="progress flex-grow-1" style="height: 20px;">
              <div class="progress-bar ${sentimentColor.replace('bg-', 'bg-')}" 
                   role="progressbar" 
                   style="width: ${(sentiment.confidence || 0.5) * 100}%"
                   aria-valuenow="${(sentiment.confidence || 0.5) * 100}" 
                   aria-valuemin="0" 
                   aria-valuemax="100">
                ${Math.round((sentiment.confidence || 0.5) * 100)}%
              </div>
            </div>
          </div>
          ${sentiment.emotions && sentiment.emotions.length > 0 ? `
            <div class="mt-2">
              <small class="text-muted">
                <strong>Emotions:</strong> ${sentiment.emotions.join(', ')}
              </small>
            </div>
          ` : ''}
        </div>
      `;
    }
  }
  
  // Thumbnails
  if (result.thumbnails && result.thumbnails.length > 0) {
    html += renderThumbnailsSection(result.thumbnails);
  }
  
  // Processing info
  if (analysis.processing_time || result.job) {
    html += `
      <div class="mb-4">
        <h6 class="fw-bold">
          <i class="bi bi-clock me-2"></i>Processing Information
        </h6>
        <div class="row">
          ${analysis.processing_time ? `
            <div class="col-md-6">
              <p><strong>Processing Time:</strong> ${formatProcessingTime(analysis.processing_time)}</p>
            </div>
          ` : ''}
          ${analysis.created_at ? `
            <div class="col-md-6">
              <p><strong>Analyzed:</strong> ${new Date(analysis.created_at).toLocaleString()}</p>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
  
  console.log('🎨 Modal HTML generated successfully');
  console.log('🎨 HTML length:', html.length);
  console.log('🎨 HTML preview (first 200 chars):', html.substring(0, 200));
  
  return html;
}

/**
 * Helper function to render transcription/description section
 */
function renderTranscriptionSection(text, title, icon) {
  // Ensure text is a string and not null/undefined
  if (!text || typeof text !== 'string') {
    text = '';
  }
  
  const wordCount = text.split(' ').length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const estimatedReadingTime = Math.ceil(wordCount / 200);
  
  return `
    <div class="mb-4">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <h6 class="fw-bold mb-0">
          <i class="${icon} me-2"></i>${title}
        </h6>
        <button class="btn btn-sm btn-outline-primary" onclick="copyToClipboard('${text.replace(/'/g, "\\'")}')">
          <i class="bi bi-clipboard me-1"></i>Copy
        </button>
      </div>
      <div class="d-flex justify-content-between align-items-center mb-2">
        <div>
          <span class="badge bg-primary me-2">${wordCount} words</span>
          <span class="badge bg-secondary me-2">${sentences.length} sentences</span>
          <span class="badge bg-info">~${estimatedReadingTime} min read</span>
        </div>
      </div>
      <div class="border rounded p-3 bg-light" style="max-height: 300px; overflow-y: auto; line-height: 1.6;">
        <p class="mb-0">${text}</p>
      </div>
    </div>
  `;
}

/**
 * Helper function to render objects section
 */
function renderObjectsSection(objects) {
  // Ensure objects is an array and not null/undefined
  if (!objects || !Array.isArray(objects)) {
    objects = [];
  }
  
  return `
    <div class="mb-4">
      <h6 class="fw-bold">
        <i class="bi bi-eye me-2"></i>Detected Objects (${objects.length})
      </h6>
      <div class="row">
        ${objects.map(obj => `
          <div class="col-md-4 mb-2">
            <div class="card">
              <div class="card-body p-2">
                <strong>${obj.name}</strong><br>
                <small class="text-muted">Confidence: ${Math.round((obj.confidence || 0) * 100)}%</small>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * Helper function to render speakers section
 */
function renderSpeakersSection(speakers) {
  // Ensure speakers is an array and not null/undefined
  if (!speakers || !Array.isArray(speakers)) {
    speakers = [];
  }
  
  return `
    <div class="mb-4">
      <h6 class="fw-bold">
        <i class="bi bi-people me-2"></i>Identified Speakers (${speakers.length})
      </h6>
      <div class="row">
        ${speakers.map(speaker => `
          <div class="col-md-6 mb-2">
            <div class="card">
              <div class="card-body p-2">
                <strong>${speaker.name || `Speaker ${speaker.id}`}</strong><br>
                <small class="text-muted">
                  Confidence: ${Math.round((speaker.confidence || 0) * 100)}%
                  ${speaker.gender ? ` • ${speaker.gender}` : ''}
                  ${speaker.language ? ` • ${speaker.language}` : ''}
                </small>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * Helper function to render OCR section
 */
function renderOCRSection(ocrText) {
  // Ensure ocrText is a string and not null/undefined
  if (!ocrText || typeof ocrText !== 'string') {
    ocrText = '';
  }
  
  const wordCount = ocrText.split(' ').length;
  
  return `
    <div class="mb-4">
      <h6 class="fw-bold">
        <i class="bi bi-fonts me-2"></i>Extracted Text (OCR)
      </h6>
      <div class="d-flex justify-content-between align-items-center mb-2">
        <span class="badge bg-warning text-dark">${wordCount} words extracted</span>
        <button class="btn btn-sm btn-outline-primary" onclick="copyToClipboard('${ocrText.replace(/'/g, "\\'")}')">
          <i class="bi bi-clipboard me-1"></i>Copy
        </button>
      </div>
      <div class="border rounded p-3 bg-light" style="max-height: 200px; overflow-y: auto;">
        <p class="mb-0">${ocrText}</p>
      </div>
    </div>
  `;
}

/**
 * Helper function to render faces section
 */
function renderFacesSection(faces) {
  // Ensure faces is an array and not null/undefined
  if (!faces || !Array.isArray(faces)) {
    faces = [];
  }
  
  return `
    <div class="mb-4">
      <h6 class="fw-bold">
        <i class="bi bi-person me-2"></i>Detected Faces (${faces.length})
      </h6>
      <div class="row">
        ${faces.map((face, index) => `
          <div class="col-md-4 mb-2">
            <div class="card">
              <div class="card-body p-2">
                <strong>Face ${index + 1}</strong><br>
                <small class="text-muted">
                  ${face.gender ? `${face.gender}` : 'Unknown gender'}
                  ${face.age ? ` • ~${face.age} years` : ''}
                  ${face.confidence ? ` • ${Math.round(face.confidence * 100)}% confidence` : ''}
                </small>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * Helper function to render colors section
 */
function renderColorsSection(colors) {
  return `
    <div class="mb-4">
      <h6 class="fw-bold">
        <i class="bi bi-palette me-2"></i>Color Analysis
      </h6>
      <div class="d-flex flex-wrap gap-2">
        ${colors.dominantColors ? colors.dominantColors.map(color => `
          <div class="d-flex align-items-center">
            <div class="color-swatch me-2" style="width: 20px; height: 20px; background-color: ${color.hex || color.rgb}; border: 1px solid #ccc; border-radius: 3px;"></div>
            <small>${color.name || color.hex || 'Unknown'}</small>
          </div>
        `).join('') : ''}
      </div>
    </div>
  `;
}

/**
 * Helper function to render thumbnails section
 */
function renderThumbnailsSection(thumbnails) {
  // Ensure thumbnails is an array and not null/undefined
  if (!thumbnails || !Array.isArray(thumbnails)) {
    thumbnails = [];
  }
  
  return `
    <div class="mb-4">
      <h6 class="fw-bold">
        <i class="bi bi-images me-2"></i>Generated Thumbnails (${thumbnails.length})
      </h6>
      <div class="row">
        ${thumbnails.map(thumb => `
          <div class="col-md-3 mb-2">
            <div class="card">
              <img src="${thumb.url}" class="card-img-top" alt="Thumbnail" style="height: 100px; object-fit: cover;">
              <div class="card-body p-2">
                <small class="text-muted">
                  ${thumb.timestamp ? `${formatDuration(thumb.timestamp)}` : ''}
                  ${thumb.size ? ` • ${thumb.size}` : ''}
                </small>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * Display transcription summary in content card
 * Enhanced to handle all new media types and legacy data
 */
function displayTranscriptionSummary(contentId, text, wordCount, mediaType = 'auto') {
  const summaryContainer = document.getElementById(`transcription-summary-${contentId}`);
  if (!summaryContainer) return;
  
  // Auto-detect content type if not specified
  if (mediaType === 'auto' || mediaType === 'legacy') {
    if (text.includes('Image description') || text.includes('photo') || text.includes('picture')) {
      mediaType = 'image';
    } else if (text.includes('Speaker') || text.includes('audio')) {
      mediaType = 'audio';
    } else {
      mediaType = 'video';
    }
  }
  
  // Show the summary container
  summaryContainer.style.display = 'block';
  
  // Create summary text (adjust length based on content type)
  const maxLength = mediaType === 'image' ? 120 : 100;
  const summaryText = text.length > maxLength ? 
    text.substring(0, maxLength) + '...' : 
    text;
  
  // Update the summary content
  const transcriptionTextElement = summaryContainer.querySelector('.transcription-text');
  if (transcriptionTextElement) {
    transcriptionTextElement.textContent = summaryText;
    transcriptionTextElement.classList.remove('text-muted');
    transcriptionTextElement.classList.add('text-dark');
  }
}

/**
 * Check for ongoing analysis and update progress
 */
async function checkOngoingAnalysis() {
  if (window.analyzingContent.size === 0) return;
  
  const contentIds = Array.from(window.analyzingContent);
  
  for (const contentId of contentIds) {
    try {
      const response = await fetch(`/content/${contentId}/analysis`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'same-origin'
      });
      const result = await response.json();
      
      if (result.success && result.status === 'completed') {
        // Analysis completed, update indicators and remove from tracking
        loadAIIndicators(contentId);
        window.analyzingContent.delete(contentId);
        
        // Refresh content card with new data
        await refreshContentCard(contentId);
        
      } else if (result.status === 'processing' || result.status === 'pending') {
        // Update progress indicator
        displayProcessingIndicator(contentId, result);
        
      } else {
        // Analysis failed or unknown status, remove from tracking
        window.analyzingContent.delete(contentId);
      }
      
    } catch (error) {
      console.error(`Error checking analysis for content ${contentId}:`, error);
      // Remove from tracking on error to prevent infinite retries
      window.analyzingContent.delete(contentId);
    }
  }
}

/**
 * Refresh content card with updated data
 */
async function refreshContentCard(contentId) {
  const contentCard = document.querySelector(`.content-card[data-id="${contentId}"]`);
  if (!contentCard) return;
  
  try {
    // Get updated content data from server
    const response = await fetch(`/content/${contentId}/analysis`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'same-origin'
    });
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
    }
    
  } catch (error) {
    console.error('Error refreshing content card:', error);
  }
}

/**
 * Setup content analysis monitoring for new content
 */
function setupContentAnalysisMonitoring() {
  // Watch for new content cards being added to the DOM
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const contentCards = node.querySelectorAll ? 
                              node.querySelectorAll('.content-card') : 
                              (node.classList?.contains('content-card') ? [node] : []);
          
          contentCards.forEach(card => {
            const contentId = card.getAttribute('data-id');
            if (contentId) {
              loadAIIndicators(contentId);
            }
          });
        }
      });
    });
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Create AI analysis modal if it doesn't exist
 */
function createAIAnalysisModal() {
  const modal = document.createElement('div');
  modal.className = 'modal fade';
  modal.id = 'aiAnalysisModal';
  modal.setAttribute('tabindex', '-1');
  modal.innerHTML = `
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">AI Analysis Results</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <!-- Content will be populated dynamically -->
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  return modal;
}

/**
 * Utility functions
 */

function getSentimentColor(sentiment) {
  if (!sentiment) return 'bg-secondary';
  
  const label = sentiment.toLowerCase();
  if (label.includes('positive')) return 'bg-success';
  if (label.includes('negative')) return 'bg-danger';
  if (label.includes('neutral')) return 'bg-secondary';
  return 'bg-info';
}

function getQualityLabel(score) {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Very Good';
  if (score >= 70) return 'Good';
  if (score >= 60) return 'Fair';
  return 'Poor';
}

function getQualityColor(score) {
  if (score >= 80) return 'bg-success';
  if (score >= 60) return 'bg-warning';
  return 'bg-danger';
}

function formatDuration(seconds) {
  if (!seconds || seconds === 0) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

function formatProcessingTime(milliseconds) {
  if (!milliseconds) return 'Unknown';
  
  if (milliseconds < 1000) return `${milliseconds}ms`;
  if (milliseconds < 60000) return `${(milliseconds / 1000).toFixed(1)}s`;
  return `${Math.round(milliseconds / 60000)}m ${Math.round((milliseconds % 60000) / 1000)}s`;
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    // Show success feedback
    console.log('Text copied to clipboard');
  }).catch(err => {
    console.error('Failed to copy text: ', err);
  });
}

// Global functions for backward compatibility
window.copySummaryToClipboard = function() {
  const summaryElement = document.querySelector('#aiAnalysisModal .border.rounded.p-3 p');
  if (summaryElement) {
    copyToClipboard(summaryElement.textContent);
  }
};

window.copyTranscriptionToClipboard = function() {
  const transcriptionElement = document.querySelector('#transcriptionContent p');
  if (transcriptionElement) {
    copyToClipboard(transcriptionElement.textContent);
  }
};

window.copyContentSummary = function(contentId) {
  const summaryElement = document.querySelector(`#transcription-summary-${contentId} .transcription-text`);
  if (summaryElement) {
    copyToClipboard(summaryElement.textContent);
  }
}; 