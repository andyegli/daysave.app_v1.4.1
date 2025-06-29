'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('role_permissions', {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        allowNull: false
      },
      role_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'roles', key: 'id' }
      },
      permission_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'permissions', key: 'id' }
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
    await queryInterface.dropTable('role_permissions');
  }
};
