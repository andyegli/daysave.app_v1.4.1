/**
 * AutomationOrchestrator - Central coordinator for multimedia processing workflows
 * Coordinates processors using plugin registry and configuration manager
 * SINGLETON PATTERN: Only one instance will be created and shared across the application
 */

const path = require('path');
const fs = require('fs').promises;

const BaseMediaProcessor = require('./BaseMediaProcessor');
const VideoProcessor = require('./VideoProcessor');
const AudioProcessor = require('./AudioProcessor');
const ImageProcessor = require('./ImageProcessor');
const PluginRegistry = require('./PluginRegistry');
const ConfigurationManager = require('./ConfigurationManager');
const PerformanceOptimizer = require('./PerformanceOptimizer');
const PerformanceMonitor = require('./PerformanceMonitor');

// Singleton instance
let instance = null;

class AutomationOrchestrator {
    constructor() {
        // Implement singleton pattern
        if (instance) {
            return instance;
        }
        
        this.processors = new Map();
        this.pluginRegistry = new PluginRegistry();
        this.configManager = new ConfigurationManager();
        this.performanceOptimizer = new PerformanceOptimizer();
        this.performanceMonitor = new PerformanceMonitor();
        
        this.processingQueue = [];
        this.activeJobs = new Map();
        this.resultCache = new Map();
        this.metrics = {
            totalProcessed: 0,
            successCount: 0,
            errorCount: 0,
            averageProcessingTime: 0,
            processingTimes: []
        };
        
        this.initialized = false;
        
        // Set up performance monitoring integration
        this.setupPerformanceIntegration();
        
        // Store singleton instance
        instance = this;
    }

    /**
     * Get singleton instance
     */
    static getInstance() {
        if (!instance) {
            instance = new AutomationOrchestrator();
        }
        return instance;
    }

    /**
     * Set up performance monitoring integration
     */
    setupPerformanceIntegration() {
        // Listen to performance events
        this.performanceMonitor.on('alert', (alert) => {
            console.warn(`🚨 Performance Alert: ${alert.type} - ${alert.severity}`);
        });
        
        this.performanceMonitor.on('metrics', (metrics) => {
            // Update internal metrics with performance data
            this.updateInternalMetrics(metrics);
        });
    }
    
    /**
     * Update internal metrics with performance data
     */
    updateInternalMetrics(performanceMetrics) {
        this.performanceMonitor.updateApplicationMetrics({
            totalJobs: this.metrics.totalProcessed,
            activeJobs: this.activeJobs.size,
            completedJobs: this.metrics.successCount,
            failedJobs: this.metrics.errorCount,
            queuedJobs: this.processingQueue.length,
            averageProcessingTime: this.metrics.averageProcessingTime
        });
    }

    /**
     * Initialize the orchestrator with all processors and systems
     */
    async initialize() {
        if (this.initialized) return;

        try {
            // Initialize configuration manager first
            await this.configManager.initialize();
            
            // Initialize plugin registry
            await this.pluginRegistry.initialize();
            
            // Initialize performance components
            await this.performanceOptimizer.initialize();
            this.performanceMonitor.initialize();
            
            // Register processors
            this.processors.set('video', new VideoProcessor());
            this.processors.set('audio', new AudioProcessor());
            this.processors.set('image', new ImageProcessor());
            
            // Initialize all processors with configuration
            for (const [type, processor] of this.processors) {
                const config = this.configManager.getProcessorConfig(type);
                await processor.initialize(config);
            }
            
            // Setup periodic cleanup
            this.setupPeriodicCleanup();
            
            this.initialized = true;
            console.log('AutomationOrchestrator initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize AutomationOrchestrator:', error);
            throw new Error(`Orchestrator initialization failed: ${error.message}`);
        }
    }

    /**
     * Process multimedia content with automatic type detection and routing
     */
    async processContent(fileBuffer, metadata = {}) {
        if (!this.initialized) {
            await this.initialize();
        }

        const jobId = this.generateJobId();
        const startTime = Date.now();
        
        try {
            // Create job record
            const job = {
                id: jobId,
                startTime,
                status: 'processing',
                metadata,
                results: {},
                errors: [],
                warnings: []
            };
            
            this.activeJobs.set(jobId, job);
            
            // Detect media type
            const mediaType = await this.detectMediaType(fileBuffer, metadata);
            job.mediaType = mediaType;
            
            // Check if we have a processor for this type
            const processor = this.processors.get(mediaType);
            if (!processor) {
                throw new Error(`No processor available for media type: ${mediaType}`);
            }
            
            // Check configuration and feature availability
            const processorConfig = this.configManager.getProcessorConfig(mediaType);
            const availableFeatures = await this.getAvailableFeatures(mediaType);
            
            job.config = processorConfig;
            job.availableFeatures = availableFeatures;
            
            // Process the content with performance optimization
            const processingOptions = this.buildProcessingOptions(mediaType, metadata, availableFeatures);
            
            // Use performance optimizer for processing
            const results = await this.performanceOptimizer.processWithOptimization(
                processor, 
                fileBuffer, 
                { ...metadata, jobId }, 
                processingOptions
            );
            
            // Post-process results
            const formattedResults = await this.formatResults(results, mediaType, jobId);
            
            // Update job status
            job.status = 'completed';
            job.results = formattedResults;
            job.endTime = Date.now();
            job.processingTime = job.endTime - job.startTime;
            
            // Update metrics
            this.updateMetrics(job);
            
            // Cache results if enabled
            if (this.configManager.getConfig('performance.caching.enableResultCaching')) {
                this.cacheResults(jobId, formattedResults);
            }
            
            // Clean up job from active jobs
            this.activeJobs.delete(jobId);
            
            return {
                jobId,
                mediaType,
                processingTime: job.processingTime,
                results: formattedResults,
                warnings: job.warnings,
                features: availableFeatures
            };
            
        } catch (error) {
            // Handle processing error
            const job = this.activeJobs.get(jobId);
            if (job) {
                job.status = 'failed';
                job.error = error.message;
                job.endTime = Date.now();
                job.processingTime = job.endTime - job.startTime;
                this.activeJobs.delete(jobId);
            }
            
            this.metrics.errorCount++;
            console.error(`Processing failed for job ${jobId}:`, error);
            
            throw new Error(`Content processing failed: ${error.message}`);
        }
    }

    /**
     * Detect media type from buffer and metadata
     */
    async detectMediaType(buffer, metadata = {}) {
        // Check explicit type from metadata
        if (metadata.type) {
            return this.normalizeMediaType(metadata.type);
        }
        
        // Check filename extension
        if (metadata.filename) {
            const ext = path.extname(metadata.filename).toLowerCase().substring(1);
            const type = this.getTypeFromExtension(ext);
            if (type) return type;
        }
        
        // Check MIME type
        if (metadata.mimeType) {
            const type = this.getTypeFromMimeType(metadata.mimeType);
            if (type) return type;
        }
        
        // Analyze buffer headers (magic numbers)
        const type = await this.detectTypeFromBuffer(buffer);
        if (type) return type;
        
        throw new Error('Unable to detect media type from provided data');
    }

    /**
     * Get media type from file extension
     */
    getTypeFromExtension(ext) {
        const videoExts = this.configManager.getConfig('video.supportedFormats', []);
        const audioExts = this.configManager.getConfig('audio.supportedFormats', []);
        const imageExts = this.configManager.getConfig('image.supportedFormats', []);
        
        if (videoExts.includes(ext)) return 'video';
        if (audioExts.includes(ext)) return 'audio';
        if (imageExts.includes(ext)) return 'image';
        
        return null;
    }

    /**
     * Get media type from MIME type
     */
    getTypeFromMimeType(mimeType) {
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType.startsWith('audio/')) return 'audio';
        if (mimeType.startsWith('image/')) return 'image';
        return null;
    }

    /**
     * Detect media type from buffer headers
     */
    async detectTypeFromBuffer(buffer) {
        if (buffer.length < 12) return null;
        
        const header = buffer.subarray(0, 12);
        
        // Video signatures
        if (this.matchesSignature(header, [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70])) return 'video'; // MP4
        if (this.matchesSignature(header, [0x1A, 0x45, 0xDF, 0xA3])) return 'video'; // WebM/MKV
        if (this.matchesSignature(header, [0x52, 0x49, 0x46, 0x46])) {
            // Could be AVI or WAV
            if (buffer.length > 8 && buffer.subarray(8, 12).toString() === 'AVI ') return 'video';
            if (buffer.length > 8 && buffer.subarray(8, 12).toString() === 'WAVE') return 'audio';
        }
        
        // Audio signatures
        if (this.matchesSignature(header, [0xFF, 0xFB]) || this.matchesSignature(header, [0xFF, 0xF3]) || this.matchesSignature(header, [0xFF, 0xF2])) return 'audio'; // MP3
        if (this.matchesSignature(header, [0x66, 0x4C, 0x61, 0x43])) return 'audio'; // FLAC
        if (this.matchesSignature(header, [0x4F, 0x67, 0x67, 0x53])) return 'audio'; // OGG
        
        // Image signatures
        if (this.matchesSignature(header, [0xFF, 0xD8, 0xFF])) return 'image'; // JPEG
        if (this.matchesSignature(header, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) return 'image'; // PNG
        if (this.matchesSignature(header, [0x47, 0x49, 0x46, 0x38])) return 'image'; // GIF
        if (this.matchesSignature(header, [0x52, 0x49, 0x46, 0x46]) && buffer.length > 8 && buffer.subarray(8, 12).toString() === 'WEBP') return 'image'; // WebP
        
        return null;
    }

    /**
     * Check if buffer matches signature
     */
    matchesSignature(buffer, signature) {
        for (let i = 0; i < signature.length; i++) {
            if (buffer[i] !== signature[i]) return false;
        }
        return true;
    }

    /**
     * Normalize media type string
     */
    normalizeMediaType(type) {
        const normalized = type.toLowerCase();
        if (['video', 'audio', 'image'].includes(normalized)) {
            return normalized;
        }
        throw new Error(`Unsupported media type: ${type}`);
    }

    /**
     * Get available features for a media type
     */
    async getAvailableFeatures(mediaType) {
        const features = {
            core: true,
            plugins: {}
        };
        
        switch (mediaType) {
            case 'video':
                features.plugins.thumbnailGeneration = true;
                features.plugins.qualityAnalysis = this.configManager.isFeatureEnabled('video.enableQualityAnalysis');
                features.plugins.ocrExtraction = this.configManager.isFeatureEnabled('video.enableOCR') && 
                                                this.pluginRegistry.isFeatureAvailable('ocr');
                break;
                
            case 'audio':
                features.plugins.transcription = this.configManager.isFeatureEnabled('audio.enableTranscription') && 
                                                this.pluginRegistry.isFeatureAvailable('transcription');
                features.plugins.speakerDiarization = this.configManager.isFeatureEnabled('audio.enableSpeakerDiarization');
                features.plugins.voicePrintMatching = this.configManager.isFeatureEnabled('audio.enableVoicePrintMatching');
                features.plugins.sentimentAnalysis = this.configManager.isFeatureEnabled('audio.enableSentimentAnalysis');
                break;
                
            case 'image':
                features.plugins.objectDetection = this.configManager.isFeatureEnabled('image.enableObjectDetection') && 
                                                  this.pluginRegistry.isFeatureAvailable('object_detection');
                features.plugins.ocrExtraction = this.configManager.isFeatureEnabled('image.enableOCR') && 
                                                this.pluginRegistry.isFeatureAvailable('ocr');
                features.plugins.aiDescription = this.configManager.isFeatureEnabled('image.enableAIDescription') && 
                                               this.pluginRegistry.isFeatureAvailable('image_analysis');
                features.plugins.qualityAnalysis = this.configManager.isFeatureEnabled('image.enableQualityAnalysis');
                break;
        }
        
        return features;
    }

    /**
     * Build processing options based on configuration and available features
     */
    buildProcessingOptions(mediaType, metadata, features) {
        const baseOptions = {
            enableProgressTracking: this.configManager.getConfig('base.enableProgressTracking', true),
            retryAttempts: this.configManager.getConfig('base.retryAttempts', 3),
            timeoutMs: this.configManager.getConfig('base.timeoutMs', 300000)
        };
        
        const processorConfig = this.configManager.getProcessorConfig(mediaType);
        
        return {
            ...baseOptions,
            ...processorConfig,
            metadata,
            features,
            pluginRegistry: this.pluginRegistry
        };
    }

    /**
     * Format processing results for unified output
     */
    async formatResults(results, mediaType, jobId) {
        const formatted = {
            jobId,
            mediaType,
            timestamp: new Date().toISOString(),
            success: true,
            data: {}
        };
        
        // Core results that all processors should provide
        if (results.metadata) formatted.data.metadata = results.metadata;
        if (results.quality) formatted.data.quality = results.quality;
        if (results.thumbnails) formatted.data.thumbnails = results.thumbnails;
        
        // Type-specific results
        switch (mediaType) {
            case 'video':
                if (results.ocrCaptions) formatted.data.ocrCaptions = results.ocrCaptions;
                if (results.videoAnalysis) formatted.data.videoAnalysis = results.videoAnalysis;
                break;
                
            case 'audio':
                if (results.transcription) formatted.data.transcription = results.transcription;
                if (results.speakers) formatted.data.speakers = results.speakers;
                if (results.voicePrints) formatted.data.voicePrints = results.voicePrints;
                if (results.sentiment) formatted.data.sentiment = results.sentiment;
                break;
                
            case 'image':
                if (results.objects) formatted.data.objects = results.objects;
                if (results.ocrText) formatted.data.ocrText = results.ocrText;
                if (results.aiDescription) formatted.data.aiDescription = results.aiDescription;
                if (results.tags) formatted.data.tags = results.tags;
                break;
        }
        
        // Plugin results
        if (results.pluginResults) {
            formatted.data.pluginResults = results.pluginResults;
        }
        
        return formatted;
    }

    /**
     * Update processing metrics
     */
    updateMetrics(job) {
        this.metrics.totalProcessed++;
        
        if (job.status === 'completed') {
            this.metrics.successCount++;
        } else {
            this.metrics.errorCount++;
        }
        
        if (job.processingTime) {
            this.metrics.processingTimes.push(job.processingTime);
            
            // Keep only last 100 processing times for average calculation
            if (this.metrics.processingTimes.length > 100) {
                this.metrics.processingTimes.shift();
            }
            
            this.metrics.averageProcessingTime = 
                this.metrics.processingTimes.reduce((a, b) => a + b, 0) / this.metrics.processingTimes.length;
        }
    }

    /**
     * Cache processing results
     */
    cacheResults(jobId, results) {
        const cacheTimeout = this.configManager.getConfig('performance.caching.cacheTimeout', 3600000);
        const maxCacheSize = this.configManager.getConfig('performance.caching.maxCacheSize', 1000);
        
        // Clean old cache entries if at max size
        if (this.resultCache.size >= maxCacheSize) {
            const oldestKey = this.resultCache.keys().next().value;
            this.resultCache.delete(oldestKey);
        }
        
        this.resultCache.set(jobId, {
            results,
            timestamp: Date.now(),
            expiresAt: Date.now() + cacheTimeout
        });
    }

    /**
     * Generate unique job ID
     */
    generateJobId() {
        return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get job status
     */
    getJobStatus(jobId) {
        const job = this.activeJobs.get(jobId);
        if (!job) {
            // Check cache
            const cached = this.resultCache.get(jobId);
            if (cached && cached.expiresAt > Date.now()) {
                return {
                    id: jobId,
                    status: 'completed',
                    results: cached.results,
                    fromCache: true
                };
            }
            return null;
        }
        
        return {
            id: job.id,
            status: job.status,
            mediaType: job.mediaType,
            startTime: job.startTime,
            processingTime: job.endTime ? job.endTime - job.startTime : Date.now() - job.startTime,
            availableFeatures: job.availableFeatures
        };
    }

    /**
     * Get system status and metrics
     */
    getSystemStatus() {
        const pluginStatus = this.pluginRegistry.getStatusReport();
        const configSummary = this.configManager.getConfigSummary();
        
        return {
            orchestrator: {
                initialized: this.initialized,
                activeJobs: this.activeJobs.size,
                cacheSize: this.resultCache.size,
                metrics: this.metrics
            },
            processors: Array.from(this.processors.keys()),
            plugins: pluginStatus,
            configuration: {
                loaded: true,
                sections: Object.keys(configSummary)
            }
        };
    }

    /**
     * Setup periodic cleanup
     */
    setupPeriodicCleanup() {
        setInterval(() => {
            // Clean expired cache entries
            const now = Date.now();
            for (const [key, value] of this.resultCache) {
                if (value.expiresAt < now) {
                    this.resultCache.delete(key);
                }
            }
            
            // Clean old job records (jobs older than 1 hour)
            const oneHourAgo = now - 3600000;
            for (const [jobId, job] of this.activeJobs) {
                if (job.startTime < oneHourAgo) {
                    console.warn(`Cleaning up long-running job: ${jobId}`);
                    this.activeJobs.delete(jobId);
                }
            }
        }, 300000); // Every 5 minutes
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        try {
            // Cleanup processors
            for (const processor of this.processors.values()) {
                if (processor.cleanup) {
                    await processor.cleanup();
                }
            }
            
            // Cleanup plugin registry
            await this.pluginRegistry.cleanup();
            
            // Clear caches and active jobs
            this.resultCache.clear();
            this.activeJobs.clear();
            
            this.initialized = false;
            
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    }
}

module.exports = AutomationOrchestrator; 