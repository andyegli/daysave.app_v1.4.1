'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('relationships', {
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
      contact_id_1: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'contacts', key: 'id' }
      },
      contact_id_2: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'contacts', key: 'id' }
      },
      relationship_type: {
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
    await queryInterface.dropTable('relationships');
  }
};
