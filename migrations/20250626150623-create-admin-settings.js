'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('admin_settings', {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'users', key: 'id' }
      },
      login_attempts: {
        type: Sequelize.INTEGER,
        defaultValue: 5
      },
      lock_duration: {
        type: Sequelize.INTEGER,
        defaultValue: 24
      },
      auto_unlock: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      file_types: {
        type: Sequelize.JSON
      },
      max_file_size: {
        type: Sequelize.INTEGER,
        defaultValue: 25
      },
      ip_whitelist: {
        type: Sequelize.JSON
      },
      ip_blacklist: {
        type: Sequelize.JSON
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('admin_settings');
  }
};
