#!/usr/bin/env node

/**
 * DaySave Health Check Script
 * 
 * Tests all critical functionality to prevent regressions
 * Run this after any code changes or deployments
 */

const { Sequelize } = require('sequelize');
const { ContentTypeDetector } = require('../scripts/populate-content-types');

// Import models and services
let models, MultimediaAnalyzer, AutomationOrchestrator;

try {
  models = require('../models');
  MultimediaAnalyzer = require('../services/multimedia/MultimediaAnalyzer');
  AutomationOrchestrator = require('../services/multimedia/AutomationOrchestrator');
} catch (error) {
  console.error('❌ Failed to import modules:', error.message);
  process.exit(1);
}

class HealthChecker {
  constructor() {
    this.results = [];
    this.detector = new ContentTypeDetector();
  }

  async runAllChecks() {
    console.log('🏥 DaySave Health Check Starting...\n');
    
    try {
      await this.checkDatabase();
      await this.checkContentTypeDetection();
      await this.checkMultimediaServices();
      await this.checkModelRelationships();
      await this.checkFileUploadPipeline();
      await this.generateReport();
    } catch (error) {
      console.error('💥 Health check failed:', error);
      process.exit(1);
    }
  }

  async checkDatabase() {
    console.log('📊 Testing Database Connection...');
    
    try {
      // Test database connection
      await models.sequelize.authenticate();
      this.addResult('✅', 'Database Connection', 'Connected successfully');
      
      // Test basic model operations
      const userCount = await models.User.count();
      const contentCount = await models.Content.count();
      this.addResult('✅', 'Database Models', `Users: ${userCount}, Content: ${contentCount}`);
      
    } catch (error) {
      this.addResult('❌', 'Database Connection', error.message);
    }
  }

  async checkContentTypeDetection() {
    console.log('🎯 Testing Content Type Detection...');
    
    const testCases = [
      { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', expected: 'video', platform: 'YouTube' },
      { url: 'https://youtu.be/dQw4w9WgXcQ', expected: 'video', platform: 'YouTube Short' },
      { url: 'https://www.instagram.com/reel/ABC123/', expected: 'video', platform: 'Instagram Reel' },
      { url: 'https://www.instagram.com/p/ABC123/', expected: 'video', platform: 'Instagram Post' },
      { url: 'https://www.facebook.com/share/v/16e76ZjBNt/', expected: 'video', platform: 'Facebook Share' },
      { url: 'https://www.facebook.com/watch?v=123456789', expected: 'video', platform: 'Facebook Watch' },
      { url: 'https://example.com/video.mp4', expected: 'video', platform: 'Direct Video' },
      { url: 'https://example.com/image.jpg', expected: 'image', platform: 'Direct Image' },
      { url: 'https://example.com/audio.mp3', expected: 'audio', platform: 'Direct Audio' },
    ];

    for (const testCase of testCases) {
      try {
        const detected = this.detector.detectFromUrl(testCase.url);
        if (detected === testCase.expected) {
          this.addResult('✅', `Content Type - ${testCase.platform}`, `Correctly detected as ${detected}`);
        } else {
          this.addResult('❌', `Content Type - ${testCase.platform}`, `Expected ${testCase.expected}, got ${detected}`);
        }
      } catch (error) {
        this.addResult('❌', `Content Type - ${testCase.platform}`, error.message);
      }
    }
  }

  async checkMultimediaServices() {
    console.log('🎬 Testing Multimedia Services...');
    
    try {
      // Test MultimediaAnalyzer initialization
      const analyzer = new MultimediaAnalyzer();
      this.addResult('✅', 'MultimediaAnalyzer', 'Service initialized successfully');
      
      // Test AutomationOrchestrator initialization
      const orchestrator = AutomationOrchestrator.getInstance();
      this.addResult('✅', 'AutomationOrchestrator', 'Service initialized successfully');
      
      // Test platform detection
      const testUrls = [
        'https://www.youtube.com/watch?v=test',
        'https://www.instagram.com/reel/test/',
        'https://www.facebook.com/share/v/test/'
      ];
      
      for (const url of testUrls) {
        const platform = analyzer.detectPlatform(url);
        const isMultimedia = analyzer.isMultimediaUrl(url);
        if (platform !== 'unknown' && isMultimedia) {
          this.addResult('✅', `Platform Detection - ${platform}`, 'Detected correctly');
        } else {
          this.addResult('⚠️', `Platform Detection - ${url}`, `Platform: ${platform}, Multimedia: ${isMultimedia}`);
        }
      }
      
    } catch (error) {
      this.addResult('❌', 'Multimedia Services', error.message);
    }
  }

  async checkModelRelationships() {
    console.log('🔗 Testing Model Relationships...');
    
    try {
      // Check if critical models exist and have associations
      const criticalModels = [
        'User', 'Content', 'File', 'VideoAnalysis', 'AudioAnalysis', 
        'ImageAnalysis', 'ProcessingJob', 'Thumbnail', 'Speaker'
      ];
      
      for (const modelName of criticalModels) {
        if (models[modelName]) {
          this.addResult('✅', `Model - ${modelName}`, 'Available');
        } else {
          this.addResult('❌', `Model - ${modelName}`, 'Missing');
        }
      }
      
      // Test a few key associations
      if (models.Content && models.User) {
        const association = models.Content.associations.User;
        if (association) {
          this.addResult('✅', 'Model Associations', 'Content → User association exists');
        } else {
          this.addResult('⚠️', 'Model Associations', 'Content → User association missing');
        }
      }
      
    } catch (error) {
      this.addResult('❌', 'Model Relationships', error.message);
    }
  }

  async checkFileUploadPipeline() {
    console.log('📁 Testing File Upload Pipeline...');
    
    try {
      // Test file type detection from extensions
      const fileTests = [
        { filename: 'test.mp4', expected: 'video' },
        { filename: 'test.jpg', expected: 'image' },
        { filename: 'test.mp3', expected: 'audio' },
        { filename: 'test.pdf', expected: 'document' }
      ];
      
      for (const test of fileTests) {
        const detected = this.detector.detectFromFilename(test.filename);
        if (detected === test.expected) {
          this.addResult('✅', `File Type - ${test.filename}`, `Correctly detected as ${detected}`);
        } else {
          this.addResult('❌', `File Type - ${test.filename}`, `Expected ${test.expected}, got ${detected}`);
        }
      }
      
      // Test MIME type detection
      const mimeTests = [
        { mime: 'video/mp4', expected: 'video' },
        { mime: 'image/jpeg', expected: 'image' },
        { mime: 'audio/mpeg', expected: 'audio' },
        { mime: 'application/pdf', expected: 'document' }
      ];
      
      for (const test of mimeTests) {
        const detected = this.detector.detectFromMimeType(test.mime);
        if (detected === test.expected) {
          this.addResult('✅', `MIME Type - ${test.mime}`, `Correctly detected as ${detected}`);
        } else {
          this.addResult('❌', `MIME Type - ${test.mime}`, `Expected ${test.expected}, got ${detected}`);
        }
      }
      
    } catch (error) {
      this.addResult('❌', 'File Upload Pipeline', error.message);
    }
  }

  addResult(status, component, message) {
    this.results.push({ status, component, message });
    console.log(`${status} ${component}: ${message}`);
  }

  async generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 HEALTH CHECK REPORT');
    console.log('='.repeat(80));
    
    const passed = this.results.filter(r => r.status === '✅').length;
    const warned = this.results.filter(r => r.status === '⚠️').length;
    const failed = this.results.filter(r => r.status === '❌').length;
    const total = this.results.length;
    
    console.log(`\n📈 SUMMARY:`);
    console.log(`   ✅ Passed: ${passed}/${total}`);
    console.log(`   ⚠️ Warnings: ${warned}/${total}`);
    console.log(`   ❌ Failed: ${failed}/${total}`);
    
    if (failed > 0) {
      console.log(`\n❌ FAILED CHECKS:`);
      this.results
        .filter(r => r.status === '❌')
        .forEach(r => console.log(`   • ${r.component}: ${r.message}`));
    }
    
    if (warned > 0) {
      console.log(`\n⚠️ WARNINGS:`);
      this.results
        .filter(r => r.status === '⚠️')
        .forEach(r => console.log(`   • ${r.component}: ${r.message}`));
    }
    
    console.log(`\n🕐 Completed at: ${new Date().toISOString()}`);
    console.log('='.repeat(80));
    
    // Set exit code based on results
    if (failed > 0) {
      console.log('\n💥 Health check FAILED - Critical issues detected');
      process.exit(1);
    } else if (warned > 0) {
      console.log('\n⚠️ Health check completed with warnings');
      process.exit(0);
    } else {
      console.log('\n🎉 All health checks PASSED!');
      process.exit(0);
    }
  }
}

// Main execution
if (require.main === module) {
  const checker = new HealthChecker();
  checker.runAllChecks().catch(error => {
    console.error('💥 Health check crashed:', error);
    process.exit(1);
  });
}

module.exports = HealthChecker; 