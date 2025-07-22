#!/usr/bin/env node

/**
 * Live Pipeline Test
 * 
 * Tests a few working URLs from major platforms through the complete
 * DaySave processing pipeline to verify end-to-end functionality.
 */

const readline = require('readline');

class LivePipelineTest {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.testUrls = [
      {
        url: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
        platform: 'YouTube',
        type: 'video',
        expectedFeatures: ['transcription', 'thumbnails', 'ai_tags', 'title']
      },
      {
        url: 'https://www.instagram.com/reel/C5dPZWVI_r9/',
        platform: 'Instagram',
        type: 'video/image',
        expectedFeatures: ['ai_description', 'thumbnails', 'ai_tags', 'title']
      },
      {
        url: 'https://vimeo.com/169599296',
        platform: 'Vimeo',
        type: 'video',
        expectedFeatures: ['transcription', 'thumbnails', 'ai_tags', 'title']
      },
      {
        url: 'https://soundcloud.com/marshmellomusic/alone',
        platform: 'SoundCloud',
        type: 'audio',
        expectedFeatures: ['transcription', 'ai_tags', 'title']
      }
    ];
    this.results = [];
    this.cookies = null;
  }

  async run() {
    console.log('🚀 Live Pipeline Test Starting...\n');
    console.log('This test will process real URLs through the complete DaySave pipeline.\n');
    
    try {
      // Check server status
      await this.checkServer();
      
      // Get authentication
      await this.handleAuthentication();
      
      // Process test URLs
      await this.processTestUrls();
      
      // Monitor processing
      await this.monitorProcessing();
      
      // Generate report
      this.generateReport();
      
    } catch (error) {
      console.error('💥 Live test failed:', error);
      process.exit(1);
    }
  }

  async checkServer() {
    try {
      const fetch = require('node-fetch');
      const response = await fetch(`${this.baseUrl}/`);
      if (response.ok) {
        console.log('✅ DaySave server is running\n');
      } else {
        throw new Error('Server not responding properly');
      }
    } catch (error) {
      console.error('❌ DaySave server is not running. Please start it first:');
      console.error('   npm run dev\n');
      process.exit(1);
    }
  }

  async handleAuthentication() {
    console.log('🔐 Authentication Required');
    console.log('To test the complete pipeline, you need to be logged in to DaySave.\n');
    
    console.log('Options:');
    console.log('1. 🌐 Open browser and login manually');
    console.log('2. 📋 Provide session cookie manually');
    console.log('3. 🧪 Run content detection test only (no authentication needed)\n');
    
    const choice = await this.promptUser('Choose option (1, 2, or 3): ');
    
    switch (choice.trim()) {
      case '1':
        await this.browserLogin();
        break;
      case '2':
        await this.manualCookie();
        break;
      case '3':
        await this.contentDetectionOnly();
        return;
      default:
        console.log('Invalid option, running detection-only test...');
        await this.contentDetectionOnly();
        return;
    }
  }

  async browserLogin() {
    const { exec } = require('child_process');
    
    console.log('\n🌐 Opening DaySave in your browser...');
    console.log('Please login to DaySave in the browser window.\n');
    
    // Open browser
    const loginUrl = `${this.baseUrl}/auth/login`;
    try {
      exec(`open "${loginUrl}"`, (error) => {
        if (error) {
          console.log(`Please manually open: ${loginUrl}`);
        }
      });
    } catch (e) {
      console.log(`Please manually open: ${loginUrl}`);
    }
    
    console.log('After logging in:');
    console.log('1. Go to Developer Tools (F12)');
    console.log('2. Go to Application/Storage > Cookies');
    console.log('3. Find the session cookie (usually "connect.sid" or "session")');
    console.log('4. Copy the cookie value\n');
    
    const cookie = await this.promptUser('Paste the session cookie value: ');
    if (cookie.trim()) {
      this.cookies = `connect.sid=${cookie.trim()}`;
      console.log('✅ Session cookie set\n');
    } else {
      throw new Error('No session cookie provided');
    }
  }

  async manualCookie() {
    console.log('\n📋 Manual Cookie Input');
    console.log('If you have a session cookie from a previous login, enter it here.\n');
    
    const cookie = await this.promptUser('Enter session cookie value: ');
    if (cookie.trim()) {
      this.cookies = `connect.sid=${cookie.trim()}`;
      console.log('✅ Session cookie set\n');
    } else {
      throw new Error('No session cookie provided');
    }
  }

  async contentDetectionOnly() {
    console.log('\n🔍 Running Content Detection Test Only\n');
    
    const { ContentTypeDetector } = require('../scripts/populate-content-types');
    const { MultimediaAnalyzer } = require('../services/multimedia');
    
    const detector = new ContentTypeDetector();
    const analyzer = new MultimediaAnalyzer({ enableLogging: false });
    
    console.log('Testing content detection on live URLs:\n');
    
    for (const testUrl of this.testUrls) {
      console.log(`🎯 ${testUrl.platform}: ${testUrl.url}`);
      
      const contentType = detector.detectFromUrl(testUrl.url);
      const platform = analyzer.detectPlatform(testUrl.url);
      const isMultimedia = analyzer.isMultimediaUrl(testUrl.url);
      
      console.log(`   Content Type: ${contentType}`);
      console.log(`   Platform: ${platform}`);
      console.log(`   Multimedia: ${isMultimedia}`);
      console.log(`   Expected: ${testUrl.type}\n`);
      
      this.results.push({
        ...testUrl,
        detectedType: contentType,
        detectedPlatform: platform,
        isMultimedia: isMultimedia,
        status: 'detection_only'
      });
    }
    
    this.generateDetectionReport();
    process.exit(0);
  }

  async processTestUrls() {
    if (!this.cookies) {
      throw new Error('Authentication required but no session cookie available');
    }
    
    console.log('📤 Processing URLs through DaySave pipeline...\n');
    
    const fetch = require('node-fetch');
    
    for (const testUrl of this.testUrls) {
      console.log(`🎯 Processing ${testUrl.platform}: ${testUrl.url.substring(0, 50)}...`);
      
      try {
        const response = await fetch(`${this.baseUrl}/content`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': this.cookies,
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            url: testUrl.url,
            comments: `Live pipeline test: ${testUrl.platform}`,
            tags: ['live-test', testUrl.platform.toLowerCase()]
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Submitted successfully - Content ID: ${result.content?.id || result.id}`);
          
          this.results.push({
            ...testUrl,
            contentId: result.content?.id || result.id,
            submittedAt: new Date(),
            status: 'submitted',
            response: result
          });
        } else {
          const errorText = await response.text();
          console.log(`❌ Failed: HTTP ${response.status} - ${errorText}`);
          
          this.results.push({
            ...testUrl,
            status: 'failed',
            error: `HTTP ${response.status}: ${errorText}`
          });
        }
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        
        this.results.push({
          ...testUrl,
          status: 'failed',
          error: error.message
        });
      }
      
      // Wait between submissions
      await this.sleep(2000);
    }
    
    const submitted = this.results.filter(r => r.status === 'submitted').length;
    console.log(`\n📊 Submission Summary: ${submitted}/${this.testUrls.length} URLs submitted successfully\n`);
  }

  async monitorProcessing() {
    const submittedUrls = this.results.filter(r => r.status === 'submitted');
    
    if (submittedUrls.length === 0) {
      console.log('⚠️ No URLs to monitor (none were submitted successfully)');
      return;
    }
    
    console.log('⏳ Monitoring AI processing...\n');
    
    const fetch = require('node-fetch');
    const maxWaitTime = 3 * 60 * 1000; // 3 minutes
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      let allCompleted = true;
      
      for (const result of submittedUrls) {
        if (result.status === 'completed') continue;
        
        try {
          const response = await fetch(`${this.baseUrl}/content/${result.contentId}/analysis`, {
            headers: {
              'Cookie': this.cookies,
              'Accept': 'application/json'
            }
          });
          
          if (response.ok) {
            const analysis = await response.json();
            
            if (analysis.success && analysis.status === 'completed') {
              result.status = 'completed';
              result.analysis = analysis;
              console.log(`✅ ${result.platform} analysis completed`);
            } else if (analysis.status === 'processing') {
              allCompleted = false;
              console.log(`🔄 ${result.platform} still processing...`);
            } else {
              allCompleted = false;
            }
          } else {
            allCompleted = false;
          }
        } catch (error) {
          allCompleted = false;
        }
      }
      
      if (allCompleted) {
        console.log('\n🎉 All URLs have completed AI processing!\n');
        break;
      }
      
      // Wait before next check
      await this.sleep(10000);
    }
    
    if (Date.now() - startTime >= maxWaitTime) {
      console.log('\n⏰ Monitoring timeout reached (3 minutes)\n');
    }
  }

  generateReport() {
    console.log('='.repeat(70));
    console.log('📊 LIVE PIPELINE TEST REPORT');
    console.log('='.repeat(70));
    
    const submitted = this.results.filter(r => r.status === 'submitted' || r.status === 'completed').length;
    const completed = this.results.filter(r => r.status === 'completed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    
    console.log(`\n📈 PIPELINE SUMMARY:`);
    console.log(`   📊 Total URLs: ${this.testUrls.length}`);
    console.log(`   ✅ Successfully Submitted: ${submitted}`);
    console.log(`   🔄 AI Processing Completed: ${completed}`);
    console.log(`   ❌ Failed: ${failed}`);
    
    // Analysis Quality
    const completedResults = this.results.filter(r => r.status === 'completed');
    if (completedResults.length > 0) {
      console.log(`\n🧠 AI ANALYSIS RESULTS:`);
      
      completedResults.forEach(result => {
        const analysis = result.analysis?.analysis || {};
        console.log(`\n   🎯 ${result.platform} (${result.type}):`);
        console.log(`      Title: ${analysis.title || 'Not generated'}`);
        console.log(`      Description: ${(analysis.description || analysis.transcription || '').substring(0, 100)}...`);
        console.log(`      Tags: ${(analysis.auto_tags || []).slice(0, 5).join(', ') || 'None'}`);
        console.log(`      Thumbnails: ${(result.analysis?.thumbnails || []).length}`);
      });
    }
    
    // Failed URLs
    const failedResults = this.results.filter(r => r.status === 'failed');
    if (failedResults.length > 0) {
      console.log(`\n❌ FAILED PROCESSING:`);
      failedResults.forEach(result => {
        console.log(`   • ${result.platform}: ${result.error}`);
      });
    }
    
    console.log(`\n🕐 Completed at: ${new Date().toISOString()}`);
    console.log('='.repeat(70));
    
    // Success criteria
    const successRate = completed / this.testUrls.length;
    if (successRate >= 0.75) {
      console.log('\n🎉 Live pipeline test PASSED - System working excellently!');
    } else if (successRate >= 0.5) {
      console.log('\n⚠️ Live pipeline test completed with warnings');
    } else {
      console.log('\n💥 Live pipeline test FAILED - Issues detected');
    }
  }

  generateDetectionReport() {
    console.log('='.repeat(70));
    console.log('📊 CONTENT DETECTION TEST REPORT');
    console.log('='.repeat(70));
    
    console.log(`\n🎯 DETECTION ACCURACY:`);
    
    this.results.forEach(result => {
      const typeMatch = result.detectedType && result.type.includes(result.detectedType);
      const platformMatch = result.detectedPlatform === result.platform.toLowerCase();
      
      console.log(`\n   ${result.platform}:`);
      console.log(`      URL: ${result.url}`);
      console.log(`      Content Type: ${result.detectedType} ${typeMatch ? '✅' : '❌'}`);
      console.log(`      Platform: ${result.detectedPlatform} ${platformMatch ? '✅' : '❌'}`);
      console.log(`      Multimedia: ${result.isMultimedia ? '✅' : '❌'}`);
    });
    
    console.log('\n🎉 Content detection test completed!');
  }

  async promptUser(question) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
if (require.main === module) {
  const test = new LivePipelineTest();
  test.run().catch(error => {
    console.error('💥 Live test crashed:', error);
    process.exit(1);
  });
}

module.exports = LivePipelineTest; 