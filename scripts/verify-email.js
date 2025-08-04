#!/usr/bin/env node

/**
 * Script to manually verify user email
 * Usage: node scripts/verify-email.js <username_or_email>
 */

require('dotenv').config();
const { User } = require('../models');

async function verifyUserEmail(identifier) {
  try {
    console.log('🔍 Looking for user:', identifier);
    
    const user = await User.findOne({
      where: {
        [require('sequelize').Op.or]: [
          { username: identifier },
          { email: identifier }
        ]
      }
    });

    if (!user) {
      console.log('❌ User not found:', identifier);
      return;
    }

    console.log('📋 Found user:');
    console.log(`   - ID: ${user.id}`);
    console.log(`   - Username: ${user.username}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Email Verified: ${user.email_verified ? '✅ Yes' : '❌ No'}`);

    if (!user.email_verified) {
      console.log('\n🔧 Setting email_verified to true...');
      await user.update({ email_verified: true });
      console.log('✅ Email verification updated successfully!');
    } else {
      console.log('\n✅ Email is already verified');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit();
  }
}

// Get command line argument
const identifier = process.argv[2];
if (!identifier) {
  console.log('Usage: node scripts/verify-email.js <username_or_email>');
  console.log('Example: node scripts/verify-email.js mba');
  process.exit(1);
}

verifyUserEmail(identifier);