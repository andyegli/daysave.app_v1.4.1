'use strict';

const { v4: uuidv4 } = require('uuid');
const { QueryTypes } = require('sequelize');

/**
 * Seeder to add comprehensive permissions and assign them to roles
 * Creates a role-based access control (RBAC) system for DaySave
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();
    
    // Define all permissions needed for the system
    const permissions = [
      // Content Management
      { name: 'content.create', description: 'Create new content items' },
      { name: 'content.read', description: 'View content items' },
      { name: 'content.update', description: 'Edit content items' },
      { name: 'content.delete', description: 'Delete content items' },
      { name: 'content.moderate', description: 'Moderate user content' },
      { name: 'content.publish', description: 'Publish content' },
      
      // File Management
      { name: 'files.upload', description: 'Upload files' },
      { name: 'files.download', description: 'Download files' },
      { name: 'files.delete', description: 'Delete files' },
      { name: 'files.analyze', description: 'Run AI analysis on files' },
      
      // Contact Management
      { name: 'contacts.create', description: 'Create contacts' },
      { name: 'contacts.read', description: 'View contacts' },
      { name: 'contacts.update', description: 'Edit contacts' },
      { name: 'contacts.delete', description: 'Delete contacts' },
      { name: 'contacts.import', description: 'Import contacts' },
      { name: 'contacts.export', description: 'Export contacts' },
      
      // User Management
      { name: 'users.create', description: 'Create new users' },
      { name: 'users.read', description: 'View user information' },
      { name: 'users.update', description: 'Edit user information' },
      { name: 'users.delete', description: 'Delete users' },
      { name: 'users.manage_roles', description: 'Assign roles to users' },
      
      // Admin Functions
      { name: 'admin.dashboard', description: 'Access admin dashboard' },
      { name: 'admin.settings', description: 'Manage system settings' },
      { name: 'admin.analytics', description: 'View system analytics' },
      { name: 'admin.logs', description: 'View system logs' },
      { name: 'admin.backup', description: 'Create system backups' },
      
      // API Management
      { name: 'api.create_keys', description: 'Create API keys' },
      { name: 'api.manage_keys', description: 'Manage API keys' },
      { name: 'api.view_usage', description: 'View API usage statistics' },
      
      // Testing & Development
      { name: 'testing.access', description: 'Access testing interfaces' },
      { name: 'testing.multimedia', description: 'Access multimedia testing' },
      { name: 'dev.debug', description: 'Access debug information' },
      
      // Support Functions
      { name: 'support.view_tickets', description: 'View support tickets' },
      { name: 'support.respond', description: 'Respond to support requests' },
      { name: 'support.escalate', description: 'Escalate support issues' },
      
      // Reporting
      { name: 'reports.view', description: 'View reports' },
      { name: 'reports.create', description: 'Create custom reports' },
      { name: 'reports.export', description: 'Export reports' }
    ];

    console.log('🔐 Creating permissions...');
    
    // Insert permissions
    const permissionIds = {};
    for (const perm of permissions) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT * FROM permissions WHERE name = :name LIMIT 1`,
        { replacements: { name: perm.name }, type: QueryTypes.SELECT }
      );
      
      if (!existing) {
        const permId = uuidv4();
        await queryInterface.bulkInsert('permissions', [{
          id: permId,
          name: perm.name,
          description: perm.description,
          createdAt: now,
          updatedAt: now
        }], {});
        permissionIds[perm.name] = permId;
        console.log(`✅ Created permission: ${perm.name}`);
      } else {
        permissionIds[perm.name] = existing.id;
        console.log(`⚠️  Permission already exists: ${perm.name}`);
      }
    }

    // Define role-permission mappings
    const rolePermissions = {
      admin: [
        // Full access to everything
        ...permissions.map(p => p.name)
      ],
      manager: [
        'content.create', 'content.read', 'content.update', 'content.delete',
        'files.upload', 'files.download', 'files.delete', 'files.analyze',
        'contacts.create', 'contacts.read', 'contacts.update', 'contacts.delete', 'contacts.import', 'contacts.export',
        'users.read', 'users.update', 'users.manage_roles',
        'api.create_keys', 'api.manage_keys', 'api.view_usage',
        'reports.view', 'reports.create', 'reports.export'
      ],
      moderator: [
        'content.read', 'content.update', 'content.moderate', 'content.publish',
        'files.download', 'files.analyze',
        'contacts.read', 'contacts.update',
        'users.read',
        'reports.view'
      ],
      editor: [
        'content.create', 'content.read', 'content.update', 'content.publish',
        'files.upload', 'files.download', 'files.analyze',
        'contacts.create', 'contacts.read', 'contacts.update', 'contacts.import', 'contacts.export',
        'api.create_keys', 'api.view_usage'
      ],
      support: [
        'content.read',
        'files.download',
        'contacts.read',
        'users.read', 'users.update',
        'support.view_tickets', 'support.respond', 'support.escalate',
        'reports.view'
      ],
      tester: [
        'content.create', 'content.read', 'content.update',
        'files.upload', 'files.download', 'files.analyze',
        'contacts.create', 'contacts.read', 'contacts.update',
        'testing.access', 'testing.multimedia',
        'dev.debug'
      ],
      premium: [
        'content.create', 'content.read', 'content.update', 'content.delete',
        'files.upload', 'files.download', 'files.delete', 'files.analyze',
        'contacts.create', 'contacts.read', 'contacts.update', 'contacts.delete', 'contacts.import', 'contacts.export',
        'api.create_keys', 'api.manage_keys', 'api.view_usage',
        'reports.view', 'reports.export'
      ],
      enterprise: [
        'content.create', 'content.read', 'content.update', 'content.delete',
        'files.upload', 'files.download', 'files.delete', 'files.analyze',
        'contacts.create', 'contacts.read', 'contacts.update', 'contacts.delete', 'contacts.import', 'contacts.export',
        'users.create', 'users.read', 'users.update', 'users.manage_roles',
        'api.create_keys', 'api.manage_keys', 'api.view_usage',
        'reports.view', 'reports.create', 'reports.export'
      ],
      user: [
        'content.create', 'content.read', 'content.update', 'content.delete',
        'files.upload', 'files.download', 'files.delete', 'files.analyze',
        'contacts.create', 'contacts.read', 'contacts.update', 'contacts.delete', 'contacts.import', 'contacts.export',
        'api.create_keys', 'api.view_usage'
      ],
      viewer: [
        'content.read',
        'files.download',
        'contacts.read',
        'reports.view'
      ]
    };

    console.log('🔗 Assigning permissions to roles...');
    
    // Assign permissions to roles
    for (const [roleName, permissionNames] of Object.entries(rolePermissions)) {
      // Get role ID
      const [role] = await queryInterface.sequelize.query(
        `SELECT * FROM roles WHERE name = :name LIMIT 1`,
        { replacements: { name: roleName }, type: QueryTypes.SELECT }
      );
      
      if (!role) {
        console.log(`⚠️  Role not found: ${roleName}`);
        continue;
      }
      
      console.log(`🔗 Assigning ${permissionNames.length} permissions to ${roleName}...`);
      
      for (const permissionName of permissionNames) {
        const permissionId = permissionIds[permissionName];
        if (!permissionId) {
          console.log(`⚠️  Permission not found: ${permissionName}`);
          continue;
        }
        
        // Check if role-permission already exists
        const [existing] = await queryInterface.sequelize.query(
          `SELECT * FROM role_permissions WHERE role_id = :roleId AND permission_id = :permissionId LIMIT 1`,
          { 
            replacements: { 
              roleId: role.id, 
              permissionId: permissionId 
            }, 
            type: QueryTypes.SELECT 
          }
        );
        
        if (!existing) {
          await queryInterface.bulkInsert('role_permissions', [{
            id: uuidv4(),
            role_id: role.id,
            permission_id: permissionId,
            createdAt: now,
            updatedAt: now
          }], {});
        }
      }
      
      console.log(`✅ Completed permissions for ${roleName}`);
    }

    console.log('✅ All role permissions have been configured successfully!');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🗑️  Removing role permissions...');
    
    // Remove all role_permissions
    await queryInterface.bulkDelete('role_permissions', {}, {});
    
    // Remove permissions (except tester which was created separately)
    const permissionsToRemove = [
      'content.create', 'content.read', 'content.update', 'content.delete', 'content.moderate', 'content.publish',
      'files.upload', 'files.download', 'files.delete', 'files.analyze',
      'contacts.create', 'contacts.read', 'contacts.update', 'contacts.delete', 'contacts.import', 'contacts.export',
      'users.create', 'users.read', 'users.update', 'users.delete', 'users.manage_roles',
      'admin.dashboard', 'admin.settings', 'admin.analytics', 'admin.logs', 'admin.backup',
      'api.create_keys', 'api.manage_keys', 'api.view_usage',
      'testing.access', 'testing.multimedia', 'dev.debug',
      'support.view_tickets', 'support.respond', 'support.escalate',
      'reports.view', 'reports.create', 'reports.export'
    ];
    
    for (const permName of permissionsToRemove) {
      await queryInterface.bulkDelete('permissions', { name: permName }, {});
    }
    
    console.log('✅ Role permissions removal completed');
  }
};
