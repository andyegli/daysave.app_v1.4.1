'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('share_logs', {
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
      content_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: { model: 'content', key: 'id' }
      },
      file_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: { model: 'files', key: 'id' }
      },
      contact_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: { model: 'contacts', key: 'id' }
      },
      group_id: {
        type: Sequelize.CHAR(36),
        allowNull: true
      },
      share_method: {
        type: Sequelize.STRING
      },
      language: {
        type: Sequelize.STRING
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
    await queryInterface.dropTable('share_logs');
  }
};
