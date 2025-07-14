'use strict';

const { v4: uuidv4 } = require('uuid');
const { QueryTypes } = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();
    
    // 1. Add tester permission
    const testerPermissionId = uuidv4();
    const testerPermission = {
      id: testerPermissionId,
      name: 'tester',
      description: 'Permission to access multimedia analysis testing interface',
      createdAt: now,
      updatedAt: now
    };

    // Check if tester permission already exists
    const [existingPermission] = await queryInterface.sequelize.query(
      `SELECT * FROM permissions WHERE name = :name LIMIT 1`,
      { replacements: { name: 'tester' }, type: QueryTypes.SELECT }
    );

    if (!existingPermission) {
      await queryInterface.bulkInsert('permissions', [testerPermission], {});
    }

    // 2. Assign tester permission to admin role
    const [adminRole] = await queryInterface.sequelize.query(
      `SELECT * FROM roles WHERE name = :name LIMIT 1`,
      { replacements: { name: 'admin' }, type: QueryTypes.SELECT }
    );

    if (adminRole) {
      const permissionId = existingPermission ? existingPermission.id : testerPermissionId;
      
      // Check if this role-permission combination already exists
      const [existingRolePermission] = await queryInterface.sequelize.query(
        `SELECT * FROM role_permissions WHERE role_id = :roleId AND permission_id = :permissionId LIMIT 1`,
        { 
          replacements: { 
            roleId: adminRole.id, 
            permissionId: permissionId 
          }, 
          type: QueryTypes.SELECT 
        }
      );

      if (!existingRolePermission) {
        const rolePermission = {
          id: uuidv4(),
          role_id: adminRole.id,
          permission_id: permissionId,
          createdAt: now,
          updatedAt: now
        };
        await queryInterface.bulkInsert('role_permissions', [rolePermission], {});
      }
    }

    console.log('✅ Tester permission added and assigned to admin role');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove tester permission from role_permissions
    await queryInterface.sequelize.query(
      `DELETE FROM role_permissions WHERE permission_id IN (SELECT id FROM permissions WHERE name = 'tester')`,
      { type: QueryTypes.DELETE }
    );

    // Remove tester permission
    await queryInterface.bulkDelete('permissions', { name: 'tester' }, {});
  }
};
