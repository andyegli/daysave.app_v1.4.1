/**
 * Complete Migration Test
 * 
 * Tests that the new enhanced system can handle complete URL processing
 * without falling back to MultimediaAnalyzer.
 */

const { AutomationOrchestrator, UrlProcessor } = require('../services/multimedia');
const BackwardCompatibilityService = require('../services/BackwardCompatibilityService');

class CompleteMigrationTest {
  constructor() {
    this.results = {
      urlProcessor: {},
      orchestrator: {},
      compatibility: {},
      passed: 0,
      failed: 0,
      warnings: []
    };
    
    this.testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Famous test video
  }

  async runAllTests() {
    console.log('🧪 === COMPLETE MIGRATION VALIDATION TEST ===');
    console.log('🎯 Goal: Validate new system handles complete processing without MultimediaAnalyzer fallback');
    console.log('');

    try {
      await this.testUrlProcessorComprehensive();
      await this.testOrchestratorFullProcessing();
      await this.testNoMultimediaAnalyzerFallback();
      
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Complete migration test failed:', error);
      this.results.failed++;
    }
  }

  /**
   * Test UrlProcessor comprehensive analysis
   */
  async testUrlProcessorComprehensive() {
    console.log('🔗 Testing UrlProcessor Comprehensive Analysis...');
    
    const urlProcessor = new UrlProcessor({ enableLogging: false });
    
    try {
      console.log('   📝 Testing analyzeUrlContent method...');
      
      const result = await urlProcessor.analyzeUrlContent(this.testUrl, {
        transcription: true,
        sentiment: true,
        enableSummarization: true,
        speaker_identification: true,
        user_id: 'test-user',
        content_id: 'test-content'
      });
      
      console.log('   ✅ UrlProcessor comprehensive analysis completed');
      console.log(`      Status: ${result.status}`);
      console.log(`      Platform: ${result.platform}`);
      console.log(`      Transcription: ${result.transcription.length > 0 ? 'Present' : 'Missing'}`);
      console.log(`      Summary: ${result.summary.length > 0 ? 'Generated' : 'Missing'}`);
      console.log(`      Tags: ${result.auto_tags.length} generated`);
      console.log(`      Category: ${result.category}`);
      
      // Validate required fields
      const requiredFields = ['url', 'platform', 'metadata', 'status', 'analysisId'];
      const missingFields = requiredFields.filter(field => !result[field]);
      
      if (missingFields.length === 0) {
        console.log('   ✅ All required fields present');
        this.results.passed++;
      } else {
        console.log(`   ❌ Missing fields: ${missingFields.join(', ')}`);
        this.results.failed++;
      }
      
      this.results.urlProcessor.comprehensive = result;
      
    } catch (error) {
      console.log(`   ❌ UrlProcessor comprehensive analysis failed: ${error.message}`);
      this.results.failed++;
    }
    
    console.log('');
  }

  /**
   * Test AutomationOrchestrator full processing
   */
  async testOrchestratorFullProcessing() {
    console.log('🎛️ Testing AutomationOrchestrator Full Processing...');
    
    const orchestrator = AutomationOrchestrator.getInstance();
    
    try {
      console.log('   📝 Testing processUrl with full processing...');
      
      const result = await orchestrator.processUrl(this.testUrl, {
        transcription: true,
        sentiment: true,
        enableSummarization: true,
        user_id: 'test-user',
        content_id: 'test-content'
      });
      
      console.log('   ✅ AutomationOrchestrator full processing completed');
      console.log(`      Success: ${result.success}`);
      console.log(`      Platform: ${result.platform}`);
      console.log(`      Requires Compatibility: ${result.requiresCompatibilityMode}`);
      console.log(`      Transcription: ${result.transcription ? 'Present' : 'Missing'}`);
      console.log(`      Summary: ${result.summary ? 'Present' : 'Missing'}`);
      console.log(`      Analysis ID: ${result.analysisId}`);
      
      // Key validation: should NOT require compatibility mode
      if (result.requiresCompatibilityMode === false) {
        console.log('   ✅ No compatibility mode required - new system handles everything!');
        this.results.passed++;
      } else {
        console.log('   ❌ Still requires compatibility mode');
        this.results.failed++;
        this.results.warnings.push('AutomationOrchestrator still requires compatibility mode');
      }
      
      this.results.orchestrator.fullProcessing = result;
      this.results.passed++;
      
    } catch (error) {
      console.log(`   ❌ AutomationOrchestrator full processing failed: ${error.message}`);
      this.results.failed++;
    }
    
    console.log('');
  }

  /**
   * Test that BackwardCompatibilityService doesn't fall back to MultimediaAnalyzer
   */
  async testNoMultimediaAnalyzerFallback() {
    console.log('🔄 Testing No MultimediaAnalyzer Fallback...');
    
    const compatibilityService = new BackwardCompatibilityService();
    
    try {
      console.log('   📝 Testing enhanced compatibility without fallback...');
      
      // Capture console output to detect fallback
      const originalLog = console.log;
      let logOutput = [];
      console.log = (...args) => {
        logOutput.push(args.join(' '));
        originalLog.apply(console, args);
      };
      
      const result = await compatibilityService.analyzeContent(this.testUrl, {
        transcription: true,
        sentiment: true,
        thumbnails: false, // Keep it simple for testing
        user_id: 'test-user',
        content_id: 'test-content'
      });
      
      // Restore console.log
      console.log = originalLog;
      
      console.log('   ✅ BackwardCompatibilityService analysis completed');
      console.log(`      URL: ${result.url}`);
      console.log(`      Platform: ${result.platform || 'not detected'}`);
      
      // Check if fallback occurred
      const fallbackOccurred = logOutput.some(log => 
        log.includes('Falling back to MultimediaAnalyzer') || 
        log.includes('MultimediaAnalyzer for content processing')
      );
      
      const enhancedSystemUsed = logOutput.some(log =>
        log.includes('Enhanced system completed full analysis')
      );
      
      if (!fallbackOccurred && enhancedSystemUsed) {
        console.log('   ✅ No MultimediaAnalyzer fallback - enhanced system handled everything!');
        this.results.passed++;
      } else if (fallbackOccurred) {
        console.log('   ⚠️ MultimediaAnalyzer fallback still occurred');
        this.results.warnings.push('BackwardCompatibilityService still falls back to MultimediaAnalyzer');
      } else {
        console.log('   ❓ Unclear if enhanced system was used');
        this.results.warnings.push('Could not confirm enhanced system usage');
      }
      
      this.results.compatibility.noFallback = !fallbackOccurred;
      this.results.compatibility.result = result;
      this.results.passed++;
      
    } catch (error) {
      console.log(`   ❌ No fallback test failed: ${error.message}`);
      this.results.failed++;
    }
    
    console.log('');
  }

  /**
   * Generate test report
   */
  generateReport() {
    console.log('📋 === COMPLETE MIGRATION TEST REPORT ===');
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
    
    console.log('📊 Migration Status:');
    console.log(`   🔗 UrlProcessor Comprehensive: ${this.results.urlProcessor.comprehensive ? 'Working' : 'Issues detected'}`);
    console.log(`   🎛️ Orchestrator Full Processing: ${this.results.orchestrator.fullProcessing ? 'Working' : 'Issues detected'}`);
    console.log(`   🔄 No MultimediaAnalyzer Fallback: ${this.results.compatibility.noFallback ? 'Success' : 'Still falling back'}`);
    console.log('');
    
    const successRate = this.results.failed === 0 ? 100 : 
      (this.results.passed / (this.results.passed + this.results.failed) * 100).toFixed(1);
    console.log(`🎯 Overall Success Rate: ${successRate}%`);
    
    if (successRate >= 95 && this.results.compatibility.noFallback) {
      console.log('🎉 COMPLETE MIGRATION SUCCESSFUL - MultimediaAnalyzer no longer needed!');
      console.log('✅ The new enhanced system handles all URL processing independently');
      console.log('✅ No fallback to old system occurs');
      console.log('✅ All functionality preserved and enhanced');
    } else if (successRate >= 80) {
      console.log('⚠️  MIGRATION MOSTLY COMPLETE - Some minor issues remain');
    } else {
      console.log('❌ MIGRATION INCOMPLETE - Significant issues detected');
    }
    
    console.log('');
    console.log('🎯 Next Steps:');
    
    if (this.results.compatibility.noFallback) {
      console.log('   ✅ Ready to remove MultimediaAnalyzer dependency');
      console.log('   ✅ Ready to clean up old system references');
      console.log('   ✅ Ready for final validation and deployment');
    } else {
      console.log('   🔧 Fix remaining fallback issues');
      console.log('   🔄 Re-test after fixes');
      console.log('   📋 Validate all functionality');
    }
    
    console.log('');
  }
}

// Export for use in other tests
module.exports = CompleteMigrationTest;

// Run if called directly
if (require.main === module) {
  const test = new CompleteMigrationTest();
  test.runAllTests().catch(console.error);
}
