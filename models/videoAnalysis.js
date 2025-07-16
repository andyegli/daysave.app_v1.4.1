const { v4: uuidv4 } = require('uuid');

/**
 * Video Analysis Model
 * 
 * Stores comprehensive video analysis results including technical metadata,
 * object detection results, frame analysis, and processing statistics.
 * This model provides detailed insights into video content structure and properties.
 * 
 * Features:
 * - Video metadata and technical specifications
 * - Frame-by-frame analysis results
 * - Object detection and recognition data
 * - Video processing statistics and performance metrics
 * - Quality assessment and content analysis
 * 
 * @param {Object} sequelize - Sequelize instance
 * @param {Object} DataTypes - Sequelize data types
 * @returns {Object} VideoAnalysis model
 */
module.exports = (sequelize, DataTypes) => {
  const VideoAnalysis = sequelize.define('VideoAnalysis', {
    /**
     * Primary Key - UUID
     * Unique identifier for each video analysis record
     */
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
      allowNull: false,
      comment: 'Unique UUID identifier for the video analysis'
    },

    /**
     * User Association
     * Links video analysis to the user who owns the content
     */
    user_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'UUID of the user who owns the content this analysis belongs to'
    },

    /**
     * Content Association
     * Links video analysis to content record (for URL-based content)
     */
    content_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      references: {
        model: 'content',
        key: 'id'
      },
      comment: 'UUID of the content record this analysis belongs to (nullable for file-based content)'
    },

    /**
     * File Association
     * Links video analysis to file record (for uploaded files)
     */
    file_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      references: {
        model: 'files',
        key: 'id'
      },
      comment: 'UUID of the file record this analysis belongs to (nullable for URL-based content)'
    },

    /**
     * Processing Job Association
     * Links video analysis to the processing job that generated it
     */
    processing_job_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      references: {
        model: 'processing_jobs',
        key: 'id'
      },
      comment: 'UUID of the processing job that generated this analysis'
    },

    /**
     * Video Duration
     * Total duration of the video in seconds
     */
    duration: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: false,
      comment: 'Total duration of the video in seconds'
    },

    /**
     * Frame Count
     * Total number of frames in the video
     */
    frame_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Total number of frames in the video'
    },

    /**
     * Frame Rate
     * Frames per second (FPS) of the video
     */
    frame_rate: {
      type: DataTypes.DECIMAL(6, 3),
      allowNull: true,
      comment: 'Frames per second (FPS) of the video'
    },

    /**
     * Resolution
     * Video resolution information
     * Structure: {
     *   width: number,
     *   height: number,
     *   aspectRatio: string,
     *   pixelFormat: string,
     *   colorSpace: string,
     *   bitDepth: number
     * }
     */
    resolution: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Video resolution and format information'
    },

    /**
     * Video Codec
     * Video codec information
     * Structure: {
     *   codec: string,
     *   profile: string,
     *   level: string,
     *   bitrate: number,
     *   maxBitrate: number,
     *   bufferSize: number
     * }
     */
    video_codec: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Video codec and encoding information'
    },

    /**
     * Audio Codec
     * Audio codec information
     * Structure: {
     *   codec: string,
     *   sampleRate: number,
     *   channels: number,
     *   bitrate: number,
     *   channelLayout: string
     * }
     */
    audio_codec: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Audio codec and encoding information'
    },

    /**
     * File Size
     * Size of the video file in bytes
     */
    file_size: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: 'Size of the video file in bytes'
    },

    /**
     * Container Format
     * Video container format (mp4, avi, mkv, etc.)
     */
    container_format: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Video container format (mp4, avi, mkv, etc.)'
    },

    /**
     * Objects Detected
     * Summary of objects detected throughout the video
     * Structure: {
     *   totalObjects: number,
     *   uniqueObjects: number,
     *   objectCounts: { objectName: count },
     *   averageConfidence: number,
     *   detectionFrames: number,
     *   topObjects: [{ name: string, count: number, confidence: number }]
     * }
     */
    objects_detected: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Summary of objects detected throughout the video'
    },

    /**
     * Frame Analysis Results
     * Detailed analysis results for individual frames
     * Structure: [
     *   {
     *     frameNumber: number,
     *     timestamp: string,
     *     timestampSeconds: number,
     *     objects: [{ name: string, confidence: number, boundingBox: object }],
     *     labels: [{ name: string, confidence: number }],
     *     text: [{ text: string, confidence: number, coordinates: object }],
     *     faces: [{ confidence: number, emotions: object, landmarks: object }],
     *     colors: [{ color: string, percentage: number }],
     *     quality: { sharpness: number, brightness: number, contrast: number }
     *   }
     * ]
     */
    frame_analysis: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Detailed analysis results for individual frames'
    },

    /**
     * Scene Detection
     * Scene change detection and segmentation
     * Structure: {
     *   totalScenes: number,
     *   averageSceneLength: number,
     *   scenes: [
     *     {
     *       sceneNumber: number,
     *       startTime: number,
     *       endTime: number,
     *       duration: number,
     *       keyFrame: string,
     *       description: string,
     *       dominantColors: array,
     *       objects: array
     *     }
     *   ]
     * }
     */
    scene_detection: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Scene change detection and segmentation results'
    },

    /**
     * Motion Analysis
     * Motion detection and analysis
     * Structure: {
     *   averageMotion: number,
     *   motionIntensity: string,
     *   motionAreas: [{ timestamp: number, intensity: number, regions: array }],
     *   staticPeriods: [{ start: number, end: number, duration: number }],
     *   dynamicPeriods: [{ start: number, end: number, duration: number }]
     * }
     */
    motion_analysis: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Motion detection and analysis results'
    },

    /**
     * Quality Assessment
     * Video quality metrics and assessment
     * Structure: {
     *   overallQuality: string,
     *   qualityScore: number,
     *   sharpness: { average: number, variance: number },
     *   brightness: { average: number, variance: number },
     *   contrast: { average: number, variance: number },
     *   colorfulness: number,
     *   noise: number,
     *   compression: number,
     *   artifacts: [{ type: string, severity: string, frames: array }]
     * }
     */
    quality_assessment: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Video quality metrics and assessment'
    },

    /**
     * Content Analysis
     * High-level content analysis and categorization
     * Structure: {
     *   contentType: string,
     *   genre: string,
     *   themes: array,
     *   mood: string,
     *   pace: string,
     *   visualStyle: string,
     *   colorPalette: array,
     *   lighting: string,
     *   cameraWork: string,
     *   editingStyle: string
     * }
     */
    content_analysis: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'High-level content analysis and categorization'
    },

    /**
     * Processing Statistics
     * Statistics about the analysis processing
     * Structure: {
     *   processingTime: number,
     *   framesProcessed: number,
     *   framesSkipped: number,
     *   processingSpeed: number,
     *   memoryUsage: number,
     *   cpuUsage: number,
     *   errors: array,
     *   warnings: array,
     *   processingSteps: array
     * }
     */
    processing_stats: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Statistics about the analysis processing'
    },

    /**
     * Analysis Method
     * Method/engine used for video analysis
     * - ffmpeg: FFmpeg-based analysis
     * - opencv: OpenCV-based analysis
     * - google_vision: Google Cloud Vision API
     * - azure_video: Azure Video Analyzer
     * - aws_rekognition: AWS Rekognition Video
     * - custom: Custom analysis implementation
     */
    analysis_method: {
      type: DataTypes.ENUM('ffmpeg', 'opencv', 'google_vision', 'azure_video', 'aws_rekognition', 'custom'),
      allowNull: false,
      defaultValue: 'ffmpeg',
      comment: 'Method/engine used for video analysis'
    },

    /**
     * Analysis Options
     * Configuration options used for the analysis
     * Structure: {
     *   frameInterval: number,
     *   maxFrames: number,
     *   objectDetection: boolean,
     *   sceneDetection: boolean,
     *   motionAnalysis: boolean,
     *   qualityAssessment: boolean,
     *   contentAnalysis: boolean,
     *   customOptions: object
     * }
     */
    analysis_options: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Configuration options used for the analysis'
    },

    /**
     * Status
     * Current status of the video analysis
     * - processing: Analysis is being processed
     * - ready: Analysis is complete and ready
     * - failed: Analysis processing failed
     * - partial: Analysis completed with some failures
     * - cancelled: Analysis was cancelled
     */
    status: {
      type: DataTypes.ENUM('processing', 'ready', 'failed', 'partial', 'cancelled'),
      allowNull: false,
      defaultValue: 'processing',
      comment: 'Current status of the video analysis'
    },

    /**
     * Error Message
     * Error message if analysis failed
     */
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error message if analysis failed'
    },

    /**
     * Progress Percentage
     * Current progress of the analysis (0-100)
     */
    progress: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      },
      comment: 'Current progress of the analysis (0-100)'
    },

    /**
     * Started At
     * When the analysis was started
     */
    started_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the analysis was started'
    },

    /**
     * Completed At
     * When the analysis was completed
     */
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the analysis was completed'
    },

    /**
     * Analysis Version
     * Version of the analysis algorithm/system used
     */
    analysis_version: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Version of the analysis algorithm/system used'
    }
  }, {
    tableName: 'video_analysis',
    timestamps: true,
    comment: 'Stores comprehensive video analysis results and metadata',
    
    indexes: [
      {
        name: 'idx_video_analysis_user_id',
        fields: ['user_id']
      },
      {
        name: 'idx_video_analysis_content_id',
        fields: ['content_id']
      },
      {
        name: 'idx_video_analysis_file_id',
        fields: ['file_id']
      },
      {
        name: 'idx_video_analysis_status',
        fields: ['status']
      },
      {
        name: 'idx_video_analysis_duration',
        fields: ['duration']
      },
      {
        name: 'idx_video_analysis_method',
        fields: ['analysis_method']
      },
      {
        name: 'idx_video_analysis_progress',
        fields: ['progress']
      },
      {
        name: 'idx_video_analysis_completed',
        fields: ['completed_at']
      }
    ]
  });

  /**
   * Model Associations
   * Defines relationships between VideoAnalysis and other models
   */
  VideoAnalysis.associate = (models) => {
    // VideoAnalysis belongs to a User
    VideoAnalysis.belongsTo(models.User, { 
      foreignKey: 'user_id',
      as: 'user',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // VideoAnalysis belongs to Content (nullable)
    VideoAnalysis.belongsTo(models.Content, { 
      foreignKey: 'content_id',
      as: 'content',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // VideoAnalysis belongs to File (nullable)
    VideoAnalysis.belongsTo(models.File, { 
      foreignKey: 'file_id',
      as: 'file',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // VideoAnalysis belongs to ProcessingJob (nullable)
    VideoAnalysis.belongsTo(models.ProcessingJob, { 
      foreignKey: 'processing_job_id',
      as: 'processingJob',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    // VideoAnalysis has many Thumbnails
    VideoAnalysis.hasMany(models.Thumbnail, { 
      foreignKey: 'video_analysis_id',
      as: 'thumbnails',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // VideoAnalysis has many OCR Captions
    VideoAnalysis.hasMany(models.OCRCaption, { 
      foreignKey: 'video_analysis_id',
      as: 'ocrCaptions',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  };

  /**
   * Hooks
   */
  VideoAnalysis.addHook('beforeSave', (analysis) => {
    // Update completed_at when status changes to ready
    if (analysis.status === 'ready' && !analysis.completed_at) {
      analysis.completed_at = new Date();
      analysis.progress = 100;
    }
    
    // Set started_at if not set and status is processing
    if (analysis.status === 'processing' && !analysis.started_at) {
      analysis.started_at = new Date();
    }
  });

  /**
   * Instance Methods
   */

  /**
   * Get formatted duration
   * @returns {string} Formatted duration (HH:MM:SS)
   */
  VideoAnalysis.prototype.getFormattedDuration = function() {
    const seconds = Math.floor(this.duration);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Get processing time in seconds
   * @returns {number} Processing time in seconds
   */
  VideoAnalysis.prototype.getProcessingTime = function() {
    if (!this.started_at || !this.completed_at) return null;
    return (this.completed_at - this.started_at) / 1000;
  };

  /**
   * Get analysis summary
   * @returns {Object} Summary of analysis results
   */
  VideoAnalysis.prototype.getSummary = function() {
    const summary = {
      duration: this.getFormattedDuration(),
      status: this.status,
      progress: this.progress,
      fileSize: this.file_size,
      resolution: this.resolution,
      frameCount: this.frame_count,
      frameRate: this.frame_rate
    };

    if (this.objects_detected) {
      summary.objectsDetected = this.objects_detected.totalObjects || 0;
      summary.uniqueObjects = this.objects_detected.uniqueObjects || 0;
    }

    if (this.scene_detection) {
      summary.totalScenes = this.scene_detection.totalScenes || 0;
    }

    if (this.quality_assessment) {
      summary.qualityScore = this.quality_assessment.qualityScore || 0;
    }

    return summary;
  };

  /**
   * Update progress
   * @param {number} progress - Progress percentage (0-100)
   * @param {string} status - Optional status update
   */
  VideoAnalysis.prototype.updateProgress = function(progress, status = null) {
    this.progress = Math.min(100, Math.max(0, progress));
    if (status) this.status = status;
    
    if (progress >= 100) {
      this.status = 'ready';
      this.completed_at = new Date();
    }
  };

  /**
   * Add processing error
   * @param {string} error - Error message
   */
  VideoAnalysis.prototype.addError = function(error) {
    if (!this.processing_stats) {
      this.processing_stats = { errors: [], warnings: [] };
    }
    
    if (!this.processing_stats.errors) {
      this.processing_stats.errors = [];
    }
    
    this.processing_stats.errors.push({
      timestamp: new Date().toISOString(),
      message: error
    });
  };

  /**
   * Class Methods
   */

  /**
   * Get analysis by content or file
   * @param {string} contentId - Content ID (optional)
   * @param {string} fileId - File ID (optional)
   * @returns {Promise<Object>} Video analysis or null
   */
  VideoAnalysis.getByContentOrFile = async function(contentId = null, fileId = null) {
    const where = {};
    if (contentId) where.content_id = contentId;
    if (fileId) where.file_id = fileId;
    
    return await this.findOne({ where });
  };

  /**
   * Get analysis statistics for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Analysis statistics
   */
  VideoAnalysis.getUserStats = async function(userId) {
    const analyses = await this.findAll({
      where: { user_id: userId }
    });

    const totalDuration = analyses.reduce((sum, a) => sum + parseFloat(a.duration || 0), 0);
    const totalFileSize = analyses.reduce((sum, a) => sum + parseInt(a.file_size || 0), 0);
    
    const byStatus = {};
    const byMethod = {};
    
    analyses.forEach(analysis => {
      byStatus[analysis.status] = (byStatus[analysis.status] || 0) + 1;
      byMethod[analysis.analysis_method] = (byMethod[analysis.analysis_method] || 0) + 1;
    });

    return {
      totalAnalyses: analyses.length,
      totalDuration,
      totalFileSize,
      byStatus,
      byMethod,
      averageDuration: analyses.length > 0 ? totalDuration / analyses.length : 0,
      averageFileSize: analyses.length > 0 ? totalFileSize / analyses.length : 0
    };
  };

  /**
   * Get recent analyses
   * @param {string} userId - User ID
   * @param {number} limit - Number of analyses to return
   * @returns {Promise<Array>} Recent analyses
   */
  VideoAnalysis.getRecent = async function(userId, limit = 10) {
    return await this.findAll({
      where: { user_id: userId },
      order: [['createdAt', 'DESC']],
      limit,
      include: [
        { model: sequelize.models.Content, as: 'content' },
        { model: sequelize.models.File, as: 'file' }
      ]
    });
  };

  /**
   * Clean up failed analyses older than specified days
   * @param {number} days - Number of days to keep failed analyses
   * @returns {Promise<number>} Number of analyses cleaned up
   */
  VideoAnalysis.cleanupFailed = async function(days = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await this.destroy({
      where: {
        status: 'failed',
        createdAt: { [sequelize.Sequelize.Op.lt]: cutoffDate }
      }
    });

    return result;
  };

  /**
   * Get processing queue status
   * @returns {Promise<Object>} Queue status
   */
  VideoAnalysis.getQueueStatus = async function() {
    const processing = await this.count({ where: { status: 'processing' } });
    const pending = await this.count({ where: { status: 'pending' } });
    const failed = await this.count({ where: { status: 'failed' } });
    
    return {
      processing,
      pending,
      failed,
      total: processing + pending + failed
    };
  };

  return VideoAnalysis;
}; 