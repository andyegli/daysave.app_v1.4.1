#!/usr/bin/env node

/**
 * Test Dashboard RBAC Permissions
 * 
 * This script tests the dashboard permission system by checking
 * what permissions different user roles have and simulating
 * the dashboard rendering logic.
 */

const { User, Role, Permission } = require('../models');

async function testDashboardPermissions() {
  console.log('🧪 Testing Dashboard RBAC Permissions\n');
  
  try {
    // Get all roles with their permissions
    const roles = await Role.findAll({
      include: [{
        model: Permission,
        through: { attributes: [] }
      }],
      order: [['name', 'ASC']]
    });
    
    console.log('📊 Dashboard Card Visibility by Role:\n');
    console.log('| Role | Contacts | Files | Content | API Keys | Subscription | Admin | Users | Moderate | Support | Testing | Analytics |');
    console.log('|------|----------|-------|---------|----------|--------------|-------|-------|----------|---------|---------|-----------|');
    
    for (const role of roles) {
      const permissions = role.Permissions.map(p => p.name);
      
      const hasContacts = permissions.includes('contacts.read') ? '✅' : '❌';
      const hasFiles = permissions.includes('files.download') ? '✅' : '❌';
      const hasContent = permissions.includes('content.read') ? '✅' : '❌';
      const hasApiKeys = permissions.includes('api.view_usage') ? '✅' : '❌';
      const hasSubscription = '✅'; // Always visible
      
      // Role-based features (now integrated into main dashboard)
      const hasAdmin = (role.name === 'admin' || role.name === 'manager') ? '✅' : '❌';
      const hasUsers = (role.name === 'admin' || role.name === 'manager') ? '✅' : '❌';
      const hasModerate = (role.name === 'admin' || role.name === 'moderator' || role.name === 'manager') ? '✅' : '❌';
      const hasSupport = (role.name === 'admin' || role.name === 'support' || role.name === 'manager') ? '✅' : '❌';
      const hasTesting = (role.name === 'admin' || role.name === 'tester') ? '✅' : '❌';
      const hasAnalytics = (role.name === 'premium' || role.name === 'enterprise' || role.name === 'admin') ? '✅' : '❌';
      
      console.log(`| **${role.name}** | ${hasContacts} | ${hasFiles} | ${hasContent} | ${hasApiKeys} | ${hasSubscription} | ${hasAdmin} | ${hasUsers} | ${hasModerate} | ${hasSupport} | ${hasTesting} | ${hasAnalytics} |`);
    }
    
    console.log('\n📋 Permission Details:\n');
    
    for (const role of roles) {
      const permissions = role.Permissions.map(p => p.name);
      const dashboardPermissions = permissions.filter(p => 
        p.includes('contacts.read') || 
        p.includes('files.download') || 
        p.includes('content.read') || 
        p.includes('api.view_usage')
      );
      
      console.log(`**${role.name.toUpperCase()}** (${permissions.length} total permissions)`);
      console.log(`  Dashboard-relevant permissions: ${dashboardPermissions.length}`);
      dashboardPermissions.forEach(perm => {
        console.log(`    - ${perm}`);
      });
      console.log('');
    }
    
    // Test with actual users if they exist
    console.log('👥 Testing with actual users:\n');
    
    const users = await User.findAll({
      include: [{
        model: Role,
        include: [{
          model: Permission,
          through: { attributes: [] }
        }]
      }],
      limit: 5
    });
    
    if (users.length > 0) {
      console.log('| Username | Role | Dashboard Cards Visible |');
      console.log('|----------|------|-------------------------|');
      
      for (const user of users) {
        if (user.Role) {
          const permissions = user.Role.Permissions ? user.Role.Permissions.map(p => p.name) : [];
          const visibleCards = [];
          
          // Core management cards
          if (permissions.includes('contacts.read')) visibleCards.push('Contacts');
          if (permissions.includes('files.download')) visibleCards.push('Files');
          if (permissions.includes('content.read')) visibleCards.push('Content');
          if (permissions.includes('api.view_usage')) visibleCards.push('API Keys');
          visibleCards.push('Subscription'); // Always visible
          
          // Role-based cards (now integrated)
          if (user.Role.name === 'admin' || user.Role.name === 'manager') {
            visibleCards.push('Admin Dashboard', 'User Management');
          }
          if (user.Role.name === 'admin' || user.Role.name === 'moderator' || user.Role.name === 'manager') {
            visibleCards.push('Content Moderation');
          }
          if (user.Role.name === 'admin' || user.Role.name === 'support' || user.Role.name === 'manager') {
            visibleCards.push('Support Tickets');
          }
          if (user.Role.name === 'admin' || user.Role.name === 'tester') {
            visibleCards.push('Testing Interface');
          }
          if (user.Role.name === 'premium' || user.Role.name === 'enterprise' || user.Role.name === 'admin') {
            visibleCards.push('Analytics');
          }
          
          console.log(`| ${user.username} | ${user.Role.name} | ${visibleCards.join(', ')} |`);
        }
      }
    } else {
      console.log('No users found in database.');
    }
    
    console.log('\n✅ Dashboard permission test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing dashboard permissions:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testDashboardPermissions()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testDashboardPermissions };
