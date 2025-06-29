'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        allowNull: false
      },
      username: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      password_hash: {
        type: Sequelize.STRING,
        allowNull: false
      },
      role_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'roles', key: 'id' }
      },
      country: {
        type: Sequelize.STRING
      },
      device_fingerprint: {
        type: Sequelize.STRING
      },
      subscription_status: {
        type: Sequelize.ENUM('free', 'trial', 'basic', 'pro'),
        defaultValue: 'trial'
      },
      language: {
        type: Sequelize.STRING,
        defaultValue: 'en'
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
    await queryInterface.dropTable('users');
  }
};
