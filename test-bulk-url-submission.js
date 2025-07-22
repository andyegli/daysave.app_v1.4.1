#!/usr/bin/env node

const fetch = require('node-fetch');
const readline = require('readline');

class BulkUrlTester {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
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
    console.log('🔐 Authentication Required for Bulk URL Submission\n');
    console.log('Please provide a session cookie from your browser:');
    console.log('1. Open DaySave in browser and login');
    console.log('2. Open Developer Tools (F12)');
    console.log('3. Go to Application/Storage tab');
    console.log('4. Find "connect.sid" cookie');
    console.log('5. Copy the entire cookie value\n');
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    return new Promise((resolve) => {
      rl.question('Enter session cookie (or press Enter for test without auth): ', (cookie) => {
        rl.close();
        this.sessionCookie = cookie.trim();
        if (this.sessionCookie) {
          console.log('✅ Session cookie provided\n');
        } else {
          console.log('⚠️  No authentication - will test endpoint only\n');
        }
        resolve();
      });
    });
  }

  async submitUrls() {
    console.log('📤 Submitting URLs to bulk endpoint...\n');
    
    const urlsText = this.testUrls.join('\n');
    console.log('📋 URLs to submit:');
    this.testUrls.forEach((url, index) => {
      console.log(`   ${index + 1}. ${url}`);
    });
    console.log('');
    
    try {
      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      };
      
      if (this.sessionCookie) {
        headers['Cookie'] = `connect.sid=${this.sessionCookie}`;
      }
      
      const formData = new URLSearchParams();
      formData.append('content_type', 'bulk_urls');
      formData.append('bulk_urls', urlsText);
      formData.append('generate_ai_title', 'true');
      formData.append('auto_tag', 'true');
      
      console.log('🚀 Sending bulk URL request...');
      const response = await fetch(`${this.baseUrl}/content`, {
        method: 'POST',
        headers: headers,
        body: formData
      });
      
      console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
      
      if (response.headers.get('content-type')?.includes('application/json')) {
        const result = await response.json();
        console.log('📋 Response:', JSON.stringify(result, null, 2));
        
        if (result.success && result.imported) {
          this.submittedContentIds = result.imported.map(item => item.id);
          console.log(`✅ Successfully submitted ${this.submittedContentIds.length} URLs`);
          console.log(`🆔 Content IDs: ${this.submittedContentIds.join(', ')}\n`);
        } else if (result.errors) {
          console.log('⚠️  Some URLs failed:');
          result.errors.forEach(error => {
            console.log(`   ❌ ${error.url}: ${error.error}`);
          });
        }
      } else {
        const text = await response.text();
        console.log('📄 Response (text):', text.substring(0, 500));
        
        if (response.status === 302) {
          console.log('🔄 Redirect detected - likely successful submission');
        }
      }
      
    } catch (error) {
      console.error('❌ Bulk URL submission failed:', error.message);
      console.error('🔧 Stack:', error.stack);
    }
  }

  async monitorProcessing() {
    if (this.submittedContentIds.length === 0) {
      console.log('⚠️  No content IDs to monitor - skipping processing check\n');
      return;
    }
    
    console.log('🔍 Monitoring AI processing progress...\n');
    
    const maxChecks = 10;
    const checkInterval = 5000; // 5 seconds
    
    for (let check = 1; check <= maxChecks; check++) {
      console.log(`🔄 Check ${check}/${maxChecks} - Checking processing status...`);
      
      for (const contentId of this.submittedContentIds) {
        await this.checkContentStatus(contentId);
      }
      
      console.log(`⏳ Waiting ${checkInterval/1000} seconds before next check...\n`);
      await this.sleep(checkInterval);
    }
  }

  async checkContentStatus(contentId) {
    try {
      const headers = {};
      if (this.sessionCookie) {
        headers['Cookie'] = `connect.sid=${this.sessionCookie}`;
      }
      
      const response = await fetch(`${this.baseUrl}/files/${contentId}/analysis`, {
        headers: headers
      });
      
      if (response.ok) {
        const analysis = await response.json();
        
        console.log(`📊 Content ${contentId}:`);
        console.log(`   Status: ${analysis.status || 'unknown'}`);
        console.log(`   Media Type: ${analysis.mediaType || 'unknown'}`);
        
        if (analysis.analysis) {
          console.log(`   Title: ${analysis.analysis.title || 'none'}`);
          console.log(`   Description: ${analysis.analysis.description ? 'Yes' : 'No'}`);
          console.log(`   Transcription: ${analysis.analysis.transcription ? 'Yes' : 'No'}`);
          console.log(`   Objects: ${analysis.analysis.objects?.length || 0}`);
          console.log(`   Thumbnails: ${analysis.thumbnails?.length || 0}`);
        }
        
        if (analysis.auto_tags) {
          console.log(`   AI Tags: ${analysis.auto_tags.join(', ')}`);
        }
        
      } else {
        console.log(`❌ Content ${contentId}: Status ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ Content ${contentId}: Error - ${error.message}`);
    }
  }

  async generateFinalReport() {
    console.log('\n======================================================================');
    console.log('📊 BULK URL SUBMISSION TEST REPORT');
    console.log('======================================================================\n');
    
    console.log('📤 SUBMISSION SUMMARY:');
    console.log(`   Total URLs submitted: ${this.testUrls.length}`);
    console.log(`   Successful submissions: ${this.submittedContentIds.length}`);
    console.log(`   Failed submissions: ${this.testUrls.length - this.submittedContentIds.length}\n`);
    
    if (this.submittedContentIds.length > 0) {
      console.log('✅ SUCCESS INDICATORS:');
      console.log('   • Bulk URL endpoint is working');
      console.log('   • URLs are being processed');
      console.log('   • Content records are created');
      console.log('   • AI analysis pipeline is active\n');
      
      console.log('🎯 NEXT STEPS:');
      console.log('   • Check DaySave web interface for uploaded content');
      console.log('   • Verify AI analysis results in the UI');
      console.log('   • Test individual content analysis features\n');
      
      console.log('🆔 CONTENT IDS FOR MANUAL VERIFICATION:');
      this.submittedContentIds.forEach((id, index) => {
        console.log(`   ${index + 1}. ${this.baseUrl}/files/${id}`);
      });
    } else {
      console.log('⚠️  NO SUCCESSFUL SUBMISSIONS:');
      console.log('   • Check authentication (session cookie)');
      console.log('   • Verify server is running and accessible');
      console.log('   • Check server logs for error details');
    }
    
    console.log('\n🎉 Bulk URL submission test completed!\n');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the test
if (require.main === module) {
  const tester = new BulkUrlTester();
  tester.run().catch(error => {
    console.error('💥 Bulk URL test failed:', error.message);
    process.exit(1);
  });
}

module.exports = BulkUrlTester; 