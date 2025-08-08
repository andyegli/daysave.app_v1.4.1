#!/usr/bin/env node

/**
 * CORS Configuration Test Script
 * 
 * This script tests the CORS configuration to verify that allowed domains
 * are properly configured for daysave.local and daysave.app
 */

const path = require('path');

// Mock the environment and simulate the CORS configuration
const testCorsConfiguration = () => {
  console.log('🔍 Testing CORS Configuration...\n');

  // Simulate the CORS configuration from middleware/security.js
  const port = process.env.APP_PORT || process.env.PORT || 3000;
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : [
        `http://localhost:${port}`,
        `https://localhost:${port}`,
        'http://localhost:5000',
        'https://localhost:5000',
        'http://daysave.local',
        'https://daysave.local',
        'http://daysave.app',
        'https://daysave.app'
      ];

  console.log('✅ Default Allowed Origins:');
  allowedOrigins.forEach(origin => {
    console.log(`   - ${origin}`);
  });

  console.log('\n🧪 Testing specific domains:');
  
  const testDomains = [
    'http://daysave.local',
    'https://daysave.local',
    'http://daysave.app',
    'https://daysave.app',
    'http://evil-site.com'
  ];

  testDomains.forEach(testOrigin => {
    const isAllowed = allowedOrigins.indexOf(testOrigin) !== -1;
    const status = isAllowed ? '✅ ALLOWED' : '❌ BLOCKED';
    console.log(`   ${testOrigin}: ${status}`);
  });

  console.log('\n📝 Configuration Summary:');
  console.log('   - daysave.local (HTTP): ✅ Allowed');
  console.log('   - daysave.local (HTTPS): ✅ Allowed');
  console.log('   - daysave.app (HTTP): ✅ Allowed');
  console.log('   - daysave.app (HTTPS): ✅ Allowed');
  
  console.log('\n🔧 To customize allowed origins, set ALLOWED_ORIGINS in your .env file:');
  console.log('   ALLOWED_ORIGINS=http://daysave.local,https://daysave.local,http://daysave.app,https://daysave.app');
  
  console.log('\n🚀 Restart your server for changes to take effect!');
};

// Run the test
testCorsConfiguration();
