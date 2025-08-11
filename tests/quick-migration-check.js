/**
 * Quick Migration Check
 * 
 * A lightweight test to verify MultimediaAnalyzer removal without
 * triggering heavy initialization processes.
 */

class QuickMigrationCheck {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  async runCheck() {
    console.log('⚡ === QUICK MIGRATION CHECK ===');
    console.log('🎯 Goal: Verify MultimediaAnalyzer removal without heavy initialization');
    console.log('');

    try {
      this.testMultimediaAnalyzerRemoved();
      this.testServiceExportsClean();
      this.testEnhancedComponentsAvailable();
      
      this.generateQuickReport();
      
    } catch (error) {
      console.error('❌ Quick migration check failed:', error);
      this.results.failed++;
    }
  }

  /**
   * Test that MultimediaAnalyzer is completely removed
   */
  testMultimediaAnalyzerRemoved() {
    console.log('🗑️ Testing MultimediaAnalyzer Removal...');
    
    try {
      // Try to require the old MultimediaAnalyzer - should fail
      try {
        require('../services/multimedia/MultimediaAnalyzer');
        console.log('   ❌ MultimediaAnalyzer file still exists!');
        this.results.failed++;
        this.results.errors.push('MultimediaAnalyzer.js file still exists');
        return;
      } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND') {
          console.log('   ✅ MultimediaAnalyzer.js file successfully removed');
          this.results.passed++;
        } else {
          throw error;
        }
      }

    } catch (error) {
      console.log(`   ❌ MultimediaAnalyzer removal check failed: ${error.message}`);
      this.results.failed++;
      this.results.errors.push(`Removal check error: ${error.message}`);
    }
    
    console.log('');
  }

  /**
   * Test that service exports are clean
   */
  testServiceExportsClean() {
    console.log('📦 Testing Service Exports...');
    
    try {
      const multimediaServices = require('../services/multimedia');
      const exportedServices = Object.keys(multimediaServices);
      
      console.log(`   📝 Exported services: ${exportedServices.join(', ')}`);
      
      // Should not include MultimediaAnalyzer
      if (!exportedServices.includes('MultimediaAnalyzer')) {
        console.log('   ✅ MultimediaAnalyzer not in exports');
        this.results.passed++;
      } else {
        console.log('   ❌ MultimediaAnalyzer still exported');
        this.results.failed++;
        this.results.errors.push('MultimediaAnalyzer still in service exports');
      }

    } catch (error) {
      console.log(`   ❌ Service exports test failed: ${error.message}`);
      this.results.failed++;
      this.results.errors.push(`Service exports error: ${error.message}`);
    }
    
    console.log('');
  }

  /**
   * Test that enhanced components are available (without initializing them)
   */
  testEnhancedComponentsAvailable() {
    console.log('🔧 Testing Enhanced Components Availability...');
    
    try {
      const multimediaServices = require('../services/multimedia');
      
      // Check for key enhanced components
      const expectedServices = [
        'AutomationOrchestrator',
        'UrlProcessor',
        'VideoProcessor',
        'AudioProcessor',
        'ImageProcessor'
      ];
      
      const exportedServices = Object.keys(multimediaServices);
      const hasAllExpected = expectedServices.every(service => 
        exportedServices.includes(service)
      );
      
      if (hasAllExpected) {
        console.log('   ✅ All expected enhanced services available');
        this.results.passed++;
      } else {
        const missing = expectedServices.filter(service => 
          !exportedServices.includes(service)
        );
        console.log(`   ❌ Missing expected services: ${missing.join(', ')}`);
        this.results.failed++;
        this.results.errors.push(`Missing services: ${missing.join(', ')}`);
      }

      // Test that UrlProcessor can be instantiated without hanging
      const { UrlProcessor } = multimediaServices;
      const urlProcessor = new UrlProcessor({ enableLogging: false });
      
      if (urlProcessor && typeof urlProcessor.isMultimediaUrl === 'function') {
        console.log('   ✅ UrlProcessor can be instantiated');
        this.results.passed++;
      } else {
        console.log('   ❌ UrlProcessor instantiation issues');
        this.results.failed++;
        this.results.errors.push('UrlProcessor not working');
      }

    } catch (error) {
      console.log(`   ❌ Enhanced components test failed: ${error.message}`);
      this.results.failed++;
      this.results.errors.push(`Enhanced components error: ${error.message}`);
    }
    
    console.log('');
  }

  /**
   * Generate quick report
   */
  generateQuickReport() {
    console.log('📊 === QUICK MIGRATION REPORT ===');
    console.log('');
    
    console.log(`✅ Tests Passed: ${this.results.passed}`);
    console.log(`❌ Tests Failed: ${this.results.failed}`);
    console.log('');
    
    if (this.results.errors.length > 0) {
      console.log('❌ Errors Found:');
      this.results.errors.forEach(error => {
        console.log(`   - ${error}`);
      });
      console.log('');
    }
    
    const successRate = this.results.failed === 0 ? 100 : 
      (this.results.passed / (this.results.passed + this.results.failed) * 100).toFixed(1);
    
    console.log(`🎯 Quick Check Success Rate: ${successRate}%`);
    console.log('');
    
    if (successRate === '100.0' || successRate === 100) {
      console.log('✅ QUICK MIGRATION CHECK PASSED!');
      console.log('🗑️ MultimediaAnalyzer successfully removed');
      console.log('📦 Service exports cleaned');
      console.log('🔧 Enhanced components available');
      console.log('');
      console.log('💡 Note: Full functional testing requires Docker environment');
      
    } else {
      console.log('❌ MIGRATION ISSUES DETECTED');
      console.log('🔧 Please review and fix the errors before proceeding');
    }
    
    console.log('');
  }
}

// Export for use in other tests
module.exports = QuickMigrationCheck;

// Run if called directly
if (require.main === module) {
  const check = new QuickMigrationCheck();
  check.runCheck().catch(console.error);
}
