'use strict';

const { v4: uuidv4 } = require('uuid');
const { QueryTypes } = require('sequelize');

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

    // Only insert roles that do not already exist
    for (const role of roles) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT * FROM roles WHERE name = :name LIMIT 1`,
        { replacements: { name: role.name }, type: QueryTypes.SELECT }
      );
      if (!existing) {
        await queryInterface.bulkInsert('roles', [role], {});
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('roles', null, {});
  }
}; 