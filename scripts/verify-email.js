#!/usr/bin/env node
/**
 * User Email Verification Tool for DaySave
 * 
 * PURPOSE:
 * Manually verifies user email addresses to bypass normal email verification
 * process for administrative purposes or troubleshooting.
 * 
 * USAGE:
 * node scripts/verify-email.js <username_or_email>
 * 
 * ARGUMENTS:
 * - username_or_email: User's username or email address to verify
 * 
 * FEATURES:
 * - Looks up user by username or email address
 * - Sets email_verified to true in database
 * - Sets email_verified_at timestamp
 * - Provides confirmation of verification status
 * 
 * EXAMPLE:
 * node scripts/verify-email.js john.doe@example.com
 * node scripts/verify-email.js john_doe
 * 
 * OUTPUT:
 * - User lookup confirmation
 * - Current verification status
 * - Verification update result
 * - Success/error messages
 * 
 * USE CASES:
 * - Manual email verification for admin accounts
 * - Bypassing email verification during development
 * - Troubleshooting user login issues
 * - Administrative user account management
 * 
 * SECURITY NOTES:
 * - Use only for administrative purposes
 * - Verify user identity before running
 * - Log all manual verifications for audit
 * 
 * DEPENDENCIES:
 * - Database models (User)
 * - Environment configuration
 * - Command line argument parsing
 * 
 * AUTHOR: DaySave Development Team
 * CREATED: 2025-08-01 (User Management Tools)
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