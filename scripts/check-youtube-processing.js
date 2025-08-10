#!/usr/bin/env node

/**
 * Check Processing Status for YouTube URL
 * 
 * This script checks the processing status, jobs, and potential errors
 * for the specific YouTube URL that failed to complete processing.
 */

const { Content, ProcessingJob, VideoAnalysis, AudioAnalysis } = require('../models');

async function checkYouTubeProcessing() {
  try {
    console.log('🔍 Checking processing status for YouTube URL: YUztzjKv-Z0');
    
    const targetUrl = 'https://www.youtube.com/watch?v=YUztzjKv-Z0&t=16s';
    const videoId = 'YUztzjKv-Z0';
    
    console.log('\n📝 Searching for content records...');
    
    // Find content records for this URL (check variations)
    const contentRecords = await Content.findAll({
      where: {
        url: {
          [require('sequelize').Op.like]: `%${videoId}%`
        }
      },
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    
    console.log(`   Found ${contentRecords.length} content record(s)`);
    
    if (contentRecords.length === 0) {
      console.log('❌ No content records found for this YouTube URL');
      return;
    }
    
    // Check each content record
    for (const content of contentRecords) {
      console.log(`\n🎬 Content Record: ${content.id}`);
      console.log(`   URL: ${content.url}`);
      console.log(`   Created: ${content.createdAt}`);
      console.log(`   Title: ${content.title || content.generated_title || 'No title'}`);
      console.log(`   Summary: ${content.summary ? 'Present' : 'Missing'}`);
      console.log(`   Auto Tags: ${content.auto_tags ? content.auto_tags.length : 0} tags`);
      
      // Check processing jobs
      console.log('\n📊 Processing Jobs:');
      const jobs = await ProcessingJob.findAll({
        where: { content_id: content.id },
        order: [['createdAt', 'DESC']],
        limit: 3
      });
      
      if (jobs.length === 0) {
        console.log('   ❌ No processing jobs found');
      } else {
        for (const job of jobs) {
          console.log(`   Job ${job.id}:`);
          console.log(`     Status: ${job.status}`);
          console.log(`     Progress: ${job.progress}%`);
          console.log(`     Current Stage: ${job.current_stage || 'Unknown'}`);
          console.log(`     Job Type: ${job.job_type}`);
          console.log(`     Started: ${job.started_at}`);
          console.log(`     Duration: ${job.duration_ms ? job.duration_ms + 'ms' : 'Unknown'}`);
          
          if (job.error_details) {
            console.log(`     ❌ Error: ${JSON.stringify(job.error_details, null, 2)}`);
          }
          
          if (job.metadata) {
            console.log(`     📋 Metadata: ${JSON.stringify(job.metadata, null, 2)}`);
          }
        }
      }
      
      // Check video analysis
      console.log('\n🎥 Video Analysis:');
      const videoAnalysis = await VideoAnalysis.findOne({
        where: { content_id: content.id },
        order: [['createdAt', 'DESC']]
      });
      
      if (!videoAnalysis) {
        console.log('   ❌ No video analysis record found');
      } else {
        console.log(`   Status: ${videoAnalysis.status}`);
        console.log(`   Progress: ${videoAnalysis.progress}%`);
        console.log(`   Duration: ${videoAnalysis.duration || 'Unknown'}`);
        console.log(`   Quality: ${videoAnalysis.quality_assessment || 'Unknown'}`);
        
        if (videoAnalysis.error_message) {
          console.log(`   ❌ Error: ${videoAnalysis.error_message}`);
        }
        
        if (videoAnalysis.started_at) {
          console.log(`   Started: ${videoAnalysis.started_at}`);
        }
        
        if (videoAnalysis.completed_at) {
          console.log(`   Completed: ${videoAnalysis.completed_at}`);
        }
      }
      
      // Check audio analysis
      console.log('\n🎵 Audio Analysis:');
      const audioAnalysis = await AudioAnalysis.findOne({
        where: { content_id: content.id },
        order: [['createdAt', 'DESC']]
      });
      
      if (!audioAnalysis) {
        console.log('   ❌ No audio analysis record found');
      } else {
        console.log(`   Status: ${audioAnalysis.status}`);
        console.log(`   Progress: ${audioAnalysis.progress}%`);
        console.log(`   Duration: ${audioAnalysis.duration || 'Unknown'}`);
        
        if (audioAnalysis.error_message) {
          console.log(`   ❌ Error: ${audioAnalysis.error_message}`);
        }
      }
    }
    
    // Check for any recent failed jobs
    console.log('\n🔍 Checking recent failed jobs...');
    const recentFailedJobs = await ProcessingJob.findAll({
      where: {
        status: 'failed',
        createdAt: {
          [require('sequelize').Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    
    console.log(`   Found ${recentFailedJobs.length} failed job(s) in last 24 hours`);
    
    for (const job of recentFailedJobs) {
      console.log(`   Failed Job ${job.id}:`);
      console.log(`     Content ID: ${job.content_id}`);
      console.log(`     Job Type: ${job.job_type}`);
      console.log(`     Current Stage: ${job.current_stage}`);
      console.log(`     Failed At: ${job.createdAt}`);
      
      if (job.error_details) {
        console.log(`     Error Details: ${JSON.stringify(job.error_details, null, 2)}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking YouTube processing:', error);
  }
}

// Run the check
checkYouTubeProcessing()
  .then(() => {
    console.log('\n✅ Processing check complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
