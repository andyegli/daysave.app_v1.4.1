/**
 * PluginRegistry - Dynamic plugin management system for multimedia processing
 * Handles registration, discovery, and execution of optional features with fallbacks
 */

class PluginRegistry {
    constructor() {
        this.plugins = new Map();
        this.categories = new Map();
        this.providers = new Map();
        this.fallbackChains = new Map();
        this.enabledFeatures = new Set();
        this.initialized = false;
    }

    /**
     * Initialize the plugin registry with available features
     */
    async initialize() {
        if (this.initialized) return;

        // Define plugin categories
        this.categories.set('transcription', new Set());
        this.categories.set('object_detection', new Set());
        this.categories.set('ocr', new Set());
        this.categories.set('image_analysis', new Set());
        this.categories.set('audio_analysis', new Set());
        this.categories.set('video_analysis', new Set());
        this.categories.set('translation', new Set());
        this.categories.set('sentiment', new Set());

        // Register core plugins
        await this.registerCorePlugins();
        
        // Test plugin availability
        await this.testPluginAvailability();
        
        this.initialized = true;
    }

    /**
     * Register a plugin with the registry
     */
    registerPlugin(name, config) {
        const plugin = {
            name,
            category: config.category,
            provider: config.provider,
            priority: config.priority || 100,
            enabled: config.enabled !== false,
            dependencies: config.dependencies || [],
            initialize: config.initialize,
            execute: config.execute,
            test: config.test,
            cleanup: config.cleanup,
            capabilities: config.capabilities || [],
            supportedFormats: config.supportedFormats || [],
            metadata: config.metadata || {}
        };

        this.plugins.set(name, plugin);
        
        // Add to category
        if (!this.categories.has(plugin.category)) {
            this.categories.set(plugin.category, new Set());
        }
        this.categories.get(plugin.category).add(name);

        // Track provider
        if (!this.providers.has(plugin.provider)) {
            this.providers.set(plugin.provider, new Set());
        }
        this.providers.get(plugin.provider).add(name);

        return plugin;
    }

    /**
     * Register core multimedia processing plugins
     */
    async registerCorePlugins() {
        // Google Cloud Speech-to-Text
        this.registerPlugin('google_speech_to_text', {
            category: 'transcription',
            provider: 'google_cloud',
            priority: 10,
            dependencies: ['GOOGLE_APPLICATION_CREDENTIALS'],
            capabilities: ['speaker_diarization', 'multi_language', 'streaming'],
            supportedFormats: ['mp3', 'wav', 'flac', 'webm'],
            initialize: async () => {
                try {
                    const speech = require('@google-cloud/speech');
                    return new speech.SpeechClient();
                } catch (error) {
                    throw new Error(`Google Speech client initialization failed: ${error.message}`);
                }
            },
            execute: async (client, audioBuffer, options = {}) => {
                const request = {
                    audio: { content: audioBuffer.toString('base64') },
                    config: {
                        encoding: options.encoding || 'MP3',
                        sampleRateHertz: options.sampleRate || 16000,
                        languageCode: options.language || 'en-US',
                        enableSpeakerDiarization: options.enableDiarization || true,
                        diarizationSpeakerCount: options.speakerCount || 2,
                        enableAutomaticPunctuation: true,
                        enableWordTimeOffsets: true
                    }
                };

                const [response] = await client.recognize(request);
                return response.results?.map(result => ({
                    transcript: result.alternatives[0].transcript,
                    confidence: result.alternatives[0].confidence,
                    words: result.alternatives[0].words || []
                })) || [];
            },
            test: async (client) => {
                // Simple test to verify client is working
                return client && typeof client.recognize === 'function';
            }
        });

        // OpenAI Whisper (Fallback for transcription)
        this.registerPlugin('openai_whisper', {
            category: 'transcription',
            provider: 'openai',
            priority: 20,
            dependencies: ['OPENAI_API_KEY'],
            capabilities: ['multi_language', 'translation', 'sentiment'],
            supportedFormats: ['mp3', 'wav', 'flac', 'webm', 'm4a'],
            initialize: async () => {
                const { OpenAI } = require('openai');
                return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            },
            execute: async (client, audioFile, options = {}) => {
                const transcription = await client.audio.transcriptions.create({
                    file: audioFile,
                    model: options.model || 'whisper-1',
                    language: options.language,
                    response_format: 'verbose_json',
                    timestamp_granularities: ['word']
                });

                return [{
                    transcript: transcription.text,
                    confidence: 0.9, // Whisper doesn't provide confidence scores
                    words: transcription.words || []
                }];
            },
            test: async (client) => {
                return client && typeof client.audio?.transcriptions?.create === 'function';
            }
        });

        // Google Vision API
        this.registerPlugin('google_vision', {
            category: 'object_detection',
            provider: 'google_cloud',
            priority: 10,
            dependencies: ['GOOGLE_APPLICATION_CREDENTIALS'],
            capabilities: ['object_detection', 'face_detection', 'text_detection', 'label_detection'],
            supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
            initialize: async () => {
                const vision = require('@google-cloud/vision');
                return new vision.ImageAnnotatorClient();
            },
            execute: async (client, imageBuffer, options = {}) => {
                const features = options.features || [
                    { type: 'OBJECT_LOCALIZATION' },
                    { type: 'LABEL_DETECTION' },
                    { type: 'TEXT_DETECTION' },
                    { type: 'FACE_DETECTION' }
                ];

                const request = {
                    image: { content: imageBuffer },
                    features: features
                };

                const [result] = await client.annotateImage(request);
                return {
                    objects: result.localizedObjectAnnotations || [],
                    labels: result.labelAnnotations || [],
                    texts: result.textAnnotations || [],
                    faces: result.faceAnnotations || []
                };
            },
            test: async (client) => {
                return client && typeof client.annotateImage === 'function';
            }
        });

        // OpenAI Vision (Fallback for image analysis)
        this.registerPlugin('openai_vision', {
            category: 'image_analysis',
            provider: 'openai',
            priority: 20,
            dependencies: ['OPENAI_API_KEY'],
            capabilities: ['description', 'object_detection', 'text_reading'],
            supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            initialize: async () => {
                const { OpenAI } = require('openai');
                return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            },
            execute: async (client, imageBuffer, options = {}) => {
                const base64Image = imageBuffer.toString('base64');
                const response = await client.chat.completions.create({
                    model: options.model || 'gpt-4-vision-preview',
                    messages: [{
                        role: 'user',
                        content: [
                            { 
                                type: 'text', 
                                text: options.prompt || 'Describe this image in detail, including objects, text, and notable features.'
                            },
                            {
                                type: 'image_url',
                                image_url: { url: `data:image/jpeg;base64,${base64Image}` }
                            }
                        ]
                    }],
                    max_tokens: options.maxTokens || 500
                });

                return {
                    description: response.choices[0].message.content,
                    confidence: 0.85 // Approximate confidence for GPT-4 Vision
                };
            },
            test: async (client) => {
                return client && typeof client.chat?.completions?.create === 'function';
            }
        });

        // Setup fallback chains
        this.setupFallbackChains();
    }

    /**
     * Setup fallback chains for plugin categories
     */
    setupFallbackChains() {
        this.fallbackChains.set('transcription', [
            'google_speech_to_text',
            'openai_whisper'
        ]);

        this.fallbackChains.set('image_analysis', [
            'google_vision',
            'openai_vision'
        ]);

        this.fallbackChains.set('object_detection', [
            'google_vision',
            'openai_vision'
        ]);
    }

    /**
     * Test availability of all registered plugins
     */
    async testPluginAvailability() {
        for (const [name, plugin] of this.plugins) {
            try {
                // Check dependencies
                const hasAllDeps = plugin.dependencies.every(dep => 
                    process.env[dep] && process.env[dep].trim() !== ''
                );

                if (!hasAllDeps) {
                    plugin.enabled = false;
                    plugin.disabledReason = 'Missing required environment variables';
                    continue;
                }

                // Test plugin initialization
                if (plugin.initialize && plugin.test) {
                    const client = await plugin.initialize();
                    const isWorking = await plugin.test(client);
                    
                    if (!isWorking) {
                        plugin.enabled = false;
                        plugin.disabledReason = 'Plugin test failed';
                    } else {
                        this.enabledFeatures.add(name);
                    }
                }
            } catch (error) {
                plugin.enabled = false;
                plugin.disabledReason = `Initialization error: ${error.message}`;
            }
        }
    }

    /**
     * Execute a plugin with automatic fallback
     */
    async executeWithFallback(category, input, options = {}) {
        const fallbackChain = this.fallbackChains.get(category) || [];
        const categoryPlugins = this.categories.get(category) || new Set();
        
        // Combine fallback chain with other category plugins
        const pluginsToTry = [
            ...fallbackChain,
            ...Array.from(categoryPlugins).filter(p => !fallbackChain.includes(p))
        ].filter(name => {
            const plugin = this.plugins.get(name);
            return plugin && plugin.enabled;
        });

        if (pluginsToTry.length === 0) {
            throw new Error(`No available plugins for category: ${category}`);
        }

        let lastError = null;
        
        for (const pluginName of pluginsToTry) {
            try {
                const plugin = this.plugins.get(pluginName);
                const client = await plugin.initialize();
                const result = await plugin.execute(client, input, options);
                
                // Add metadata about which plugin was used
                return {
                    result,
                    plugin: pluginName,
                    provider: plugin.provider,
                    fallbackUsed: pluginName !== pluginsToTry[0]
                };
            } catch (error) {
                lastError = error;
                console.warn(`Plugin ${pluginName} failed, trying next fallback:`, error.message);
                continue;
            }
        }

        throw new Error(`All plugins failed for category ${category}. Last error: ${lastError?.message}`);
    }

    /**
     * Get available plugins for a category
     */
    getAvailablePlugins(category) {
        const categoryPlugins = this.categories.get(category) || new Set();
        return Array.from(categoryPlugins)
            .map(name => this.plugins.get(name))
            .filter(plugin => plugin && plugin.enabled)
            .sort((a, b) => a.priority - b.priority);
    }

    /**
     * Check if a feature is available
     */
    isFeatureAvailable(category) {
        return this.getAvailablePlugins(category).length > 0;
    }

    /**
     * Get plugin status report
     */
    getStatusReport() {
        const report = {
            totalPlugins: this.plugins.size,
            enabledPlugins: this.enabledFeatures.size,
            categories: {},
            providers: {},
            disabledPlugins: []
        };

        // Category status
        for (const [category, plugins] of this.categories) {
            const availableCount = Array.from(plugins)
                .filter(name => this.plugins.get(name)?.enabled)
                .length;
            
            report.categories[category] = {
                total: plugins.size,
                available: availableCount,
                status: availableCount > 0 ? 'available' : 'unavailable'
            };
        }

        // Provider status
        for (const [provider, plugins] of this.providers) {
            const availableCount = Array.from(plugins)
                .filter(name => this.plugins.get(name)?.enabled)
                .length;
            
            report.providers[provider] = {
                total: plugins.size,
                available: availableCount
            };
        }

        // Disabled plugins
        for (const [name, plugin] of this.plugins) {
            if (!plugin.enabled) {
                report.disabledPlugins.push({
                    name,
                    category: plugin.category,
                    provider: plugin.provider,
                    reason: plugin.disabledReason
                });
            }
        }

        return report;
    }

    /**
     * Enable/disable a plugin
     */
    setPluginEnabled(name, enabled) {
        const plugin = this.plugins.get(name);
        if (plugin) {
            plugin.enabled = enabled;
            if (enabled) {
                this.enabledFeatures.add(name);
                delete plugin.disabledReason;
            } else {
                this.enabledFeatures.delete(name);
                plugin.disabledReason = 'Manually disabled';
            }
        }
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        for (const [name, plugin] of this.plugins) {
            if (plugin.cleanup && plugin.enabled) {
                try {
                    await plugin.cleanup();
                } catch (error) {
                    console.warn(`Cleanup failed for plugin ${name}:`, error.message);
                }
            }
        }
    }
}

module.exports = PluginRegistry; 