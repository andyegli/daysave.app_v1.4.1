#!/usr/bin/env node

/**
 * Check backup codes for a specific user
 */

const { User } = require('../models');

async function checkBackupCodes(userIdentifier) {
  try {
    const user = await User.findOne({
      where: {
        [require('sequelize').Op.or]: [
          { email: userIdentifier },
          { username: userIdentifier },
          { id: userIdentifier }
        ]
      }
    });
    
    if (!user) {
      console.log(`❌ User not found: ${userIdentifier}`);
      return;
    }
    
    console.log(`👤 User: ${user.username} (${user.email})`);
    console.log(`🔐 2FA Enabled: ${user.totp_enabled}`);
    console.log(`🔑 Has Secret: ${!!user.totp_secret}`);
    console.log(`📋 Has Backup Codes: ${!!user.totp_backup_codes}`);
    
    if (user.totp_backup_codes) {
      try {
        const backupCodes = JSON.parse(user.totp_backup_codes);
        console.log(`\n📊 Backup Codes Analysis:`);
        console.log(`   - Total codes: ${backupCodes.length}`);
        
        if (Array.isArray(backupCodes) && backupCodes.length > 0) {
          // Check if codes are objects or strings
          const firstCode = backupCodes[0];
          const isObject = typeof firstCode === 'object';
          
          console.log(`   - Format: ${isObject ? 'Object' : 'String'}`);
          
          if (isObject) {
            const usedCount = backupCodes.filter(code => code.used).length;
            const unusedCount = backupCodes.filter(code => !code.used).length;
            
            console.log(`   - Used codes: ${usedCount}`);
            console.log(`   - Unused codes: ${unusedCount}`);
            
            console.log(`\n🔑 Backup Codes:`);
            backupCodes.forEach((codeObj, index) => {
              const status = codeObj.used ? '❌ USED' : '✅ AVAILABLE';
              const usedAt = codeObj.usedAt ? ` (used: ${codeObj.usedAt})` : '';
              console.log(`   ${index + 1}. ${codeObj.code} ${status}${usedAt}`);
            });
          } else {
            // Old format - just strings
            console.log(`\n🔑 Backup Codes (old format):`);
            backupCodes.forEach((code, index) => {
              console.log(`   ${index + 1}. ${code}`);
            });
          }
        }
        
      } catch (parseError) {
        console.log(`❌ Error parsing backup codes: ${parseError.message}`);
        console.log(`📄 Raw backup codes data: ${user.totp_backup_codes}`);
      }
    } else {
      console.log(`\n⚠️  No backup codes found for this user`);
    }
    
  } catch (error) {
    console.error(`❌ Error checking backup codes:`, error.message);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node scripts/check-backup-codes.js <email|username|id>');
    console.log('Example: node scripts/check-backup-codes.js info@itnetworld.co.nz');
    process.exit(1);
  }
  
  await checkBackupCodes(args[0]);
  process.exit(0);
}

if (require.main === module) {
  main();
}
