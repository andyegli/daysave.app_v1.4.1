/**
 * VideoProcessor Service
 * 
 * Handles video-specific processing operations including frame extraction,
 * audio extraction, metadata analysis, and OCR caption extraction.
 * Integrates with DaySave database models for persistent storage.
 * 
 * Features:
 * - Video frame extraction and analysis
 * - Audio track extraction for transcription
 * - Video metadata and technical analysis
 * - OCR text extraction from video frames
 * - Video quality assessment and optimization
 * - Scene detection and segmentation
 * 
 * @author DaySave Integration Team
 * @version 1.0.0
 */

const ffmpeg = require('fluent-ffmpeg');
const vision = require('@google-cloud/vision');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// DaySave models
const { OCRCaption, VideoAnalysis } = require('../../models');

/**
 * VideoProcessor Class
 * 
 * Handles all video processing operations with database integration
 */
class VideoProcessor {
  /**
   * Initialize the VideoProcessor service
   * 
   * @param {Object} options - Configuration options
   * @param {string} options.tempDir - Directory for temporary files
   * @param {string} options.googleApiKey - Google Cloud API key
   * @param {string} options.googleCredentials - Path to Google Cloud credentials
   * @param {boolean} options.enableLogging - Enable detailed logging (default: true)
   */
  constructor(options = {}) {
    this.enableLogging = options.enableLogging !== false;
    
    // Configuration
    this.config = {
      tempDir: options.tempDir || 'uploads/temp',
      maxFrames: 100,
      defaultFrameInterval: 2, // seconds
      ocrConfidenceThreshold: 0.5,
      supportedVideoFormats: ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'],
      frameFormats: ['.jpg', '.png'],
      audioFormats: ['.wav', '.mp3', '.m4a']
    };
    
    // Initialize Google Vision client
    this.initializeVisionClient(options);
    
    // Ensure directories exist
    this.ensureDirectories();
    
    if (this.enableLogging) {
      console.log('🎬 VideoProcessor service initialized');
    }
  }

  /**
   * Initialize Google Vision client
   * @param {Object} options - Configuration options
   */
  initializeVisionClient(options) {
    try {
      if (options.googleCredentials || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        if (options.googleCredentials) {
          process.env.GOOGLE_APPLICATION_CREDENTIALS = options.googleCredentials;
        }
        
        this.visionClient = new vision.ImageAnnotatorClient();
        
        if (this.enableLogging) {
          console.log('✅ Google Vision client initialized');
        }
      } else if (options.googleApiKey || process.env.GOOGLE_API_KEY || process.env.GOOGLE_MAPS_KEY) {
        this.googleApiKey = options.googleApiKey || process.env.GOOGLE_API_KEY || process.env.GOOGLE_MAPS_KEY;
        
        if (this.enableLogging) {
          console.log('✅ Google Vision API key configured');
        }
      } else {
        if (this.enableLogging) {
          console.log('⚠️ No Google Vision credentials - OCR features will be limited');
        }
      }
    } catch (error) {
      console.error('❌ Error initializing Google Vision client:', error);
    }
  }

  /**
   * Ensure required directories exist
   */
  ensureDirectories() {
    if (!fs.existsSync(this.config.tempDir)) {
      fs.mkdirSync(this.config.tempDir, { recursive: true });
    }
  }

  /**
   * Extract OCR captions from video frames
   * 
   * @param {string} userId - User ID
   * @param {string} videoPath - Path to video file
   * @param {string} contentId - Content ID (optional)
   * @param {string} fileId - File ID (optional)
   * @param {Object} options - OCR extraction options
   * @returns {Promise<Object>} OCR extraction results
   */
  async extractOCRCaptions(userId, videoPath, contentId = null, fileId = null, options = {}) {
    try {
      if (!userId || !videoPath) {
        throw new Error('User ID and video path are required');
      }

      if (!this.visionClient && !this.googleApiKey) {
        throw new Error('Google Vision client not initialized');
      }

      if (this.enableLogging) {
        console.log('📄 Starting OCR caption extraction:', {
          userId,
          videoPath: path.basename(videoPath),
          contentId,
          fileId
        });
      }

      // Get video metadata
      const metadata = await this.getVideoMetadata(videoPath);
      const duration = metadata.format.duration;

      if (!duration || duration <= 0) {
        throw new Error('Invalid video duration');
      }

      // Configuration options
      const ocrOptions = {
        frameInterval: options.frameInterval || this.config.defaultFrameInterval,
        maxFrames: Math.min(options.maxFrames || 30, this.config.maxFrames),
        confidenceThreshold: options.confidenceThreshold || this.config.ocrConfidenceThreshold,
        filterShortText: options.filterShortText !== false,
        startTime: options.startTime || 0,
        endTime: options.endTime || duration,
        ...options
      };

      // Extract frames for OCR processing
      const frames = await this.extractFramesForOCR(videoPath, duration, ocrOptions);

      if (frames.length === 0) {
        if (this.enableLogging) {
          console.log('⚠️ No frames extracted for OCR processing');
        }
        return {
          captions: [],
          totalFrames: 0,
          processingTime: 0,
          metadata: { duration, frameInterval: ocrOptions.frameInterval }
        };
      }

      const startTime = Date.now();
      const captions = [];
      let processedFrames = 0;

      if (this.enableLogging) {
        console.log('🔍 Processing frames for OCR:', {
          totalFrames: frames.length,
          interval: `${ocrOptions.frameInterval}s`,
          duration: `${duration.toFixed(2)}s`
        });
      }

      // Process each frame for OCR
      for (const frame of frames) {
        try {
          const ocrResults = await this.performOCROnFrame(frame.path, frame.timestamp, ocrOptions);
          
          // Create database records for each text detection
          for (const textResult of ocrResults) {
            const caption = await OCRCaption.create({
              id: uuidv4(),
              user_id: userId,
              content_id: contentId,
              file_id: fileId,
              timestamp: frame.timestamp,
              timestamp_seconds: frame.timestampSeconds,
              frame_index: frame.index,
              text: textResult.text,
              confidence: textResult.confidence,
              coordinates: textResult.coordinates,
              text_properties: textResult.properties,
              language: textResult.language,
              text_category: this.categorizeText(textResult.text),
              word_count: textResult.text.split(/\s+/).filter(w => w.length > 0).length,
              character_count: textResult.text.length,
              processing_method: 'google_vision',
              processing_metadata: {
                frameIndex: frame.index,
                processingTime: Date.now(),
                originalImage: frame.path,
                rawResponse: textResult.raw
              },
              status: 'ready'
            });

            captions.push(caption);
          }

          processedFrames++;

          if (this.enableLogging && processedFrames % 10 === 0) {
            console.log(`📄 Processed ${processedFrames}/${frames.length} frames`);
          }
        } catch (frameError) {
          console.error(`❌ OCR failed for frame ${frame.index}:`, frameError);
          // Continue with other frames
        }

        // Clean up temporary frame file
        if (fs.existsSync(frame.path)) {
          fs.unlinkSync(frame.path);
        }
      }

      const processingTime = Date.now() - startTime;

      // Filter captions by confidence if requested
      const filteredCaptions = ocrOptions.filterShortText 
        ? captions.filter(c => c.text.length >= 3 && c.confidence >= ocrOptions.confidenceThreshold)
        : captions;

      const results = {
        captions: filteredCaptions,
        totalFrames: frames.length,
        processedFrames,
        captionsFound: filteredCaptions.length,
        processingTime,
        metadata: {
          duration,
          frameInterval: ocrOptions.frameInterval,
          confidenceThreshold: ocrOptions.confidenceThreshold,
          averageConfidence: filteredCaptions.length > 0 
            ? filteredCaptions.reduce((sum, c) => sum + parseFloat(c.confidence), 0) / filteredCaptions.length 
            : 0
        }
      };

      if (this.enableLogging) {
        console.log('✅ OCR caption extraction completed:', {
          totalCaptions: results.captionsFound,
          processingTime: `${processingTime}ms`,
          averageConfidence: results.metadata.averageConfidence.toFixed(3)
        });
      }

      return results;
    } catch (error) {
      console.error('❌ OCR caption extraction failed:', error);
      throw error;
    }
  }

  /**
   * Extract frames from video for OCR processing
   * 
   * @param {string} videoPath - Path to video file
   * @param {number} duration - Video duration in seconds
   * @param {Object} options - Extraction options
   * @returns {Promise<Array>} Array of frame information
   */
  async extractFramesForOCR(videoPath, duration, options) {
    try {
      const frames = [];
      const frameInterval = options.frameInterval;
      const maxFrames = options.maxFrames;
      const startTime = options.startTime || 0;
      const endTime = options.endTime || duration;
      
      // Calculate frame timestamps
      const effectiveDuration = endTime - startTime;
      const totalPossibleFrames = Math.floor(effectiveDuration / frameInterval);
      const frameCount = Math.min(totalPossibleFrames, maxFrames);

      if (frameCount <= 0) {
        return frames;
      }

      // Generate evenly distributed frame timestamps
      const actualInterval = effectiveDuration / frameCount;
      
      for (let i = 0; i < frameCount; i++) {
        const timestampSeconds = startTime + (actualInterval * i);
        const timestamp = this.secondsToTimeString(timestampSeconds);
        
        frames.push({
          index: i,
          timestamp,
          timestampSeconds,
          path: null // Will be set during extraction
        });
      }

      // Extract frames using FFmpeg
      const extractedFrames = [];
      
      for (const frame of frames) {
        try {
          const framePath = path.join(
            this.config.tempDir, 
            `ocr_frame_${uuidv4()}_${frame.index}.jpg`
          );
          
          await this.extractSingleFrame(videoPath, framePath, frame.timestamp);
          
          frame.path = framePath;
          extractedFrames.push(frame);
        } catch (extractError) {
          console.error(`❌ Frame extraction failed for ${frame.timestamp}:`, extractError);
          // Continue with other frames
        }
      }

      return extractedFrames;
    } catch (error) {
      console.error('❌ Frame extraction for OCR failed:', error);
      throw error;
    }
  }

  /**
   * Perform OCR on a single frame
   * 
   * @param {string} framePath - Path to frame image
   * @param {string} timestamp - Frame timestamp
   * @param {Object} options - OCR options
   * @returns {Promise<Array>} Array of text detections
   */
  async performOCROnFrame(framePath, timestamp, options) {
    try {
      if (!this.visionClient) {
        throw new Error('Google Vision client not available');
      }

      // Perform text detection
      const [result] = await this.visionClient.textDetection(framePath);
      const textAnnotations = result.textAnnotations || [];

      if (textAnnotations.length === 0) {
        return [];
      }

      const detections = [];

      // Process each text annotation
      for (let i = 0; i < textAnnotations.length; i++) {
        const annotation = textAnnotations[i];
        
        // Skip the first annotation (full text) for individual word processing
        if (i === 0) continue;

        const text = annotation.description.trim();
        
        // Filter short text if requested
        if (options.filterShortText && text.length < 3) {
          continue;
        }

        // Calculate confidence (Google Vision doesn't provide confidence for text detection)
        const confidence = this.estimateTextConfidence(text, annotation);

        // Filter by confidence threshold
        if (confidence < options.confidenceThreshold) {
          continue;
        }

        // Extract bounding box coordinates
        const vertices = annotation.boundingPoly.vertices;
        const coordinates = {
          x: Math.min(...vertices.map(v => v.x || 0)),
          y: Math.min(...vertices.map(v => v.y || 0)),
          width: Math.max(...vertices.map(v => v.x || 0)) - Math.min(...vertices.map(v => v.x || 0)),
          height: Math.max(...vertices.map(v => v.y || 0)) - Math.min(...vertices.map(v => v.y || 0))
        };

        detections.push({
          text,
          confidence,
          coordinates,
          properties: this.analyzeTextProperties(text, annotation),
          language: this.detectTextLanguage(text),
          raw: annotation
        });
      }

      return detections;
    } catch (error) {
      console.error('❌ OCR processing failed:', error);
      return [];
    }
  }

  /**
   * Extract audio track from video
   * 
   * @param {string} videoPath - Path to video file
   * @param {Object} options - Audio extraction options
   * @returns {Promise<string>} Path to extracted audio file
   */
  async extractAudioFromVideo(videoPath, options = {}) {
    try {
      const audioPath = path.join(
        this.config.tempDir,
        `audio_${uuidv4()}.wav`
      );

      const extractOptions = {
        codec: options.codec || 'pcm_s16le',
        channels: options.channels || 1,
        sampleRate: options.sampleRate || 16000,
        format: options.format || 'wav',
        ...options
      };

      await this.extractAudioWithFFmpeg(videoPath, audioPath, extractOptions);

      if (this.enableLogging) {
        console.log('🎵 Audio extracted from video:', {
          input: path.basename(videoPath),
          output: path.basename(audioPath),
          options: extractOptions
        });
      }

      return audioPath;
    } catch (error) {
      console.error('❌ Audio extraction failed:', error);
      throw error;
    }
  }

  /**
   * Extract single frame from video
   * 
   * @param {string} videoPath - Path to video file
   * @param {string} outputPath - Output path for frame
   * @param {string} timestamp - Timestamp to extract
   * @returns {Promise<void>}
   */
  async extractSingleFrame(videoPath, outputPath, timestamp) {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .seekInput(timestamp)
        .frames(1)
        .format('image2')
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', reject)
        .run();
    });
  }

  /**
   * Extract audio using FFmpeg
   * 
   * @param {string} videoPath - Path to video file
   * @param {string} audioPath - Output path for audio
   * @param {Object} options - Audio extraction options
   * @returns {Promise<void>}
   */
  async extractAudioWithFFmpeg(videoPath, audioPath, options) {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .audioCodec(options.codec)
        .audioChannels(options.channels)
        .audioFrequency(options.sampleRate)
        .format(options.format)
        .output(audioPath)
        .on('end', () => resolve())
        .on('error', reject)
        .run();
    });
  }

  /**
   * Get video metadata using FFprobe
   * 
   * @param {string} videoPath - Path to video file
   * @returns {Promise<Object>} Video metadata
   */
  async getVideoMetadata(videoPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          resolve(metadata);
        }
      });
    });
  }

  /**
   * Analyze video quality and technical specifications
   * 
   * @param {string} videoPath - Path to video file
   * @returns {Promise<Object>} Video analysis results
   */
  async analyzeVideoQuality(videoPath) {
    try {
      const metadata = await this.getVideoMetadata(videoPath);
      
      const analysis = {
        duration: metadata.format.duration,
        fileSize: metadata.format.size,
        bitRate: metadata.format.bit_rate,
        format: metadata.format.format_name,
        streams: metadata.streams.map(stream => ({
          type: stream.codec_type,
          codec: stream.codec_name,
          width: stream.width,
          height: stream.height,
          frameRate: stream.r_frame_rate,
          bitRate: stream.bit_rate,
          sampleRate: stream.sample_rate,
          channels: stream.channels
        })),
        quality: this.assessVideoQuality(metadata)
      };

      return analysis;
    } catch (error) {
      console.error('❌ Video quality analysis failed:', error);
      throw error;
    }
  }

  // Helper Methods

  /**
   * Convert seconds to time string
   * @param {number} seconds - Seconds
   * @returns {string} Time string (HH:MM:SS)
   */
  secondsToTimeString(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Estimate text confidence based on text characteristics
   * @param {string} text - Text content
   * @param {Object} annotation - Google Vision annotation
   * @returns {number} Estimated confidence (0-1)
   */
  estimateTextConfidence(text, annotation) {
    let confidence = 0.7; // Base confidence
    
    // Adjust based on text length
    if (text.length >= 5) confidence += 0.1;
    if (text.length >= 10) confidence += 0.1;
    
    // Adjust based on character types
    if (/^[a-zA-Z\s]+$/.test(text)) confidence += 0.1; // Only letters and spaces
    if (/\d/.test(text)) confidence -= 0.05; // Contains numbers
    if (/[!@#$%^&*(),.?":{}|<>]/.test(text)) confidence -= 0.05; // Contains special chars
    
    // Adjust based on bounding box size (larger text usually more confident)
    const vertices = annotation.boundingPoly.vertices;
    const width = Math.max(...vertices.map(v => v.x || 0)) - Math.min(...vertices.map(v => v.x || 0));
    const height = Math.max(...vertices.map(v => v.y || 0)) - Math.min(...vertices.map(v => v.y || 0));
    
    if (width > 100 || height > 20) confidence += 0.05;
    
    return Math.min(1.0, Math.max(0.0, confidence));
  }

  /**
   * Analyze text properties
   * @param {string} text - Text content
   * @param {Object} annotation - Google Vision annotation
   * @returns {Object} Text properties
   */
  analyzeTextProperties(text, annotation) {
    return {
      length: text.length,
      wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
      hasNumbers: /\d/.test(text),
      hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(text),
      isUpperCase: text === text.toUpperCase(),
      isLowerCase: text === text.toLowerCase(),
      boundingBoxArea: this.calculateBoundingBoxArea(annotation.boundingPoly.vertices)
    };
  }

  /**
   * Detect text language (simplified)
   * @param {string} text - Text content
   * @returns {string} Language code
   */
  detectTextLanguage(text) {
    // Simple language detection based on character patterns
    if (/^[a-zA-Z\s\d.,!?]+$/.test(text)) {
      return 'en'; // English
    }
    
    return 'unknown';
  }

  /**
   * Categorize text content
   * @param {string} text - Text content
   * @returns {string} Text category
   */
  categorizeText(text) {
    const lowerText = text.toLowerCase();
    
    // Check for common UI elements
    if (/^(play|pause|stop|next|previous|settings|menu|home|back)$/i.test(text)) {
      return 'ui';
    }
    
    // Check for title-like text (all caps, short)
    if (text === text.toUpperCase() && text.length < 50) {
      return 'title';
    }
    
    // Check for subtitle-like text (longer, sentence-like)
    if (text.length > 20 && /[.!?]$/.test(text)) {
      return 'subtitle';
    }
    
    // Check for watermark-like text
    if (/©|®|™|watermark|logo/i.test(text)) {
      return 'watermark';
    }
    
    // Check for credits
    if (/directed by|produced by|starring|credits|copyright/i.test(text)) {
      return 'credits';
    }
    
    return 'other';
  }

  /**
   * Calculate bounding box area
   * @param {Array} vertices - Bounding box vertices
   * @returns {number} Area in pixels
   */
  calculateBoundingBoxArea(vertices) {
    if (!vertices || vertices.length < 4) return 0;
    
    const minX = Math.min(...vertices.map(v => v.x || 0));
    const maxX = Math.max(...vertices.map(v => v.x || 0));
    const minY = Math.min(...vertices.map(v => v.y || 0));
    const maxY = Math.max(...vertices.map(v => v.y || 0));
    
    return (maxX - minX) * (maxY - minY);
  }

  /**
   * Assess video quality based on metadata
   * @param {Object} metadata - Video metadata
   * @returns {string} Quality assessment
   */
  assessVideoQuality(metadata) {
    const videoStream = metadata.streams.find(s => s.codec_type === 'video');
    if (!videoStream) return 'unknown';
    
    const width = videoStream.width;
    const height = videoStream.height;
    const bitRate = videoStream.bit_rate;
    
    // Simple quality assessment based on resolution and bitrate
    if (width >= 1920 && height >= 1080 && bitRate > 5000000) {
      return 'high';
    } else if (width >= 1280 && height >= 720 && bitRate > 2000000) {
      return 'medium';
    } else {
      return 'low';
    }
  }
}

module.exports = VideoProcessor; 