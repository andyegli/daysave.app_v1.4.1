/**
 * ConfigurationManager - Centralized configuration management for multimedia processing
 * Handles processor settings, plugin configurations, and feature toggles
 */

const fs = require('fs').promises;
const path = require('path');

class ConfigurationManager {
    constructor() {
        this.config = new Map();
        this.defaults = new Map();
        this.validators = new Map();
        this.watchers = new Map();
        this.initialized = false;
        this.configPath = process.env.MM_CONFIG_PATH || path.join(__dirname, '../../config/multimedia.json');
    }

    /**
     * Initialize configuration manager with defaults and load configs
     */
    async initialize() {
        if (this.initialized) return;

        // Setup default configurations
        this.setupDefaults();
        
        // Setup validators
        this.setupValidators();
        
        // Load configuration file if exists
        await this.loadConfigFile();
        
        // Apply environment variable overrides
        this.applyEnvironmentOverrides();
        
        this.initialized = true;
    }

    /**
     * Setup default configurations for all processors and plugins
     */
    setupDefaults() {
        // Base processor defaults
        this.defaults.set('base', {
            retryAttempts: 3,
            retryDelay: 1000,
            timeoutMs: 300000, // 5 minutes
            tempDir: process.env.TEMP_DIR || '/tmp/multimedia',
            maxFileSize: 100 * 1024 * 1024, // 100MB
            cleanupTempFiles: true,
            enableProgressTracking: true,
            logLevel: 'info'
        });

        // Video processor defaults
        this.defaults.set('video', {
            ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
            ffprobePath: process.env.FFPROBE_PATH || 'ffprobe',
            maxDuration: 3600, // 1 hour in seconds
            thumbnailSizes: [
                { width: 320, height: 240, name: 'small' },
                { width: 640, height: 480, name: 'medium' },
                { width: 1280, height: 720, name: 'large' }
            ],
            enableOCR: true,
            enableQualityAnalysis: true,
            supportedFormats: ['mp4', 'avi', 'mov', 'webm', 'mkv'],
            outputFormat: 'mp4',
            qualityThresholds: {
                bitrate: { min: 500000, optimal: 2000000 },
                resolution: { min: '480p', optimal: '1080p' },
                framerate: { min: 15, optimal: 30 }
            }
        });

        // Audio processor defaults
        this.defaults.set('audio', {
            maxDuration: 7200, // 2 hours in seconds
            enableTranscription: true,
            enableSpeakerDiarization: true,
            enableVoicePrintMatching: true,
            enableSentimentAnalysis: true,
            supportedFormats: ['mp3', 'wav', 'flac', 'webm', 'm4a', 'ogg'],
            transcriptionLanguage: 'en-US',
            qualityThresholds: {
                bitrate: { min: 64000, optimal: 192000 },
                sampleRate: { min: 16000, optimal: 44100 }
            },
            voicePrint: {
                enabled: true,
                confidenceThreshold: 0.8,
                maxSpeakers: 10
            }
        });

        // Image processor defaults
        this.defaults.set('image', {
            maxDimensions: { width: 4096, height: 4096 },
            enableObjectDetection: true,
            enableOCR: true,
            enableAIDescription: true,
            enableQualityAnalysis: true,
            supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff'],
            thumbnailSizes: [
                { width: 150, height: 150, name: 'thumbnail' },
                { width: 300, height: 300, name: 'small' },
                { width: 600, height: 600, name: 'medium' },
                { width: 1200, height: 1200, name: 'large' }
            ],
            qualityThresholds: {
                minResolution: 100, // 100x100 pixels
                maxFileSize: 50 * 1024 * 1024, // 50MB
                acceptableFormats: ['jpg', 'jpeg', 'png', 'webp']
            },
            aiDescription: {
                maxTokens: 500,
                prompt: 'Describe this image in detail, including objects, text, colors, and notable features.'
            }
        });

        // Document processor defaults
        this.defaults.set('document', {
            maxFileSize: 100 * 1024 * 1024, // 100MB
            enableTextExtraction: true,
            enableAIAnalysis: true,
            enableSummaryGeneration: true,
            enableTagGeneration: true,
            enableTitleGeneration: true,
            supportedFormats: ['pdf', 'doc', 'docx', 'txt', 'rtf'],
            textExtraction: {
                maxTextLength: 50000, // Characters
                encoding: 'utf8',
                preserveFormatting: false
            },
            aiAnalysis: {
                maxTokens: 1000,
                summaryLength: 300, // Characters
                maxTags: 5,
                titleMaxLength: 100
            },
            qualityThresholds: {
                minTextLength: 10, // Characters
                maxFileSize: 100 * 1024 * 1024, // 100MB
                acceptableFormats: ['pdf', 'docx', 'txt']
            }
        });

        // Plugin system defaults
        this.defaults.set('plugins', {
            google_cloud: {
                enabled: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
                region: process.env.GOOGLE_CLOUD_REGION || 'us-central1',
                timeoutMs: 60000,
                retryAttempts: 2
            },
            openai: {
                enabled: !!process.env.OPENAI_API_KEY,
                baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
                timeoutMs: 60000,
                retryAttempts: 2,
                defaultModel: 'gpt-4-vision-preview',
                whisperModel: 'whisper-1'
            },
            fallback: {
                enableAutomaticFallback: true,
                fallbackTimeout: 30000,
                maxFallbackAttempts: 3
            }
        });

        // Performance and optimization defaults
        this.defaults.set('performance', {
            concurrentProcessing: {
                maxConcurrentJobs: 3,
                maxConcurrentPerType: 2,
                queueTimeout: 600000 // 10 minutes
            },
            caching: {
                enableResultCaching: true,
                cacheTimeout: 3600000, // 1 hour
                maxCacheSize: 1000
            },
            monitoring: {
                enableMetrics: true,
                enablePerformanceLogs: true,
                logSlowOperations: true,
                slowOperationThreshold: 10000 // 10 seconds
            }
        });

        // Database integration defaults
        this.defaults.set('database', {
            batchSize: 100,
            connectionTimeout: 30000,
            enableTransactions: true,
            enableAuditLogs: true,
            retentionPeriod: 90 // days
        });
    }

    /**
     * Setup configuration validators
     */
    setupValidators() {
        this.validators.set('base.retryAttempts', (value) => {
            return Number.isInteger(value) && value >= 0 && value <= 10;
        });

        this.validators.set('base.timeoutMs', (value) => {
            return Number.isInteger(value) && value > 0 && value <= 1800000; // Max 30 minutes
        });

        this.validators.set('video.maxDuration', (value) => {
            return Number.isInteger(value) && value > 0 && value <= 7200; // Max 2 hours
        });

        this.validators.set('audio.maxDuration', (value) => {
            return Number.isInteger(value) && value > 0 && value <= 14400; // Max 4 hours
        });

        this.validators.set('image.maxDimensions', (value) => {
            return value && 
                   Number.isInteger(value.width) && value.width > 0 && value.width <= 8192 &&
                   Number.isInteger(value.height) && value.height > 0 && value.height <= 8192;
        });

        this.validators.set('performance.concurrentProcessing.maxConcurrentJobs', (value) => {
            return Number.isInteger(value) && value > 0 && value <= 10;
        });
    }

    /**
     * Load configuration from file
     */
    async loadConfigFile() {
        try {
            const configData = await fs.readFile(this.configPath, 'utf8');
            const fileConfig = JSON.parse(configData);
            
            // Merge file config with defaults
            for (const [section, values] of Object.entries(fileConfig)) {
                this.mergeConfig(section, values);
            }
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.warn(`Failed to load config file: ${error.message}`);
            }
        }
    }

    /**
     * Apply environment variable overrides
     */
    applyEnvironmentOverrides() {
        // Base configuration overrides
        this.applyEnvOverride('base.retryAttempts', 'MM_RETRY_ATTEMPTS', parseInt);
        this.applyEnvOverride('base.timeoutMs', 'MM_TIMEOUT_MS', parseInt);
        this.applyEnvOverride('base.tempDir', 'MM_TEMP_DIR');
        this.applyEnvOverride('base.maxFileSize', 'MM_MAX_FILE_SIZE', parseInt);

        // Video configuration overrides
        this.applyEnvOverride('video.ffmpegPath', 'FFMPEG_PATH');
        this.applyEnvOverride('video.maxDuration', 'MM_VIDEO_MAX_DURATION', parseInt);
        this.applyEnvOverride('video.enableOCR', 'MM_VIDEO_ENABLE_OCR', this.parseBoolean);

        // Audio configuration overrides
        this.applyEnvOverride('audio.maxDuration', 'MM_AUDIO_MAX_DURATION', parseInt);
        this.applyEnvOverride('audio.transcriptionLanguage', 'MM_TRANSCRIPTION_LANGUAGE');
        this.applyEnvOverride('audio.enableTranscription', 'MM_ENABLE_TRANSCRIPTION', this.parseBoolean);

        // Image configuration overrides
        this.applyEnvOverride('image.enableAIDescription', 'MM_ENABLE_AI_DESCRIPTION', this.parseBoolean);
        this.applyEnvOverride('image.enableObjectDetection', 'MM_ENABLE_OBJECT_DETECTION', this.parseBoolean);

        // Plugin configuration overrides
        this.applyEnvOverride('plugins.google_cloud.enabled', 'MM_GOOGLE_CLOUD_ENABLED', this.parseBoolean);
        this.applyEnvOverride('plugins.openai.enabled', 'MM_OPENAI_ENABLED', this.parseBoolean);
        this.applyEnvOverride('plugins.openai.defaultModel', 'MM_OPENAI_MODEL');

        // Performance configuration overrides
        this.applyEnvOverride('performance.concurrentProcessing.maxConcurrentJobs', 'MM_MAX_CONCURRENT_JOBS', parseInt);
        this.applyEnvOverride('performance.caching.enableResultCaching', 'MM_ENABLE_CACHING', this.parseBoolean);
    }

    /**
     * Apply a single environment variable override
     */
    applyEnvOverride(configPath, envVar, transformer = (x) => x) {
        const envValue = process.env[envVar];
        if (envValue !== undefined) {
            try {
                const transformedValue = transformer(envValue);
                this.setConfig(configPath, transformedValue);
            } catch (error) {
                console.warn(`Invalid environment variable ${envVar}: ${error.message}`);
            }
        }
    }

    /**
     * Parse boolean from string
     */
    parseBoolean(value) {
        const lowerValue = value.toLowerCase();
        if (['true', '1', 'yes', 'on'].includes(lowerValue)) return true;
        if (['false', '0', 'no', 'off'].includes(lowerValue)) return false;
        throw new Error(`Invalid boolean value: ${value}`);
    }

    /**
     * Merge configuration section with existing
     */
    mergeConfig(section, values) {
        const existing = this.config.get(section) || this.defaults.get(section) || {};
        const merged = this.deepMerge(existing, values);
        this.config.set(section, merged);
    }

    /**
     * Deep merge two objects
     */
    deepMerge(target, source) {
        const result = { ...target };
        
        for (const [key, value] of Object.entries(source)) {
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                result[key] = this.deepMerge(result[key] || {}, value);
            } else {
                result[key] = value;
            }
        }
        
        return result;
    }

    /**
     * Get configuration value
     */
    getConfig(path, defaultValue = undefined) {
        const parts = path.split('.');
        const section = parts[0];
        const configData = this.config.get(section) || this.defaults.get(section) || {};
        
        let current = configData;
        for (let i = 1; i < parts.length; i++) {
            if (current && typeof current === 'object') {
                current = current[parts[i]];
            } else {
                return defaultValue;
            }
        }
        
        return current !== undefined ? current : defaultValue;
    }

    /**
     * Set configuration value with validation
     */
    setConfig(path, value) {
        const validator = this.validators.get(path);
        if (validator && !validator(value)) {
            throw new Error(`Invalid configuration value for ${path}: ${value}`);
        }

        const parts = path.split('.');
        const section = parts[0];
        const existing = this.config.get(section) || this.defaults.get(section) || {};
        
        // Navigate to the parent object
        let current = existing;
        for (let i = 1; i < parts.length - 1; i++) {
            if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
                current[parts[i]] = {};
            }
            current = current[parts[i]];
        }
        
        // Set the value
        current[parts[parts.length - 1]] = value;
        this.config.set(section, existing);
    }

    /**
     * Get processor-specific configuration
     */
    getProcessorConfig(processorType) {
        const baseConfig = this.getConfig('base', {});
        const processorConfig = this.getConfig(processorType, {});
        return this.deepMerge(baseConfig, processorConfig);
    }

    /**
     * Get plugin configuration
     */
    getPluginConfig(pluginName) {
        return this.getConfig(`plugins.${pluginName}`, {});
    }

    /**
     * Check if a feature is enabled
     */
    isFeatureEnabled(feature) {
        const value = this.getConfig(feature);
        return value === true || value === 'true' || value === 1;
    }

    /**
     * Get performance configuration
     */
    getPerformanceConfig() {
        return this.getConfig('performance', {});
    }

    /**
     * Save configuration to file
     */
    async saveConfig() {
        try {
            const configObject = {};
            for (const [section, values] of this.config) {
                configObject[section] = values;
            }
            
            await fs.writeFile(this.configPath, JSON.stringify(configObject, null, 2));
        } catch (error) {
            throw new Error(`Failed to save configuration: ${error.message}`);
        }
    }

    /**
     * Validate all configurations
     */
    validateConfig() {
        const errors = [];
        
        for (const [path, validator] of this.validators) {
            const value = this.getConfig(path);
            if (value !== undefined && !validator(value)) {
                errors.push(`Invalid configuration for ${path}: ${value}`);
            }
        }
        
        return errors;
    }

    /**
     * Get configuration summary
     */
    getConfigSummary() {
        return {
            base: this.getConfig('base'),
            video: this.getConfig('video'),
            audio: this.getConfig('audio'),
            image: this.getConfig('image'),
            plugins: this.getConfig('plugins'),
            performance: this.getConfig('performance'),
            database: this.getConfig('database')
        };
    }

    /**
     * Watch for configuration changes
     */
    watchConfig(path, callback) {
        if (!this.watchers.has(path)) {
            this.watchers.set(path, new Set());
        }
        this.watchers.get(path).add(callback);
    }

    /**
     * Notify watchers of configuration changes
     */
    notifyWatchers(path, newValue, oldValue) {
        const watchers = this.watchers.get(path);
        if (watchers) {
            for (const callback of watchers) {
                try {
                    callback(newValue, oldValue, path);
                } catch (error) {
                    console.error(`Configuration watcher error for ${path}:`, error);
                }
            }
        }
    }

    /**
     * Reset configuration to defaults
     */
    resetToDefaults() {
        this.config.clear();
        for (const [section, values] of this.defaults) {
            this.config.set(section, { ...values });
        }
    }
}

module.exports = ConfigurationManager; 