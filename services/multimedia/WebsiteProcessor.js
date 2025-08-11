/**
 * WebsiteProcessor Plugin
 * 
 * Handles general website content processing including web scraping, embedded media detection,
 * content analysis, and AI-powered summarization for business websites and general web content.
 * Extends BaseMediaProcessor for standardized interface compliance.
 * 
 * Features:
 * - Web content scraping and text extraction
 * - Embedded media detection (videos, images, audio)
 * - Meta tag extraction (title, description, keywords)
 * - Social media link detection
 * - AI-powered content analysis and summarization
 * - Screenshot capture for visual analysis
 * 
 * @author DaySave Integration Team
 * @version 1.0.0
 */

const BaseMediaProcessor = require('./BaseMediaProcessor');
const cheerio = require('cheerio');
const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const AiUsageTracker = require('../aiUsageTracker');

class WebsiteProcessor extends BaseMediaProcessor {
    constructor() {
        super();
        this.name = 'WebsiteProcessor';
        this.supportedTypes = ['website', 'webpage', 'html'];
        
        // Lazy initialization flags
        this.initializationPromise = null;
        this.isInitialized = false;
        
        // Configuration
        this.config = {
            maxContentLength: 50000, // Maximum characters to extract
            maxImageCount: 10, // Maximum images to analyze
            maxVideoCount: 5, // Maximum videos to detect
            timeout: 30000, // 30 seconds timeout
            userAgent: 'DaySave-WebProcessor/1.0 (Content Analysis Bot)'
        };
        
        // Initialize Google AI
        if (process.env.GOOGLE_AI_API_KEY) {
            this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
            this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        } else {
            console.warn('WebsiteProcessor: Google AI API key not found. Website analysis will be limited.');
        }

        // Initialize AI usage tracker
        this.aiUsageTracker = new AiUsageTracker();
    }

    /**
     * Ensure WebsiteProcessor is initialized (lazy initialization)
     */
    async ensureInitialized(options = {}) {
        if (this.isInitialized) return;
        if (this.initializationPromise) return this.initializationPromise;
        
        this.initializationPromise = this.initialize(options);
        await this.initializationPromise;
        this.isInitialized = true;
    }

    /**
     * Initialize the WebsiteProcessor
     */
    async initialize(options = {}) {
        try {
            // Initialize any required components
            if (!this.genAI && process.env.GOOGLE_AI_API_KEY) {
                this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
                this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            }
            
            // Set processing capabilities
            this.capabilities = {
                contentExtraction: true,
                metaDataExtraction: true,
                embeddedMediaDetection: true,
                contentAnalysis: !!this.genAI,
                summarization: !!this.genAI,
                titleGeneration: !!this.genAI,
                tagGeneration: !!this.genAI,
                screenshotCapture: false // Future feature
            };
            
            this.initialized = true;
            console.log(`🌐 ${this.name} initialized successfully`);
        } catch (error) {
            console.error(`❌ Failed to initialize ${this.name}:`, error);
            throw error;
        }
    }

    /**
     * Get supported content types
     */
    getSupportedTypes() {
        return ['website', 'webpage', 'html', 'url'];
    }

    /**
     * Get processor capabilities
     */
    getCapabilities() {
        return {
            contentExtraction: true,
            metaDataExtraction: true,
            embeddedMediaDetection: true,
            contentAnalysis: !!this.genAI,
            summarization: !!this.genAI,
            titleGeneration: !!this.genAI,
            tagGeneration: !!this.genAI
        };
    }

    /**
     * Check if URL is a general website (not a specific multimedia platform)
     * @param {string} url - URL to check
     * @returns {boolean} True if it's a general website
     */
    isWebsiteUrl(url) {
        try {
            const urlObj = new URL(url);
            
            // Exclude known multimedia platforms
            const multimediaDomains = [
                'youtube.com', 'youtu.be',
                'instagram.com', 'tiktok.com',
                'facebook.com', 'fb.com',
                'twitter.com', 'x.com',
                'vimeo.com', 'dailymotion.com',
                'soundcloud.com', 'spotify.com',
                'imgur.com', 'flickr.com'
            ];
            
            const domain = urlObj.hostname.toLowerCase().replace('www.', '');
            const isMultimediaPlatform = multimediaDomains.some(md => domain.includes(md));
            
            // Check if it's a direct media file
            const mediaExtensions = /\.(mp4|avi|mov|mp3|wav|jpg|jpeg|png|gif|pdf)$/i;
            const isDirectMedia = mediaExtensions.test(urlObj.pathname);
            
            return !isMultimediaPlatform && !isDirectMedia;
        } catch (error) {
            return false;
        }
    }

    /**
     * Report progress in the format expected by the WebSocket service
     * @param {number} percentage - Progress percentage (0-100)
     * @param {string} stage - Current processing stage
     * @param {string} message - Progress message
     */
    reportProgress(percentage, stage, message) {
        if (this.progressCallback && typeof this.progressCallback === 'function') {
            this.progressCallback({
                percentage,
                stage,
                message,
                timestamp: new Date().toISOString()
            });
        }
        
        // Also call the base class method for logging
        this.updateProgress(percentage, stage, message);
    }

    /**
     * Process website URL for content analysis
     * @param {string} userId - User ID
     * @param {string} url - Website URL to process
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} Processing result
     */
    async process(userId, url, options = {}) {
        try {
            await this.ensureInitialized();
            
            // Set up progress callback for this processing session
            this.progressCallback = options.progressCallback || null;
            
            if (this.enableLogging) {
                console.log(`🌐 Processing website: ${url}`);
            }
            
            // Update progress
            this.reportProgress(5, 'initialization', 'Starting website analysis');
            
            // Validate URL
            if (!this.isWebsiteUrl(url)) {
                throw new Error('URL is not a general website or is a multimedia platform');
            }
            
            // Fetch and parse website content
            this.reportProgress(15, 'fetching', 'Fetching website content');
            const htmlContent = await this.fetchWebsiteContent(url);
            
            this.reportProgress(25, 'parsing', 'Parsing HTML content');
            const $ = cheerio.load(htmlContent);
            
            // Extract various content types
            this.reportProgress(35, 'extraction', 'Extracting website metadata');
            const websiteData = await this.extractWebsiteData($, url);
            
            this.reportProgress(50, 'media_detection', 'Detecting embedded media');
            const embeddedMedia = await this.detectEmbeddedMedia($, url);
            
            this.reportProgress(65, 'content_analysis', 'Analyzing content');
            const contentAnalysis = await this.analyzeContent(websiteData, options);
            
            this.reportProgress(85, 'ai_processing', 'Generating AI insights');
            const aiInsights = await this.generateAIInsights(websiteData, options);
            
            this.reportProgress(100, 'completion', 'Website analysis complete');
            
            const result = {
                success: true,
                type: 'website',
                url,
                timestamp: new Date().toISOString(),
                metadata: {
                    title: websiteData.title,
                    description: websiteData.description,
                    keywords: websiteData.keywords,
                    contentLength: websiteData.textContent.length,
                    imageCount: embeddedMedia.images.length,
                    videoCount: embeddedMedia.videos.length,
                    linkCount: websiteData.links.length
                },
                content: {
                    textContent: websiteData.textContent,
                    headings: websiteData.headings,
                    links: websiteData.links,
                    images: embeddedMedia.images,
                    videos: embeddedMedia.videos,
                    socialLinks: websiteData.socialLinks
                },
                analysis: contentAnalysis,
                aiInsights: aiInsights,
                platform: 'website',
                processingTime: Date.now() - (options.startTime || Date.now())
            };
            
            if (this.enableLogging) {
                console.log(`✅ Website processing completed: ${url}`);
            }
            
            return result;
            
        } catch (error) {
            if (this.enableLogging) {
                console.error(`❌ Website processing failed: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Fetch website HTML content
     * @param {string} url - Website URL
     * @returns {Promise<string>} HTML content
     */
    async fetchWebsiteContent(url) {
        try {
            const response = await fetch(url, {
                timeout: this.config.timeout,
                headers: {
                    'User-Agent': this.config.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive'
                },
                follow: 3, // Follow up to 3 redirects
                size: 5 * 1024 * 1024 // 5MB max response size
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('text/html')) {
                throw new Error(`Invalid content type: ${contentType}`);
            }
            
            return await response.text();
            
        } catch (error) {
            throw new Error(`Failed to fetch website content: ${error.message}`);
        }
    }

    /**
     * Extract website data and metadata
     * @param {Object} $ - Cheerio instance
     * @param {string} url - Website URL
     * @returns {Promise<Object>} Extracted website data
     */
    async extractWebsiteData($, url) {
        const websiteData = {
            title: '',
            description: '',
            keywords: [],
            textContent: '',
            headings: [],
            links: [],
            socialLinks: []
        };
        
        // Extract title
        websiteData.title = $('title').first().text().trim() || 
                           $('meta[property="og:title"]').attr('content') || 
                           $('h1').first().text().trim() ||
                           'Untitled Website';
        
        // Extract description
        websiteData.description = $('meta[name="description"]').attr('content') ||
                                 $('meta[property="og:description"]').attr('content') ||
                                 $('meta[name="twitter:description"]').attr('content') ||
                                 '';
        
        // Extract keywords
        const keywordsContent = $('meta[name="keywords"]').attr('content');
        if (keywordsContent) {
            websiteData.keywords = keywordsContent.split(',').map(k => k.trim()).filter(k => k);
        }
        
        // Extract text content (remove scripts, styles, etc.)
        $('script, style, nav, footer, .advertisement, .ads').remove();
        websiteData.textContent = $('body').text().replace(/\s+/g, ' ').trim();
        
        // Limit content length
        if (websiteData.textContent.length > this.config.maxContentLength) {
            websiteData.textContent = websiteData.textContent.substring(0, this.config.maxContentLength) + '...';
        }
        
        // Extract headings
        $('h1, h2, h3, h4, h5, h6').each((i, elem) => {
            const text = $(elem).text().trim();
            if (text) {
                websiteData.headings.push({
                    level: elem.tagName.toLowerCase(),
                    text: text
                });
            }
        });
        
        // Extract links
        $('a[href]').each((i, elem) => {
            const href = $(elem).attr('href');
            const text = $(elem).text().trim();
            if (href && text) {
                try {
                    const absoluteUrl = new URL(href, url).href;
                    websiteData.links.push({
                        url: absoluteUrl,
                        text: text,
                        internal: new URL(absoluteUrl).hostname === new URL(url).hostname
                    });
                } catch (e) {
                    // Skip invalid URLs
                }
            }
        });
        
        // Extract social media links
        const socialPatterns = {
            facebook: /facebook\.com/i,
            instagram: /instagram\.com/i,
            twitter: /twitter\.com|x\.com/i,
            linkedin: /linkedin\.com/i,
            youtube: /youtube\.com/i,
            tiktok: /tiktok\.com/i
        };
        
        websiteData.links.forEach(link => {
            for (const [platform, pattern] of Object.entries(socialPatterns)) {
                if (pattern.test(link.url)) {
                    websiteData.socialLinks.push({
                        platform,
                        url: link.url,
                        text: link.text
                    });
                    break;
                }
            }
        });
        
        return websiteData;
    }

    /**
     * Detect embedded media content
     * @param {Object} $ - Cheerio instance
     * @param {string} url - Website URL
     * @returns {Promise<Object>} Detected media content
     */
    async detectEmbeddedMedia($, url) {
        const embeddedMedia = {
            images: [],
            videos: [],
            audio: []
        };
        
        // Extract images
        $('img[src]').each((i, elem) => {
            if (i >= this.config.maxImageCount) return false;
            
            const src = $(elem).attr('src');
            const alt = $(elem).attr('alt') || '';
            const title = $(elem).attr('title') || '';
            
            if (src) {
                try {
                    const absoluteUrl = new URL(src, url).href;
                    embeddedMedia.images.push({
                        url: absoluteUrl,
                        alt,
                        title
                    });
                } catch (e) {
                    // Skip invalid URLs
                }
            }
        });
        
        // Extract videos
        $('video, iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="dailymotion"]').each((i, elem) => {
            if (i >= this.config.maxVideoCount) return false;
            
            const tagName = elem.tagName.toLowerCase();
            let videoData = { type: tagName };
            
            if (tagName === 'video') {
                const src = $(elem).attr('src') || $(elem).find('source').first().attr('src');
                if (src) {
                    videoData.url = new URL(src, url).href;
                    videoData.poster = $(elem).attr('poster');
                }
            } else if (tagName === 'iframe') {
                const src = $(elem).attr('src');
                if (src) {
                    videoData.url = src;
                    videoData.embedded = true;
                    
                    // Detect platform
                    if (src.includes('youtube')) videoData.platform = 'youtube';
                    else if (src.includes('vimeo')) videoData.platform = 'vimeo';
                    else if (src.includes('dailymotion')) videoData.platform = 'dailymotion';
                }
            }
            
            if (videoData.url) {
                embeddedMedia.videos.push(videoData);
            }
        });
        
        return embeddedMedia;
    }

    /**
     * Analyze website content
     * @param {Object} websiteData - Extracted website data
     * @param {Object} options - Analysis options
     * @returns {Promise<Object>} Content analysis results
     */
    async analyzeContent(websiteData, options = {}) {
        const analysis = {
            contentType: 'website',
            wordCount: websiteData.textContent.split(/\s+/).length,
            readingTime: Math.ceil(websiteData.textContent.split(/\s+/).length / 200), // Average reading speed
            hasEmbeddedMedia: false,
            businessType: 'unknown',
            topics: [],
            sentiment: 'neutral'
        };
        
        // Check for embedded media
        analysis.hasEmbeddedMedia = websiteData.links.some(link => 
            /\.(mp4|avi|mov|mp3|wav|jpg|jpeg|png|gif)$/i.test(link.url)
        ) || /video|audio|player|media/i.test(websiteData.textContent);
        
        // Simple business type detection
        const businessKeywords = {
            academy: /academy|school|education|training|learning|classes/i,
            fitness: /fitness|gym|workout|exercise|sports|movement/i,
            restaurant: /restaurant|cafe|food|dining|menu|cuisine/i,
            medical: /medical|doctor|health|clinic|hospital|therapy/i,
            retail: /shop|store|buy|product|sale|commerce/i,
            service: /service|consulting|professional|business|company/i
        };
        
        for (const [type, pattern] of Object.entries(businessKeywords)) {
            if (pattern.test(websiteData.textContent)) {
                analysis.businessType = type;
                break;
            }
        }
        
        return analysis;
    }

    /**
     * Generate AI insights for website content
     * @param {Object} websiteData - Website data
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} AI-generated insights
     */
    async generateAIInsights(websiteData, options = {}) {
        if (!this.genAI) {
            return {
                summary: 'AI analysis not available - Google AI API key required',
                tags: ['website'],
                categories: ['general'],
                suggestedTitle: websiteData.title
            };
        }
        
        try {
            const prompt = `Analyze this website content and provide insights:
            
Title: ${websiteData.title}
Description: ${websiteData.description}
Content: ${websiteData.textContent.substring(0, 2000)}...

Please provide:
1. A concise summary (2-3 sentences)
2. 5-7 relevant tags
3. 2-3 categories
4. An improved title if needed

Respond in JSON format with keys: summary, tags, categories, suggestedTitle`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            // Track AI usage
            if (this.aiUsageTracker && this.aiUsageTracker.trackGoogleAIUsage) {
                try {
                    await this.aiUsageTracker.trackGoogleAIUsage({
                        userId: options.user_id || 'system',
                        response: response, // Pass the actual API response
                        model: 'gemini-1.5-flash',
                        operationType: 'text_analysis',
                        contentId: options.content_id
                    });
                } catch (trackingError) {
                    console.warn('AI usage tracking failed:', trackingError.message);
                }
            }
            
            // Parse JSON response
            try {
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const insights = JSON.parse(jsonMatch[0]);
                    return {
                        summary: insights.summary || 'Website content analysis completed',
                        tags: Array.isArray(insights.tags) ? insights.tags : ['website'],
                        categories: Array.isArray(insights.categories) ? insights.categories : ['general'],
                        suggestedTitle: insights.suggestedTitle || websiteData.title
                    };
                }
            } catch (parseError) {
                console.warn('Failed to parse AI response as JSON, using fallback');
            }
            
            // Fallback if JSON parsing fails
            return {
                summary: text.substring(0, 300),
                tags: ['website', 'content'],
                categories: ['general'],
                suggestedTitle: websiteData.title
            };
            
        } catch (error) {
            console.error('AI insight generation failed:', error);
            return {
                summary: 'AI analysis failed - using basic content detection',
                tags: ['website'],
                categories: ['general'],
                suggestedTitle: websiteData.title
            };
        }
    }

    /**
     * Clean up resources
     */
    async cleanup() {
        // No specific cleanup needed for WebsiteProcessor
        return true;
    }

    /**
     * Validate processing requirements
     */
    async validate() {
        return {
            valid: true,
            requirements: {
                internetAccess: true,
                googleAI: !!this.genAI
            }
        };
    }
}

module.exports = WebsiteProcessor;
