/**
 * ResultFormatter - Unified result formatting for multimedia processing
 * Converts processor results to consistent UI-ready format
 */

class ResultFormatter {
    constructor() {
        this.formatters = new Map();
        this.uiTemplates = new Map();
        this.displayConfig = new Map();
        this.initialized = false;
    }

    /**
     * Initialize the result formatter with all format handlers
     */
    async initialize() {
        if (this.initialized) return;

        // Register format handlers for each media type
        this.registerFormatHandlers();
        
        // Setup UI templates
        this.setupUITemplates();
        
        // Configure display settings
        this.setupDisplayConfig();
        
        this.initialized = true;
    }

    /**
     * Register format handlers for different media types
     */
    registerFormatHandlers() {
        // Video result formatter
        this.formatters.set('video', {
            formatCore: (results) => ({
                type: 'video',
                duration: results.metadata?.duration || 0,
                resolution: results.metadata?.resolution || 'Unknown',
                size: results.metadata?.size || 0,
                format: results.metadata?.format || 'Unknown',
                bitrate: results.metadata?.bitrate || 0,
                frameRate: results.metadata?.frameRate || 0,
                aspectRatio: results.metadata?.aspectRatio || 'Unknown'
            }),
            formatThumbnails: (thumbnails) => {
                if (!thumbnails || !Array.isArray(thumbnails)) return [];
                
                return thumbnails.map(thumb => ({
                    id: thumb.id,
                    size: thumb.size || 'medium',
                    width: thumb.width,
                    height: thumb.height,
                    url: thumb.url || thumb.path,
                    timestamp: thumb.timestamp || 0,
                    fileSize: thumb.fileSize || 0,
                    mimeType: thumb.mimeType || 'image/jpeg'
                }));
            },
            formatOCR: (ocrData) => {
                if (!ocrData || !Array.isArray(ocrData)) return [];
                
                return ocrData.map(caption => ({
                    id: caption.id,
                    text: caption.text || '',
                    confidence: caption.confidence || 0,
                    timestamp: caption.timestamp || 0,
                    boundingBox: caption.boundingBox || null,
                    language: caption.language || 'en'
                }));
            },
            formatQuality: (quality) => ({
                overall: quality?.overall || 'unknown',
                score: quality?.score || 0,
                issues: quality?.issues || [],
                recommendations: quality?.recommendations || [],
                metrics: {
                    bitrate: quality?.bitrate || { score: 0, status: 'unknown' },
                    resolution: quality?.resolution || { score: 0, status: 'unknown' },
                    frameRate: quality?.frameRate || { score: 0, status: 'unknown' }
                }
            })
        });

        // Audio result formatter
        this.formatters.set('audio', {
            formatCore: (results) => ({
                type: 'audio',
                duration: results.metadata?.duration || 0,
                size: results.metadata?.size || 0,
                format: results.metadata?.format || 'Unknown',
                bitrate: results.metadata?.bitrate || 0,
                sampleRate: results.metadata?.sampleRate || 0,
                channels: results.metadata?.channels || 0,
                codec: results.metadata?.codec || 'Unknown'
            }),
            formatTranscription: (transcription) => {
                if (!transcription || !Array.isArray(transcription)) return null;
                
                return {
                    fullText: transcription.map(t => t.transcript).join(' '),
                    segments: transcription.map((segment, index) => ({
                        id: index,
                        text: segment.transcript || '',
                        confidence: segment.confidence || 0,
                        startTime: segment.startTime || 0,
                        endTime: segment.endTime || 0,
                        words: segment.words || []
                    })),
                    statistics: {
                        totalWords: transcription.reduce((count, seg) => count + (seg.words?.length || 0), 0),
                        averageConfidence: transcription.reduce((sum, seg) => sum + (seg.confidence || 0), 0) / transcription.length,
                        duration: Math.max(...transcription.map(seg => seg.endTime || 0))
                    }
                };
            },
            formatSpeakers: (speakers) => {
                if (!speakers || !Array.isArray(speakers)) return [];
                
                return speakers.map(speaker => ({
                    id: speaker.id,
                    name: speaker.name || `Speaker ${speaker.id}`,
                    confidence: speaker.confidence || 0,
                    voicePrintId: speaker.voicePrintId || null,
                    segments: speaker.segments || [],
                    totalDuration: speaker.totalDuration || 0,
                    averageConfidence: speaker.averageConfidence || 0
                }));
            },
            formatSentiment: (sentiment) => ({
                overall: sentiment?.overall || 'neutral',
                score: sentiment?.score || 0,
                confidence: sentiment?.confidence || 0,
                segments: sentiment?.segments || [],
                breakdown: {
                    positive: sentiment?.breakdown?.positive || 0,
                    negative: sentiment?.breakdown?.negative || 0,
                    neutral: sentiment?.breakdown?.neutral || 0
                }
            }),
            formatQuality: (quality) => ({
                overall: quality?.overall || 'unknown',
                score: quality?.score || 0,
                issues: quality?.issues || [],
                recommendations: quality?.recommendations || [],
                metrics: {
                    bitrate: quality?.bitrate || { score: 0, status: 'unknown' },
                    sampleRate: quality?.sampleRate || { score: 0, status: 'unknown' },
                    channels: quality?.channels || { score: 0, status: 'unknown' }
                }
            })
        });

        // Image result formatter
        this.formatters.set('image', {
            formatCore: (results) => ({
                type: 'image',
                dimensions: {
                    width: results.metadata?.width || 0,
                    height: results.metadata?.height || 0
                },
                size: results.metadata?.size || 0,
                format: results.metadata?.format || 'Unknown',
                colorSpace: results.metadata?.colorSpace || 'Unknown',
                hasTransparency: results.metadata?.hasTransparency || false,
                dpi: results.metadata?.dpi || 0
            }),
            formatObjects: (objects) => {
                if (!objects || !Array.isArray(objects)) return [];
                
                return objects.map(obj => ({
                    id: obj.id || Math.random().toString(36).substr(2, 9),
                    name: obj.name || obj.label || 'Unknown Object',
                    confidence: obj.confidence || obj.score || 0,
                    boundingBox: obj.boundingBox || obj.bbox || null,
                    category: obj.category || 'general',
                    attributes: obj.attributes || {}
                }));
            },
            formatOCR: (ocrData) => {
                if (!ocrData || !Array.isArray(ocrData)) return null;
                
                const fullText = ocrData.map(text => text.description || text.text).join(' ');
                
                return {
                    fullText,
                    blocks: ocrData.map((block, index) => ({
                        id: index,
                        text: block.description || block.text || '',
                        confidence: block.confidence || 0,
                        boundingBox: block.boundingPoly || block.boundingBox || null,
                        language: block.locale || 'en'
                    })),
                    statistics: {
                        totalCharacters: fullText.length,
                        totalWords: fullText.split(' ').filter(w => w.trim()).length,
                        averageConfidence: ocrData.reduce((sum, block) => sum + (block.confidence || 0), 0) / ocrData.length
                    }
                };
            },
            formatAIDescription: (aiDescription) => ({
                description: aiDescription?.description || aiDescription || '',
                confidence: aiDescription?.confidence || 0,
                tags: aiDescription?.tags || [],
                categories: aiDescription?.categories || [],
                colors: aiDescription?.colors || [],
                emotions: aiDescription?.emotions || []
            }),
            formatThumbnails: (thumbnails) => {
                if (!thumbnails || !Array.isArray(thumbnails)) return [];
                
                return thumbnails.map(thumb => ({
                    id: thumb.id,
                    size: thumb.size || 'medium',
                    width: thumb.width,
                    height: thumb.height,
                    url: thumb.url || thumb.path,
                    fileSize: thumb.fileSize || 0,
                    mimeType: thumb.mimeType || 'image/jpeg'
                }));
            },
            formatQuality: (quality) => ({
                overall: quality?.overall || 'unknown',
                score: quality?.score || 0,
                issues: quality?.issues || [],
                recommendations: quality?.recommendations || [],
                metrics: {
                    resolution: quality?.resolution || { score: 0, status: 'unknown' },
                    sharpness: quality?.sharpness || { score: 0, status: 'unknown' },
                    brightness: quality?.brightness || { score: 0, status: 'unknown' },
                    contrast: quality?.contrast || { score: 0, status: 'unknown' }
                }
            })
        });
    }

    /**
     * Setup UI templates for different display contexts
     */
    setupUITemplates() {
        // Card view template
        this.uiTemplates.set('card', {
            video: {
                title: (data) => `Video (${data.core.duration}s)`,
                subtitle: (data) => `${data.core.resolution} • ${data.core.format}`,
                thumbnail: (data) => data.thumbnails?.[0]?.url,
                badges: (data) => [
                    { text: data.core.format, color: 'primary' },
                    { text: `${Math.round(data.core.duration)}s`, color: 'secondary' }
                ],
                metadata: (data) => [
                    { label: 'Duration', value: `${data.core.duration}s` },
                    { label: 'Resolution', value: data.core.resolution },
                    { label: 'Size', value: this.formatFileSize(data.core.size) }
                ]
            },
            audio: {
                title: (data) => `Audio (${data.core.duration}s)`,
                subtitle: (data) => `${data.core.format} • ${data.core.bitrate} kbps`,
                thumbnail: (data) => '/icons/audio-file.svg',
                badges: (data) => [
                    { text: data.core.format, color: 'primary' },
                    { text: `${Math.round(data.core.duration)}s`, color: 'secondary' },
                    ...(data.transcription ? [{ text: 'Transcribed', color: 'success' }] : [])
                ],
                metadata: (data) => [
                    { label: 'Duration', value: `${data.core.duration}s` },
                    { label: 'Format', value: data.core.format },
                    { label: 'Size', value: this.formatFileSize(data.core.size) }
                ]
            },
            image: {
                title: (data) => `Image (${data.core.dimensions.width}×${data.core.dimensions.height})`,
                subtitle: (data) => `${data.core.format} • ${this.formatFileSize(data.core.size)}`,
                thumbnail: (data) => data.thumbnails?.[0]?.url,
                badges: (data) => [
                    { text: data.core.format, color: 'primary' },
                    ...(data.objects?.length > 0 ? [{ text: `${data.objects.length} objects`, color: 'info' }] : []),
                    ...(data.ocrText ? [{ text: 'Text detected', color: 'warning' }] : [])
                ],
                metadata: (data) => [
                    { label: 'Dimensions', value: `${data.core.dimensions.width}×${data.core.dimensions.height}` },
                    { label: 'Format', value: data.core.format },
                    { label: 'Size', value: this.formatFileSize(data.core.size) }
                ]
            }
        });

        // Detail view template
        this.uiTemplates.set('detail', {
            video: {
                sections: [
                    { name: 'metadata', title: 'Video Information', priority: 1 },
                    { name: 'thumbnails', title: 'Thumbnails', priority: 2 },
                    { name: 'quality', title: 'Quality Analysis', priority: 3 },
                    { name: 'ocr', title: 'Text Content', priority: 4 }
                ]
            },
            audio: {
                sections: [
                    { name: 'metadata', title: 'Audio Information', priority: 1 },
                    { name: 'transcription', title: 'Transcription', priority: 2 },
                    { name: 'speakers', title: 'Speaker Analysis', priority: 3 },
                    { name: 'sentiment', title: 'Sentiment Analysis', priority: 4 },
                    { name: 'quality', title: 'Quality Analysis', priority: 5 }
                ]
            },
            image: {
                sections: [
                    { name: 'metadata', title: 'Image Information', priority: 1 },
                    { name: 'thumbnails', title: 'Thumbnails', priority: 2 },
                    { name: 'aiDescription', title: 'AI Description', priority: 3 },
                    { name: 'objects', title: 'Detected Objects', priority: 4 },
                    { name: 'ocrText', title: 'Extracted Text', priority: 5 },
                    { name: 'quality', title: 'Quality Analysis', priority: 6 }
                ]
            }
        });
    }

    /**
     * Setup display configuration
     */
    setupDisplayConfig() {
        this.displayConfig.set('thumbnails', {
            defaultSize: 'medium',
            maxDisplay: 5,
            lazyLoad: true,
            showMetadata: true
        });

        this.displayConfig.set('transcription', {
            maxPreviewLength: 200,
            showTimestamps: true,
            showConfidence: true,
            highlightLowConfidence: 0.7
        });

        this.displayConfig.set('objects', {
            maxDisplay: 10,
            minConfidence: 0.5,
            showBoundingBoxes: true,
            groupByCategory: true
        });

        this.displayConfig.set('quality', {
            showScore: true,
            showRecommendations: true,
            colorCodeIssues: true
        });
    }

    /**
     * Format processing results for UI display
     */
    async formatForUI(results, mediaType, displayContext = 'card') {
        if (!this.initialized) {
            await this.initialize();
        }

        const formatter = this.formatters.get(mediaType);
        if (!formatter) {
            throw new Error(`No formatter available for media type: ${mediaType}`);
        }

        // Format core data
        const formattedData = {
            mediaType,
            core: formatter.formatCore(results),
            timestamp: new Date().toISOString(),
            displayContext
        };

        // Format type-specific data
        switch (mediaType) {
            case 'video':
                if (results.thumbnails) formattedData.thumbnails = formatter.formatThumbnails(results.thumbnails);
                if (results.ocrCaptions) formattedData.ocr = formatter.formatOCR(results.ocrCaptions);
                if (results.quality) formattedData.quality = formatter.formatQuality(results.quality);
                break;

            case 'audio':
                if (results.transcription) formattedData.transcription = formatter.formatTranscription(results.transcription);
                if (results.speakers) formattedData.speakers = formatter.formatSpeakers(results.speakers);
                if (results.sentiment) formattedData.sentiment = formatter.formatSentiment(results.sentiment);
                if (results.quality) formattedData.quality = formatter.formatQuality(results.quality);
                break;

            case 'image':
                if (results.objects) formattedData.objects = formatter.formatObjects(results.objects);
                if (results.ocrText) formattedData.ocrText = formatter.formatOCR(results.ocrText);
                if (results.aiDescription) formattedData.aiDescription = formatter.formatAIDescription(results.aiDescription);
                if (results.thumbnails) formattedData.thumbnails = formatter.formatThumbnails(results.thumbnails);
                if (results.quality) formattedData.quality = formatter.formatQuality(results.quality);
                break;
        }

        // Add UI template data
        const template = this.uiTemplates.get(displayContext)?.[mediaType];
        if (template) {
            formattedData.ui = this.applyTemplate(formattedData, template);
        }

        return formattedData;
    }

    /**
     * Apply UI template to formatted data
     */
    applyTemplate(data, template) {
        const ui = {};

        // Apply template functions
        for (const [key, func] of Object.entries(template)) {
            if (typeof func === 'function') {
                try {
                    ui[key] = func(data);
                } catch (error) {
                    console.warn(`Template function ${key} failed:`, error);
                    ui[key] = null;
                }
            } else {
                ui[key] = func;
            }
        }

        return ui;
    }

    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    /**
     * Format duration for display
     */
    formatDuration(seconds) {
        if (!seconds || seconds === 0) return '0:00';
        
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Create data export in various formats
     */
    exportData(formattedData, format = 'json') {
        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(formattedData, null, 2);
                
            case 'csv':
                return this.convertToCSV(formattedData);
                
            case 'xml':
                return this.convertToXML(formattedData);
                
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Convert formatted data to CSV
     */
    convertToCSV(data) {
        const rows = [];
        
        // Header row
        rows.push(['Property', 'Value'].join(','));
        
        // Core data
        rows.push(['Media Type', data.mediaType].join(','));
        rows.push(['Timestamp', data.timestamp].join(','));
        
        // Flatten core properties
        for (const [key, value] of Object.entries(data.core)) {
            rows.push([`Core.${key}`, JSON.stringify(value)].join(','));
        }
        
        return rows.join('\n');
    }

    /**
     * Convert formatted data to XML
     */
    convertToXML(data) {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += `<multimedia_result media_type="${data.mediaType}" timestamp="${data.timestamp}">\n`;
        
        xml += this.objectToXML(data, 1);
        
        xml += '</multimedia_result>';
        return xml;
    }

    /**
     * Convert object to XML recursively
     */
    objectToXML(obj, indent = 0) {
        let xml = '';
        const spaces = '  '.repeat(indent);
        
        for (const [key, value] of Object.entries(obj)) {
            if (key === 'mediaType' || key === 'timestamp') continue; // Already in attributes
            
            if (typeof value === 'object' && value !== null) {
                if (Array.isArray(value)) {
                    xml += `${spaces}<${key}>\n`;
                    for (const item of value) {
                        xml += `${spaces}  <item>\n`;
                        xml += this.objectToXML(item, indent + 2);
                        xml += `${spaces}  </item>\n`;
                    }
                    xml += `${spaces}</${key}>\n`;
                } else {
                    xml += `${spaces}<${key}>\n`;
                    xml += this.objectToXML(value, indent + 1);
                    xml += `${spaces}</${key}>\n`;
                }
            } else {
                xml += `${spaces}<${key}>${this.escapeXML(String(value))}</${key}>\n`;
            }
        }
        
        return xml;
    }

    /**
     * Escape XML special characters
     */
    escapeXML(str) {
        return str.replace(/[<>&'"]/g, (char) => {
            switch (char) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case "'": return '&#39;';
                case '"': return '&quot;';
                default: return char;
            }
        });
    }

    /**
     * Validate formatted data structure
     */
    validateFormattedData(data) {
        const errors = [];
        
        if (!data.mediaType) {
            errors.push('Missing mediaType');
        }
        
        if (!data.core) {
            errors.push('Missing core data');
        } else {
            if (!data.core.type) errors.push('Missing core.type');
            if (typeof data.core.size !== 'number') errors.push('Invalid core.size');
        }
        
        if (!data.timestamp) {
            errors.push('Missing timestamp');
        }
        
        return errors;
    }
}

module.exports = ResultFormatter; 