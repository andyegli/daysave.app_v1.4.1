#!/usr/bin/env node

/**
 * User Role Management Script for DaySave
 * 
 * This script provides utilities to manage user roles and permissions:
 * - List all available roles and their permissions
 * - Assign roles to users
 * - View user permissions
 * - Create custom role assignments
 * 
 * Usage:
 * node scripts/manage-user-roles.js list-roles
 * node scripts/manage-user-roles.js list-permissions
 * node scripts/manage-user-roles.js assign-role <username> <role>
 * node scripts/manage-user-roles.js user-permissions <username>
 * node scripts/manage-user-roles.js list-users [role]
 */

const { User, Role, Permission, RolePermission } = require('../models');
const { Op } = require('sequelize');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  title: (msg) => console.log(`${colors.bright}${colors.cyan}${msg}${colors.reset}`),
  subtitle: (msg) => console.log(`${colors.bright}${msg}${colors.reset}`)
};

/**
 * List all available roles and their descriptions
 */
async function listRoles() {
  try {
    log.title('📋 Available User Roles');
    console.log('='.repeat(50));
    
    const roles = await Role.findAll({
      include: [{
        model: Permission,
        through: { attributes: [] }
      }],
      order: [['name', 'ASC']]
    });

    if (roles.length === 0) {
      log.warning('No roles found in the system');
      return;
    }

    for (const role of roles) {
      const permissionCount = role.Permissions ? role.Permissions.length : 0;
      console.log(`\n${colors.bright}${role.name.toUpperCase()}${colors.reset}`);
      console.log(`Description: ${role.description || 'No description'}`);
      console.log(`Permissions: ${permissionCount} assigned`);
      
      if (role.Permissions && role.Permissions.length > 0) {
        const permissionNames = role.Permissions.map(p => p.name).sort();
        console.log(`  - ${permissionNames.join('\n  - ')}`);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    log.success(`Found ${roles.length} roles in the system`);
    
  } catch (error) {
    log.error(`Failed to list roles: ${error.message}`);
    process.exit(1);
  }
}

/**
 * List all available permissions
 */
async function listPermissions() {
  try {
    log.title('🔐 Available Permissions');
    console.log('='.repeat(50));
    
    const permissions = await Permission.findAll({
      order: [['name', 'ASC']]
    });

    if (permissions.length === 0) {
      log.warning('No permissions found in the system');
      return;
    }

    // Group permissions by category
    const categories = {};
    permissions.forEach(perm => {
      const category = perm.name.split('.')[0];
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(perm);
    });

    for (const [category, perms] of Object.entries(categories)) {
      console.log(`\n${colors.bright}${colors.magenta}${category.toUpperCase()}${colors.reset}`);
      perms.forEach(perm => {
        console.log(`  ${colors.cyan}${perm.name}${colors.reset} - ${perm.description || 'No description'}`);
      });
    }
    
    console.log('\n' + '='.repeat(50));
    log.success(`Found ${permissions.length} permissions in ${Object.keys(categories).length} categories`);
    
  } catch (error) {
    log.error(`Failed to list permissions: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Assign a role to a user
 */
async function assignRole(username, roleName) {
  try {
    log.info(`Assigning role '${roleName}' to user '${username}'...`);
    
    // Find the user
    const user = await User.findOne({ 
      where: { username },
      include: [{ model: Role }]
    });
    
    if (!user) {
      log.error(`User '${username}' not found`);
      process.exit(1);
    }
    
    // Find the role
    const role = await Role.findOne({ where: { name: roleName } });
    
    if (!role) {
      log.error(`Role '${roleName}' not found`);
      process.exit(1);
    }
    
    // Update user's role
    const oldRole = user.Role ? user.Role.name : 'none';
    await user.update({ role_id: role.id });
    
    log.success(`Successfully assigned role '${roleName}' to user '${username}'`);
    log.info(`Previous role: ${oldRole}`);
    log.info(`New role: ${roleName}`);
    
  } catch (error) {
    log.error(`Failed to assign role: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Show user permissions
 */
async function showUserPermissions(username) {
  try {
    log.title(`👤 User Permissions: ${username}`);
    console.log('='.repeat(50));
    
    const user = await User.findOne({
      where: { username },
      include: [{
        model: Role,
        include: [{
          model: Permission,
          through: { attributes: [] }
        }]
      }]
    });
    
    if (!user) {
      log.error(`User '${username}' not found`);
      process.exit(1);
    }
    
    console.log(`${colors.bright}User:${colors.reset} ${user.username} (${user.email})`);
    console.log(`${colors.bright}Role:${colors.reset} ${user.Role ? user.Role.name : 'No role assigned'}`);
    console.log(`${colors.bright}Subscription:${colors.reset} ${user.subscription_status}`);
    
    if (user.Role && user.Role.Permissions) {
      console.log(`\n${colors.bright}Permissions (${user.Role.Permissions.length}):${colors.reset}`);
      
      // Group permissions by category
      const categories = {};
      user.Role.Permissions.forEach(perm => {
        const category = perm.name.split('.')[0];
        if (!categories[category]) {
          categories[category] = [];
        }
        categories[category].push(perm);
      });
      
      for (const [category, perms] of Object.entries(categories)) {
        console.log(`\n  ${colors.magenta}${category}:${colors.reset}`);
        perms.forEach(perm => {
          console.log(`    ${colors.green}✓${colors.reset} ${perm.name} - ${perm.description || 'No description'}`);
        });
      }
    } else {
      log.warning('No permissions assigned (no role or role has no permissions)');
    }
    
    console.log('\n' + '='.repeat(50));
    
  } catch (error) {
    log.error(`Failed to show user permissions: ${error.message}`);
    process.exit(1);
  }
}

/**
 * List users, optionally filtered by role
 */
async function listUsers(roleFilter = null) {
  try {
    const title = roleFilter ? `👥 Users with role: ${roleFilter}` : '👥 All Users';
    log.title(title);
    console.log('='.repeat(50));
    
    const whereClause = {};
    const includeClause = [{ model: Role }];
    
    if (roleFilter) {
      includeClause[0].where = { name: roleFilter };
    }
    
    const users = await User.findAll({
      where: whereClause,
      include: includeClause,
      order: [['username', 'ASC']]
    });
    
    if (users.length === 0) {
      const message = roleFilter ? 
        `No users found with role '${roleFilter}'` : 
        'No users found in the system';
      log.warning(message);
      return;
    }
    
    console.log(`${'Username'.padEnd(20)} ${'Email'.padEnd(30)} ${'Role'.padEnd(15)} ${'Subscription'.padEnd(12)} ${'Created'}`);
    console.log('-'.repeat(90));
    
    users.forEach(user => {
      const username = user.username.padEnd(20);
      const email = user.email.padEnd(30);
      const role = (user.Role ? user.Role.name : 'none').padEnd(15);
      const subscription = user.subscription_status.padEnd(12);
      const created = user.createdAt.toISOString().split('T')[0];
      
      console.log(`${username} ${email} ${role} ${subscription} ${created}`);
    });
    
    console.log('\n' + '='.repeat(50));
    log.success(`Found ${users.length} users`);
    
  } catch (error) {
    log.error(`Failed to list users: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Show usage information
 */
function showUsage() {
  console.log(`
${colors.bright}${colors.cyan}DaySave User Role Management${colors.reset}

${colors.bright}Usage:${colors.reset}
  node scripts/manage-user-roles.js <command> [arguments]

${colors.bright}Commands:${colors.reset}
  ${colors.green}list-roles${colors.reset}                    List all available roles and their permissions
  ${colors.green}list-permissions${colors.reset}             List all available permissions by category
  ${colors.green}assign-role <username> <role>${colors.reset} Assign a role to a user
  ${colors.green}user-permissions <username>${colors.reset}   Show permissions for a specific user
  ${colors.green}list-users [role]${colors.reset}            List all users, optionally filtered by role

${colors.bright}Examples:${colors.reset}
  node scripts/manage-user-roles.js list-roles
  node scripts/manage-user-roles.js assign-role john.doe admin
  node scripts/manage-user-roles.js user-permissions john.doe
  node scripts/manage-user-roles.js list-users admin

${colors.bright}Available Roles:${colors.reset}
  admin, manager, moderator, editor, support, tester, premium, enterprise, user, viewer
`);
}

/**
 * Main function
 */
async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);
  
  if (!command) {
    showUsage();
    process.exit(0);
  }
  
  try {
    switch (command) {
      case 'list-roles':
        await listRoles();
        break;
        
      case 'list-permissions':
        await listPermissions();
        break;
        
      case 'assign-role':
        if (args.length < 2) {
          log.error('Usage: assign-role <username> <role>');
          process.exit(1);
        }
        await assignRole(args[0], args[1]);
        break;
        
      case 'user-permissions':
        if (args.length < 1) {
          log.error('Usage: user-permissions <username>');
          process.exit(1);
        }
        await showUserPermissions(args[0]);
        break;
        
      case 'list-users':
        await listUsers(args[0]);
        break;
        
      default:
        log.error(`Unknown command: ${command}`);
        showUsage();
        process.exit(1);
    }
  } catch (error) {
    log.error(`Command failed: ${error.message}`);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    log.error(`Script failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  listRoles,
  listPermissions,
  assignRole,
  showUserPermissions,
  listUsers
};
