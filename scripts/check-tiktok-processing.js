#!/usr/bin/env node

/**
 * Check Processing Status for TikTok URL
 * 
 * This script checks the processing status, jobs, and potential errors
 * for the specific TikTok URL that failed to complete processing.
 */

require('dotenv').config();
const { Content, ProcessingJob, VideoAnalysis, AudioAnalysis, User } = require('../models');

async function checkTikTokProcessing() {
  try {
    console.log('🔍 Checking processing status for TikTok URL: 7536021420929797384');
    
    const targetUrl = 'https://www.tiktok.com/@masterchefau/video/7536021420929797384';
    const videoId = '7536021420929797384';
    
    console.log('\n📝 Searching for content records...');
    
    // Find content records for this URL (check variations)
    const contentRecords = await Content.findAll({
      where: {
        url: {
          [require('sequelize').Op.like]: `%${videoId}%`
        }
      },
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'email']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    
    console.log(`   Found ${contentRecords.length} content record(s)`);
    
    if (contentRecords.length === 0) {
      console.log('❌ No content records found for this TikTok URL');
      
      // Also search by exact URL
      const exactUrlRecords = await Content.findAll({
        where: {
          url: targetUrl
        },
        include: [
          {
            model: User,
            attributes: ['id', 'username', 'email']
          }
        ],
        order: [['createdAt', 'DESC']]
      });
      
      if (exactUrlRecords.length > 0) {
        console.log(`✅ Found ${exactUrlRecords.length} records with exact URL match`);
        contentRecords.push(...exactUrlRecords);
      } else {
        console.log('❌ No exact URL matches either');
        
        // Check for any TikTok content recently
        console.log('\n🔍 Checking for recent TikTok content...');
        const recentTikTokContent = await Content.findAll({
          where: {
            url: {
              [require('sequelize').Op.like]: '%tiktok.com%'
            }
          },
          include: [
            {
              model: User,
              attributes: ['id', 'username', 'email']
            }
          ],
          order: [['createdAt', 'DESC']],
          limit: 10
        });
        
        console.log(`   Found ${recentTikTokContent.length} recent TikTok content records`);
        if (recentTikTokContent.length > 0) {
          recentTikTokContent.forEach((content, i) => {
            console.log(`   ${i+1}. ${content.url} (${content.createdAt.toISOString()})`);
          });
        }
        
        return;
      }
    }
    
    // Check each content record
    for (const content of contentRecords) {
      console.log(`\n🎬 Content Record: ${content.id}`);
      console.log(`   URL: ${content.url}`);
      console.log(`   User: ${content.User ? content.User.username : 'Unknown'}`);
      console.log(`   Created: ${content.createdAt}`);
      console.log(`   Updated: ${content.updatedAt}`);
      console.log(`   Title: ${content.title || content.generated_title || 'No title'}`);
      console.log(`   Summary: ${content.summary ? 'Present (' + content.summary.length + ' chars)' : 'Missing'}`);
      console.log(`   Auto Tags: ${content.auto_tags ? content.auto_tags.length : 0} tags`);
      console.log(`   Content Type: ${content.content_type || 'Unknown'}`);
      console.log(`   Transcription: ${content.transcription ? 'Present (' + content.transcription.length + ' chars)' : 'Missing'}`);
      
      // Check processing jobs
      console.log('\n📊 Processing Jobs:');
      const jobs = await ProcessingJob.findAll({
        where: { content_id: content.id },
        order: [['createdAt', 'DESC']],
        limit: 5
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
          console.log(`     Media Type: ${job.media_type}`);
          console.log(`     Started: ${job.started_at || 'Not started'}`);
          console.log(`     Completed: ${job.completed_at || 'Not completed'}`);
          console.log(`     Duration: ${job.duration_ms ? job.duration_ms + 'ms' : 'Unknown'}`);
          
          if (job.error_details) {
            console.log(`     ❌ Error Details: ${JSON.stringify(job.error_details, null, 2)}`);
          }
          
          if (job.error_message) {
            console.log(`     ❌ Error Message: ${job.error_message}`);
          }
          
          if (job.metadata) {
            console.log(`     📋 Metadata: ${JSON.stringify(job.metadata, null, 2)}`);
          }
          
          if (job.input_metadata) {
            console.log(`     📥 Input Metadata: ${JSON.stringify(job.input_metadata, null, 2)}`);
          }
          
          if (job.job_config) {
            console.log(`     ⚙️ Job Config: ${JSON.stringify(job.job_config, null, 2)}`);
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
        console.log('   ❌ No video analysis found');
      } else {
        console.log(`   ✅ Video Analysis found:`);
        console.log(`     ID: ${videoAnalysis.id}`);
        console.log(`     Duration: ${videoAnalysis.duration || 'Unknown'}`);
        console.log(`     Resolution: ${videoAnalysis.resolution || 'Unknown'}`);
        console.log(`     File Size: ${videoAnalysis.file_size || 'Unknown'}`);
        console.log(`     Format: ${videoAnalysis.format || 'Unknown'}`);
        console.log(`     Quality Score: ${videoAnalysis.quality_score || 'Unknown'}`);
        console.log(`     Audio Present: ${videoAnalysis.has_audio !== null ? videoAnalysis.has_audio : 'Unknown'}`);
      }
      
      // Check audio analysis
      console.log('\n🎵 Audio Analysis:');
      const audioAnalysis = await AudioAnalysis.findOne({
        where: { content_id: content.id },
        order: [['createdAt', 'DESC']]
      });
      
      if (!audioAnalysis) {
        console.log('   ❌ No audio analysis found');
      } else {
        console.log(`   ✅ Audio Analysis found:`);
        console.log(`     ID: ${audioAnalysis.id}`);
        console.log(`     Transcription: ${audioAnalysis.transcription ? 'Present (' + audioAnalysis.transcription.length + ' chars)' : 'Missing'}`);
        console.log(`     Language: ${audioAnalysis.language || 'Unknown'}`);
        console.log(`     Confidence: ${audioAnalysis.confidence || 'Unknown'}`);
        console.log(`     Duration: ${audioAnalysis.duration || 'Unknown'}`);
      }
      
      // Determine completion status
      console.log('\n✅ Completion Analysis:');
      const hasTitle = !!(content.title || content.generated_title);
      const hasSummary = !!content.summary;
      const hasTags = !!(content.auto_tags && content.auto_tags.length > 0);
      const hasTranscription = !!content.transcription;
      const hasVideoAnalysis = !!videoAnalysis;
      const hasAudioAnalysis = !!audioAnalysis;
      const hasCompletedJob = jobs.some(job => job.status === 'completed');
      
      console.log(`   Title: ${hasTitle ? '✅' : '❌'}`);
      console.log(`   Summary: ${hasSummary ? '✅' : '❌'}`);
      console.log(`   Tags: ${hasTags ? '✅' : '❌'}`);
      console.log(`   Transcription: ${hasTranscription ? '✅' : '❌'}`);
      console.log(`   Video Analysis: ${hasVideoAnalysis ? '✅' : '❌'}`);
      console.log(`   Audio Analysis: ${hasAudioAnalysis ? '✅' : '❌'}`);
      console.log(`   Completed Job: ${hasCompletedJob ? '✅' : '❌'}`);
      
      const completionScore = [hasTitle, hasSummary, hasTags, hasTranscription, hasVideoAnalysis, hasAudioAnalysis, hasCompletedJob].filter(Boolean).length;
      console.log(`   Overall Completion: ${completionScore}/7 (${Math.round(completionScore/7*100)}%)`);
      
      if (completionScore < 7) {
        console.log('\n🔧 Recommended Actions:');
        if (!hasCompletedJob) {
          console.log('   - No completed processing jobs found - may need to retry processing');
        }
        if (!hasTranscription) {
          console.log('   - Missing transcription - check TikTok download and audio extraction');
        }
        if (!hasTitle || !hasSummary || !hasTags) {
          console.log('   - Missing AI analysis results - check AI processing pipeline');
        }
        if (!hasVideoAnalysis) {
          console.log('   - Missing video analysis - check video processing pipeline');
        }
        if (!hasAudioAnalysis) {
          console.log('   - Missing audio analysis - check audio processing pipeline');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking TikTok processing:', error);
    console.error(error.stack);
  }
}

if (require.main === module) {
  checkTikTokProcessing().then(() => {
    console.log('\n✅ TikTok processing check completed');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { checkTikTokProcessing };
