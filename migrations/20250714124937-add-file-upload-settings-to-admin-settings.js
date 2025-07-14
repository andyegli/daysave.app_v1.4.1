'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if columns exist before adding them
    const tableInfo = await queryInterface.describeTable('admin_settings');
    
    if (!tableInfo.storage_type) {
      await queryInterface.addColumn('admin_settings', 'storage_type', {
        type: Sequelize.ENUM('local', 'gcs'),
        allowNull: true,
        defaultValue: 'local',
        comment: 'Storage type for uploaded files (local or Google Cloud Storage)'
      });
    }

    if (!tableInfo.gcs_bucket_name) {
      await queryInterface.addColumn('admin_settings', 'gcs_bucket_name', {
        type: Sequelize.STRING(255),
        allowNull: true,
        defaultValue: 'daysave-uploads',
        comment: 'Google Cloud Storage bucket name for file uploads'
      });
    }

    if (!tableInfo.upload_enabled) {
      await queryInterface.addColumn('admin_settings', 'upload_enabled', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether file uploads are enabled globally'
      });
    }

    if (!tableInfo.max_files_per_upload) {
      await queryInterface.addColumn('admin_settings', 'max_files_per_upload', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 10,
        comment: 'Maximum number of files allowed per upload request'
      });
    }

    // Create a default global admin settings record if it doesn't exist
    const [results] = await queryInterface.sequelize.query(
      "SELECT id FROM admin_settings WHERE user_id IS NULL LIMIT 1"
    );

    if (results.length === 0) {
      // Update existing global settings or create new ones with new fields
      await queryInterface.sequelize.query(`
        UPDATE admin_settings 
        SET 
          storage_type = 'local',
          gcs_bucket_name = 'daysave-uploads',
          upload_enabled = true,
          max_files_per_upload = 10
        WHERE user_id IS NULL
      `);
      
      // If no global settings exist, create them
      if (results.length === 0) {
        await queryInterface.bulkInsert('admin_settings', [{
          id: queryInterface.sequelize.fn('UUID'),
          user_id: null, // Global settings
          storage_type: 'local',
          gcs_bucket_name: 'daysave-uploads',
          upload_enabled: true,
          max_files_per_upload: 10,
          login_attempts: 5,
          lock_duration: 24,
          auto_unlock: true,
          ip_whitelist: null,
          ip_blacklist: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }]);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // Only remove the new columns we added (not max_file_size and file_types which existed before)
    await queryInterface.removeColumn('admin_settings', 'storage_type');
    await queryInterface.removeColumn('admin_settings', 'gcs_bucket_name');
    await queryInterface.removeColumn('admin_settings', 'upload_enabled');
    await queryInterface.removeColumn('admin_settings', 'max_files_per_upload');
  }
};
