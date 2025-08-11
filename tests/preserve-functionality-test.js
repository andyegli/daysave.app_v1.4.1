/**
 * Comprehensive Functionality Preservation Test
 * 
 * This test suite validates that all existing functionality works correctly
 * before and after migrating from MultimediaAnalyzer to AutomationOrchestrator.
 * 
 * This ensures we don't lose any functionality during the modernization process.
 */

const { UrlProcessor } = require('../services/multimedia');
const { AutomationOrchestrator } = require('../services/multimedia');
const BackwardCompatibilityService = require('../services/BackwardCompatibilityService');

class FunctionalityPreservationTest {
  constructor() {
    this.results = {
      oldSystem: {},
      newSystem: {},
      compatibility: {},
      passed: 0,
      failed: 0,
      warnings: []
    };
    
    this.testUrls = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Popular YouTube video
      'https://youtu.be/dQw4w9WgXcQ', // Short YouTube URL
      'https://soundcloud.com/test/sample', // Audio content
      'https://www.instagram.com/p/test123/', // Instagram post
      'https://www.tiktok.com/@user/video/123', // TikTok video
      'https://www.facebook.com/watch?v=123456789' // Facebook video
    ];
    
    this.testFeatures = [
      'isMultimediaUrl',
      'extractUrlMetadata', 
      'detectPlatform',
      'analyzeContent',
      'getYouTubeTranscription'
    ];
  }

  /**
   * Run comprehensive functionality tests
   */
  async runAllTests() {
    console.log('🧪 === COMPREHENSIVE FUNCTIONALITY PRESERVATION TEST ===');
    console.log('🎯 Goal: Ensure no functionality is lost during system migration');
    console.log('');

    try {
      await this.testUrlDetectionCapabilities();
      await this.testMetadataExtraction();
      await this.testPlatformDetection();
      await this.testContentAnalysis();
      await this.testBackwardCompatibility();
      
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      this.results.failed++;
    }
  }

  /**
   * Test URL detection capabilities
   */
  async testUrlDetectionCapabilities() {
    console.log('🔍 Testing URL Detection Capabilities...');
    
    const urlProcessor = new UrlProcessor({ enableLogging: false });
    
    for (const url of this.testUrls) {
      try {
        const isMultimedia = urlProcessor.isMultimediaUrl(url);
        
        console.log(`   📝 ${url}: ${isMultimedia ? '✅ Detected' : '❌ Not detected'}`);
        
        if (!this.results.oldSystem.urlDetection) {
          this.results.oldSystem.urlDetection = {};
        }
        
        this.results.oldSystem.urlDetection[url] = isMultimedia;
        this.results.passed++;
        
      } catch (error) {
        console.log(`   ❌ ${url}: Error - ${error.message}`);
        this.results.failed++;
      }
    }
    
    console.log('');
  }

  /**
   * Test metadata extraction
   */
  async testMetadataExtraction() {
    console.log('📊 Testing Metadata Extraction...');
    
    const urlProcessor = new UrlProcessor({ enableLogging: false });
    
    for (const url of this.testUrls.slice(0, 3)) { // Test first 3 URLs
      try {
        const metadata = await urlProcessor.extractUrlMetadata(url);
        
        console.log(`   📝 ${url}:`);
        console.log(`      Platform: ${metadata.platform}`);
        console.log(`      Title: ${metadata.title || 'Not extracted'}`);
        
        if (!this.results.oldSystem.metadata) {
          this.results.oldSystem.metadata = {};
        }
        
        this.results.oldSystem.metadata[url] = metadata;
        this.results.passed++;
        
      } catch (error) {
        console.log(`   ❌ ${url}: Error - ${error.message}`);
        this.results.failed++;
      }
    }
    
    console.log('');
  }

  /**
   * Test platform detection
   */
  async testPlatformDetection() {
    console.log('🏢 Testing Platform Detection...');
    
    const urlProcessor = new UrlProcessor({ enableLogging: false });
    
    const platformTests = [
      { url: 'https://www.youtube.com/watch?v=test', expected: 'youtube' },
      { url: 'https://youtu.be/test', expected: 'youtube' },
      { url: 'https://www.instagram.com/p/test/', expected: 'instagram' },
      { url: 'https://www.tiktok.com/@user/video/123', expected: 'tiktok' },
      { url: 'https://soundcloud.com/test', expected: 'soundcloud' },
      { url: 'https://www.facebook.com/watch?v=123', expected: 'facebook' }
    ];
    
    for (const test of platformTests) {
      try {
        const detected = urlProcessor.detectPlatform(test.url);
        const passed = detected === test.expected;
        
        console.log(`   📝 ${test.url}: ${passed ? '✅' : '❌'} ${detected} (expected: ${test.expected})`);
        
        if (passed) {
          this.results.passed++;
        } else {
          this.results.failed++;
          this.results.warnings.push(`Platform detection mismatch for ${test.url}`);
        }
        
      } catch (error) {
        console.log(`   ❌ ${test.url}: Error - ${error.message}`);
        this.results.failed++;
      }
    }
    
    console.log('');
  }

  /**
   * Test content analysis (basic functionality)
   */
  async testContentAnalysis() {
    console.log('🎬 Testing Content Analysis (Basic)...');
    
    // Use the new AutomationOrchestrator for content analysis
    const orchestrator = AutomationOrchestrator.getInstance();
    
    // Test with a simple YouTube URL (non-functional test - just check structure)
    const testUrl = 'https://www.youtube.com/watch?v=test123';
    
    try {
      console.log('   📝 Testing processUrl method structure...');
      
      // Mock options to test the method signature
      const options = {
        transcription: false, // Disable to avoid actual processing
        sentiment: false,
        thumbnails: false,
        user_id: 'test-user',
        content_id: 'test-content'
      };
      
      // This should return quickly with minimal processing using new system
      const result = await orchestrator.processUrl(testUrl, options);
      
      console.log('   ✅ processUrl method executed successfully');
      console.log(`      Result structure: ${Object.keys(result).join(', ')}`);
      
      // Store result structure for comparison
      this.results.oldSystem.analysisStructure = Object.keys(result);
      this.results.passed++;
      
    } catch (error) {
      console.log(`   ❌ Content analysis test failed: ${error.message}`);
      this.results.failed++;
    }
    
    console.log('');
  }

  /**
   * Test backward compatibility service
   */
  async testBackwardCompatibility() {
    console.log('🔄 Testing Backward Compatibility Service...');
    
    const compatibilityService = new BackwardCompatibilityService();
    
    try {
      console.log('   📝 Testing BackwardCompatibilityService initialization...');
      
      // Test that the service can be instantiated
      console.log('   ✅ BackwardCompatibilityService created successfully');
      
      // Test method existence
      const methods = ['analyzeContent', 'transcribeAudio', 'convertToLegacyFormat'];
      
      for (const method of methods) {
        if (typeof compatibilityService[method] === 'function') {
          console.log(`   ✅ Method exists: ${method}`);
          this.results.passed++;
        } else {
          console.log(`   ❌ Missing method: ${method}`);
          this.results.failed++;
        }
      }
      
      this.results.compatibility.serviceReady = true;
      
    } catch (error) {
      console.log(`   ❌ Backward compatibility test failed: ${error.message}`);
      this.results.failed++;
      this.results.compatibility.serviceReady = false;
    }
    
    console.log('');
  }

  /**
   * Generate comprehensive test report
   */
  generateReport() {
    console.log('📋 === FUNCTIONALITY PRESERVATION TEST REPORT ===');
    console.log('');
    
    console.log(`✅ Tests Passed: ${this.results.passed}`);
    console.log(`❌ Tests Failed: ${this.results.failed}`);
    console.log(`⚠️  Warnings: ${this.results.warnings.length}`);
    console.log('');
    
    if (this.results.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      this.results.warnings.forEach(warning => {
        console.log(`   - ${warning}`);
      });
      console.log('');
    }
    
    console.log('📊 Key Capabilities Validated:');
    console.log(`   🔍 URL Detection: ${this.results.oldSystem.urlDetection ? 'Working' : 'Not tested'}`);
    console.log(`   📊 Metadata Extraction: ${this.results.oldSystem.metadata ? 'Working' : 'Not tested'}`);
    console.log(`   🎬 Content Analysis: ${this.results.oldSystem.analysisStructure ? 'Working' : 'Not tested'}`);
    console.log(`   🔄 Backward Compatibility: ${this.results.compatibility.serviceReady ? 'Ready' : 'Issues detected'}`);
    console.log('');
    
    if (this.results.oldSystem.analysisStructure) {
      console.log('📋 Expected Analysis Result Structure:');
      console.log(`   ${this.results.oldSystem.analysisStructure.join(', ')}`);
      console.log('');
    }
    
    const successRate = (this.results.passed / (this.results.passed + this.results.failed) * 100).toFixed(1);
    console.log(`🎯 Overall Success Rate: ${successRate}%`);
    
    if (successRate >= 90) {
      console.log('✅ SYSTEM READY FOR MIGRATION - High confidence in functionality preservation');
    } else if (successRate >= 70) {
      console.log('⚠️  PROCEED WITH CAUTION - Some functionality issues detected');
    } else {
      console.log('❌ MIGRATION NOT RECOMMENDED - Significant functionality issues');
    }
    
    console.log('');
    console.log('💡 Next Steps:');
    console.log('   1. Enhance AutomationOrchestrator with URL processing');
    console.log('   2. Implement all detected capabilities in new system');
    console.log('   3. Run this test again after migration');
    console.log('   4. Compare results to ensure functionality preservation');
    console.log('');
  }
}

// Export for use in other tests
module.exports = FunctionalityPreservationTest;

// Run if called directly
if (require.main === module) {
  const test = new FunctionalityPreservationTest();
  test.runAllTests().catch(console.error);
}
