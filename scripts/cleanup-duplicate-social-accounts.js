#!/usr/bin/env node

/**
 * Script to clean up duplicate social account entries
 * Keeps the most recent entry for each user+platform combination
 */

const { SocialAccount, User } = require('../models');
const { Op } = require('sequelize');

async function cleanupDuplicateSocialAccounts() {
  console.log('🔍 Starting cleanup of duplicate social accounts...\n');

  try {
    // Find all social accounts grouped by user_id and platform
    const allAccounts = await SocialAccount.findAll({
      attributes: ['id', 'user_id', 'platform', 'handle', 'provider_user_id', 'createdAt'],
      order: [['user_id'], ['platform'], ['createdAt', 'DESC']]
    });

    console.log(`📊 Found ${allAccounts.length} total social accounts`);

    // Group accounts by user_id + platform
    const accountGroups = {};
    
    allAccounts.forEach(account => {
      const key = `${account.user_id}_${account.platform}`;
      if (!accountGroups[key]) {
        accountGroups[key] = [];
      }
      accountGroups[key].push(account);
    });

    let duplicatesFound = 0;
    let duplicatesRemoved = 0;
    const toDelete = [];

    // Process each group
    for (const [key, accounts] of Object.entries(accountGroups)) {
      if (accounts.length > 1) {
        duplicatesFound += accounts.length - 1;
        
        // Keep the most recent (first in DESC order), mark others for deletion
        const [keep, ...duplicates] = accounts;
        
        console.log(`\n🔄 Processing ${accounts.length} duplicates for ${key}:`);
        console.log(`   ✅ KEEPING: ${keep.id} (${keep.handle}) - Created: ${keep.createdAt}`);
        
        duplicates.forEach(duplicate => {
          console.log(`   ❌ DELETING: ${duplicate.id} (${duplicate.handle}) - Created: ${duplicate.createdAt}`);
          toDelete.push(duplicate.id);
        });
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`   - Total account groups: ${Object.keys(accountGroups).length}`);
    console.log(`   - Groups with duplicates: ${Object.values(accountGroups).filter(g => g.length > 1).length}`);
    console.log(`   - Total duplicates found: ${duplicatesFound}`);
    console.log(`   - Records to delete: ${toDelete.length}`);

    if (toDelete.length > 0) {
      console.log(`\n🗑️  Deleting ${toDelete.length} duplicate records...`);
      
      const deletedCount = await SocialAccount.destroy({
        where: {
          id: {
            [Op.in]: toDelete
          }
        }
      });

      console.log(`✅ Successfully deleted ${deletedCount} duplicate social account records`);
      duplicatesRemoved = deletedCount;
    } else {
      console.log(`\n✅ No duplicates found to clean up!`);
    }

    // Verify cleanup
    const remainingAccounts = await SocialAccount.findAll({
      attributes: ['id', 'user_id', 'platform', 'handle'],
      order: [['user_id'], ['platform']]
    });

    console.log(`\n🔍 Post-cleanup verification:`);
    console.log(`   - Remaining social accounts: ${remainingAccounts.length}`);
    
    // Check for any remaining duplicates
    const remainingGroups = {};
    remainingAccounts.forEach(account => {
      const key = `${account.user_id}_${account.platform}`;
      remainingGroups[key] = (remainingGroups[key] || 0) + 1;
    });

    const stillDuplicated = Object.values(remainingGroups).filter(count => count > 1).length;
    if (stillDuplicated > 0) {
      console.log(`   ⚠️  WARNING: ${stillDuplicated} groups still have duplicates!`);
    } else {
      console.log(`   ✅ No remaining duplicates detected`);
    }

    console.log(`\n🎉 Cleanup completed successfully!`);
    console.log(`   - Duplicates removed: ${duplicatesRemoved}`);
    console.log(`   - Final account count: ${remainingAccounts.length}`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

// Run the cleanup
if (require.main === module) {
  cleanupDuplicateSocialAccounts()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupDuplicateSocialAccounts };
