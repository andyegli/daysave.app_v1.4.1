/**
 * VideoProcessor Service
 * 
 * Handles video-specific processing operations including frame extraction,
 * audio extraction, metadata analysis, and OCR caption extraction.
 * Extends BaseMediaProcessor for standardized interface compliance.
 * 
 * Features:
 * - Video frame extraction and analysis
 * - Audio track extraction for transcription
 * - Video metadata and technical analysis
 * - OCR text extraction from video frames
 * - Video quality assessment and optimization
 * - Scene detection and segmentation
 * - Thumbnail generation and key moments
 * 
 * @author DaySave Integration Team
 * @version 2.0.0
 */

const ffmpeg = require('fluent-ffmpeg');
const vision = require('@google-cloud/vision');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// DaySave models
const { OCRCaption, VideoAnalysis, Thumbnail } = require('../../models');

// Base processor
const BaseMediaProcessor = require('./BaseMediaProcessor');

/**
 * VideoProcessor Class
 * 
 * Extends BaseMediaProcessor to handle video-specific processing operations
 */
class VideoProcessor extends BaseMediaProcessor {
  /**
   * Initialize the VideoProcessor service
   * 
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    // Call parent constructor
    super(options);
    
    // Video-specific configuration
    this.config = {
      ...this.config, // Inherit base config
      thumbnailDir: 'uploads/thumbnails',
      maxFrames: 100,
      defaultFrameInterval: 2, // seconds
      ocrConfidenceThreshold: 0.5,
      supportedVideoFormats: ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'],
      frameFormats: ['.jpg', '.png'],
      audioFormats: ['.wav', '.mp3', '.m4a'],
      thumbnailOptions: {
        imageSizes: [150, 300, 500],
        thumbnailSize: 300,
        keyMomentsCount: 5,
        keyMomentsSize: 200
      },
      ocrOptions: {
        frameInterval: 2,
        maxFrames: 30,
        confidenceThreshold: 0.5,
        filterShortText: true
      }
    };
    
    // Initialize video-specific services
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
      // Initialize Google Vision client for OCR
      await this.initializeVisionClient(options);
      
      // Ensure video-specific directories exist
      this.ensureVideoDirectories();
      
      if (this.enableLogging) {
        console.log('🎬 VideoProcessor initialization completed');
      }
    } catch (error) {
      if (this.enableLogging) {
        console.error('❌ VideoProcessor initialization failed:', error);
      }
      throw error;
    }
  }

  /**
   * Process video content
   * 
   * @param {string} userId - User ID
   * @param {string} filePath - Path to the video file
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing results
   */
  async process(userId, filePath, options = {}) {
    const results = this.initializeResults(userId, filePath, 'video');
    
    try {
      // Validate video file
      await this.validate(filePath, 'video');
      
      this.updateProgress(10, 'Starting video processing');
      
      // Create video analysis record
      const videoAnalysis = await VideoAnalysis.create({
        id: uuidv4(),
        user_id: userId,
        duration: 0,
        status: 'processing',
        analysis_method: 'ffmpeg',
        analysis_options: options,
        started_at: new Date(),
        progress: 0
      });

      results.results.videoAnalysis = videoAnalysis;
      this.updateProgress(20, 'Video analysis record created');

      // Extract video metadata
      const metadata = await this.getVideoMetadata(filePath);
      results.metadata.video = metadata;

      // Update video analysis with metadata
      await videoAnalysis.update({
        duration: metadata.format.duration,
        frame_count: metadata.streams[0]?.nb_frames,
        frame_rate: eval(metadata.streams[0]?.r_frame_rate || '0'),
        resolution: {
          width: metadata.streams[0]?.width,
          height: metadata.streams[0]?.height
        },
        video_codec: metadata.streams[0]?.codec_name,
        file_size: metadata.format.size,
        container_format: metadata.format.format_name,
        progress: 40
      });

      this.updateProgress(40, 'Video metadata extracted');

      // Extract audio for transcription (if enabled)
      if (options.enableTranscription || options.enableAudioProcessing) {
        try {
          const audioPath = await this.extractAudioFromVideo(filePath);
          results.results.audioPath = audioPath;
          this.updateProgress(50, 'Audio extracted for transcription');
        } catch (error) {
          this.addWarning(results, 'Failed to extract audio from video', 'audio_extraction');
        }
      }

      // Extract frame for object detection (if enabled)
      if (options.enableObjectDetection || options.enableFrameAnalysis) {
        try {
          const framePath = await this.extractVideoFrame(filePath);
          results.results.framePath = framePath;
          this.updateProgress(60, 'Video frame extracted');
        } catch (error) {
          this.addWarning(results, 'Failed to extract video frame', 'frame_extraction');
        }
      }

      // Generate thumbnails (if enabled)
      if (options.enableThumbnailGeneration) {
        try {
          const thumbnails = await this.generateVideoThumbnails(
            userId,
            filePath,
            options.thumbnailOptions || this.config.thumbnailOptions
          );
          results.results.thumbnails = thumbnails;
          this.updateProgress(70, 'Video thumbnails generated');
        } catch (error) {
          this.addWarning(results, 'Failed to generate video thumbnails', 'thumbnail_generation');
        }
      }

      // Extract OCR captions (if enabled)
      if (options.enableOCRExtraction) {
        try {
          const ocrCaptions = await this.extractOCRCaptions(
            userId,
            filePath,
            null, // contentId
            null, // fileId
            options.ocrOptions || this.config.ocrOptions
          );
          results.results.ocrCaptions = ocrCaptions;
          this.updateProgress(80, 'OCR captions extracted');
        } catch (error) {
          this.addWarning(results, 'Failed to extract OCR captions', 'ocr_extraction');
        }
      }

      // Analyze video quality (if enabled)
      if (options.enableQualityAnalysis) {
        try {
          const qualityAnalysis = await this.analyzeVideoQuality(filePath);
          results.results.qualityAnalysis = qualityAnalysis;
          this.updateProgress(85, 'Video quality analyzed');
        } catch (error) {
          this.addWarning(results, 'Failed to analyze video quality', 'quality_analysis');
        }
      }

      // Update video analysis completion
      await videoAnalysis.update({
        status: 'ready',
        progress: 100,
        completed_at: new Date(),
        objects_detected: {
          totalFrames: results.results.ocrCaptions?.length || 0,
          hasAudio: !!results.results.audioPath,
          hasThumbnails: !!results.results.thumbnails
        }
      });

      this.updateProgress(100, 'Video processing completed');
      return this.finalizeResults(results);

    } catch (error) {
      this.addError(results, error, 'video_processing');
      
      if (results.results.videoAnalysis) {
        await results.results.videoAnalysis.update({
          status: 'failed',
          error_message: error.message,
          progress: 0
        });
      }
      
      return this.finalizeResults(results);
    }
  }

  /**
   * Validate video file
   * 
   * @param {string} filePath - Path to the video file
   * @param {string} fileType - MIME type of the file
   * @returns {Promise<boolean>} Validation result
   */
  async validate(filePath, fileType) {
    try {
      // Basic file validation from parent
      this.validateFile(filePath);
      
      // Video-specific validation
      const extension = path.extname(filePath).toLowerCase();
      if (!this.config.supportedVideoFormats.includes(extension)) {
        throw new Error(`Unsupported video format: ${extension}`);
      }
      
      // Check if file can be read by ffmpeg
      try {
        await this.getVideoMetadata(filePath);
      } catch (error) {
        throw new Error(`Invalid or corrupted video file: ${error.message}`);
      }
      
      if (this.enableLogging) {
        this.log(`Video file validation passed: ${path.basename(filePath)}`);
      }
      
      return true;
    } catch (error) {
      if (this.enableLogging) {
        console.error(`❌ Video validation failed:`, error);
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
      // Clean up temporary video files
      const tempPattern = path.join(this.config.tempDir, 'videoprocessor_*');
      const audioPattern = path.join(this.config.tempDir, 'audio_*');
      const framePattern = path.join(this.config.tempDir, 'frame_*');
      
      // Clean up expired thumbnails
      if (userId) {
        await this.cleanupExpiredThumbnails(userId);
      }
      
      if (this.enableLogging) {
        this.log('Video processor cleanup completed');
      }
    } catch (error) {
      if (this.enableLogging) {
        console.error('❌ Video processor cleanup failed:', error);
      }
    }
  }

  /**
   * Get supported file types
   * 
   * @returns {Array<string>} Array of supported file extensions
   */
  getSupportedTypes() {
    return this.config.supportedVideoFormats;
  }

  /**
   * Get processor capabilities
   * 
   * @returns {Object} Processor capabilities and features
   */
  getCapabilities() {
    return {
      processorType: 'video',
      supportedFormats: this.config.supportedVideoFormats,
      features: {
        frameExtraction: true,
        audioExtraction: true,
        metadataAnalysis: true,
        ocrCaption: !!this.visionClient,
        thumbnailGeneration: true,
        qualityAnalysis: true,
        sceneDetection: false, // TODO: Implement
        faceDetection: !!this.visionClient,
        objectDetection: !!this.visionClient
      },
      limits: {
        maxFileSize: this.config.maxFileSize,
        maxFrames: this.config.maxFrames,
        maxDuration: 7200 // 2 hours
      },
      outputFormats: {
        audio: this.config.audioFormats,
        frames: this.config.frameFormats,
        thumbnails: ['jpg', 'png', 'webp']
      }
    };
  }

  /**
   * Initialize Google Vision client for OCR
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
          this.log('No Google Vision credentials - OCR features will be limited');
        }
      }
    } catch (error) {
      throw new Error(`Failed to initialize Google Vision client: ${error.message}`);
    }
  }

  /**
   * Ensure video-specific directories exist
   */
  ensureVideoDirectories() {
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
   * Extract audio from video file
   * @param {string} videoPath - Path to video file
   * @param {Object} options - Extraction options
   * @returns {Promise<string>} Path to extracted audio file
   */
  async extractAudioFromVideo(videoPath, options = {}) {
    return this.executeWithRetry(async () => {
      const audioPath = this.generateTempPath('.wav');
      
      await new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .audioCodec(options.audioCodec || 'pcm_s16le')
          .audioChannels(options.audioChannels || 1)
          .audioFrequency(options.audioFrequency || 16000)
          .format('wav')
          .output(audioPath)
          .on('end', () => resolve(audioPath))
          .on('error', reject)
          .run();
      });
      
      return audioPath;
    }, 'extract audio from video');
  }

  /**
   * Extract frame from video
   * @param {string} videoPath - Path to video file
   * @param {string} timestamp - Timestamp to extract (default: 00:00:01)
   * @returns {Promise<string>} Path to extracted frame
   */
  async extractVideoFrame(videoPath, timestamp = '00:00:01') {
    return this.executeWithRetry(async () => {
      const framePath = this.generateTempPath('.jpg');
      
      await new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .seekInput(timestamp)
          .frames(1)
          .output(framePath)
          .on('end', () => resolve(framePath))
          .on('error', reject)
          .run();
      });
      
      return framePath;
    }, 'extract video frame');
  }

  /**
   * Get video metadata
   * @param {string} videoPath - Path to video file
   * @returns {Promise<Object>} Video metadata
   */
  async getVideoMetadata(videoPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata);
      });
    });
  }

  /**
   * Generate video thumbnails
   * @param {string} userId - User ID
   * @param {string} videoPath - Path to video file
   * @param {Object} options - Thumbnail options
   * @returns {Promise<Array>} Array of generated thumbnails
   */
  async generateVideoThumbnails(userId, videoPath, options = {}) {
    try {
      const thumbnails = [];
      const metadata = await this.getVideoMetadata(videoPath);
      const duration = metadata.format.duration;
      const count = options.keyMomentsCount || this.config.thumbnailOptions.keyMomentsCount;
      
      for (let i = 0; i < count; i++) {
        const timestamp = Math.floor((duration / count) * i);
        const thumbnailPath = await this.extractVideoFrame(videoPath, `00:00:${timestamp.toString().padStart(2, '0')}`);
        
        // Save thumbnail to database
        const thumbnail = await Thumbnail.create({
          id: uuidv4(),
          user_id: userId,
          file_path: thumbnailPath,
          thumbnail_type: 'key_moment',
          thumbnail_size: options.thumbnailSize || this.config.thumbnailOptions.thumbnailSize,
          timestamp: timestamp,
          created_at: new Date(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        });
        
        thumbnails.push(thumbnail);
      }
      
      return thumbnails;
    } catch (error) {
      if (this.enableLogging) {
        console.error('❌ Failed to generate video thumbnails:', error);
      }
      throw error;
    }
  }

  /**
   * Extract OCR captions from video frames
   * @param {string} userId - User ID
   * @param {string} videoPath - Path to video file
   * @param {string} contentId - Content ID (optional)
   * @param {string} fileId - File ID (optional)
   * @param {Object} options - OCR options
   * @returns {Promise<Array>} Array of OCR captions
   */
  async extractOCRCaptions(userId, videoPath, contentId = null, fileId = null, options = {}) {
    try {
      if (!this.visionClient) {
        throw new Error('Google Vision client not initialized');
      }

      const metadata = await this.getVideoMetadata(videoPath);
      const duration = parseFloat(metadata.format.duration);
      
      if (isNaN(duration) || duration <= 0) {
        throw new Error('Invalid video duration');
      }

      const frameInterval = options.frameInterval || this.config.ocrOptions.frameInterval;
      const maxFrames = options.maxFrames || this.config.ocrOptions.maxFrames;
      const confidenceThreshold = options.confidenceThreshold || this.config.ocrOptions.confidenceThreshold;

      const totalFrames = Math.min(Math.floor(duration / frameInterval), maxFrames);
      const ocrCaptions = [];

      if (this.enableLogging) {
        this.log(`Extracting OCR from ${totalFrames} frames`);
      }

      for (let i = 0; i < totalFrames; i++) {
        try {
          const timestamp = i * frameInterval;
          const timeString = this.formatTimestamp(timestamp);
          const framePath = await this.extractVideoFrame(videoPath, timeString);
          
          const ocrResult = await this.performOCROnFrame(framePath, timestamp, options);
          
          if (ocrResult && ocrResult.text && ocrResult.text.length > 0) {
            const ocrCaption = await OCRCaption.create({
              id: uuidv4(),
              user_id: userId,
              content_id: contentId,
              file_id: fileId,
              timestamp: timestamp,
              text: ocrResult.text,
              confidence: ocrResult.confidence,
              language: ocrResult.language || 'en',
              bounding_boxes: JSON.stringify(ocrResult.boundingBoxes || []),
              frame_path: framePath,
              created_at: new Date()
            });
            
            ocrCaptions.push(ocrCaption);
          }
          
          // Clean up frame after processing
          this.cleanupTempFile(framePath);
          
        } catch (frameError) {
          if (this.enableLogging) {
            console.warn(`⚠️ Failed to process frame ${i}:`, frameError);
          }
        }
      }

      if (this.enableLogging) {
        this.log(`Extracted ${ocrCaptions.length} OCR captions from video`);
      }

      return ocrCaptions;
    } catch (error) {
      if (this.enableLogging) {
        console.error('❌ OCR caption extraction failed:', error);
      }
      throw error;
    }
  }

  /**
   * Perform OCR on a single frame
   * @param {string} framePath - Path to frame image
   * @param {number} timestamp - Timestamp of the frame
   * @param {Object} options - OCR options
   * @returns {Promise<Object>} OCR result
   */
  async performOCROnFrame(framePath, timestamp, options) {
    try {
      const [result] = await this.visionClient.textDetection(framePath);
      const detections = result.textAnnotations;
      
      if (!detections || detections.length === 0) {
        return null;
      }
      
      const fullText = detections[0];
      const confidence = fullText.score || 0.5;
      
      if (confidence < (options.confidenceThreshold || this.config.ocrOptions.confidenceThreshold)) {
        return null;
      }
      
      const boundingBoxes = detections.slice(1).map(detection => ({
        text: detection.description,
        vertices: detection.boundingPoly.vertices,
        confidence: detection.score || 0.5
      }));
      
      return {
        text: fullText.description,
        confidence: confidence,
        language: 'en', // TODO: Detect language
        boundingBoxes: boundingBoxes,
        timestamp: timestamp
      };
    } catch (error) {
      if (this.enableLogging) {
        console.error('❌ OCR processing failed for frame:', error);
      }
      throw error;
    }
  }

  /**
   * Analyze video quality
   * @param {string} videoPath - Path to video file
   * @returns {Promise<Object>} Quality analysis result
   */
  async analyzeVideoQuality(videoPath) {
    try {
      const metadata = await this.getVideoMetadata(videoPath);
      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      
      if (!videoStream) {
        throw new Error('No video stream found');
      }
      
      return {
        resolution: {
          width: videoStream.width,
          height: videoStream.height,
          quality: this.getResolutionQuality(videoStream.width, videoStream.height)
        },
        frameRate: eval(videoStream.r_frame_rate || '0'),
        bitRate: parseInt(videoStream.bit_rate) || 0,
        codec: videoStream.codec_name,
        duration: parseFloat(metadata.format.duration),
        fileSize: parseInt(metadata.format.size),
        overallQuality: this.calculateOverallQuality(videoStream, metadata.format)
      };
    } catch (error) {
      if (this.enableLogging) {
        console.error('❌ Video quality analysis failed:', error);
      }
      throw error;
    }
  }

  /**
   * Get resolution quality rating
   * @param {number} width - Video width
   * @param {number} height - Video height
   * @returns {string} Quality rating
   */
  getResolutionQuality(width, height) {
    if (width >= 3840 && height >= 2160) return '4K';
    if (width >= 1920 && height >= 1080) return 'HD';
    if (width >= 1280 && height >= 720) return 'HD Ready';
    if (width >= 854 && height >= 480) return 'SD';
    return 'Low';
  }

  /**
   * Calculate overall video quality score
   * @param {Object} videoStream - Video stream metadata
   * @param {Object} format - Format metadata
   * @returns {number} Quality score (0-100)
   */
  calculateOverallQuality(videoStream, format) {
    let score = 0;
    
    // Resolution score (40%)
    const pixels = videoStream.width * videoStream.height;
    if (pixels >= 8294400) score += 40; // 4K
    else if (pixels >= 2073600) score += 35; // HD
    else if (pixels >= 921600) score += 25; // HD Ready
    else if (pixels >= 409920) score += 15; // SD
    else score += 5; // Low
    
    // Frame rate score (20%)
    const frameRate = eval(videoStream.r_frame_rate || '0');
    if (frameRate >= 60) score += 20;
    else if (frameRate >= 30) score += 15;
    else if (frameRate >= 24) score += 10;
    else score += 5;
    
    // Bit rate score (30%)
    const bitRate = parseInt(videoStream.bit_rate) || 0;
    if (bitRate >= 10000000) score += 30; // 10 Mbps+
    else if (bitRate >= 5000000) score += 25; // 5 Mbps+
    else if (bitRate >= 2000000) score += 20; // 2 Mbps+
    else if (bitRate >= 1000000) score += 15; // 1 Mbps+
    else score += 5;
    
    // Codec score (10%)
    if (['h264', 'h265', 'vp9'].includes(videoStream.codec_name)) {
      score += 10;
    } else {
      score += 5;
    }
    
    return Math.min(100, score);
  }

  /**
   * Format timestamp for ffmpeg
   * @param {number} seconds - Timestamp in seconds
   * @returns {string} Formatted timestamp
   */
  formatTimestamp(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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

module.exports = VideoProcessor; 