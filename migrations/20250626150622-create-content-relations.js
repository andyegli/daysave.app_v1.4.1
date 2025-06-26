'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('content_relations', {
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
      content_id_1: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'content', key: 'id' }
      },
      content_id_2: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'content', key: 'id' }
      },
      relation_type: {
        type: Sequelize.STRING,
        allowNull: false
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
    await queryInterface.dropTable('content_relations');
  }
};
