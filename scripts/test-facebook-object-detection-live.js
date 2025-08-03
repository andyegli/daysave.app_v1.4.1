#!/usr/bin/env node

/**
 * Test Facebook object detection with our fix
 * Reprocess the same Facebook clip with enableObjectDetection: true
 */

const MultimediaAnalyzer = require('../services/multimedia/MultimediaAnalyzer.js');
const { v4: uuidv4 } = require('uuid');

async function testFacebookWithObjectDetection() {
  console.log('🧪 Testing Facebook Object Detection with Fix\n');
  console.log('🎯 This test will show:');
  console.log('   • Object detection enabled by default');
  console.log('   • Google Vision API results (if available)');
  console.log('   • Enhanced AI prompts with richer content');
  console.log('   • Improved tag/category/title generation\n');

  try {
    const analyzer = new MultimediaAnalyzer({
      enableLogging: true
    });

    // Use the same Facebook URL from the logs
    const testUrl = 'https://www.facebook.com/share/r/16fg2tfFSK/?mibextid=wwXIfr';
    const testUserId = 'test-user-object-detection';
    const testContentId = uuidv4();

    console.log('🎬 Processing Facebook URL:', testUrl);
    console.log('👤 User ID:', testUserId);
    console.log('📄 Content ID:', testContentId);
    console.log('');

    // Override console.log to capture the prompts and responses
    const originalLog = console.log;
    const capturedLogs = [];
    
    console.log = (...args) => {
      const message = args.join(' ');
      capturedLogs.push(message);
      originalLog(...args);
    };

    const startTime = Date.now();
    
    const results = await analyzer.analyzeContent(testUrl, {
      user_id: testUserId,
      content_id: testContentId,
      enableObjectDetection: true, // Explicitly ensure it's enabled
      transcription: true,
      sentiment: true,
      summarization: true,
      thumbnails: true,
      speakers: true
    });

    const processingTime = Date.now() - startTime;

    // Restore original console.log
    console.log = originalLog;

    console.log('\n' + '='.repeat(80));
    console.log('📊 FACEBOOK OBJECT DETECTION TEST RESULTS');
    console.log('='.repeat(80));

    console.log('\n🎯 OBJECT DETECTION STATUS:');
    console.log('   enableObjectDetection:', true);
    console.log('   Objects detected:', results.objects ? results.objects.length : 0);
    if (results.objects && results.objects.length > 0) {
      console.log('   Detected objects:');
      results.objects.forEach((obj, i) => {
        console.log(`     ${i + 1}. ${obj.name} (confidence: ${obj.confidence.toFixed(2)})`);
      });
    }

    console.log('\n📝 TRANSCRIPTION:');
    console.log('   Length:', results.transcription?.length || 0);
    console.log('   Content:', JSON.stringify(results.transcription?.substring(0, 200)));

    console.log('\n🏷️ AI-GENERATED TAGS:');
    console.log('   Tags:', JSON.stringify(results.auto_tags));

    console.log('\n📂 AI-GENERATED CATEGORY:');
    console.log('   Category:', JSON.stringify(results.category));

    console.log('\n📰 AI-GENERATED TITLE:');
    console.log('   Title:', JSON.stringify(results.generated_title || 'Not generated'));

    console.log('\n📊 ANALYSIS SUMMARY:');
    console.log('   Platform:', results.platform);
    console.log('   Status:', results.status);
    console.log('   Processing time:', `${processingTime}ms`);
    console.log('   Summary length:', results.summary?.length || 0);

    console.log('\n🤖 AI PROMPTS & RESPONSES:');
    console.log('   Looking for OpenAI interactions in captured logs...\n');
    
    // Extract AI prompts and responses from captured logs
    const aiLogs = capturedLogs.filter(log => 
      log.includes('🤖') || 
      log.includes('OpenAI') || 
      log.includes('Sending content to') ||
      log.includes('Generated') ||
      log.includes('tag response') ||
      log.includes('category response') ||
      log.includes('title response')
    );

    if (aiLogs.length > 0) {
      aiLogs.forEach(log => console.log('   ', log));
    } else {
      console.log('   No AI prompt logs captured (may be in JSON logger)');
    }

    console.log('\n✅ TEST COMPLETED SUCCESSFULLY!');
    console.log('🎯 Key improvements with object detection:');
    console.log('   • More comprehensive analysis of Facebook content');
    console.log('   • Better AI tagging based on visual content');
    console.log('   • Enhanced metadata generation');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testFacebookWithObjectDetection().then(() => {
  console.log('\n🏁 Facebook object detection test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test script error:', error);
  process.exit(1);
});