#!/usr/bin/env node

/**
 * Check for incomplete content items (missing thumbnails, analysis, etc.)
 */

const db = require('../models');
const { Content, File, Thumbnail, ProcessingJob } = db;

async function checkIncompleteContent() {
  try {
    console.log('🔍 Checking for incomplete content items...\n');
    
    // Find recent content items with their thumbnails and processing jobs
    const recentContent = await Content.findAll({
      include: [
        {
          model: Thumbnail,
          as: 'thumbnails',
          required: false
        },
        {
          model: ProcessingJob,
          as: 'processingJobs',
          required: false,
          limit: 1,
          order: [['createdAt', 'DESC']]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 15
    });
    
    console.log(`📊 Found ${recentContent.length} recent content items:\n`);
    
    let incompleteCount = 0;
    
    recentContent.forEach((item, index) => {
      const hasThumbnails = item.thumbnails && item.thumbnails.length > 0;
      const hasTranscription = item.transcription && item.transcription.length > 0;
      const hasSummary = item.summary && item.summary.length > 0;
      const latestJob = item.processingJobs && item.processingJobs[0];
      
      const isIncomplete = !hasThumbnails || !hasTranscription || !hasSummary;
      if (isIncomplete) incompleteCount++;
      
      console.log(`${index + 1}. ${isIncomplete ? '❌' : '✅'} ${item.url}`);
      console.log(`   Created: ${item.createdAt.toISOString()}`);
      console.log(`   Thumbnails: ${hasThumbnails ? `${item.thumbnails.length} found` : 'None'}`);
      console.log(`   Summary: ${hasSummary ? 'Yes' : 'No'}`);
      console.log(`   Transcription: ${hasTranscription ? 'Yes' : 'No'}`);
      
      if (latestJob) {
        console.log(`   Latest Job: ${latestJob.status} (${latestJob.progress || 0}%)`);
        if (latestJob.error_message) {
          console.log(`   Error: ${latestJob.error_message}`);
        }
      }
      
      console.log('');
    });
    
    console.log(`📋 Summary: ${incompleteCount} incomplete items out of ${recentContent.length}\n`);
    
    // Show the most recent incomplete item details
    const incompleteItems = recentContent.filter(item => {
      const hasThumbnails = item.thumbnails && item.thumbnails.length > 0;
      const hasTranscription = item.transcription && item.transcription.length > 0;
      const hasSummary = item.summary && item.summary.length > 0;
      return !hasThumbnails || !hasTranscription || !hasSummary;
    });
    
    if (incompleteItems.length > 0) {
      const mostRecentIncomplete = incompleteItems[0];
      console.log('🎯 Most recent incomplete item:');
      console.log(`   URL: ${mostRecentIncomplete.url}`);
      console.log(`   ID: ${mostRecentIncomplete.id}`);
      console.log(`   Created: ${mostRecentIncomplete.createdAt.toISOString()}`);
      console.log(`   User ID: ${mostRecentIncomplete.user_id}`);
      
      // Check for related processing jobs
      const jobs = await ProcessingJob.findAll({
        where: { content_id: mostRecentIncomplete.id },
        order: [['createdAt', 'DESC']],
        limit: 3
      });
      
      if (jobs.length > 0) {
        console.log(`\n   Processing Jobs:`);
        jobs.forEach((job, i) => {
          console.log(`     ${i + 1}. ${job.status} - ${job.progress || 0}% (${job.createdAt.toISOString()})`);
          if (job.error_message) {
            console.log(`        Error: ${job.error_message}`);
          }
        });
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking incomplete content:', error.message);
    process.exit(1);
  }
}

checkIncompleteContent(); 