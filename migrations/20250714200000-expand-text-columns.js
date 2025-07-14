'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Expand TEXT columns to LONGTEXT in content table
    await queryInterface.changeColumn('content', 'transcription', {
      type: Sequelize.TEXT('long'),
      allowNull: true,
      comment: 'Transcription text (expanded to LONGTEXT for large content)'
    });
    
    await queryInterface.changeColumn('content', 'summary', {
      type: Sequelize.TEXT('long'),
      allowNull: true,
      comment: 'Summary text (expanded to LONGTEXT for large content)'
    });
    
    await queryInterface.changeColumn('content', 'user_comments', {
      type: Sequelize.TEXT('long'),
      allowNull: true,
      comment: 'User comments (expanded to LONGTEXT for large content)'
    });

    // Expand TEXT columns to LONGTEXT in files table
    await queryInterface.changeColumn('files', 'transcription', {
      type: Sequelize.TEXT('long'),
      allowNull: true,
      comment: 'Transcription text (expanded to LONGTEXT for large content)'
    });
    
    await queryInterface.changeColumn('files', 'summary', {
      type: Sequelize.TEXT('long'),
      allowNull: true,
      comment: 'Summary text (expanded to LONGTEXT for large content)'
    });
    
    await queryInterface.changeColumn('files', 'user_comments', {
      type: Sequelize.TEXT('long'),
      allowNull: true,
      comment: 'User comments (expanded to LONGTEXT for large content)'
    });

    // Also expand TEXT columns in ocr_captions table for consistency
    await queryInterface.changeColumn('ocr_captions', 'text', {
      type: Sequelize.TEXT('long'),
      allowNull: false,
      comment: 'Extracted text content (expanded to LONGTEXT for large content)'
    });
    
    await queryInterface.changeColumn('ocr_captions', 'error_message', {
      type: Sequelize.TEXT('long'),
      allowNull: true,
      comment: 'Error message (expanded to LONGTEXT for detailed error info)'
    });

    await queryInterface.changeColumn('ocr_captions', 'original_text', {
      type: Sequelize.TEXT('long'),
      allowNull: true,
      comment: 'Original text before corrections (expanded to LONGTEXT for large content)'
    });
    
    await queryInterface.changeColumn('ocr_captions', 'search_vector', {
      type: Sequelize.TEXT('long'),
      allowNull: true,
      comment: 'Full-text search vector (expanded to LONGTEXT for large content)'
    });
  },

  async down (queryInterface, Sequelize) {
    // Revert LONGTEXT columns back to TEXT in content table
    await queryInterface.changeColumn('content', 'transcription', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    
    await queryInterface.changeColumn('content', 'summary', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    
    await queryInterface.changeColumn('content', 'user_comments', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    // Revert LONGTEXT columns back to TEXT in files table
    await queryInterface.changeColumn('files', 'transcription', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    
    await queryInterface.changeColumn('files', 'summary', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    
    await queryInterface.changeColumn('files', 'user_comments', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    // Revert LONGTEXT columns back to TEXT in ocr_captions table
    await queryInterface.changeColumn('ocr_captions', 'text', {
      type: Sequelize.TEXT,
      allowNull: false
    });
    
    await queryInterface.changeColumn('ocr_captions', 'error_message', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.changeColumn('ocr_captions', 'original_text', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    
    await queryInterface.changeColumn('ocr_captions', 'search_vector', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  }
}; 