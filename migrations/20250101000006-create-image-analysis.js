'use strict';

/**
 * Migration: Create Image Analysis Table
 * 
 * Creates the image_analysis table for storing comprehensive image analysis results
 * including object detection, OCR text extraction, AI-generated descriptions, and quality assessment.
 * This table provides detailed insights into image content and visual elements.
 * 
 * Features:
 * - UUID primary keys for all records
 * - Object detection and recognition with confidence scoring
 * - OCR text extraction with positioning and accuracy
 * - AI-generated descriptions and content categorization
 * - Image quality assessment and technical metadata
 * - Color analysis and visual characteristics
 * - Face detection and analysis capabilities
 * 
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  /**
   * Create image_analysis table with all required fields and indexes
   * 
   * @param {import('sequelize').QueryInterface} queryInterface - Sequelize query interface
   * @param {import('sequelize').Sequelize} Sequelize - Sequelize constructor
   */
  async up(queryInterface, Sequelize) {
    console.log('Creating image_analysis table...');
    
    await queryInterface.createTable('image_analysis', {
      /**
       * Primary Key - UUID
       * Unique identifier for each image analysis record
       */
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        allowNull: false,
        comment: 'Unique UUID identifier for the image analysis'
      },

      /**
       * User Association
       * Links image analysis to the user who owns the content
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
       * Links image analysis to content record (for URL-based content)
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
       * Links image analysis to file record (for uploaded files)
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
       * Image Metadata
       * Technical metadata about the image file
       */
      image_metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Technical metadata about the image file'
      },

      /**
       * Object Detection Results
       * Objects detected in the image with confidence and positioning
       */
      object_detection: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Objects detected in the image with confidence and positioning'
      },

      /**
       * OCR Text Results
       * Text extracted from the image using OCR
       */
      ocr_results: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Text extracted from the image using OCR'
      },

      /**
       * AI Description
       * AI-generated description and analysis of image content
       */
      ai_description: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'AI-generated description and analysis of image content'
      },

      /**
       * Face Detection
       * Face detection and analysis results
       */
      face_detection: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Face detection and analysis results'
      },

      /**
       * Color Analysis
       * Color palette and visual characteristics analysis
       */
      color_analysis: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Color palette and visual characteristics analysis'
      },

      /**
       * Quality Assessment
       * Image quality metrics and assessment
       */
      quality_assessment: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Image quality metrics and assessment'
      },

      /**
       * Label Detection
       * General labels and scene classification
       */
      label_detection: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'General labels and scene classification'
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
       * Method used for image analysis
       */
      analysis_method: {
        type: Sequelize.ENUM('google_vision', 'openai_vision', 'hybrid', 'local'),
        allowNull: false,
        defaultValue: 'hybrid',
        comment: 'Method used for image analysis'
      },

      /**
       * Analysis Status
       * Current status of the analysis
       */
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'ready', 'failed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Current status of the image analysis'
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
    await queryInterface.addIndex('image_analysis', ['user_id'], {
      name: 'idx_image_analysis_user_id'
    });
    
    await queryInterface.addIndex('image_analysis', ['content_id'], {
      name: 'idx_image_analysis_content_id'
    });
    
    await queryInterface.addIndex('image_analysis', ['file_id'], {
      name: 'idx_image_analysis_file_id'
    });
    
    await queryInterface.addIndex('image_analysis', ['status'], {
      name: 'idx_image_analysis_status'
    });
    
    await queryInterface.addIndex('image_analysis', ['analysis_method'], {
      name: 'idx_image_analysis_method'
    });
    
    await queryInterface.addIndex('image_analysis', ['progress'], {
      name: 'idx_image_analysis_progress'
    });
    
    await queryInterface.addIndex('image_analysis', ['completed_at'], {
      name: 'idx_image_analysis_completed'
    });

    console.log('image_analysis table created successfully');
  },

  /**
   * Drop image_analysis table and all indexes
   * 
   * @param {import('sequelize').QueryInterface} queryInterface - Sequelize query interface
   * @param {import('sequelize').Sequelize} Sequelize - Sequelize constructor
   */
  async down(queryInterface, Sequelize) {
    console.log('Dropping image_analysis table...');
    await queryInterface.dropTable('image_analysis');
    console.log('image_analysis table dropped successfully');
  }
}; 