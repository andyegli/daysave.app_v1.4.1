#!/usr/bin/env node

/**
 * Generate backup codes for users who have 2FA enabled but no backup codes
 * This fixes users who enabled 2FA before backup codes were implemented
 */

const { User } = require('../models');

async function generateBackupCodesForUser(userId) {
  try {
    const user = await User.findByPk(userId);
    
    if (!user) {
      console.log(`❌ User ${userId} not found`);
      return false;
    }
    
    if (!user.totp_enabled) {
      console.log(`⚠️  User ${user.username} (${user.email}) does not have 2FA enabled`);
      return false;
    }
    
    if (user.totp_backup_codes) {
      console.log(`✅ User ${user.username} (${user.email}) already has backup codes`);
      return true;
    }
    
    // Generate 10 backup codes
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      backupCodes.push({
        code: code,
        used: false,
        createdAt: new Date().toISOString()
      });
    }
    
    // Update user with backup codes
    await user.update({
      totp_backup_codes: JSON.stringify(backupCodes)
    });
    
    console.log(`🔑 Generated ${backupCodes.length} backup codes for ${user.username} (${user.email})`);
    console.log('📋 Backup codes:');
    backupCodes.forEach((codeObj, index) => {
      console.log(`   ${index + 1}. ${codeObj.code}`);
    });
    
    return true;
    
  } catch (error) {
    console.error(`❌ Error generating backup codes for user ${userId}:`, error.message);
    return false;
  }
}

async function generateBackupCodesForAllUsers() {
  try {
    console.log('🔍 Finding users with 2FA enabled but no backup codes...\n');
    
    const users = await User.findAll({
      where: {
        totp_enabled: true
      },
      attributes: ['id', 'username', 'email', 'totp_enabled', 'totp_backup_codes']
    });
    
    if (users.length === 0) {
      console.log('✅ No users with 2FA enabled found');
      return;
    }
    
    console.log(`📊 Found ${users.length} users with 2FA enabled\n`);
    
    let generated = 0;
    let alreadyHave = 0;
    
    for (const user of users) {
      if (!user.totp_backup_codes) {
        const success = await generateBackupCodesForUser(user.id);
        if (success) generated++;
      } else {
        console.log(`✅ User ${user.username} (${user.email}) already has backup codes`);
        alreadyHave++;
      }
      console.log(''); // Empty line for readability
    }
    
    console.log('📈 Summary:');
    console.log(`   - Users with existing backup codes: ${alreadyHave}`);
    console.log(`   - New backup codes generated: ${generated}`);
    console.log(`   - Total users with 2FA: ${users.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('🔑 Backup Code Generator\n');
    await generateBackupCodesForAllUsers();
  } else if (args[0] === '--user' && args[1]) {
    console.log(`🔑 Generating backup codes for specific user: ${args[1]}\n`);
    
    // Try to find user by email or username
    const user = await User.findOne({
      where: {
        [require('sequelize').Op.or]: [
          { email: args[1] },
          { username: args[1] },
          { id: args[1] }
        ]
      }
    });
    
    if (!user) {
      console.log(`❌ User not found: ${args[1]}`);
      process.exit(1);
    }
    
    await generateBackupCodesForUser(user.id);
  } else {
    console.log('Usage:');
    console.log('  node scripts/generate-backup-codes.js                    # Generate for all users');
    console.log('  node scripts/generate-backup-codes.js --user <email>     # Generate for specific user');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/generate-backup-codes.js --user info@itnetworld.co.nz');
    console.log('  node scripts/generate-backup-codes.js --user john@example.com');
  }
  
  process.exit(0);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

if (require.main === module) {
  main();
}

module.exports = { generateBackupCodesForUser };
