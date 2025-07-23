#!/usr/bin/env node

/**
 * Diagnose Admin Interface Issues
 * 
 * This script helps diagnose and fix issues with:
 * 1. Admin link not showing in navigation
 * 2. 500 error on /admin/users route
 * 3. Role loading problems
 */

const { User, Role, UserDevice, UserSubscription } = require('../models');

async function main() {
  console.log('🔧 Diagnosing Admin Interface Issues...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // Test 1: Check admin user accounts and role loading
    console.log('\n📋 Test 1: Admin User Analysis');
    console.log('─'.repeat(50));
    
    const adminUsers = await User.findAll({
      include: [{
        model: Role,
        where: { name: 'admin' },
        required: true
      }]
    });

    if (adminUsers.length === 0) {
      console.log('❌ No admin users found in database');
      
      // Check if admin role exists
      const adminRole = await Role.findOne({ where: { name: 'admin' } });
      if (!adminRole) {
        console.log('❌ Admin role does not exist in database');
        console.log('💡 You may need to run database seeders');
        return;
      } else {
        console.log('✅ Admin role exists but no users assigned');
        console.log('💡 You may need to assign admin role to a user');
        
        // Show all users and their roles
        const allUsers = await User.findAll({
          include: [{ model: Role }]
        });
        
        console.log('\n📊 All users and their roles:');
        allUsers.forEach(user => {
          console.log(`   ${user.username} (${user.email}) → ${user.Role?.name || 'NO ROLE'}`);
        });
      }
    } else {
      console.log(`✅ Found ${adminUsers.length} admin user(s):`);
      adminUsers.forEach(user => {
        console.log(`   ${user.username} (${user.email}) → ${user.Role.name}`);
      });
    }

    // Test 2: Test admin route dependencies
    console.log('\n🧪 Test 2: Admin Route Dependencies');
    console.log('─'.repeat(50));
    
    try {
      // Test the specific query that's failing in /admin/users
      const testQuery = await User.findAndCountAll({
        include: [
          {
            model: Role,
            required: false
          },
          {
            model: UserDevice,
            required: false,
            limit: 1,
            order: [['last_login_at', 'DESC']]
          },
          {
            model: UserSubscription,
            as: 'UserSubscriptions',
            required: false,
            limit: 1,
            order: [['created_at', 'DESC']]
          }
        ],
        limit: 10,
        offset: 0,
        order: [['createdAt', 'DESC']]
      });
      
      console.log(`✅ Admin users query successful: Found ${testQuery.count} users`);
      
      // Show first few users with their data
      console.log('\n📊 Sample user data structure:');
      testQuery.rows.slice(0, 3).forEach(user => {
        console.log(`   ${user.username}:`);
        console.log(`     Role: ${user.Role?.name || 'None'}`);
        console.log(`     Devices: ${user.UserDevices?.length || 0}`);
        console.log(`     Subscriptions: ${user.UserSubscriptions?.length || 0}`);
      });
      
    } catch (queryError) {
      console.log('❌ Admin users query failed:', queryError.message);
      
      // Test individual associations
      console.log('\n🔍 Testing individual associations:');
      
      try {
        await User.findOne({ include: [{ model: Role }] });
        console.log('✅ User-Role association works');
      } catch (e) {
        console.log('❌ User-Role association failed:', e.message);
      }
      
      try {
        await User.findOne({ include: [{ model: UserDevice }] });
        console.log('✅ User-UserDevice association works');
      } catch (e) {
        console.log('❌ User-UserDevice association failed:', e.message);
      }
      
      try {
        await User.findOne({ include: [{ model: UserSubscription, as: 'UserSubscriptions' }] });
        console.log('✅ User-UserSubscription association works');
      } catch (e) {
        console.log('❌ User-UserSubscription association failed:', e.message);
      }
    }

    // Test 3: Check middleware role loading
    console.log('\n⚙️  Test 3: Role Loading Middleware');
    console.log('─'.repeat(50));
    
    try {
      // Simulate how middleware loads roles
      const testUser = await User.findOne({
        include: [{ model: Role }]
      });
      
      if (testUser) {
        console.log('✅ Role loading works for user:', testUser.username);
        console.log(`   Role loaded: ${testUser.Role?.name || 'None'}`);
        
        // Test the specific condition used in header template
        const hasAdminRole = testUser && testUser.Role && testUser.Role.name === 'admin';
        console.log(`   Admin condition check: ${hasAdminRole ? '✅ PASS' : '❌ FAIL'}`);
        
      } else {
        console.log('❌ No users found for role loading test');
      }
    } catch (roleError) {
      console.log('❌ Role loading failed:', roleError.message);
    }

    // Test 4: Check database tables exist
    console.log('\n🗄️  Test 4: Database Table Structure');
    console.log('─'.repeat(50));
    
    try {
      const { sequelize } = require('../models');
      
      // Check if tables exist
      const tables = await sequelize.getQueryInterface().showAllTables();
      const requiredTables = ['users', 'roles', 'user_devices', 'user_subscriptions'];
      
      console.log('📋 Required tables status:');
      requiredTables.forEach(table => {
        const exists = tables.includes(table);
        console.log(`   ${exists ? '✅' : '❌'} ${table}`);
      });
      
      if (!requiredTables.every(table => tables.includes(table))) {
        console.log('\n💡 Some required tables are missing. You may need to run migrations:');
        console.log('   npx sequelize-cli db:migrate');
      }
      
    } catch (dbError) {
      console.log('❌ Database table check failed:', dbError.message);
    }

    // Test 5: Provide fixes
    console.log('\n🔧 Recommended Fixes:');
    console.log('─'.repeat(50));
    
    if (adminUsers.length === 0) {
      console.log('1. ⚠️  No admin users found. Create one:');
      console.log('   • Update a user role to admin in database');
      console.log('   • Or run: UPDATE users SET role_id = (SELECT id FROM roles WHERE name = "admin") WHERE email = "your@email.com"');
    }
    
    console.log('2. 🔄 To fix navigation visibility, ensure:');
    console.log('   • User session includes Role relationship');
    console.log('   • ensureRoleLoaded middleware is working');
    
    console.log('3. 🛠️  To fix 500 errors:');
    console.log('   • Check database associations are properly defined');
    console.log('   • Ensure all referenced tables exist');
    
    console.log('\n✅ Diagnosis complete! Check the results above for specific issues.');

  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
  }
}

// Execute if run directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n🎯 Diagnosis script completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Diagnosis script failed:', error);
      process.exit(1);
    });
}

module.exports = { main }; 