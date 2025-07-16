'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add processing_job_id column to video_analysis table
    await queryInterface.addColumn('video_analysis', 'processing_job_id', {
      type: Sequelize.CHAR(36),
      allowNull: true,
      references: {
        model: 'processing_jobs',
        key: 'id'
      },
      comment: 'UUID of the processing job that generated this analysis'
    });

    // Add processing_job_id column to audio_analysis table
    await queryInterface.addColumn('audio_analysis', 'processing_job_id', {
      type: Sequelize.CHAR(36),
      allowNull: true,
      references: {
        model: 'processing_jobs',
        key: 'id'
      },
      comment: 'UUID of the processing job that generated this analysis'
    });

    // Add processing_job_id column to image_analysis table
    await queryInterface.addColumn('image_analysis', 'processing_job_id', {
      type: Sequelize.CHAR(36),
      allowNull: true,
      references: {
        model: 'processing_jobs',
        key: 'id'
      },
      comment: 'UUID of the processing job that generated this analysis'
    });

    // Add indexes for processing_job_id in all analysis tables
    await queryInterface.addIndex('video_analysis', ['processing_job_id'], {
      name: 'idx_video_analysis_processing_job_id'
    });
    
    await queryInterface.addIndex('audio_analysis', ['processing_job_id'], {
      name: 'idx_audio_analysis_processing_job_id'
    });
    
    await queryInterface.addIndex('image_analysis', ['processing_job_id'], {
      name: 'idx_image_analysis_processing_job_id'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes
    await queryInterface.removeIndex('video_analysis', 'idx_video_analysis_processing_job_id');
    await queryInterface.removeIndex('audio_analysis', 'idx_audio_analysis_processing_job_id');
    await queryInterface.removeIndex('image_analysis', 'idx_image_analysis_processing_job_id');
    
    // Remove columns
    await queryInterface.removeColumn('video_analysis', 'processing_job_id');
    await queryInterface.removeColumn('audio_analysis', 'processing_job_id');
    await queryInterface.removeColumn('image_analysis', 'processing_job_id');
  }
};
