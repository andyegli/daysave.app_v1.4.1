#!/usr/bin/env node

/**
 * Real URL Validation Test
 * 
 * Tests our content type detection and multimedia analysis capabilities
 * against real URLs without requiring authentication by directly calling
 * the detection functions.
 */

const fs = require('fs');
const path = require('path');
const { ContentTypeDetector } = require('../scripts/populate-content-types');
const { MultimediaAnalyzer } = require('../services/multimedia');

class RealUrlValidationTest {
  constructor() {
    this.detector = new ContentTypeDetector();
    this.analyzer = new MultimediaAnalyzer({ enableLogging: false });
    this.results = [];
    this.summary = {
      total: 0,
      contentTypeSuccess: 0,
      multimediaSuccess: 0,
      platformSuccess: 0,
      urlAccessible: 0
    };
  }

  async run() {
    console.log('🌐 Real URL Validation Test Starting...\n');
    
    try {
      const urls = await this.loadTestUrls();
      await this.validateUrls(urls);
      this.generateReport();
    } catch (error) {
      console.error('💥 Validation test failed:', error);
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
    
    const urls = [];
    let currentCategory = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip category headers
      if (['Images', 'Videos', 'Audio', 'Documents', 'Video Platforms', 'Audio Platforms', 'Image Platforms', 'Social Media Contact Platforms'].includes(trimmed)) {
        currentCategory = trimmed;
        continue;
      }
      
      // Extract URLs
      if (trimmed.includes(': http')) {
        const [label, url] = trimmed.split(': ', 2);
        if (url && url.startsWith('http')) {
          urls.push({
            label: label.trim(),
            url: url.trim(),
            category: currentCategory,
            expectedType: this.getExpectedType(currentCategory)
          });
        }
      }
    }

    this.summary.total = urls.length;
    console.log(`📊 Loaded ${urls.length} test URLs from ${Object.keys(urls.reduce((acc, url) => {
      acc[url.category] = true;
      return acc;
    }, {})).length} categories\n`);

    return urls;
  }

  getExpectedType(category) {
    const mapping = {
      'Images': 'image',
      'Videos': 'video',
      'Audio': 'audio', 
      'Documents': 'document',
      'Video Platforms': 'video',
      'Audio Platforms': 'audio',
      'Image Platforms': 'image',
      'Social Media Contact Platforms': null
    };
    return mapping[category];
  }

  async validateUrls(urls) {
    console.log('🔍 Validating URLs and testing detection systems...\n');
    
    const categories = {};
    urls.forEach(urlItem => {
      if (!categories[urlItem.category]) {
        categories[urlItem.category] = [];
      }
      categories[urlItem.category].push(urlItem);
    });

    for (const [category, categoryUrls] of Object.entries(categories)) {
      console.log(`📂 Validating ${category} (${categoryUrls.length} URLs)...`);
      
      for (const urlItem of categoryUrls) {
        const result = await this.validateSingleUrl(urlItem);
        this.results.push(result);
        this.updateSummary(result);
        
        const statusIcon = result.overall === 'success' ? '✅' : result.overall === 'warning' ? '⚠️' : '❌';
        console.log(`${statusIcon} ${result.label}: ${result.url.substring(0, 50)}...`);
        
        if (result.issues.length > 0) {
          result.issues.forEach(issue => {
            console.log(`    ⚠️ ${issue}`);
          });
        }
      }
      
      console.log(); // Add spacing between categories
    }
  }

  async validateSingleUrl(urlItem) {
    const result = {
      ...urlItem,
      detectedType: null,
      platformDetection: null,
      multimediaDetection: null,
      urlAccessible: false,
      responseCode: null,
      issues: [],
      overall: 'success'
    };

    try {
      // Test 1: Content Type Detection
      result.detectedType = this.detector.detectFromUrl(urlItem.url);
      
      if (urlItem.expectedType && result.detectedType !== urlItem.expectedType) {
        result.issues.push(`Content type mismatch: expected '${urlItem.expectedType}', got '${result.detectedType}'`);
        result.overall = 'failed';
      }

      // Test 2: Platform Detection
      result.platformDetection = this.analyzer.detectPlatform(urlItem.url);
      
      const expectedPlatforms = this.getExpectedPlatforms(urlItem.url);
      if (expectedPlatforms.length > 0 && !expectedPlatforms.includes(result.platformDetection)) {
        result.issues.push(`Platform detection: expected one of [${expectedPlatforms.join(', ')}], got '${result.platformDetection}'`);
        if (result.overall === 'success') result.overall = 'warning';
      }

      // Test 3: Multimedia Detection
      result.multimediaDetection = this.analyzer.isMultimediaUrl(urlItem.url);
      
      const shouldBeMultimedia = ['Images', 'Videos', 'Audio', 'Video Platforms', 'Audio Platforms', 'Image Platforms'].includes(urlItem.category);
      if (shouldBeMultimedia && !result.multimediaDetection) {
        result.issues.push(`Should be detected as multimedia URL but wasn't`);
        result.overall = 'failed';
      }

      // Test 4: URL Accessibility (lightweight check)
      try {
        const fetch = require('node-fetch');
        const response = await fetch(urlItem.url, { 
          method: 'HEAD', 
          timeout: 5000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; DaySave-Test/1.0)'
          }
        });
        
        result.urlAccessible = response.ok;
        result.responseCode = response.status;
        
        if (!response.ok) {
          result.issues.push(`URL not accessible: HTTP ${response.status}`);
          if (result.overall === 'success') result.overall = 'warning';
        }
      } catch (accessError) {
        result.issues.push(`URL access error: ${accessError.message}`);
        if (result.overall === 'success') result.overall = 'warning';
      }

    } catch (error) {
      result.issues.push(`Test execution error: ${error.message}`);
      result.overall = 'failed';
    }

    return result;
  }

  getExpectedPlatforms(url) {
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

  updateSummary(result) {
    if (result.detectedType === result.expectedType || (!result.expectedType && result.detectedType)) {
      this.summary.contentTypeSuccess++;
    }
    
    if (result.multimediaDetection) {
      this.summary.multimediaSuccess++;
    }
    
    if (result.platformDetection !== 'unknown') {
      this.summary.platformSuccess++;
    }
    
    if (result.urlAccessible) {
      this.summary.urlAccessible++;
    }
  }

  generateReport() {
    console.log('='.repeat(80));
    console.log('📊 REAL URL VALIDATION TEST REPORT');
    console.log('='.repeat(80));

    // Overall Summary
    console.log(`\n📈 VALIDATION SUMMARY:`);
    console.log(`   📊 Total URLs Tested: ${this.summary.total}`);
    console.log(`   🎯 Content Type Detection: ${this.summary.contentTypeSuccess}/${this.summary.total} (${Math.round(this.summary.contentTypeSuccess/this.summary.total*100)}%)`);
    console.log(`   🎬 Multimedia Detection: ${this.summary.multimediaSuccess}/${this.summary.total} (${Math.round(this.summary.multimediaSuccess/this.summary.total*100)}%)`);
    console.log(`   🏷️ Platform Detection: ${this.summary.platformSuccess}/${this.summary.total} (${Math.round(this.summary.platformSuccess/this.summary.total*100)}%)`);
    console.log(`   🌐 URL Accessibility: ${this.summary.urlAccessible}/${this.summary.total} (${Math.round(this.summary.urlAccessible/this.summary.total*100)}%)`);

    // Category Performance
    const categoryStats = this.getCategoryStats();
    console.log(`\n📂 CATEGORY PERFORMANCE:`);
    Object.entries(categoryStats).forEach(([category, stats]) => {
      const successRate = Math.round(stats.success / stats.total * 100);
      console.log(`   ${category}: ${stats.success}/${stats.total} successful (${successRate}%)`);
      if (stats.accessible < stats.total) {
        console.log(`      🌐 Only ${stats.accessible}/${stats.total} URLs accessible`);
      }
    });

    // Failed Validations
    const failedResults = this.results.filter(r => r.overall === 'failed');
    if (failedResults.length > 0) {
      console.log(`\n❌ FAILED VALIDATIONS (${failedResults.length}):`);
      failedResults.slice(0, 10).forEach(result => {
        console.log(`   🔴 ${result.label} (${result.category})`);
        result.issues.forEach(issue => {
          console.log(`      ⚠️ ${issue}`);
        });
      });
      if (failedResults.length > 10) {
        console.log(`   ... and ${failedResults.length - 10} more`);
      }
    }

    // URL Accessibility Issues
    const inaccessibleUrls = this.results.filter(r => !r.urlAccessible);
    if (inaccessibleUrls.length > 0) {
      console.log(`\n🌐 URL ACCESSIBILITY ISSUES (${inaccessibleUrls.length}):`);
      const accessibilityGroups = {};
      inaccessibleUrls.forEach(result => {
        const key = result.responseCode || 'Network Error';
        if (!accessibilityGroups[key]) accessibilityGroups[key] = 0;
        accessibilityGroups[key]++;
      });
      
      Object.entries(accessibilityGroups).forEach(([issue, count]) => {
        console.log(`   ${issue}: ${count} URLs`);
      });
    }

    // Success Examples
    const successfulResults = this.results.filter(r => r.overall === 'success' && r.urlAccessible);
    if (successfulResults.length > 0) {
      console.log(`\n✅ SUCCESSFUL VALIDATIONS (showing 5 examples):`);
      successfulResults.slice(0, 5).forEach(result => {
        console.log(`   🎯 ${result.label}: ${result.detectedType} (${result.platformDetection})`);
      });
    }

    console.log(`\n🕐 Completed at: ${new Date().toISOString()}`);
    console.log('='.repeat(80));

    // Set exit code based on results
    const detectionRate = this.summary.contentTypeSuccess / this.summary.total;
    const multimediaRate = this.summary.multimediaSuccess / this.summary.total;

    if (detectionRate >= 0.9 && multimediaRate >= 0.8) {
      console.log('\n🎉 URL validation test PASSED - Detection systems working excellently!');
      process.exit(0);
    } else if (detectionRate >= 0.8 || multimediaRate >= 0.7) {
      console.log('\n⚠️ URL validation test completed with warnings - Some detection issues found');
      process.exit(0);
    } else {
      console.log('\n💥 URL validation test FAILED - Significant detection issues found');
      process.exit(1);
    }
  }

  getCategoryStats() {
    const stats = {};
    
    this.results.forEach(result => {
      if (!stats[result.category]) {
        stats[result.category] = { total: 0, success: 0, accessible: 0 };
      }
      
      stats[result.category].total++;
      
      if (result.overall === 'success') {
        stats[result.category].success++;
      }
      
      if (result.urlAccessible) {
        stats[result.category].accessible++;
      }
    });

    return stats;
  }
}

// Main execution
if (require.main === module) {
  const test = new RealUrlValidationTest();
  test.run().catch(error => {
    console.error('💥 Validation test crashed:', error);
    process.exit(1);
  });
}

module.exports = RealUrlValidationTest; 