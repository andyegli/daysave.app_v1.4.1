'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    console.log('Starting: create users table');
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
        allowNull: false
        // Foreign key constraint will be added in a separate migration
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
    console.log('Finished: create users table');
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('users');
  }
};
