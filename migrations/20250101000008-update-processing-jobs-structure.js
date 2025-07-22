'use strict';

/**
 * Migration: Update Processing Jobs Table Structure
 * 
 * Adds missing columns to the existing processing_jobs table to match the new
 * comprehensive AI analysis structure. This migration updates the table to support
 * the enhanced AI processing workflow.
 * 
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  /**
   * Add missing columns to processing_jobs table
   * 
   * @param {import('sequelize').QueryInterface} queryInterface - Sequelize query interface
   * @param {import('sequelize').Sequelize} Sequelize - Sequelize constructor
   */
  async up(queryInterface, Sequelize) {
    console.log('Updating processing_jobs table structure...');
    
    // Check if columns exist before adding them
    const tableInfo = await queryInterface.describeTable('processing_jobs');
    
    // Add media_type column if it doesn't exist
    if (!tableInfo.media_type) {
      await queryInterface.addColumn('processing_jobs', 'media_type', {
        type: Sequelize.ENUM('video', 'audio', 'image', 'document', 'url'),
        allowNull: true,
        comment: 'Type of media being processed'
      });
      console.log('Added media_type column');
    }
    
    // Add total_stages column if it doesn't exist
    if (!tableInfo.total_stages) {
      await queryInterface.addColumn('processing_jobs', 'total_stages', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Total number of processing stages'
      });
      console.log('Added total_stages column');
    }
    
    // Add processing_results column if it doesn't exist
    if (!tableInfo.processing_results) {
      await queryInterface.addColumn('processing_jobs', 'processing_results', {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Results and outputs from processing stages'
      });
      console.log('Added processing_results column');
    }
    
    // Add error_details column if it doesn't exist (rename from error_data)
    if (!tableInfo.error_details) {
      await queryInterface.addColumn('processing_jobs', 'error_details', {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Error information if job failed'
      });
      console.log('Added error_details column');
    }
    
    console.log('processing_jobs table structure updated successfully');
  },

  /**
   * Remove added columns from processing_jobs table
   * 
   * @param {import('sequelize').QueryInterface} queryInterface - Sequelize query interface
   * @param {import('sequelize').Sequelize} Sequelize - Sequelize constructor
   */
  async down(queryInterface, Sequelize) {
    console.log('Reverting processing_jobs table structure...');
    
    // Remove added columns
    const tableInfo = await queryInterface.describeTable('processing_jobs');
    
    if (tableInfo.media_type) {
      await queryInterface.removeColumn('processing_jobs', 'media_type');
      console.log('Removed media_type column');
    }
    
    if (tableInfo.total_stages) {
      await queryInterface.removeColumn('processing_jobs', 'total_stages');
      console.log('Removed total_stages column');
    }
    
    if (tableInfo.processing_results) {
      await queryInterface.removeColumn('processing_jobs', 'processing_results');
      console.log('Removed processing_results column');
    }
    
    if (tableInfo.error_details) {
      await queryInterface.removeColumn('processing_jobs', 'error_details');
      console.log('Removed error_details column');
    }
    
    console.log('processing_jobs table structure reverted successfully');
  }
}; 