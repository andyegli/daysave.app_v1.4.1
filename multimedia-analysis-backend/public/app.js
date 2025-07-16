// Multimedia Analysis Frontend JavaScript
class MultimediaAnalyzer {
    constructor() {
        console.log('=== MULTIMEDIA ANALYZER CONSTRUCTOR ===');
        
        // Immediate Video.js check
        console.log('Video.js availability check:', {
            videojs: typeof window.videojs,
            videojsExists: !!window.videojs,
            videojsVersion: window.videojs ? window.videojs.VERSION : 'Not available'
        });
        
        this.currentFile = null;
        this.currentUrl = null;
        this.apiBaseUrl = window.location.origin;
        this.userHasInteracted = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkApiStatus();
        this.setupUserInteractionDetection();
    }

    setupEventListeners() {
        // File input change
        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files[0]);
        });

        // Drag and drop
        const uploadArea = document.getElementById('uploadArea');
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            this.handleFileSelect(file);
        });

        // URL validation
        document.getElementById('validateUrlBtn').addEventListener('click', () => {
            this.validateUrl();
        });

        // URL input enter key
        document.getElementById('urlInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.validateUrl();
            }
        });

        // Tab change handling
        document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                this.clearCurrentSelection();
            });
        });

        // Analyze button
        document.getElementById('analyzeBtn').addEventListener('click', () => {
            this.analyzeContent();
        });

        // Analysis options buttons
        document.getElementById('resetOptionsBtn').addEventListener('click', () => {
            this.resetAnalysisOptions();
        });

        document.getElementById('showPresetsBtn').addEventListener('click', () => {
            this.showAnalysisPresets();
        });

        // Cancel analysis button
        document.getElementById('cancelAnalysisBtn').addEventListener('click', () => {
            this.cancelAnalysis();
        });
    }

    async checkApiStatus() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/health`);
            const data = await response.json();
            
            const statusElement = document.getElementById('apiStatus');
            if (data.status === 'OK') {
                statusElement.innerHTML = '<span class="badge bg-success">Online</span>';
            } else {
                statusElement.innerHTML = '<span class="badge bg-danger">Error</span>';
            }
        } catch (error) {
            document.getElementById('apiStatus').innerHTML = '<span class="badge bg-danger">Offline</span>';
        }
    }

    handleFileSelect(file) {
        if (!file) return;

        this.currentFile = file;
        this.currentUrl = null;
        this.showFilePreview(file);
        document.getElementById('analysisOptions').style.display = 'block';
        document.getElementById('analyzeButtonContainer').style.display = 'block';
    }

    async validateUrl() {
        const urlInput = document.getElementById('urlInput');
        const url = urlInput.value.trim();
        
        if (!url) {
            this.showError('Please enter a URL');
            return;
        }

        try {
            // Basic URL validation
            new URL(url);
            
            // Check if it's a streaming platform
            const platform = this.detectStreamingPlatform(url);
            
            if (platform) {
                            // Show streaming platform preview
            this.currentUrl = url;
            this.currentFile = null;
            this.showStreamingPreview(url, platform);
            document.getElementById('analysisOptions').style.display = 'block';
            document.getElementById('analyzeButtonContainer').style.display = 'block';
            return;
            }
            
            // Check if it's a multimedia file
            const supportedExtensions = [
                '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp',
                '.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac',
                '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'
            ];
            
            const urlObj = new URL(url);
            const pathname = urlObj.pathname.toLowerCase();
            const isValidFile = supportedExtensions.some(ext => pathname.endsWith(ext));
            
            if (!isValidFile) {
                this.showError('URL does not point to a supported multimedia file or streaming platform');
                return;
            }

            // Show URL preview
            this.currentUrl = url;
            this.currentFile = null;
            this.showUrlPreview(url);
            document.getElementById('analysisOptions').style.display = 'block';
            document.getElementById('analyzeButtonContainer').style.display = 'block';
            
        } catch (error) {
            this.showError('Invalid URL format');
        }
    }

    detectStreamingPlatform(url) {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname.toLowerCase();
            
            // YouTube
            if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
                return 'youtube';
            }
            
            // Instagram
            if (hostname.includes('instagram.com')) {
                return 'instagram';
            }
            
            // TikTok
            if (hostname.includes('tiktok.com')) {
                return 'tiktok';
            }
            
            // Twitter/X
            if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
                return 'twitter';
            }
            
            // Facebook
            if (hostname.includes('facebook.com') || hostname.includes('fb.com')) {
                return 'facebook';
            }
            
            // Vimeo
            if (hostname.includes('vimeo.com')) {
                return 'vimeo';
            }
            
            // Twitch
            if (hostname.includes('twitch.tv')) {
                return 'twitch';
            }
            
            return null;
        } catch (error) {
            return null;
        }
    }

    showStreamingPreview(url, platform) {
        const preview = document.getElementById('urlPreview');
        const urlFileName = document.getElementById('urlFileName');
        const urlFileInfo = document.getElementById('urlFileInfo');
        const urlPreviewImage = document.getElementById('urlPreviewImage');

        const platformIcons = {
            youtube: 'fab fa-youtube text-danger',
            instagram: 'fab fa-instagram text-warning',
            tiktok: 'fab fa-tiktok text-dark',
            twitter: 'fab fa-twitter text-info',
            facebook: 'fab fa-facebook text-primary',
            vimeo: 'fab fa-vimeo text-success',
            twitch: 'fab fa-twitch text-purple'
        };

        const platformNames = {
            youtube: 'YouTube',
            instagram: 'Instagram',
            tiktok: 'TikTok',
            twitter: 'Twitter/X',
            facebook: 'Facebook',
            vimeo: 'Vimeo',
            twitch: 'Twitch'
        };
        
        urlFileName.innerHTML = `<i class="${platformIcons[platform]}"></i> ${platformNames[platform]} Content`;
        urlFileInfo.textContent = `URL: ${url}`;

        // Hide image preview for streaming platforms
        urlPreviewImage.style.display = 'none';

        preview.style.display = 'block';
    }

    showUrlPreview(url) {
        const preview = document.getElementById('urlPreview');
        const urlFileName = document.getElementById('urlFileName');
        const urlFileInfo = document.getElementById('urlFileInfo');
        const urlPreviewImage = document.getElementById('urlPreviewImage');

        const urlObj = new URL(url);
        const fileName = urlObj.pathname.split('/').pop() || 'Unknown file';
        
        urlFileName.textContent = fileName;
        urlFileInfo.textContent = `URL: ${url}`;

        // Show image preview if it's an image
        const pathname = urlObj.pathname.toLowerCase();
        if (pathname.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)) {
            urlPreviewImage.src = url;
            urlPreviewImage.style.display = 'block';
        } else {
            urlPreviewImage.style.display = 'none';
        }

        preview.style.display = 'block';
    }

    clearCurrentSelection() {
        this.currentFile = null;
        this.currentUrl = null;
        document.getElementById('analysisOptions').style.display = 'none';
        document.getElementById('filePreview').style.display = 'none';
        document.getElementById('urlPreview').style.display = 'none';
        document.getElementById('analyzeButtonContainer').style.display = 'none';
        document.getElementById('results').innerHTML = '';
    }

    showFilePreview(file) {
        const preview = document.getElementById('filePreview');
        const fileName = document.getElementById('fileName');
        const fileInfo = document.getElementById('fileInfo');
        const previewImage = document.getElementById('previewImage');

        fileName.textContent = file.name;
        fileInfo.textContent = `${this.formatFileSize(file.size)} | ${file.type}`;

        // Show image preview if it's an image
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImage.src = e.target.result;
                previewImage.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            previewImage.style.display = 'none';
        }

        preview.style.display = 'block';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    isVideoUrl(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname.toLowerCase();
            const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'];
            
            // Check for direct video file extensions
            if (videoExtensions.some(ext => pathname.endsWith(ext))) {
                return true;
            }
            
            // Check for streaming platforms (they also contain video)
            const streamingPlatforms = ['youtube.com', 'youtu.be', 'vimeo.com', 'tiktok.com', 'instagram.com', 'facebook.com', 'twitter.com', 'x.com', 'twitch.tv'];
            return streamingPlatforms.some(platform => urlObj.hostname.includes(platform));
        } catch (error) {
            return false;
        }
    }

    async analyzeContent() {
        if (!this.currentFile && !this.currentUrl) {
            this.showError('Please select a file or enter a URL');
            return;
        }

        // Get analysis options
        const analysisOptions = this.getAnalysisOptions();
        
        // Validate that at least one analysis feature is selected
        if (!this.hasSelectedAnalysisFeatures(analysisOptions)) {
            this.showError('Please select at least one analysis feature to run');
            return;
        }

        this.showProgress();
        this.addLiveStatus('Analysis started', 'info');

        try {
            let result;

            if (this.currentFile) {
                // File upload analysis
                this.updateProgress(5, 'Preparing file upload...');
                this.updateCurrentStep('File validation', 'info');
                this.addLiveStatus('Checking file type and size', 'info');
                
                const formData = new FormData();
                formData.append('file', this.currentFile);
                
                // Add analysis options to form data
                Object.keys(analysisOptions).forEach(key => {
                    formData.append(key, analysisOptions[key]);
                });

                this.updateProgress(15, 'Uploading file to server...');
                this.updateCurrentStep('File upload', 'info');
                this.addLiveStatus('Transferring file to analysis server', 'info');

                const response = await fetch(`${this.apiBaseUrl}/analyze`, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                this.updateProgress(25, 'Processing file...');
                this.completeStep('File upload', 'File successfully uploaded');
                this.updateCurrentStep('File processing', 'info');
                this.addLiveStatus('Preparing file for analysis', 'info');

                // Simulate analysis steps based on selected options
                this.simulateAnalysisSteps(analysisOptions);

                result = await response.json();

            } else if (this.currentUrl) {
                // URL analysis
                this.updateProgress(5, 'Validating URL...');
                this.updateCurrentStep('URL validation', 'info');
                this.addLiveStatus('Checking URL format and platform', 'info');
                
                const platform = this.detectStreamingPlatform(this.currentUrl);
                if (platform) {
                    this.updateProgress(15, `Downloading from ${platform}...`);
                    this.completeStep('URL validation', `Detected ${platform}`);
                    this.updateCurrentStep('Content download', 'info');
                    this.addLiveStatus(`Downloading from ${platform}`, 'info');
                } else {
                    this.updateProgress(15, 'Downloading file...');
                    this.completeStep('URL validation', 'Direct file URL');
                    this.updateCurrentStep('File download', 'info');
                    this.addLiveStatus('Downloading multimedia file', 'info');
                }

                const response = await fetch(`${this.apiBaseUrl}/analyze/url`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        url: this.currentUrl,
                        options: analysisOptions
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                }

                this.updateProgress(25, 'Processing downloaded content...');
                this.completeStep('Content download', 'Content successfully downloaded');
                this.updateCurrentStep('Content processing', 'info');
                this.addLiveStatus('Preparing for analysis', 'info');

                // Simulate analysis steps based on selected options
                this.simulateAnalysisSteps(analysisOptions);

                result = await response.json();
            }
            
            this.updateProgress(95, 'Finalizing results...');
            this.updateCurrentStep('Result compilation', 'info');
            this.addLiveStatus('Organizing analysis data', 'info');
            
            this.updateProgress(100, 'Analysis complete!');
            this.completeStep('Analysis complete', 'All processing finished');
            this.addLiveStatus('Analysis completed successfully!', 'success');
            
            setTimeout(() => {
                this.hideProgress();
                this.displayResults(result);
            }, 1500);

        } catch (error) {
            this.addLiveStatus(`Analysis failed: ${error.message}`, 'error');
            this.hideProgress();
            this.showError(`Analysis failed: ${error.message}`);
        }
    }

    showProgress() {
        document.getElementById('progressCard').style.display = 'block';
        document.getElementById('analyzeBtn').disabled = true;
        document.getElementById('cancelAnalysisBtn').style.display = 'inline-block';
        
        // Initialize progress tracking
        this.analysisSteps = [];
        this.completedSteps = [];
        this.currentStep = 'Initializing...';
        this.updateProgressDisplay();
    }

    hideProgress() {
        document.getElementById('progressCard').style.display = 'none';
        document.getElementById('analyzeBtn').disabled = false;
        document.getElementById('cancelAnalysisBtn').style.display = 'none';
    }

    updateProgress(percentage, text) {
        const progressBar = document.getElementById('progressBar');
        const progressPercentage = document.getElementById('progressPercentage');
        const progressText = document.getElementById('progressText');
        const progressTitle = document.getElementById('progressTitle');
        
        progressBar.style.width = `${percentage}%`;
        progressBar.setAttribute('aria-valuenow', percentage);
        progressPercentage.textContent = `${percentage}%`;
        progressText.textContent = text;
        
        // Update title based on percentage
        if (percentage < 25) {
            progressTitle.textContent = 'Initializing Analysis...';
        } else if (percentage < 50) {
            progressTitle.textContent = 'Processing Content...';
        } else if (percentage < 75) {
            progressTitle.textContent = 'Analyzing Data...';
        } else if (percentage < 100) {
            progressTitle.textContent = 'Finalizing Results...';
        } else {
            progressTitle.textContent = 'Analysis Complete!';
        }
    }

    updateCurrentStep(step, status = 'info') {
        this.currentStep = step;
        const currentStepElement = document.getElementById('currentStep');
        currentStepElement.textContent = step;
        
        // Add to live status
        this.addLiveStatus(step, status);
    }

    completeStep(step, details = '') {
        this.completedSteps.push({ step, details, timestamp: new Date() });
        this.updateCompletedStepsDisplay();
        this.addLiveStatus(`${step} completed`, 'success');
    }

    addLiveStatus(message, type = 'info') {
        const container = document.getElementById('liveStatusContainer');
        const statusDiv = document.createElement('div');
        statusDiv.className = `status-message ${type}`;
        
        const icon = type === 'error' ? 'fas fa-exclamation-circle text-danger' :
                    type === 'warning' ? 'fas fa-exclamation-triangle text-warning' :
                    type === 'success' ? 'fas fa-check-circle text-success' :
                    'fas fa-info-circle text-info';
        
        statusDiv.innerHTML = `
            <i class="${icon} me-2"></i>
            <span>${message}</span>
            <small class="text-muted ms-auto">${new Date().toLocaleTimeString()}</small>
        `;
        
        container.appendChild(statusDiv);
        
        // Auto-scroll to bottom
        container.scrollTop = container.scrollHeight;
        
        // Keep only last 10 messages
        const messages = container.querySelectorAll('.status-message');
        if (messages.length > 10) {
            messages[0].remove();
        }
    }

    updateCompletedStepsDisplay() {
        const container = document.getElementById('completedSteps');
        
        if (this.completedSteps.length === 0) {
            container.innerHTML = '<small class="text-muted">No steps completed yet</small>';
            return;
        }
        
        container.innerHTML = this.completedSteps.map(item => `
            <div class="completed-step-item">
                <i class="fas fa-check-circle text-success me-2"></i>
                <div>
                    <div class="fw-bold">${item.step}</div>
                    ${item.details ? `<small class="text-muted">${item.details}</small>` : ''}
                    <small class="text-muted d-block">${item.timestamp.toLocaleTimeString()}</small>
                </div>
            </div>
        `).join('');
    }

    updateProgressDisplay() {
        this.updateCompletedStepsDisplay();
        this.updateCurrentStep(this.currentStep);
    }

    cancelAnalysis() {
        if (confirm('Are you sure you want to cancel the current analysis?')) {
            this.addLiveStatus('Analysis cancelled by user', 'warning');
            this.hideProgress();
            this.showError('Analysis was cancelled');
        }
    }

    addAnalysisStep(step, details = '') {
        const progressCard = document.getElementById('progressCard');
        const progressText = document.getElementById('progressText');
        
        // Create step indicator if it doesn't exist
        let stepList = progressCard.querySelector('.analysis-steps');
        if (!stepList) {
            stepList = document.createElement('ul');
            stepList.className = 'analysis-steps list-unstyled mt-3';
            stepList.style.fontSize = '0.9rem';
            progressCard.querySelector('.card-body').appendChild(stepList);
        }
        
        // Add new step
        const stepItem = document.createElement('li');
        stepItem.className = 'text-success mb-1';
        stepItem.innerHTML = `<i class="fas fa-check-circle"></i> ${step}`;
        if (details) {
            stepItem.innerHTML += ` <small class="text-muted">(${details})</small>`;
        }
        stepList.appendChild(stepItem);
        
        // Update progress text
        progressText.textContent = step;
    }

    displayResults(result) {
        const resultsContainer = document.getElementById('results');
        resultsContainer.innerHTML = '';

        const resultCard = document.createElement('div');
        resultCard.className = 'card result-card';
        
        // Add source information
        let sourceInfo = '';
        if (result.sourceUrl) {
            const platformIcon = result.platform ? this.getPlatformIcon(result.platform) : '';
            const platformName = result.platform ? this.getPlatformName(result.platform) : '';
            
            sourceInfo = `
                <div class="mb-3">
                    <small class="text-muted">
                        <i class="fas fa-link"></i> Source: 
                        <a href="${result.sourceUrl}" target="_blank" rel="noopener noreferrer">
                            ${result.sourceUrl}
                        </a>
                        ${platformIcon ? ` <i class="${platformIcon}"></i> ${platformName}` : ''}
                    </small>
                </div>
            `;
        }
        
        resultCard.innerHTML = `
            <div class="card-header">
                <h5><i class="fas fa-chart-bar"></i> Analysis Results</h5>
            </div>
            <div class="card-body">
                ${sourceInfo}
                ${this.formatResults(result)}
            </div>
        `;

        resultsContainer.appendChild(resultCard);
        
        console.log('=== RESULTS CARD ADDED TO DOM ===');
        console.log('Results container:', resultsContainer);
        console.log('Result card:', resultCard);
        
        // Check if video element exists immediately
        const immediateVideoCheck = document.getElementById('transcriptionVideoPlayer');
        console.log('Immediate video element check:', !!immediateVideoCheck);
        
        // Setup thumbnail hover effects and video player controls after DOM is updated
        setTimeout(() => {
            this.setupThumbnailHoverEffects();
            console.log('About to setup video player controls...');
            this.setupVideoPlayerControls();
        }, 100);
    }

    displayAnalysisSteps(steps, container) {
        const stepsCard = document.createElement('div');
        stepsCard.className = 'card mb-3';
        stepsCard.innerHTML = `
            <div class="card-header bg-info text-white">
                <h6 class="mb-0"><i class="fas fa-list-check"></i> Analysis Steps</h6>
            </div>
            <div class="card-body">
                <ul class="list-unstyled mb-0">
                    ${steps.map((step, index) => `
                        <li class="mb-2">
                            <div class="d-flex align-items-center">
                                <span class="badge bg-success me-2">${index + 1}</span>
                                <span class="text-success">
                                    <i class="fas fa-check-circle me-1"></i>
                                    ${step}
                                </span>
                            </div>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
        container.appendChild(stepsCard);
    }

    getPlatformIcon(platform) {
        const platformIcons = {
            youtube: 'fab fa-youtube text-danger',
            instagram: 'fab fa-instagram text-warning',
            tiktok: 'fab fa-tiktok text-dark',
            twitter: 'fab fa-twitter text-info',
            facebook: 'fab fa-facebook text-primary',
            vimeo: 'fab fa-vimeo text-success',
            twitch: 'fab fa-twitch text-purple'
        };
        return platformIcons[platform] || '';
    }

    getPlatformName(platform) {
        const platformNames = {
            youtube: 'YouTube',
            instagram: 'Instagram',
            tiktok: 'TikTok',
            twitter: 'Twitter/X',
            facebook: 'Facebook',
            vimeo: 'Vimeo',
            twitch: 'Twitch'
        };
        return platformNames[platform] || platform;
    }

    getSentimentIcon(sentiment) {
        const icons = {
            'positive': '😊',
            'negative': '😞',
            'neutral': '😐',
            'mixed': '🤔'
        };
        return icons[sentiment] || '😐';
    }

    getSentimentColor(sentiment) {
        const colors = {
            'positive': 'text-success',
            'negative': 'text-danger',
            'neutral': 'text-secondary',
            'mixed': 'text-warning'
        };
        return colors[sentiment] || 'text-secondary';
    }

    getEntityTypeColor(type) {
        const colors = {
            'PERSON': 'bg-primary',
            'ORGANIZATION': 'bg-success',
            'LOCATION': 'bg-info',
            'DATE': 'bg-warning',
            'MONEY': 'bg-danger',
            'PERCENT': 'bg-secondary',
            'QUANTITY': 'bg-dark',
            'EVENT': 'bg-purple',
            'PRODUCT': 'bg-orange',
            'TECHNOLOGY': 'bg-teal'
        };
        return colors[type] || 'bg-light text-dark';
    }

    getEntityTypeIcon(type) {
        const icons = {
            'PERSON': 'fas fa-user',
            'ORGANIZATION': 'fas fa-building',
            'LOCATION': 'fas fa-map-marker-alt',
            'DATE': 'fas fa-calendar',
            'MONEY': 'fas fa-dollar-sign',
            'PERCENT': 'fas fa-percentage',
            'QUANTITY': 'fas fa-ruler',
            'EVENT': 'fas fa-calendar-alt',
            'PRODUCT': 'fas fa-box',
            'TECHNOLOGY': 'fas fa-microchip'
        };
        return icons[type] || 'fas fa-tag';
    }

    groupEntitiesByType(entities) {
        const grouped = {};
        
        entities.forEach(entity => {
            if (!grouped[entity.type]) {
                grouped[entity.type] = [];
            }
            grouped[entity.type].push(entity);
        });
        
        let html = '';
        
        Object.keys(grouped).forEach(type => {
            const entitiesOfType = grouped[type];
            const color = this.getEntityTypeColor(type);
            const icon = this.getEntityTypeIcon(type);
            
            html += `
                <div class="entity-category mb-3">
                    <h6 class="mb-2">
                        <i class="${icon} text-primary"></i> ${type} (${entitiesOfType.length})
                    </h6>
                    <div class="d-flex flex-wrap gap-2">
                        ${entitiesOfType.map(entity => {
                            const confidence = entity.confidence ? ` (${(entity.confidence * 100).toFixed(0)}%)` : '';
                            return `
                                <span class="badge ${color} text-white" title="${entity.context || ''}">
                                    ${entity.text}${confidence}
                                </span>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        });
        
        return html;
    }

    displaySpeakerProfiles(speakerProfiles) {
        let html = '';
        
        speakerProfiles.forEach(profile => {
            const confidenceColor = profile.confidence > 0.8 ? 'text-success' : 
                                  profile.confidence > 0.6 ? 'text-warning' : 'text-danger';
            
            // Add recognition status badge
            const recognitionBadge = profile.isRecognized ? 
                `<span class="badge bg-success ms-2"><i class="fas fa-check-circle"></i> Recognized</span>` :
                `<span class="badge bg-info ms-2"><i class="fas fa-plus-circle"></i> New Speaker</span>`;
            
            // Add match similarity if available
            const similarityInfo = profile.matchSimilarity ? 
                `<p class="mb-1"><strong>Match Similarity:</strong> <span class="text-success">${(profile.matchSimilarity * 100).toFixed(1)}%</span></p>` : '';
            
            html += `
                <div class="speaker-profile mb-3 p-3 border rounded ${profile.isRecognized ? 'border-success' : 'border-info'}">
                    <div class="row">
                        <div class="col-md-6">
                            <h6 class="mb-2">
                                <i class="fas fa-user-circle text-primary"></i> 
                                ${profile.name}
                                <span class="badge bg-secondary ms-2">Speaker ${profile.speakerTag}</span>
                                ${recognitionBadge}
                            </h6>
                            <div class="speaker-stats">
                                <p class="mb-1"><strong>Words:</strong> ${profile.wordCount}</p>
                                <p class="mb-1"><strong>Speaking Time:</strong> ${profile.speakingTime.toFixed(1)}s</p>
                                <p class="mb-1"><strong>Words/Minute:</strong> ${profile.wordsPerMinute}</p>
                                <p class="mb-1"><strong>Avg Word Length:</strong> ${profile.averageWordLength}</p>
                                <p class="mb-1"><strong>Confidence:</strong> <span class="${confidenceColor}">${(profile.confidence * 100).toFixed(0)}%</span></p>
                                ${similarityInfo}
                            </div>
                            ${profile.note ? `<p class="mb-1 text-muted small"><em>${profile.note}</em></p>` : ''}
                        </div>
                        <div class="col-md-6">
                            <h6 class="mb-2">Voice Characteristics</h6>
                            <div class="voice-characteristics">
                                <p class="mb-1"><strong>Pitch:</strong> ${profile.voiceCharacteristics.estimatedPitch}</p>
                                <p class="mb-1"><strong>Tempo:</strong> ${profile.voiceCharacteristics.estimatedTempo}</p>
                                <p class="mb-1"><strong>Clarity:</strong> ${profile.voiceCharacteristics.estimatedClarity}</p>
                                <p class="mb-1"><strong>Volume:</strong> ${profile.voiceCharacteristics.estimatedVolume}</p>
                            </div>
                            <div class="mt-2">
                                <h6 class="mb-1">Speaking Style</h6>
                                <p class="mb-0 text-muted small">${profile.speakingStyle}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        return html;
    }

    formatMetadata(metadata) {
        let html = '';
        
        if (metadata.title) {
            html += `<p><strong>Title:</strong> ${metadata.title}</p>`;
        }
        
        if (metadata.author) {
            html += `<p><strong>Author:</strong> ${metadata.author}</p>`;
        }
        
        if (metadata.duration) {
            const minutes = Math.floor(metadata.duration / 60);
            const seconds = metadata.duration % 60;
            html += `<p><strong>Duration:</strong> ${minutes}:${seconds.toString().padStart(2, '0')}</p>`;
        }
        
        if (metadata.viewCount) {
            html += `<p><strong>Views:</strong> ${parseInt(metadata.viewCount).toLocaleString()}</p>`;
        }
        
        if (metadata.platform) {
            html += `<p><strong>Platform:</strong> ${metadata.platform}</p>`;
        }
        
        return html || '<p class="text-muted">No additional metadata available</p>';
    }

    formatResults(result) {
        let html = '';

        // Analysis Steps
        if (result.analysisSteps && result.analysisSteps.length > 0) {
            html += `
                <div class="analysis-section mb-4">
                    <h6><i class="fas fa-list-check text-info"></i> Analysis Steps</h6>
                    <div class="card">
                        <div class="card-body">
                            <ul class="list-unstyled mb-0">
                                ${result.analysisSteps.map((step, index) => `
                                    <li class="mb-2">
                                        <div class="d-flex align-items-center">
                                            <span class="badge bg-success me-2">${index + 1}</span>
                                            <span class="text-success">
                                                <i class="fas fa-check-circle me-1"></i>
                                                ${step}
                                            </span>
                                        </div>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
            `;
        }

        // Thumbnails
        if (result.thumbnails) {
            html += this.displayThumbnails(result.thumbnails);
        }

        // Tags and Category
        if (result.tags || result.category) {
            html += `
                <div class="analysis-section mb-4">
                    <h6><i class="fas fa-tags text-primary"></i> Content Classification</h6>
                    <div class="card">
                        <div class="card-body">
                            ${result.category ? `
                                <div class="mb-3">
                                    <strong><i class="fas fa-folder text-info"></i> Category:</strong>
                                    <span class="badge bg-info text-white ms-2">${this.formatCategory(result.category)}</span>
                                </div>
                            ` : ''}
                            ${result.tags && result.tags.length > 0 ? `
                                <div>
                                    <strong><i class="fas fa-tag text-success"></i> Tags:</strong>
                                    <div class="d-flex flex-wrap gap-2 mt-2">
                                        ${result.tags.map(tag => `
                                            <span class="badge bg-light text-dark border">${this.formatTag(tag)}</span>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }

        // Streaming Platform Metadata
        if (result.metadata && Object.keys(result.metadata).length > 0) {
            html += `
                <div class="analysis-section">
                    <h6><i class="fas fa-info-circle text-info"></i> Platform Information</h6>
                    <div class="card">
                        <div class="card-body">
                            ${this.formatMetadata(result.metadata)}
                        </div>
                    </div>
                </div>
            `;
        }

        // Object Detection Results
        if (result.objects && result.objects.length > 0) {
            html += `
                <div class="analysis-section">
                    <h6><i class="fas fa-image text-primary"></i> Detected Objects</h6>
                    <div class="row">
                        ${result.objects.map(obj => {
                            let objectInfo = `<strong>${obj.name}</strong><br>`;
                            objectInfo += `<small class="text-muted">Confidence: ${(obj.confidence * 100).toFixed(1)}%</small>`;
                            
                            // Add bounding box information if available
                            if (obj.boundingBox && obj.boundingBox.length > 0) {
                                const coords = obj.boundingBox.map(vertex => 
                                    `(${vertex.x?.toFixed(3) || vertex.x}, ${vertex.y?.toFixed(3) || vertex.y})`
                                ).join(', ');
                                objectInfo += `<br><small class="text-muted">Location: [${coords}]</small>`;
                            }
                            
                            return `
                                <div class="col-md-4 mb-2">
                                    <div class="card">
                                        <div class="card-body p-2">
                                            ${objectInfo}
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        // Labels Results
        if (result.labels && result.labels.length > 0) {
            html += `
                <div class="analysis-section">
                    <h6><i class="fas fa-tags text-success"></i> Image Labels</h6>
                    <div class="d-flex flex-wrap gap-2">
                        ${result.labels.map(label => `
                            <span class="badge bg-light text-dark">
                                ${label.description} (${(label.confidence * 100).toFixed(1)}%)
                            </span>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // Text Recognition Results
        if (result.text) {
            let textHtml = `<p class="mb-0">${result.text}</p>`;
            
            // Add individual text detections with locations if available
            if (result.textDetections && result.textDetections.length > 0) {
                textHtml += `
                    <div class="mt-3">
                        <h6 class="text-muted">Text Detections:</h6>
                        <div class="text-detections" style="max-height: 200px; overflow-y: auto; font-size: 0.9rem;">
                            ${result.textDetections.map(detection => {
                                const coords = detection.boundingBox ? 
                                    `[${detection.boundingBox.map(v => `(${v.x},${v.y})`).join(', ')}]` : '';
                                return `<span class="badge bg-info text-white me-1 mb-1">${detection.text} ${coords}</span>`;
                            }).join('')}
                        </div>
                    </div>
                `;
            }
            
            html += `
                <div class="analysis-section">
                    <h6><i class="fas fa-file-text text-info"></i> Extracted Text</h6>
                    <div class="card">
                        <div class="card-body">
                            ${textHtml}
                        </div>
                    </div>
                </div>
            `;
        }

        // Transcription Results
        if (result.transcription) {
            let transcriptionHtml = `<p class="mb-0">${result.transcription.text}</p>`;
            
            // Add integrated video player if we have a video file
            let hasVideo = (this.currentFile && this.currentFile.type.startsWith('video/')) || 
                          (this.currentUrl && this.isVideoUrl(this.currentUrl));
            
            console.log('=== VIDEO PLAYER CHECK ===');
            console.log('hasVideo:', hasVideo);
            console.log('currentFile:', !!this.currentFile);
            console.log('currentUrl:', !!this.currentUrl);
            console.log('result.cached:', result.cached);
            console.log('result.sourceUrl:', result.sourceUrl);
            
            if (hasVideo) {
                let videoUrl, videoType;
                
                if (this.currentFile) {
                    // For uploaded files, use server path instead of blob URL
                    // The file path should be available from the analysis result
                    if (result.filePath) {
                        videoUrl = `${window.location.origin}/${result.filePath}`;
                    } else {
                        // Fallback to blob URL if server path not available
                        videoUrl = URL.createObjectURL(this.currentFile);
                    }
                    videoType = this.currentFile.type;
                    
                    console.log('=== BLOB URL CREATED ===');
                    console.log('Blob URL:', videoUrl);
                    console.log('File type:', this.currentFile.type);
                    
                    // Test if blob URL is valid
                    fetch(videoUrl, { method: 'HEAD' })
                        .then(response => {
                            console.log('Blob URL test - Status:', response.status);
                            console.log('Blob URL test - Headers:', Object.fromEntries(response.headers));
                        })
                        .catch(error => {
                            console.error('Blob URL test failed:', error);
                        });
                    
                    // Validate video type
                    if (!videoType || videoType === 'application/octet-stream') {
                        const fileName = this.currentFile.name.toLowerCase();
                        if (fileName.endsWith('.mp4')) videoType = 'video/mp4';
                        else if (fileName.endsWith('.webm')) videoType = 'video/webm';
                        else if (fileName.endsWith('.ogg')) videoType = 'video/ogg';
                        else if (fileName.endsWith('.avi')) videoType = 'video/x-msvideo';
                        else if (fileName.endsWith('.mov')) videoType = 'video/quicktime';
                        else videoType = 'video/mp4'; // Default fallback
                        
                        console.log('Video type corrected to:', videoType);
                    }
                } else if (this.currentUrl) {
                    // For URLs, use server file path if available, otherwise use direct URL
                    if (result.filePath) {
                        videoUrl = `${window.location.origin}/${result.filePath}`;
                        console.log('=== USING SERVER FILE PATH FOR URL ===');
                        console.log('Server file path:', result.filePath);
                    } else {
                        videoUrl = this.currentUrl;
                        console.log('=== USING DIRECT URL ===');
                    }
                    videoType = 'video/mp4'; // Default for URLs
                    console.log('Video URL:', videoUrl);
                } else {
                    // No current file or URL - this shouldn't happen if hasVideo is true
                    console.log('=== NO VIDEO SOURCE AVAILABLE ===');
                    console.log('hasVideo was true but no currentFile or currentUrl available');
                    hasVideo = false;
                }
                
                if (hasVideo && videoUrl) {
                    console.log('Creating video player with:', { videoUrl, videoType, isFile: !!this.currentFile });
                    
                    // Log file details if it's an uploaded file
                    if (this.currentFile) {
                        console.log('File details:', {
                            name: this.currentFile.name,
                            size: this.currentFile.size,
                            type: this.currentFile.type,
                            lastModified: this.currentFile.lastModified
                        });
                        
                        // Check if it's a valid video file
                        if (!this.currentFile.type.startsWith('video/') && !this.currentFile.name.toLowerCase().match(/\.(mp4|webm|ogg|avi|mov|wmv|flv|mkv)$/)) {
                            console.warn('File may not be a valid video file');
                        }
                        
                        // Test video compatibility
                        this.testVideoCompatibility(this.currentFile, videoType);
                    }
                    
                    console.log('=== CREATING VIDEO PLAYER HTML ===');
                    console.log('Video URL length:', videoUrl.length);
                    console.log('Video type:', videoType);
                    
                    transcriptionHtml += `
                        <div class="mt-4">
                            <h6><i class="fas fa-play-circle text-primary"></i> Video Player</h6>
                            <div class="video-player-container">
                                <!-- Video.js Player with Native HTML5 Fallback -->
                                <video
                                    id="transcriptionVideoPlayer"
                                    class="video-js vjs-default-skin"
                                    controls
                                    preload="auto"
                                    width="100%"
                                    height="400"
                                    style="max-width: 100%;"
                                    data-setup='{"fluid": true, "responsive": true}'>
                                    <source src="${videoUrl}" type="${videoType}">
                                    <p class="vjs-no-js">
                                        To view this video please enable JavaScript, and consider upgrading to a web browser that
                                        <a href="https://videojs.com/html5-video-support/" target="_blank">supports HTML5 video</a>.
                                    </p>
                                </video>
                                
                                <!-- Video Debug Info -->
                                <div class="mt-2">
                                    <small class="text-muted">
                                        <strong>Debug Info:</strong> 
                                        Source: ${this.currentFile ? 'File Upload' : 'URL'} | 
                                        Type: ${videoType} | 
                                        URL Length: ${videoUrl.length} chars |
                                        Player: Video.js + HTML5 Fallback
                                    </small>
                                </div>
                                
                                <!-- Manual Test Button -->
                                <div class="mt-2">
                                    <button class="btn btn-sm btn-outline-primary" onclick="window.analyzer.testVideoPlayer()">
                                        <i class="fas fa-play"></i> Test Video Player
                                    </button>
                                    <button class="btn btn-sm btn-outline-info ms-2" onclick="window.analyzer.debugVideoPlayer()">
                                        <i class="fas fa-info"></i> Debug Info
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    console.log('=== VIDEO PLAYER CREATION FAILED ===');
                    console.log('hasVideo:', hasVideo);
                    console.log('videoUrl:', videoUrl);
                }
            }
            
            // If this looks like a video analysis but no video player was created, show a message
            if (!hasVideo && (result.cached || result.sourceUrl) && 
                (result.transcription || result.ocrCaptions || result.thumbnails)) {
                console.log('=== VIDEO ANALYSIS DETECTED BUT NO PLAYER ===');
                console.log('This appears to be a video analysis but video player cannot be created');
                
                transcriptionHtml += `
                    <div class="mt-4">
                        <h6><i class="fas fa-play-circle text-primary"></i> Video Player</h6>
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle"></i> 
                            <strong>Video Player Not Available:</strong> 
                            ${result.cached ? 
                                'This is a cached analysis result. The original video file is no longer available for playback.' :
                                'The video source is not available for playback.'
                            }
                            ${result.sourceUrl ? `<br><small class="text-muted">Original source: <a href="${result.sourceUrl}" target="_blank">${result.sourceUrl}</a></small>` : ''}
                        </div>
                    </div>
                `;
            }
            
            // Add word-level timestamps if available
            if (result.transcription.words && result.transcription.words.length > 0) {
                transcriptionHtml += `
                    <div class="mt-3">
                        <h6 class="text-muted">Word-level Timestamps:</h6>
                        <div class="word-timestamps" style="max-height: 200px; overflow-y: auto; font-size: 0.9rem;">
                            ${result.transcription.words.map(word => {
                                const startTime = word.startTime || word.start;
                                const endTime = word.endTime || word.end;
                                const confidence = word.confidence;
                                const timeStr = startTime ? `[${startTime}s]` : '';
                                const confidenceStr = confidence ? ` (${(confidence * 100).toFixed(1)}%)` : '';
                                const clickableClass = hasVideo && startTime ? 'clickable-timestamp' : '';
                                const clickHandler = hasVideo && startTime ? `onclick="window.analyzer.seekToTime(${startTime})"` : '';
                                return `<span class="badge bg-light text-dark me-1 mb-1 ${clickableClass}" ${clickHandler} ${startTime ? `title="Click to jump to ${this.formatDuration(startTime)}"` : ''}>${word.word} ${timeStr}${confidenceStr}</span>`;
                            }).join('')}
                        </div>
                    </div>
                `;
            }
            
            // Add speaker diarization if available
            if (result.transcription.speakers && result.transcription.speakers.length > 0) {
                transcriptionHtml += `
                    <div class="mt-3">
                        <h6 class="text-muted">Speaker Diarization:</h6>
                        <div class="speaker-diarization" style="max-height: 200px; overflow-y: auto; font-size: 0.9rem;">
                            ${result.transcription.speakers.map(word => {
                                const startTime = word.startTime || word.start;
                                const speakerTag = word.speakerTag;
                                const confidence = word.confidence;
                                const timeStr = startTime ? `[${startTime}s]` : '';
                                const confidenceStr = confidence ? ` (${(confidence * 100).toFixed(1)}%)` : '';
                                const speakerColor = speakerTag === 1 ? 'bg-primary' : 'bg-success';
                                return `<span class="badge ${speakerColor} text-white me-1 mb-1">Speaker ${speakerTag}: ${word.word} ${timeStr}${confidenceStr}</span>`;
                            }).join('')}
                        </div>
                    </div>
                `;
            }
            
            html += `
                <div class="analysis-section">
                    <h6><i class="fas fa-microphone text-warning"></i> Audio Transcription</h6>
                    <div class="card">
                        <div class="card-body">
                            ${transcriptionHtml}
                            <small class="text-muted">Provider: ${result.transcription.provider}</small>
                        </div>
                    </div>
                </div>
            `;
        }

        // OCR Caption Results
        if (result.ocrCaptions) {
            const ocrCaptions = result.ocrCaptions;
            
            html += `
                <div class="analysis-section">
                    <h6><i class="fas fa-font text-info"></i> OCR Video Captions</h6>
                    <div class="card">
                        <div class="card-body">
                            ${ocrCaptions.captions && ocrCaptions.captions.length > 0 ? `
                                <div class="mb-3">
                                    <h6>Extracted Text Timeline</h6>
                                    <div class="ocr-timeline" style="max-height: 300px; overflow-y: auto;">
                                        ${ocrCaptions.captions.map(caption => `
                                            <div class="caption-entry mb-2 p-2 border rounded">
                                                <div class="d-flex justify-content-between align-items-start">
                                                    <div class="flex-grow-1">
                                                        <div class="caption-text mb-1">
                                                            <strong>${caption.text}</strong>
                                                        </div>
                                                        <div class="caption-meta">
                                                            <span class="badge bg-primary me-2" style="cursor: pointer;" onclick="window.analyzer.seekToTime(${caption.timestamp})">
                                                                <i class="fas fa-play"></i> ${caption.timeString}
                                                            </span>
                                                            <span class="badge bg-light text-dark">
                                                                Frame ${caption.frameIndex}
                                                            </span>
                                                            <span class="badge bg-success">
                                                                ${(caption.confidence * 100).toFixed(1)}% confidence
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                ${caption.textDetections && caption.textDetections.length > 0 ? `
                                                    <div class="mt-2">
                                                        <small class="text-muted">Individual detections:</small>
                                                        <div class="text-detections">
                                                            ${caption.textDetections.map(detection => 
                                                                `<span class="badge bg-light text-dark me-1 mb-1" title="Confidence: ${(detection.confidence * 100).toFixed(1)}%">
                                                                    ${detection.text}
                                                                </span>`
                                                            ).join('')}
                                                        </div>
                                                    </div>
                                                ` : ''}
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                                
                                <div class="mt-3">
                                    <h6>OCR Statistics</h6>
                                    <div class="row">
                                        <div class="col-md-3">
                                            <div class="text-center">
                                                <h4 class="text-primary">${ocrCaptions.captions.length}</h4>
                                                <small class="text-muted">Captions Found</small>
                                            </div>
                                        </div>
                                        <div class="col-md-3">
                                            <div class="text-center">
                                                <h4 class="text-info">${ocrCaptions.totalFrames}</h4>
                                                <small class="text-muted">Frames Processed</small>
                                            </div>
                                        </div>
                                        <div class="col-md-3">
                                            <div class="text-center">
                                                <h4 class="text-success">${ocrCaptions.frameInterval}s</h4>
                                                <small class="text-muted">Frame Interval</small>
                                            </div>
                                        </div>
                                        <div class="col-md-3">
                                            <div class="text-center">
                                                <h4 class="text-warning">${this.formatDuration(ocrCaptions.duration)}</h4>
                                                <small class="text-muted">Video Duration</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                ${ocrCaptions.allText ? `
                                    <div class="mt-3">
                                        <h6>All Extracted Text</h6>
                                        <div class="all-text-container p-3 bg-light rounded" style="max-height: 150px; overflow-y: auto;">
                                            <p class="mb-0 text-muted">${ocrCaptions.allText}</p>
                                        </div>
                                    </div>
                                ` : ''}
                            ` : `
                                <p class="text-muted">No text found in video frames.</p>
                            `}
                            <small class="text-muted">Provider: ${ocrCaptions.provider}</small>
                        </div>
                    </div>
                </div>
            `;
        }

        // Summary Results
        if (result.summary) {
            const summaryText = result.summary.summary || result.summary;
            const summaryProvider = result.summary.provider || 'OpenAI GPT-4';
            
            html += `
                <div class="analysis-section">
                    <h6><i class="fas fa-compress-alt text-secondary"></i> Summary</h6>
                    <div class="card">
                        <div class="card-body">
                            <p class="mb-0">${summaryText}</p>
                            <small class="text-muted">Provider: ${summaryProvider}</small>
                        </div>
                    </div>
                </div>
            `;
        }

        // Sentiment Analysis Results
        if (result.sentiment) {
            const sentiment = result.sentiment;
            const sentimentIcon = this.getSentimentIcon(sentiment.overallSentiment);
            const sentimentColor = this.getSentimentColor(sentiment.overallSentiment);
            
            html += `
                <div class="analysis-section">
                    <h6><i class="fas fa-smile ${sentimentColor}"></i> Sentiment Analysis</h6>
                    <div class="card">
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <h6>Overall Sentiment</h6>
                                    <div class="d-flex align-items-center mb-2">
                                        <span class="badge ${sentimentColor} fs-6 me-2">${sentimentIcon} ${sentiment.overallSentiment.toUpperCase()}</span>
                                        <span class="text-muted">(${(sentiment.confidence * 100).toFixed(1)}% confidence)</span>
                                    </div>
                                    <p><strong>Tone:</strong> ${sentiment.tone || 'Not detected'}</p>
                                </div>
                                <div class="col-md-6">
                                    <h6>Detected Emotions</h6>
                                    ${sentiment.emotions && sentiment.emotions.length > 0 ? 
                                        sentiment.emotions.map(emotion => 
                                            `<span class="badge bg-light text-dark me-1 mb-1">${emotion}</span>`
                                        ).join('') : 
                                        '<span class="text-muted">No specific emotions detected</span>'
                                    }
                                </div>
                            </div>
                            ${sentiment.summary ? `
                                <div class="mt-3">
                                    <h6>Emotional Context</h6>
                                    <p class="mb-0 text-muted">${sentiment.summary}</p>
                                </div>
                            ` : ''}
                            <small class="text-muted">Provider: ${sentiment.provider || 'OpenAI GPT-4'}</small>
                        </div>
                    </div>
                </div>
            `;
        }

        // Named Entity Recognition Results
        if (result.entities) {
            const entities = result.entities;
            
            html += `
                <div class="analysis-section">
                    <h6><i class="fas fa-tags text-primary"></i> Named Entity Recognition</h6>
                    <div class="card">
                        <div class="card-body">
                            ${entities.entities && entities.entities.length > 0 ? `
                                <div class="row">
                                    <div class="col-12">
                                        <h6>Detected Entities</h6>
                                        <div class="entity-categories">
                                            ${this.groupEntitiesByType(entities.entities)}
                                        </div>
                                    </div>
                                </div>
                                ${entities.summary ? `
                                    <div class="mt-3">
                                        <h6>Entity Summary</h6>
                                        <p class="mb-0 text-muted">${entities.summary}</p>
                                    </div>
                                ` : ''}
                            ` : `
                                <p class="text-muted">No named entities detected in the text.</p>
                            `}
                            <small class="text-muted">Provider: ${entities.provider || 'OpenAI GPT-4'}</small>
                        </div>
                    </div>
                </div>
            `;
        }

        // Voice Print Recognition Results
        if (result.voicePrints) {
            const voicePrints = result.voicePrints;
            
            html += `
                <div class="analysis-section">
                    <h6><i class="fas fa-fingerprint text-warning"></i> Voice Print Recognition</h6>
                    <div class="card">
                        <div class="card-body">
                            ${voicePrints.speakerProfiles && voicePrints.speakerProfiles.length > 0 ? `
                                <div class="row">
                                    <div class="col-12">
                                        <h6>Speaker Profiles</h6>
                                        <div class="speaker-profiles">
                                            ${this.displaySpeakerProfiles(voicePrints.speakerProfiles)}
                                        </div>
                                    </div>
                                </div>
                                ${voicePrints.summary ? `
                                    <div class="mt-3">
                                        <h6>Voice Print Summary</h6>
                                        <p class="mb-0 text-muted">${voicePrints.summary}</p>
                                    </div>
                                ` : ''}
                                ${voicePrints.databaseStats ? `
                                    <div class="mt-3">
                                        <h6>Database Statistics</h6>
                                        <div class="row">
                                            <div class="col-md-3">
                                                <div class="text-center">
                                                    <h4 class="text-primary">${voicePrints.databaseStats.totalSpeakers}</h4>
                                                    <small class="text-muted">Total Speakers</small>
                                                </div>
                                            </div>
                                            <div class="col-md-3">
                                                <div class="text-center">
                                                    <h4 class="text-success">${voicePrints.databaseStats.mostFrequent ? voicePrints.databaseStats.mostFrequent.encounterCount : 0}</h4>
                                                    <small class="text-muted">Most Frequent</small>
                                                </div>
                                            </div>
                                            <div class="col-md-3">
                                                <div class="text-center">
                                                    <h4 class="text-info">${voicePrints.databaseStats.averageEncounters ? voicePrints.databaseStats.averageEncounters.toFixed(1) : 0}</h4>
                                                    <small class="text-muted">Avg Encounters</small>
                                                </div>
                                            </div>
                                            <div class="col-md-3">
                                                <div class="text-center">
                                                    <h4 class="text-warning">${voicePrints.databaseStats.recentlySeen ? voicePrints.databaseStats.recentlySeen.length : 0}</h4>
                                                    <small class="text-muted">Recently Seen</small>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ` : ''}
                            ` : `
                                <p class="text-muted">No voice print analysis available.</p>
                            `}
                            <small class="text-muted">Provider: ${voicePrints.provider || 'Voice Print Analysis'}</small>
                        </div>
                    </div>
                </div>
            `;
        }

        // Profanity Detection Results
        if (result.profanity) {
            const profanity = result.profanity;
            
            html += `
                <div class="analysis-section">
                    <h6><i class="fas fa-exclamation-triangle text-danger"></i> Profanity Detection</h6>
                    <div class="card">
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <h6>Overall Assessment</h6>
                                    <div class="d-flex align-items-center mb-2">
                                        <span class="badge ${this.getProfanitySeverityColor(profanity.overallSeverity)} fs-6 me-2">
                                            ${this.getProfanitySeverityIcon(profanity.overallSeverity)} ${profanity.overallSeverity.toUpperCase()}
                                        </span>
                                        <span class="text-muted">(${profanity.detectedCount} instances)</span>
                                    </div>
                                    <p><strong>Content Rating:</strong> ${profanity.contentRating || 'Not rated'}</p>
                                    <p><strong>Confidence:</strong> ${(profanity.confidence * 100).toFixed(1)}%</p>
                                </div>
                                <div class="col-md-6">
                                    <h6>Severity Breakdown</h6>
                                    <div class="severity-breakdown">
                                        ${this.displayProfanitySeverityBreakdown(profanity.severityBreakdown)}
                                    </div>
                                </div>
                            </div>
                            ${profanity.detectedWords && profanity.detectedWords.length > 0 ? `
                                <div class="mt-3">
                                    <h6>Detected Terms</h6>
                                    <div class="detected-words">
                                        ${this.displayDetectedProfanity(profanity.detectedWords)}
                                    </div>
                                </div>
                            ` : ''}
                            ${profanity.summary ? `
                                <div class="mt-3">
                                    <h6>Content Analysis</h6>
                                    <p class="mb-0 text-muted">${profanity.summary}</p>
                                </div>
                            ` : ''}
                            <small class="text-muted">Provider: ${profanity.provider || 'Profanity Detection AI'}</small>
                        </div>
                    </div>
                </div>
            `;
        }

        // Keyword Detection Results
        if (result.keywords) {
            const keywords = result.keywords;
            
            html += `
                <div class="analysis-section">
                    <h6><i class="fas fa-search text-info"></i> Keyword Detection</h6>
                    <div class="card">
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <h6>Detection Summary</h6>
                                    <p><strong>Total Keywords:</strong> ${keywords.totalKeywords || 0}</p>
                                    <p><strong>Categories Found:</strong> ${keywords.categoriesFound || 0}</p>
                                    <p><strong>Average Relevance:</strong> ${keywords.averageRelevance ? (keywords.averageRelevance * 100).toFixed(1) + '%' : 'N/A'}</p>
                                </div>
                                <div class="col-md-6">
                                    <h6>Top Categories</h6>
                                    <div class="keyword-categories">
                                        ${this.displayKeywordCategories(keywords.categoryBreakdown)}
                                    </div>
                                </div>
                            </div>
                            ${keywords.detectedKeywords && keywords.detectedKeywords.length > 0 ? `
                                <div class="mt-3">
                                    <h6>Detected Keywords</h6>
                                    <div class="detected-keywords">
                                        ${this.displayDetectedKeywords(keywords.detectedKeywords)}
                                    </div>
                                </div>
                            ` : ''}
                            ${keywords.summary ? `
                                <div class="mt-3">
                                    <h6>Keyword Analysis</h6>
                                    <p class="mb-0 text-muted">${keywords.summary}</p>
                                </div>
                            ` : ''}
                            <small class="text-muted">Provider: ${keywords.provider || 'Keyword Detection AI'}</small>
                        </div>
                    </div>
                </div>
            `;
        }

        // Video Metadata
        if (result.videoMetadata) {
            html += `
                <div class="analysis-section">
                    <h6><i class="fas fa-video text-danger"></i> Video Information</h6>
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong>Duration:</strong> ${result.videoMetadata.duration}</p>
                            <p><strong>Resolution:</strong> ${result.videoMetadata.width}x${result.videoMetadata.height}</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>Format:</strong> ${result.videoMetadata.format}</p>
                            <p><strong>Size:</strong> ${this.formatFileSize(result.videoMetadata.size)}</p>
                        </div>
                    </div>
                </div>
            `;
        }

        if (!html) {
            html = '<p class="text-muted">No analysis results available.</p>';
        }

        return html;
    }

    showError(message) {
        // Check if we have analysis results displayed
        const resultsContainer = document.getElementById('results');
        const hasResults = resultsContainer.children.length > 0 && 
                          resultsContainer.querySelector('.result-card');
        
        if (hasResults) {
            // Show as toast notification if results are displayed
            this.showToast(message, 'error');
        } else {
            // Show in results container if no results are displayed
            resultsContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i> ${message}
                </div>
            `;
        }
    }

    showSuccess(message) {
        // Check if we have analysis results displayed
        const resultsContainer = document.getElementById('results');
        const hasResults = resultsContainer.children.length > 0 && 
                          resultsContainer.querySelector('.result-card');
        
        if (hasResults) {
            // Show as toast notification if results are displayed
            this.showToast(message, 'success');
        } else {
            // Show in results container if no results are displayed
            resultsContainer.innerHTML = `
                <div class="success-message">
                    <i class="fas fa-check-circle"></i> ${message}
                </div>
            `;
        }
    }

    /**
     * Show a toast notification that doesn't interfere with analysis results
     * @param {string} message - Message to display
     * @param {string} type - Type of toast ('success', 'error', 'info', 'warning')
     */
    showToast(message, type = 'info') {
        // Create toast container if it doesn't exist
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            toastContainer.style.zIndex = '1050';
            document.body.appendChild(toastContainer);
        }

        // Create toast element
        const toastId = 'toast-' + Date.now();
        const iconClass = type === 'error' ? 'fas fa-exclamation-circle text-danger' :
                         type === 'warning' ? 'fas fa-exclamation-triangle text-warning' :
                         type === 'success' ? 'fas fa-check-circle text-success' :
                         'fas fa-info-circle text-info';

        const bgClass = type === 'error' ? 'bg-danger' :
                       type === 'warning' ? 'bg-warning' :
                       type === 'success' ? 'bg-success' :
                       'bg-info';

        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = 'toast show';
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="toast-header ${bgClass} text-white">
                <i class="${iconClass} me-2"></i>
                <strong class="me-auto">Video Player</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        `;

        toastContainer.appendChild(toast);

        // Auto-hide after 3 seconds
        setTimeout(() => {
            if (toast && toast.parentNode) {
                toast.classList.remove('show');
                setTimeout(() => {
                    if (toast && toast.parentNode) {
                        toast.remove();
                    }
                }, 150);
            }
        }, 3000);

        // Handle manual close
        const closeBtn = toast.querySelector('.btn-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                toast.classList.remove('show');
                setTimeout(() => {
                    if (toast && toast.parentNode) {
                        toast.remove();
                    }
                }, 150);
            });
        }
    }

    /**
     * Get all analysis options from the form
     */
    getAnalysisOptions() {
        return {
            // Core features
            enableObjectDetection: document.getElementById('enableObjectDetection').checked,
            enableTranscription: document.getElementById('enableTranscription').checked,
            enableVideoAnalysis: document.getElementById('enableVideoAnalysis').checked,
            enableSummarization: document.getElementById('enableSummarization').checked,
            
            // Advanced features
            enableSentimentAnalysis: document.getElementById('enableSentimentAnalysis').checked,
            enableNER: document.getElementById('enableNER').checked,
            enableSpeakerDiarization: document.getElementById('enableSpeakerDiarization').checked,
            enableVoicePrintRecognition: document.getElementById('enableVoicePrintRecognition').checked,
            enableProfanityDetection: document.getElementById('enableProfanityDetection').checked,
            enableKeywordDetection: document.getElementById('enableKeywordDetection').checked,
            enableThumbnailGeneration: document.getElementById('enableThumbnailGeneration').checked,
            enableOCRExtraction: document.getElementById('enableOCRExtraction').checked,
            
            // Settings
            transcriptionProvider: document.getElementById('transcriptionProvider').value,
            objectDetectionMode: document.getElementById('objectDetectionMode').value,
            analysisPriority: document.getElementById('analysisPriority').value,
            profanitySensitivity: document.getElementById('profanitySensitivity').value,
            keywordCategories: document.getElementById('keywordCategories').value,
            enableBatchProcessing: document.getElementById('enableBatchProcessing').checked,
            saveToDatabase: document.getElementById('saveToDatabase').checked,
            thumbnailSize: document.getElementById('thumbnailSize').value,
            keyMomentsCount: document.getElementById('keyMomentsCount').value,
            ocrFrameInterval: document.getElementById('ocrFrameInterval').value,
            ocrMaxFrames: document.getElementById('ocrMaxFrames').value,
            ocrConfidenceThreshold: document.getElementById('ocrConfidenceThreshold').value
        };
    }

    /**
     * Check if at least one analysis feature is selected
     */
    hasSelectedAnalysisFeatures(options) {
        return options.enableObjectDetection || 
               options.enableTranscription || 
               options.enableVideoAnalysis || 
               options.enableSummarization || 
               options.enableSentimentAnalysis || 
               options.enableNER || 
               options.enableSpeakerDiarization || 
               options.enableVoicePrintRecognition ||
               options.enableProfanityDetection ||
               options.enableKeywordDetection ||
               options.enableThumbnailGeneration ||
               options.enableOCRExtraction;
    }

    /**
     * Simulate analysis steps based on selected options
     */
    simulateAnalysisSteps(options) {
        let progress = 25;
        const stepSize = 60 / this.countSelectedFeatures(options);

        if (options.enableObjectDetection) {
            this.updateProgress(progress, 'Detecting objects...');
            this.updateCurrentStep('Object detection', 'info');
            this.addLiveStatus('Identifying objects and text in content', 'info');
            setTimeout(() => {
                this.completeStep('Object detection', 'Objects and text identified');
                this.addLiveStatus('Object detection completed', 'success');
            }, 2000);
            progress += stepSize;
        }

        if (options.enableTranscription) {
            setTimeout(() => {
                this.updateProgress(progress, 'Transcribing audio...');
                this.updateCurrentStep('Audio transcription', 'info');
                this.addLiveStatus('Converting speech to text', 'info');
                setTimeout(() => {
                    this.completeStep('Audio transcription', 'Speech converted to text');
                    this.addLiveStatus('Audio transcription completed', 'success');
                }, 3000);
            }, options.enableObjectDetection ? 2500 : 0);
            progress += stepSize;
        }

        if (options.enableVideoAnalysis) {
            setTimeout(() => {
                this.updateProgress(progress, 'Analyzing video...');
                this.updateCurrentStep('Video analysis', 'info');
                this.addLiveStatus('Processing video frames and audio', 'info');
                setTimeout(() => {
                    this.completeStep('Video analysis', 'Video content analyzed');
                    this.addLiveStatus('Video analysis completed', 'success');
                }, 2500);
            }, (options.enableObjectDetection ? 2500 : 0) + (options.enableTranscription ? 3500 : 0));
            progress += stepSize;
        }

        if (options.enableSummarization) {
            setTimeout(() => {
                this.updateProgress(progress, 'Generating summary...');
                this.updateCurrentStep('Text summarization', 'info');
                this.addLiveStatus('Creating content summary', 'info');
                setTimeout(() => {
                    this.completeStep('Text summarization', 'Content summary generated');
                    this.addLiveStatus('Text summarization completed', 'success');
                }, 2000);
            }, (options.enableObjectDetection ? 2500 : 0) + (options.enableTranscription ? 3500 : 0) + (options.enableVideoAnalysis ? 3000 : 0));
            progress += stepSize;
        }

        if (options.enableSentimentAnalysis) {
            setTimeout(() => {
                this.updateProgress(progress, 'Analyzing sentiment...');
                this.updateCurrentStep('Sentiment analysis', 'info');
                this.addLiveStatus('Analyzing emotional tone', 'info');
                setTimeout(() => {
                    this.completeStep('Sentiment analysis', 'Emotional tone analyzed');
                    this.addLiveStatus('Sentiment analysis completed', 'success');
                }, 2000);
            }, (options.enableObjectDetection ? 2500 : 0) + (options.enableTranscription ? 3500 : 0) + (options.enableVideoAnalysis ? 3000 : 0) + (options.enableSummarization ? 2500 : 0));
            progress += stepSize;
        }

        if (options.enableNER) {
            setTimeout(() => {
                this.updateProgress(progress, 'Extracting entities...');
                this.updateCurrentStep('Named entity recognition', 'info');
                this.addLiveStatus('Identifying people, places, organizations', 'info');
                setTimeout(() => {
                    this.completeStep('Named entity recognition', 'Entities extracted and categorized');
                    this.addLiveStatus('Named entity recognition completed', 'success');
                }, 2000);
            }, (options.enableObjectDetection ? 2500 : 0) + (options.enableTranscription ? 3500 : 0) + (options.enableVideoAnalysis ? 3000 : 0) + (options.enableSummarization ? 2500 : 0) + (options.enableSentimentAnalysis ? 2500 : 0));
            progress += stepSize;
        }

        if (options.enableSpeakerDiarization) {
            setTimeout(() => {
                this.updateProgress(progress, 'Identifying speakers...');
                this.updateCurrentStep('Speaker diarization', 'info');
                this.addLiveStatus('Separating different speakers', 'info');
                setTimeout(() => {
                    this.completeStep('Speaker diarization', 'Speakers identified and separated');
                    this.addLiveStatus('Speaker diarization completed', 'success');
                }, 2500);
            }, (options.enableObjectDetection ? 2500 : 0) + (options.enableTranscription ? 3500 : 0) + (options.enableVideoAnalysis ? 3000 : 0) + (options.enableSummarization ? 2500 : 0) + (options.enableSentimentAnalysis ? 2500 : 0) + (options.enableNER ? 2500 : 0));
            progress += stepSize;
        }

        if (options.enableVoicePrintRecognition) {
            setTimeout(() => {
                this.updateProgress(progress, 'Analyzing voice prints...');
                this.updateCurrentStep('Voice print recognition', 'info');
                this.addLiveStatus('Recognizing speakers across recordings', 'info');
                setTimeout(() => {
                    this.completeStep('Voice print recognition', 'Voice prints analyzed and matched');
                    this.addLiveStatus('Voice print recognition completed', 'success');
                }, 3000);
            }, (options.enableObjectDetection ? 2500 : 0) + (options.enableTranscription ? 3500 : 0) + (options.enableVideoAnalysis ? 3000 : 0) + (options.enableSummarization ? 2500 : 0) + (options.enableSentimentAnalysis ? 2500 : 0) + (options.enableNER ? 2500 : 0) + (options.enableSpeakerDiarization ? 3000 : 0));
            progress += stepSize;
        }

        if (options.enableProfanityDetection) {
            setTimeout(() => {
                this.updateProgress(progress, 'Detecting profanity...');
                this.updateCurrentStep('Profanity detection', 'info');
                this.addLiveStatus('Identifying inappropriate language', 'info');
                setTimeout(() => {
                    this.completeStep('Profanity detection', 'Inappropriate language identified');
                    this.addLiveStatus('Profanity detection completed', 'success');
                }, 1500);
            }, (options.enableObjectDetection ? 2500 : 0) + (options.enableTranscription ? 3500 : 0) + (options.enableVideoAnalysis ? 3000 : 0) + (options.enableSummarization ? 2500 : 0) + (options.enableSentimentAnalysis ? 2500 : 0) + (options.enableNER ? 2500 : 0) + (options.enableSpeakerDiarization ? 3000 : 0) + (options.enableVoicePrintRecognition ? 3500 : 0));
            progress += stepSize;
        }

        if (options.enableKeywordDetection) {
            setTimeout(() => {
                this.updateProgress(progress, 'Detecting keywords...');
                this.updateCurrentStep('Keyword detection', 'info');
                this.addLiveStatus('Identifying important terms and phrases', 'info');
                setTimeout(() => {
                    this.completeStep('Keyword detection', 'Important terms and phrases identified');
                    this.addLiveStatus('Keyword detection completed', 'success');
                }, 2000);
            }, (options.enableObjectDetection ? 2500 : 0) + (options.enableTranscription ? 3500 : 0) + (options.enableVideoAnalysis ? 3000 : 0) + (options.enableSummarization ? 2500 : 0) + (options.enableSentimentAnalysis ? 2500 : 0) + (options.enableNER ? 2500 : 0) + (options.enableSpeakerDiarization ? 3000 : 0) + (options.enableVoicePrintRecognition ? 3500 : 0) + (options.enableProfanityDetection ? 2000 : 0));
            progress += stepSize;
        }

        if (options.enableThumbnailGeneration) {
            setTimeout(() => {
                this.updateProgress(progress, 'Generating thumbnails...');
                this.updateCurrentStep('Thumbnail generation', 'info');
                this.addLiveStatus('Creating thumbnails and key moments', 'info');
                setTimeout(() => {
                    this.completeStep('Thumbnail generation', 'Thumbnails and key moments generated');
                    this.addLiveStatus('Thumbnail generation completed', 'success');
                }, 2500);
            }, (options.enableObjectDetection ? 2500 : 0) + (options.enableTranscription ? 3500 : 0) + (options.enableVideoAnalysis ? 3000 : 0) + (options.enableSummarization ? 2500 : 0) + (options.enableSentimentAnalysis ? 2500 : 0) + (options.enableNER ? 2500 : 0) + (options.enableSpeakerDiarization ? 3000 : 0) + (options.enableVoicePrintRecognition ? 3500 : 0) + (options.enableProfanityDetection ? 2000 : 0) + (options.enableKeywordDetection ? 2500 : 0));
            progress += stepSize;
        }

        if (options.enableOCRExtraction) {
            setTimeout(() => {
                this.updateProgress(progress, 'Extracting OCR captions...');
                this.updateCurrentStep('OCR caption extraction', 'info');
                this.addLiveStatus('Extracting text from video frames', 'info');
                setTimeout(() => {
                    this.completeStep('OCR caption extraction', 'Text extracted from video frames');
                    this.addLiveStatus('OCR caption extraction completed', 'success');
                }, 3000);
            }, (options.enableObjectDetection ? 2500 : 0) + (options.enableTranscription ? 3500 : 0) + (options.enableVideoAnalysis ? 3000 : 0) + (options.enableSummarization ? 2500 : 0) + (options.enableSentimentAnalysis ? 2500 : 0) + (options.enableNER ? 2500 : 0) + (options.enableSpeakerDiarization ? 3000 : 0) + (options.enableVoicePrintRecognition ? 3500 : 0) + (options.enableProfanityDetection ? 2000 : 0) + (options.enableKeywordDetection ? 2500 : 0) + (options.enableThumbnailGeneration ? 3000 : 0));
            progress += stepSize;
        }

        // Final compilation step
        const totalDelay = this.calculateTotalDelay(options);
        setTimeout(() => {
            this.updateProgress(85, 'Compiling results...');
            this.updateCurrentStep('Result compilation', 'info');
            this.addLiveStatus('Organizing analysis data', 'info');
        }, totalDelay);
    }

    /**
     * Calculate total delay for all analysis steps
     */
    calculateTotalDelay(options) {
        let delay = 0;
        if (options.enableObjectDetection) delay += 2500;
        if (options.enableTranscription) delay += 3500;
        if (options.enableVideoAnalysis) delay += 3000;
        if (options.enableSummarization) delay += 2500;
        if (options.enableSentimentAnalysis) delay += 2500;
        if (options.enableNER) delay += 2500;
        if (options.enableSpeakerDiarization) delay += 3000;
        if (options.enableVoicePrintRecognition) delay += 3500;
        if (options.enableProfanityDetection) delay += 2000;
        if (options.enableKeywordDetection) delay += 2500;
        if (options.enableThumbnailGeneration) delay += 2500;
        return delay;
    }

    /**
     * Count selected analysis features
     */
    countSelectedFeatures(options) {
        return Object.values(options).filter(value => 
            typeof value === 'boolean' && value
        ).length;
    }

    /**
     * Get profanity severity color
     */
    getProfanitySeverityColor(severity) {
        switch (severity.toLowerCase()) {
            case 'none': return 'bg-success';
            case 'low': return 'bg-warning';
            case 'moderate': return 'bg-orange';
            case 'high': return 'bg-danger';
            case 'severe': return 'bg-dark';
            default: return 'bg-secondary';
        }
    }

    /**
     * Get profanity severity icon
     */
    getProfanitySeverityIcon(severity) {
        switch (severity.toLowerCase()) {
            case 'none': return 'fas fa-check-circle';
            case 'low': return 'fas fa-exclamation';
            case 'moderate': return 'fas fa-exclamation-triangle';
            case 'high': return 'fas fa-times-circle';
            case 'severe': return 'fas fa-ban';
            default: return 'fas fa-question';
        }
    }

    /**
     * Display profanity severity breakdown
     */
    displayProfanitySeverityBreakdown(breakdown) {
        if (!breakdown) return '<p class="text-muted">No severity data available</p>';
        
        return Object.entries(breakdown).map(([severity, count]) => `
            <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="badge ${this.getProfanitySeverityColor(severity)} me-2">
                    ${this.getProfanitySeverityIcon(severity)} ${severity.toUpperCase()}
                </span>
                <span class="text-muted">${count} instances</span>
            </div>
        `).join('');
    }

    /**
     * Display detected profanity words
     */
    displayDetectedProfanity(detectedWords) {
        if (!detectedWords || detectedWords.length === 0) {
            return '<p class="text-muted">No profanity detected</p>';
        }

        return detectedWords.map(word => `
            <span class="badge bg-danger me-1 mb-1">
                <i class="fas fa-exclamation-triangle"></i> ${word.term}
                <small class="ms-1">(${word.severity})</small>
            </span>
        `).join('');
    }

    /**
     * Display keyword categories
     */
    displayKeywordCategories(categoryBreakdown) {
        if (!categoryBreakdown) return '<p class="text-muted">No category data available</p>';
        
        return Object.entries(categoryBreakdown).map(([category, count]) => `
            <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="badge bg-info me-2">
                    <i class="fas fa-tag"></i> ${category}
                </span>
                <span class="text-muted">${count} keywords</span>
            </div>
        `).join('');
    }

    /**
     * Display detected keywords
     */
    displayDetectedKeywords(detectedKeywords) {
        if (!detectedKeywords || detectedKeywords.length === 0) {
            return '<p class="text-muted">No keywords detected</p>';
        }

        return detectedKeywords.map(keyword => `
            <span class="badge bg-info me-1 mb-1">
                <i class="fas fa-search"></i> ${keyword.term}
                <small class="ms-1">(${(keyword.relevance * 100).toFixed(0)}%)</small>
            </span>
        `).join('');
    }

    /**
     * Reset analysis options to defaults
     */
    resetAnalysisOptions() {
        // Reset all checkboxes to checked
        document.getElementById('enableObjectDetection').checked = true;
        document.getElementById('enableTranscription').checked = true;
        document.getElementById('enableVideoAnalysis').checked = true;
        document.getElementById('enableSummarization').checked = true;
        document.getElementById('enableSentimentAnalysis').checked = true;
        document.getElementById('enableNER').checked = true;
        document.getElementById('enableSpeakerDiarization').checked = true;
        document.getElementById('enableVoicePrintRecognition').checked = true;
        document.getElementById('enableProfanityDetection').checked = true;
        document.getElementById('enableKeywordDetection').checked = true;
        document.getElementById('enableThumbnailGeneration').checked = true;
        document.getElementById('enableOCRExtraction').checked = false;
        
        // Reset selectors to defaults
        document.getElementById('transcriptionProvider').value = 'google';
        document.getElementById('objectDetectionMode').value = 'enhanced';
        document.getElementById('analysisPriority').value = 'balanced';
        document.getElementById('profanitySensitivity').value = 'moderate';
        document.getElementById('keywordCategories').value = 'all';
        
        // Reset thumbnail options
        document.getElementById('thumbnailSize').value = '300';
        document.getElementById('keyMomentsCount').value = '5';
        
        // Reset OCR options
        document.getElementById('ocrFrameInterval').value = '2';
        document.getElementById('ocrMaxFrames').value = '30';
        document.getElementById('ocrConfidenceThreshold').value = '0.5';
        
        // Reset other options
        document.getElementById('enableBatchProcessing').checked = false;
        document.getElementById('saveToDatabase').checked = true;
        
        // Show success toast
        this.showToast('Analysis options reset to defaults', 'success');
    }

    /**
     * Show analysis presets modal
     */
    showAnalysisPresets() {
        // Create preset modal
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'presetModal';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Analysis Presets</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <div class="card mb-3">
                                    <div class="card-body">
                                        <h6>Quick Analysis</h6>
                                        <p class="small text-muted">Basic transcription and summary</p>
                                        <button class="btn btn-sm btn-outline-primary" id="quickPresetBtn">Apply</button>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="card mb-3">
                                    <div class="card-body">
                                        <h6>Full Analysis</h6>
                                        <p class="small text-muted">All features enabled</p>
                                        <button class="btn btn-sm btn-outline-primary" id="fullPresetBtn">Apply</button>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="card mb-3">
                                    <div class="card-body">
                                        <h6>Audio Focus</h6>
                                        <p class="small text-muted">Transcription, sentiment, and speaker analysis</p>
                                        <button class="btn btn-sm btn-outline-primary" id="audioPresetBtn">Apply</button>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="card mb-3">
                                    <div class="card-body">
                                        <h6>Image Focus</h6>
                                        <p class="small text-muted">Object detection and text extraction</p>
                                        <button class="btn btn-sm btn-outline-primary" id="imagePresetBtn">Apply</button>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="card mb-3">
                                    <div class="card-body">
                                        <h6>Video Focus</h6>
                                        <p class="small text-muted">Transcription, OCR captions, and thumbnails</p>
                                        <button class="btn btn-sm btn-outline-primary" id="videoPresetBtn">Apply</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        const modalInstance = new bootstrap.Modal(modal);
        modalInstance.show();
        
        // Add event listeners for preset buttons
        document.getElementById('quickPresetBtn').addEventListener('click', () => {
            this.applyPreset('quick');
            modalInstance.hide();
        });
        
        document.getElementById('fullPresetBtn').addEventListener('click', () => {
            this.applyPreset('full');
            modalInstance.hide();
        });
        
        document.getElementById('audioPresetBtn').addEventListener('click', () => {
            this.applyPreset('audio');
            modalInstance.hide();
        });
        
        document.getElementById('imagePresetBtn').addEventListener('click', () => {
            this.applyPreset('image');
            modalInstance.hide();
        });
        
        document.getElementById('videoPresetBtn').addEventListener('click', () => {
            this.applyPreset('video');
            modalInstance.hide();
        });
        
        // Remove modal after it's hidden
        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
    }

    /**
     * Apply analysis preset
     */
    applyPreset(preset) {
        // Reset all to false first
        document.getElementById('enableObjectDetection').checked = false;
        document.getElementById('enableTranscription').checked = false;
        document.getElementById('enableVideoAnalysis').checked = false;
        document.getElementById('enableSummarization').checked = false;
        document.getElementById('enableSentimentAnalysis').checked = false;
        document.getElementById('enableNER').checked = false;
        document.getElementById('enableSpeakerDiarization').checked = false;
        document.getElementById('enableVoicePrintRecognition').checked = false;
        document.getElementById('enableProfanityDetection').checked = false;
        document.getElementById('enableKeywordDetection').checked = false;
        document.getElementById('enableThumbnailGeneration').checked = false;
        document.getElementById('enableOCRExtraction').checked = false;
        
        switch (preset) {
            case 'quick':
                document.getElementById('enableTranscription').checked = true;
                document.getElementById('enableSummarization').checked = true;
                document.getElementById('enableThumbnailGeneration').checked = true;
                document.getElementById('transcriptionProvider').value = 'openai';
                break;
            case 'full':
                document.getElementById('enableObjectDetection').checked = true;
                document.getElementById('enableTranscription').checked = true;
                document.getElementById('enableVideoAnalysis').checked = true;
                document.getElementById('enableSummarization').checked = true;
                document.getElementById('enableSentimentAnalysis').checked = true;
                document.getElementById('enableNER').checked = true;
                document.getElementById('enableSpeakerDiarization').checked = true;
                document.getElementById('enableVoicePrintRecognition').checked = true;
                document.getElementById('enableProfanityDetection').checked = true;
                document.getElementById('enableKeywordDetection').checked = true;
                document.getElementById('enableThumbnailGeneration').checked = true;
                document.getElementById('enableOCRExtraction').checked = true;
                break;
            case 'audio':
                document.getElementById('enableTranscription').checked = true;
                document.getElementById('enableSummarization').checked = true;
                document.getElementById('enableSentimentAnalysis').checked = true;
                document.getElementById('enableSpeakerDiarization').checked = true;
                document.getElementById('enableVoicePrintRecognition').checked = true;
                document.getElementById('enableProfanityDetection').checked = true;
                document.getElementById('enableKeywordDetection').checked = true;
                document.getElementById('transcriptionProvider').value = 'google';
                break;
            case 'image':
                document.getElementById('enableObjectDetection').checked = true;
                document.getElementById('enableThumbnailGeneration').checked = true;
                document.getElementById('objectDetectionMode').value = 'enhanced';
                break;
            case 'video':
                document.getElementById('enableTranscription').checked = true;
                document.getElementById('enableVideoAnalysis').checked = true;
                document.getElementById('enableSummarization').checked = true;
                document.getElementById('enableThumbnailGeneration').checked = true;
                document.getElementById('enableOCRExtraction').checked = true;
                document.getElementById('transcriptionProvider').value = 'google';
                break;
        }
        
        // Show success toast
        this.showToast(`Applied ${preset} preset`, 'success');
    }

    /**
     * Format category for display
     */
    formatCategory(category) {
        const categoryMap = {
            'general': 'General Content',
            'video-content': 'Video Content',
            'audio-content': 'Audio Content',
            'visual-content': 'Visual Content',
            'people-content': 'People & Faces',
            'food-content': 'Food & Cooking',
            'technology-content': 'Technology',
            'health-content': 'Health & Medical',
            'educational-content': 'Educational',
            'entertainment-content': 'Entertainment',
            'sports-content': 'Sports',
            'news-content': 'News & Politics',
            'music-content': 'Music',
            'conversation-content': 'Conversation',
            'mature-content': 'Mature Content'
        };
        return categoryMap[category] || category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Format tag for display
     */
    formatTag(tag) {
        const tagMap = {
            'video': 'Video',
            'audio': 'Audio',
            'image': 'Image',
            'people': 'People',
            'faces': 'Faces',
            'animals': 'Animals',
            'nature': 'Nature',
            'outdoors': 'Outdoors',
            'technology': 'Technology',
            'food': 'Food',
            'text': 'Text',
            'documents': 'Documents',
            'positive': 'Positive',
            'negative': 'Negative',
            'neutral': 'Neutral',
            'mixed': 'Mixed',
            'uplifting': 'Uplifting',
            'serious': 'Serious',
            'complex': 'Complex',
            'business': 'Business',
            'corporate': 'Corporate',
            'places': 'Places',
            'geography': 'Geography',
            'time': 'Time',
            'historical': 'Historical',
            'finance': 'Finance',
            'economic': 'Economic',
            'tech': 'Tech',
            'health': 'Health',
            'medical': 'Medical',
            'education': 'Education',
            'learning': 'Learning',
            'entertainment': 'Entertainment',
            'sports': 'Sports',
            'politics': 'Politics',
            'news': 'News',
            'mature-content': 'Mature',
            'explicit': 'Explicit',
            'multiple-speakers': 'Multiple Speakers',
            'conversation': 'Conversation',
            'single-speaker': 'Single Speaker',
            'monologue': 'Monologue',
            'long-form': 'Long Form',
            'medium-form': 'Medium Form',
            'short-form': 'Short Form',
            'music': 'Music',
            'tutorial': 'Tutorial',
            'how-to': 'How-to',
            'interview': 'Interview',
            'object-detection': 'Object Detection',
            'transcription': 'Transcription',
            'summarization': 'Summarization',
            'sentiment-analysis': 'Sentiment Analysis',
            'entity-recognition': 'Entity Recognition',
            'voice-analysis': 'Voice Analysis',
            'content-filtering': 'Content Filtering',
            'keyword-extraction': 'Keyword Extraction',
            'multimedia': 'Multimedia',
            'analysis': 'Analysis'
        };
        return tagMap[tag] || tag.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Display thumbnails for images and videos
     */
    displayThumbnails(thumbnails) {
        if (!thumbnails) return '';

        if (thumbnails.thumbnails) {
            // Image thumbnails
            return `
                <div class="card mb-3">
                    <div class="card-header">
                        <h6 class="mb-0">
                            <i class="fas fa-image text-primary"></i> Generated Thumbnails
                        </h6>
                    </div>
                    <div class="card-body">
                        <div class="thumbnail-gallery">
                            ${Object.entries(thumbnails.thumbnails).map(([size, thumbnail]) => `
                                <div class="thumbnail-container">
                                    <img src="${thumbnail.url}" 
                                         alt="Thumbnail ${size}" 
                                         class="thumbnail-image"
                                         loading="lazy">
                                    <div class="thumbnail-overlay">
                                        ${size}
                                    </div>
                                    <div class="thumbnail-size-label">${size}</div>
                                </div>
                            `).join('')}
                        </div>
                        <div class="mt-3">
                            <small class="text-muted">
                                <i class="fas fa-info-circle"></i> 
                                ${thumbnails.totalThumbnails} thumbnails generated in different sizes
                            </small>
                        </div>
                    </div>
                </div>
            `;
        } else if (thumbnails.mainThumbnail) {
            // Video thumbnails with key moments
            return `
                <div class="card mb-3">
                    <div class="card-header">
                        <h6 class="mb-0">
                            <i class="fas fa-video text-primary"></i> Video Thumbnail & Key Moments
                        </h6>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-4">
                                <h6 class="text-muted">Main Thumbnail</h6>
                                <div class="video-thumbnail-container thumbnail-container">
                                    <img src="${thumbnails.mainThumbnail.url}" 
                                         alt="Video thumbnail" 
                                         class="thumbnail-image"
                                         loading="lazy">
                                    <div class="thumbnail-overlay">
                                        ${this.formatDuration(thumbnails.duration)}
                                    </div>
                                    <div class="key-moments-preview" id="keyMomentsPreview">
                                        <div class="key-moments-grid">
                                            ${thumbnails.keyMoments.map(moment => `
                                                <div class="key-moment-item">
                                                    <img src="${moment.url}" 
                                                         alt="Key moment at ${moment.timeString}" 
                                                         class="key-moment-image"
                                                         loading="lazy">
                                                    <div class="key-moment-time">${moment.timeString}</div>
                                                </div>
                                            `).join('')}
                                        </div>
                                        <div class="text-center mt-2">
                                            <small class="text-muted">Key moments preview</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-8">
                                <h6 class="text-muted">Key Moments (${thumbnails.keyMomentsCount})</h6>
                                <div class="row">
                                    ${thumbnails.keyMoments.map(moment => `
                                        <div class="col-md-4 mb-3">
                                            <div class="thumbnail-container">
                                                <img src="${moment.url}" 
                                                     alt="Key moment at ${moment.timeString}" 
                                                     class="thumbnail-image"
                                                     loading="lazy">
                                                <div class="thumbnail-overlay">
                                                    ${moment.timeString}
                                                </div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                                <div class="mt-3">
                                    <small class="text-muted">
                                        <i class="fas fa-info-circle"></i> 
                                        ${thumbnails.keyMomentsCount} key moments extracted from video
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        return '';
    }

    /**
     * Format duration in seconds to MM:SS format
     */
    formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    /**
     * Set up video player controls and event listeners
     */
    setupVideoPlayerControls() {
        console.log('=== SETTING UP VIDEO PLAYER ===');
        
        const videoElement = document.getElementById('transcriptionVideoPlayer');
        console.log('Video element found:', !!videoElement);
        
        if (!videoElement) {
            console.warn('Video element not found, skipping player setup');
            return;
        }

        console.log('Video element details:', {
            tagName: videoElement.tagName,
            className: videoElement.className,
            src: videoElement.src,
            currentSrc: videoElement.currentSrc,
            sources: Array.from(videoElement.querySelectorAll('source')).map(s => ({
                src: s.src,
                type: s.type
            }))
        });

        // Check if Video.js is available
        if (!window.videojs) {
            console.warn('Video.js library not available, using native HTML5 video');
            this.setupNativeVideoPlayer(videoElement);
            return;
        }

        console.log('Video.js library found, version:', window.videojs.VERSION);

        try {
            // Initialize Video.js with comprehensive options
            this.videoPlayer = window.videojs(videoElement, {
                controls: true,
                fluid: true,
                responsive: true,
                preload: 'auto',
                playbackRates: [0.5, 1, 1.25, 1.5, 2],
                html5: {
                    vhs: {
                        overrideNative: true
                    },
                    nativeVideoTracks: false,
                    nativeAudioTracks: false,
                    nativeTextTracks: false
                }
            });

            console.log('Video.js player initialized successfully');

            // Store reference for seeking
            this.videoElement = this.videoPlayer;

            // Set up event listeners
            this.videoPlayer.ready(() => {
                console.log('Video.js player is ready');
                console.log('Player state:', {
                    readyState: this.videoPlayer.readyState(),
                    networkState: this.videoPlayer.networkState(),
                    currentSrc: this.videoPlayer.currentSrc(),
                    duration: this.videoPlayer.duration()
                });
            });

            // Comprehensive event logging
            const events = [
                'loadstart', 'loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough',
                'play', 'playing', 'pause', 'ended', 'waiting', 'seeking', 'seeked',
                'error', 'abort', 'emptied', 'stalled', 'suspend', 'progress'
            ];

            events.forEach(eventName => {
                this.videoPlayer.on(eventName, (event) => {
                    console.log(`Video.js Event: ${eventName}`, {
                        readyState: this.videoPlayer.readyState(),
                        networkState: this.videoPlayer.networkState(),
                        currentTime: this.videoPlayer.currentTime(),
                        duration: this.videoPlayer.duration(),
                        buffered: this.videoPlayer.buffered(),
                        error: this.videoPlayer.error()
                    });
                });
            });

            // Specific error handling
            this.videoPlayer.on('error', () => {
                const error = this.videoPlayer.error();
                console.error('Video.js error details:', error);
                
                if (error) {
                    let errorMessage = 'Video playback error';
                    switch (error.code) {
                        case 1:
                            errorMessage = 'Video loading aborted';
                            break;
                        case 2:
                            errorMessage = 'Network error while loading video';
                            break;
                        case 3:
                            errorMessage = 'Video format not supported or corrupted';
                            break;
                        case 4:
                            errorMessage = 'Video source not supported';
                            break;
                        default:
                            errorMessage = error.message || 'Unknown video error';
                    }
                    
                    console.error('Detailed error:', errorMessage);
                    this.showToast(errorMessage, 'error');
                }
            });

            console.log('Video.js player setup complete');

        } catch (error) {
            console.error('Failed to initialize Video.js:', error);
            this.showToast(`Video player initialization failed: ${error.message}`, 'error');
            
            // Fallback to native HTML5
            console.log('Falling back to native HTML5 video');
            this.setupNativeVideoPlayer(videoElement);
        }
    }

    /**
     * Set up native HTML5 video player as fallback
     */
    setupNativeVideoPlayer(videoElement) {
        console.log('=== SETTING UP NATIVE HTML5 VIDEO PLAYER ===');
        
        // Remove Video.js classes
        videoElement.classList.remove('video-js', 'vjs-default-skin');
        
        // Store reference for seeking
        this.videoElement = videoElement;
        this.videoPlayer = null; // No Video.js player
        
        // Set up native HTML5 event listeners
        const events = [
            'loadstart', 'loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough',
            'play', 'playing', 'pause', 'ended', 'waiting', 'seeking', 'seeked',
            'error', 'abort', 'emptied', 'stalled', 'suspend', 'progress', 'timeupdate'
        ];

        events.forEach(eventName => {
            videoElement.addEventListener(eventName, (event) => {
                console.log(`Native HTML5 Event: ${eventName}`, {
                    readyState: videoElement.readyState,
                    networkState: videoElement.networkState,
                    currentTime: videoElement.currentTime,
                    duration: videoElement.duration,
                    buffered: videoElement.buffered.length > 0 ? `${videoElement.buffered.start(0)}-${videoElement.buffered.end(0)}` : 'none',
                    error: videoElement.error ? {
                        code: videoElement.error.code,
                        message: videoElement.error.message
                    } : null
                });
            });
        });

        // Specific error handling for native video
        videoElement.addEventListener('error', () => {
            const error = videoElement.error;
            console.error('Native HTML5 video error:', error);
            
            if (error) {
                let errorMessage = 'Video playback error';
                switch (error.code) {
                    case 1:
                        errorMessage = 'Video loading aborted';
                        break;
                    case 2:
                        errorMessage = 'Network error while loading video';
                        break;
                    case 3:
                        errorMessage = 'Video format not supported or corrupted';
                        break;
                    case 4:
                        errorMessage = 'Video source not supported';
                        break;
                    default:
                        errorMessage = error.message || 'Unknown video error';
                }
                
                console.error('Detailed error:', errorMessage);
                this.showToast(errorMessage, 'error');
            }
        });

        console.log('Native HTML5 video player setup complete');
    }

    /**
     * Seek to a specific time in the video using Video.js or native HTML5
     */
    seekToTime(timeInSeconds) {
        console.log('=== SEEKING TO TIME ===');
        console.log('Seeking to:', timeInSeconds, 'seconds');
        
        if (this.videoPlayer && typeof this.videoPlayer.currentTime === 'function') {
            // Video.js player
            console.log('Using Video.js player for seeking');
            try {
                this.videoPlayer.currentTime(timeInSeconds);
                
                this.videoPlayer.play().then(() => {
                    console.log('Video.js: Seek and play successful');
                    this.showToast(`Jumped to ${this.formatDuration(timeInSeconds)}`, 'success');
                    this.addVideoHighlight();
                }).catch(error => {
                    console.error('Video.js: Play failed after seek:', error);
                    this.showToast(`Jumped to ${this.formatDuration(timeInSeconds)} - Click play to continue`, 'info');
                    this.addVideoHighlight();
                });
                
            } catch (error) {
                console.error('Video.js: Seek failed:', error);
                this.showToast(`Seek failed: ${error.message}`, 'error');
            }
        } else if (this.videoElement) {
            // Native HTML5 video
            console.log('Using native HTML5 video for seeking');
            try {
                this.videoElement.currentTime = timeInSeconds;
                
                this.videoElement.play().then(() => {
                    console.log('Native HTML5: Seek and play successful');
                    this.showToast(`Jumped to ${this.formatDuration(timeInSeconds)}`, 'success');
                    this.addVideoHighlight();
                }).catch(error => {
                    console.error('Native HTML5: Play failed after seek:', error);
                    this.showToast(`Jumped to ${this.formatDuration(timeInSeconds)} - Click play to continue`, 'info');
                    this.addVideoHighlight();
                });
                
            } catch (error) {
                console.error('Native HTML5: Seek failed:', error);
                this.showToast(`Seek failed: ${error.message}`, 'error');
            }
        } else {
            console.warn('No video player available for seeking');
            this.showToast('Video player not ready', 'error');
        }
    }

    /**
     * Add visual highlight to video player
     */
    addVideoHighlight() {
        const container = document.querySelector('.video-player-container');
        if (container) {
            container.style.border = '3px solid #0d6efd';
            container.style.borderRadius = '8px';
            container.style.transition = 'border 0.3s ease';
            setTimeout(() => {
                container.style.border = '';
            }, 1500);
        }
    }

    /**
     * Set up thumbnail hover effects
     */
    setupThumbnailHoverEffects() {
        console.log('Setting up thumbnail hover effects');
        
        const thumbnailContainers = document.querySelectorAll('.video-thumbnail-container');
        thumbnailContainers.forEach(container => {
            const preview = container.querySelector('.key-moments-preview');
            if (preview) {
                container.addEventListener('mouseenter', () => {
                    preview.classList.add('show');
                });
                
                container.addEventListener('mouseleave', () => {
                    preview.classList.remove('show');
                });
            }
        });
    }

    /**
     * Test video compatibility
     */
    testVideoCompatibility(file, mimeType) {
        console.log('=== TESTING VIDEO COMPATIBILITY ===');
        console.log('File:', file.name);
        console.log('MIME type:', mimeType);
        
        const video = document.createElement('video');
        const canPlay = video.canPlayType(mimeType);
        
        console.log('Can play type result:', canPlay);
        console.log('Browser video support:', {
            mp4: video.canPlayType('video/mp4'),
            webm: video.canPlayType('video/webm'),
            ogg: video.canPlayType('video/ogg')
        });
        
        return canPlay !== '';
    }

    /**
     * Set up user interaction detection for autoplay
     */
    setupUserInteractionDetection() {
        const interactionEvents = ['click', 'touchstart', 'keydown'];
        
        const handleInteraction = () => {
            this.userHasInteracted = true;
            console.log('User interaction detected, autoplay should now work');
            
            // Remove listeners once we've detected interaction
            interactionEvents.forEach(event => {
                document.removeEventListener(event, handleInteraction);
            });
        };
        
        interactionEvents.forEach(event => {
            document.addEventListener(event, handleInteraction, { once: true });
        });
    }

    /**
     * Test video player functionality
     */
    testVideoPlayer() {
        console.log('=== TESTING VIDEO PLAYER ===');
        
        const videoElement = document.getElementById('transcriptionVideoPlayer');
        
        if (!videoElement) {
            console.error('Video element not found');
            this.showToast('Video element not found', 'error');
            return;
        }

        console.log('Testing Video.js player...');
        
        if (this.videoPlayer && typeof this.videoPlayer.play === 'function') {
            // Test Video.js player
            console.log('Video.js player available, testing...');
            
            this.videoPlayer.play().then(() => {
                console.log('Video.js play test successful');
                this.showToast('Video.js player working!', 'success');
                
                // Pause after 2 seconds
                setTimeout(() => {
                    this.videoPlayer.pause();
                    console.log('Video.js pause test successful');
                }, 2000);
            }).catch(error => {
                console.error('Video.js play test failed:', error);
                this.showToast(`Video.js play failed: ${error.message}`, 'error');
                
                // Fallback to native HTML5
                this.testNativeVideoPlayer(videoElement);
            });
        } else {
            console.log('Video.js not available, testing native HTML5...');
            this.testNativeVideoPlayer(videoElement);
        }
    }

    /**
     * Test native HTML5 video player
     */
    testNativeVideoPlayer(videoElement) {
        console.log('Testing native HTML5 video player...');
        
        videoElement.play().then(() => {
            console.log('Native HTML5 play test successful');
            this.showToast('Native HTML5 player working!', 'success');
            
            // Pause after 2 seconds
            setTimeout(() => {
                videoElement.pause();
                console.log('Native HTML5 pause test successful');
            }, 2000);
        }).catch(error => {
            console.error('Native HTML5 play test failed:', error);
            this.showToast(`Native HTML5 play failed: ${error.message}`, 'error');
        });
    }

    /**
     * Debug video player information
     */
    debugVideoPlayer() {
        console.log('=== VIDEO PLAYER DEBUG INFO ===');
        
        const videoElement = document.getElementById('transcriptionVideoPlayer');
        
        if (!videoElement) {
            console.error('Video element not found');
            this.showToast('Video element not found', 'error');
            return;
        }

        const debugInfo = {
            // Basic element info
            tagName: videoElement.tagName,
            id: videoElement.id,
            className: videoElement.className,
            
            // Video source info
            src: videoElement.src,
            currentSrc: videoElement.currentSrc,
            sources: Array.from(videoElement.querySelectorAll('source')).map(s => ({
                src: s.src,
                type: s.type
            })),
            
            // Video state
            readyState: videoElement.readyState,
            networkState: videoElement.networkState,
            currentTime: videoElement.currentTime,
            duration: videoElement.duration,
            paused: videoElement.paused,
            ended: videoElement.ended,
            muted: videoElement.muted,
            volume: videoElement.volume,
            
            // Video capabilities
            canPlayType: {
                mp4: videoElement.canPlayType('video/mp4'),
                webm: videoElement.canPlayType('video/webm'),
                ogg: videoElement.canPlayType('video/ogg')
            },
            
            // Video.js info
            videoJsAvailable: !!window.videojs,
            videoJsVersion: window.videojs ? window.videojs.VERSION : 'Not available',
            videoJsPlayerInitialized: !!this.videoPlayer,
            
            // Error info
            error: videoElement.error ? {
                code: videoElement.error.code,
                message: videoElement.error.message
            } : null
        };

        console.log('Video Player Debug Info:', debugInfo);
        
        // Show a summary in toast
        const summary = `
            Ready State: ${debugInfo.readyState}/4 | 
            Network State: ${debugInfo.networkState}/3 | 
            Duration: ${debugInfo.duration || 'Unknown'} | 
            Video.js: ${debugInfo.videoJsAvailable ? 'Available' : 'Not Available'}
        `;
        
        this.showToast(`Debug Info: ${summary}`, 'info');
        
        return debugInfo;
    }
}

// Initialize the analyzer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.analyzer = new MultimediaAnalyzer();
});