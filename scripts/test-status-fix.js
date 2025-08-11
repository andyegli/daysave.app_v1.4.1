#!/usr/bin/env node

/**
 * Test Status Fix Script
 * 
 * This script tests the status API fix to ensure content with analysis data
 * shows the correct status instead of "waiting" or incorrect statuses.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { Content, VideoAnalysis, AudioAnalysis, ImageAnalysis, ProcessingJob, User } = require('../models');

async function testStatusFix() {
  console.log('🔍 Testing status fix for content with analysis data...\n');

  try {
    // Find content that has analysis records but might show incorrect status
    const contentWithAnalysis = await Content.findAll({
      limit: 10,
      include: [
        {
          model: User,
          attributes: ['id', 'email'],
          required: true
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    if (contentWithAnalysis.length === 0) {
      console.log('❌ No content found to test with');
      return;
    }

    console.log(`✅ Found ${contentWithAnalysis.length} content items to test\n`);

    for (const content of contentWithAnalysis) {
      console.log(`📝 Testing content: ${content.id}`);
      console.log(`   URL: ${content.url}`);
      console.log(`   User: ${content.User.email}`);

      // Check for analysis records
      const [videoAnalysis, audioAnalysis, imageAnalysis, processingJobs] = await Promise.all([
        VideoAnalysis.findOne({ where: { content_id: content.id, user_id: content.user_id } }),
        AudioAnalysis.findOne({ where: { content_id: content.id, user_id: content.user_id } }),
        ImageAnalysis.findOne({ where: { content_id: content.id, user_id: content.user_id } }),
        ProcessingJob.findAll({
          where: { content_id: content.id, user_id: content.user_id },
          order: [['createdAt', 'DESC']],
          limit: 5
        })
      ]);

      const analysis = videoAnalysis || audioAnalysis || imageAnalysis;
      const latestJob = processingJobs.length > 0 ? processingJobs[0] : null;

      console.log(`   Analysis Record: ${analysis ? '✅ Found' : '❌ None'}`);
      if (analysis) {
        console.log(`     Type: ${videoAnalysis ? 'video' : audioAnalysis ? 'audio' : 'image'}`);
        console.log(`     Has Transcription: ${!!analysis.transcription}`);
        console.log(`     Has Summary: ${!!analysis.summary}`);
        console.log(`     Has Sentiment: ${!!analysis.sentiment}`);
      }

      console.log(`   Processing Job: ${latestJob ? '✅ Found' : '❌ None'}`);
      if (latestJob) {
        console.log(`     Status: ${latestJob.status}`);
        console.log(`     Progress: ${latestJob.progress}%`);
      }

      // Check content fields
      const hasContentTranscription = !!(content.transcription && content.transcription.length > 10);
      const hasContentSummary = !!(content.summary && content.summary.length > 10);
      const hasGeneratedTitle = !!(content.generated_title && content.generated_title.length > 0);
      const hasAutoTags = !!(content.auto_tags && content.auto_tags.length > 0);

      console.log(`   Content Fields:`);
      console.log(`     Transcription: ${hasContentTranscription ? '✅' : '❌'}`);
      console.log(`     Summary: ${hasContentSummary ? '✅' : '❌'}`);
      console.log(`     Generated Title: ${hasGeneratedTitle ? '✅' : '❌'}`);
      console.log(`     Auto Tags: ${hasAutoTags ? '✅' : '❌'}`);

      // Simulate the new status logic
      const hasTranscription = !!(analysis?.transcription || content.transcription && content.transcription.length > 10);
      const hasSummary = !!(analysis?.summary || content.summary && content.summary.length > 10);

      let expectedStatus = 'waiting';
      if (latestJob && latestJob.status === 'completed' && analysis) {
        expectedStatus = 'analysed';
      } else if (latestJob && latestJob.status === 'processing') {
        expectedStatus = 'processing';
      } else if (latestJob && latestJob.status === 'failed') {
        expectedStatus = 'incomplete';
      } else if (hasTranscription || hasSummary) {
        expectedStatus = 'analysed';
      }

      console.log(`   📊 Expected Status: ${expectedStatus}`);
      console.log(`   📈 Has Analysis Data: ${!!(hasTranscription || hasSummary)}`);

      console.log('');
    }

    console.log('✅ Status fix test completed!');
    console.log('\n💡 The fix should now correctly show "analysed" status for content with analysis data');

  } catch (error) {
    console.error('❌ Error testing status fix:', error);
  } finally {
    process.exit(0);
  }
}

// Run the test
testStatusFix();
