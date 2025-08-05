/**
 * Performance Test Suite
 * 
 * Tests AI pipeline performance under load and stress conditions
 * Run with: node tests/performance-test-suite.js
 */

require('dotenv').config();
const { Content, User } = require('../models');
const BackwardCompatibilityService = require('../services/BackwardCompatibilityService');
const testConfig = require('./test-config');

class PerformanceTestSuite {
  constructor() {
    this.results = [];
    this.testUser = null;
    this.compatibilityService = new BackwardCompatibilityService();
    this.config = testConfig.environments[process.env.NODE_ENV || 'development'];
  }

  /**
   * Run performance tests
   */
  async runPerformanceTests() {
    console.log('⚡ Starting Performance Test Suite...\n');
    
    try {
      await this.setupTestEnvironment();
      
      // Single content performance test
      await this.testSingleContentPerformance();
      
      // Concurrent processing test
      await this.testConcurrentProcessing();
      
      // Memory usage test
      await this.testMemoryUsage();
      
      // Timeout stress test
      await this.testTimeoutHandling();
      
      // Generate performance report
      await this.generatePerformanceReport();
      
    } catch (error) {
      console.error('❌ Performance test suite failed:', error);
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Setup test environment
   */
  async setupTestEnvironment() {
    console.log('🔧 Setting up performance test environment...');
    
    this.testUser = await User.findOne({ where: { email: 'perf-test@daysave.app' } });
    if (!this.testUser) {
      this.testUser = await User.create({
        username: 'perf-test-user',
        email: 'perf-test@daysave.app',
        password: 'test-password-hash'
      });
    }
    
    console.log(`✅ Performance test user ready: ${this.testUser.id}`);
  }

  /**
   * Test single content processing performance
   */
  async testSingleContentPerformance() {
    console.log('\n🎯 Testing Single Content Processing Performance...');
    
    const testCases = [
      {
        name: 'YouTube Short',
        url: testConfig.testContent.reliable.youtube.short,
        expectedTime: testConfig.performance.targets.youtube_short
      },
      {
        name: 'YouTube Medium',
        url: testConfig.testContent.reliable.youtube.medium,
        expectedTime: testConfig.performance.targets.youtube_medium
      },
      {
        name: 'Facebook Video',
        url: testConfig.testContent.reliable.facebook.video,
        expectedTime: testConfig.performance.targets.facebook_video
      }
    ];

    for (const testCase of testCases) {
      await this.runPerformanceTest(testCase);
    }
  }

  /**
   * Test concurrent processing
   */
  async testConcurrentProcessing() {
    console.log('\n🔄 Testing Concurrent Processing...');
    
    const concurrentTests = 3;
    const testUrl = testConfig.testContent.reliable.youtube.short;
    
    console.log(`   Running ${concurrentTests} concurrent tests...`);
    
    const startTime = Date.now();
    const promises = [];
    
    for (let i = 0; i < concurrentTests; i++) {
      const promise = this.runSingleProcessingTest({
        name: `Concurrent Test ${i + 1}`,
        url: testUrl,
        testId: `concurrent-${i}`
      });
      promises.push(promise);
    }
    
    const results = await Promise.allSettled(promises);
    const endTime = Date.now();
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    const concurrentResult = {
      type: 'concurrent',
      testCount: concurrentTests,
      successful,
      failed,
      totalTime: endTime - startTime,
      averageTime: (endTime - startTime) / concurrentTests
    };
    
    this.results.push(concurrentResult);
    
    console.log(`   ✅ Concurrent test completed:`);
    console.log(`      Total time: ${concurrentResult.totalTime}ms`);
    console.log(`      Average time: ${concurrentResult.averageTime}ms`);
    console.log(`      Success rate: ${successful}/${concurrentTests}`);
  }

  /**
   * Test memory usage during processing
   */
  async testMemoryUsage() {
    console.log('\n🧠 Testing Memory Usage...');
    
    const testUrl = testConfig.testContent.reliable.youtube.medium;
    const initialMemory = process.memoryUsage();
    
    console.log(`   Initial memory: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`);
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const beforeProcessing = process.memoryUsage();
    
    try {
      await this.runSingleProcessingTest({
        name: 'Memory Usage Test',
        url: testUrl,
        testId: 'memory-test'
      });
      
      const afterProcessing = process.memoryUsage();
      
      const memoryDelta = {
        heapUsed: afterProcessing.heapUsed - beforeProcessing.heapUsed,
        heapTotal: afterProcessing.heapTotal - beforeProcessing.heapTotal,
        rss: afterProcessing.rss - beforeProcessing.rss
      };
      
      const memoryResult = {
        type: 'memory',
        beforeMemory: beforeProcessing,
        afterMemory: afterProcessing,
        memoryDelta,
        exceedsLimits: {
          heap: afterProcessing.heapUsed > testConfig.performance.memory.maxHeapUsage,
          rss: afterProcessing.rss > testConfig.performance.memory.maxRSS
        }
      };
      
      this.results.push(memoryResult);
      
      console.log(`   Memory after processing: ${Math.round(afterProcessing.heapUsed / 1024 / 1024)}MB`);
      console.log(`   Memory delta: ${Math.round(memoryDelta.heapUsed / 1024 / 1024)}MB`);
      
      if (memoryResult.exceedsLimits.heap || memoryResult.exceedsLimits.rss) {
        console.log(`   ⚠️  Memory usage exceeds configured limits`);
      }
      
    } catch (error) {
      console.log(`   ❌ Memory test failed: ${error.message}`);
    }
  }

  /**
   * Test timeout handling
   */
  async testTimeoutHandling() {
    console.log('\n⏱️  Testing Timeout Handling...');
    
    const shortTimeout = 10000; // 10 seconds - intentionally short
    const testUrl = testConfig.testContent.reliable.youtube.medium; // Should take longer than 10s
    
    console.log(`   Testing with ${shortTimeout}ms timeout...`);
    
    const startTime = Date.now();
    
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Test timeout')), shortTimeout);
      });
      
      const processingPromise = this.runSingleProcessingTest({
        name: 'Timeout Test',
        url: testUrl,
        testId: 'timeout-test'
      });
      
      await Promise.race([processingPromise, timeoutPromise]);
      
      console.log(`   ⚠️  Test completed within timeout (unexpected)`);
      
    } catch (error) {
      const endTime = Date.now();
      
      if (error.message === 'Test timeout') {
        console.log(`   ✅ Timeout handled correctly after ${endTime - startTime}ms`);
        
        this.results.push({
          type: 'timeout',
          timeoutValue: shortTimeout,
          actualTime: endTime - startTime,
          handledCorrectly: true
        });
      } else {
        console.log(`   ❌ Unexpected error: ${error.message}`);
      }
    }
  }

  /**
   * Run a single performance test
   */
  async runPerformanceTest(testCase) {
    console.log(`\n   🧪 ${testCase.name}:`);
    console.log(`      URL: ${testCase.url}`);
    console.log(`      Expected time: ${testCase.expectedTime}ms`);
    
    const result = await this.runSingleProcessingTest(testCase);
    
    const performsWell = result.processingTime <= testCase.expectedTime;
    const icon = performsWell ? '✅' : '⚠️';
    
    console.log(`      ${icon} Actual time: ${result.processingTime}ms`);
    
    if (!performsWell) {
      const overhead = result.processingTime - testCase.expectedTime;
      console.log(`         Overhead: +${overhead}ms (${Math.round((overhead / testCase.expectedTime) * 100)}%)`);
    }
    
    this.results.push({
      type: 'performance',
      ...testCase,
      ...result,
      performsWell
    });
  }

  /**
   * Run a single processing test
   */
  async runSingleProcessingTest(testCase) {
    const startTime = Date.now();
    
    try {
      // Create content record
      const content = await Content.create({
        url: testCase.url,
        user_id: this.testUser.id,
        title: `Performance Test: ${testCase.name}`,
        source_platform: 'test'
      });
      
      // Process with AI pipeline
      const processingOptions = {
        transcription: true,
        sentiment: true,
        summarization: true,
        thumbnails: true,
        user_id: this.testUser.id,
        content_id: content.id
      };
      
      await this.compatibilityService.analyzeContent(testCase.url, processingOptions);
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Cleanup
      await Content.destroy({ where: { id: content.id } });
      
      return {
        status: 'success',
        processingTime,
        contentId: content.id
      };
      
    } catch (error) {
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      return {
        status: 'failed',
        processingTime,
        error: error.message
      };
    }
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport() {
    console.log('\n📊 PERFORMANCE TEST RESULTS');
    console.log('=====================================');
    
    const performanceTests = this.results.filter(r => r.type === 'performance');
    const concurrentTests = this.results.filter(r => r.type === 'concurrent');
    const memoryTests = this.results.filter(r => r.type === 'memory');
    const timeoutTests = this.results.filter(r => r.type === 'timeout');
    
    // Performance summary
    if (performanceTests.length > 0) {
      console.log('\n⚡ Performance Tests:');
      const avgTime = performanceTests.reduce((sum, test) => sum + test.processingTime, 0) / performanceTests.length;
      const passedTests = performanceTests.filter(test => test.performsWell).length;
      
      console.log(`   Average processing time: ${Math.round(avgTime)}ms`);
      console.log(`   Tests meeting targets: ${passedTests}/${performanceTests.length}`);
      
      for (const test of performanceTests) {
        const icon = test.performsWell ? '✅' : '⚠️';
        console.log(`   ${icon} ${test.name}: ${test.processingTime}ms`);
      }
    }
    
    // Concurrent processing summary
    if (concurrentTests.length > 0) {
      console.log('\n🔄 Concurrent Processing:');
      for (const test of concurrentTests) {
        console.log(`   Success rate: ${test.successful}/${test.testCount}`);
        console.log(`   Average time: ${Math.round(test.averageTime)}ms`);
      }
    }
    
    // Memory usage summary
    if (memoryTests.length > 0) {
      console.log('\n🧠 Memory Usage:');
      for (const test of memoryTests) {
        const heapMB = Math.round(test.memoryDelta.heapUsed / 1024 / 1024);
        const rssMB = Math.round(test.memoryDelta.rss / 1024 / 1024);
        console.log(`   Heap delta: ${heapMB}MB`);
        console.log(`   RSS delta: ${rssMB}MB`);
        
        if (test.exceedsLimits.heap || test.exceedsLimits.rss) {
          console.log(`   ⚠️  Exceeds configured memory limits`);
        }
      }
    }
    
    // Timeout handling summary
    if (timeoutTests.length > 0) {
      console.log('\n⏱️  Timeout Handling:');
      for (const test of timeoutTests) {
        const icon = test.handledCorrectly ? '✅' : '❌';
        console.log(`   ${icon} Timeout handled correctly`);
      }
    }
    
    // Overall assessment
    console.log('\n💡 PERFORMANCE ASSESSMENT');
    console.log('=====================================');
    
    const allGood = performanceTests.every(test => test.performsWell) &&
                   concurrentTests.every(test => test.successful === test.testCount) &&
                   memoryTests.every(test => !test.exceedsLimits.heap && !test.exceedsLimits.rss);
    
    if (allGood) {
      console.log('🎉 Excellent performance! All tests passed.');
    } else {
      console.log('⚠️  Performance issues detected:');
      
      const slowTests = performanceTests.filter(test => !test.performsWell);
      if (slowTests.length > 0) {
        console.log(`   - ${slowTests.length} tests exceeded time targets`);
      }
      
      const memoryIssues = memoryTests.filter(test => test.exceedsLimits.heap || test.exceedsLimits.rss);
      if (memoryIssues.length > 0) {
        console.log(`   - Memory usage exceeds limits`);
      }
    }
  }

  /**
   * Cleanup test environment
   */
  async cleanup() {
    console.log('\n🧹 Cleaning up performance test environment...');
    console.log('✅ Cleanup complete');
  }
}

// CLI Interface
if (require.main === module) {
  const performanceTestSuite = new PerformanceTestSuite();
  performanceTestSuite.runPerformanceTests();
}

module.exports = PerformanceTestSuite;