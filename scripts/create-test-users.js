#!/usr/bin/env node

/**
 * Create Test Users Script
 * 
 * Creates test users for each role type to facilitate RBAC testing
 * Users created: dstestadmin, dstestmanager, dstestmoderator, etc.
 */

const bcrypt = require('bcrypt');
const { User, Role } = require('../models');

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

// Default test password (can be overridden by environment variable)
const TEST_PASSWORD = process.env.TESTUSER_PASSWORD || 'TestUser123!';

// Test users to create
const testUsers = [
  { role: 'admin', username: 'dstestadmin', email: 'dstestadmin@daysave.app', firstName: 'Admin', lastName: 'Test' },
  { role: 'manager', username: 'dstestmanager', email: 'dstestmanager@daysave.app', firstName: 'Manager', lastName: 'Test' },
  { role: 'moderator', username: 'dstestmoderator', email: 'dstestmoderator@daysave.app', firstName: 'Moderator', lastName: 'Test' },
  { role: 'editor', username: 'dstesteditor', email: 'dstesteditor@daysave.app', firstName: 'Editor', lastName: 'Test' },
  { role: 'support', username: 'dstestsupport', email: 'dstestsupport@daysave.app', firstName: 'Support', lastName: 'Test' },
  { role: 'tester', username: 'dstesttester', email: 'dstesttester@daysave.app', firstName: 'Tester', lastName: 'Test' },
  { role: 'premium', username: 'dstestpremium', email: 'dstestpremium@daysave.app', firstName: 'Premium', lastName: 'Test' },
  { role: 'enterprise', username: 'dstestenterprise', email: 'dstestenterprise@daysave.app', firstName: 'Enterprise', lastName: 'Test' },
  { role: 'user', username: 'dstestuser', email: 'dstestuser@daysave.app', firstName: 'User', lastName: 'Test' },
  { role: 'viewer', username: 'dstestviewer', email: 'dstestviewer@daysave.app', firstName: 'Viewer', lastName: 'Test' }
];

/**
 * Create or update a test user
 */
async function createTestUser(userData) {
  try {
    // Get the role
    const role = await Role.findOne({ where: { name: userData.role } });
    if (!role) {
      log.error(`Role '${userData.role}' not found`);
      return false;
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    // Check if user already exists
    let user = await User.findOne({ where: { username: userData.username } });
    
    if (user) {
      // Update existing user
      await user.update({
        email: userData.email,
        password_hash: passwordHash,
        role_id: role.id,
        first_name: userData.firstName,
        last_name: userData.lastName,
        email_verified: true,
        subscription_status: userData.role === 'premium' ? 'pro' : 
                           userData.role === 'enterprise' ? 'pro' : 'trial'
      });
      log.warning(`Updated existing user: ${userData.username} (${userData.role})`);
    } else {
      // Create new user
      user = await User.create({
        username: userData.username,
        email: userData.email,
        password_hash: passwordHash,
        role_id: role.id,
        first_name: userData.firstName,
        last_name: userData.lastName,
        email_verified: true,
        subscription_status: userData.role === 'premium' ? 'pro' : 
                           userData.role === 'enterprise' ? 'pro' : 'trial',
        language: 'en'
      });
      log.success(`Created new user: ${userData.username} (${userData.role})`);
    }

    return true;
  } catch (error) {
    log.error(`Failed to create user ${userData.username}: ${error.message}`);
    return false;
  }
}

/**
 * Main function to create all test users
 */
async function createAllTestUsers() {
  try {
    log.title('🚀 Creating Test Users for RBAC Testing');
    console.log('='.repeat(60));
    console.log('');
    
    log.info(`Using test password: ${TEST_PASSWORD}`);
    log.info(`Creating ${testUsers.length} test users...`);
    console.log('');

    let successCount = 0;
    let failCount = 0;

    for (const userData of testUsers) {
      const success = await createTestUser(userData);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    console.log('');
    console.log('='.repeat(60));
    log.subtitle('Summary:');
    log.success(`Successfully created/updated: ${successCount} users`);
    if (failCount > 0) {
      log.error(`Failed to create: ${failCount} users`);
    }

    console.log('');
    log.subtitle('Test User Credentials:');
    console.log(`${colors.cyan}Username Pattern:${colors.reset} dstest{rolename}`);
    console.log(`${colors.cyan}Password:${colors.reset} ${TEST_PASSWORD}`);
    console.log(`${colors.cyan}Email Pattern:${colors.reset} dstest{rolename}@daysave.app`);
    
    console.log('');
    log.subtitle('Available Test Users:');
    testUsers.forEach(user => {
      console.log(`  ${colors.green}${user.username.padEnd(18)}${colors.reset} ${user.role.padEnd(12)} ${user.email}`);
    });

    console.log('');
    log.success('Test user creation completed!');
    
    return successCount === testUsers.length;
    
  } catch (error) {
    log.error(`Failed to create test users: ${error.message}`);
    console.error(error);
    return false;
  }
}

/**
 * Delete all test users (cleanup function)
 */
async function deleteAllTestUsers() {
  try {
    log.title('🗑️ Deleting All Test Users');
    console.log('='.repeat(60));
    
    const testUsernames = testUsers.map(u => u.username);
    const deletedCount = await User.destroy({
      where: {
        username: testUsernames
      }
    });
    
    log.success(`Deleted ${deletedCount} test users`);
    return true;
    
  } catch (error) {
    log.error(`Failed to delete test users: ${error.message}`);
    return false;
  }
}

/**
 * List all test users
 */
async function listTestUsers() {
  try {
    log.title('👥 Current Test Users');
    console.log('='.repeat(60));
    
    const testUsernames = testUsers.map(u => u.username);
    const users = await User.findAll({
      where: {
        username: testUsernames
      },
      include: [{ model: Role }],
      order: [['username', 'ASC']]
    });
    
    if (users.length === 0) {
      log.warning('No test users found');
      return;
    }
    
    console.log(`${'Username'.padEnd(20)} ${'Role'.padEnd(12)} ${'Email'.padEnd(30)} ${'Status'}`);
    console.log('-'.repeat(80));
    
    users.forEach(user => {
      const username = user.username.padEnd(20);
      const role = (user.Role ? user.Role.name : 'none').padEnd(12);
      const email = user.email.padEnd(30);
      const status = user.email_verified ? 'Verified' : 'Unverified';
      
      console.log(`${username} ${role} ${email} ${status}`);
    });
    
    console.log('');
    log.success(`Found ${users.length} test users`);
    
  } catch (error) {
    log.error(`Failed to list test users: ${error.message}`);
  }
}

/**
 * Show usage information
 */
function showUsage() {
  console.log(`
${colors.bright}${colors.cyan}DaySave Test User Management${colors.reset}

${colors.bright}Usage:${colors.reset}
  node scripts/create-test-users.js <command>

${colors.bright}Commands:${colors.reset}
  ${colors.green}create${colors.reset}     Create all test users
  ${colors.green}delete${colors.reset}     Delete all test users  
  ${colors.green}list${colors.reset}       List current test users
  ${colors.green}help${colors.reset}       Show this help message

${colors.bright}Environment Variables:${colors.reset}
  ${colors.cyan}TESTUSER_PASSWORD${colors.reset}    Password for test users (default: TestUser123!)

${colors.bright}Examples:${colors.reset}
  node scripts/create-test-users.js create
  TESTUSER_PASSWORD="MyTestPass123" node scripts/create-test-users.js create
  node scripts/create-test-users.js list
`);
}

/**
 * Main execution
 */
async function main() {
  const command = process.argv[2];
  
  if (!command || command === 'help') {
    showUsage();
    process.exit(0);
  }
  
  try {
    switch (command) {
      case 'create':
        const success = await createAllTestUsers();
        process.exit(success ? 0 : 1);
        break;
        
      case 'delete':
        await deleteAllTestUsers();
        process.exit(0);
        break;
        
      case 'list':
        await listTestUsers();
        process.exit(0);
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
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    log.error(`Script failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  createAllTestUsers,
  deleteAllTestUsers,
  listTestUsers,
  testUsers,
  TEST_PASSWORD
};
