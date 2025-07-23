#!/usr/bin/env node

/**
 * Debug Session Role Loading
 * 
 * This script helps debug why the admin link isn't showing by:
 * 1. Testing role loading with fresh queries
 * 2. Simulating the exact template condition
 * 3. Checking middleware functionality
 */

const { User, Role } = require('../models');

async function main() {
  console.log('🔍 Debugging Session Role Loading...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // Test 1: Verify admin users exist and roles load correctly
    console.log('\n🧪 Test 1: Admin User Role Loading');
    console.log('─'.repeat(50));
    
    const adminUsers = await User.findAll({
      include: [{
        model: Role,
        required: false
      }],
      where: {},
      order: [['createdAt', 'DESC']]
    });

    console.log(`Found ${adminUsers.length} total users:`);
    adminUsers.forEach(user => {
      const roleName = user.Role ? user.Role.name : 'NO ROLE';
      const isAdmin = user && user.Role && user.Role.name === 'admin';
      const templateCondition = `user && user.Role && user.Role.name === 'admin'`;
      
      console.log(`   ${user.username} (${user.email}):`);
      console.log(`     Role: ${roleName}`);
      console.log(`     Template condition (${templateCondition}): ${isAdmin ? '✅ TRUE' : '❌ FALSE'}`);
      console.log(`     Admin link should ${isAdmin ? 'SHOW' : 'NOT SHOW'}`);
      console.log('');
    });

    // Test 2: Test deserializeUser simulation
    console.log('\n🔄 Test 2: Passport deserializeUser Simulation');
    console.log('─'.repeat(50));
    
    const adminUser = adminUsers.find(u => u.Role && u.Role.name === 'admin');
    if (adminUser) {
      console.log(`Testing with admin user: ${adminUser.username}`);
      
      // Simulate passport.deserializeUser
      const freshUser = await User.findByPk(adminUser.id, { include: [Role] });
      if (freshUser) {
        console.log('✅ deserializeUser simulation successful');
        console.log(`   Fresh user role: ${freshUser.Role ? freshUser.Role.name : 'NO ROLE'}`);
        
        // Test the exact template condition
        const templateTest = freshUser && freshUser.Role && freshUser.Role.name === 'admin';
        console.log(`   Template condition result: ${templateTest ? '✅ TRUE' : '❌ FALSE'}`);
        
        // Debug object structure
        console.log('\n🔍 User object structure:');
        console.log(`   user.id: ${freshUser.id}`);
        console.log(`   user.username: ${freshUser.username}`);
        console.log(`   user.Role: ${freshUser.Role ? 'EXISTS' : 'NULL'}`);
        if (freshUser.Role) {
          console.log(`   user.Role.id: ${freshUser.Role.id}`);
          console.log(`   user.Role.name: "${freshUser.Role.name}"`);
          console.log(`   user.Role.name === 'admin': ${freshUser.Role.name === 'admin'}`);
        }
      } else {
        console.log('❌ deserializeUser simulation failed - user not found');
      }
    } else {
      console.log('❌ No admin user found for testing');
    }

    // Test 3: Check if ensureRoleLoaded middleware is working
    console.log('\n⚙️  Test 3: ensureRoleLoaded Middleware Test');
    console.log('─'.repeat(50));
    
    // Load a user without explicit role inclusion
    const userWithoutRole = await User.findOne();
    if (userWithoutRole) {
      console.log(`User without explicit role loading: ${userWithoutRole.username}`);
      console.log(`   Role property exists: ${userWithoutRole.Role ? 'YES' : 'NO'}`);
      
      if (!userWithoutRole.Role && userWithoutRole.role_id) {
        // Simulate middleware role loading
        const role = await Role.findByPk(userWithoutRole.role_id);
        if (role) {
          userWithoutRole.Role = role;
          userWithoutRole.role = role; // lowercase alias
          console.log('✅ Middleware simulation: Role loaded successfully');
          console.log(`   Loaded role: ${role.name}`);
        } else {
          console.log('❌ Middleware simulation: Role not found');
        }
      }
    }

    // Test 4: Create a debug route response
    console.log('\n📊 Test 4: Debug Information Summary');
    console.log('─'.repeat(50));
    
    const debugInfo = {
      totalUsers: adminUsers.length,
      adminUsers: adminUsers.filter(u => u.Role && u.Role.name === 'admin').length,
      usersWithRoles: adminUsers.filter(u => u.Role).length,
      usersWithoutRoles: adminUsers.filter(u => !u.Role).length
    };

    console.log(`📊 User Statistics:`);
    console.log(`   Total users: ${debugInfo.totalUsers}`);
    console.log(`   Admin users: ${debugInfo.adminUsers}`);
    console.log(`   Users with roles: ${debugInfo.usersWithRoles}`);
    console.log(`   Users without roles: ${debugInfo.usersWithoutRoles}`);

    // Test 5: Provide specific troubleshooting steps
    console.log('\n🔧 Troubleshooting Steps:');
    console.log('─'.repeat(50));
    
    if (debugInfo.adminUsers === 0) {
      console.log('❌ No admin users found - this is the problem!');
      console.log('   Solution: Assign admin role to a user');
    } else if (debugInfo.usersWithoutRoles > 0) {
      console.log('⚠️  Some users missing roles - middleware should handle this');
    } else {
      console.log('✅ User/role data looks correct');
      console.log('   The issue is likely with session state or browser cache');
      console.log('');
      console.log('💡 Try these solutions:');
      console.log('   1. Hard refresh browser (Ctrl+F5 or Cmd+Shift+R)');
      console.log('   2. Clear browser cookies/session');
      console.log('   3. Log out completely and log back in');
      console.log('   4. Try incognito/private browser window');
    }

  } catch (error) {
    console.error('❌ Debug script failed:', error);
  }
}

// Execute if run directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n🎯 Session role debugging completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Debug script failed:', error);
      process.exit(1);
    });
}

module.exports = { main }; 