/**
 * ThumbnailGenerator Service
 * 
 * Handles thumbnail generation for multimedia content including video thumbnails,
 * key moments extraction, and image resizing. Integrates with DaySave database
 * models for persistent storage and management.
 * 
 * Features:
 * - Video thumbnail generation from frames
 * - Key moments extraction with animated previews
 * - Image thumbnail generation with multiple sizes
 * - Thumbnail metadata storage and management
 * - Automatic cleanup and expiry handling
 * - Performance optimization with caching
 * 
 * @author DaySave Integration Team
 * @version 1.0.0
 */

const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// DaySave models
const { Thumbnail } = require('../../models');

/**
 * ThumbnailGenerator Class
 * 
 * Handles all thumbnail generation operations with database integration
 */
class ThumbnailGenerator {
  /**
   * Initialize the ThumbnailGenerator service
   * 
   * @param {Object} options - Configuration options
   * @param {string} options.thumbnailDir - Directory for storing thumbnails
   * @param {string} options.tempDir - Directory for temporary files
   * @param {boolean} options.enableLogging - Enable detailed logging (default: true)
   * @param {number} options.defaultQuality - Default thumbnail quality (default: 80)
   */
  constructor(options = {}) {
    this.enableLogging = options.enableLogging !== false;
    this.defaultQuality = options.defaultQuality || 80;
    
    // Configuration
    this.config = {
      thumbnailDir: options.thumbnailDir || 'uploads/thumbnails',
      tempDir: options.tempDir || 'uploads/temp',
      defaultSizes: [150, 300, 500],
      maxThumbnailSize: 1920,
      supportedFormats: ['.jpg', '.jpeg', '.png', '.webp'],
      keyMomentInterval: 10, // seconds
      maxKeyMoments: 10,
      compressionQuality: {
        low: 60,
        medium: 80,
        high: 95
      }
    };
    
    // Ensure directories exist
    this.ensureDirectories();
    
    if (this.enableLogging) {
      console.log('🖼️ ThumbnailGenerator service initialized');
    }
  }

  /**
   * Ensure required directories exist
   */
  ensureDirectories() {
    const dirs = [this.config.thumbnailDir, this.config.tempDir];
    
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Normalize quality value to database ENUM
   * Converts numeric quality to 'low', 'medium', 'high' for database storage
   * 
   * @param {string|number} quality - Quality value to normalize
   * @returns {string} Normalized quality ('low', 'medium', or 'high')
   */
  normalizeQuality(quality) {
    // If already a string, validate and return
    if (typeof quality === 'string') {
      const validValues = ['low', 'medium', 'high'];
      return validValues.includes(quality) ? quality : 'medium';
    }

    // Convert numeric quality to ENUM
    if (typeof quality === 'number') {
      if (quality <= 70) return 'low';
      if (quality <= 85) return 'medium';
      return 'high';
    }

    // Default fallback
    return 'medium';
  }

  /**
   * Generate thumbnails for video content
   * 
   * @param {string} userId - User ID
   * @param {string} videoPath - Path to video file
   * @param {string} contentId - Content ID (optional)
   * @param {string} fileId - File ID (optional)
   * @param {Object} options - Thumbnail generation options
   * @returns {Promise<Object>} Thumbnail generation results
   */
  async generateVideoThumbnails(userId, videoPath, contentId = null, fileId = null, options = {}) {
    try {
      if (!userId || !videoPath) {
        throw new Error('User ID and video path are required');
      }

      if (this.enableLogging) {
        console.log('🎬 Generating video thumbnails:', {
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
      const thumbnailOptions = {
        thumbnailSize: options.thumbnailSize || 300,
        keyMomentsCount: Math.min(options.keyMomentsCount || 5, this.config.maxKeyMoments),
        keyMomentsSize: options.keyMomentsSize || 200,
        quality: options.quality || 'medium',
        includeMainThumbnail: options.includeMainThumbnail !== false,
        includeKeyMoments: options.includeKeyMoments !== false,
        ...options
      };

      const results = {
        mainThumbnail: null,
        keyMoments: [],
        metadata: {
          duration,
          totalThumbnails: 0,
          processingTime: 0
        }
      };

      const startTime = Date.now();

      // Generate main thumbnail (first frame or specified time)
      if (thumbnailOptions.includeMainThumbnail) {
        results.mainThumbnail = await this.generateMainThumbnail(
          userId,
          videoPath,
          contentId,
          fileId,
          thumbnailOptions
        );
      }

      // Generate key moments
      if (thumbnailOptions.includeKeyMoments && thumbnailOptions.keyMomentsCount > 0) {
        results.keyMoments = await this.generateKeyMoments(
          userId,
          videoPath,
          contentId,
          fileId,
          duration,
          thumbnailOptions
        );
      }

      // Update results metadata
      results.metadata.totalThumbnails = (results.mainThumbnail ? 1 : 0) + results.keyMoments.length;
      results.metadata.processingTime = Date.now() - startTime;

      if (this.enableLogging) {
        console.log('✅ Video thumbnails generated:', {
          mainThumbnail: !!results.mainThumbnail,
          keyMoments: results.keyMoments.length,
          processingTime: `${results.metadata.processingTime}ms`
        });
      }

      return results;
    } catch (error) {
      console.error('❌ Video thumbnail generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate thumbnails for image content
   * 
   * @param {string} userId - User ID
   * @param {string} imagePath - Path to image file
   * @param {string} contentId - Content ID (optional)
   * @param {string} fileId - File ID (optional)
   * @param {Object} options - Thumbnail generation options
   * @returns {Promise<Object>} Thumbnail generation results
   */
  async generateImageThumbnails(userId, imagePath, contentId = null, fileId = null, options = {}) {
    try {
      if (!userId || !imagePath) {
        throw new Error('User ID and image path are required');
      }

      if (this.enableLogging) {
        console.log('🖼️ Generating image thumbnails:', {
          userId,
          imagePath: path.basename(imagePath),
          contentId,
          fileId
        });
      }

      // Configuration options
      const thumbnailOptions = {
        sizes: options.sizes || this.config.defaultSizes,
        quality: options.quality || 'medium',
        maintainAspectRatio: options.maintainAspectRatio !== false,
        ...options
      };

      const results = {
        thumbnails: [],
        metadata: {
          originalSize: null,
          totalThumbnails: 0,
          processingTime: 0
        }
      };

      const startTime = Date.now();

      // Get original image dimensions
      const originalStats = fs.statSync(imagePath);
      results.metadata.originalSize = originalStats.size;

      // Generate thumbnails for each size
      for (const size of thumbnailOptions.sizes) {
        const thumbnail = await this.generateImageThumbnail(
          userId,
          imagePath,
          contentId,
          fileId,
          size,
          thumbnailOptions
        );
        
        if (thumbnail) {
          results.thumbnails.push(thumbnail);
        }
      }

      // Update results metadata
      results.metadata.totalThumbnails = results.thumbnails.length;
      results.metadata.processingTime = Date.now() - startTime;

      if (this.enableLogging) {
        console.log('✅ Image thumbnails generated:', {
          thumbnails: results.thumbnails.length,
          sizes: thumbnailOptions.sizes,
          processingTime: `${results.metadata.processingTime}ms`
        });
      }

      return results;
    } catch (error) {
      console.error('❌ Image thumbnail generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate main thumbnail for video
   * 
   * @param {string} userId - User ID
   * @param {string} videoPath - Path to video file
   * @param {string} contentId - Content ID
   * @param {string} fileId - File ID
   * @param {Object} options - Thumbnail options
   * @returns {Promise<Object>} Main thumbnail record
   */
  async generateMainThumbnail(userId, videoPath, contentId, fileId, options) {
    try {
      const fileName = `${uuidv4()}_main.jpg`;
      const thumbnailPath = path.join(this.config.thumbnailDir, fileName);
      const timestamp = options.mainThumbnailTime || '00:00:01';

      // Generate thumbnail using FFmpeg
      await this.extractFrameWithFFmpeg(videoPath, thumbnailPath, timestamp, options.thumbnailSize);

      // Get thumbnail file stats
      const stats = fs.statSync(thumbnailPath);
      const dimensions = await this.getImageDimensions(thumbnailPath);

      // Create database record
      const thumbnail = await Thumbnail.create({
        id: uuidv4(),
        user_id: userId,
        content_id: contentId,
        file_id: fileId,
        thumbnail_type: 'main',
        file_path: path.relative(process.cwd(), thumbnailPath),
        file_name: fileName,
        file_size: stats.size,
        mime_type: 'image/jpeg',
        width: dimensions.width,
        height: dimensions.height,
        timestamp: timestamp,
        timestamp_seconds: this.timeStringToSeconds(timestamp),
        quality: options.quality,
        generation_method: 'ffmpeg',
        metadata: {
          originalVideo: path.basename(videoPath),
          generationTime: Date.now(),
          options: options
        },
        status: 'ready'
      });

      if (this.enableLogging) {
        console.log('✅ Main thumbnail generated:', {
          id: thumbnail.id,
          size: `${dimensions.width}x${dimensions.height}`,
          fileSize: `${Math.round(stats.size / 1024)}KB`
        });
      }

      return thumbnail;
    } catch (error) {
      console.error('❌ Main thumbnail generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate key moments for video
   * 
   * @param {string} userId - User ID
   * @param {string} videoPath - Path to video file
   * @param {string} contentId - Content ID
   * @param {string} fileId - File ID
   * @param {number} duration - Video duration in seconds
   * @param {Object} options - Thumbnail options
   * @returns {Promise<Array>} Array of key moment thumbnails
   */
  async generateKeyMoments(userId, videoPath, contentId, fileId, duration, options) {
    try {
      const keyMoments = [];
      const momentCount = options.keyMomentsCount;
      const interval = duration / (momentCount + 1);

      if (this.enableLogging) {
        console.log('🎬 Generating key moments:', {
          count: momentCount,
          interval: `${interval.toFixed(2)}s`,
          duration: `${duration.toFixed(2)}s`
        });
      }

      // Generate thumbnails at evenly distributed intervals
      for (let i = 1; i <= momentCount; i++) {
        const timestampSeconds = interval * i;
        const timestamp = this.secondsToTimeString(timestampSeconds);
        
        const fileName = `${uuidv4()}_key_${i}.jpg`;
        const thumbnailPath = path.join(this.config.thumbnailDir, fileName);

        try {
          // Generate thumbnail using FFmpeg
          await this.extractFrameWithFFmpeg(videoPath, thumbnailPath, timestamp, options.keyMomentsSize);

          // Get thumbnail file stats
          const stats = fs.statSync(thumbnailPath);
          const dimensions = await this.getImageDimensions(thumbnailPath);

          // Create database record
          const thumbnail = await Thumbnail.create({
            id: uuidv4(),
            user_id: userId,
            content_id: contentId,
            file_id: fileId,
            thumbnail_type: 'key_moment',
            file_path: path.relative(process.cwd(), thumbnailPath),
            file_name: fileName,
            file_size: stats.size,
            mime_type: 'image/jpeg',
            width: dimensions.width,
            height: dimensions.height,
            timestamp: timestamp,
            timestamp_seconds: timestampSeconds,
            key_moment_index: i,
            quality: options.quality,
            generation_method: 'ffmpeg',
            metadata: {
              originalVideo: path.basename(videoPath),
              generationTime: Date.now(),
              keyMomentScore: this.calculateKeyMomentScore(timestampSeconds, duration),
              options: options
            },
            status: 'ready'
          });

          keyMoments.push(thumbnail);

          if (this.enableLogging) {
            console.log(`✅ Key moment ${i} generated:`, {
              timestamp,
              size: `${dimensions.width}x${dimensions.height}`
            });
          }
        } catch (momentError) {
          console.error(`❌ Key moment ${i} generation failed:`, momentError);
          // Continue with other moments
        }
      }

      return keyMoments;
    } catch (error) {
      console.error('❌ Key moments generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate single image thumbnail
   * 
   * @param {string} userId - User ID
   * @param {string} imagePath - Path to image file
   * @param {string} contentId - Content ID
   * @param {string} fileId - File ID
   * @param {number} size - Thumbnail size
   * @param {Object} options - Thumbnail options
   * @returns {Promise<Object>} Thumbnail record
   */
  async generateImageThumbnail(userId, imagePath, contentId, fileId, size, options) {
    try {
      const fileName = `${uuidv4()}_${size}.jpg`;
      const thumbnailPath = path.join(this.config.thumbnailDir, fileName);

      // Generate thumbnail using FFmpeg (works for images too)
      await this.resizeImageWithFFmpeg(imagePath, thumbnailPath, size, options);

      // Get thumbnail file stats
      const stats = fs.statSync(thumbnailPath);
      const dimensions = await this.getImageDimensions(thumbnailPath);

      // Create database record
      const thumbnail = await Thumbnail.create({
        id: uuidv4(),
        user_id: userId,
        content_id: contentId,
        file_id: fileId,
        thumbnail_type: size === Math.max(...this.config.defaultSizes) ? 'main' : 'preview',
        file_path: path.relative(process.cwd(), thumbnailPath),
        file_name: fileName,
        file_size: stats.size,
        mime_type: 'image/jpeg',
        width: dimensions.width,
        height: dimensions.height,
        quality: this.normalizeQuality(options.quality),
        generation_method: 'ffmpeg',
        metadata: {
          originalImage: path.basename(imagePath),
          targetSize: size,
          generationTime: Date.now(),
          options: options
        },
        status: 'ready'
      });

      return thumbnail;
    } catch (error) {
      console.error('❌ Image thumbnail generation failed:', error);
      throw error;
    }
  }

  /**
   * Extract video frame using FFmpeg
   * 
   * @param {string} videoPath - Path to video file
   * @param {string} outputPath - Output path for frame
   * @param {string} timestamp - Timestamp to extract
   * @param {number} size - Thumbnail size
   * @returns {Promise<void>}
   */
  async extractFrameWithFFmpeg(videoPath, outputPath, timestamp, size) {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .seekInput(timestamp)
        .frames(1)
        .size(`${size}x?`)
        .aspect('16:9')
        .format('image2')
        .output(outputPath)
        .on('end', () => {
          if (this.enableLogging) {
            console.log('📸 Frame extracted:', {
              timestamp,
              output: path.basename(outputPath)
            });
          }
          resolve();
        })
        .on('error', (error) => {
          console.error('❌ Frame extraction failed:', error);
          reject(error);
        })
        .run();
    });
  }

  /**
   * Resize image using FFmpeg
   * 
   * @param {string} imagePath - Path to image file
   * @param {string} outputPath - Output path for resized image
   * @param {number} size - Target size
   * @param {Object} options - Resize options
   * @returns {Promise<void>}
   */
  async resizeImageWithFFmpeg(imagePath, outputPath, size, options) {
    return new Promise((resolve, reject) => {
      let command = ffmpeg(imagePath);

      if (options.maintainAspectRatio) {
        command = command.size(`${size}x?`);
      } else {
        command = command.size(`${size}x${size}`);
      }

      command
        .format('image2')
        .output(outputPath)
        .on('end', () => {
          if (this.enableLogging) {
            console.log('🖼️ Image resized:', {
              size: `${size}x${size}`,
              output: path.basename(outputPath)
            });
          }
          resolve();
        })
        .on('error', (error) => {
          console.error('❌ Image resize failed:', error);
          reject(error);
        })
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
   * Get image dimensions
   * 
   * @param {string} imagePath - Path to image file
   * @returns {Promise<Object>} Image dimensions
   */
  async getImageDimensions(imagePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(imagePath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          const stream = metadata.streams[0];
          resolve({
            width: stream.width,
            height: stream.height
          });
        }
      });
    });
  }

  /**
   * Clean up expired thumbnails
   * 
   * @param {string} userId - User ID (optional, for user-specific cleanup)
   * @returns {Promise<number>} Number of thumbnails cleaned up
   */
  async cleanupExpiredThumbnails(userId = null) {
    try {
      const where = {
        expires_at: {
          [require('sequelize').Op.lt]: new Date()
        }
      };

      if (userId) {
        where.user_id = userId;
      }

      const expiredThumbnails = await Thumbnail.findAll({ where });
      let cleanedCount = 0;

      for (const thumbnail of expiredThumbnails) {
        try {
          // Delete physical file
          const fullPath = path.join(process.cwd(), thumbnail.file_path);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }

          // Delete database record
          await thumbnail.destroy();
          cleanedCount++;
        } catch (error) {
          console.error(`❌ Failed to cleanup thumbnail ${thumbnail.id}:`, error);
        }
      }

      if (this.enableLogging && cleanedCount > 0) {
        console.log('🧹 Cleaned up expired thumbnails:', cleanedCount);
      }

      return cleanedCount;
    } catch (error) {
      console.error('❌ Thumbnail cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Get thumbnails for content or file
   * 
   * @param {string} contentId - Content ID (optional)
   * @param {string} fileId - File ID (optional)
   * @returns {Promise<Object>} Thumbnails organized by type
   */
  async getThumbnails(contentId = null, fileId = null) {
    try {
      const where = { status: 'ready' };
      if (contentId) where.content_id = contentId;
      if (fileId) where.file_id = fileId;

      const thumbnails = await Thumbnail.findAll({
        where,
        order: [['key_moment_index', 'ASC'], ['timestamp_seconds', 'ASC'], ['createdAt', 'ASC']]
      });

      // Organize by type
      const organized = {
        main: thumbnails.filter(t => t.thumbnail_type === 'main'),
        keyMoments: thumbnails.filter(t => t.thumbnail_type === 'key_moment'),
        preview: thumbnails.filter(t => t.thumbnail_type === 'preview'),
        grid: thumbnails.filter(t => t.thumbnail_type === 'grid'),
        custom: thumbnails.filter(t => t.thumbnail_type === 'custom')
      };

      return organized;
    } catch (error) {
      console.error('❌ Get thumbnails failed:', error);
      throw error;
    }
  }

  // Helper Methods

  /**
   * Convert time string to seconds
   * @param {string} timeString - Time string (HH:MM:SS)
   * @returns {number} Seconds
   */
  timeStringToSeconds(timeString) {
    const parts = timeString.split(':');
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
  }

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
   * Calculate key moment score based on position in video
   * @param {number} timestamp - Timestamp in seconds
   * @param {number} duration - Total duration in seconds
   * @returns {number} Score between 0 and 1
   */
  calculateKeyMomentScore(timestamp, duration) {
    // Simple scoring based on position (middle parts get higher scores)
    const position = timestamp / duration;
    
    if (position < 0.1 || position > 0.9) {
      return 0.3; // Beginning and end get lower scores
    } else if (position >= 0.3 && position <= 0.7) {
      return 1.0; // Middle section gets highest score
    } else {
      return 0.7; // Other sections get medium score
    }
  }
}

module.exports = ThumbnailGenerator; 