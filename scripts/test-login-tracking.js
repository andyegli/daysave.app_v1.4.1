/**
 * Test Login Tracking System
 * 
 * This script tests the new login attempt tracking functionality
 * to ensure that real login attempts are properly recorded in the
 * LoginAttempt table with device fingerprinting and geolocation data.
 */

const { 
  trackSuccessfulLogin, 
  trackFailedLogin, 
  getRecentLoginAttempts, 
  getLoginStatistics 
} = require('../utils/loginAttemptTracker');

const { User, LoginAttempt } = require('../models');

/**
 * Create a mock request object for testing
 */
function createMockRequest(ip = '122.56.200.0', userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36') {
  return {
    ip: ip,
    headers: {
      'user-agent': userAgent,
      'accept-language': 'en-US,en;q=0.9',
      'accept-encoding': 'gzip, deflate, br',
      'connection': 'keep-alive',
      'x-forwarded-for': ip
    }
  };
}

/**
 * Test successful login tracking
 */
async function testSuccessfulLogin() {
  console.log('\n🧪 Testing Successful Login Tracking...');
  
  try {
    // Find a test user
    const user = await User.findOne({ where: { email_verified: true } });
    if (!user) {
      console.log('❌ No verified user found for testing');
      return false;
    }
    
    console.log(`📝 Testing with user: ${user.username} (${user.email})`);
    
    // Create mock request with your IP
    const mockReq = createMockRequest('122.56.200.0');
    
    // Track successful login
    const loginAttempt = await trackSuccessfulLogin(user.id, mockReq, { 
      loginMethod: 'password' 
    });
    
    if (loginAttempt) {
      console.log('✅ Successful login tracked successfully!');
      console.log(`   - Login Attempt ID: ${loginAttempt.id}`);
      console.log(`   - IP Address: ${loginAttempt.ip_address}`);
      console.log(`   - Device Fingerprint: ${loginAttempt.device_fingerprint?.substring(0, 16)}...`);
      console.log(`   - Success: ${loginAttempt.success}`);
      console.log(`   - Country: ${loginAttempt.country || 'Unknown'}`);
      console.log(`   - Risk Score: ${loginAttempt.risk_score || 'N/A'}`);
      return true;
    } else {
      console.log('❌ Failed to track successful login');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error testing successful login:', error.message);
    return false;
  }
}

/**
 * Test failed login tracking
 */
async function testFailedLogin() {
  console.log('\n🧪 Testing Failed Login Tracking...');
  
  try {
    // Find a test user
    const user = await User.findOne({ where: { email_verified: true } });
    if (!user) {
      console.log('❌ No verified user found for testing');
      return false;
    }
    
    console.log(`📝 Testing failed login for user: ${user.username}`);
    
    // Create mock request with different IP
    const mockReq = createMockRequest('192.168.1.100');
    
    // Track failed login
    const loginAttempt = await trackFailedLogin(user.id, mockReq, 'INVALID_PASSWORD', { 
      loginMethod: 'password' 
    });
    
    if (loginAttempt) {
      console.log('✅ Failed login tracked successfully!');
      console.log(`   - Login Attempt ID: ${loginAttempt.id}`);
      console.log(`   - IP Address: ${loginAttempt.ip_address}`);
      console.log(`   - Success: ${loginAttempt.success}`);
      console.log(`   - Failure Reason: ${loginAttempt.failure_reason}`);
      console.log(`   - Risk Score: ${loginAttempt.risk_score || 'N/A'}`);
      return true;
    } else {
      console.log('❌ Failed to track failed login');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error testing failed login:', error.message);
    return false;
  }
}

/**
 * Test OAuth login tracking
 */
async function testOAuthLogin() {
  console.log('\n🧪 Testing OAuth Login Tracking...');
  
  try {
    // Find a test user
    const user = await User.findOne({ where: { email_verified: true } });
    if (!user) {
      console.log('❌ No verified user found for testing');
      return false;
    }
    
    console.log(`📝 Testing OAuth login for user: ${user.username}`);
    
    // Create mock request with your IP
    const mockReq = createMockRequest('122.56.200.0', 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15');
    
    // Track OAuth login
    const loginAttempt = await trackSuccessfulLogin(user.id, mockReq, { 
      loginMethod: 'oauth_google' 
    });
    
    if (loginAttempt) {
      console.log('✅ OAuth login tracked successfully!');
      console.log(`   - Login Attempt ID: ${loginAttempt.id}`);
      console.log(`   - IP Address: ${loginAttempt.ip_address}`);
      console.log(`   - Login Method: ${loginAttempt.login_method}`);
      console.log(`   - User Agent: ${loginAttempt.user_agent?.substring(0, 50)}...`);
      return true;
    } else {
      console.log('❌ Failed to track OAuth login');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error testing OAuth login:', error.message);
    return false;
  }
}

/**
 * Test getting recent login attempts
 */
async function testGetRecentAttempts() {
  console.log('\n🧪 Testing Recent Login Attempts Retrieval...');
  
  try {
    const attempts = await getRecentLoginAttempts({ limit: 10 });
    
    console.log(`✅ Retrieved ${attempts.length} recent login attempts`);
    
    if (attempts.length > 0) {
      console.log('\n📊 Recent Login Attempts:');
      attempts.slice(0, 5).forEach((attempt, index) => {
        console.log(`   ${index + 1}. ${attempt.attempted_at} - ${attempt.User?.username || 'Unknown'} from ${attempt.ip_address}`);
        console.log(`      Success: ${attempt.success}, Method: ${attempt.login_method || 'N/A'}, Location: ${attempt.locationDisplay}`);
      });
      
      // Check if your IP is in the results
      const yourAttempts = attempts.filter(a => a.ip_address === '122.56.200.0');
      if (yourAttempts.length > 0) {
        console.log(`\n🎯 Found ${yourAttempts.length} login attempts from your IP (122.56.200.0)!`);
        yourAttempts.forEach((attempt, index) => {
          console.log(`   ${index + 1}. ${attempt.attempted_at} - ${attempt.User?.username || 'Unknown'}`);
          console.log(`      Success: ${attempt.success}, Risk: ${attempt.risk_score || 'N/A'}, Fingerprint: ${attempt.device_fingerprint?.substring(0, 16)}...`);
        });
      } else {
        console.log('\n⚠️  No login attempts found from your IP (122.56.200.0) yet');
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error getting recent login attempts:', error.message);
    return false;
  }
}

/**
 * Test login statistics
 */
async function testLoginStatistics() {
  console.log('\n🧪 Testing Login Statistics...');
  
  try {
    const stats = await getLoginStatistics({ hoursBack: 24 });
    
    console.log('✅ Login Statistics (Last 24 hours):');
    console.log(`   - Total Attempts: ${stats.totalAttempts}`);
    console.log(`   - Successful: ${stats.successfulAttempts}`);
    console.log(`   - Failed: ${stats.failedAttempts}`);
    console.log(`   - Success Rate: ${stats.successRate}%`);
    console.log(`   - Unique IPs: ${stats.uniqueIPs}`);
    console.log(`   - High Risk: ${stats.highRiskAttempts}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error getting login statistics:', error.message);
    return false;
  }
}

/**
 * Test database records directly
 */
async function testDatabaseRecords() {
  console.log('\n🧪 Testing Database Records...');
  
  try {
    // Count total login attempts
    const totalCount = await LoginAttempt.count();
    console.log(`📊 Total LoginAttempt records in database: ${totalCount}`);
    
    // Get recent records
    const recentRecords = await LoginAttempt.findAll({
      limit: 5,
      order: [['attempted_at', 'DESC']],
      include: [
        {
          model: User,
          attributes: ['username', 'email'],
          required: false
        }
      ]
    });
    
    if (recentRecords.length > 0) {
      console.log('\n📋 Most Recent Database Records:');
      recentRecords.forEach((record, index) => {
        console.log(`   ${index + 1}. ID: ${record.id}`);
        console.log(`      User: ${record.User?.username || 'Unknown'}`);
        console.log(`      IP: ${record.ip_address}`);
        console.log(`      Success: ${record.success}`);
        console.log(`      Method: ${record.login_method || 'N/A'}`);
        console.log(`      Time: ${record.attempted_at}`);
        console.log(`      Risk: ${record.risk_score || 'N/A'}`);
        console.log('      ---');
      });
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error testing database records:', error.message);
    return false;
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Starting Login Tracking System Tests');
  console.log('=====================================');
  
  const results = {
    successfulLogin: false,
    failedLogin: false,
    oauthLogin: false,
    recentAttempts: false,
    statistics: false,
    databaseRecords: false
  };
  
  // Run all tests
  results.successfulLogin = await testSuccessfulLogin();
  results.failedLogin = await testFailedLogin();
  results.oauthLogin = await testOAuthLogin();
  results.recentAttempts = await testGetRecentAttempts();
  results.statistics = await testLoginStatistics();
  results.databaseRecords = await testDatabaseRecords();
  
  // Summary
  console.log('\n📊 Test Results Summary');
  console.log('=======================');
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  console.log(`\n🎯 Overall: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Login tracking system is working correctly.');
    console.log('\n💡 Next steps:');
    console.log('   1. Try logging in with your real account');
    console.log('   2. Check the admin dashboard at /admin/device-fingerprinting');
    console.log('   3. Look for your IP address (122.56.200.0) in the recent login attempts');
  } else {
    console.log('⚠️  Some tests failed. Please check the errors above.');
  }
  
  console.log('\n🔗 Admin Dashboard: http://localhost:3000/admin/device-fingerprinting');
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  runTests,
  testSuccessfulLogin,
  testFailedLogin,
  testOAuthLogin,
  testGetRecentAttempts,
  testLoginStatistics,
  testDatabaseRecords
};
