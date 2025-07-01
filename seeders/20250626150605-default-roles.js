'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();
    const roles = [
      {
        id: uuidv4(),
        name: 'admin',
        description: 'Administrator role with full access',
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        name: 'user',
        description: 'Standard user role',
        createdAt: now,
        updatedAt: now
      }
    ];

    await queryInterface.bulkInsert('roles', roles, {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('roles', null, {});
  }
}; 