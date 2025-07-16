'use strict';

/**
 * Migration: Add Video Analysis ID to OCR Captions Table
 * 
 * Adds video_analysis_id column to the ocr_captions table to link OCR captions
 * with their corresponding video analysis records.
 * 
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  /**
   * Add video_analysis_id column to ocr_captions table
   * 
   * @param {import('sequelize').QueryInterface} queryInterface - Sequelize query interface
   * @param {import('sequelize').Sequelize} Sequelize - Sequelize constructor
   */
  async up(queryInterface, Sequelize) {
    console.log('Adding video_analysis_id column to ocr_captions table...');
    
    await queryInterface.addColumn('ocr_captions', 'video_analysis_id', {
      type: Sequelize.CHAR(36),
      allowNull: true,
      references: {
        model: 'video_analysis',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      comment: 'UUID of the video analysis record this OCR caption belongs to'
    });

    // Add index for performance
    await queryInterface.addIndex('ocr_captions', ['video_analysis_id'], {
      name: 'ocr_captions_video_analysis_id_idx'
    });

    console.log('Successfully added video_analysis_id column to ocr_captions table');
  },

  /**
   * Remove video_analysis_id column from ocr_captions table
   * 
   * @param {import('sequelize').QueryInterface} queryInterface - Sequelize query interface
   * @param {import('sequelize').Sequelize} Sequelize - Sequelize constructor
   */
  async down(queryInterface, Sequelize) {
    console.log('Removing video_analysis_id column from ocr_captions table...');
    
    // Remove index first
    await queryInterface.removeIndex('ocr_captions', 'ocr_captions_video_analysis_id_idx');

    // Remove column
    await queryInterface.removeColumn('ocr_captions', 'video_analysis_id');

    console.log('Successfully removed video_analysis_id column from ocr_captions table');
  }
}; 