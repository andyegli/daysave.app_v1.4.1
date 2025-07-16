#!/usr/bin/env node

/**
 * Facebook Automation Checker
 * Checks for Facebook URLs that haven't been processed and diagnoses automation issues
 */

require('dotenv').config();
const { Content, User } = require('../models');
const { MultimediaAnalyzer } = require('../services/multimedia');
const { Op } = require('sequelize');

async function checkFacebookAutomation() {
  console.log('🔍 Checking Facebook URL automation status...\n');
  
  try {
    // Find recent Facebook content (last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const facebookContent = await Content.findAll({
      where: {
        url: {
          [Op.or]: [
            { [Op.like]: '%facebook.com%' },
            { [Op.like]: '%fb.com%' }
          ]
        },
        createdAt: {
          [Op.gte]: oneWeekAgo
        }
      },
      include: [{
        model: User,
        attributes: ['id', 'username', 'email']
      }],
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`📊 Found ${facebookContent.length} Facebook URLs from the last 7 days\n`);
    
    if (facebookContent.length === 0) {
      console.log('✅ No recent Facebook content found');
      return;
    }
    
    // Check each Facebook URL
    let processedCount = 0;
    let needsProcessing = 0;
    let automationWorking = 0;
    
    for (const content of facebookContent) {
      processedCount++;
      
      console.log(`\n🔄 Checking ${processedCount}/${facebookContent.length}:`);
      console.log(`   URL: ${content.url}`);
      console.log(`   User: ${content.User.username} (${content.User.email})`);
      console.log(`   Created: ${content.createdAt.toISOString()}`);
      
      // Check if content has been processed
      const hasTranscription = content.transcription && content.transcription.length > 50;
      const hasSummary = content.summary && content.summary.length > 10;
      const hasSentiment = content.sentiment;
      const hasAutoTags = content.auto_tags && content.auto_tags.length > 0;
      
      console.log(`   📝 Transcription: ${hasTranscription ? '✅ Yes (' + content.transcription.length + ' chars)' : '❌ No'}`);
      console.log(`   📄 Summary: ${hasSummary ? '✅ Yes (' + content.summary.length + ' chars)' : '❌ No'}`);
      console.log(`   🎭 Sentiment: ${hasSentiment ? '✅ Yes (' + (content.sentiment.label || 'unknown') + ')' : '❌ No'}`);
      console.log(`   🏷️  Auto Tags: ${hasAutoTags ? '✅ Yes (' + content.auto_tags.length + ' tags)' : '❌ No'}`);
      
      const isProcessed = hasTranscription || hasSummary || hasSentiment || hasAutoTags;
      
      if (isProcessed) {
        console.log(`   ✅ Status: PROCESSED (automation working)`);
        automationWorking++;
      } else {
        console.log(`   ❌ Status: NOT PROCESSED (automation failed)`);
        needsProcessing++;
      }
    }
    
    console.log(`\n📊 Facebook Automation Summary:`);
    console.log(`   Total Facebook URLs: ${processedCount}`);
    console.log(`   Automation working: ${automationWorking}`);
    console.log(`   Needs processing: ${needsProcessing}`);
    console.log(`   Success rate: ${Math.round((automationWorking / processedCount) * 100)}%`);
    
    if (needsProcessing > 0) {
      console.log(`\n⚠️  Facebook automation issues detected!`);
      console.log(`   ${needsProcessing} URLs need processing`);
      
      // Check if multimedia analyzer can handle Facebook URLs
      console.log(`\n🔧 Testing Facebook URL detection...`);
      const multimediaAnalyzer = new MultimediaAnalyzer();
      
      const testUrls = [
        'https://www.facebook.com/watch/?v=123456789',
        'https://www.facebook.com/share/v/123456789/',
        'https://www.facebook.com/share/p/123456789/',
        'https://facebook.com/watch?v=123456789'
      ];
      
      for (const testUrl of testUrls) {
        const isMultimedia = multimediaAnalyzer.isMultimediaUrl(testUrl);
        const platform = multimediaAnalyzer.detectPlatform(testUrl);
        console.log(`   ${testUrl}`);
        console.log(`     Multimedia: ${isMultimedia ? '✅' : '❌'}`);
        console.log(`     Platform: ${platform}`);
      }
      
      // Offer to reprocess failed Facebook URLs
      console.log(`\n🛠️  Would you like to reprocess the failed Facebook URLs? (y/n)`);
      
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.question('Reprocess failed Facebook URLs? (y/n): ', async (answer) => {
        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
          await reprocessFailedFacebookContent(facebookContent.filter(c => {
            const hasTranscription = c.transcription && c.transcription.length > 50;
            const hasSummary = c.summary && c.summary.length > 10;
            const hasSentiment = c.sentiment;
            const hasAutoTags = c.auto_tags && c.auto_tags.length > 0;
            return !(hasTranscription || hasSummary || hasSentiment || hasAutoTags);
          }));
        }
        rl.close();
      });
    } else {
      console.log(`\n✅ Facebook automation is working correctly!`);
    }
    
  } catch (error) {
    console.error('❌ Error checking Facebook automation:', error);
  }
}

async function reprocessFailedFacebookContent(failedContent) {
  console.log(`\n🔄 Reprocessing ${failedContent.length} failed Facebook URLs...\n`);
  
  const multimediaAnalyzer = new MultimediaAnalyzer({
    enableLogging: true
  });
  
  let successCount = 0;
  let failureCount = 0;
  
  for (const content of failedContent) {
    console.log(`\n🎬 Reprocessing: ${content.url}`);
    
    try {
      const analysisResults = await multimediaAnalyzer.analyzeContent(content.url, {
        user_id: content.User.id,
        content_id: content.id,
        transcription: true,
        sentiment: true,
        thumbnails: true,
        ocr: true,
        speaker_identification: true,
        enableSummarization: true
      });
      
      // Update the content record
      const updateData = {};
      
      if (analysisResults.transcription && analysisResults.transcription.length > 0) {
        updateData.transcription = analysisResults.transcription;
      }
      
      if (analysisResults.summary && analysisResults.summary.length > 0) {
        updateData.summary = analysisResults.summary;
      }
      
      if (analysisResults.sentiment) {
        updateData.sentiment = analysisResults.sentiment;
      }
      
      if (analysisResults.auto_tags && analysisResults.auto_tags.length > 0) {
        updateData.auto_tags = analysisResults.auto_tags;
      }
      
      if (analysisResults.category) {
        updateData.category = analysisResults.category;
      }
      
      if (analysisResults.metadata) {
        updateData.metadata = {
          ...(content.metadata || {}),
          ...analysisResults.metadata
        };
      }
      
      // Update the content record
      if (Object.keys(updateData).length > 0) {
        await Content.update(updateData, {
          where: { id: content.id }
        });
        
        console.log(`   ✅ Updated with:`, Object.keys(updateData));
        successCount++;
      } else {
        console.log(`   ⚠️ No updates - analysis may have failed`);
        failureCount++;
      }
      
    } catch (error) {
      console.error(`   ❌ Error processing ${content.url}:`, error.message);
      failureCount++;
    }
    
    // Small delay to avoid overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`\n📊 Reprocessing Results:`);
  console.log(`   Successful: ${successCount}`);
  console.log(`   Failed: ${failureCount}`);
  console.log(`   Success rate: ${Math.round((successCount / (successCount + failureCount)) * 100)}%`);
}

// Check Facebook URL patterns and add any missing ones
function checkFacebookPatterns() {
  console.log('\n🔍 Checking Facebook URL patterns...\n');
  
  const currentPatterns = [
    /facebook\.com\/watch/i,
    /facebook\.com\/share\/v\//i,
    /facebook\.com\/share\/p\//i,
    /facebook\.com\/video\//i,
    /facebook\.com\/.*\/videos\//i,
    /facebook\.com\/.*\/posts\//i,
    /fb\.com\//i
  ];
  
  const testUrls = [
    'https://www.facebook.com/watch/?v=123456789',
    'https://www.facebook.com/share/v/123456789/',
    'https://www.facebook.com/share/p/123456789/',
    'https://www.facebook.com/username/videos/123456789/',
    'https://www.facebook.com/username/posts/123456789/',
    'https://www.facebook.com/video/123456789/',
    'https://fb.com/watch/?v=123456789',
    'https://m.facebook.com/watch/?v=123456789'
  ];
  
  console.log('Facebook URL Pattern Test Results:');
  for (const url of testUrls) {
    const matches = currentPatterns.some(pattern => pattern.test(url));
    console.log(`   ${matches ? '✅' : '❌'} ${url}`);
  }
  
  // Check for missing patterns
  const missingPatterns = [
    /m\.facebook\.com\/watch/i,     // Mobile Facebook
    /facebook\.com\/video\//i,      // Direct video links
    /facebook\.com\/.*\/videos\//i, // User/page videos
    /facebook\.com\/.*\/posts\//i,  // User/page posts
  ];
  
  console.log('\nMissing Pattern Suggestions:');
  missingPatterns.forEach(pattern => {
    console.log(`   Suggestion: ${pattern.toString()}`);
  });
}

// Main execution
async function main() {
  console.log('🔧 Facebook URL Automation Diagnostic Tool\n');
  
  // Check patterns first
  checkFacebookPatterns();
  
  // Then check actual content
  await checkFacebookAutomation();
}

// Run the diagnostic
main().catch(console.error); 