'use strict';

/**
 * Migration: Add Analysis IDs to Thumbnails Table
 * 
 * Adds video_analysis_id and image_analysis_id columns to the thumbnails table
 * to link thumbnails with their corresponding analysis records.
 * 
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  /**
   * Add analysis ID columns to thumbnails table
   * 
   * @param {import('sequelize').QueryInterface} queryInterface - Sequelize query interface
   * @param {import('sequelize').Sequelize} Sequelize - Sequelize constructor
   */
  async up(queryInterface, Sequelize) {
    console.log('Adding analysis ID columns to thumbnails table...');
    
    await queryInterface.addColumn('thumbnails', 'video_analysis_id', {
      type: Sequelize.CHAR(36),
      allowNull: true,
      references: {
        model: 'video_analysis',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      comment: 'UUID of the video analysis record this thumbnail belongs to'
    });

    await queryInterface.addColumn('thumbnails', 'image_analysis_id', {
      type: Sequelize.CHAR(36),
      allowNull: true,
      references: {
        model: 'image_analysis',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      comment: 'UUID of the image analysis record this thumbnail belongs to'
    });

    // Add indexes for performance
    await queryInterface.addIndex('thumbnails', ['video_analysis_id'], {
      name: 'thumbnails_video_analysis_id_idx'
    });

    await queryInterface.addIndex('thumbnails', ['image_analysis_id'], {
      name: 'thumbnails_image_analysis_id_idx'
    });

    console.log('Successfully added analysis ID columns to thumbnails table');
  },

  /**
   * Remove analysis ID columns from thumbnails table
   * 
   * @param {import('sequelize').QueryInterface} queryInterface - Sequelize query interface
   * @param {import('sequelize').Sequelize} Sequelize - Sequelize constructor
   */
  async down(queryInterface, Sequelize) {
    console.log('Removing analysis ID columns from thumbnails table...');
    
    // Remove indexes first
    await queryInterface.removeIndex('thumbnails', 'thumbnails_video_analysis_id_idx');
    await queryInterface.removeIndex('thumbnails', 'thumbnails_image_analysis_id_idx');

    // Remove columns
    await queryInterface.removeColumn('thumbnails', 'video_analysis_id');
    await queryInterface.removeColumn('thumbnails', 'image_analysis_id');

    console.log('Successfully removed analysis ID columns from thumbnails table');
  }
}; 