'use strict';

/**
 * Migration: Create Audio Analysis Table
 * 
 * Creates the audio_analysis table for storing comprehensive audio analysis results
 * including transcription, speaker diarization, sentiment analysis, and voice print matching.
 * This table provides detailed insights into audio content structure and speech analysis.
 * 
 * Features:
 * - UUID primary keys for all records
 * - Audio transcription with timestamp accuracy
 * - Speaker identification and diarization
 * - Voice print matching and speaker recognition
 * - Sentiment analysis and emotional detection
 * - Audio quality assessment and technical metadata
 * - Multi-language support and confidence scoring
 * 
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  /**
   * Create audio_analysis table with all required fields and indexes
   * 
   * @param {import('sequelize').QueryInterface} queryInterface - Sequelize query interface
   * @param {import('sequelize').Sequelize} Sequelize - Sequelize constructor
   */
  async up(queryInterface, Sequelize) {
    console.log('Creating audio_analysis table...');
    
    await queryInterface.createTable('audio_analysis', {
      /**
       * Primary Key - UUID
       * Unique identifier for each audio analysis record
       */
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        allowNull: false,
        comment: 'Unique UUID identifier for the audio analysis'
      },

      /**
       * User Association
       * Links audio analysis to the user who owns the content
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
       * Links audio analysis to content record (for URL-based content)
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
       * Links audio analysis to file record (for uploaded files)
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
       * Audio Duration
       * Total duration of the audio in seconds
       */
      duration: {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: false,
        comment: 'Total duration of the audio in seconds'
      },

      /**
       * Audio Metadata
       * Technical metadata about the audio file
       */
      audio_metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Technical metadata about the audio file'
      },

      /**
       * Transcription Results
       * Complete transcription with segments and timing
       */
      transcription_results: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Complete transcription with segments and timing'
      },

      /**
       * Speaker Analysis
       * Speaker diarization and identification results
       */
      speaker_analysis: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Speaker diarization and identification results'
      },

      /**
       * Voice Print Data
       * Voice print matching and biometric analysis
       */
      voice_print_data: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Voice print matching and biometric analysis'
      },

      /**
       * Sentiment Analysis
       * Emotional analysis of spoken content
       */
      sentiment_analysis: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Emotional analysis of spoken content'
      },

      /**
       * Quality Assessment
       * Audio quality metrics and assessment
       */
      quality_assessment: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Audio quality metrics and assessment'
      },

      /**
       * Language Detection
       * Language identification and multilingual analysis
       */
      language_detection: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Language identification and multilingual analysis'
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
       * Method used for audio analysis
       */
      analysis_method: {
        type: Sequelize.ENUM('google_cloud', 'openai_whisper', 'hybrid', 'local'),
        allowNull: false,
        defaultValue: 'hybrid',
        comment: 'Method used for audio analysis'
      },

      /**
       * Analysis Status
       * Current status of the analysis
       */
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'ready', 'failed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Current status of the audio analysis'
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
       * Timestamps
       */
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Create indexes for performance
    await queryInterface.addIndex('audio_analysis', ['user_id'], {
      name: 'idx_audio_analysis_user_id'
    });
    
    await queryInterface.addIndex('audio_analysis', ['content_id'], {
      name: 'idx_audio_analysis_content_id'
    });
    
    await queryInterface.addIndex('audio_analysis', ['file_id'], {
      name: 'idx_audio_analysis_file_id'
    });
    
    await queryInterface.addIndex('audio_analysis', ['status'], {
      name: 'idx_audio_analysis_status'
    });
    
    await queryInterface.addIndex('audio_analysis', ['duration'], {
      name: 'idx_audio_analysis_duration'
    });
    
    await queryInterface.addIndex('audio_analysis', ['analysis_method'], {
      name: 'idx_audio_analysis_method'
    });
    
    await queryInterface.addIndex('audio_analysis', ['progress'], {
      name: 'idx_audio_analysis_progress'
    });
    
    await queryInterface.addIndex('audio_analysis', ['completed_at'], {
      name: 'idx_audio_analysis_completed'
    });

    console.log('audio_analysis table created successfully');
  },

  /**
   * Drop audio_analysis table and all indexes
   * 
   * @param {import('sequelize').QueryInterface} queryInterface - Sequelize query interface
   * @param {import('sequelize').Sequelize} Sequelize - Sequelize constructor
   */
  async down(queryInterface, Sequelize) {
    console.log('Dropping audio_analysis table...');
    await queryInterface.dropTable('audio_analysis');
    console.log('audio_analysis table dropped successfully');
  }
}; 