#!/usr/bin/env node

/**
 * Comprehensive URL Test Suite
 * 
 * Tests all URLs from testfiles/test_urls_and_files.txt
 * Validates content type detection, platform detection, and multimedia analysis
 */

const fs = require('fs');
const path = require('path');
const { ContentTypeDetector } = require('../scripts/populate-content-types');
const { MultimediaAnalyzer } = require('../services/multimedia');

class ComprehensiveUrlTest {
  constructor() {
    this.detector = new ContentTypeDetector();
    this.analyzer = new MultimediaAnalyzer({ enableLogging: false });
    this.results = [];
    this.summary = {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0,
      categories: {}
    };
  }

  async run() {
    console.log('🌐 Comprehensive URL Test Suite Starting...\n');
    
    try {
      const testData = await this.loadTestUrls();
      await this.runAllTests(testData);
      this.generateDetailedReport();
    } catch (error) {
      console.error('💥 Test suite failed:', error);
      process.exit(1);
    }
  }

  async loadTestUrls() {
    const testFilePath = path.join(__dirname, '..', 'testfiles', 'test_urls_and_files.txt');
    
    if (!fs.existsSync(testFilePath)) {
      throw new Error(`Test file not found: ${testFilePath}`);
    }

    const content = fs.readFileSync(testFilePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    const testData = {
      images: [],
      videos: [],
      audio: [],
      documents: [],
      videoPlatforms: [],
      audioPlatforms: [],
      imagePlatforms: [],
      socialMedia: []
    };

    let currentCategory = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Detect category headers
      if (trimmed === 'Images') {
        currentCategory = 'images';
        continue;
      } else if (trimmed === 'Videos') {
        currentCategory = 'videos';
        continue;
      } else if (trimmed === 'Audio') {
        currentCategory = 'audio';
        continue;
      } else if (trimmed === 'Documents') {
        currentCategory = 'documents';
        continue;
      } else if (trimmed === 'Video Platforms') {
        currentCategory = 'videoPlatforms';
        continue;
      } else if (trimmed === 'Audio Platforms') {
        currentCategory = 'audioPlatforms';
        continue;
      } else if (trimmed === 'Image Platforms') {
        currentCategory = 'imagePlatforms';
        continue;
      } else if (trimmed === 'Social Media Contact Platforms') {
        currentCategory = 'socialMedia';
        continue;
      }
      
      // Parse URL lines (format: "TYPE: URL")
      if (trimmed.includes(': http')) {
        const [label, url] = trimmed.split(': ', 2);
        if (currentCategory && testData[currentCategory]) {
          testData[currentCategory].push({
            label: label.trim(),
            url: url.trim(),
            category: currentCategory
          });
        }
      }
    }

    console.log('📊 Loaded test URLs:');
    Object.keys(testData).forEach(category => {
      console.log(`   ${category}: ${testData[category].length} URLs`);
    });
    console.log();

    return testData;
  }

  async runAllTests(testData) {
    console.log('🧪 Running comprehensive tests...\n');

    for (const [category, urls] of Object.entries(testData)) {
      if (urls.length === 0) continue;
      
      console.log(`📂 Testing ${category.toUpperCase()} (${urls.length} URLs)`);
      
      for (const testItem of urls) {
        await this.testSingleUrl(testItem, category);
      }
      
      console.log();
    }
  }

  async testSingleUrl(testItem, category) {
    const { label, url } = testItem;
    const testResult = {
      category,
      label,
      url,
      detectedType: null,
      expectedType: null,
      platformDetection: null,
      multimediaDetection: null,
      issues: [],
      status: 'passed'
    };

    try {
      // Determine expected content type based on category
      testResult.expectedType = this.getExpectedType(category, label);
      
      // Test content type detection
      testResult.detectedType = this.detector.detectFromUrl(url);
      
      // Test platform detection
      testResult.platformDetection = this.analyzer.detectPlatform(url);
      
      // Test multimedia URL detection
      testResult.multimediaDetection = this.analyzer.isMultimediaUrl(url);

      // Validate results
      this.validateResults(testResult);

    } catch (error) {
      testResult.issues.push(`Test execution error: ${error.message}`);
      testResult.status = 'failed';
    }

    // Add to results and update summary
    this.results.push(testResult);
    this.updateSummary(testResult);

    // Print result
    const statusIcon = this.getStatusIcon(testResult.status);
    const shortUrl = url.length > 50 ? url.substring(0, 47) + '...' : url;
    console.log(`${statusIcon} ${label}: ${shortUrl}`);
    
    if (testResult.issues.length > 0) {
      testResult.issues.forEach(issue => {
        console.log(`    ⚠️ ${issue}`);
      });
    }
  }

  getExpectedType(category, label) {
    const categoryMapping = {
      images: 'image',
      videos: 'video', 
      audio: 'audio',
      documents: 'document',
      videoPlatforms: 'video',
      audioPlatforms: 'audio',
      imagePlatforms: 'image',
      socialMedia: null // Home pages don't have specific content types
    };

    return categoryMapping[category];
  }

  validateResults(testResult) {
    const { expectedType, detectedType, platformDetection, multimediaDetection, category, url } = testResult;

    // 1. Content Type Validation
    if (expectedType && detectedType !== expectedType) {
      testResult.issues.push(`Content type mismatch: expected '${expectedType}', got '${detectedType}'`);
      testResult.status = 'failed';
    }

    // 2. Platform Detection Validation
    const expectedPlatforms = this.getExpectedPlatform(url);
    if (expectedPlatforms.length > 0 && !expectedPlatforms.includes(platformDetection)) {
      testResult.issues.push(`Platform detection: expected one of [${expectedPlatforms.join(', ')}], got '${platformDetection}'`);
      if (testResult.status === 'passed') testResult.status = 'warning';
    }

    // 3. Multimedia Detection Validation
    const shouldBeMultimedia = ['images', 'videos', 'audio', 'videoPlatforms', 'audioPlatforms', 'imagePlatforms'].includes(category);
    if (shouldBeMultimedia && !multimediaDetection) {
      testResult.issues.push(`Should be detected as multimedia URL but wasn't`);
      testResult.status = 'failed';
    }

    // 4. Special validations for social media home pages
    if (category === 'socialMedia') {
      // Home pages should not be detected as multimedia
      if (multimediaDetection) {
        testResult.issues.push(`Home page incorrectly detected as multimedia`);
        if (testResult.status === 'passed') testResult.status = 'warning';
      }
    }

    // 5. Direct file URL validation
    if (['images', 'videos', 'audio', 'documents'].includes(category)) {
      // Direct file URLs should be detected properly
      if (!detectedType || detectedType === 'unknown') {
        testResult.issues.push(`Direct file URL not properly detected`);
        testResult.status = 'failed';
      }
    }
  }

  getExpectedPlatform(url) {
    const platformPatterns = [
      { pattern: /youtube\.com|youtu\.be/, platform: 'youtube' },
      { pattern: /instagram\.com/, platform: 'instagram' },
      { pattern: /facebook\.com|fb\.com/, platform: 'facebook' },
      { pattern: /twitter\.com|x\.com/, platform: 'twitter' },
      { pattern: /tiktok\.com/, platform: 'tiktok' },
      { pattern: /vimeo\.com/, platform: 'vimeo' },
      { pattern: /twitch\.tv/, platform: 'twitch' },
      { pattern: /dailymotion\.com/, platform: 'dailymotion' },
      { pattern: /soundcloud\.com/, platform: 'soundcloud' },
      { pattern: /spotify\.com/, platform: 'spotify' },
      { pattern: /anchor\.fm/, platform: 'anchor' },
      { pattern: /imgur\.com/, platform: 'imgur' },
      { pattern: /flickr\.com/, platform: 'flickr' },
      { pattern: /pinterest\.com/, platform: 'pinterest' },
      { pattern: /unsplash\.com/, platform: 'unsplash' }
    ];

    const matches = platformPatterns.filter(p => p.pattern.test(url));
    return matches.map(m => m.platform);
  }

  updateSummary(testResult) {
    this.summary.total++;
    
    if (testResult.status === 'passed') {
      this.summary.passed++;
    } else if (testResult.status === 'warning') {
      this.summary.warnings++;
    } else {
      this.summary.failed++;
    }

    // Update category stats
    if (!this.summary.categories[testResult.category]) {
      this.summary.categories[testResult.category] = { total: 0, passed: 0, failed: 0, warnings: 0 };
    }
    
    this.summary.categories[testResult.category].total++;
    this.summary.categories[testResult.category][testResult.status]++;
  }

  getStatusIcon(status) {
    switch (status) {
      case 'passed': return '✅';
      case 'warning': return '⚠️';
      case 'failed': return '❌';
      default: return '❓';
    }
  }

  generateDetailedReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPREHENSIVE URL TEST REPORT');
    console.log('='.repeat(80));

    // Overall Summary
    console.log(`\n📈 OVERALL SUMMARY:`);
    console.log(`   ✅ Passed: ${this.summary.passed}/${this.summary.total} (${Math.round(this.summary.passed/this.summary.total*100)}%)`);
    console.log(`   ⚠️ Warnings: ${this.summary.warnings}/${this.summary.total} (${Math.round(this.summary.warnings/this.summary.total*100)}%)`);
    console.log(`   ❌ Failed: ${this.summary.failed}/${this.summary.total} (${Math.round(this.summary.failed/this.summary.total*100)}%)`);

    // Category Breakdown
    console.log(`\n📂 CATEGORY BREAKDOWN:`);
    Object.entries(this.summary.categories).forEach(([category, stats]) => {
      const passRate = Math.round(stats.passed/stats.total*100);
      console.log(`   ${category}: ${stats.passed}/${stats.total} passed (${passRate}%)`);
      if (stats.warnings > 0) console.log(`      ⚠️ ${stats.warnings} warnings`);
      if (stats.failed > 0) console.log(`      ❌ ${stats.failed} failed`);
    });

    // Failed Tests Details
    const failedTests = this.results.filter(r => r.status === 'failed');
    if (failedTests.length > 0) {
      console.log(`\n❌ FAILED TESTS (${failedTests.length}):`);
      failedTests.forEach(test => {
        console.log(`\n   🔴 ${test.label} (${test.category})`);
        console.log(`      URL: ${test.url}`);
        console.log(`      Expected: ${test.expectedType}, Got: ${test.detectedType}`);
        console.log(`      Platform: ${test.platformDetection}, Multimedia: ${test.multimediaDetection}`);
        test.issues.forEach(issue => {
          console.log(`      ⚠️ ${issue}`);
        });
      });
    }

    // Warning Tests Details
    const warningTests = this.results.filter(r => r.status === 'warning');
    if (warningTests.length > 0) {
      console.log(`\n⚠️ TESTS WITH WARNINGS (${warningTests.length}):`);
      warningTests.forEach(test => {
        console.log(`\n   🟡 ${test.label} (${test.category})`);
        console.log(`      URL: ${test.url}`);
        test.issues.forEach(issue => {
          console.log(`      ⚠️ ${issue}`);
        });
      });
    }

    // Recommendations
    console.log(`\n🔧 RECOMMENDATIONS:`);
    
    if (failedTests.length > 0) {
      const contentTypeFailures = failedTests.filter(t => t.issues.some(i => i.includes('Content type mismatch')));
      if (contentTypeFailures.length > 0) {
        console.log(`   📝 Update ContentTypeDetector patterns for ${contentTypeFailures.length} failed content type detections`);
      }
      
      const multimediaFailures = failedTests.filter(t => t.issues.some(i => i.includes('multimedia')));
      if (multimediaFailures.length > 0) {
        console.log(`   🎬 Update MultimediaAnalyzer.isMultimediaUrl() for ${multimediaFailures.length} multimedia detection failures`);
      }
    }

    if (this.summary.failed === 0 && this.summary.warnings === 0) {
      console.log(`   🎉 All tests passed! No action needed.`);
    }

    // Performance Insights
    console.log(`\n📊 INSIGHTS:`);
    console.log(`   • Most reliable category: ${this.getBestCategory()}`);
    console.log(`   • Needs attention: ${this.getWorstCategory()}`);
    console.log(`   • Platform detection accuracy: ${this.getPlatformAccuracy()}%`);

    console.log(`\n🕐 Completed at: ${new Date().toISOString()}`);
    console.log('='.repeat(80));

    // Generate CSV report for further analysis
    this.generateCsvReport();

    // Set exit code
    if (this.summary.failed > 0) {
      console.log('\n💥 Comprehensive test FAILED - Critical issues detected');
      process.exit(1);
    } else if (this.summary.warnings > 0) {
      console.log('\n⚠️ Comprehensive test completed with warnings');
      process.exit(0);
    } else {
      console.log('\n🎉 All comprehensive tests PASSED!');
      process.exit(0);
    }
  }

  getBestCategory() {
    let best = { category: 'none', rate: 0 };
    Object.entries(this.summary.categories).forEach(([category, stats]) => {
      const rate = stats.passed / stats.total;
      if (rate > best.rate) {
        best = { category, rate };
      }
    });
    return `${best.category} (${Math.round(best.rate * 100)}%)`;
  }

  getWorstCategory() {
    let worst = { category: 'none', rate: 1 };
    Object.entries(this.summary.categories).forEach(([category, stats]) => {
      const rate = stats.passed / stats.total;
      if (rate < worst.rate) {
        worst = { category, rate };
      }
    });
    return `${worst.category} (${Math.round(worst.rate * 100)}%)`;
  }

  getPlatformAccuracy() {
    const platformTests = this.results.filter(r => r.platformDetection !== 'unknown');
    const correctPlatforms = platformTests.filter(r => {
      const expected = this.getExpectedPlatform(r.url);
      return expected.length === 0 || expected.includes(r.platformDetection);
    });
    return platformTests.length > 0 ? Math.round(correctPlatforms.length / platformTests.length * 100) : 0;
  }

  generateCsvReport() {
    const csvPath = path.join(__dirname, '..', 'test-results.csv');
    const headers = ['Category', 'Label', 'URL', 'Expected Type', 'Detected Type', 'Platform', 'Multimedia', 'Status', 'Issues'];
    
    const csvLines = [headers.join(',')];
    this.results.forEach(result => {
      const row = [
        result.category,
        `"${result.label}"`,
        `"${result.url}"`,
        result.expectedType || '',
        result.detectedType || '',
        result.platformDetection || '',
        result.multimediaDetection,
        result.status,
        `"${result.issues.join('; ')}""`
      ];
      csvLines.push(row.join(','));
    });

    fs.writeFileSync(csvPath, csvLines.join('\n'));
    console.log(`\n📄 Detailed CSV report saved: ${csvPath}`);
  }
}

// Main execution
if (require.main === module) {
  const test = new ComprehensiveUrlTest();
  test.run().catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = ComprehensiveUrlTest; 