#!/usr/bin/env node

/**
 * Role System Testing Script
 * 
 * This script demonstrates and tests the RBAC system by:
 * 1. Creating test routes with different permission requirements
 * 2. Testing role assignments and access control
 * 3. Showing how the new roles impact frontend access
 */

const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { User, Role, Permission } = require('../models');
const { requireRole, requirePermission, isAdmin, hasPermission } = require('../middleware/auth');

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
 * Test permission checking for a user
 */
async function testUserPermissions(username) {
  try {
    log.title(`🧪 Testing Permissions for User: ${username}`);
    console.log('='.repeat(60));
    
    const user = await User.findOne({
      where: { username },
      include: [{ model: Role }]
    });
    
    if (!user) {
      log.error(`User '${username}' not found`);
      return;
    }
    
    console.log(`User: ${user.username} (${user.email})`);
    console.log(`Role: ${user.Role ? user.Role.name : 'No role'}`);
    console.log('');
    
    // Test various permissions
    const permissionsToTest = [
      'content.create',
      'content.moderate',
      'files.upload',
      'files.analyze',
      'admin.dashboard',
      'users.manage_roles',
      'testing.access',
      'support.view_tickets'
    ];
    
    log.subtitle('Permission Test Results:');
    for (const permission of permissionsToTest) {
      const hasAccess = await hasPermission(user, permission);
      const status = hasAccess ? `${colors.green}✓ ALLOWED${colors.reset}` : `${colors.red}✗ DENIED${colors.reset}`;
      console.log(`  ${permission.padEnd(20)} ${status}`);
    }
    
    console.log('');
    
  } catch (error) {
    log.error(`Failed to test user permissions: ${error.message}`);
  }
}

/**
 * Test role-based route access simulation
 */
async function testRouteAccess() {
  log.title('🛣️ Route Access Simulation');
  console.log('='.repeat(60));
  
  // Simulate different route protection scenarios
  const routes = [
    { path: '/admin/dashboard', middleware: 'isAdmin', description: 'Admin Dashboard' },
    { path: '/admin/users', middleware: 'isAdmin', description: 'User Management' },
    { path: '/content/moderate', middleware: 'requirePermission(content.moderate)', description: 'Content Moderation' },
    { path: '/files/analyze', middleware: 'requirePermission(files.analyze)', description: 'File Analysis' },
    { path: '/support/tickets', middleware: 'requirePermission(support.view_tickets)', description: 'Support Tickets' },
    { path: '/testing/interface', middleware: 'requirePermission(testing.access)', description: 'Testing Interface' }
  ];
  
  const testUsers = ['admin', 'aeg', 'dstestuser'];
  
  for (const username of testUsers) {
    const user = await User.findOne({
      where: { username },
      include: [{ model: Role }]
    });
    
    if (!user) continue;
    
    log.subtitle(`Access Test for ${username} (${user.Role?.name || 'no role'}):`);
    
    for (const route of routes) {
      let hasAccess = false;
      
      // Simulate different middleware checks
      if (route.middleware === 'isAdmin') {
        hasAccess = user.Role && ['admin', 'manager'].includes(user.Role.name);
      } else if (route.middleware.includes('requirePermission')) {
        const permission = route.middleware.match(/requirePermission\(([^)]+)\)/)[1];
        hasAccess = await hasPermission(user, permission);
      }
      
      const status = hasAccess ? `${colors.green}✓ ACCESS${colors.reset}` : `${colors.red}✗ DENIED${colors.reset}`;
      console.log(`  ${route.path.padEnd(25)} ${status} (${route.description})`);
    }
    console.log('');
  }
}

/**
 * Test frontend UI element visibility
 */
async function testFrontendVisibility() {
  log.title('🎨 Frontend UI Visibility Test');
  console.log('='.repeat(60));
  
  const testUsers = ['admin', 'aeg', 'dstestuser'];
  
  for (const username of testUsers) {
    const user = await User.findOne({
      where: { username },
      include: [{ model: Role }]
    });
    
    if (!user) continue;
    
    log.subtitle(`UI Elements for ${username} (${user.Role?.name || 'no role'}):`);
    
    // Simulate frontend visibility checks
    const uiElements = [
      {
        element: 'Admin Link in Header',
        condition: user.Role && user.Role.name === 'admin',
        template: 'views/partials/header.ejs line 106-110'
      },
      {
        element: 'Admin Dashboard Button',
        condition: user.roleName === 'admin', // Note: this is a bug in dashboard.ejs
        template: 'views/dashboard.ejs line 160-164'
      },
      {
        element: 'User Management Access',
        condition: user.Role && ['admin', 'manager'].includes(user.Role.name),
        template: 'Admin routes with isAdmin middleware'
      },
      {
        element: 'Content Moderation Tools',
        condition: await hasPermission(user, 'content.moderate'),
        template: 'Would need to be implemented'
      },
      {
        element: 'Testing Interface',
        condition: await hasPermission(user, 'testing.access'),
        template: 'Would need to be implemented'
      }
    ];
    
    for (const ui of uiElements) {
      const visibility = ui.condition ? `${colors.green}VISIBLE${colors.reset}` : `${colors.red}HIDDEN${colors.reset}`;
      console.log(`  ${ui.element.padEnd(30)} ${visibility}`);
      if (ui.template) {
        console.log(`    ${colors.cyan}Template: ${ui.template}${colors.reset}`);
      }
    }
    console.log('');
  }
}

/**
 * Identify gaps in current implementation
 */
async function identifyImplementationGaps() {
  log.title('🔍 Implementation Gap Analysis');
  console.log('='.repeat(60));
  
  log.warning('Current RBAC Implementation Status:');
  console.log('');
  
  const gaps = [
    {
      area: 'Admin Routes',
      status: '✅ IMPLEMENTED',
      details: 'All admin routes use isAdmin middleware (includes manager role)'
    },
    {
      area: 'Content Routes',
      status: '❌ NOT IMPLEMENTED',
      details: 'Content routes only use isAuthenticated, no permission checks'
    },
    {
      area: 'File Routes',
      status: '❌ NOT IMPLEMENTED', 
      details: 'File routes only use isAuthenticated, no permission checks'
    },
    {
      area: 'Contact Routes',
      status: '❌ NOT IMPLEMENTED',
      details: 'Contact routes only use isAuthenticated, no permission checks'
    },
    {
      area: 'API Key Routes',
      status: '❌ NOT IMPLEMENTED',
      details: 'API key routes only use isAuthenticated, no permission checks'
    },
    {
      area: 'Frontend UI Elements',
      status: '⚠️ PARTIALLY IMPLEMENTED',
      details: 'Only admin checks in header, no permission-based UI elements'
    },
    {
      area: 'Testing Interface',
      status: '⚠️ PARTIALLY IMPLEMENTED',
      details: 'requireTesterPermission exists but may not be used everywhere'
    }
  ];
  
  gaps.forEach(gap => {
    console.log(`${gap.area.padEnd(25)} ${gap.status}`);
    console.log(`  ${colors.cyan}${gap.details}${colors.reset}`);
    console.log('');
  });
}

/**
 * Provide implementation recommendations
 */
function provideRecommendations() {
  log.title('💡 Implementation Recommendations');
  console.log('='.repeat(60));
  
  const recommendations = [
    {
      priority: 'HIGH',
      area: 'Content Management Routes',
      action: 'Add requirePermission middleware to content routes',
      example: 'router.post(\'/content\', requirePermission(\'content.create\'), ...)'
    },
    {
      priority: 'HIGH',
      area: 'File Management Routes', 
      action: 'Add requirePermission middleware to file routes',
      example: 'router.post(\'/files/upload\', requirePermission(\'files.upload\'), ...)'
    },
    {
      priority: 'MEDIUM',
      area: 'Frontend UI Elements',
      action: 'Add permission checks to templates using hasPermission helper',
      example: '<% if (await hasPermission(user, \'content.moderate\')) { %>'
    },
    {
      priority: 'MEDIUM',
      area: 'Contact Management Routes',
      action: 'Add requirePermission middleware to contact routes',
      example: 'router.post(\'/contacts\', requirePermission(\'contacts.create\'), ...)'
    },
    {
      priority: 'LOW',
      area: 'Dashboard Bug Fix',
      action: 'Fix dashboard.ejs to use user.Role.name instead of user.roleName',
      example: 'Change line 160: user.Role && user.Role.name === \'admin\''
    }
  ];
  
  recommendations.forEach(rec => {
    const priorityColor = rec.priority === 'HIGH' ? colors.red : 
                         rec.priority === 'MEDIUM' ? colors.yellow : colors.green;
    console.log(`${priorityColor}${rec.priority}${colors.reset} - ${colors.bright}${rec.area}${colors.reset}`);
    console.log(`  Action: ${rec.action}`);
    console.log(`  Example: ${colors.cyan}${rec.example}${colors.reset}`);
    console.log('');
  });
}

/**
 * Main test function
 */
async function runTests() {
  try {
    log.title('🚀 DaySave RBAC System Test Suite');
    console.log('='.repeat(80));
    console.log('');
    
    // Test user permissions
    await testUserPermissions('admin');
    await testUserPermissions('aeg');
    await testUserPermissions('dstestuser');
    
    // Test route access simulation
    await testRouteAccess();
    
    // Test frontend visibility
    await testFrontendVisibility();
    
    // Identify implementation gaps
    await identifyImplementationGaps();
    
    // Provide recommendations
    provideRecommendations();
    
    log.success('Test suite completed successfully!');
    
  } catch (error) {
    log.error(`Test suite failed: ${error.message}`);
    console.error(error);
  }
}

// Run tests if called directly
if (require.main === module) {
  runTests().then(() => {
    process.exit(0);
  }).catch(error => {
    log.error(`Test failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  testUserPermissions,
  testRouteAccess,
  testFrontendVisibility,
  identifyImplementationGaps,
  runTests
};
