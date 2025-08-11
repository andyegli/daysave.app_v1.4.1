#!/usr/bin/env node

/**
 * Integration Test: Bulk URL Processing
 * 
 * This test processes URLs from tests/integration-bulk-url-test.urls
 * through the real bulk import system to verify end-to-end functionality.
 * 
 * URLs are loaded from CSV file with enable/disable functionality.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

class BulkUrlIntegrationTest {
  constructor() {
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    this.testResults = [];
    this.processedUrls = [];
    this.failedUrls = [];
    this.summary = {
      total: 0,
      submitted: 0,
      processed: 0,
      failed: 0,
      analysisComplete: 0
    };
    
    // Check if test authentication is enabled
    const isTestAuthEnabled = process.env.ENABLE_TEST_AUTH === 'true';
    
    if (!isTestAuthEnabled) {
      console.log('⚠️  ENABLE_TEST_AUTH not set to true in .env file');
      console.log('   Set ENABLE_TEST_AUTH=true in .env to enable test authentication bypass');
    }
    
    // Use environment test user or fallback (this test uses regular user account)
    const testUser = process.env.TEST_USER || 'test-user';
    
    // Enable test mode with authentication bypass
    this.testHeaders = {
      'x-test-mode': 'true',
      'x-test-auth-token': testUser,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'DaySave-Bulk-Integration-Test'
    };
  }

  async run() {
    console.log('🌐 Starting Bulk URL Integration Test...\n');
    
    try {
      // Check if server is running
      await this.checkServerStatus();
      
      // Load and prepare test URLs
      const urls = await this.loadTestUrls();
      
      // Process URLs in batches
      await this.processBulkUrls(urls);
      
      // Wait for processing to complete
      await this.monitorProcessing();
      
      // Generate comprehensive report
      this.generateReport();
      
    } catch (error) {
      console.error('💥 Integration test failed:', error);
      process.exit(1);
    }
  }

  async checkServerStatus() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (response.status === 404) {
        // Try a basic endpoint instead
        const basicResponse = await fetch(`${this.baseUrl}/`);
        if (basicResponse.ok) {
          console.log('✅ Server is running (basic check)');
        } else {
          throw new Error('Server not responding properly');
        }
      } else if (response.ok) {
        console.log('✅ Server is running and healthy');
      }
    } catch (error) {
      console.error('❌ Server is not running. Please start the server first:');
      console.error('   npm run dev');
      process.exit(1);
    }
  }

  async loadTestUrls() {
    const csvFile = path.join(__dirname, 'integration-bulk-url-test.urls');
    
    if (!fs.existsSync(csvFile)) {
      console.log('❌ CSV file not found:', csvFile);
      console.log('   Creating default CSV file with sample URLs...');
      this.createDefaultCsvFile(csvFile);
    }
    
    try {
      const csvContent = fs.readFileSync(csvFile, 'utf8');
      const lines = csvContent.trim().split('\n');
      
      const urls = [];
      
      // Skip header line
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const [enabled, url, description] = line.split(',').map(col => col.trim());
        
        // Only include enabled URLs (1 = enabled, 0 = disabled)
        if (enabled === '1') {
          const category = this.detectCategory(url);
          urls.push({
            label: description,
            url: url,
            category: category,
            description: description
          });
        }
      }
      
      this.summary.total = urls.length;
      console.log(`📊 Loaded ${urls.length} enabled URLs from CSV file\n`);
      
      return urls;
      
    } catch (error) {
      console.error('❌ Error loading CSV file:', error.message);
      throw error;
    }
  }

  /**
   * Create default CSV file with sample URLs
   */
  createDefaultCsvFile(csvFile) {
    const defaultContent = `enabled,url,description
1,https://file-examples.com/wp-content/uploads/2017/10/file_example_JPG_1MB.jpg,JPEG image sample
1,https://file-examples.com/wp-content/uploads/2017/08/file_example_PNG_1MB.png,PNG image sample
1,https://file-examples.com/wp-content/uploads/2017/04/file_example_MP4_1280_10MG.mp4,MP4 video sample
1,https://file-examples.com/wp-content/uploads/2017/11/file_example_MP3_1MG.mp3,MP3 audio sample
1,https://file-examples.com/wp-content/uploads/2017/02/file-sample_150kB.pdf,PDF document sample
1,https://www.youtube.com/watch?v=9bZkp7q19f0,YouTube video
1,https://www.instagram.com/reel/C5dPZWVI_r9/,Instagram reel
1,https://vimeo.com/169599296,Vimeo video
1,https://soundcloud.com/marshmellomusic/alone,SoundCloud audio
1,https://www.facebook.com/share/r/16u6uFokih/?mibextid=wwXIfr,Facebook video
0,https://file-examples.com/wp-content/uploads/2017/10/file_example_GIF_1MB.gif,GIF image sample (disabled)
0,https://file-examples.com/wp-content/uploads/2018/04/file_example_AVI_1280_1_5MG.avi,AVI video sample (disabled)
0,https://www.youtube.com/shorts/Y1VVha1WlqY,YouTube shorts (disabled)`;
    
    try {
      fs.writeFileSync(csvFile, defaultContent);
      console.log('✅ Created default CSV file:', csvFile);
    } catch (error) {
      console.error('❌ Error creating CSV file:', error.message);
    }
  }

  /**
   * Detect category from URL
   */
  detectCategory(url) {
    if (url.includes('file-examples.com')) {
      if (url.includes('.jpg') || url.includes('.png') || url.includes('.gif') || url.includes('.webp')) {
        return 'Images';
      }
      if (url.includes('.mp4') || url.includes('.avi') || url.includes('.mov') || url.includes('.webm')) {
        return 'Videos';
      }
      if (url.includes('.mp3') || url.includes('.wav') || url.includes('.flac') || url.includes('.aac')) {
        return 'Audio';
      }
      if (url.includes('.pdf') || url.includes('.doc') || url.includes('.txt')) {
        return 'Documents';
      }
    }
    if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com') || 
        url.includes('instagram.com') || url.includes('facebook.com') || url.includes('tiktok.com')) {
      return 'Video Platforms';
    }
    if (url.includes('soundcloud.com') || url.includes('spotify.com') || url.includes('anchor.fm')) {
      return 'Audio Platforms';
    }
    if (url.includes('imgur.com') || url.includes('flickr.com') || url.includes('pinterest.com') || url.includes('unsplash.com')) {
      return 'Image Platforms';
    }
    return 'Mixed';
  }

  async processBulkUrls(urls) {
    console.log('📤 Submitting URLs through bulk import system...\n');
    
    // Group URLs by category for better processing
    const categories = {};
    urls.forEach(urlItem => {
      if (!categories[urlItem.category]) {
        categories[urlItem.category] = [];
      }
      categories[urlItem.category].push(urlItem);
    });

    // Process each category
    for (const [category, categoryUrls] of Object.entries(categories)) {
      console.log(`📂 Processing ${category} (${categoryUrls.length} URLs)...`);
      
      try {
        // Process URLs individually (matching the actual frontend implementation)
        const urlResults = [];
        const batchSize = 3; // Process 3 URLs at a time to avoid overwhelming the server
        
        for (let i = 0; i < categoryUrls.length; i += batchSize) {
          const batch = categoryUrls.slice(i, i + batchSize);
          
          const batchPromises = batch.map(async (urlItem) => {
            try {
              const response = await fetch(`${this.baseUrl}/content`, {
                method: 'POST',
                headers: this.testHeaders,
                body: JSON.stringify({
                  url: urlItem.url,
                  comments: `Integration test: ${category}`,
                  tags: ['integration-test', category.toLowerCase().replace(/\s+/g, '-')]
                })
              });
              
              if (response.ok) {
                const result = await response.json();
                return { success: true, url: urlItem.url, label: urlItem.label, data: result };
              } else {
                const errorResult = await response.json();
                return { success: false, url: urlItem.url, label: urlItem.label, error: errorResult.error || `HTTP ${response.status}` };
              }
            } catch (error) {
              return { success: false, url: urlItem.url, label: urlItem.label, error: error.message };
            }
          });
          
          const batchResults = await Promise.all(batchPromises);
          urlResults.push(...batchResults);
          
          // Wait between batches
          if (i + batchSize < categoryUrls.length) {
            await this.sleep(1000);
          }
        }
        
                 // Process results
         const successResults = urlResults.filter(r => r.success);
         const failedResults = urlResults.filter(r => !r.success);

         console.log(`✅ ${category}: ${successResults.length}/${categoryUrls.length} URLs submitted successfully`);
         this.summary.submitted += successResults.length;
         
         // Track submitted URLs for monitoring
         successResults.forEach(result => {
           this.processedUrls.push({
             id: result.data?.content?.id || result.data?.id,
             url: result.url,
             label: result.label,
             category,
             submittedAt: new Date(),
             status: 'submitted'
           });
         });
         
         // Track failed URLs
         failedResults.forEach(result => {
           this.failedUrls.push({
             category,
             url: result.url,
             label: result.label,
             error: result.error
           });
         });
         
         if (failedResults.length > 0) {
           console.log(`⚠️ ${category}: ${failedResults.length} URLs failed`);
         }
        
      } catch (error) {
        console.log(`❌ ${category}: ${error.message}`);
        categoryUrls.forEach(urlItem => {
          this.failedUrls.push({
            ...urlItem,
            error: error.message
          });
        });
      }
      
      // Wait between categories to avoid overwhelming the server
      await this.sleep(2000);
    }

    this.summary.failed = this.failedUrls.length;
    console.log(`\n📊 Submission Complete:
   ✅ Submitted: ${this.summary.submitted}
   ❌ Failed: ${this.summary.failed}
   📈 Success Rate: ${Math.round(this.summary.submitted / this.summary.total * 100)}%\n`);
  }

  async monitorProcessing() {
    if (this.processedUrls.length === 0) {
      console.log('⚠️ No URLs to monitor (none were successfully submitted)');
      return;
    }

    console.log('⏳ Monitoring processing status...\n');
    const startTime = Date.now();
    const maxWaitTime = 5 * 60 * 1000; // 5 minutes max
    let lastUpdate = 0;

    while (Date.now() - startTime < maxWaitTime) {
      let completed = 0;
      let processing = 0;
      let pending = 0;

      // Check status of each submitted URL
      for (const urlItem of this.processedUrls) {
        if (urlItem.status === 'completed') {
          completed++;
          continue;
        }

        try {
          // Check if content exists and has analysis
          const response = await fetch(`${this.baseUrl}/content/${urlItem.id}/analysis`, {
            headers: { 'Accept': 'application/json' }
          });

          if (response.ok) {
            const analysis = await response.json();
            
            if (analysis.success && analysis.status === 'completed') {
              urlItem.status = 'completed';
              urlItem.analysis = analysis;
              completed++;
            } else if (analysis.status === 'processing') {
              urlItem.status = 'processing';
              processing++;
            } else {
              pending++;
            }
          } else {
            pending++;
          }
        } catch (error) {
          // If we can't check, assume it's still pending
          pending++;
        }
      }

      this.summary.processed = completed;
      this.summary.analysisComplete = completed;

      // Update progress every 10 seconds
      if (Date.now() - lastUpdate > 10000) {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(`⏳ Progress (${elapsed}s): ✅ ${completed} completed, 🔄 ${processing} processing, ⏸️ ${pending} pending`);
        lastUpdate = Date.now();
      }

      // If all are completed, break
      if (completed === this.processedUrls.length) {
        console.log('🎉 All URLs have completed processing!\n');
        break;
      }

      // Wait before next check
      await this.sleep(5000);
    }

    if (Date.now() - startTime >= maxWaitTime) {
      console.log('⏰ Monitoring timeout reached (5 minutes)\n');
    }
  }

  generateReport() {
    console.log('='.repeat(80));
    console.log('📊 BULK URL INTEGRATION TEST REPORT');
    console.log('='.repeat(80));

    // Overall Summary
    console.log(`\n📈 OVERALL SUMMARY:`);
    console.log(`   📊 Total URLs: ${this.summary.total}`);
    console.log(`   ✅ Successfully Submitted: ${this.summary.submitted} (${Math.round(this.summary.submitted/this.summary.total*100)}%)`);
    console.log(`   🔄 Processed: ${this.summary.processed} (${Math.round(this.summary.processed/this.summary.submitted*100)}%)`);
    console.log(`   ❌ Failed Submission: ${this.summary.failed} (${Math.round(this.summary.failed/this.summary.total*100)}%)`);

    // Analysis Quality Report
    const analysisStats = this.analyzeResults();
    if (analysisStats.total > 0) {
      console.log(`\n🧠 AI ANALYSIS QUALITY:`);
      console.log(`   📝 Has Description/Transcription: ${analysisStats.hasContent} (${Math.round(analysisStats.hasContent/analysisStats.total*100)}%)`);
      console.log(`   🎯 Has AI Title: ${analysisStats.hasTitle} (${Math.round(analysisStats.hasTitle/analysisStats.total*100)}%)`);
      console.log(`   🏷️ Has Auto Tags: ${analysisStats.hasTags} (${Math.round(analysisStats.hasTags/analysisStats.total*100)}%)`);
      console.log(`   🖼️ Has Thumbnails: ${analysisStats.hasThumbnails} (${Math.round(analysisStats.hasThumbnails/analysisStats.total*100)}%)`);
    }

    // Category Breakdown
    const categoryStats = this.getCategoryStats();
    console.log(`\n📂 CATEGORY BREAKDOWN:`);
    Object.entries(categoryStats).forEach(([category, stats]) => {
      console.log(`   ${category}: ${stats.submitted}/${stats.total} submitted (${Math.round(stats.submitted/stats.total*100)}%)`);
      if (stats.processed > 0) {
        console.log(`      🔄 ${stats.processed} processed with AI analysis`);
      }
    });

    // Failed URLs
    if (this.failedUrls.length > 0) {
      console.log(`\n❌ FAILED URLS (${this.failedUrls.length}):`);
      this.failedUrls.slice(0, 10).forEach(item => {
        console.log(`   • ${item.label || item.url}: ${item.error}`);
      });
      if (this.failedUrls.length > 10) {
        console.log(`   ... and ${this.failedUrls.length - 10} more`);
      }
    }

    // Success Examples
    const successfulItems = this.processedUrls.filter(item => item.status === 'completed' && item.analysis);
    if (successfulItems.length > 0) {
      console.log(`\n✅ SUCCESSFUL PROCESSING EXAMPLES:`);
      successfulItems.slice(0, 5).forEach(item => {
        const analysis = item.analysis.analysis || {};
        console.log(`   🎯 ${item.category}: ${analysis.title || item.label || 'Untitled'}`);
        if (analysis.description) {
          console.log(`      📝 ${analysis.description.substring(0, 100)}...`);
        }
        if (analysis.auto_tags && analysis.auto_tags.length > 0) {
          console.log(`      🏷️ Tags: ${analysis.auto_tags.slice(0, 5).join(', ')}`);
        }
      });
    }

    // Performance Metrics
    console.log(`\n⚡ PERFORMANCE METRICS:`);
    console.log(`   🕐 Test Duration: ${Math.round((Date.now() - this.startTime) / 1000)}s`);
    console.log(`   📊 Processing Rate: ${Math.round(this.summary.processed / ((Date.now() - this.startTime) / 60000))} URLs/minute`);

    console.log(`\n🕐 Completed at: ${new Date().toISOString()}`);
    console.log('='.repeat(80));

    // Set exit code
    const successRate = this.summary.submitted / this.summary.total;
    const processingRate = this.summary.processed / (this.summary.submitted || 1);

    if (successRate >= 0.8 && processingRate >= 0.8) {
      console.log('\n🎉 Integration test PASSED - System is working well!');
      process.exit(0);
    } else if (successRate >= 0.6 || processingRate >= 0.6) {
      console.log('\n⚠️ Integration test completed with warnings - Some issues detected');
      process.exit(0);
    } else {
      console.log('\n💥 Integration test FAILED - Significant issues detected');
      process.exit(1);
    }
  }

  analyzeResults() {
    const completed = this.processedUrls.filter(item => item.status === 'completed' && item.analysis);
    const stats = {
      total: completed.length,
      hasContent: 0,
      hasTitle: 0,
      hasTags: 0,
      hasThumbnails: 0
    };

    completed.forEach(item => {
      const analysis = item.analysis.analysis || {};
      
      if (analysis.description || analysis.transcription) {
        stats.hasContent++;
      }
      
      if (analysis.title && analysis.title !== item.filename) {
        stats.hasTitle++;
      }
      
      if (analysis.auto_tags && analysis.auto_tags.length > 0) {
        stats.hasTags++;
      }
      
      if (item.analysis.thumbnails && item.analysis.thumbnails.length > 0) {
        stats.hasThumbnails++;
      }
    });

    return stats;
  }

  getCategoryStats() {
    const stats = {};
    
    // Initialize with all categories
    [...this.processedUrls, ...this.failedUrls].forEach(item => {
      if (!stats[item.category]) {
        stats[item.category] = { total: 0, submitted: 0, processed: 0 };
      }
      stats[item.category].total++;
    });

    // Count submitted
    this.processedUrls.forEach(item => {
      stats[item.category].submitted++;
      if (item.status === 'completed') {
        stats[item.category].processed++;
      }
    });

    return stats;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
if (require.main === module) {
  const test = new BulkUrlIntegrationTest();
  test.startTime = Date.now();
  test.run().catch(error => {
    console.error('💥 Integration test crashed:', error);
    process.exit(1);
  });
}

module.exports = BulkUrlIntegrationTest; 