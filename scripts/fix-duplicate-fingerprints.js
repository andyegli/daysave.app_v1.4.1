#!/usr/bin/env node

/**
 * Fix Duplicate Device Fingerprints
 * 
 * This script identifies and removes duplicate device fingerprints,
 * keeping only the most recent record for each unique fingerprint.
 * 
 * Usage: node scripts/fix-duplicate-fingerprints.js [options]
 * 
 * Options:
 *   --dry-run     Show what would be done without making changes
 *   --force       Remove duplicates without confirmation
 */

const { UserDevice, LoginAttempt } = require('../models');
const { Op } = require('sequelize');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  force: args.includes('--force')
};

/**
 * Find and fix duplicate fingerprints
 */
async function fixDuplicateFingerprints() {
  console.log('🔍 Finding Duplicate Device Fingerprints');
  console.log('======================================\n');

  try {
    // Step 1: Find all duplicate fingerprints
    const duplicates = await UserDevice.findAll({
      attributes: [
        'device_fingerprint',
        [require('sequelize').fn('COUNT', require('sequelize').col('device_fingerprint')), 'count'],
        [require('sequelize').fn('MIN', require('sequelize').col('createdAt')), 'oldest'],
        [require('sequelize').fn('MAX', require('sequelize').col('createdAt')), 'newest']
      ],
      group: ['device_fingerprint'],
      having: require('sequelize').literal('COUNT(device_fingerprint) > 1'),
      raw: true
    });

    console.log(`📊 Found ${duplicates.length} fingerprints with duplicates:`);
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicate fingerprints found!');
      return;
    }

    let totalDuplicateRecords = 0;
    duplicates.forEach(dup => {
      console.log(`   ${dup.device_fingerprint.substring(0, 16)}...: ${dup.count} occurrences`);
      totalDuplicateRecords += parseInt(dup.count) - 1; // -1 because we keep one
    });

    console.log(`\n🗑️  Total duplicate records to remove: ${totalDuplicateRecords}`);

    if (options.dryRun) {
      console.log('\n🧪 DRY RUN MODE - No changes will be made');
      
      // Show detailed breakdown
      for (const dup of duplicates) {
        const records = await UserDevice.findAll({
          where: { device_fingerprint: dup.device_fingerprint },
          order: [['createdAt', 'DESC']],
          raw: true
        });
        
        console.log(`\n📋 Fingerprint: ${dup.device_fingerprint.substring(0, 16)}...`);
        console.log(`   Keep (newest): ${records[0].id} - ${records[0].createdAt}`);
        for (let i = 1; i < records.length; i++) {
          console.log(`   Remove: ${records[i].id} - ${records[i].createdAt}`);
        }
      }
      return;
    }

    // Confirmation prompt (unless --force is used)
    if (!options.force) {
      console.log('\n⚠️  This will permanently delete duplicate records.');
      console.log('   Only the newest record for each fingerprint will be kept.');
      console.log('\n   Press Ctrl+C to cancel, or Enter to continue...');
      
      // Wait for user input
      await new Promise(resolve => {
        process.stdin.once('data', () => resolve());
      });
    }

    // Step 2: Remove duplicates
    console.log('\n🧹 Removing duplicate fingerprints...');
    
    let removedCount = 0;
    
    for (const dup of duplicates) {
      // Get all records for this fingerprint, ordered by creation date (newest first)
      const records = await UserDevice.findAll({
        where: { device_fingerprint: dup.device_fingerprint },
        order: [['createdAt', 'DESC']]
      });
      
      // Keep the first (newest) record, remove the rest
      const toRemove = records.slice(1);
      const idsToRemove = toRemove.map(r => r.id);
      
      if (idsToRemove.length > 0) {
        // Remove the duplicate UserDevice records
        const deletedDevices = await UserDevice.destroy({
          where: { id: { [Op.in]: idsToRemove } }
        });
        
        // Also remove any LoginAttempt records that reference these devices
        const deletedAttempts = await LoginAttempt.destroy({
          where: { device_fingerprint: dup.device_fingerprint }
        });
        
        console.log(`   ✅ Removed ${deletedDevices} duplicate devices for fingerprint ${dup.device_fingerprint.substring(0, 16)}...`);
        if (deletedAttempts > 0) {
          console.log(`      Also removed ${deletedAttempts} related login attempts`);
        }
        
        removedCount += deletedDevices;
      }
    }

    console.log(`\n🎉 Successfully removed ${removedCount} duplicate device records!`);

    // Step 3: Verify cleanup
    console.log('\n🔍 Verifying cleanup...');
    
    const remainingDuplicates = await UserDevice.findAll({
      attributes: [
        'device_fingerprint',
        [require('sequelize').fn('COUNT', require('sequelize').col('device_fingerprint')), 'count']
      ],
      group: ['device_fingerprint'],
      having: require('sequelize').literal('COUNT(device_fingerprint) > 1'),
      raw: true
    });

    if (remainingDuplicates.length === 0) {
      console.log('✅ All duplicates successfully removed!');
    } else {
      console.log(`⚠️  ${remainingDuplicates.length} fingerprints still have duplicates`);
      remainingDuplicates.forEach(dup => {
        console.log(`   ${dup.device_fingerprint.substring(0, 16)}...: ${dup.count} occurrences`);
      });
    }

    // Step 4: Show final statistics
    const totalDevices = await UserDevice.count();
    const uniqueFingerprints = await UserDevice.count({
      distinct: true,
      col: 'device_fingerprint'
    });
    
    console.log('\n📊 Final Statistics:');
    console.log(`   Total devices: ${totalDevices}`);
    console.log(`   Unique fingerprints: ${uniqueFingerprints}`);
    console.log(`   Duplicate rate: ${((totalDevices - uniqueFingerprints) / totalDevices * 100).toFixed(2)}%`);

  } catch (error) {
    console.error('❌ Error fixing duplicate fingerprints:', error);
    process.exit(1);
  }
}

// Run the fix
if (require.main === module) {
  fixDuplicateFingerprints()
    .then(() => {
      console.log('\n✅ Duplicate fingerprint fix completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Fix failed:', error);
      process.exit(1);
    });
}

module.exports = { fixDuplicateFingerprints };
