#!/usr/bin/env node

/**
 * Test Runner for DaySave Content Submission Tests
 * 
 * Usage:
 *   node tests/run-tests.js [options]
 * 
 * Options:
 *   --smoke          Run quick smoke tests only
 *   --performance    Run performance tests only
 *   --full          Run all tests (default)
 *   --help          Show help
 */

require('dotenv').config();

const ContentSubmissionTestSuite = require('./content-submission-test-suite');
const PerformanceTestSuite = require('./performance-test-suite');

class TestRunner {
  constructor() {
    this.args = process.argv.slice(2);
  }

  /**
   * Display help information
   */
  showHelp() {
    console.log(`
🧪 DaySave Content Submission Test Runner

USAGE:
  node tests/run-tests.js [options]

OPTIONS:
  --smoke          Run quick smoke tests only (1-2 minutes)
  --performance    Run performance tests only (5-10 minutes)
  --full          Run comprehensive test suite (10-20 minutes)
  --help          Show this help message

EXAMPLES:
  # Quick smoke test before deployment
  node tests/run-tests.js --smoke

  # Full test suite for thorough validation
  node tests/run-tests.js --full

  # Performance testing
  node tests/run-tests.js --performance

ENVIRONMENT:
  Set NODE_ENV to control test timeouts and behavior:
  - development: Shorter timeouts, detailed logging
  - staging: Medium timeouts, full logging
  - production: Longer timeouts, minimal logging

TEST REQUIREMENTS:
  - Database must be running and accessible
  - Google Cloud credentials must be configured
  - OpenAI API key must be set
  - Internet connection required for content processing

OUTPUT:
  Test results are displayed in the console with:
  ✅ Passed tests
  ❌ Failed tests
  ⏱️ Timed out tests
  ⏭️ Skipped tests
  ⚠️ Tests with warnings
`);
  }

  /**
   * Run tests based on arguments
   */
  async run() {
    try {
      if (this.args.includes('--help')) {
        this.showHelp();
        return;
      }

      console.log('🧪 DaySave Content Submission Test Runner');
      console.log('==========================================\n');

      // Check environment
      await this.checkEnvironment();

      if (this.args.includes('--smoke')) {
        console.log('💨 Running Smoke Tests...\n');
        const testSuite = new ContentSubmissionTestSuite();
        await testSuite.runSmokeTest();
        
      } else if (this.args.includes('--performance')) {
        console.log('⚡ Running Performance Tests...\n');
        const performanceTestSuite = new PerformanceTestSuite();
        await performanceTestSuite.runPerformanceTests();
        
      } else {
        // Default: run full test suite
        console.log('🔬 Running Full Test Suite...\n');
        
        const testSuite = new ContentSubmissionTestSuite();
        await testSuite.runAllTests();
        
        console.log('\n⚡ Running Performance Tests...\n');
        const performanceTestSuite = new PerformanceTestSuite();
        await performanceTestSuite.runPerformanceTests();
      }

      console.log('\n✅ Test run completed!');
      
    } catch (error) {
      console.error('\n❌ Test runner failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Check environment prerequisites
   */
  async checkEnvironment() {
    console.log('🔍 Checking environment prerequisites...');
    
    const issues = [];
    
    // Check database connection
    try {
      const { sequelize } = require('../models');
      await sequelize.authenticate();
      console.log('   ✅ Database connection');
    } catch (error) {
      issues.push('Database connection failed');
      console.log('   ❌ Database connection failed');
    }
    
    // Check Google Cloud configuration
    const hasGoogleConfig = process.env.GOOGLE_API_KEY || 
                           (process.env.GOOGLE_CLOUD_PROJECT_ID && 
                            process.env.GOOGLE_APPLICATION_CREDENTIALS);
    
    if (hasGoogleConfig) {
      console.log('   ✅ Google Cloud configuration');
    } else {
      issues.push('Google Cloud configuration missing');
      console.log('   ❌ Google Cloud configuration missing');
    }
    
    // Check OpenAI configuration
    if (process.env.OPENAI_API_KEY) {
      console.log('   ✅ OpenAI API key');
    } else {
      issues.push('OpenAI API key missing');
      console.log('   ⚠️  OpenAI API key missing (some tests may fail)');
    }
    
    // Check environment
    const env = process.env.NODE_ENV || 'development';
    console.log(`   📍 Environment: ${env}`);
    
    if (issues.length > 0) {
      console.log('\n⚠️  Environment issues detected:');
      issues.forEach(issue => console.log(`   - ${issue}`));
      console.log('\nSome tests may fail. Continue anyway? (Ctrl+C to abort)');
      
      // Give user 5 seconds to abort
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    console.log('');
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new TestRunner();
  runner.run();
}

module.exports = TestRunner;