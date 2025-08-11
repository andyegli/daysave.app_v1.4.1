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
const DocumentProcessor = require('./DocumentProcessor');
const WebsiteProcessor = require('./WebsiteProcessor');
const UrlProcessor = require('./UrlProcessor');
const PluginRegistry = require('./PluginRegistry');
const ConfigurationManager = require('./ConfigurationManager');
const PerformanceOptimizer = require('./PerformanceOptimizer');
const PerformanceMonitor = require('./PerformanceMonitor');
const ProgressTracker = require('./ProgressTracker');

// Singleton instance
let instance = null;

class AutomationOrchestrator {
    constructor() {
        // Implement singleton pattern
        if (instance) {
            return instance;
        }
        
        this.processors = new Map();
        this.urlProcessor = new UrlProcessor();
        this.pluginRegistry = new PluginRegistry();
        this.configManager = new ConfigurationManager();
        this.performanceOptimizer = new PerformanceOptimizer();
        this.performanceMonitor = new PerformanceMonitor();
        this.progressTracker = new ProgressTracker();
        
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
        
        // Set up detailed progress logging
        this.setupProgressLogging();
        
        // Store singleton instance
        instance = this;
    }
    
    /**
     * Static method to get the singleton instance
     */
    static getInstance() {
        if (!instance) {
            instance = new AutomationOrchestrator();
        }
        return instance;
    }

    /**
     * Setup detailed progress logging
     */
    setupProgressLogging() {
        const enableConsoleLogging = process.env.ENABLE_MULTIMEDIA_CONSOLE_LOGGING === 'true';
        
        // Listen to progress tracker events for detailed logging
        this.progressTracker.on('jobCreated', (data) => {
            if (enableConsoleLogging) {
                console.log(`🚀 [JOB-${data.jobId}] Started ${data.job.mediaType} processing pipeline`);
                console.log(`   📄 File: ${data.job.metadata.filename} (${this.formatFileSize(data.job.metadata.fileSize)})`);
                console.log(`   📋 Stages: ${data.job.stages?.length || 0} planned steps`);
            }
        });

        this.progressTracker.on('stageStarted', (data) => {
            if (enableConsoleLogging) {
                const duration = Date.now() - data.job.startTime;
                console.log(`🔄 [JOB-${data.jobId}] Step ${data.stageIndex + 1}: ${data.details.label || data.stageName}`);
                console.log(`   ⏱️  Elapsed: ${this.formatDuration(duration)} | Progress: ${data.job.progress.overall.toFixed(1)}%`);
                if (data.details.description) {
                    console.log(`   ℹ️  ${data.details.description}`);
                }
            }
        });

        this.progressTracker.on('stageProgress', (data) => {
            if (enableConsoleLogging && (data.progress % 25 === 0 || data.progress === 100)) { // Log every 25% progress
                console.log(`   📊 ${data.stageName}: ${data.progress}% complete (Overall: ${data.overallProgress.toFixed(1)}%)`);
                if (data.details.processed && data.details.total) {
                    console.log(`      📈 Processed: ${data.details.processed}/${data.details.total} items`);
                }
            }
        });

        this.progressTracker.on('stageCompleted', (data) => {
            if (enableConsoleLogging) {
                console.log(`✅ [JOB-${data.jobId}] Completed: ${data.stageName} (${this.formatDuration(data.duration)})`);
                if (data.result) {
                    this.logStageResults(data.stageName, data.result);
                }
            }
        });

        this.progressTracker.on('stageFailed', (data) => {
            if (enableConsoleLogging) {
                console.log(`❌ [JOB-${data.jobId}] Failed: ${data.stageName} - ${data.error}`);
            }
        });

        this.progressTracker.on('stageSkipped', (data) => {
            if (enableConsoleLogging) {
                console.log(`⏭️  [JOB-${data.jobId}] Skipped: ${data.stageName} (${data.reason})`);
            }
        });

        this.progressTracker.on('jobCompleted', (data) => {
            if (enableConsoleLogging) {
                console.log(`🎉 [JOB-${data.jobId}] Pipeline completed successfully!`);
                console.log(`   ⏱️  Total time: ${this.formatDuration(data.duration)}`);
                console.log(`   📊 Performance: ${this.formatProcessingSpeed(data.job)}`);
                this.logFinalResults(data.jobId, data.result);
            }
        });

        this.progressTracker.on('jobFailed', (data) => {
            if (enableConsoleLogging) {
                console.log(`💥 [JOB-${data.jobId}] Pipeline failed: ${data.error}`);
                console.log(`   ⏱️  Failed after: ${this.formatDuration(data.duration)}`);
            }
        });
    }
    
    /**
     * Log detailed results for each stage
     */
    logStageResults(stageName, result) {
        const enableConsoleLogging = process.env.ENABLE_MULTIMEDIA_CONSOLE_LOGGING === 'true';
        if (!enableConsoleLogging) return;
        
        const indent = '      ';
        
        switch (stageName) {
            case 'validation':
                if (result.isValid) {
                    console.log(`${indent}✓ File validation passed`);
                    if (result.format) console.log(`${indent}📝 Format: ${result.format}`);
                    if (result.duration) console.log(`${indent}⏱️  Duration: ${this.formatDuration(result.duration * 1000)}`);
                } else {
                    console.log(`${indent}❌ Validation failed: ${result.error}`);
                }
                break;
                
            case 'metadata_extraction':
                console.log(`${indent}📋 Extracted metadata:`);
                if (result.dimensions) console.log(`${indent}   📐 Dimensions: ${result.dimensions.width}x${result.dimensions.height}`);
                if (result.duration) console.log(`${indent}   ⏱️  Duration: ${this.formatDuration(result.duration * 1000)}`);
                if (result.fileSize) console.log(`${indent}   📦 Size: ${this.formatFileSize(result.fileSize)}`);
                if (result.codec) console.log(`${indent}   🎬 Codec: ${result.codec}`);
                break;
                
            case 'transcription':
                if (result.transcript) {
                    const wordCount = result.transcript.split(' ').length;
                    console.log(`${indent}📝 Transcription: ${wordCount} words`);
                    if (result.confidence) console.log(`${indent}   🎯 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
                    if (result.language) console.log(`${indent}   🌍 Language: ${result.language}`);
                    console.log(`${indent}   📄 Preview: "${result.transcript.substring(0, 100)}..."`);
                }
                break;
                
            case 'speaker_analysis':
                if (result.speakers) {
                    console.log(`${indent}👥 Detected ${result.speakers.length} speaker(s)`);
                    result.speakers.forEach((speaker, i) => {
                        console.log(`${indent}   🗣️  Speaker ${i + 1}: ${this.formatDuration(speaker.duration * 1000)} speaking time`);
                    });
                }
                break;
                
            case 'object_detection':
                if (result.objects) {
                    console.log(`${indent}🔍 Detected ${result.objects.length} object(s)`);
                    result.objects.slice(0, 5).forEach(obj => {
                        console.log(`${indent}   🏷️  ${obj.name}: ${(obj.confidence * 100).toFixed(1)}% confidence`);
                    });
                    if (result.objects.length > 5) {
                        console.log(`${indent}   ... and ${result.objects.length - 5} more objects`);
                    }
                }
                break;
                
            case 'thumbnail_generation':
                if (result.thumbnails) {
                    console.log(`${indent}🖼️  Generated ${result.thumbnails.length} thumbnail(s)`);
                    result.thumbnails.forEach(thumb => {
                        console.log(`${indent}   📸 ${thumb.size}: ${thumb.filename}`);
                    });
                }
                break;
                
            case 'ocr_processing':
                if (result.text) {
                    const charCount = result.text.length;
                    console.log(`${indent}📖 OCR extracted ${charCount} characters`);
                    if (result.confidence) console.log(`${indent}   🎯 Average confidence: ${(result.confidence * 100).toFixed(1)}%`);
                    if (charCount > 0) {
                        console.log(`${indent}   📄 Preview: "${result.text.substring(0, 100)}..."`);
                    }
                }
                break;
                
            case 'ai_description':
                if (result.description) {
                    console.log(`${indent}🤖 AI Description generated`);
                    console.log(`${indent}   📄 "${result.description.substring(0, 150)}..."`);
                }
                break;
                
            case 'quality_analysis':
                if (result.quality) {
                    console.log(`${indent}⭐ Quality score: ${result.quality.overall || 'N/A'}`);
                    if (result.quality.resolution) console.log(`${indent}   📐 Resolution quality: ${result.quality.resolution}`);
                    if (result.quality.clarity) console.log(`${indent}   🔍 Clarity: ${result.quality.clarity}`);
                }
                break;
                
            case 'sentiment_analysis':
                if (result.sentiment) {
                    console.log(`${indent}😊 Sentiment: ${result.sentiment.label} (${(result.sentiment.score * 100).toFixed(1)}%)`);
                }
                break;
                
            case 'database_storage':
                console.log(`${indent}💾 Data stored successfully`);
                if (result.recordsCreated) console.log(`${indent}   📊 Records: ${result.recordsCreated}`);
                break;
                
            default:
                if (result.message) {
                    console.log(`${indent}📝 ${result.message}`);
                }
        }
    }

    /**
     * Log final processing results
     */
    logFinalResults(jobId, result) {
        const enableConsoleLogging = process.env.ENABLE_MULTIMEDIA_CONSOLE_LOGGING === 'true';
        if (!enableConsoleLogging) return;
        
        console.log(`\n📊 [JOB-${jobId}] Final Results Summary:`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        
        if (result.data) {
            const data = result.data;
            
            // Metadata summary
            if (data.metadata) {
                console.log(`📋 Metadata:`);
                if (data.metadata.format) console.log(`   📝 Format: ${data.metadata.format}`);
                if (data.metadata.duration) console.log(`   ⏱️  Duration: ${this.formatDuration(data.metadata.duration * 1000)}`);
                if (data.metadata.fileSize) console.log(`   📦 Size: ${this.formatFileSize(data.metadata.fileSize)}`);
            }
            
            // Content analysis summary
            if (data.transcription) {
                const wordCount = data.transcription.split(' ').length;
                console.log(`📝 Transcription: ${wordCount} words extracted`);
            }
            
            if (data.objects && data.objects.length > 0) {
                console.log(`🔍 Objects: ${data.objects.length} items detected`);
            }
            
            if (data.thumbnails && data.thumbnails.length > 0) {
                console.log(`🖼️  Thumbnails: ${data.thumbnails.length} generated`);
            }
            
            if (data.ocrText && data.ocrText.length > 0) {
                console.log(`📖 OCR Text: ${data.ocrText.length} characters extracted`);
            }
            
            if (data.speakers && data.speakers.length > 0) {
                console.log(`👥 Speakers: ${data.speakers.length} detected`);
            }
            
            if (data.sentiment) {
                console.log(`😊 Sentiment: ${data.sentiment.label} (${(data.sentiment.score * 100).toFixed(1)}%)`);
            }
            
            if (data.quality) {
                console.log(`⭐ Quality: ${data.quality.overall || 'Analyzed'}`);
            }
        }
        
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    }

    /**
     * Setup performance monitoring integration
     */
    setupPerformanceIntegration() {
        this.performanceMonitor.on('alert', (alert) => {
            if (alert.type === 'memory_high' || alert.type === 'cpu_high') {
                const { logging } = require('../../config/config');
                if (logging.enablePerformanceAlertLogging) {
                    console.log(`⚠️ Performance Alert: ${alert.type} - ${alert.severity}`);
                    console.log(`   📊 Current: ${alert.current}, Threshold: ${alert.threshold}`);
                }
            }
        });
        
        this.performanceOptimizer.on('memoryPressure', (memUsage) => {
            const { logging } = require('../../config/config');
            if (logging.enablePerformanceAlertLogging) {
                console.log(`🧹 Memory cleanup triggered - Usage: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
            }
        });
    }

    /**
     * Initialize the orchestrator with all processors and systems
     */
    async initialize() {
        if (this.initialized) return;

        try {
            console.log('\n🚀 Initializing Automation Orchestrator...');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            // Initialize configuration manager first
            console.log('⚙️  Initializing configuration manager...');
            await this.configManager.initialize();
            
            // Initialize plugin registry
            console.log('🔌 Initializing plugin registry...');
            await this.pluginRegistry.initialize();
            
            // Initialize performance components
            console.log('📊 Initializing performance systems...');
            await this.performanceOptimizer.ensureInitialized();
            this.performanceMonitor.ensureInitialized();
            
            // Register processors
            console.log('🎬 Registering media processors...');
            this.processors.set('video', new VideoProcessor());
            this.processors.set('audio', new AudioProcessor());
            this.processors.set('image', new ImageProcessor());
            this.processors.set('document', new DocumentProcessor());
            this.processors.set('website', new WebsiteProcessor());
            
            // Initialize all processors with configuration
            for (const [type, processor] of this.processors) {
                const config = this.configManager.getProcessorConfig(type);
                console.log(`   🔧 Initializing ${type} processor...`);
                await processor.ensureInitialized(config);
            }
            
            // Setup periodic cleanup
            this.setupPeriodicCleanup();
            
            this.initialized = true;
            console.log('✅ Automation Orchestrator initialized successfully');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            
        } catch (error) {
            console.error('❌ Failed to initialize AutomationOrchestrator:', error);
            throw new Error(`Orchestrator initialization failed: ${error.message}`);
        }
    }

    /**
     * Process URL-based content (YouTube, social media, etc.)
     * @param {string} url - URL to process
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} Processing result
     */
    async processUrl(url, options = {}) {
        if (!this.initialized) {
            await this.initialize();
        }

        const jobId = this.generateJobId();
        const startTime = Date.now();
        
        try {
            console.log(`\n🔗 Starting URL processing job: ${jobId}`);
            console.log(`   📍 URL: ${url}`);
            
            // Validate URL - check for multimedia content OR website content
            const isMultimedia = this.urlProcessor.isMultimediaUrl(url);
            const isWebsite = this.urlProcessor.isWebsiteUrl(url);
            
            if (!isMultimedia && !isWebsite) {
                throw new Error('URL does not contain multimedia content and is not a supported website');
            }

            // Create job record
            const job = {
                id: jobId,
                startTime,
                status: 'processing',
                url,
                metadata: { source: 'url', url },
                results: {},
                errors: [],
                warnings: [],
                options
            };
            
            this.activeJobs.set(jobId, job);
            
            // Perform comprehensive URL content analysis
            console.log(`🔍 [JOB-${jobId}] Starting comprehensive content analysis...`);
            
            let analysisResult;
            
            if (isWebsite) {
                // Use WebsiteProcessor for general websites
                console.log(`🌐 Processing as website using WebsiteProcessor...`);
                const websiteProcessor = this.processors.get('website');
                const websiteResult = await websiteProcessor.process(options.user_id, url, {
                    ...options,
                    content_id: options.content_id,
                    progressCallback: options.progressCallback,
                    startTime
                });
                
                // Convert WebsiteProcessor result to standard format
                analysisResult = {
                    url: websiteResult.url,
                    platform: websiteResult.platform,
                    metadata: websiteResult.metadata,
                    transcription: '', // Website content doesn't have transcription
                    speakers: [],
                    summary: websiteResult.aiInsights.summary || '',
                    sentiment: { label: websiteResult.analysis.sentiment, score: 0.5 },
                    thumbnails: [],
                    auto_tags: Array.isArray(websiteResult.aiInsights.tags) ? websiteResult.aiInsights.tags.join(', ') : websiteResult.aiInsights.tags || '',
                    user_tags: [],
                    category: Array.isArray(websiteResult.aiInsights.categories) ? websiteResult.aiInsights.categories.join(', ') : websiteResult.aiInsights.categories || '',
                    generatedTitle: websiteResult.aiInsights.suggestedTitle || websiteResult.metadata.title,
                    status: 'completed',
                    analysisId: jobId,
                    processing_time: websiteResult.processingTime
                };
                
            } else {
                // Use UrlProcessor for multimedia content
                console.log(`🎬 Processing as multimedia using UrlProcessor...`);
                analysisResult = await this.urlProcessor.analyzeUrlContent(url, {
                    ...options,
                    user_id: options.user_id,
                    content_id: options.content_id,
                    analysisId: jobId,
                    progressCallback: options.progressCallback // Pass through progress callback
                });
            }
            
            job.metadata = { ...job.metadata, ...analysisResult.metadata };
            job.platform = analysisResult.platform;
            
            console.log(`   📝 Platform: ${analysisResult.platform.toUpperCase()}`);
            console.log(`   📊 Analysis: ${analysisResult.status} (${analysisResult.processing_time}ms)`);
            
            // Return comprehensive analysis result - no compatibility mode needed!
            const result = {
                success: true,
                jobId,
                url: analysisResult.url,
                platform: analysisResult.platform,
                metadata: analysisResult.metadata,
                transcription: analysisResult.transcription,
                speakers: analysisResult.speakers,
                summary: analysisResult.summary,
                sentiment: analysisResult.sentiment,
                thumbnails: analysisResult.thumbnails,
                auto_tags: analysisResult.auto_tags,
                user_tags: analysisResult.user_tags,
                category: analysisResult.category,
                generatedTitle: analysisResult.generatedTitle,
                status: analysisResult.status,
                analysisId: analysisResult.analysisId,
                processingTime: Date.now() - startTime,
                requiresCompatibilityMode: false // New system handles everything!
            };

            // Store result
            job.results = result;
            job.status = 'completed';
            this.activeJobs.delete(jobId);

            console.log(`✅ [JOB-${jobId}] URL metadata extraction completed`);
            
            return result;

        } catch (error) {
            console.error(`❌ [JOB-${jobId}] URL processing failed:`, error);
            
            const job = this.activeJobs.get(jobId);
            if (job) {
                job.status = 'failed';
                job.errors.push(error.message);
                this.activeJobs.delete(jobId);
            }
            
            throw error;
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
            console.log(`\n🎯 Starting new processing job: ${jobId}`);
            
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
            console.log(`🔍 [JOB-${jobId}] Detecting media type...`);
            const mediaType = await this.detectMediaType(fileBuffer, metadata);
            job.mediaType = mediaType;
            job.contentType = mediaType; // Store for database updates
            console.log(`   📝 Detected: ${mediaType.toUpperCase()} media`);
            
            // Create progress tracking job
            const progressJob = this.progressTracker.createJob(jobId, mediaType, {
                filename: metadata.filename || 'unknown',
                fileSize: fileBuffer.length,
                duration: metadata.duration || 0
            });
            
            // Check if we have a processor for this type
            const processor = this.processors.get(mediaType);
            if (!processor) {
                throw new Error(`No processor available for media type: ${mediaType}`);
            }
            
            console.log(`🎛️  [JOB-${jobId}] Using ${mediaType} processor`);
            
            // Check configuration and feature availability
            const processorConfig = this.configManager.getProcessorConfig(mediaType);
            const availableFeatures = await this.getAvailableFeatures(mediaType);
            
            job.config = processorConfig;
            job.availableFeatures = availableFeatures;
            
            // Convert features object to array for display
            const featuresList = Array.isArray(availableFeatures) ? availableFeatures : 
                Object.entries(availableFeatures.plugins || {})
                    .filter(([key, enabled]) => enabled)
                    .map(([key]) => key);
            
            console.log(`⚙️  [JOB-${jobId}] Available features: ${featuresList.join(', ') || 'basic processing only'}`);
            
            // Process the content with performance optimization
            const processingOptions = this.buildProcessingOptions(mediaType, metadata, availableFeatures);
            
            console.log(`🔧 DEBUG: Processing options for ${mediaType}:`, JSON.stringify(processingOptions, null, 2));
            
            // Enhanced processing with progress tracking
            const results = await this.processWithDetailedTracking(
                processor, 
                fileBuffer, 
                { ...metadata, jobId }, 
                processingOptions,
                jobId,
                mediaType
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
                features: featuresList // Return the array format for consistency
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
            console.error(`💥 [JOB-${jobId}] Processing failed:`, error.message);
            
            // Emit job failed event
            this.progressTracker.emit('jobFailed', {
                jobId,
                error: error.message,
                duration: Date.now() - startTime
            });
            
            throw new Error(`Content processing failed: ${error.message}`);
        }
    }

    /**
     * Process content with detailed progress tracking
     */
    async processWithDetailedTracking(processor, fileBuffer, metadata, options, jobId, mediaType) {
        const stages = this.progressTracker.stages.get(mediaType) || [];
        
        try {
            // Start validation stage
            if (stages.find(s => s.name === 'validation')) {
                this.progressTracker.startStage(jobId, 'validation', {
                    label: 'Validating file format and integrity',
                    description: `Checking ${mediaType} file validity`
                });
                
                // Simulate validation process with progress updates
                for (let i = 0; i <= 100; i += 25) {
                    this.progressTracker.updateStageProgress(jobId, 'validation', i, {
                        step: i === 0 ? 'Starting validation' :
                              i === 25 ? 'Checking file format' :
                              i === 50 ? 'Validating headers' :
                              i === 75 ? 'Checking integrity' :
                              'Validation complete'
                    });
                    if (i < 100) await new Promise(resolve => setTimeout(resolve, 100));
                }
                
                this.progressTracker.completeStage(jobId, 'validation', {
                    isValid: true,
                    format: mediaType,
                    fileSize: fileBuffer.length
                });
            }
            
            // Use performance optimizer for actual processing
            const result = await this.performanceOptimizer.processWithOptimization(
                processor, 
                fileBuffer, 
                metadata, 
                {
                    ...options,
                    progressCallback: (progress, stage, details) => {
                        if (stage && stages.find(s => s.name === stage)) {
                            this.progressTracker.updateStageProgress(jobId, stage, progress, details);
                        }
                    }
                }
            );
            
            return result;
            
        } catch (error) {
            // Find current stage and mark it as failed
            const job = this.progressTracker.jobs.get(jobId);
            if (job && job.currentStage) {
                this.progressTracker.failStage(jobId, job.currentStage.name, error);
            }
            throw error;
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
        const documentExts = ['pdf', 'doc', 'docx', 'txt', 'rtf'];
        
        if (videoExts.includes(ext)) return 'video';
        if (audioExts.includes(ext)) return 'audio';
        if (imageExts.includes(ext)) return 'image';
        if (documentExts.includes(ext)) return 'document';
        
        return null;
    }

    /**
     * Get media type from MIME type
     */
    getTypeFromMimeType(mimeType) {
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType.startsWith('audio/')) return 'audio';
        if (mimeType.startsWith('image/')) return 'image';
        
        // Document MIME types
        const documentMimeTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'text/rtf',
            'application/rtf'
        ];
        
        if (documentMimeTypes.includes(mimeType)) return 'document';
        if (mimeType.startsWith('text/')) return 'document';
        
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
        if (['video', 'audio', 'image', 'document'].includes(normalized)) {
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
                
            case 'document':
                features.plugins.textExtraction = this.configManager.isFeatureEnabled('document.enableTextExtraction');
                features.plugins.aiAnalysis = this.configManager.isFeatureEnabled('document.enableAIAnalysis');
                features.plugins.summaryGeneration = this.configManager.isFeatureEnabled('document.enableSummaryGeneration');
                features.plugins.tagGeneration = this.configManager.isFeatureEnabled('document.enableTagGeneration');
                features.plugins.titleGeneration = this.configManager.isFeatureEnabled('document.enableTitleGeneration');
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
        
        // Map configuration options to processor-specific option names
        const mappedOptions = this.mapOptionsForProcessor(mediaType, processorConfig, features);
        
        return {
            ...baseOptions,
            ...mappedOptions,
            metadata,
            features,
            pluginRegistry: this.pluginRegistry
        };
    }

    /**
     * Map configuration options to processor-specific option names
     */
    mapOptionsForProcessor(mediaType, config, features) {
        const mappedOptions = { ...config };
        
        switch (mediaType) {
            case 'image':
                // Map image processor configuration to expected option names
                if (config.enableAIDescription !== undefined) {
                    mappedOptions.enableDescriptionGeneration = config.enableAIDescription && features.plugins.aiDescription;
                }
                if (config.enableOCR !== undefined) {
                    mappedOptions.enableOCRExtraction = config.enableOCR && features.plugins.ocrExtraction;
                }
                if (config.enableObjectDetection !== undefined) {
                    mappedOptions.enableObjectDetection = config.enableObjectDetection && features.plugins.objectDetection;
                }
                if (config.enableQualityAnalysis !== undefined) {
                    mappedOptions.enableQualityAnalysis = config.enableQualityAnalysis && features.plugins.qualityAnalysis;
                }
                // Enable thumbnail, tag, and title generation by default for images
                mappedOptions.enableThumbnailGeneration = config.enableThumbnailGeneration !== false;
                mappedOptions.enableTagGeneration = config.enableTagGeneration !== false && features.plugins.aiDescription;
                mappedOptions.enableTitleGeneration = config.enableTitleGeneration !== false && features.plugins.aiDescription;
                break;
                
            case 'video':
                // Map video processor configuration
                if (config.enableOCR !== undefined) {
                    mappedOptions.enableOCRExtraction = config.enableOCR && features.plugins.ocrExtraction;
                }
                mappedOptions.enableThumbnailGeneration = config.enableThumbnailGeneration !== false;
                break;
                
            case 'audio':
                // Map audio processor configuration
                if (config.enableTranscription !== undefined) {
                    mappedOptions.enableTranscription = config.enableTranscription && features.plugins.transcription;
                }
                if (config.enableSpeakerDiarization !== undefined) {
                    mappedOptions.enableSpeakerDiarization = config.enableSpeakerDiarization && features.plugins.speakerDiarization;
                }
                break;
                
            case 'document':
                // Map document processor configuration
                mappedOptions.enableTextExtraction = config.enableTextExtraction !== false && features.plugins.textExtraction;
                mappedOptions.enableAIAnalysis = config.enableAIAnalysis !== false && features.plugins.aiAnalysis;
                mappedOptions.enableSummaryGeneration = config.enableSummaryGeneration !== false && features.plugins.summaryGeneration;
                mappedOptions.enableTagGeneration = config.enableTagGeneration !== false && features.plugins.tagGeneration;
                mappedOptions.enableTitleGeneration = config.enableTitleGeneration !== false && features.plugins.titleGeneration;
                break;
        }
        
        return mappedOptions;
    }

    /**
     * Format processing results for unified output
     */
    async formatResults(results, mediaType, jobId) {
        console.log(`🔧 DEBUG: formatResults() received for ${mediaType}:`, {
            resultKeys: Object.keys(results),
            hasResults: !!results.results,
            resultsKeys: results.results ? Object.keys(results.results) : [],
            hasMetadata: !!results.metadata,
            structure: typeof results
        });
        
        const formatted = {
            jobId,
            mediaType,
            timestamp: new Date().toISOString(),
            success: true,
            data: {}
        };
        
        // Handle both direct results and nested results structure
        const actualResults = results.results || results;
        
        // Core results that all processors should provide  
        if (results.metadata) formatted.data.metadata = results.metadata;
        if (actualResults.quality) formatted.data.quality = actualResults.quality;
        if (actualResults.thumbnails) formatted.data.thumbnails = actualResults.thumbnails;
        
        // Type-specific results
        switch (mediaType) {
            case 'video':
                if (actualResults.ocrCaptions) formatted.data.ocrCaptions = actualResults.ocrCaptions;
                if (actualResults.videoAnalysis) formatted.data.videoAnalysis = actualResults.videoAnalysis;
                break;
                
            case 'audio':
                if (actualResults.transcription) formatted.data.transcription = actualResults.transcription;
                if (actualResults.speakers) formatted.data.speakers = actualResults.speakers;
                if (actualResults.voicePrints) formatted.data.voicePrints = actualResults.voicePrints;
                if (actualResults.sentiment) formatted.data.sentiment = actualResults.sentiment;
                break;
                
            case 'image':
                if (actualResults.objects) formatted.data.objects = actualResults.objects;
                if (actualResults.ocrText) formatted.data.ocrText = actualResults.ocrText;
                if (actualResults.description) formatted.data.aiDescription = actualResults.description; // FIX: Map description to aiDescription
                if (actualResults.transcription) formatted.data.transcription = actualResults.transcription; // Also include transcription
                if (actualResults.tags) formatted.data.tags = actualResults.tags;
                break;
                
            case 'document':
                if (actualResults.text) formatted.data.transcription = actualResults.text;
                if (actualResults.transcription) formatted.data.transcription = actualResults.transcription;
                if (actualResults.summary) formatted.data.summary = actualResults.summary;
                if (actualResults.aiDescription) formatted.data.aiDescription = actualResults.aiDescription;
                if (actualResults.tags) formatted.data.tags = actualResults.tags;
                if (actualResults.title) formatted.data.title = actualResults.title;
                if (actualResults.generatedTitle) formatted.data.title = actualResults.generatedTitle; // Map DocumentProcessor title
                break;
        }
        
        // Plugin results
        if (results.pluginResults) {
            formatted.data.pluginResults = results.pluginResults;
        }
        
        console.log(`🔧 DEBUG: formatResults() returning for ${mediaType}:`, {
            dataKeys: Object.keys(formatted.data),
            hasAiDescription: !!formatted.data.aiDescription,
            hasObjects: !!formatted.data.objects,
            hasTags: !!formatted.data.tags,
            hasTranscription: !!formatted.data.transcription,
            objectCount: formatted.data.objects?.length || 0,
            tagCount: formatted.data.tags?.length || 0,
            descriptionLength: formatted.data.aiDescription?.length || 0
        });
        
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

    /**
     * Utility methods for formatting
     */
    formatDuration(ms) {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}m ${seconds}s`;
    }

    formatFileSize(bytes) {
        if (bytes < 1024) return `${bytes} bytes`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
        return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
    }

    formatProcessingSpeed(job) {
        if (job.metadata.fileSize && job.duration) {
            const mbPerSecond = (job.metadata.fileSize / 1024 / 1024) / (job.duration / 1000);
            return `${mbPerSecond.toFixed(2)} MB/s`;
        }
        return 'N/A';
    }
}

module.exports = AutomationOrchestrator; 