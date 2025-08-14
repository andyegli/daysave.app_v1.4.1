/**
 * ImageProcessor Service
 * 
 * Handles image-specific processing operations including object detection,
 * OCR text extraction, description generation, and quality analysis.
 * Extends BaseMediaProcessor for standardized interface compliance.
 * 
 * Features:
 * - Object detection using Google Vision AI and OpenAI Vision
 * - OCR text extraction from images
 * - AI-powered image description generation
 * - Thumbnail generation and optimization
 * - Image quality assessment and enhancement
 * - Content categorization and tagging
 * 
 * @author DaySave Integration Team
 * @version 2.0.0
 */

const vision = require('@google-cloud/vision');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// DaySave models
const { Thumbnail } = require('../../models');

// Import the proper ThumbnailGenerator service
const ThumbnailGenerator = require('./ThumbnailGenerator');

// Base processor
const BaseMediaProcessor = require('./BaseMediaProcessor');

// AI Usage Tracker
const AiUsageTracker = require('../aiUsageTracker');

/**
 * ImageProcessor Class
 * 
 * Extends BaseMediaProcessor to handle image-specific processing operations
 */
class ImageProcessor extends BaseMediaProcessor {
  /**
   * Initialize the ImageProcessor service
   * 
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    // Call parent constructor
    super(options);
    
    // Initialize ThumbnailGenerator service
    this.thumbnailGenerator = new ThumbnailGenerator({
      thumbnailDir: 'uploads/thumbnails',
      enableLogging: this.enableLogging
    });

    // Initialize AI usage tracker
    this.aiUsageTracker = new AiUsageTracker();
    
    // Image-specific configuration
    this.config = {
      ...this.config, // Inherit base config
      supportedImageFormats: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.tiff'],
      thumbnailDir: 'uploads/thumbnails',
      objectDetectionOptions: {
        confidenceThreshold: 0.5,
        maxObjects: 50,
        enableFaceDetection: true,
        enableLandmarkDetection: true
      },
      ocrOptions: {
        confidenceThreshold: 0.5,
        enableTextDetection: true,
        enableHandwritingDetection: true,
        languageHints: ['en']
      },
      thumbnailOptions: {
        sizes: [150, 300, 500, 800],
        quality: 85,
        format: 'jpeg'
      },
      qualityOptions: {
        minWidth: 100,
        minHeight: 100,
        maxWidth: 8192,
        maxHeight: 8192,
        maxFileSize: 50 * 1024 * 1024 // 50MB
      }
    };
    
    // Initialize image-specific services
    this.initialize(options);
  }

  /**
   * Initialize processor-specific clients and services
   * 
   * @param {Object} options - Initialization options
   * @returns {Promise<void>}
   */
  async initialize(options = {}) {
    try {
      // Initialize Google Vision client for object detection and OCR
      await this.initializeVisionClient(options);
      
      // Ensure image-specific directories exist
      this.ensureImageDirectories();
      
      if (this.enableLogging) {
        console.log('🖼️ ImageProcessor initialization completed');
      }
    } catch (error) {
      if (this.enableLogging) {
        console.error('❌ ImageProcessor initialization failed:', error);
      }
      throw error;
    }
  }

  /**
   * Process image content
   * 
   * @param {string} userId - User ID
   * @param {string} filePath - Path to the image file
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing results
   */
  async process(userId, filePath, options = {}) {
    const results = this.initializeResults(userId, filePath, 'image');
    
    console.log(`🔧 DEBUG: ImageProcessor.process() received options:`, JSON.stringify(options, null, 2));
    console.log(`🔧 DEBUG: AI Analysis options:`, {
      enableObjectDetection: options.enableObjectDetection,
      enableDescriptionGeneration: options.enableDescriptionGeneration,
      enableOCRExtraction: options.enableOCRExtraction,
      enableTagGeneration: options.enableTagGeneration
    });
    
    try {
      // Validate image file
      await this.validate(filePath, 'image');
      
      this.updateProgress(10, 'Starting image processing');
      
      // Extract image metadata
      const metadata = await this.getImageMetadata(filePath);
      results.metadata.image = metadata;
      this.updateProgress(20, 'Image metadata extracted');

      // Object detection (if enabled)
      if (options.enableObjectDetection) {
        console.log(`🔍 DEBUG: Starting object detection...`);
        try {
          const objects = await this.detectObjects(filePath, options.objectDetectionOptions || this.config.objectDetectionOptions);
          console.log(`🔍 DEBUG: Object detection completed - found ${objects.length} objects:`, objects);
          results.results.objects = objects;
          this.updateProgress(40, `Found ${objects.length} objects`);
        } catch (error) {
          console.log(`❌ DEBUG: Object detection failed:`, error);
          this.addWarning(results, 'Failed to detect objects', 'object_detection');
        }
      } else {
        console.log(`⚠️ DEBUG: Object detection skipped - enableObjectDetection: ${options.enableObjectDetection}`);
      }

      // OCR text extraction (if enabled)
      if (options.enableOCRExtraction) {
        try {
          const ocrText = await this.extractImageText(filePath, options.ocrOptions || this.config.ocrOptions);
          results.results.ocrText = ocrText;
          this.updateProgress(60, `Extracted ${ocrText.length} characters of text`);
        } catch (error) {
          this.addWarning(results, 'Failed to extract text', 'ocr_extraction');
        }
      }

      // Generate comprehensive image description (if enabled)
      if (options.enableDescriptionGeneration && this.openai) {
        console.log(`🤖 DEBUG: Starting AI description generation...`);
        console.log(`🤖 DEBUG: OpenAI client available:`, !!this.openai);
        try {
          const description = await this.generateImageDescription(filePath, {
            objects: results.results.objects,
            ocrText: results.results.ocrText
          });
          console.log(`🤖 DEBUG: AI description generated:`, description);
          results.results.description = description;
          results.results.transcription = description; // For consistency with other content types
          this.updateProgress(75, 'Image description generated');
        } catch (error) {
          console.log(`❌ DEBUG: AI description generation failed:`, error);
          this.addWarning(results, 'Failed to generate description', 'description_generation');
        }
      } else {
        console.log(`⚠️ DEBUG: AI description skipped - enableDescriptionGeneration: ${options.enableDescriptionGeneration}, openai: ${!!this.openai}`);
      }

      // Generate thumbnails (if enabled)
      if (options.enableThumbnailGeneration) {
        try {
          const thumbnails = await this.generateImageThumbnails(
            userId,
            filePath,
            options.thumbnailOptions || this.config.thumbnailOptions
          );
          results.results.thumbnails = thumbnails;
          this.updateProgress(85, 'Thumbnails generated');
        } catch (error) {
          this.addWarning(results, 'Failed to generate thumbnails', 'thumbnail_generation');
        }
      }

      // Analyze image quality (if enabled)
      if (options.enableQualityAnalysis) {
        try {
          const qualityAnalysis = await this.analyzeImageQuality(filePath);
          results.results.qualityAnalysis = qualityAnalysis;
          this.updateProgress(90, 'Image quality analyzed');
        } catch (error) {
          this.addWarning(results, 'Failed to analyze image quality', 'quality_analysis');
        }
      }

      // Generate content tags (if enabled and description available)
      if (options.enableTagGeneration && this.openai && results.results.description) {
        console.log(`🏷️ DEBUG: Starting tag generation...`);
        try {
          const tags = await this.generateContentTags({
            objects: results.results.objects,
            description: results.results.description,
            ocrText: results.results.ocrText
          });
          console.log(`🏷️ DEBUG: Tags generated:`, tags);
          results.results.tags = tags;
          this.updateProgress(90, 'Content tags generated');
        } catch (error) {
          console.log(`❌ DEBUG: Tag generation failed:`, error);
          this.addWarning(results, 'Failed to generate tags', 'tag_generation');
        }
      } else {
        console.log(`⚠️ DEBUG: Tag generation skipped - enableTagGeneration: ${options.enableTagGeneration}, openai: ${!!this.openai}, description: ${!!results.results.description}`);
      }

      // ✨ Generate sophisticated AI title (if enabled and description available)
      if (options.enableTitleGeneration && this.openai && results.results.description) {
        console.log(`🎯 DEBUG: Starting sophisticated AI title generation...`);
        try {
          const generatedTitle = await this.generateSophisticatedTitle({
            description: results.results.description,
            objects: results.results.objects,
            tags: results.results.tags,
            ocrText: results.results.ocrText,
            userId: userId,
            fileId: options.fileId || null,
            contentId: options.contentId || null,
            processingJobId: options.processingJobId || null,
            sessionId: options.sessionId || null
          });
          console.log(`🎯 DEBUG: Sophisticated title generated:`, generatedTitle);
          results.results.generatedTitle = generatedTitle;
          this.updateProgress(95, 'AI title generated');
        } catch (error) {
          console.log(`❌ DEBUG: Sophisticated title generation failed:`, error);
          this.addWarning(results, 'Failed to generate AI title', 'title_generation');
        }
      } else {
        console.log(`⚠️ DEBUG: Sophisticated title generation skipped - enableTitleGeneration: ${options.enableTitleGeneration}, openai: ${!!this.openai}, description: ${!!results.results.description}`);
      }

      this.updateProgress(100, 'Image processing completed');
      
      console.log(`🔧 DEBUG: Final ImageProcessor results:`, {
        hasObjects: !!results.results.objects,
        objectCount: results.results.objects?.length || 0,
        hasDescription: !!results.results.description,
        descriptionLength: results.results.description?.length || 0,
        hasTags: !!results.results.tags,
        tagCount: results.results.tags?.length || 0,
        hasOcrText: !!results.results.ocrText,
        ocrTextLength: results.results.ocrText?.length || 0,
        resultKeys: Object.keys(results.results)
      });
      
      return this.finalizeResults(results);

    } catch (error) {
      this.addError(results, error, 'image_processing');
      return this.finalizeResults(results);
    }
  }

  /**
   * Validate image file
   * 
   * @param {string} filePath - Path to the image file
   * @param {string} fileType - MIME type of the file
   * @returns {Promise<boolean>} Validation result
   */
  async validate(filePath, fileType) {
    try {
      // Basic file validation from parent
      this.validateFile(filePath);
      
      // Image-specific validation
      const extension = path.extname(filePath).toLowerCase();
      if (!this.config.supportedImageFormats.includes(extension)) {
        throw new Error(`Unsupported image format: ${extension}`);
      }
      
      // Check image dimensions and file size
      const metadata = await this.getImageMetadata(filePath);
      if (metadata.width < this.config.qualityOptions.minWidth || 
          metadata.height < this.config.qualityOptions.minHeight) {
        throw new Error(`Image too small: ${metadata.width}x${metadata.height}`);
      }
      
      if (metadata.width > this.config.qualityOptions.maxWidth || 
          metadata.height > this.config.qualityOptions.maxHeight) {
        throw new Error(`Image too large: ${metadata.width}x${metadata.height}`);
      }
      
      if (this.enableLogging) {
        this.log(`Image file validation passed: ${path.basename(filePath)} (${metadata.width}x${metadata.height})`);
      }
      
      return true;
    } catch (error) {
      if (this.enableLogging) {
        console.error(`❌ Image validation failed:`, error);
      }
      throw error;
    }
  }

  /**
   * Cleanup processor resources
   * 
   * @param {string} userId - User ID (optional, for user-specific cleanup)
   * @returns {Promise<void>}
   */
  async cleanup(userId = null) {
    try {
      // Clean up temporary image files
      const tempPattern = path.join(this.config.tempDir, 'imageprocessor_*');
      const thumbnailPattern = path.join(this.config.thumbnailDir, 'temp_*');
      
      // Clean up expired thumbnails
      if (userId) {
        await this.cleanupExpiredThumbnails(userId);
      }
      
      if (this.enableLogging) {
        this.log('Image processor cleanup completed');
      }
    } catch (error) {
      if (this.enableLogging) {
        console.error('❌ Image processor cleanup failed:', error);
      }
    }
  }

  /**
   * Get supported file types
   * 
   * @returns {Array<string>} Array of supported file extensions
   */
  getSupportedTypes() {
    return this.config.supportedImageFormats;
  }

  /**
   * Get processor capabilities
   * 
   * @returns {Object} Processor capabilities and features
   */
  getCapabilities() {
    return {
      processorType: 'image',
      supportedFormats: this.config.supportedImageFormats,
      features: {
        objectDetection: !!this.visionClient || !!this.openai,
        ocrTextExtraction: !!this.visionClient || !!this.openai,
        faceDetection: !!this.visionClient,
        landmarkDetection: !!this.visionClient,
        descriptionGeneration: !!this.openai,
        thumbnailGeneration: true,
        qualityAnalysis: true,
        metadataExtraction: true,
        tagGeneration: !!this.openai,
        titleGeneration: !!this.openai, // ✨ NEW: Sophisticated AI title generation
        formatConversion: false // TODO: Implement
      },
      visionProviders: [
        ...(this.visionClient ? ['google'] : []),
        ...(this.openai ? ['openai'] : [])
      ],
      limits: {
        maxFileSize: this.config.maxFileSize,
        maxWidth: this.config.qualityOptions.maxWidth,
        maxHeight: this.config.qualityOptions.maxHeight,
        maxObjects: this.config.objectDetectionOptions.maxObjects
      },
      outputFormats: {
        thumbnails: ['jpg', 'png', 'webp'],
        descriptions: ['text', 'json'],
        objects: ['json'],
        ocr: ['text', 'json'],
        titles: ['text'] // ✨ NEW: AI-generated titles
      }
    };
  }

  /**
   * Initialize Google Vision client for object detection and OCR
   * @param {Object} options - Configuration options
   */
  async initializeVisionClient(options) {
    try {
      if (options.googleCredentials || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        if (options.googleCredentials) {
          process.env.GOOGLE_APPLICATION_CREDENTIALS = options.googleCredentials;
        }
        
        this.visionClient = new vision.ImageAnnotatorClient();
        
        if (this.enableLogging) {
          this.log('Google Vision client initialized');
        }
      } else if (options.googleApiKey || process.env.GOOGLE_API_KEY || process.env.GOOGLE_MAPS_KEY) {
        this.googleApiKey = options.googleApiKey || process.env.GOOGLE_API_KEY || process.env.GOOGLE_MAPS_KEY;
        
        if (this.enableLogging) {
          this.log('Google Vision API key configured');
        }
      } else {
        if (this.enableLogging) {
          this.log('No Google Vision credentials - will use OpenAI fallback if available');
        }
      }
    } catch (error) {
      throw new Error(`Failed to initialize Google Vision client: ${error.message}`);
    }
  }

  /**
   * Ensure image-specific directories exist
   */
  ensureImageDirectories() {
    const dirs = [
      this.config.thumbnailDir
    ];
    
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Detect objects in image using Google Vision API or OpenAI Vision as fallback
   * @param {string} imagePath - Path to image file
   * @param {Object} options - Detection options
   * @returns {Promise<Array>} Array of detected objects
   */
  async detectObjects(imagePath, options = {}) {
    return this.executeWithRetry(async () => {
      // Try Google Vision API first
      if (this.visionClient) {
        try {
          return await this.detectObjectsWithGoogle(imagePath, options);
        } catch (error) {
          if (this.enableLogging) {
            console.warn('⚠️ Google Vision failed, trying OpenAI fallback:', error.message);
          }
        }
      }

      // Fallback to OpenAI Vision
      if (this.openai) {
        return await this.detectObjectsWithOpenAI(imagePath, options);
      }

      // No API available
      if (this.enableLogging) {
        this.log('No vision API available, skipping object detection');
      }
      return [];
    }, 'object detection');
  }

  /**
   * Detect objects using Google Vision API
   * @param {string} imagePath - Path to image file
   * @param {Object} options - Detection options
   * @returns {Promise<Array>} Array of detected objects
   */
  async detectObjectsWithGoogle(imagePath, options = {}) {
    try {
      if (this.enableLogging) {
        this.log('Detecting objects using Google Vision API');
      }

      const [result] = await this.visionClient.objectLocalization(imagePath);
      const objects = result.localizedObjectAnnotations || [];

      const filteredObjects = objects
        .filter(object => object.score >= (options.confidenceThreshold || this.config.objectDetectionOptions.confidenceThreshold))
        .slice(0, options.maxObjects || this.config.objectDetectionOptions.maxObjects)
        .map(object => ({
          name: object.name,
          confidence: object.score,
          boundingBox: object.boundingPoly.normalizedVertices,
          provider: 'google'
        }));

      if (this.enableLogging) {
        this.log(`Google Vision detected ${filteredObjects.length} objects`);
      }

      return filteredObjects;
    } catch (error) {
      if (this.enableLogging) {
        console.error('❌ Google Vision object detection failed:', error);
      }
      throw error;
    }
  }

  /**
   * Detect objects using OpenAI Vision API
   * @param {string} imagePath - Path to image file
   * @param {Object} options - Detection options
   * @returns {Promise<Array>} Array of detected objects
   */
  async detectObjectsWithOpenAI(imagePath, options = {}) {
    try {
      if (this.enableLogging) {
        this.log('Detecting objects using OpenAI Vision');
      }

      // Read image file and convert to base64
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = this.getMimeTypeFromPath(imagePath);
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this image and identify all objects, people, animals, and things you can see. 
                
For each object, provide:
- name: Clear, concise name
- confidence: Your confidence level (0.0-1.0)
- description: Brief description

Return your response as a JSON array in this exact format:
[
  {"name": "object_name", "confidence": 0.95, "description": "brief description"},
  {"name": "another_object", "confidence": 0.87, "description": "brief description"}
]

Only return the JSON array, no other text.`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      });

      const content = response.choices[0].message.content;
      
      try {
        // Clean up markdown code blocks if present
        let cleanContent = content;
        if (content.includes('```json') || content.includes('```')) {
          cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        }
        
        const objects = JSON.parse(cleanContent);
        const filteredObjects = objects
          .filter(obj => obj.confidence >= (options.confidenceThreshold || this.config.objectDetectionOptions.confidenceThreshold))
          .slice(0, options.maxObjects || this.config.objectDetectionOptions.maxObjects)
          .map(obj => ({
            name: obj.name,
            confidence: obj.confidence,
            description: obj.description,
            provider: 'openai'
          }));

        if (this.enableLogging) {
          this.log(`OpenAI Vision detected ${filteredObjects.length} objects`);
        }

        return filteredObjects;
      } catch (parseError) {
        if (this.enableLogging) {
          console.error('Error parsing OpenAI Vision response:', parseError);
        }
        
        // Extract objects from natural language response as fallback
        return this.parseObjectsFromText(content);
      }
      
    } catch (error) {
      if (this.enableLogging) {
        console.error('❌ OpenAI Vision object detection failed:', error);
      }
      throw error;
    }
  }

  /**
   * Extract text from image using Google Vision OCR or OpenAI Vision as fallback
   * @param {string} imagePath - Path to image file
   * @param {Object} options - OCR options
   * @returns {Promise<string>} Extracted text
   */
  async extractImageText(imagePath, options = {}) {
    return this.executeWithRetry(async () => {
      // Try Google Vision first (if available)
      if (this.visionClient) {
        try {
          return await this.extractTextWithGoogle(imagePath, options);
        } catch (error) {
          if (this.enableLogging) {
            console.warn('⚠️ Google Vision OCR failed, trying OpenAI fallback:', error.message);
          }
        }
      }

      // Fallback to OpenAI Vision
      if (this.openai) {
        return await this.extractTextWithOpenAI(imagePath, options);
      }

      if (this.enableLogging) {
        this.log('No vision API available for text extraction');
      }
      return '';
    }, 'text extraction');
  }

  /**
   * Extract text using Google Vision OCR
   * @param {string} imagePath - Path to image file
   * @param {Object} options - OCR options
   * @returns {Promise<string>} Extracted text
   */
  async extractTextWithGoogle(imagePath, options = {}) {
    try {
      if (this.enableLogging) {
        this.log('Extracting text using Google Vision OCR');
      }
      
      const [result] = await this.visionClient.textDetection(imagePath);
      const detections = result.textAnnotations;
      
      if (detections && detections.length > 0) {
        const extractedText = detections[0].description || '';
        
        if (this.enableLogging) {
          this.log(`Google Vision OCR extracted ${extractedText.length} characters`);
        }
        
        return extractedText;
      }
      
      return '';
    } catch (error) {
      if (this.enableLogging) {
        console.error('❌ Google Vision OCR failed:', error);
      }
      throw error;
    }
  }

  /**
   * Extract text using OpenAI Vision API
   * @param {string} imagePath - Path to image file
   * @param {Object} options - OCR options
   * @returns {Promise<string>} Extracted text
   */
  async extractTextWithOpenAI(imagePath, options = {}) {
    try {
      if (this.enableLogging) {
        this.log('Extracting text using OpenAI Vision');
      }

      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = this.getMimeTypeFromPath(imagePath);
      
      const startTime = Date.now();
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Extract all text visible in this image. Include:
- Signs, labels, and captions
- Handwritten and printed text
- Text in different languages
- Numbers and symbols

Return only the extracted text, preserving original formatting and line breaks where possible.`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      });

      const requestDuration = Date.now() - startTime;
      const extractedText = response.choices[0].message.content || '';

      // Track AI usage if we have the necessary metadata
      if (options.userId) {
        try {
          await this.aiUsageTracker.trackOpenAIUsage({
            userId: options.userId,
            response: response,
            model: "gpt-4o-mini",
            operationType: 'ocr',
            contentId: options.contentId || null,
            fileId: options.fileId || null,
            processingJobId: options.processingJobId || null,
            sessionId: options.sessionId || null,
            requestDurationMs: requestDuration,
            metadata: {
              imageType: 'ocr_extraction',
              imagePath: path.basename(imagePath),
              mimeType: mimeType,
              imageSize: imageBuffer.length,
              extractedTextLength: extractedText.length
            }
          });
        } catch (trackingError) {
          console.warn('Failed to track OpenAI Vision usage:', trackingError.message);
          // Don't fail the main operation due to tracking issues
        }
      }
      
      if (this.enableLogging) {
        this.log(`OpenAI Vision OCR extracted ${extractedText.length} characters`);
      }

      return extractedText;
    } catch (error) {
      if (this.enableLogging) {
        console.error('❌ OpenAI Vision OCR failed:', error);
      }
      throw error;
    }
  }

  /**
   * Generate comprehensive image description using AI
   * @param {string} imagePath - Path to image file
   * @param {Object} context - Additional context (objects, OCR text)
   * @returns {Promise<string>} Generated description
   */
  async generateImageDescription(imagePath, context = {}) {
    try {
      if (!this.openai) {
        throw new Error('OpenAI client not initialized');
      }

      if (this.enableLogging) {
        this.log('Generating AI image description');
      }

      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = this.getMimeTypeFromPath(imagePath);

      let prompt = `Provide a detailed, natural description of this image. Include:
- Overall scene and composition
- Main subjects and their actions
- Colors, lighting, and mood
- Important details and context`;

      if (context.objects && context.objects.length > 0) {
        prompt += `\n\nDetected objects: ${context.objects.map(obj => obj.name).join(', ')}`;
      }

      if (context.ocrText && context.ocrText.length > 0) {
        prompt += `\n\nVisible text: "${context.ocrText}"`;
      }

      prompt += `\n\nWrite a comprehensive but concise description in 2-3 sentences.`;
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      });

      const description = response.choices[0].message.content || '';
      
      if (this.enableLogging) {
        this.log(`Generated description: ${description.length} characters`);
      }

      return description;
    } catch (error) {
      if (this.enableLogging) {
        console.error('❌ Image description generation failed:', error);
      }
      throw error;
    }
  }

  /**
   * Generate image thumbnails in multiple sizes using ThumbnailGenerator
   * @param {string} userId - User ID
   * @param {string} imagePath - Path to image file
   * @param {Object} options - Thumbnail options
   * @returns {Promise<Array>} Array of generated thumbnails
   */
  async generateImageThumbnails(userId, imagePath, options = {}) {
    try {
      if (this.enableLogging) {
        console.log('🖼️ Generating image thumbnails using ThumbnailGenerator:', {
          userId,
          imagePath: path.basename(imagePath),
          options
        });
      }

      // Use the ThumbnailGenerator service for proper thumbnail generation
      const thumbnailOptions = {
        sizes: options.sizes || this.config.thumbnailOptions.sizes,
        quality: options.quality || 'medium',
        maintainAspectRatio: true,
        ...options
      };

      const results = await this.thumbnailGenerator.generateImageThumbnails(
        userId,
        imagePath,
        null, // contentId - not used for file-level thumbnails
        options.metadata?.fileId || null, // fileId from metadata
        thumbnailOptions
      );

      if (this.enableLogging) {
        console.log('✅ Image thumbnails generated successfully:', {
          thumbnailCount: results.thumbnails.length,
          sizes: thumbnailOptions.sizes,
          processingTime: `${results.metadata.processingTime}ms`
        });
      }

      return results.thumbnails;
    } catch (error) {
      if (this.enableLogging) {
        console.error('❌ Failed to generate image thumbnails:', error);
      }
      throw error;
    }
  }

  /**
   * Analyze image quality
   * @param {string} imagePath - Path to image file
   * @returns {Promise<Object>} Quality analysis result
   */
  async analyzeImageQuality(imagePath) {
    try {
      const metadata = await this.getImageMetadata(imagePath);
      const stats = fs.statSync(imagePath);
      
      return {
        dimensions: {
          width: metadata.width,
          height: metadata.height,
          aspectRatio: metadata.width / metadata.height
        },
        fileInfo: {
          size: stats.size,
          format: metadata.format,
          colorSpace: metadata.colorSpace || 'unknown'
        },
        quality: {
          resolution: this.getResolutionQuality(metadata.width, metadata.height),
          fileSize: this.getFileSizeQuality(stats.size, metadata.width * metadata.height),
          overallScore: this.calculateImageQualityScore(metadata, stats)
        }
      };
    } catch (error) {
      if (this.enableLogging) {
        console.error('❌ Image quality analysis failed:', error);
      }
      throw error;
    }
  }

  /**
   * Generate content tags based on image analysis
   * @param {Object} context - Analysis context (objects, description, OCR text)
   * @returns {Promise<Array>} Array of generated tags
   */
  async generateContentTags(context = {}) {
    try {
      if (!this.openai) {
        throw new Error('OpenAI client not initialized');
      }

      let prompt = 'Generate relevant tags for this image content. ';
      
      if (context.objects && context.objects.length > 0) {
        prompt += `Objects detected: ${context.objects.map(obj => obj.name).join(', ')}. `;
      }
      
      if (context.description) {
        prompt += `Description: ${context.description}. `;
      }
      
      if (context.ocrText) {
        prompt += `Text content: ${context.ocrText}. `;
      }
      
      prompt += 'Return 5-10 relevant tags as a JSON array of strings.';

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a content tagging expert. Generate relevant, specific tags for images.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.3
      });

      const content = response.choices[0].message.content;
      
      try {
        // Clean up markdown code blocks if present
        let cleanContent = content;
        if (content.includes('```json') || content.includes('```')) {
          cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        }
        
        const tags = JSON.parse(cleanContent);
        return Array.isArray(tags) ? tags : [];
      } catch (parseError) {
        if (this.enableLogging) {
          console.error('Error parsing tag generation response:', parseError);
          console.error('Raw response:', content);
        }
        
        // Fallback: return empty array if parsing fails
        return [];
      }
    } catch (error) {
      if (this.enableLogging) {
        console.error('❌ Tag generation failed:', error);
      }
      return [];
    }
  }

  /**
   * Generate sophisticated AI title for images using OpenAI (matching video quality)
   * 
   * @param {Object} context - Analysis context containing description, objects, tags, and OCR text
   * @returns {Promise<string>} Generated sophisticated title
   */
  async generateSophisticatedTitle(context = {}) {
    try {
      if (!this.openai) {
        throw new Error('OpenAI client not initialized');
      }

      if (this.enableLogging) {
        console.log('🎯 Starting sophisticated AI title generation for image');
      }

      // Prepare enhanced content for analysis
      let contentToAnalyze = '';
      
      if (context.description) {
        contentToAnalyze = context.description.trim();
      }
      
      // Enhance with additional context from analysis data
      if (context.objects && context.objects.length > 0) {
        const objectNames = context.objects.map(obj => obj.name || obj).join(', ');
        contentToAnalyze += `\n\nDetected objects: ${objectNames}`;
      }
      
      if (context.tags && context.tags.length > 0) {
        const tagList = context.tags.slice(0, 5).join(', '); // Top 5 tags
        contentToAnalyze += `\n\nKey themes: ${tagList}`;
      }

      if (context.ocrText && context.ocrText.trim()) {
        contentToAnalyze += `\n\nVisible text: "${context.ocrText.trim()}"`;
      }

      if (!contentToAnalyze || contentToAnalyze.length < 10) {
        if (this.enableLogging) {
          console.log('⚠️ Insufficient content for AI title generation');
        }
        return this.getFallbackTitle(context);
      }

      if (this.enableLogging) {
        console.log(`🤖 Sending image content to OpenAI for title generation (${contentToAnalyze.length} chars)`);
      }

      const prompt = `Based on the following image description and analysis, create an engaging and descriptive title that follows proper narrative structure like professional video titles.

The title should be:
- Follow a narrative structure with proper grammar and flow (NOT keyword lists or bullet points)
- Be a complete, well-formed sentence or phrase that tells what the image is about
- Use descriptive language that paints a picture of the scene
- Focus on the main subject, action, or purpose shown in the image
- Be professional and engaging like video content titles
- Avoid comma-separated lists or tag-like structures
- Create a cohesive narrative that flows naturally

Image Analysis: ${contentToAnalyze}

Examples of good structured titles:
- "Professional Energy Storage Solutions Showcase: Complete Equipment Layout and Components Display"
- "Comprehensive Tutorial Setup: Step-by-Step Equipment Organization for Solar Installation"
- "Modern Industrial Design: Clean Product Layout Featuring Advanced Energy Storage Technology"
- "Educational Product Demonstration: Detailed Component Overview for Renewable Energy Systems"

BAD examples to avoid:
- "SunC New Energy Co, packing list, energy storage equipment" (keyword list)
- "Inverter, batteries, pallet, manuals, plugs" (bullet points)
- "Company name, product type, equipment list" (tag structure)

Respond with only the title, no quotes or additional text.`;

      const startTime = Date.now();
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert content creator who specializes in writing professional, descriptive titles for visual content that match the quality and structure of video titles. Create compelling titles that follow proper narrative structure with complete sentences, not keyword lists or bullet points. Your titles should be well-formed, professional, and descriptive - similar to how video content is titled. Focus on the main subject, purpose, or theme of the image using proper grammar and cohesive language flow. Avoid comma-separated lists or tag-like structures.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 80
      });

      const requestDuration = Date.now() - startTime;

      // Track AI usage for cost calculation
      if (context.userId) {
        try {
          await this.aiUsageTracker.trackOpenAIUsage({
            userId: context.userId,
            response: response,
            model: "gpt-4",
            operationType: 'text_generation',
            contentId: context.contentId || null,
            fileId: context.fileId || null,
            processingJobId: context.processingJobId || null,
            sessionId: context.sessionId || null,
            requestDurationMs: requestDuration,
            metadata: {
              operationType: 'image_title_generation_processor',
              descriptionLength: contentToAnalyze.length,
              prompt: prompt.substring(0, 200) + '...' // Store truncated prompt for debugging
            }
          });
        } catch (trackingError) {
          console.warn('Failed to track OpenAI usage in ImageProcessor title generation:', trackingError.message);
          // Don't fail the main operation due to tracking issues
        }
      }

      let generatedTitle = response.choices[0].message.content.trim();
      
      // Clean up title (remove quotes if present)
      generatedTitle = generatedTitle.replace(/^["']|["']$/g, '');
      
      // Ensure title isn't too long (allow for more descriptive titles)
      if (generatedTitle.length > 150) {
        generatedTitle = generatedTitle.substring(0, 147) + '...';
      }
      
      if (this.enableLogging) {
        console.log(`✅ Generated sophisticated AI title: "${generatedTitle}"`);
      }
      
      return generatedTitle;
      
    } catch (error) {
      if (this.enableLogging) {
        console.error('❌ Sophisticated AI title generation failed:', error.message);
      }
      return this.getFallbackTitle(context);
    }
  }

  /**
   * Generate fallback title when AI generation fails
   * 
   * @param {Object} context - Analysis context
   * @returns {string} Fallback title
   */
  getFallbackTitle(context = {}) {
    // Try to use first sentence of description - avoid keyword lists
    if (context.description && context.description.trim()) {
      const firstSentence = context.description.split('.')[0];
      if (firstSentence.length > 0 && firstSentence.length <= 120) {
        // Create a proper sentence structure
        return this.formatAsProfessionalTitle(firstSentence.trim());
      } else if (context.description.length <= 120) {
        // Use full description if it's not too long
        return this.formatAsProfessionalTitle(context.description.trim());
      } else {
        // Truncate but maintain sentence structure
        const truncated = context.description.substring(0, 117).trim();
        return this.formatAsProfessionalTitle(truncated) + '...';
      }
    }
    
    // Create structured title from tags - avoid comma lists
    if (context.tags && Array.isArray(context.tags) && context.tags.length > 0) {
      const mainTag = context.tags[0];
      const additionalTags = context.tags.slice(1, 3);
      if (additionalTags.length > 0) {
        return `${this.capitalizeFirst(mainTag)} Showcase: Featuring ${additionalTags.join(' and ')}`;
      } else {
        return `Professional ${this.capitalizeFirst(mainTag)} Display`;
      }
    }
    
    // Create structured title from objects - avoid comma lists
    if (context.objects && context.objects.length > 0) {
      const mainObject = context.objects[0];
      const objectName = mainObject.name || mainObject;
      if (context.objects.length > 1) {
        return `${this.capitalizeFirst(objectName)} and Equipment: Professional Product Layout`;
      } else {
        return `Professional ${this.capitalizeFirst(objectName)} Presentation`;
      }
    }
    
    // Final fallback with professional structure
    return 'Professional Visual Content: Detailed Product and Information Display';
  }

  /**
   * Format text as a professional title with proper structure
   * @param {string} text - Text to format
   * @returns {string} Professionally formatted title
   */
  formatAsProfessionalTitle(text) {
    // Capitalize first letter and ensure proper sentence structure
    const formatted = text.charAt(0).toUpperCase() + text.slice(1);
    
    // If it already has good structure, return as is
    if (formatted.includes(':') || formatted.includes(' - ') || formatted.length > 40) {
      return formatted;
    }
    
    // Add professional structure for shorter phrases
    return `Professional ${formatted}: Detailed Visual Overview`;
  }

  /**
   * Capitalize the first letter of a string
   * @param {string} str - String to capitalize
   * @returns {string} Capitalized string
   */
  capitalizeFirst(str) {
    if (!str || typeof str !== 'string') return 'Content';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Get image metadata
   * @param {string} imagePath - Path to image file
   * @returns {Promise<Object>} Image metadata
   */
  async getImageMetadata(imagePath) {
    // Simplified metadata extraction
    // In production, would use Sharp or similar library
    const stats = fs.statSync(imagePath);
    const extension = path.extname(imagePath).toLowerCase();
    
    return {
      width: 1920, // Would be extracted from actual image
      height: 1080, // Would be extracted from actual image
      format: extension.substring(1),
      colorSpace: 'RGB',
      fileSize: stats.size,
      created: stats.birthtime,
      modified: stats.mtime
    };
  }

  /**
   * Get MIME type from file path
   * @param {string} filePath - File path
   * @returns {string} MIME type
   */
  getMimeTypeFromPath(filePath) {
    const extension = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.tiff': 'image/tiff'
    };
    return mimeTypes[extension] || 'image/jpeg';
  }

  /**
   * Parse objects from natural language text as fallback
   * @param {string} text - Natural language description
   * @returns {Array} Array of detected objects
   */
  parseObjectsFromText(text) {
    const commonObjects = [
      'person', 'people', 'man', 'woman', 'child', 'face', 'hand',
      'car', 'vehicle', 'building', 'house', 'tree', 'flower', 'animal',
      'dog', 'cat', 'bird', 'table', 'chair', 'book', 'phone', 'computer'
    ];
    
    const foundObjects = [];
    const lowerText = text.toLowerCase();
    
    commonObjects.forEach(object => {
      if (lowerText.includes(object)) {
        foundObjects.push({
          name: object,
          confidence: 0.6,
          description: `Found in text analysis`,
          provider: 'text_fallback'
        });
      }
    });
    
    return foundObjects.slice(0, 10); // Limit to 10 objects
  }

  /**
   * Get resolution quality rating
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @returns {string} Quality rating
   */
  getResolutionQuality(width, height) {
    const pixels = width * height;
    if (pixels >= 8000000) return 'Ultra High'; // 8MP+
    if (pixels >= 2000000) return 'High'; // 2MP+
    if (pixels >= 1000000) return 'Medium'; // 1MP+
    if (pixels >= 300000) return 'Low'; // 300K+
    return 'Very Low';
  }

  /**
   * Get file size quality rating
   * @param {number} fileSize - File size in bytes
   * @param {number} pixels - Total pixels
   * @returns {string} Quality rating
   */
  getFileSizeQuality(fileSize, pixels) {
    const bytesPerPixel = fileSize / pixels;
    if (bytesPerPixel >= 3) return 'Excellent';
    if (bytesPerPixel >= 2) return 'Good';
    if (bytesPerPixel >= 1) return 'Fair';
    return 'Poor';
  }

  /**
   * Calculate overall image quality score
   * @param {Object} metadata - Image metadata
   * @param {Object} stats - File stats
   * @returns {number} Quality score (0-100)
   */
  calculateImageQualityScore(metadata, stats) {
    let score = 0;
    
    // Resolution score (50%)
    const pixels = metadata.width * metadata.height;
    if (pixels >= 8000000) score += 50;
    else if (pixels >= 2000000) score += 40;
    else if (pixels >= 1000000) score += 30;
    else if (pixels >= 300000) score += 20;
    else score += 10;
    
    // File size score (30%)
    const bytesPerPixel = stats.size / pixels;
    if (bytesPerPixel >= 3) score += 30;
    else if (bytesPerPixel >= 2) score += 25;
    else if (bytesPerPixel >= 1) score += 20;
    else score += 10;
    
    // Aspect ratio score (20%)
    const aspectRatio = metadata.width / metadata.height;
    if (aspectRatio >= 0.5 && aspectRatio <= 2.0) score += 20;
    else score += 10;
    
    return Math.min(100, score);
  }

  /**
   * Clean up expired thumbnails
   * @param {string} userId - User ID
   */
  async cleanupExpiredThumbnails(userId) {
    try {
      const expiredThumbnails = await Thumbnail.findAll({
        where: {
          user_id: userId,
          expires_at: {
            [require('sequelize').Op.lt]: new Date()
          }
        }
      });

      for (const thumbnail of expiredThumbnails) {
        try {
          // Delete file if it exists
          if (fs.existsSync(thumbnail.file_path)) {
            fs.unlinkSync(thumbnail.file_path);
          }
          
          // Delete database record
          await thumbnail.destroy();
          
          if (this.enableLogging) {
            this.log(`Cleaned up expired thumbnail: ${thumbnail.id}`);
          }
        } catch (error) {
          if (this.enableLogging) {
            console.error(`❌ Failed to cleanup thumbnail ${thumbnail.id}:`, error);
          }
        }
      }
    } catch (error) {
      if (this.enableLogging) {
        console.error('❌ Thumbnail cleanup failed:', error);
      }
    }
  }
}

module.exports = ImageProcessor; 