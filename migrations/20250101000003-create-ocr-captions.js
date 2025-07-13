'use strict';

/**
 * Migration: Create OCR Captions Table
 * 
 * Creates the ocr_captions table for storing text extracted from video frames using
 * Optical Character Recognition (OCR). This table enables timestamp-based text extraction
 * from videos, allowing users to search and navigate video content based on visible text.
 * 
 * Features:
 * - UUID primary keys for all records
 * - Frame-by-frame text extraction with timestamps
 * - Text confidence scoring and filtering
 * - Coordinate-based text positioning
 * - Multi-language text recognition
 * - Comprehensive indexing for performance
 * 
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  /**
   * Create ocr_captions table with all required fields and indexes
   * 
   * @param {import('sequelize').QueryInterface} queryInterface - Sequelize query interface
   * @param {import('sequelize').Sequelize} Sequelize - Sequelize constructor
   */
  async up(queryInterface, Sequelize) {
    console.log('Creating ocr_captions table...');
    
    await queryInterface.createTable('ocr_captions', {
      /**
       * Primary Key - UUID
       * Unique identifier for each OCR caption record
       */
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        allowNull: false,
        comment: 'Unique UUID identifier for the OCR caption'
      },

      /**
       * User Association
       * Links OCR caption to the user who owns the content
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
        comment: 'UUID of the user who owns the content this OCR caption belongs to'
      },

      /**
       * Content Association
       * Links OCR caption to content record (for URL-based content)
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
        comment: 'UUID of the content record this OCR caption belongs to (nullable for file-based content)'
      },

      /**
       * File Association
       * Links OCR caption to file record (for uploaded files)
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
        comment: 'UUID of the file record this OCR caption belongs to (nullable for URL-based content)'
      },

      /**
       * Timestamp
       * Video timestamp where this text was extracted
       */
      timestamp: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Video timestamp where text was extracted (HH:MM:SS.mmm format)'
      },

      /**
       * Timestamp Seconds
       * Timestamp in seconds for easier querying and sorting
       */
      timestamp_seconds: {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: false,
        comment: 'Video timestamp in seconds for easier querying and sorting'
      },

      /**
       * Frame Index
       * Sequential frame number in the video where text was extracted
       */
      frame_index: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Sequential frame number in the video where text was extracted'
      },

      /**
       * Extracted Text
       * The actual text content extracted from the video frame
       */
      text: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'The actual text content extracted from the video frame'
      },

      /**
       * Confidence Score
       * OCR confidence score for the extracted text (0.0 to 1.0)
       */
      confidence: {
        type: Sequelize.DECIMAL(5, 4),
        allowNull: false,
        comment: 'OCR confidence score for the extracted text (0.0 to 1.0)'
      },

      /**
       * Bounding Box Coordinates
       * Coordinates of the text within the video frame
       */
      coordinates: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Bounding box coordinates of the text within the video frame'
      },

      /**
       * Text Properties
       * Additional properties of the detected text
       */
      text_properties: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional properties of the detected text (font, color, style, etc.)'
      },

      /**
       * Language
       * Detected or specified language of the text
       */
      language: {
        type: Sequelize.STRING(5),
        allowNull: true,
        comment: 'Detected or specified language of the text (ISO 639-1 codes)'
      },

      /**
       * Text Category
       * Categorization of the text content
       */
      text_category: {
        type: Sequelize.ENUM('title', 'subtitle', 'body', 'ui', 'watermark', 'credits', 'other'),
        allowNull: false,
        defaultValue: 'other',
        comment: 'Categorization of the text content type'
      },

      /**
       * Word Count
       * Number of words in the extracted text
       */
      word_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of words in the extracted text'
      },

      /**
       * Character Count
       * Number of characters in the extracted text
       */
      character_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of characters in the extracted text'
      },

      /**
       * Processing Method
       * OCR method/engine used for text extraction
       */
      processing_method: {
        type: Sequelize.ENUM('google_vision', 'tesseract', 'azure_cognitive', 'aws_textract', 'custom'),
        allowNull: false,
        defaultValue: 'google_vision',
        comment: 'OCR method/engine used for text extraction'
      },

      /**
       * Processing Metadata
       * Additional metadata about the OCR processing
       */
      processing_metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional metadata about the OCR processing'
      },

      /**
       * Status
       * Current status of the OCR caption
       */
      status: {
        type: Sequelize.ENUM('processing', 'ready', 'failed', 'filtered', 'verified'),
        allowNull: false,
        defaultValue: 'processing',
        comment: 'Current status of the OCR caption'
      },

      /**
       * Error Message
       * Error message if OCR processing failed
       */
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error message if OCR processing failed'
      },

      /**
       * Filtered Reason
       * Reason why text was filtered out (if status is 'filtered')
       */
      filtered_reason: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Reason why text was filtered out (low confidence, too short, etc.)'
      },

      /**
       * User Verified
       * Whether the text has been manually verified by the user
       */
      user_verified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether the text has been manually verified by the user'
      },

      /**
       * Original Text
       * Original text before any user corrections
       */
      original_text: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Original text before any user corrections'
      },

      /**
       * Search Vector
       * Full-text search vector for efficient text searching
       */
      search_vector: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Full-text search vector for efficient text searching'
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
    console.log('Creating indexes for ocr_captions table...');
    
    await queryInterface.addIndex('ocr_captions', {
      fields: ['user_id'],
      name: 'idx_ocr_captions_user_id',
      comment: 'Index for user-based OCR caption queries'
    });

    await queryInterface.addIndex('ocr_captions', {
      fields: ['content_id'],
      name: 'idx_ocr_captions_content_id',
      comment: 'Index for content-based OCR caption queries'
    });

    await queryInterface.addIndex('ocr_captions', {
      fields: ['file_id'],
      name: 'idx_ocr_captions_file_id',
      comment: 'Index for file-based OCR caption queries'
    });

    await queryInterface.addIndex('ocr_captions', {
      fields: ['timestamp_seconds'],
      name: 'idx_ocr_captions_timestamp',
      comment: 'Index for sorting OCR captions by timestamp'
    });

    await queryInterface.addIndex('ocr_captions', {
      fields: ['confidence'],
      name: 'idx_ocr_captions_confidence',
      comment: 'Index for filtering OCR captions by confidence score'
    });

    await queryInterface.addIndex('ocr_captions', {
      fields: ['status'],
      name: 'idx_ocr_captions_status',
      comment: 'Index for filtering OCR captions by status'
    });

    await queryInterface.addIndex('ocr_captions', {
      fields: ['text_category'],
      name: 'idx_ocr_captions_category',
      comment: 'Index for filtering OCR captions by category'
    });

    await queryInterface.addIndex('ocr_captions', {
      fields: ['language'],
      name: 'idx_ocr_captions_language',
      comment: 'Index for filtering OCR captions by language'
    });

    await queryInterface.addIndex('ocr_captions', {
      fields: ['frame_index'],
      name: 'idx_ocr_captions_frame',
      comment: 'Index for sorting OCR captions by frame index'
    });

    await queryInterface.addIndex('ocr_captions', {
      fields: ['processing_method'],
      name: 'idx_ocr_captions_method',
      comment: 'Index for filtering OCR captions by processing method'
    });

    await queryInterface.addIndex('ocr_captions', {
      fields: ['user_verified'],
      name: 'idx_ocr_captions_verified',
      comment: 'Index for filtering verified OCR captions'
    });

    // Create a composite index for efficient timeline queries
    await queryInterface.addIndex('ocr_captions', {
      fields: ['content_id', 'timestamp_seconds'],
      name: 'idx_ocr_captions_content_timeline',
      comment: 'Composite index for efficient content timeline queries'
    });

    await queryInterface.addIndex('ocr_captions', {
      fields: ['file_id', 'timestamp_seconds'],
      name: 'idx_ocr_captions_file_timeline',
      comment: 'Composite index for efficient file timeline queries'
    });

    // Create a full-text search index (MySQL compatible)
    await queryInterface.sequelize.query(`
      CREATE FULLTEXT INDEX idx_ocr_captions_text_search 
      ON ocr_captions (text)
    `);

    console.log('Successfully created ocr_captions table with indexes');
  },

  /**
   * Drop ocr_captions table and all associated indexes
   * 
   * @param {import('sequelize').QueryInterface} queryInterface - Sequelize query interface
   * @param {import('sequelize').Sequelize} Sequelize - Sequelize constructor
   */
  async down(queryInterface, Sequelize) {
    console.log('Dropping ocr_captions table...');
    await queryInterface.dropTable('ocr_captions');
    console.log('Successfully dropped ocr_captions table');
  }
}; 