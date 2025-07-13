'use strict';

/**
 * Migration: Create Speakers Table
 * 
 * Creates the speakers table for storing speaker identification data and voice prints
 * for multimedia analysis. This table enables speaker recognition across different
 * audio/video content by maintaining voice fingerprints and speaker characteristics.
 * 
 * Features:
 * - UUID primary keys for all records
 * - Voice fingerprint storage for speaker identification
 * - Speaker profile management with characteristics
 * - User-specific speaker databases
 * - Comprehensive indexing for performance
 * 
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  /**
   * Create speakers table with all required fields and indexes
   * 
   * @param {import('sequelize').QueryInterface} queryInterface - Sequelize query interface
   * @param {import('sequelize').Sequelize} Sequelize - Sequelize constructor
   */
  async up(queryInterface, Sequelize) {
    console.log('Creating speakers table...');
    
    await queryInterface.createTable('speakers', {
      /**
       * Primary Key - UUID
       * Unique identifier for each speaker record
       */
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        allowNull: false,
        comment: 'Unique UUID identifier for the speaker'
      },

      /**
       * User Association
       * Links speaker to the user who owns this speaker identification
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
        comment: 'UUID of the user who owns this speaker identification'
      },

      /**
       * Speaker Tag
       * System-generated unique identifier for the speaker within analysis results
       * Format: "Speaker_[timestamp]_[name]" (e.g., "Speaker_1751830102639_Mike")
       */
      speaker_tag: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        comment: 'System-generated unique speaker tag used in analysis results'
      },

      /**
       * Speaker Name
       * Human-readable name for the speaker, can be user-assigned or AI-generated
       */
      name: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Human-readable name for the speaker (user-assigned or AI-generated)'
      },

      /**
       * Voice Fingerprint
       * JSON object containing voice characteristics for speaker identification
       */
      voice_fingerprint: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: 'Voice characteristics fingerprint for speaker identification matching'
      },

      /**
       * Voice Characteristics
       * Technical audio characteristics extracted from voice analysis
       */
      voice_characteristics: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Technical audio characteristics extracted from voice analysis'
      },

      /**
       * Speaking Style Analysis
       * Detailed analysis of speaking patterns and style
       */
      speaking_style: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Analysis of speaking patterns, style, and linguistic characteristics'
      },

      /**
       * Speaker Profile
       * Comprehensive profile information including usage statistics
       */
      profile_data: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Comprehensive speaker profile with usage statistics and metadata'
      },

      /**
       * Confidence Score
       * Average confidence score for speaker identification (0.0 to 1.0)
       */
      confidence_score: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: true,
        defaultValue: 0.00,
        comment: 'Average confidence score for speaker identification (0.0 to 1.0)'
      },

      /**
       * Total Appearances
       * Count of how many times this speaker has been detected across all content
       */
      total_appearances: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Total number of times this speaker has been detected across all content'
      },

      /**
       * First Detection Date
       * When this speaker was first identified in the system
       */
      first_detected: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'Timestamp when this speaker was first identified'
      },

      /**
       * Last Detection Date
       * When this speaker was most recently identified
       */
      last_detected: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'Timestamp when this speaker was most recently identified'
      },

      /**
       * Status
       * Current status of the speaker record
       */
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'merged'),
        allowNull: false,
        defaultValue: 'active',
        comment: 'Current status of the speaker record (active, inactive, merged)'
      },

      /**
       * Notes
       * User-provided notes about the speaker
       */
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'User-provided notes and additional information about the speaker'
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
    console.log('Creating indexes for speakers table...');
    
    await queryInterface.addIndex('speakers', {
      fields: ['user_id'],
      name: 'idx_speakers_user_id',
      comment: 'Index for user-based speaker queries'
    });

    await queryInterface.addIndex('speakers', {
      fields: ['speaker_tag'],
      name: 'idx_speakers_speaker_tag',
      unique: true,
      comment: 'Unique index for speaker tag lookups'
    });

    await queryInterface.addIndex('speakers', {
      fields: ['status'],
      name: 'idx_speakers_status',
      comment: 'Index for filtering speakers by status'
    });

    await queryInterface.addIndex('speakers', {
      fields: ['confidence_score'],
      name: 'idx_speakers_confidence',
      comment: 'Index for sorting speakers by confidence score'
    });

    await queryInterface.addIndex('speakers', {
      fields: ['total_appearances'],
      name: 'idx_speakers_appearances',
      comment: 'Index for sorting speakers by appearance count'
    });

    await queryInterface.addIndex('speakers', {
      fields: ['last_detected'],
      name: 'idx_speakers_last_detected',
      comment: 'Index for sorting speakers by last detection date'
    });

    console.log('Successfully created speakers table with indexes');
  },

  /**
   * Drop speakers table and all associated indexes
   * 
   * @param {import('sequelize').QueryInterface} queryInterface - Sequelize query interface
   * @param {import('sequelize').Sequelize} Sequelize - Sequelize constructor
   */
  async down(queryInterface, Sequelize) {
    console.log('Dropping speakers table...');
    await queryInterface.dropTable('speakers');
    console.log('Successfully dropped speakers table');
  }
}; 