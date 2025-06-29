'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('content_group_members', {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        allowNull: false
      },
      content_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'content', key: 'id' }
      },
      group_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'content_groups', key: 'id' }
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
    await queryInterface.dropTable('content_group_members');
  }
};
