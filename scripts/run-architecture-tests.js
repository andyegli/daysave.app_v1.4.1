#!/usr/bin/env node

/**
 * Test Runner for New Modular Architecture
 * 
 * This script runs comprehensive tests for the new modular processor
 * architecture including unit tests, integration tests, and performance tests.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

// Test configuration
const TEST_CONFIG = {
  timeout: 60000, // 60 seconds for integration tests
  reporter: 'spec',
  colors: true,
  recursive: true
};

// Test suites to run
const TEST_SUITES = [
  {
    name: 'Unit Tests - Processors',
    pattern: 'tests/unit/processors.test.js',
    description: 'Individual processor component tests'
  },
  {
    name: 'Integration Tests - Modular Architecture',
    pattern: 'tests/integration/modular-architecture.test.js',
    description: 'End-to-end architecture integration tests'
  }
];

class ArchitectureTestRunner {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      suites: []
    };
  }

  async run() {
    console.log('🧪 Modular Architecture Test Suite');
    console.log('='.repeat(50));
    console.log();

    // Check prerequisites
    await this.checkPrerequisites();

    // Run test suites
    for (const suite of TEST_SUITES) {
      await this.runTestSuite(suite);
    }

    // Generate report
    this.generateReport();

    // Exit with appropriate code
    process.exit(this.results.failed > 0 ? 1 : 0);
  }

  async checkPrerequisites() {
    console.log('🔧 Checking prerequisites...');

    // Check if test files exist
    for (const suite of TEST_SUITES) {
      const testPath = path.resolve(suite.pattern);
      try {
        await fs.access(testPath);
        console.log(`  ✅ ${suite.name}: ${testPath}`);
      } catch (error) {
        console.error(`  ❌ ${suite.name}: Test file not found at ${testPath}`);
        process.exit(1);
      }
    }

    // Check if required packages are installed
    try {
      require('mocha');
      require('chai');
      require('sinon');
      console.log('  ✅ Test dependencies available');
    } catch (error) {
      console.error('  ❌ Missing test dependencies. Run: npm install mocha chai sinon --save-dev');
      process.exit(1);
    }

    console.log();
  }

  async runTestSuite(suite) {
    console.log(`🧪 Running: ${suite.name}`);
    console.log(`   ${suite.description}`);
    console.log('-'.repeat(50));

    const startTime = Date.now();
    
    try {
      const result = await this.executeMochaTest(suite.pattern);
      const duration = Date.now() - startTime;

      const suiteResult = {
        name: suite.name,
        passed: result.passed,
        failed: result.failed,
        duration,
        success: result.failed === 0
      };

      this.results.suites.push(suiteResult);
      this.results.total += result.passed + result.failed;
      this.results.passed += result.passed;
      this.results.failed += result.failed;

      if (suiteResult.success) {
        console.log(`✅ ${suite.name} - ${result.passed} tests passed in ${duration}ms`);
      } else {
        console.log(`❌ ${suite.name} - ${result.failed} tests failed, ${result.passed} passed in ${duration}ms`);
      }

    } catch (error) {
      console.error(`💥 ${suite.name} - Test suite crashed:`, error.message);
      this.results.failed++;
    }

    console.log();
  }

  async executeMochaTest(testPattern) {
    return new Promise((resolve, reject) => {
      const mochaArgs = [
        '--timeout', TEST_CONFIG.timeout.toString(),
        '--reporter', TEST_CONFIG.reporter,
        '--recursive',
        testPattern
      ];

      if (TEST_CONFIG.colors) {
        mochaArgs.push('--colors');
      }

      // Set up environment variables for testing
      const env = {
        ...process.env,
        NODE_ENV: 'test',
        LOG_LEVEL: 'error' // Reduce log noise during tests
      };

      const mocha = spawn('npx', ['mocha', ...mochaArgs], {
        env,
        stdio: 'pipe'
      });

      let stdout = '';
      let stderr = '';

      mocha.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        process.stdout.write(output); // Real-time output
      });

      mocha.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        process.stderr.write(output); // Real-time error output
      });

      mocha.on('close', (code) => {
        // Parse test results from output
        const result = this.parseTestResults(stdout);
        
        if (code === 0) {
          resolve(result);
        } else {
          // Even if mocha exits with error code, we can still parse partial results
          resolve(result);
        }
      });

      mocha.on('error', (error) => {
        reject(error);
      });
    });
  }

  parseTestResults(output) {
    // Parse mocha output to extract test counts
    const passedMatch = output.match(/(\d+) passing/);
    const failedMatch = output.match(/(\d+) failing/);
    const pendingMatch = output.match(/(\d+) pending/);

    return {
      passed: passedMatch ? parseInt(passedMatch[1]) : 0,
      failed: failedMatch ? parseInt(failedMatch[1]) : 0,
      pending: pendingMatch ? parseInt(pendingMatch[1]) : 0
    };
  }

  generateReport() {
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(50));
    
    // Overall results
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);
    
    if (this.results.failed === 0) {
      console.log('✅ All tests passed!');
    } else {
      console.log('❌ Some tests failed!');
    }
    
    console.log();
    
    // Suite breakdown
    console.log('Suite Breakdown:');
    this.results.suites.forEach(suite => {
      const status = suite.success ? '✅' : '❌';
      const duration = (suite.duration / 1000).toFixed(2);
      console.log(`  ${status} ${suite.name}: ${suite.passed} passed, ${suite.failed} failed (${duration}s)`);
    });
    
    console.log();
    
    // Performance insights
    const totalDuration = this.results.suites.reduce((sum, suite) => sum + suite.duration, 0);
    console.log(`Total Execution Time: ${(totalDuration / 1000).toFixed(2)}s`);
    
    // Recommendations
    if (this.results.failed > 0) {
      console.log();
      console.log('🔧 RECOMMENDATIONS:');
      console.log('  - Review failed test output above');
      console.log('  - Check processor implementations');
      console.log('  - Verify database schema is up to date');
      console.log('  - Ensure all dependencies are properly installed');
    }
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  
  // Handle command line arguments
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Modular Architecture Test Runner');
    console.log();
    console.log('Usage: node scripts/run-architecture-tests.js [options]');
    console.log();
    console.log('Options:');
    console.log('  --help, -h     Show this help message');
    console.log('  --verbose, -v  Enable verbose output');
    console.log('  --timeout=N    Set test timeout in milliseconds (default: 60000)');
    console.log();
    console.log('Test Suites:');
    TEST_SUITES.forEach(suite => {
      console.log(`  - ${suite.name}: ${suite.description}`);
    });
    process.exit(0);
  }
  
  if (args.includes('--verbose') || args.includes('-v')) {
    TEST_CONFIG.reporter = 'spec';
  }
  
  const timeoutArg = args.find(arg => arg.startsWith('--timeout='));
  if (timeoutArg) {
    TEST_CONFIG.timeout = parseInt(timeoutArg.split('=')[1]) || TEST_CONFIG.timeout;
  }
  
  // Run tests
  const runner = new ArchitectureTestRunner();
  await runner.run();
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = ArchitectureTestRunner; 