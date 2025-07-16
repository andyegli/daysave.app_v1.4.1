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

    // Find the first admin user
    const [adminUsers] = await queryInterface.sequelize.query(
      "SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'admin' LIMIT 1"
    );

    if (adminUsers.length > 0) {
      const adminUserId = adminUsers[0].id;
      
      // Check if admin settings already exist for this user
      const [existingSettings] = await queryInterface.sequelize.query(
        "SELECT id FROM admin_settings WHERE user_id = ?",
        { replacements: [adminUserId] }
      );

      if (existingSettings.length === 0) {
        // Create admin settings for the first admin user
        await queryInterface.bulkInsert('admin_settings', [{
          id: queryInterface.sequelize.fn('UUID'),
          user_id: adminUserId,
          storage_type: 'local',
          gcs_bucket_name: 'daysave-uploads',
          upload_enabled: true,
          max_files_per_upload: 10,
          login_attempts: 5,
          lock_duration: 24,
          auto_unlock: true,
          file_types: JSON.stringify([
            'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff',
            'mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac', 'wma',
            'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv',
            'pdf', 'txt', 'csv', 'doc', 'docx'
          ]),
          max_file_size: 25,
          ip_whitelist: null,
          ip_blacklist: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }]);
      } else {
        // Update existing settings with new fields
        await queryInterface.sequelize.query(`
          UPDATE admin_settings 
          SET 
            storage_type = COALESCE(storage_type, 'local'),
            gcs_bucket_name = COALESCE(gcs_bucket_name, 'daysave-uploads'),
            upload_enabled = COALESCE(upload_enabled, true),
            max_files_per_upload = COALESCE(max_files_per_upload, 10)
          WHERE user_id = ?
        `, { replacements: [adminUserId] });
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
