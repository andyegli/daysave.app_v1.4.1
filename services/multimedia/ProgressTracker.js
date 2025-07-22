/**
 * ProgressTracker - Unified progress tracking for multimedia processing
 * Provides real-time progress updates across all processors
 */

const EventEmitter = require('events');

class ProgressTracker extends EventEmitter {
    constructor() {
        super();
        this.jobs = new Map();
        this.stages = new Map();
        this.metrics = new Map();
        this.subscribers = new Map();
        this.updateInterval = 1000; // 1 second
        this.cleanupInterval = 300000; // 5 minutes
        this.initialized = false;
        
        this.setupDefaultStages();
        this.startCleanupTimer();
    }

    /**
     * Initialize progress tracker
     */
    async initialize() {
        if (this.initialized) return;
        this.initialized = true;
    }

    /**
     * Setup default processing stages for each media type
     */
    setupDefaultStages() {
        // Video processing stages
        this.stages.set('video', [
            { name: 'validation', label: 'Validating video file', weight: 5 },
            { name: 'metadata_extraction', label: 'Extracting metadata', weight: 10 },
            { name: 'thumbnail_generation', label: 'Generating thumbnails', weight: 25 },
            { name: 'quality_analysis', label: 'Analyzing video quality', weight: 15 },
            { name: 'ocr_processing', label: 'Extracting text content', weight: 30 },
            { name: 'database_storage', label: 'Storing results', weight: 10 },
            { name: 'cleanup', label: 'Cleaning up temporary files', weight: 5 }
        ]);

        // Audio processing stages
        this.stages.set('audio', [
            { name: 'validation', label: 'Validating audio file', weight: 5 },
            { name: 'metadata_extraction', label: 'Extracting metadata', weight: 10 },
            { name: 'transcription', label: 'Transcribing audio content', weight: 40 },
            { name: 'speaker_analysis', label: 'Analyzing speakers', weight: 20 },
            { name: 'sentiment_analysis', label: 'Analyzing sentiment', weight: 10 },
            { name: 'quality_analysis', label: 'Analyzing audio quality', weight: 10 },
            { name: 'database_storage', label: 'Storing results', weight: 5 }
        ]);

        // Image processing stages
        this.stages.set('image', [
            { name: 'validation', label: 'Validating image file', weight: 5 },
            { name: 'metadata_extraction', label: 'Extracting metadata', weight: 8 },
            { name: 'thumbnail_generation', label: 'Generating thumbnails', weight: 12 },
            { name: 'object_detection', label: 'Detecting objects', weight: 20 },
            { name: 'ocr_processing', label: 'Extracting text content', weight: 15 },
            { name: 'ai_description', label: 'Generating AI description', weight: 15 },
            { name: 'tag_generation', label: 'Generating content tags', weight: 10 },
            { name: 'title_generation', label: 'Creating sophisticated title', weight: 10 },
            { name: 'quality_analysis', label: 'Analyzing image quality', weight: 3 },
            { name: 'database_storage', label: 'Storing results', weight: 2 }
        ]);
    }

    /**
     * Create a new progress tracking job
     */
    createJob(jobId, mediaType, metadata = {}) {
        const stages = this.stages.get(mediaType) || [];
        const totalWeight = stages.reduce((sum, stage) => sum + stage.weight, 0);
        
        const job = {
            id: jobId,
            mediaType,
            startTime: Date.now(),
            endTime: null,
            status: 'started',
            currentStage: null,
            currentStageIndex: -1,
            progress: {
                overall: 0,
                stage: 0
            },
            stages: stages.map((stage, index) => ({
                ...stage,
                index,
                status: 'pending', // pending, active, completed, failed, skipped
                startTime: null,
                endTime: null,
                progress: 0,
                details: null,
                error: null
            })),
            totalWeight,
            metadata: {
                filename: metadata.filename || 'Unknown',
                fileSize: metadata.fileSize || 0,
                duration: metadata.duration || 0,
                ...metadata
            },
            performance: {
                processingSpeed: 0, // MB/s or operations/s
                estimatedTimeRemaining: null,
                averageStageTime: 0,
                totalDataProcessed: 0
            },
            warnings: [],
            errors: []
        };

        this.jobs.set(jobId, job);
        this.initializeMetrics(jobId);
        
        this.emit('jobCreated', { jobId, job: this.getJobSummary(jobId) });
        return job;
    }

    /**
     * Start a processing stage
     */
    startStage(jobId, stageName, details = {}) {
        const job = this.jobs.get(jobId);
        if (!job) {
            throw new Error(`Job ${jobId} not found`);
        }

        // Find the stage
        const stageIndex = job.stages.findIndex(s => s.name === stageName);
        if (stageIndex === -1) {
            throw new Error(`Stage ${stageName} not found for job ${jobId}`);
        }

        const stage = job.stages[stageIndex];
        
        // Complete previous stage if active
        if (job.currentStage && job.currentStageIndex >= 0) {
            this.completeStage(jobId, job.currentStage.name);
        }

        // Start new stage
        stage.status = 'active';
        stage.startTime = Date.now();
        stage.details = details;
        stage.progress = 0;

        job.currentStage = stage;
        job.currentStageIndex = stageIndex;
        job.status = 'processing';

        this.updateProgress(jobId);
        this.emit('stageStarted', { 
            jobId, 
            stageName, 
            stageIndex, 
            details,
            job: this.getJobSummary(jobId) 
        });
    }

    /**
     * Update progress within a stage
     */
    updateStageProgress(jobId, stageName, progress, details = {}) {
        const job = this.jobs.get(jobId);
        if (!job) return;

        const stage = job.stages.find(s => s.name === stageName);
        if (!stage || stage.status !== 'active') return;

        stage.progress = Math.max(0, Math.min(100, progress));
        stage.details = { ...stage.details, ...details };

        this.updateProgress(jobId);
        this.updatePerformanceMetrics(jobId);
        
        this.emit('stageProgress', { 
            jobId, 
            stageName, 
            progress, 
            details,
            overallProgress: job.progress.overall 
        });
    }

    /**
     * Complete a processing stage
     */
    completeStage(jobId, stageName, result = {}) {
        const job = this.jobs.get(jobId);
        if (!job) return;

        const stage = job.stages.find(s => s.name === stageName);
        if (!stage) return;

        stage.status = 'completed';
        stage.endTime = Date.now();
        stage.progress = 100;
        stage.details = { ...stage.details, result };

        this.updateProgress(jobId);
        this.updatePerformanceMetrics(jobId);
        
        this.emit('stageCompleted', { 
            jobId, 
            stageName, 
            result,
            duration: stage.endTime - stage.startTime,
            job: this.getJobSummary(jobId) 
        });

        // Check if all stages are complete
        const allCompleted = job.stages.every(s => 
            s.status === 'completed' || s.status === 'skipped'
        );

        if (allCompleted) {
            this.completeJob(jobId);
        }
    }

    /**
     * Fail a processing stage
     */
    failStage(jobId, stageName, error) {
        const job = this.jobs.get(jobId);
        if (!job) return;

        const stage = job.stages.find(s => s.name === stageName);
        if (!stage) return;

        stage.status = 'failed';
        stage.endTime = Date.now();
        stage.error = {
            message: error.message || error,
            timestamp: Date.now(),
            stack: error.stack
        };

        job.errors.push({
            stage: stageName,
            error: error.message || error,
            timestamp: Date.now()
        });

        this.updateProgress(jobId);
        
        this.emit('stageFailed', { 
            jobId, 
            stageName, 
            error: error.message || error,
            job: this.getJobSummary(jobId) 
        });
    }

    /**
     * Skip a processing stage
     */
    skipStage(jobId, stageName, reason = 'Feature disabled') {
        const job = this.jobs.get(jobId);
        if (!job) return;

        const stage = job.stages.find(s => s.name === stageName);
        if (!stage) return;

        stage.status = 'skipped';
        stage.endTime = Date.now();
        stage.details = { reason };

        this.updateProgress(jobId);
        
        this.emit('stageSkipped', { 
            jobId, 
            stageName, 
            reason,
            job: this.getJobSummary(jobId) 
        });
    }

    /**
     * Add warning to job
     */
    addWarning(jobId, warning, stageName = null) {
        const job = this.jobs.get(jobId);
        if (!job) return;

        job.warnings.push({
            message: warning,
            stage: stageName,
            timestamp: Date.now()
        });

        this.emit('jobWarning', { jobId, warning, stageName });
    }

    /**
     * Complete entire job
     */
    completeJob(jobId, result = {}) {
        const job = this.jobs.get(jobId);
        if (!job) return;

        job.status = 'completed';
        job.endTime = Date.now();
        job.progress.overall = 100;
        job.progress.stage = 100;

        const duration = job.endTime - job.startTime;
        this.updateFinalMetrics(jobId, duration);

        this.emit('jobCompleted', { 
            jobId, 
            result,
            duration,
            job: this.getJobSummary(jobId) 
        });
    }

    /**
     * Fail entire job
     */
    failJob(jobId, error) {
        const job = this.jobs.get(jobId);
        if (!job) return;

        job.status = 'failed';
        job.endTime = Date.now();
        job.errors.push({
            stage: 'job',
            error: error.message || error,
            timestamp: Date.now()
        });

        this.emit('jobFailed', { 
            jobId, 
            error: error.message || error,
            job: this.getJobSummary(jobId) 
        });
    }

    /**
     * Update overall progress calculation
     */
    updateProgress(jobId) {
        const job = this.jobs.get(jobId);
        if (!job) return;

        let completedWeight = 0;
        let currentStageWeight = 0;
        let currentStageProgress = 0;

        for (const stage of job.stages) {
            if (stage.status === 'completed' || stage.status === 'skipped') {
                completedWeight += stage.weight;
            } else if (stage.status === 'active') {
                currentStageWeight = stage.weight;
                currentStageProgress = stage.progress;
                break;
            }
        }

        // Calculate overall progress
        const progressFromCompleted = (completedWeight / job.totalWeight) * 100;
        const progressFromCurrent = (currentStageWeight * currentStageProgress / 100) / job.totalWeight * 100;
        
        job.progress.overall = Math.min(100, progressFromCompleted + progressFromCurrent);
        job.progress.stage = currentStageProgress;
    }

    /**
     * Update performance metrics
     */
    updatePerformanceMetrics(jobId) {
        const job = this.jobs.get(jobId);
        if (!job) return;

        const now = Date.now();
        const elapsed = now - job.startTime;
        
        // Calculate processing speed
        if (job.metadata.fileSize > 0 && elapsed > 0) {
            const bytesPerMs = job.metadata.fileSize / elapsed;
            job.performance.processingSpeed = bytesPerMs * 1000; // bytes per second
        }

        // Calculate average stage time
        const completedStages = job.stages.filter(s => s.status === 'completed');
        if (completedStages.length > 0) {
            const totalStageTime = completedStages.reduce((sum, stage) => 
                sum + (stage.endTime - stage.startTime), 0
            );
            job.performance.averageStageTime = totalStageTime / completedStages.length;
        }

        // Estimate time remaining
        if (job.progress.overall > 0) {
            const timePerPercent = elapsed / job.progress.overall;
            job.performance.estimatedTimeRemaining = timePerPercent * (100 - job.progress.overall);
        }
    }

    /**
     * Update final metrics when job completes
     */
    updateFinalMetrics(jobId, duration) {
        const job = this.jobs.get(jobId);
        if (!job) return;

        // Store metrics for analytics
        const metrics = this.metrics.get(jobId) || {};
        metrics.totalDuration = duration;
        metrics.successfulStages = job.stages.filter(s => s.status === 'completed').length;
        metrics.failedStages = job.stages.filter(s => s.status === 'failed').length;
        metrics.skippedStages = job.stages.filter(s => s.status === 'skipped').length;
        metrics.warningCount = job.warnings.length;
        metrics.errorCount = job.errors.length;
        
        this.metrics.set(jobId, metrics);
    }

    /**
     * Initialize metrics tracking for a job
     */
    initializeMetrics(jobId) {
        this.metrics.set(jobId, {
            startTime: Date.now(),
            stageTimings: {},
            resourceUsage: {},
            throughput: 0
        });
    }

    /**
     * Get job progress summary
     */
    getJobSummary(jobId) {
        const job = this.jobs.get(jobId);
        if (!job) return null;

        return {
            id: job.id,
            mediaType: job.mediaType,
            status: job.status,
            progress: job.progress,
            currentStage: job.currentStage ? {
                name: job.currentStage.name,
                label: job.currentStage.label,
                progress: job.currentStage.progress
            } : null,
            startTime: job.startTime,
            endTime: job.endTime,
            duration: job.endTime ? job.endTime - job.startTime : Date.now() - job.startTime,
            performance: job.performance,
            warnings: job.warnings.length,
            errors: job.errors.length,
            metadata: {
                filename: job.metadata.filename,
                fileSize: job.metadata.fileSize
            }
        };
    }

    /**
     * Get detailed job information
     */
    getJobDetails(jobId) {
        const job = this.jobs.get(jobId);
        if (!job) return null;

        return {
            ...job,
            metrics: this.metrics.get(jobId)
        };
    }

    /**
     * Get progress for multiple jobs
     */
    getMultipleJobProgress(jobIds) {
        return jobIds.map(id => this.getJobSummary(id)).filter(Boolean);
    }

    /**
     * Get all active jobs
     */
    getActiveJobs() {
        const activeJobs = [];
        for (const [jobId, job] of this.jobs) {
            if (job.status === 'processing' || job.status === 'started') {
                activeJobs.push(this.getJobSummary(jobId));
            }
        }
        return activeJobs;
    }

    /**
     * Subscribe to job progress updates
     */
    subscribeToJob(jobId, callback) {
        if (!this.subscribers.has(jobId)) {
            this.subscribers.set(jobId, new Set());
        }
        this.subscribers.get(jobId).add(callback);

        // Send current state immediately
        const summary = this.getJobSummary(jobId);
        if (summary) {
            callback(summary);
        }

        // Return unsubscribe function
        return () => {
            const subs = this.subscribers.get(jobId);
            if (subs) {
                subs.delete(callback);
                if (subs.size === 0) {
                    this.subscribers.delete(jobId);
                }
            }
        };
    }

    /**
     * Subscribe to all progress updates
     */
    subscribeToAll(callback) {
        this.on('jobCreated', callback);
        this.on('stageStarted', callback);
        this.on('stageProgress', callback);
        this.on('stageCompleted', callback);
        this.on('stageFailed', callback);
        this.on('stageSkipped', callback);
        this.on('jobCompleted', callback);
        this.on('jobFailed', callback);
        this.on('jobWarning', callback);

        // Return unsubscribe function
        return () => {
            this.removeListener('jobCreated', callback);
            this.removeListener('stageStarted', callback);
            this.removeListener('stageProgress', callback);
            this.removeListener('stageCompleted', callback);
            this.removeListener('stageFailed', callback);
            this.removeListener('stageSkipped', callback);
            this.removeListener('jobCompleted', callback);
            this.removeListener('jobFailed', callback);
            this.removeListener('jobWarning', callback);
        };
    }

    /**
     * Get processing statistics
     */
    getStatistics() {
        const stats = {
            totalJobs: this.jobs.size,
            activeJobs: 0,
            completedJobs: 0,
            failedJobs: 0,
            averageDuration: 0,
            totalProcessingTime: 0,
            byMediaType: {},
            recentJobs: []
        };

        const durations = [];
        const now = Date.now();

        for (const [jobId, job] of this.jobs) {
            // Count by status
            if (job.status === 'processing' || job.status === 'started') {
                stats.activeJobs++;
            } else if (job.status === 'completed') {
                stats.completedJobs++;
            } else if (job.status === 'failed') {
                stats.failedJobs++;
            }

            // Collect durations
            const duration = job.endTime ? job.endTime - job.startTime : now - job.startTime;
            durations.push(duration);
            stats.totalProcessingTime += duration;

            // Count by media type
            if (!stats.byMediaType[job.mediaType]) {
                stats.byMediaType[job.mediaType] = {
                    total: 0,
                    completed: 0,
                    failed: 0,
                    averageDuration: 0
                };
            }
            stats.byMediaType[job.mediaType].total++;
            if (job.status === 'completed') {
                stats.byMediaType[job.mediaType].completed++;
            } else if (job.status === 'failed') {
                stats.byMediaType[job.mediaType].failed++;
            }

            // Recent jobs (last 24 hours)
            if (now - job.startTime < 86400000) {
                stats.recentJobs.push(this.getJobSummary(jobId));
            }
        }

        // Calculate averages
        if (durations.length > 0) {
            stats.averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
        }

        // Calculate media type averages
        for (const [type, typeStats] of Object.entries(stats.byMediaType)) {
            const typeJobs = Array.from(this.jobs.values()).filter(j => j.mediaType === type);
            const typeDurations = typeJobs
                .filter(j => j.endTime)
                .map(j => j.endTime - j.startTime);
            
            if (typeDurations.length > 0) {
                typeStats.averageDuration = typeDurations.reduce((a, b) => a + b, 0) / typeDurations.length;
            }
        }

        return stats;
    }

    /**
     * Clean up old completed jobs
     */
    cleanup() {
        const cutoff = Date.now() - this.cleanupInterval;
        const toDelete = [];

        for (const [jobId, job] of this.jobs) {
            // Clean up jobs that finished more than 5 minutes ago
            if (job.endTime && job.endTime < cutoff) {
                toDelete.push(jobId);
            }
            // Clean up very old jobs that might be stuck
            else if (!job.endTime && job.startTime < cutoff - 3600000) { // 1 hour
                toDelete.push(jobId);
            }
        }

        for (const jobId of toDelete) {
            this.jobs.delete(jobId);
            this.metrics.delete(jobId);
            this.subscribers.delete(jobId);
        }

        if (toDelete.length > 0) {
            this.emit('jobsCleanedUp', { count: toDelete.length, jobIds: toDelete });
        }
    }

    /**
     * Start cleanup timer
     */
    startCleanupTimer() {
        setInterval(() => {
            this.cleanup();
        }, this.cleanupInterval);
    }

    /**
     * Remove a specific job
     */
    removeJob(jobId) {
        const deleted = this.jobs.delete(jobId);
        this.metrics.delete(jobId);
        this.subscribers.delete(jobId);
        
        if (deleted) {
            this.emit('jobRemoved', { jobId });
        }
        
        return deleted;
    }

    /**
     * Cancel a running job
     */
    cancelJob(jobId, reason = 'Cancelled by user') {
        const job = this.jobs.get(jobId);
        if (!job) return false;

        job.status = 'cancelled';
        job.endTime = Date.now();
        
        // Mark current stage as failed
        if (job.currentStage && job.currentStage.status === 'active') {
            job.currentStage.status = 'failed';
            job.currentStage.endTime = Date.now();
            job.currentStage.error = { message: reason, timestamp: Date.now() };
        }

        this.emit('jobCancelled', { jobId, reason, job: this.getJobSummary(jobId) });
        return true;
    }
}

module.exports = ProgressTracker; 