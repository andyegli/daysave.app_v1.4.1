'use strict';

/**
 * Migration: Create Video Analysis Table
 * 
 * Creates the video_analysis table for storing comprehensive video analysis results
 * including technical metadata, object detection results, frame analysis, and processing
 * statistics. This table provides detailed insights into video content structure and properties.
 * 
 * Features:
 * - UUID primary keys for all records
 * - Video metadata and technical specifications
 * - Frame-by-frame analysis results
 * - Object detection and recognition data
 * - Video processing statistics and performance metrics
 * - Comprehensive indexing for performance
 * 
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  /**
   * Create video_analysis table with all required fields and indexes
   * 
   * @param {import('sequelize').QueryInterface} queryInterface - Sequelize query interface
   * @param {import('sequelize').Sequelize} Sequelize - Sequelize constructor
   */
  async up(queryInterface, Sequelize) {
    console.log('Creating video_analysis table...');
    
    await queryInterface.createTable('video_analysis', {
      /**
       * Primary Key - UUID
       * Unique identifier for each video analysis record
       */
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        allowNull: false,
        comment: 'Unique UUID identifier for the video analysis'
      },

      /**
       * User Association
       * Links video analysis to the user who owns the content
       */
      user_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'UUID of the user who owns the content this analysis belongs to'
      },

      /**
       * Content Association
       * Links video analysis to content record (for URL-based content)
       */
      content_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: {
          model: 'content',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'UUID of the content record this analysis belongs to (nullable for file-based content)'
      },

      /**
       * File Association
       * Links video analysis to file record (for uploaded files)
       */
      file_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: {
          model: 'files',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'UUID of the file record this analysis belongs to (nullable for URL-based content)'
      },

      /**
       * Video Duration
       * Total duration of the video in seconds
       */
      duration: {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: false,
        comment: 'Total duration of the video in seconds'
      },

      /**
       * Frame Count
       * Total number of frames in the video
       */
      frame_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Total number of frames in the video'
      },

      /**
       * Frame Rate
       * Frames per second (FPS) of the video
       */
      frame_rate: {
        type: Sequelize.DECIMAL(6, 3),
        allowNull: true,
        comment: 'Frames per second (FPS) of the video'
      },

      /**
       * Resolution
       * Video resolution information
       */
      resolution: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Video resolution and format information'
      },

      /**
       * Video Codec
       * Video codec information
       */
      video_codec: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Video codec and encoding information'
      },

      /**
       * Audio Codec
       * Audio codec information
       */
      audio_codec: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Audio codec and encoding information'
      },

      /**
       * File Size
       * Size of the video file in bytes
       */
      file_size: {
        type: Sequelize.BIGINT,
        allowNull: true,
        comment: 'Size of the video file in bytes'
      },

      /**
       * Container Format
       * Video container format (mp4, avi, mkv, etc.)
       */
      container_format: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Video container format (mp4, avi, mkv, etc.)'
      },

      /**
       * Objects Detected
       * Summary of objects detected throughout the video
       */
      objects_detected: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Summary of objects detected throughout the video'
      },

      /**
       * Frame Analysis Results
       * Detailed analysis results for individual frames
       */
      frame_analysis: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Detailed analysis results for individual frames'
      },

      /**
       * Scene Detection
       * Scene change detection and segmentation
       */
      scene_detection: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Scene change detection and segmentation results'
      },

      /**
       * Motion Analysis
       * Motion detection and analysis
       */
      motion_analysis: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Motion detection and analysis results'
      },

      /**
       * Quality Assessment
       * Video quality metrics and assessment
       */
      quality_assessment: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Video quality metrics and assessment'
      },

      /**
       * Content Analysis
       * High-level content analysis and categorization
       */
      content_analysis: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'High-level content analysis and categorization'
      },

      /**
       * Processing Statistics
       * Statistics about the analysis processing
       */
      processing_stats: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Statistics about the analysis processing'
      },

      /**
       * Analysis Method
       * Method/engine used for video analysis
       */
      analysis_method: {
        type: Sequelize.ENUM('ffmpeg', 'opencv', 'google_vision', 'azure_video', 'aws_rekognition', 'custom'),
        allowNull: false,
        defaultValue: 'ffmpeg',
        comment: 'Method/engine used for video analysis'
      },

      /**
       * Analysis Options
       * Configuration options used for the analysis
       */
      analysis_options: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Configuration options used for the analysis'
      },

      /**
       * Status
       * Current status of the video analysis
       */
      status: {
        type: Sequelize.ENUM('processing', 'ready', 'failed', 'partial', 'cancelled'),
        allowNull: false,
        defaultValue: 'processing',
        comment: 'Current status of the video analysis'
      },

      /**
       * Error Message
       * Error message if analysis failed
       */
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error message if analysis failed'
      },

      /**
       * Progress Percentage
       * Current progress of the analysis (0-100)
       */
      progress: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Current progress of the analysis (0-100)'
      },

      /**
       * Started At
       * When the analysis was started
       */
      started_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the analysis was started'
      },

      /**
       * Completed At
       * When the analysis was completed
       */
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the analysis was completed'
      },

      /**
       * Analysis Version
       * Version of the analysis algorithm/system used
       */
      analysis_version: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Version of the analysis algorithm/system used'
      },

      /**
       * Record Creation Timestamp
       */
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        comment: 'Timestamp when the record was created'
      },

      /**
       * Record Update Timestamp
       */
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        comment: 'Timestamp when the record was last updated'
      }
    });

    // Create indexes for performance optimization
    console.log('Creating indexes for video_analysis table...');
    
    await queryInterface.addIndex('video_analysis', {
      fields: ['user_id'],
      name: 'idx_video_analysis_user_id',
      comment: 'Index for user-based video analysis queries'
    });

    await queryInterface.addIndex('video_analysis', {
      fields: ['content_id'],
      name: 'idx_video_analysis_content_id',
      comment: 'Index for content-based video analysis queries'
    });

    await queryInterface.addIndex('video_analysis', {
      fields: ['file_id'],
      name: 'idx_video_analysis_file_id',
      comment: 'Index for file-based video analysis queries'
    });

    await queryInterface.addIndex('video_analysis', {
      fields: ['status'],
      name: 'idx_video_analysis_status',
      comment: 'Index for filtering video analysis by status'
    });

    await queryInterface.addIndex('video_analysis', {
      fields: ['duration'],
      name: 'idx_video_analysis_duration',
      comment: 'Index for sorting video analysis by duration'
    });

    await queryInterface.addIndex('video_analysis', {
      fields: ['analysis_method'],
      name: 'idx_video_analysis_method',
      comment: 'Index for filtering video analysis by method'
    });

    await queryInterface.addIndex('video_analysis', {
      fields: ['progress'],
      name: 'idx_video_analysis_progress',
      comment: 'Index for monitoring analysis progress'
    });

    await queryInterface.addIndex('video_analysis', {
      fields: ['completed_at'],
      name: 'idx_video_analysis_completed',
      comment: 'Index for sorting video analysis by completion date'
    });

    await queryInterface.addIndex('video_analysis', {
      fields: ['started_at'],
      name: 'idx_video_analysis_started',
      comment: 'Index for sorting video analysis by start date'
    });

    await queryInterface.addIndex('video_analysis', {
      fields: ['file_size'],
      name: 'idx_video_analysis_file_size',
      comment: 'Index for sorting video analysis by file size'
    });

    await queryInterface.addIndex('video_analysis', {
      fields: ['frame_count'],
      name: 'idx_video_analysis_frame_count',
      comment: 'Index for sorting video analysis by frame count'
    });

    await queryInterface.addIndex('video_analysis', {
      fields: ['analysis_version'],
      name: 'idx_video_analysis_version',
      comment: 'Index for filtering video analysis by version'
    });

    // Create composite indexes for common query patterns
    await queryInterface.addIndex('video_analysis', {
      fields: ['user_id', 'status'],
      name: 'idx_video_analysis_user_status',
      comment: 'Composite index for user-specific status queries'
    });

    await queryInterface.addIndex('video_analysis', {
      fields: ['status', 'progress'],
      name: 'idx_video_analysis_status_progress',
      comment: 'Composite index for monitoring processing queue'
    });

    console.log('Successfully created video_analysis table with indexes');
  },

  /**
   * Drop video_analysis table and all associated indexes
   * 
   * @param {import('sequelize').QueryInterface} queryInterface - Sequelize query interface
   * @param {import('sequelize').Sequelize} Sequelize - Sequelize constructor
   */
  async down(queryInterface, Sequelize) {
    console.log('Dropping video_analysis table...');
    await queryInterface.dropTable('video_analysis');
    console.log('Successfully dropped video_analysis table');
  }
}; 