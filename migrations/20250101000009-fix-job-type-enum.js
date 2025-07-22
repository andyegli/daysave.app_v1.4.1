'use strict';

/**
 * Migration: Fix Processing Jobs job_type Enum Values
 * 
 * The job_type column has restrictive enum values that don't match what the code
 * is trying to insert. This migration updates the enum to include the correct values.
 * 
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  /**
   * Fix job_type enum values in processing_jobs table
   * 
   * @param {import('sequelize').QueryInterface} queryInterface - Sequelize query interface
   * @param {import('sequelize').Sequelize} Sequelize - Sequelize constructor
   */
  async up(queryInterface, Sequelize) {
    console.log('Fixing processing_jobs job_type enum values...');
    
    // Change the job_type column to accept longer values and new enum values
    await queryInterface.changeColumn('processing_jobs', 'job_type', {
      type: Sequelize.ENUM('video_analysis', 'audio_analysis', 'image_analysis', 'url_analysis', 'batch_processing', 'document_analysis', 'content_analysis'),
      allowNull: false,
      comment: 'Type of processing job being executed'
    });
    
    console.log('processing_jobs job_type enum updated successfully');
  },

  /**
   * Revert job_type enum values in processing_jobs table
   * 
   * @param {import('sequelize').QueryInterface} queryInterface - Sequelize query interface
   * @param {import('sequelize').Sequelize} Sequelize - Sequelize constructor
   */
  async down(queryInterface, Sequelize) {
    console.log('Reverting processing_jobs job_type enum values...');
    
    // Revert to original smaller enum
    await queryInterface.changeColumn('processing_jobs', 'job_type', {
      type: Sequelize.ENUM('video_analysis', 'audio_analysis', 'image_analysis'),
      allowNull: false,
      comment: 'Type of processing job being executed'
    });
    
    console.log('processing_jobs job_type enum reverted successfully');
  }
}; 