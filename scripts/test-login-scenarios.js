#!/usr/bin/env node

/**
 * Login Scenarios Test Script
 * 
 * Tests login functionality for both proxy and direct connection scenarios
 * to ensure the redirect loop fix works properly.
 */

const axios = require('axios');
const { JSDOM } = require('jsdom');

// Test configuration
const TEST_CONFIG = {
  directUrl: 'http://localhost:3000',
  proxyUrl: 'http://localhost', // Assuming nginx proxy on port 80
  timeout: 10000,
  maxRetries: 3
};

/**
 * Test login page accessibility
 */
async function testLoginPageAccess(baseUrl, scenario) {
  console.log(`\n🔍 Testing ${scenario} - Login Page Access`);
  console.log(`   URL: ${baseUrl}/auth/login`);
  
  try {
    const response = await axios.get(`${baseUrl}/auth/login`, {
      timeout: TEST_CONFIG.timeout,
      validateStatus: (status) => status < 400, // Don't throw on 3xx redirects
      maxRedirects: 5,
      headers: {
        'User-Agent': 'DaySave-Test-Client/1.0'
      }
    });
    
    console.log(`   ✅ Status: ${response.status}`);
    
    // Check for redirect loops (multiple redirects ending back at login)
    if (response.request._redirects && response.request._redirects.length > 2) {
      console.log(`   ⚠️  Warning: ${response.request._redirects.length} redirects detected`);
      response.request._redirects.forEach((redirect, index) => {
        console.log(`      ${index + 1}. ${redirect.url}`);
      });
    }
    
    // Parse HTML to check for debug info
    const dom = new JSDOM(response.data);
    const document = dom.window.document;
    
    // Check for login form
    const loginForm = document.querySelector('form[action="/auth/login"]');
    const passkeyButton = document.querySelector('.passkey-login-btn');
    const debugInfo = document.querySelector('#hostname-debug');
    
    console.log(`   📝 Login form present: ${!!loginForm}`);
    console.log(`   🔐 Passkey button present: ${!!passkeyButton}`);
    console.log(`   🔍 Debug info present: ${!!debugInfo}`);
    
    // Check for JavaScript files
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const jsFiles = scripts.map(script => script.src).filter(src => src.includes('/js/'));
    console.log(`   📜 JavaScript files loaded: ${jsFiles.length}`);
    jsFiles.forEach(file => {
      console.log(`      - ${file}`);
    });
    
    return {
      success: true,
      status: response.status,
      redirects: response.request._redirects?.length || 0,
      hasLoginForm: !!loginForm,
      hasPasskeyButton: !!passkeyButton,
      hasDebugInfo: !!debugInfo,
      jsFilesCount: jsFiles.length
    };
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.log(`   🔴 Connection refused - service not running on ${baseUrl}`);
    } else if (error.code === 'ETIMEDOUT') {
      console.log(`   🔴 Request timeout - service may be slow or unresponsive`);
    }
    
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
}

/**
 * Test session cookie handling
 */
async function testSessionCookies(baseUrl, scenario) {
  console.log(`\n🍪 Testing ${scenario} - Session Cookie Handling`);
  
  try {
    // Create an axios instance with cookie jar support
    const axiosInstance = axios.create({
      timeout: TEST_CONFIG.timeout,
      withCredentials: true,
      headers: {
        'User-Agent': 'DaySave-Test-Client/1.0'
      }
    });
    
    // First request to get initial cookies
    const response1 = await axiosInstance.get(`${baseUrl}/auth/login`);
    const setCookieHeader = response1.headers['set-cookie'];
    
    console.log(`   🍪 Cookies received: ${setCookieHeader ? setCookieHeader.length : 0}`);
    if (setCookieHeader) {
      setCookieHeader.forEach(cookie => {
        const name = cookie.split('=')[0];
        console.log(`      - ${name}`);
      });
    }
    
    // Second request to test cookie persistence
    const cookieHeader = setCookieHeader ? setCookieHeader.map(c => c.split(';')[0]).join('; ') : '';
    const response2 = await axiosInstance.get(`${baseUrl}/auth/login`, {
      headers: {
        'Cookie': cookieHeader
      }
    });
    
    console.log(`   ✅ Cookie roundtrip successful`);
    
    return {
      success: true,
      cookiesSet: setCookieHeader ? setCookieHeader.length : 0,
      cookieRoundtripWorked: response2.status === 200
    };
    
  } catch (error) {
    console.log(`   ❌ Cookie test failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test health endpoint
 */
async function testHealthEndpoint(baseUrl, scenario) {
  console.log(`\n💓 Testing ${scenario} - Health Check`);
  
  try {
    const response = await axios.get(`${baseUrl}/health`, {
      timeout: 5000
    });
    
    console.log(`   ✅ Health check: ${response.status}`);
    console.log(`   📊 Response: ${JSON.stringify(response.data)}`);
    
    return {
      success: true,
      status: response.status,
      data: response.data
    };
    
  } catch (error) {
    console.log(`   ❌ Health check failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🧪 DaySave Login Scenarios Test');
  console.log('=====================================');
  console.log(`📅 Test Date: ${new Date().toISOString()}`);
  console.log(`🔧 Configuration:`);
  console.log(`   Direct URL: ${TEST_CONFIG.directUrl}`);
  console.log(`   Proxy URL: ${TEST_CONFIG.proxyUrl}`);
  console.log(`   Timeout: ${TEST_CONFIG.timeout}ms`);
  
  const results = {
    direct: {},
    proxy: {},
    summary: {
      startTime: new Date(),
      endTime: null,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0
    }
  };
  
  // Test scenarios
  const scenarios = [
    { url: TEST_CONFIG.directUrl, name: 'Direct Connection (Port 3000)', key: 'direct' },
    { url: TEST_CONFIG.proxyUrl, name: 'Proxy Connection (Nginx)', key: 'proxy' }
  ];
  
  for (const scenario of scenarios) {
    console.log(`\n🎯 SCENARIO: ${scenario.name}`);
    console.log('─'.repeat(50));
    
    // Test login page access
    const loginTest = await testLoginPageAccess(scenario.url, scenario.name);
    results[scenario.key].loginPage = loginTest;
    results.summary.totalTests++;
    if (loginTest.success) results.summary.passedTests++;
    else results.summary.failedTests++;
    
    // Only continue with other tests if login page is accessible
    if (loginTest.success) {
      // Test session cookies
      const cookieTest = await testSessionCookies(scenario.url, scenario.name);
      results[scenario.key].cookies = cookieTest;
      results.summary.totalTests++;
      if (cookieTest.success) results.summary.passedTests++;
      else results.summary.failedTests++;
      
      // Test health endpoint
      const healthTest = await testHealthEndpoint(scenario.url, scenario.name);
      results[scenario.key].health = healthTest;
      results.summary.totalTests++;
      if (healthTest.success) results.summary.passedTests++;
      else results.summary.failedTests++;
    } else {
      console.log(`   ⏭️ Skipping additional tests due to login page failure`);
      results.summary.totalTests += 2; // Count skipped tests as failures
      results.summary.failedTests += 2;
    }
  }
  
  // Final summary
  results.summary.endTime = new Date();
  const duration = results.summary.endTime - results.summary.startTime;
  
  console.log(`\n📊 TEST SUMMARY`);
  console.log('=====================================');
  console.log(`⏱️  Duration: ${duration}ms`);
  console.log(`📊 Total Tests: ${results.summary.totalTests}`);
  console.log(`✅ Passed: ${results.summary.passedTests}`);
  console.log(`❌ Failed: ${results.summary.failedTests}`);
  console.log(`📈 Success Rate: ${Math.round((results.summary.passedTests / results.summary.totalTests) * 100)}%`);
  
  // Scenario comparison
  console.log(`\n🔄 SCENARIO COMPARISON`);
  console.log('─'.repeat(50));
  
  const directSuccess = results.direct.loginPage?.success || false;
  const proxySuccess = results.proxy.loginPage?.success || false;
  
  if (directSuccess && proxySuccess) {
    console.log(`✅ Both scenarios working correctly!`);
  } else if (directSuccess && !proxySuccess) {
    console.log(`⚠️  Direct connection works, proxy connection has issues`);
  } else if (!directSuccess && proxySuccess) {
    console.log(`⚠️  Proxy connection works, direct connection has issues`);
  } else {
    console.log(`❌ Both scenarios have issues`);
  }
  
  // Check for redirect loop indicators
  const directRedirects = results.direct.loginPage?.redirects || 0;
  const proxyRedirects = results.proxy.loginPage?.redirects || 0;
  
  if (directRedirects > 2 || proxyRedirects > 2) {
    console.log(`\n⚠️  REDIRECT LOOP WARNING`);
    console.log(`   Direct redirects: ${directRedirects}`);
    console.log(`   Proxy redirects: ${proxyRedirects}`);
  } else {
    console.log(`\n✅ No redirect loops detected`);
  }
  
  // Save results to file
  const fs = require('fs');
  const resultsFile = `test-results/login-scenarios-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  
  try {
    // Ensure directory exists
    if (!fs.existsSync('test-results')) {
      fs.mkdirSync('test-results', { recursive: true });
    }
    
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    console.log(`\n💾 Results saved to: ${resultsFile}`);
  } catch (error) {
    console.log(`\n⚠️  Could not save results: ${error.message}`);
  }
  
  console.log(`\n🏁 Test completed!`);
  
  // Exit with appropriate code
  process.exit(results.summary.failedTests > 0 ? 1 : 0);
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { runTests, testLoginPageAccess, testSessionCookies };
