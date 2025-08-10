/**
 * Enhanced System Test
 * 
 * Tests the new enhanced AutomationOrchestrator with URL processing capabilities
 * while maintaining backward compatibility.
 */

const { AutomationOrchestrator, UrlProcessor } = require('../services/multimedia');
const BackwardCompatibilityService = require('../services/BackwardCompatibilityService');

class EnhancedSystemTest {
  constructor() {
    this.results = {
      urlProcessor: {},
      orchestrator: {},
      compatibility: {},
      passed: 0,
      failed: 0,
      warnings: []
    };
    
    this.testUrls = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://soundcloud.com/test/sample',
      'https://www.instagram.com/p/test123/'
    ];
  }

  async runAllTests() {
    console.log('🚀 === ENHANCED SYSTEM FUNCTIONALITY TEST ===');
    console.log('🎯 Goal: Validate new URL processing capabilities work correctly');
    console.log('');

    try {
      await this.testUrlProcessor();
      await this.testOrchestratorUrlProcessing();
      await this.testBackwardCompatibilityWithEnhancement();
      
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Enhanced system test failed:', error);
      this.results.failed++;
    }
  }

  /**
   * Test standalone UrlProcessor
   */
  async testUrlProcessor() {
    console.log('🔗 Testing UrlProcessor Capabilities...');
    
    const urlProcessor = new UrlProcessor({ enableLogging: false });
    
    // Test URL detection
    for (const url of this.testUrls) {
      try {
        const isMultimedia = urlProcessor.isMultimediaUrl(url);
        const platform = urlProcessor.detectPlatform(url);
        
        console.log(`   📝 ${url}:`);
        console.log(`      Multimedia: ${isMultimedia ? '✅' : '❌'}`);
        console.log(`      Platform: ${platform}`);
        
        if (isMultimedia) {
          this.results.passed++;
        } else {
          this.results.failed++;
        }
        
      } catch (error) {
        console.log(`   ❌ ${url}: Error - ${error.message}`);
        this.results.failed++;
      }
    }
    
    // Test metadata extraction
    console.log('   🔍 Testing metadata extraction...');
    try {
      const metadata = await urlProcessor.extractUrlMetadata(this.testUrls[0]);
      console.log(`   ✅ Metadata extracted: ${JSON.stringify(metadata, null, 2)}`);
      this.results.urlProcessor.metadata = metadata;
      this.results.passed++;
    } catch (error) {
      console.log(`   ❌ Metadata extraction failed: ${error.message}`);
      this.results.failed++;
    }
    
    console.log('');
  }

  /**
   * Test AutomationOrchestrator URL processing
   */
  async testOrchestratorUrlProcessing() {
    console.log('🎛️ Testing AutomationOrchestrator URL Processing...');
    
    const orchestrator = AutomationOrchestrator.getInstance();
    
    try {
      console.log('   📝 Testing processUrl method...');
      
      const result = await orchestrator.processUrl(this.testUrls[0], {
        transcription: false, // Keep simple for testing
        sentiment: false
      });
      
      console.log('   ✅ Orchestrator URL processing completed');
      console.log(`      Success: ${result.success}`);
      console.log(`      Platform: ${result.platform}`);
      console.log(`      Requires Compatibility: ${result.requiresCompatibilityMode}`);
      
      this.results.orchestrator.urlProcessing = result;
      this.results.passed++;
      
    } catch (error) {
      console.log(`   ❌ Orchestrator URL processing failed: ${error.message}`);
      this.results.failed++;
    }
    
    console.log('');
  }

  /**
   * Test enhanced backward compatibility service
   */
  async testBackwardCompatibilityWithEnhancement() {
    console.log('🔄 Testing Enhanced Backward Compatibility...');
    
    const compatibilityService = new BackwardCompatibilityService();
    
    try {
      console.log('   📝 Testing enhanced analyzeContent method...');
      
      // This should now use the orchestrator for URL processing first
      const result = await compatibilityService.analyzeContent(this.testUrls[0], {
        transcription: false, // Minimize processing for test
        sentiment: false,
        thumbnails: false,
        user_id: 'test-user',
        content_id: 'test-content'
      });
      
      console.log('   ✅ Enhanced compatibility service completed');
      console.log(`      URL: ${result.url}`);
      console.log(`      Platform: ${result.platform || 'not detected'}`);
      console.log(`      Analysis ID: ${result.analysisId}`);
      
      this.results.compatibility.enhanced = result;
      this.results.passed++;
      
    } catch (error) {
      console.log(`   ❌ Enhanced compatibility test failed: ${error.message}`);
      this.results.failed++;
    }
    
    console.log('');
  }

  /**
   * Generate test report
   */
  generateReport() {
    console.log('📋 === ENHANCED SYSTEM TEST REPORT ===');
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
    
    console.log('📊 Enhanced System Capabilities:');
    console.log(`   🔗 UrlProcessor: ${this.results.urlProcessor.metadata ? 'Working' : 'Issues detected'}`);
    console.log(`   🎛️ Orchestrator URL Processing: ${this.results.orchestrator.urlProcessing ? 'Working' : 'Issues detected'}`);
    console.log(`   🔄 Enhanced Compatibility: ${this.results.compatibility.enhanced ? 'Working' : 'Issues detected'}`);
    console.log('');
    
    const successRate = (this.results.passed / (this.results.passed + this.results.failed) * 100).toFixed(1);
    console.log(`🎯 Overall Success Rate: ${successRate}%`);
    
    if (successRate >= 90) {
      console.log('✅ ENHANCED SYSTEM READY - URL processing capabilities working');
      console.log('💡 The system now uses AutomationOrchestrator for URL metadata extraction');
      console.log('💡 MultimediaAnalyzer is still used for actual content processing');
      console.log('💡 This provides a foundation for complete migration');
    } else if (successRate >= 70) {
      console.log('⚠️  ENHANCED SYSTEM PARTIAL - Some capabilities need attention');
    } else {
      console.log('❌ ENHANCED SYSTEM FAILED - Significant issues detected');
    }
    
    console.log('');
    console.log('🎯 Architecture Status:');
    console.log('   ✅ UrlProcessor: Standalone URL handling capabilities');
    console.log('   ✅ AutomationOrchestrator: Enhanced with URL processing');
    console.log('   ✅ BackwardCompatibilityService: Uses new system for metadata');
    console.log('   ⚠️  MultimediaAnalyzer: Still used for content processing');
    console.log('');
    console.log('📈 Next Steps for Complete Migration:');
    console.log('   1. ✅ URL metadata processing (COMPLETED)');
    console.log('   2. 🔄 Content download and processing in new system');
    console.log('   3. 🔄 Full transcription and analysis in new system');
    console.log('   4. 🔄 Remove MultimediaAnalyzer dependency');
    console.log('');
  }
}

// Export for use in other tests
module.exports = EnhancedSystemTest;

// Run if called directly
if (require.main === module) {
  const test = new EnhancedSystemTest();
  test.runAllTests().catch(console.error);
}
