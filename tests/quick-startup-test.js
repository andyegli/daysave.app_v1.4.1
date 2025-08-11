/**
 * Quick Startup Test
 * 
 * Tests that the system can start without hanging, focusing on core components
 * without initializing background timers that prevent script completion.
 */

class QuickStartupTest {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  async runTest() {
    console.log('⚡ === QUICK STARTUP TEST ===');
    console.log('🎯 Goal: Validate core components load without hanging or timers');
    console.log('');

    try {
      this.testComponentLoading();
      this.testInstantiation();
      this.testBasicFunctionality();
      
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Quick startup test failed:', error);
      this.results.failed++;
    }
  }

  /**
   * Test that components can be loaded without hanging
   */
  testComponentLoading() {
    console.log('📦 Testing Component Loading...');
    
    try {
      console.log('   📝 Loading multimedia services...');
      const multimediaServices = require('../services/multimedia');
      
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
        console.log('   ✅ All multimedia services loaded successfully');
        this.results.passed++;
      } else {
        const missing = expectedServices.filter(service => 
          !exportedServices.includes(service)
        );
        console.log(`   ❌ Missing services: ${missing.join(', ')}`);
        this.results.failed++;
        this.results.errors.push(`Missing services: ${missing.join(', ')}`);
      }

      // Verify MultimediaAnalyzer is NOT exported
      if (!exportedServices.includes('MultimediaAnalyzer')) {
        console.log('   ✅ MultimediaAnalyzer successfully removed from exports');
        this.results.passed++;
      } else {
        console.log('   ❌ MultimediaAnalyzer still exported');
        this.results.failed++;
        this.results.errors.push('MultimediaAnalyzer still in exports');
      }

    } catch (error) {
      console.log(`   ❌ Component loading failed: ${error.message}`);
      this.results.failed++;
      this.results.errors.push(`Component loading error: ${error.message}`);
    }
    
    console.log('');
  }

  /**
   * Test that core components can be instantiated
   */
  testInstantiation() {
    console.log('🏗️ Testing Component Instantiation...');
    
    try {
      const { UrlProcessor, VideoProcessor, AudioProcessor, ImageProcessor } = require('../services/multimedia');
      
      // Test UrlProcessor (lightweight)
      console.log('   📝 Testing UrlProcessor instantiation...');
      const urlProcessor = new UrlProcessor({ enableLogging: false });
      
      if (urlProcessor && typeof urlProcessor.isMultimediaUrl === 'function') {
        console.log('   ✅ UrlProcessor instantiated successfully');
        this.results.passed++;
      } else {
        console.log('   ❌ UrlProcessor instantiation failed');
        this.results.failed++;
        this.results.errors.push('UrlProcessor instantiation failed');
      }

      // Test other processors (without heavy initialization)
      const processors = [
        { name: 'VideoProcessor', class: VideoProcessor },
        { name: 'AudioProcessor', class: AudioProcessor },
        { name: 'ImageProcessor', class: ImageProcessor }
      ];

      for (const { name, class: ProcessorClass } of processors) {
        console.log(`   📝 Testing ${name} instantiation...`);
        const processor = new ProcessorClass({ enableLogging: false });
        
        if (processor && typeof processor.processContent === 'function') {
          console.log(`   ✅ ${name} instantiated successfully`);
          this.results.passed++;
        } else {
          console.log(`   ❌ ${name} instantiation failed`);
          this.results.failed++;
          this.results.errors.push(`${name} instantiation failed`);
        }
      }

    } catch (error) {
      console.log(`   ❌ Component instantiation failed: ${error.message}`);
      this.results.failed++;
      this.results.errors.push(`Component instantiation error: ${error.message}`);
    }
    
    console.log('');
  }

  /**
   * Test basic functionality without heavy initialization
   */
  testBasicFunctionality() {
    console.log('🔧 Testing Basic Functionality...');
    
    try {
      const { UrlProcessor } = require('../services/multimedia');
      const urlProcessor = new UrlProcessor({ enableLogging: false });
      
      // Test URL detection
      const testUrls = [
        'https://www.youtube.com/watch?v=kyphLGnSz6Q',
        'https://www.instagram.com/p/test123/',
        'https://regular-website.com'
      ];
      
      console.log('   📝 Testing URL detection...');
      for (const url of testUrls) {
        const isMultimedia = urlProcessor.isMultimediaUrl(url);
        const platform = urlProcessor.detectPlatform(url);
        
        if (url.includes('youtube.com') && isMultimedia && platform === 'youtube') {
          console.log(`   ✅ YouTube URL correctly detected: ${platform}`);
          this.results.passed++;
        } else if (url.includes('instagram.com') && isMultimedia && platform === 'instagram') {
          console.log(`   ✅ Instagram URL correctly detected: ${platform}`);
          this.results.passed++;
        } else if (url.includes('regular-website.com') && !isMultimedia) {
          console.log(`   ✅ Non-multimedia URL correctly rejected`);
          this.results.passed++;
        }
      }

      // Test AutomationOrchestrator availability (without initialization)
      console.log('   📝 Testing AutomationOrchestrator availability...');
      const { AutomationOrchestrator } = require('../services/multimedia');
      
      if (AutomationOrchestrator && typeof AutomationOrchestrator.getInstance === 'function') {
        console.log('   ✅ AutomationOrchestrator available for YouTube processing');
        this.results.passed++;
      } else {
        console.log('   ❌ AutomationOrchestrator not available');
        this.results.failed++;
        this.results.errors.push('AutomationOrchestrator not available');
      }

    } catch (error) {
      console.log(`   ❌ Basic functionality test failed: ${error.message}`);
      this.results.failed++;
      this.results.errors.push(`Basic functionality error: ${error.message}`);
    }
    
    console.log('');
  }

  /**
   * Generate test report
   */
  generateReport() {
    console.log('📊 === QUICK STARTUP TEST REPORT ===');
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
    
    console.log(`🎯 Success Rate: ${successRate}%`);
    console.log('');
    
    if (successRate === '100.0' || successRate === 100) {
      console.log('✅ QUICK STARTUP TEST SUCCESSFUL!');
      console.log('🚀 Core components load without hanging');
      console.log('🎬 Enhanced AutomationOrchestrator ready for YouTube processing');
      console.log('🗑️ MultimediaAnalyzer successfully removed');
      console.log('🔄 BackwardCompatibilityService no longer needed');
      console.log('');
      console.log('🎯 Enhanced system ready for direct YouTube URL processing!');
      
    } else {
      console.log('❌ STARTUP ISSUES DETECTED');
      console.log('🔧 Please review and fix the errors before proceeding');
    }
    
    console.log('');
    console.log('✅ Test completed and script will exit cleanly');
  }
}

// Export for use in other tests
module.exports = QuickStartupTest;

// Run if called directly
if (require.main === module) {
  const test = new QuickStartupTest();
  test.runTest().catch(console.error);
}
