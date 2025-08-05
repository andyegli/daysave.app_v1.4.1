/**
 * Content Submission Test Suite
 * 
 * Comprehensive test cases for validating AI pipeline functionality
 * Run with: node tests/content-submission-test-suite.js
 * 
 * Tests cover:
 * - Different content types and platforms
 * - AI pipeline features (transcription, summary, title, thumbnails, tags)
 * - Error handling and edge cases
 * - Performance and timeout scenarios
 * - Database persistence validation
 */

require('dotenv').config();
const { Content, User, ProcessingJob, Thumbnail } = require('../models');
const BackwardCompatibilityService = require('../services/BackwardCompatibilityService');

class ContentSubmissionTestSuite {
  constructor() {
    this.results = [];
    this.testUser = null;
    this.compatibilityService = new BackwardCompatibilityService();
  }

  /**
   * Test configuration
   */
  getTestCases() {
    return {
      // Social Media Video Tests
      socialMediaVideos: [
        {
          name: 'YouTube Short Video',
          url: 'https://www.youtube.com/shorts/P8LeyCTibms',
          expectedFeatures: ['transcription', 'summary', 'title', 'thumbnails', 'tags', 'category'],
          platform: 'youtube',
          timeout: 60000 // 60 seconds
        },
        {
          name: 'Facebook Video',
          url: 'https://www.facebook.com/share/v/1CVGdGppmi/',
          expectedFeatures: ['transcription', 'summary', 'title', 'thumbnails', 'tags'],
          platform: 'facebook',
          timeout: 60000
        },
        {
          name: 'Instagram Reel',
          url: 'https://www.instagram.com/reel/DMPtr24vjNr/?igsh=MXI1OTZxMmlzcnpzbA==',
          expectedFeatures: ['transcription', 'summary', 'title', 'thumbnails'],
          platform: 'instagram',
          timeout: 60000
        },
        {
          name: 'TikTok Video',
          url: 'https://www.tiktok.com/@user/video/1234567890',
          expectedFeatures: ['transcription', 'summary', 'title', 'thumbnails'],
          platform: 'tiktok',
          timeout: 60000,
          skipIfUnavailable: true
        }
      ],

      // Long-form Content Tests
      longFormContent: [
        {
          name: 'YouTube Long Video',
          url: 'https://www.youtube.com/watch?v=Egp4NRhlMDg',
          expectedFeatures: ['transcription', 'summary', 'title', 'thumbnails', 'tags'],
          platform: 'youtube',
          timeout: 180000 // 3 minutes for longer content
        },
        {
          name: 'Vimeo Video',
          url: 'https://vimeo.com/169599296',
          expectedFeatures: ['transcription', 'summary', 'title'],
          platform: 'vimeo',
          timeout: 120000
        }
      ],

      // Document Tests
      documents: [
        {
          name: 'Pinterest Article',
          url: 'https://nz.pinterest.com/pin/how-to-make-sourdough-bread-beginner-friendly-bread-by-elise--645351821605016133/',
          expectedFeatures: ['transcription', 'summary', 'title', 'tags'],
          platform: 'pinterest',
          timeout: 45000
        },
        {
          name: 'News Article',
          url: 'https://www.uniladtech.com/apple/iphone/iphone-trick-check-for-stalking-721473-20250122',
          expectedFeatures: ['transcription', 'summary', 'title', 'tags'],
          platform: 'web',
          timeout: 45000
        }
      ],

      // Edge Cases
      edgeCases: [
        {
          name: 'Invalid URL',
          url: 'https://invalid-url-that-does-not-exist.com/video/123',
          shouldFail: true,
          expectedError: 'URL not accessible',
          timeout: 30000
        },
        {
          name: 'Private Video',
          url: 'https://www.youtube.com/watch?v=private-video-id',
          shouldFail: true,
          expectedError: 'Video not accessible',
          timeout: 30000
        },
        {
          name: 'Very Short Content',
          url: 'https://www.youtube.com/shorts/very-short-video',
          expectedFeatures: ['transcription', 'summary'],
          minTranscriptionLength: 5,
          timeout: 30000,
          skipIfUnavailable: true
        }
      ]
    };
  }

  /**
   * Run all test cases
   */
  async runAllTests() {
    console.log('🧪 Starting Content Submission Test Suite...\n');
    
    try {
      // Setup test environment
      await this.setupTestEnvironment();
      
      const testCases = this.getTestCases();
      
      // Run social media video tests
      console.log('📱 Testing Social Media Videos...');
      await this.runTestCategory(testCases.socialMediaVideos, 'Social Media');
      
      // Run long-form content tests
      console.log('\n🎬 Testing Long-form Content...');
      await this.runTestCategory(testCases.longFormContent, 'Long-form');
      
      // Run document tests
      console.log('\n📄 Testing Documents...');
      await this.runTestCategory(testCases.documents, 'Documents');
      
      // Run edge case tests
      console.log('\n⚠️  Testing Edge Cases...');
      await this.runTestCategory(testCases.edgeCases, 'Edge Cases');
      
      // Generate final report
      await this.generateFinalReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Setup test environment
   */
  async setupTestEnvironment() {
    console.log('🔧 Setting up test environment...');
    
    // Find or create test user
    this.testUser = await User.findOne({ where: { email: 'test@daysave.app' } });
    if (!this.testUser) {
      this.testUser = await User.create({
        username: 'test-user',
        email: 'test@daysave.app',
        password: 'test-password-hash'
      });
    }
    
    console.log(`✅ Test user ready: ${this.testUser.id}`);
  }

  /**
   * Run a category of tests
   */
  async runTestCategory(testCases, categoryName) {
    for (const testCase of testCases) {
      await this.runSingleTest(testCase, categoryName);
    }
  }

  /**
   * Run a single test case
   */
  async runSingleTest(testCase, category) {
    const startTime = Date.now();
    const testResult = {
      category,
      name: testCase.name,
      url: testCase.url,
      startTime,
      endTime: null,
      duration: null,
      status: 'running',
      features: {},
      errors: [],
      warnings: []
    };
    
    console.log(`\n🧪 Testing: ${testCase.name}`);
    console.log(`   URL: ${testCase.url}`);
    
    try {
      // Skip test if marked as such
      if (testCase.skipIfUnavailable) {
        console.log(`   ⏭️  Skipping (marked as skip if unavailable)`);
        testResult.status = 'skipped';
        testResult.endTime = Date.now();
        testResult.duration = testResult.endTime - startTime;
        this.results.push(testResult);
        return;
      }
      
      // Create content record
      const content = await Content.create({
        url: testCase.url,
        user_id: this.testUser.id,
        title: `Test: ${testCase.name}`,
        source_platform: testCase.platform || 'unknown'
      });
      
      console.log(`   📝 Content created: ${content.id}`);
      
      // Process with AI pipeline
      const processingOptions = {
        transcription: true,
        sentiment: true,
        summarization: true,
        thumbnails: true,
        speaker_identification: true,
        enableSummarization: true,
        enableSentimentAnalysis: true,
        user_id: this.testUser.id,
        content_id: content.id
      };
      
      console.log(`   🚀 Starting AI processing...`);
      
      // Set timeout for processing
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Processing timeout')), testCase.timeout);
      });
      
      const processingPromise = this.compatibilityService.analyzeContent(testCase.url, processingOptions);
      
      let processingResult;
      try {
        processingResult = await Promise.race([processingPromise, timeoutPromise]);
      } catch (error) {
        if (error.message === 'Processing timeout') {
          testResult.errors.push(`Processing timeout after ${testCase.timeout}ms`);
          testResult.status = 'timeout';
        } else {
          throw error;
        }
      }
      
      if (testResult.status !== 'timeout') {
        // Validate processing results
        await this.validateProcessingResults(content, testCase, testResult);
        
        // Check if test should fail
        if (testCase.shouldFail) {
          testResult.status = 'unexpected_success';
          testResult.errors.push('Test was expected to fail but succeeded');
        } else {
          testResult.status = 'passed';
        }
      }
      
      // Cleanup test content
      await Content.destroy({ where: { id: content.id } });
      
    } catch (error) {
      if (testCase.shouldFail) {
        testResult.status = 'passed';
        console.log(`   ✅ Expected failure: ${error.message}`);
      } else {
        testResult.status = 'failed';
        testResult.errors.push(error.message);
        console.log(`   ❌ Unexpected failure: ${error.message}`);
      }
    }
    
    testResult.endTime = Date.now();
    testResult.duration = testResult.endTime - startTime;
    this.results.push(testResult);
    
    // Log result
    const statusIcon = {
      'passed': '✅',
      'failed': '❌',
      'timeout': '⏱️',
      'skipped': '⏭️',
      'unexpected_success': '⚠️'
    }[testResult.status];
    
    console.log(`   ${statusIcon} Result: ${testResult.status.toUpperCase()} (${testResult.duration}ms)`);
  }

  /**
   * Validate processing results against expected features
   */
  async validateProcessingResults(content, testCase, testResult) {
    // Refresh content from database
    const updatedContent = await Content.findByPk(content.id);
    
    for (const feature of testCase.expectedFeatures || []) {
      const validation = await this.validateFeature(updatedContent, feature, testCase);
      testResult.features[feature] = validation;
      
      if (validation.status === 'failed') {
        testResult.errors.push(`${feature}: ${validation.message}`);
      } else if (validation.status === 'warning') {
        testResult.warnings.push(`${feature}: ${validation.message}`);
      }
    }
    
    // Check thumbnails separately
    if (testCase.expectedFeatures?.includes('thumbnails')) {
      const thumbnails = await Thumbnail.findAll({ where: { content_id: content.id } });
      testResult.features.thumbnails = {
        status: thumbnails.length > 0 ? 'passed' : 'failed',
        count: thumbnails.length,
        message: thumbnails.length > 0 ? `${thumbnails.length} thumbnails generated` : 'No thumbnails found'
      };
    }
  }

  /**
   * Validate a specific feature
   */
  async validateFeature(content, feature, testCase) {
    switch (feature) {
      case 'transcription':
        if (!content.transcription) {
          return { status: 'failed', message: 'No transcription found' };
        }
        if (testCase.minTranscriptionLength && content.transcription.length < testCase.minTranscriptionLength) {
          return { status: 'warning', message: `Transcription too short: ${content.transcription.length} chars` };
        }
        return { status: 'passed', message: `Transcription: ${content.transcription.length} chars` };
        
      case 'summary':
        if (!content.summary) {
          return { status: 'failed', message: 'No summary found' };
        }
        return { status: 'passed', message: `Summary: ${content.summary.length} chars` };
        
      case 'title':
        if (!content.generatedTitle) {
          return { status: 'failed', message: 'No generated title found' };
        }
        return { status: 'passed', message: `Title: "${content.generatedTitle}"` };
        
      case 'tags':
        if (!content.auto_tags || content.auto_tags.length === 0) {
          return { status: 'failed', message: 'No auto tags found' };
        }
        return { status: 'passed', message: `Tags: ${content.auto_tags.length} generated` };
        
      case 'category':
        if (!content.category) {
          return { status: 'failed', message: 'No category found' };
        }
        return { status: 'passed', message: `Category: "${content.category}"` };
        
      default:
        return { status: 'skipped', message: 'Unknown feature' };
    }
  }

  /**
   * Generate final test report
   */
  async generateFinalReport() {
    console.log('\n📊 TEST SUITE RESULTS');
    console.log('=====================================');
    
    const summary = {
      total: this.results.length,
      passed: this.results.filter(r => r.status === 'passed').length,
      failed: this.results.filter(r => r.status === 'failed').length,
      timeout: this.results.filter(r => r.status === 'timeout').length,
      skipped: this.results.filter(r => r.status === 'skipped').length,
      unexpected_success: this.results.filter(r => r.status === 'unexpected_success').length
    };
    
    console.log(`Total Tests: ${summary.total}`);
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`❌ Failed: ${summary.failed}`);
    console.log(`⏱️ Timeout: ${summary.timeout}`);
    console.log(`⏭️ Skipped: ${summary.skipped}`);
    console.log(`⚠️ Unexpected Success: ${summary.unexpected_success}`);
    
    const successRate = ((summary.passed / (summary.total - summary.skipped)) * 100).toFixed(1);
    console.log(`\n🎯 Success Rate: ${successRate}%`);
    
    // Detailed results by category
    console.log('\n📋 DETAILED RESULTS BY CATEGORY');
    console.log('=====================================');
    
    const categories = [...new Set(this.results.map(r => r.category))];
    for (const category of categories) {
      console.log(`\n${category}:`);
      const categoryResults = this.results.filter(r => r.category === category);
      
      for (const result of categoryResults) {
        const statusIcon = {
          'passed': '✅',
          'failed': '❌',
          'timeout': '⏱️',
          'skipped': '⏭️',
          'unexpected_success': '⚠️'
        }[result.status];
        
        console.log(`  ${statusIcon} ${result.name} (${result.duration}ms)`);
        
        if (result.errors.length > 0) {
          result.errors.forEach(error => console.log(`     ❌ ${error}`));
        }
        
        if (result.warnings.length > 0) {
          result.warnings.forEach(warning => console.log(`     ⚠️ ${warning}`));
        }
      }
    }
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS');
    console.log('=====================================');
    
    if (summary.failed > 0) {
      console.log('- Investigate failed tests and fix underlying issues');
    }
    
    if (summary.timeout > 0) {
      console.log('- Consider increasing timeout values for slow content processing');
    }
    
    if (successRate < 80) {
      console.log('- Success rate below 80% - significant AI pipeline issues detected');
    } else if (successRate < 95) {
      console.log('- Success rate could be improved - minor issues detected');
    } else {
      console.log('- Excellent success rate - AI pipeline is working well!');
    }
  }

  /**
   * Cleanup test environment
   */
  async cleanup() {
    console.log('\n🧹 Cleaning up test environment...');
    // Could clean up any remaining test data here
    console.log('✅ Cleanup complete');
  }

  /**
   * Quick smoke test - run a minimal set of tests
   */
  async runSmokeTest() {
    console.log('💨 Running Quick Smoke Test...\n');
    
    await this.setupTestEnvironment();
    
    const smokeTests = [
      {
        name: 'YouTube Short Smoke Test',
        url: 'https://www.youtube.com/shorts/P8LeyCTibms',
        expectedFeatures: ['transcription', 'summary'],
        platform: 'youtube',
        timeout: 60000
      }
    ];
    
    await this.runTestCategory(smokeTests, 'Smoke Test');
    await this.generateFinalReport();
    await this.cleanup();
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const testSuite = new ContentSubmissionTestSuite();
  
  if (args.includes('--smoke')) {
    testSuite.runSmokeTest();
  } else {
    testSuite.runAllTests();
  }
}

module.exports = ContentSubmissionTestSuite;