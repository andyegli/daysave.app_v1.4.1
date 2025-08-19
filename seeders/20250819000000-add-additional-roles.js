'use strict';

const { v4: uuidv4 } = require('uuid');
const { QueryTypes } = require('sequelize');

/**
 * Seeder to add additional user roles to the DaySave system
 * Adds: moderator, editor, viewer, tester, support, manager roles
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();
    
    // Define new roles with descriptions
    const newRoles = [
      {
        id: uuidv4(),
        name: 'moderator',
        description: 'Content moderator with ability to review and manage user content',
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        name: 'editor',
        description: 'Content editor with advanced content management capabilities',
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        name: 'viewer',
        description: 'Read-only access to content and basic features',
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        name: 'tester',
        description: 'Testing role with access to beta features and testing interfaces',
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        name: 'support',
        description: 'Customer support role with limited admin capabilities',
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        name: 'manager',
        description: 'Team manager with user management and reporting capabilities',
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        name: 'premium',
        description: 'Premium user with enhanced features and higher limits',
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        name: 'enterprise',
        description: 'Enterprise user with full feature access and custom integrations',
        createdAt: now,
        updatedAt: now
      }
    ];

    console.log('🚀 Adding new user roles...');
    
    // Insert roles only if they don't already exist
    for (const role of newRoles) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT * FROM roles WHERE name = :name LIMIT 1`,
        { replacements: { name: role.name }, type: QueryTypes.SELECT }
      );
      
      if (!existing) {
        await queryInterface.bulkInsert('roles', [role], {});
        console.log(`✅ Added role: ${role.name} - ${role.description}`);
      } else {
        console.log(`⚠️  Role already exists: ${role.name}`);
      }
    }

    console.log('✅ All new roles have been processed successfully!');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the roles we added (but keep admin and user)
    const rolesToRemove = [
      'moderator', 'editor', 'viewer', 'tester', 
      'support', 'manager', 'premium', 'enterprise'
    ];
    
    console.log('🗑️  Removing additional roles...');
    
    for (const roleName of rolesToRemove) {
      await queryInterface.bulkDelete('roles', { name: roleName }, {});
      console.log(`🗑️  Removed role: ${roleName}`);
    }
    
    console.log('✅ Role removal completed');
  }
};
