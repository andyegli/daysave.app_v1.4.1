#!/usr/bin/env node

/**
 * Enhanced Startup Validation Test Script
 * Tests all external services with actual transaction tests
 */

require('dotenv').config();
const StartupValidator = require('../services/startupValidation');

async function runValidationTest() {
  console.log('🚀 DaySave Enhanced Startup Validation Test');
  console.log('=' .repeat(60));
  console.log('This script tests all external services with actual API calls\n');

  try {
    const validator = new StartupValidator();
    const results = await validator.validateAll();
    
    console.log('\n📋 DETAILED RESULTS:');
    console.log('=' .repeat(40));
    
    // Show detailed results for each service category
    const categories = {
      'Core Services': ['database', 'email', 'sessionSecret'],
      'AI Services': ['openai', 'googleMaps'],
      'Google Cloud': ['googleCloud.speech', 'googleCloud.vision', 'googleCloud.storage'],
      'OAuth Providers': ['oauth.google', 'oauth.microsoft', 'oauth.apple'],
      'Payment Services': ['payments.stripe'],
      'Notifications': ['notifications.sendgrid', 'notifications.twilio'],
      'Multimedia': ['multimedia.youtube', 'multimedia.ffmpeg']
    };
    
    Object.entries(categories).forEach(([category, services]) => {
      console.log(`\n🔧 ${category}:`);
      services.forEach(servicePath => {
        const service = getNestedService(results, servicePath);
        if (service) {
          const icon = service.status === 'success' ? '✅' : 
                      service.status === 'error' ? '❌' : '⚠️';
          console.log(`  ${icon} ${servicePath}: ${service.message}`);
          
          // Show details for interesting services
          if (service.details && (service.status === 'success' || service.status === 'error')) {
            const details = service.details;
            if (details.responseTime) console.log(`     ⏱️  ${details.responseTime}`);
            if (details.testEmailSent) console.log(`     📧 Test email sent successfully`);
            if (details.modelsAvailable) console.log(`     🤖 ${details.modelsAvailable} AI models available`);
            if (details.bucketsAccessible) console.log(`     🪣 ${details.bucketsAccessible} storage buckets accessible`);
            if (details.isSecure !== undefined) console.log(`     🔒 Security score: ${details.entropyScore}`);
            if (details.error) console.log(`     ❗ ${details.error}`);
          }
        }
      });
    });
    
    // Final recommendations
    console.log('\n🎯 RECOMMENDATIONS:');
    console.log('=' .repeat(30));
    
    const summary = validator.getValidationSummary();
    if (summary.critical > 0) {
      console.log('🚨 CRITICAL: Fix failed critical services before production deployment');
    }
    
    if (summary.failed > 0) {
      console.log('⚠️  OPTIONAL: Configure failed non-critical services for full functionality');
    }
    
    if (summary.successful === summary.total) {
      console.log('🎉 EXCELLENT: All services are configured and working correctly!');
    }
    
    console.log('\n📊 PERFORMANCE METRICS:');
    console.log(`   • Services tested: ${summary.total}`);
    console.log(`   • Success rate: ${((summary.successful / summary.total) * 100).toFixed(1)}%`);
    console.log(`   • Critical failures: ${summary.critical}`);
    
    // Environment-specific advice
    console.log('\n🌍 ENVIRONMENT ADVICE:');
    const env = process.env.NODE_ENV || 'development';
    console.log(`   • Current environment: ${env}`);
    
    if (env === 'development') {
      console.log('   • Development: Some service failures are acceptable');
      console.log('   • Focus on: Database, Email, Session Secret');
    } else if (env === 'production') {
      console.log('   • Production: All critical services must pass');
      console.log('   • Ensure monitoring and alerting is configured');
    }
    
    process.exit(summary.critical > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('\n❌ Validation test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

/**
 * Get nested service from results object
 */
function getNestedService(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] ? current[key] : null;
  }, obj);
}

// Show configuration help if no environment file
if (!process.env.DB_HOST && !process.env.DATABASE_URL) {
  console.log('⚠️  No environment configuration detected!');
  console.log('\n📝 SETUP INSTRUCTIONS:');
  console.log('1. Copy .env.example to .env');
  console.log('2. Configure at least these critical services:');
  console.log('   • Database: DB_HOST, DB_USER, DB_USER_PASSWORD, DB_NAME');
  console.log('   • Email: GMAIL_USER, GMAIL_PASS, GMAIL_FROM');
  console.log('   • Security: SESSION_SECRET (32+ chars)');
  console.log('3. Run this test again\n');
}

// Add startup delay for Docker environments
if (process.env.DB_HOST === 'db') {
  console.log('🐳 Docker environment detected - waiting for services...');
  setTimeout(runValidationTest, 2000);
} else {
  runValidationTest();
} 