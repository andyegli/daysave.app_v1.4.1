#!/usr/bin/env node

const fetch = require('node-fetch');
const readline = require('readline');

class BulkUrlTester {
  constructor() {
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    this.testUrls = [
      'https://www.youtube.com/watch?v=9bZkp7q19f0',
      'https://www.instagram.com/reel/C5dPZWVI_r9/',
      'https://vimeo.com/169599296',
      'https://soundcloud.com/marshmellomusic/alone'
    ];
    this.sessionCookie = null;
    this.submittedContentIds = [];
  }

  async run() {
    console.log('🚀 Bulk URL Submission Test\n');
    
    // Check server status
    await this.checkServer();
    
    // Get authentication
    await this.getAuthentication();
    
    // Submit URLs
    await this.submitUrls();
    
    // Monitor processing
    await this.monitorProcessing();
    
    // Generate final report
    await this.generateFinalReport();
  }

  async checkServer() {
    try {
      console.log('🔍 Checking DaySave server status...');
      const response = await fetch(`${this.baseUrl}/health`);
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

  async getAuthentication() {
    console.log('🔐 Authentication required...');
    console.log(`Please login to DaySave in your browser at: ${process.env.BASE_URL || 'http://localhost:3000'}/auth/login`);
    console.log('Then copy the session cookie value and paste it here.\n');
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question('Enter session cookie value: ', (cookie) => {
        this.sessionCookie = cookie.trim();
        rl.close();
        console.log('✅ Session cookie saved\n');
        resolve();
      });
    });
  }

  async submitUrls() {
    console.log('📤 Submitting test URLs...\n');
    
    for (let i = 0; i < this.testUrls.length; i++) {
      const url = this.testUrls[i];
      try {
        console.log(`📋 Submitting URL ${i + 1}/${this.testUrls.length}: ${url}`);
        
        const response = await fetch(`${this.baseUrl}/content`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `session=${this.sessionCookie}`
          },
          body: JSON.stringify({
            url: url,
            user_comments: `Bulk test submission ${i + 1}`,
            user_tags: ['bulk-test', 'automation', `test-${i + 1}`]
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`   ✅ Content created with ID: ${result.content.id}`);
          this.submittedContentIds.push(result.content.id);
        } else {
          console.log(`   ❌ Failed to submit URL: ${response.statusText}`);
        }
        
        // Small delay between submissions
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`   ❌ Error submitting URL: ${error.message}`);
      }
    }
    
    console.log(`\n📊 Submitted ${this.submittedContentIds.length}/${this.testUrls.length} URLs successfully\n`);
  }

  async monitorProcessing() {
    console.log('🔍 Monitoring analysis processing...\n');
    
    const maxWaitTime = 60000; // 1 minute
    const checkInterval = 5000; // 5 seconds
    let totalWaitTime = 0;
    
    while (totalWaitTime < maxWaitTime) {
      console.log(`⏱️ Checking processing status... (${totalWaitTime/1000}s elapsed)`);
      
      let completedCount = 0;
      let processingCount = 0;
      let pendingCount = 0;
      
      for (const contentId of this.submittedContentIds) {
        try {
          const response = await fetch(`${this.baseUrl}/content/${contentId}/status`, {
            headers: {
              'Cookie': `session=${this.sessionCookie}`
            }
          });
          
          if (response.ok) {
            const status = await response.json();
            
            if (status.analysis_completed) {
              completedCount++;
            } else if (status.analysis_in_progress) {
              processingCount++;
            } else {
              pendingCount++;
            }
          }
        } catch (error) {
          console.log(`   ⚠️ Error checking status for content ${contentId}: ${error.message}`);
        }
      }
      
      console.log(`   📊 Status: ${completedCount} completed, ${processingCount} processing, ${pendingCount} pending`);
      
      if (completedCount === this.submittedContentIds.length) {
        console.log('🎉 All analyses completed!\n');
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      totalWaitTime += checkInterval;
    }
    
    if (totalWaitTime >= maxWaitTime) {
      console.log('⏰ Monitoring timeout reached. Some analyses may still be processing.\n');
    }
  }

  async generateFinalReport() {
    console.log('📋 Generating final test report...\n');
    
    const report = {
      testStartTime: new Date().toISOString(),
      totalUrls: this.testUrls.length,
      submittedUrls: this.submittedContentIds.length,
      successRate: (this.submittedContentIds.length / this.testUrls.length * 100).toFixed(1),
      contentResults: []
    };
    
    for (const contentId of this.submittedContentIds) {
      try {
        const response = await fetch(`${this.baseUrl}/content/${contentId}`, {
          headers: {
            'Cookie': `session=${this.sessionCookie}`
          }
        });
        
        if (response.ok) {
          const content = await response.json();
          report.contentResults.push({
            id: content.id,
            url: content.url,
            title: content.title,
            status: content.analysis_completed ? 'completed' : 'pending',
            hasTranscription: !!content.transcription,
            hasThumbnails: content.thumbnail_count > 0,
            hasSpeakers: content.speaker_count > 0,
            processingTime: content.processing_time || 'unknown'
          });
        }
      } catch (error) {
        console.log(`   ⚠️ Error getting details for content ${contentId}: ${error.message}`);
      }
    }
    
    // Display report
    console.log('📊 BULK URL SUBMISSION TEST REPORT');
    console.log('=' .repeat(50));
    console.log(`📅 Test Date: ${report.testStartTime}`);
    console.log(`🔢 Total URLs: ${report.totalUrls}`);
    console.log(`✅ Successfully Submitted: ${report.submittedUrls}`);
    console.log(`📈 Success Rate: ${report.successRate}%`);
    console.log('\n📋 Individual Results:');
    
    report.contentResults.forEach((result, index) => {
      console.log(`\n${index + 1}. Content ID: ${result.id}`);
      console.log(`   URL: ${result.url}`);
      console.log(`   Title: ${result.title || 'No title'}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Has Transcription: ${result.hasTranscription ? '✅' : '❌'}`);
      console.log(`   Has Thumbnails: ${result.hasThumbnails ? '✅' : '❌'}`);
      console.log(`   Has Speakers: ${result.hasSpeakers ? '✅' : '❌'}`);
      console.log(`   Processing Time: ${result.processingTime}ms`);
    });
    
    // Save report to file
    const fs = require('fs');
    const reportPath = `bulk_test_report_${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Report saved to: ${reportPath}`);
    
    console.log('\n🎯 SUMMARY:');
    if (report.successRate === '100.0') {
      console.log('🎉 Perfect! All URLs were submitted and processed successfully!');
    } else if (parseFloat(report.successRate) >= 80) {
      console.log('👍 Good! Most URLs were processed successfully.');
    } else {
      console.log('⚠️ Issues detected. Some URLs failed to process.');
    }
    
    console.log('\n✅ Bulk URL submission test completed!');
  }
}

// Usage instructions
if (require.main === module) {
  console.log('🧪 DaySave Bulk URL Submission Test');
  console.log('=' .repeat(40));
  console.log('This test will:');
  console.log('1. Verify server is running');
  console.log('2. Submit multiple test URLs');
  console.log('3. Monitor processing status');
  console.log('4. Generate a comprehensive report\n');
  
  const tester = new BulkUrlTester();
  tester.run()
    .then(() => {
      console.log('\n👋 Test completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = BulkUrlTester; 