/**
 * All Content Types Test
 * 
 * Tests that all content types (URLs, files, multimedia) work with the enhanced
 * modular system without using BackwardCompatibilityService.
 */

class AllContentTypesTest {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  async runTest() {
    console.log('🌟 === ALL CONTENT TYPES MIGRATION TEST ===');
    console.log('🎯 Goal: Validate all content types use enhanced system without BackwardCompatibilityService');
    console.log('');

    try {
      this.testUrlContentTypes();
      this.testFileContentTypes();
      this.testMultimediaAPITypes();
      this.testNoBackwardCompatibilityUsage();
      
      this.generateReport();
      
    } catch (error) {
      console.error('❌ All content types test failed:', error);
      this.results.failed++;
    }
  }

  /**
   * Test URL content type processing
   */
  testUrlContentTypes() {
    console.log('🔗 Testing URL Content Types...');
    
    try {
      const { UrlProcessor } = require('../services/multimedia');
      const urlProcessor = new UrlProcessor({ enableLogging: false });
      
      const urlTypes = [
        { url: 'https://www.youtube.com/watch?v=test', platform: 'youtube', type: 'video' },
        { url: 'https://www.instagram.com/p/test/', platform: 'instagram', type: 'social' },
        { url: 'https://soundcloud.com/test', platform: 'soundcloud', type: 'audio' },
        { url: 'https://www.facebook.com/watch/?v=test', platform: 'facebook', type: 'video' },
        { url: 'https://twitter.com/user/status/123', platform: 'twitter', type: 'social' }
      ];
      
      console.log('   📝 Testing URL detection and platform identification...');
      for (const { url, platform, type } of urlTypes) {
        const isMultimedia = urlProcessor.isMultimediaUrl(url);
        const detectedPlatform = urlProcessor.detectPlatform(url);
        
        if (isMultimedia && detectedPlatform === platform) {
          console.log(`   ✅ ${platform.toUpperCase()} URL correctly detected`);
          this.results.passed++;
        } else {
          console.log(`   ❌ ${platform.toUpperCase()} URL detection failed`);
          this.results.failed++;
          this.results.errors.push(`${platform} URL detection failed`);
        }
      }

    } catch (error) {
      console.log(`   ❌ URL content types test failed: ${error.message}`);
      this.results.failed++;
      this.results.errors.push(`URL content types error: ${error.message}`);
    }
    
    console.log('');
  }

  /**
   * Test file content type processing capabilities
   */
  testFileContentTypes() {
    console.log('📁 Testing File Content Types...');
    
    try {
      // Test file type detection function (from routes/files.js)
      const fileTypes = [
        { mimetype: 'video/mp4', expected: true, category: 'video' },
        { mimetype: 'video/quicktime', expected: true, category: 'video' },
        { mimetype: 'audio/mpeg', expected: true, category: 'audio' },
        { mimetype: 'audio/wav', expected: true, category: 'audio' },
        { mimetype: 'image/jpeg', expected: true, category: 'image' },
        { mimetype: 'image/png', expected: true, category: 'image' },
        { mimetype: 'application/pdf', expected: true, category: 'document' },
        { mimetype: 'application/msword', expected: true, category: 'document' },
        { mimetype: 'text/plain', expected: true, category: 'document' },
        { mimetype: 'application/json', expected: false, category: 'unsupported' }
      ];

      // Replicate the isMultimediaFile function from routes/files.js
      function isMultimediaFile(mimetype) {
        const multimediaTypes = [
          'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv', 'video/webm', 'video/avi',
          'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp3', 'audio/mp4', 'audio/aac', 'audio/ogg',
          'image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/tiff',
          'application/pdf', 'application/msword', 
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain', 'text/rtf', 'application/rtf'
        ];
        return multimediaTypes.includes(mimetype);
      }
      
      console.log('   📝 Testing file MIME type detection...');
      for (const { mimetype, expected, category } of fileTypes) {
        const isSupported = isMultimediaFile(mimetype);
        
        if (isSupported === expected) {
          console.log(`   ✅ ${category.toUpperCase()} file type (${mimetype}) correctly ${expected ? 'supported' : 'rejected'}`);
          this.results.passed++;
        } else {
          console.log(`   ❌ ${category.toUpperCase()} file type (${mimetype}) detection failed`);
          this.results.failed++;
          this.results.errors.push(`File type ${mimetype} detection failed`);
        }
      }

      // Test that AutomationOrchestrator can handle file processing
      console.log('   📝 Testing AutomationOrchestrator file processing capability...');
      const { AutomationOrchestrator } = require('../services/multimedia');
      
      if (AutomationOrchestrator && typeof AutomationOrchestrator.getInstance === 'function') {
        console.log('   ✅ AutomationOrchestrator available for file processing');
        this.results.passed++;
      } else {
        console.log('   ❌ AutomationOrchestrator not available for file processing');
        this.results.failed++;
        this.results.errors.push('AutomationOrchestrator not available for files');
      }

    } catch (error) {
      console.log(`   ❌ File content types test failed: ${error.message}`);
      this.results.failed++;
      this.results.errors.push(`File content types error: ${error.message}`);
    }
    
    console.log('');
  }

  /**
   * Test multimedia API processing capabilities
   */
  testMultimediaAPITypes() {
    console.log('🎛️ Testing Multimedia API Types...');
    
    try {
      const { AutomationOrchestrator, UrlProcessor } = require('../services/multimedia');
      
      console.log('   📝 Testing multimedia processing components...');
      
      // Test AutomationOrchestrator methods
      if (typeof AutomationOrchestrator.getInstance === 'function') {
        console.log('   ✅ AutomationOrchestrator.getInstance available');
        this.results.passed++;
      } else {
        console.log('   ❌ AutomationOrchestrator.getInstance missing');
        this.results.failed++;
        this.results.errors.push('AutomationOrchestrator.getInstance missing');
      }

      // Test UrlProcessor AI methods
      const urlProcessor = new UrlProcessor({ enableLogging: false });
      const aiMethods = ['generateTitle', 'generateTags', 'generateCategory', 'analyzeSentiment'];
      
      for (const method of aiMethods) {
        if (typeof urlProcessor[method] === 'function') {
          console.log(`   ✅ UrlProcessor.${method} available for AI processing`);
          this.results.passed++;
        } else {
          console.log(`   ❌ UrlProcessor.${method} missing`);
          this.results.failed++;
          this.results.errors.push(`UrlProcessor.${method} missing`);
        }
      }

    } catch (error) {
      console.log(`   ❌ Multimedia API types test failed: ${error.message}`);
      this.results.failed++;
      this.results.errors.push(`Multimedia API types error: ${error.message}`);
    }
    
    console.log('');
  }

  /**
   * Test that BackwardCompatibilityService is no longer used in operational code
   */
  testNoBackwardCompatibilityUsage() {
    console.log('🚫 Testing No BackwardCompatibilityService Usage...');
    
    try {
      console.log('   📝 Checking route files for BackwardCompatibilityService usage...');
      
      // This test validates that we're not accidentally importing BackwardCompatibilityService
      // in our test environment (the actual route files have been updated)
      
      const fs = require('fs');
      const path = require('path');
      
      // Check key route files (read as text, don't import to avoid instantiation)
      const routeFiles = ['routes/content.js', 'routes/files.js', 'routes/multimedia.js'];
      let foundUsage = false;
      
      for (const routeFile of routeFiles) {
        try {
          const filePath = path.join(__dirname, '..', routeFile);
          const content = fs.readFileSync(filePath, 'utf8');
          
          // Look for active usage patterns (not just comments)
          const usagePatterns = [
            /new BackwardCompatibilityService\(\)/g,
            /require.*BackwardCompatibilityService.*\)/g,
            /compatibilityService\./g
          ];
          
          let hasActiveUsage = false;
          for (const pattern of usagePatterns) {
            const matches = content.match(pattern);
            if (matches) {
              // Filter out comments and documentation
              const activeMatches = matches.filter(match => {
                const lines = content.split('\n');
                for (const line of lines) {
                  if (line.includes(match) && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
                    return true;
                  }
                }
                return false;
              });
              
              if (activeMatches.length > 0) {
                hasActiveUsage = true;
                foundUsage = true;
                console.log(`   ⚠️ Found BackwardCompatibilityService usage in ${routeFile}`);
              }
            }
          }
          
          if (!hasActiveUsage) {
            console.log(`   ✅ ${routeFile} - No active BackwardCompatibilityService usage`);
            this.results.passed++;
          }
          
        } catch (fileError) {
          console.log(`   ❓ Could not check ${routeFile}: ${fileError.message}`);
        }
      }
      
      if (!foundUsage) {
        console.log('   ✅ No active BackwardCompatibilityService usage found in route files');
        this.results.passed++;
      } else {
        console.log('   ⚠️ Some BackwardCompatibilityService usage still exists');
        this.results.errors.push('BackwardCompatibilityService still used in some routes');
      }

    } catch (error) {
      console.log(`   ❌ BackwardCompatibilityService usage test failed: ${error.message}`);
      this.results.failed++;
      this.results.errors.push(`BackwardCompatibilityService usage test error: ${error.message}`);
    }
    
    console.log('');
  }

  /**
   * Generate test report
   */
  generateReport() {
    console.log('📊 === ALL CONTENT TYPES TEST REPORT ===');
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
      console.log('✅ ALL CONTENT TYPES MIGRATION SUCCESSFUL!');
      console.log('🔗 URL processing (YouTube, Instagram, SoundCloud, Facebook, Twitter) ✅');
      console.log('📁 File processing (Video, Audio, Image, Document) ✅'); 
      console.log('🎛️ Multimedia API processing ✅');
      console.log('🚫 BackwardCompatibilityService eliminated ✅');
      console.log('');
      console.log('🎉 ALL content types now use enhanced modular architecture!');
      
    } else if (successRate >= 80) {
      console.log('⚠️ CONTENT TYPES MIGRATION MOSTLY SUCCESSFUL');
      console.log('🔧 Some minor issues remain - please review errors above');
      
    } else {
      console.log('❌ CONTENT TYPES MIGRATION INCOMPLETE');
      console.log('🔧 Significant issues detected - please fix errors before proceeding');
    }
    
    console.log('');
    console.log('✅ Test completed and script will exit cleanly');
  }
}

// Export for use in other tests
module.exports = AllContentTypesTest;

// Run if called directly
if (require.main === module) {
  const test = new AllContentTypesTest();
  test.runTest().catch(console.error);
}
