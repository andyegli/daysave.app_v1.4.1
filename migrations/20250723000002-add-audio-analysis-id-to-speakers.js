'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('speakers', 'audio_analysis_id', {
      type: Sequelize.CHAR(36),
      allowNull: true,
      references: {
        model: 'audio_analysis',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'Reference to the audio analysis record that identified this speaker'
    });

    // Add index for better query performance
    await queryInterface.addIndex('speakers', ['audio_analysis_id'], {
      name: 'idx_speakers_audio_analysis_id'
    });

    // Add composite index for common query pattern (user_id + audio_analysis_id)
    await queryInterface.addIndex('speakers', ['user_id', 'audio_analysis_id'], {
      name: 'idx_speakers_user_audio_analysis'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes first
    await queryInterface.removeIndex('speakers', 'idx_speakers_user_audio_analysis');
    await queryInterface.removeIndex('speakers', 'idx_speakers_audio_analysis_id');
    
    // Remove column
    await queryInterface.removeColumn('speakers', 'audio_analysis_id');
  }
}; 