'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔧 Adding content_type field to content and files tables...');
    
    // Add content_type field to content table
    await queryInterface.addColumn('content', 'content_type', {
      type: Sequelize.ENUM('video', 'audio', 'image', 'document', 'unknown'),
      allowNull: false,
      defaultValue: 'unknown',
      comment: 'Detected media type for optimized querying and processing'
    });
    
    // Add content_type field to files table
    await queryInterface.addColumn('files', 'content_type', {
      type: Sequelize.ENUM('video', 'audio', 'image', 'document', 'unknown'),
      allowNull: false,
      defaultValue: 'unknown',
      comment: 'Detected media type for optimized querying and processing'
    });
    
    // Add indexes for performance
    await queryInterface.addIndex('content', ['content_type'], {
      name: 'idx_content_content_type'
    });
    
    await queryInterface.addIndex('files', ['content_type'], {
      name: 'idx_files_content_type'
    });
    
    // Add composite indexes for user + content_type (common query pattern)
    await queryInterface.addIndex('content', ['user_id', 'content_type'], {
      name: 'idx_content_user_content_type'
    });
    
    await queryInterface.addIndex('files', ['user_id', 'content_type'], {
      name: 'idx_files_user_content_type'
    });
    
    console.log('✅ content_type field added successfully with indexes');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Removing content_type field and indexes...');
    
    // Remove indexes first
    await queryInterface.removeIndex('content', 'idx_content_user_content_type');
    await queryInterface.removeIndex('files', 'idx_files_user_content_type');
    await queryInterface.removeIndex('content', 'idx_content_content_type');
    await queryInterface.removeIndex('files', 'idx_files_content_type');
    
    // Remove columns
    await queryInterface.removeColumn('content', 'content_type');
    await queryInterface.removeColumn('files', 'content_type');
    
    console.log('✅ content_type field removed successfully');
  }
}; 