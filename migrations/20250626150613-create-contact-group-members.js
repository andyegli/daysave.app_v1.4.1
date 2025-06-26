'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('contact_group_members', {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        allowNull: false
      },
      contact_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'contacts', key: 'id' }
      },
      group_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'contact_groups', key: 'id' }
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
    await queryInterface.dropTable('contact_group_members');
  }
};
