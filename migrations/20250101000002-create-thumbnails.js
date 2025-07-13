'use strict';

/**
 * Migration: Create Thumbnails Table
 * 
 * Creates the thumbnails table for storing thumbnail images and key moments generated
 * from multimedia content. This table manages thumbnail generation for videos, images,
 * and key moment extraction for enhanced user experience and content preview.
 * 
 * Features:
 * - UUID primary keys for all records
 * - Multiple thumbnail sizes and formats
 * - Video key moments extraction
 * - Image thumbnail generation
 * - Comprehensive indexing for performance
 * 
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  /**
   * Create thumbnails table with all required fields and indexes
   * 
   * @param {import('sequelize').QueryInterface} queryInterface - Sequelize query interface
   * @param {import('sequelize').Sequelize} Sequelize - Sequelize constructor
   */
  async up(queryInterface, Sequelize) {
    console.log('Creating thumbnails table...');
    
    await queryInterface.createTable('thumbnails', {
      /**
       * Primary Key - UUID
       * Unique identifier for each thumbnail record
       */
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        allowNull: false,
        comment: 'Unique UUID identifier for the thumbnail'
      },

      /**
       * User Association
       * Links thumbnail to the user who owns the content
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
        comment: 'UUID of the user who owns the content this thumbnail belongs to'
      },

      /**
       * Content Association
       * Links thumbnail to content record (for URL-based content)
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
        comment: 'UUID of the content record this thumbnail belongs to (nullable for file-based content)'
      },

      /**
       * File Association
       * Links thumbnail to file record (for uploaded files)
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
        comment: 'UUID of the file record this thumbnail belongs to (nullable for URL-based content)'
      },

      /**
       * Thumbnail Type
       * Specifies the type of thumbnail generated
       */
      thumbnail_type: {
        type: Sequelize.ENUM('main', 'key_moment', 'preview', 'grid', 'custom'),
        allowNull: false,
        defaultValue: 'main',
        comment: 'Type of thumbnail (main, key_moment, preview, grid, custom)'
      },

      /**
       * File Path
       * Relative path to the thumbnail file from the application root
       */
      file_path: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Relative path to the thumbnail file from application root'
      },

      /**
       * File Name
       * Original filename of the thumbnail
       */
      file_name: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Filename of the thumbnail image'
      },

      /**
       * File Size
       * Size of the thumbnail file in bytes
       */
      file_size: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Size of the thumbnail file in bytes'
      },

      /**
       * MIME Type
       * MIME type of the thumbnail file
       */
      mime_type: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'image/jpeg',
        comment: 'MIME type of the thumbnail file'
      },

      /**
       * Width
       * Width of the thumbnail image in pixels
       */
      width: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Width of the thumbnail image in pixels'
      },

      /**
       * Height
       * Height of the thumbnail image in pixels
       */
      height: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Height of the thumbnail image in pixels'
      },

      /**
       * Timestamp
       * For video thumbnails, the timestamp in the video where this thumbnail was extracted
       */
      timestamp: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Video timestamp where thumbnail was extracted (HH:MM:SS.mmm format)'
      },

      /**
       * Timestamp Seconds
       * Timestamp in seconds for easier querying and sorting
       */
      timestamp_seconds: {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: true,
        comment: 'Video timestamp in seconds for easier querying and sorting'
      },

      /**
       * Key Moment Index
       * For key moment thumbnails, the index/order of this moment in the sequence
       */
      key_moment_index: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Index/order of this key moment in the sequence (for key_moment type)'
      },

      /**
       * Quality
       * Quality setting used for thumbnail generation
       */
      quality: {
        type: Sequelize.ENUM('low', 'medium', 'high'),
        allowNull: false,
        defaultValue: 'medium',
        comment: 'Quality setting used for thumbnail generation'
      },

      /**
       * Generation Method
       * Method used to generate the thumbnail
       */
      generation_method: {
        type: Sequelize.ENUM('ffmpeg', 'sharp', 'imagemagick', 'canvas', 'external'),
        allowNull: true,
        comment: 'Method used to generate the thumbnail'
      },

      /**
       * Metadata
       * Additional metadata about the thumbnail generation and properties
       */
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional metadata about thumbnail generation and properties'
      },

      /**
       * Status
       * Current status of the thumbnail
       */
      status: {
        type: Sequelize.ENUM('generating', 'ready', 'failed', 'expired'),
        allowNull: false,
        defaultValue: 'generating',
        comment: 'Current status of the thumbnail'
      },

      /**
       * Error Message
       * Error message if thumbnail generation failed
       */
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error message if thumbnail generation failed'
      },

      /**
       * Expiry Date
       * When this thumbnail expires and should be regenerated
       */
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When this thumbnail expires and should be regenerated'
      },

      /**
       * Usage Count
       * Number of times this thumbnail has been accessed/viewed
       */
      usage_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of times this thumbnail has been accessed/viewed'
      },

      /**
       * Last Accessed
       * When this thumbnail was last accessed
       */
      last_accessed: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When this thumbnail was last accessed'
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
    console.log('Creating indexes for thumbnails table...');
    
    await queryInterface.addIndex('thumbnails', {
      fields: ['user_id'],
      name: 'idx_thumbnails_user_id',
      comment: 'Index for user-based thumbnail queries'
    });

    await queryInterface.addIndex('thumbnails', {
      fields: ['content_id'],
      name: 'idx_thumbnails_content_id',
      comment: 'Index for content-based thumbnail queries'
    });

    await queryInterface.addIndex('thumbnails', {
      fields: ['file_id'],
      name: 'idx_thumbnails_file_id',
      comment: 'Index for file-based thumbnail queries'
    });

    await queryInterface.addIndex('thumbnails', {
      fields: ['thumbnail_type'],
      name: 'idx_thumbnails_type',
      comment: 'Index for filtering thumbnails by type'
    });

    await queryInterface.addIndex('thumbnails', {
      fields: ['status'],
      name: 'idx_thumbnails_status',
      comment: 'Index for filtering thumbnails by status'
    });

    await queryInterface.addIndex('thumbnails', {
      fields: ['timestamp_seconds'],
      name: 'idx_thumbnails_timestamp',
      comment: 'Index for sorting thumbnails by timestamp'
    });

    await queryInterface.addIndex('thumbnails', {
      fields: ['key_moment_index'],
      name: 'idx_thumbnails_key_moment',
      comment: 'Index for sorting key moment thumbnails'
    });

    await queryInterface.addIndex('thumbnails', {
      fields: ['expires_at'],
      name: 'idx_thumbnails_expires',
      comment: 'Index for thumbnail expiry cleanup'
    });

    await queryInterface.addIndex('thumbnails', {
      fields: ['usage_count'],
      name: 'idx_thumbnails_usage',
      comment: 'Index for sorting thumbnails by usage'
    });

    console.log('Successfully created thumbnails table with indexes');
  },

  /**
   * Drop thumbnails table and all associated indexes
   * 
   * @param {import('sequelize').QueryInterface} queryInterface - Sequelize query interface
   * @param {import('sequelize').Sequelize} Sequelize - Sequelize constructor
   */
  async down(queryInterface, Sequelize) {
    console.log('Dropping thumbnails table...');
    await queryInterface.dropTable('thumbnails');
    console.log('Successfully dropped thumbnails table');
  }
}; 