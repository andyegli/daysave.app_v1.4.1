#!/usr/bin/env node

/**
 * Check Device Fingerprinting Data Status
 * 
 * This script checks the current state of device fingerprinting data
 * and provides insights for data management.
 */

const { UserDevice, LoginAttempt, User } = require('../models');

async function checkDataStatus() {
  try {
    console.log('🔍 Checking device fingerprinting data status...\n');

    // Count total records
    const userDeviceCount = await UserDevice.count();
    const loginAttemptCount = await LoginAttempt.count();
    const userCount = await User.count();

    console.log('📊 Current Record Counts:');
    console.log(`   Users: ${userCount}`);
    console.log(`   User Devices: ${userDeviceCount}`);
    console.log(`   Login Attempts: ${loginAttemptCount}\n`);

    // Check for duplicate fingerprints
    const duplicateFingerprints = await UserDevice.findAll({
      attributes: [
        'device_fingerprint',
        [require('sequelize').fn('COUNT', require('sequelize').col('device_fingerprint')), 'count']
      ],
      group: ['device_fingerprint'],
      having: require('sequelize').literal('COUNT(device_fingerprint) > 1'),
      raw: true
    });

    console.log('🔄 Duplicate Analysis:');
    console.log(`   Duplicate fingerprints found: ${duplicateFingerprints.length}`);
    if (duplicateFingerprints.length > 0) {
      console.log('   Top duplicates:');
      duplicateFingerprints.slice(0, 5).forEach(dup => {
        console.log(`     ${dup.device_fingerprint}: ${dup.count} occurrences`);
      });
    }
    console.log('');

    // Check data freshness
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const recentDevices = await UserDevice.count({
      where: {
        createdAt: { [require('sequelize').Op.gte]: oneDayAgo }
      }
    });

    const recentAttempts = await LoginAttempt.count({
      where: {
        createdAt: { [require('sequelize').Op.gte]: oneDayAgo }
      }
    });

    const weekOldDevices = await UserDevice.count({
      where: {
        createdAt: { [require('sequelize').Op.lt]: oneWeekAgo }
      }
    });

    const weekOldAttempts = await LoginAttempt.count({
      where: {
        createdAt: { [require('sequelize').Op.lt]: oneWeekAgo }
      }
    });

    console.log('📅 Data Freshness:');
    console.log(`   Devices created in last 24h: ${recentDevices}`);
    console.log(`   Login attempts in last 24h: ${recentAttempts}`);
    console.log(`   Devices older than 1 week: ${weekOldDevices}`);
    console.log(`   Login attempts older than 1 week: ${weekOldAttempts}\n`);

    // Success/failure distribution (since risk_level doesn't exist)
    const successDistribution = await LoginAttempt.findAll({
      attributes: [
        'success',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['success'],
      raw: true
    });

    console.log('✅ Success/Failure Distribution:');
    if (successDistribution.length > 0) {
      successDistribution.forEach(status => {
        const label = status.success ? 'Successful' : 'Failed';
        console.log(`   ${label}: ${status.count} attempts`);
      });
    } else {
      console.log('   No success/failure data found');
    }
    console.log('');

    // Country distribution
    const countryDistribution = await UserDevice.findAll({
      attributes: [
        'country',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      where: {
        country: { [require('sequelize').Op.not]: null }
      },
      group: ['country'],
      order: [[require('sequelize').fn('COUNT', require('sequelize').col('id')), 'DESC']],
      limit: 10,
      raw: true
    });

    console.log('🌍 Top Countries:');
    if (countryDistribution.length > 0) {
      countryDistribution.forEach(country => {
        console.log(`   ${country.country}: ${country.count} devices`);
      });
    } else {
      console.log('   No country data found');
    }

    console.log('\n✅ Data status check completed!');

  } catch (error) {
    console.error('❌ Error checking data status:', error);
    process.exit(1);
  }
}

// Run the check
if (require.main === module) {
  checkDataStatus()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { checkDataStatus };
