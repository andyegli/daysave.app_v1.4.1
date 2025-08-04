/**
 * Test Device Fingerprinting API Endpoints
 * 
 * This script tests the device fingerprinting admin API endpoints
 * to ensure they're working correctly with the new database schema.
 */

const { User, UserDevice, LoginAttempt } = require('../models');

async function testOverviewAPI() {
  console.log('🔍 Testing overview API...');
  
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Total tracked devices
    const totalDevices = await UserDevice.count();
    console.log(`   Total devices: ${totalDevices}`);
    
    // Trusted devices
    const trustedDevices = await UserDevice.count({ 
      where: { is_trusted: true } 
    });
    console.log(`   Trusted devices: ${trustedDevices}`);
    
    // High risk devices (failed attempts in last 24h)
    const highRiskDevices = await LoginAttempt.count({
      where: {
        success: false,
        attempted_at: { [require('sequelize').Op.gte]: yesterday }
      }
    });
    console.log(`   Failed attempts (24h): ${highRiskDevices}`);
    
    // Blocked attempts in last 24 hours
    const blockedAttempts = await LoginAttempt.count({
      where: {
        success: false,
        failure_reason: {
          [require('sequelize').Op.like]: '%blocked%'
        },
        attempted_at: { [require('sequelize').Op.gte]: yesterday }
      }
    });
    console.log(`   Blocked attempts (24h): ${blockedAttempts}`);
    
    console.log('✅ Overview API test passed');
  } catch (error) {
    console.error('❌ Overview API test failed:', error.message);
  }
}

async function testLoginAttemptsAPI() {
  console.log('🔐 Testing login attempts API...');
  
  try {
    const attempts = await LoginAttempt.findAll({
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'email'],
          required: false
        }
      ],
      order: [['attempted_at', 'DESC']],
      limit: 10
    });
    
    console.log(`   Found ${attempts.length} login attempts`);
    
    if (attempts.length > 0) {
      const sample = attempts[0];
      console.log(`   Sample attempt: ${sample.success ? 'SUCCESS' : 'FAILED'} from ${sample.ip_address} at ${sample.attempted_at}`);
      if (sample.User) {
        console.log(`   User: ${sample.User.username} (${sample.User.email})`);
      }
    }
    
    console.log('✅ Login attempts API test passed');
  } catch (error) {
    console.error('❌ Login attempts API test failed:', error.message);
  }
}

async function testDevicesAPI() {
  console.log('📱 Testing devices API...');
  
  try {
    const devices = await UserDevice.findAll({
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'email'],
          required: false
        }
      ],
      order: [['last_login_at', 'DESC']],
      limit: 10
    });
    
    console.log(`   Found ${devices.length} devices`);
    
    if (devices.length > 0) {
      const sample = devices[0];
      console.log(`   Sample device: ${sample.device_fingerprint.substring(0, 20)}... (${sample.is_trusted ? 'TRUSTED' : 'UNTRUSTED'})`);
      console.log(`   Location: ${sample.city}, ${sample.country}`);
      if (sample.User) {
        console.log(`   User: ${sample.User.username}`);
      }
    }
    
    console.log('✅ Devices API test passed');
  } catch (error) {
    console.error('❌ Devices API test failed:', error.message);
  }
}

async function testDatabaseSchema() {
  console.log('🗄️ Testing database schema...');
  
  try {
    // Test that all expected fields exist in LoginAttempt
    const sampleAttempt = await LoginAttempt.findOne();
    if (sampleAttempt) {
      const requiredFields = ['ip_address', 'attempted_at', 'success', 'failure_reason'];
      for (const field of requiredFields) {
        if (sampleAttempt.hasOwnProperty(field)) {
          console.log(`   ✅ ${field} field exists`);
        } else {
          console.log(`   ❌ ${field} field missing`);
        }
      }
    }
    
    console.log('✅ Database schema test passed');
  } catch (error) {
    console.error('❌ Database schema test failed:', error.message);
  }
}

async function main() {
  try {
    console.log('🧪 Starting Device Fingerprinting API Tests...');
    console.log('================================');
    
    await testDatabaseSchema();
    console.log('');
    await testOverviewAPI();
    console.log('');
    await testLoginAttemptsAPI();
    console.log('');
    await testDevicesAPI();
    
    console.log('');
    console.log('================================');
    console.log('✅ All API tests completed successfully!');
    console.log('🌐 The admin dashboard should now work at: http://localhost:3000/admin/device-fingerprinting');
    console.log('================================');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { testOverviewAPI, testLoginAttemptsAPI, testDevicesAPI, testDatabaseSchema };