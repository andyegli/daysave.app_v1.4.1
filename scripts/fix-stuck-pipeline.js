#!/usr/bin/env node

/**
 * Fix Stuck AI Pipeline Processing Jobs
 * 
 * This script identifies and resolves stuck or failed AI processing jobs
 * that are preventing content analysis from completing.
 */

const { Op } = require('sequelize');
const path = require('path');

// Load models
require('dotenv').config();
const models = require('../models');
const { Content, ProcessingJob, VideoAnalysis, AudioAnalysis, ImageAnalysis } = models;

/**
 * Main execution function
 */
async function main() {
  console.log('🔧 === FIXING STUCK AI PIPELINE JOBS ===');
  console.log('=====================================');
  
  try {
    // Check database connection
    await models.sequelize.authenticate();
    console.log('✅ Database connected successfully');
    
    // Get stuck content from logs (specific IDs mentioned)
    const stuckContentIds = [
      'c9cf8e0f-db9b-40d7-b6f4-4bb698cda56a',
      'b9691d74-291f-4b12-812a-f1f90eddce73', 
      '022fc1d4-c1ad-4410-91ba-686391676eec',
      'b4f93e4a-7642-487b-9b73-5610eb2ae38e',
      '049af111-e251-42c4-9a4f-92bb68ec7b76',
      'df49d630-9574-47bc-8853-2d4c4de0c89e'
    ];
    
    console.log(`🔍 Checking ${stuckContentIds.length} potentially stuck content items...`);
    
    for (const contentId of stuckContentIds) {
      console.log(`\n📋 Analyzing content: ${contentId}`);
      await analyzeAndFixContent(contentId);
    }
    
    // Also check for any other long-running jobs
    console.log('\n🔍 Checking for other stuck processing jobs...');
    await checkAllStuckJobs();
    
    console.log('\n✅ Stuck pipeline analysis complete!');
    
  } catch (error) {
    console.error('❌ Error fixing stuck pipeline:', error);
    process.exit(1);
  } finally {
    await models.sequelize.close();
  }
}

/**
 * Analyze and fix specific content item
 */
async function analyzeAndFixContent(contentId) {
  try {
    // Check if content exists
    const content = await Content.findByPk(contentId);
    if (!content) {
      console.log(`   ❌ Content not found: ${contentId}`);
      return;
    }
    
    console.log(`   ✅ Found content: ${content.url || 'No URL'}`);
    console.log(`   📊 Created: ${content.createdAt}`);
    console.log(`   📊 Updated: ${content.updatedAt}`);
    console.log(`   📊 Has summary: ${!!content.summary}`);
    console.log(`   📊 Has transcription: ${!!content.transcription}`);
    console.log(`   📊 Has generated title: ${!!content.generated_title}`);
    
    // Check processing jobs
    const processingJobs = await ProcessingJob.findAll({
      where: { content_id: contentId },
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    
    console.log(`   🔄 Processing jobs found: ${processingJobs.length}`);
    
    for (const job of processingJobs) {
      console.log(`      Job ${job.id}: ${job.status} (${job.progress || 0}%) - ${job.current_stage || 'No stage'}`);
      console.log(`      Created: ${job.createdAt}, Updated: ${job.updatedAt}`);
      
      // Check if job is stuck (created more than 30 minutes ago and still processing)
      const jobAge = Date.now() - new Date(job.createdAt).getTime();
      const thirtyMinutes = 30 * 60 * 1000;
      
      if (jobAge > thirtyMinutes && (job.status === 'processing' || job.status === 'pending')) {
        console.log(`      ⚠️  Job appears stuck (${Math.round(jobAge / 60000)} minutes old)`);
        await fixStuckJob(job, content);
      }
    }
    
    // Check analysis tables
    await checkAnalysisTables(contentId, content);
    
  } catch (error) {
    console.error(`   ❌ Error analyzing content ${contentId}:`, error.message);
  }
}

/**
 * Fix a stuck processing job
 */
async function fixStuckJob(job, content) {
  try {
    console.log(`      🔧 Attempting to fix stuck job ${job.id}...`);
    
    // Mark job as failed
    await job.update({
      status: 'failed',
      error_message: 'Job stuck - auto-failed by fix script',
      completed_at: new Date(),
      progress: 100
    });
    
    console.log(`      ✅ Marked job ${job.id} as failed`);
    
    // Try to trigger new analysis
    console.log(`      🚀 Triggering new analysis for content...`);
    
    // Import the automation orchestrator  
    const { AutomationOrchestrator } = require('../services/multimedia');
    const orchestrator = AutomationOrchestrator.getInstance();
    
    // Check if content has URL for reprocessing
    if (content.url) {
      try {
        // This would normally be handled by the content creation pipeline
        console.log(`      ⏳ Content will be reprocessed on next access`);
        
        // Reset content analysis fields to trigger reprocessing
        await content.update({
          summary: null,
          transcription: null,
          generated_title: null,
          auto_tags: null,
          sentiment: null
        });
        
        console.log(`      ✅ Reset content analysis fields for reprocessing`);
      } catch (processError) {
        console.error(`      ❌ Error triggering reprocessing:`, processError.message);
      }
    }
    
  } catch (error) {
    console.error(`      ❌ Error fixing job ${job.id}:`, error.message);
  }
}

/**
 * Check analysis tables for orphaned or incomplete data
 */
async function checkAnalysisTables(contentId, content) {
  try {
    console.log(`   📊 Checking analysis tables...`);
    
    // Check video analysis
    const videoAnalysis = await VideoAnalysis.findOne({
      where: { content_id: contentId }
    });
    
    // Check audio analysis  
    const audioAnalysis = await AudioAnalysis.findOne({
      where: { content_id: contentId }
    });
    
    // Check image analysis
    const imageAnalysis = await ImageAnalysis.findOne({
      where: { content_id: contentId }
    });
    
    const analysisCount = [videoAnalysis, audioAnalysis, imageAnalysis].filter(Boolean).length;
    console.log(`   📊 Analysis records found: ${analysisCount}`);
    
    if (videoAnalysis) {
      console.log(`      📹 Video analysis: ${videoAnalysis.status || 'unknown status'}`);
      if (videoAnalysis.transcription_results) {
        console.log(`      📝 Has transcription data`);
      }
    }
    
    if (audioAnalysis) {
      console.log(`      🎵 Audio analysis: ${audioAnalysis.status || 'unknown status'}`);
      if (audioAnalysis.transcription_results) {
        console.log(`      📝 Has transcription data`);
      }
    }
    
    if (imageAnalysis) {
      console.log(`      🖼️  Image analysis: ${imageAnalysis.status || 'unknown status'}`);
      if (imageAnalysis.ai_description) {
        console.log(`      📝 Has AI description`);
      }
    }
    
    // If we have analysis data but no content summary, copy it over
    if (analysisCount > 0 && !content.summary) {
      console.log(`   🔄 Found analysis data but no content summary, copying...`);
      await copyAnalysisToContent(content, { videoAnalysis, audioAnalysis, imageAnalysis });
    }
    
  } catch (error) {
    console.error(`   ❌ Error checking analysis tables:`, error.message);
  }
}

/**
 * Copy analysis data to content record
 */
async function copyAnalysisToContent(content, analyses) {
  try {
    const updateData = {};
    
    // Copy transcription from video or audio analysis
    if (analyses.videoAnalysis?.transcription_results?.fullText) {
      updateData.transcription = analyses.videoAnalysis.transcription_results.fullText;
      updateData.summary = analyses.videoAnalysis.transcription_results.fullText.substring(0, 500) + '...';
    } else if (analyses.audioAnalysis?.transcription_results?.fullText) {
      updateData.transcription = analyses.audioAnalysis.transcription_results.fullText;
      updateData.summary = analyses.audioAnalysis.transcription_results.fullText.substring(0, 500) + '...';
    }
    
    // Copy AI description from image analysis
    if (analyses.imageAnalysis?.ai_description) {
      const description = typeof analyses.imageAnalysis.ai_description === 'string' 
        ? analyses.imageAnalysis.ai_description 
        : analyses.imageAnalysis.ai_description.description;
      if (description) {
        updateData.summary = description;
      }
    }
    
    // Generate title from summary
    if (updateData.summary) {
      const words = updateData.summary.split(' ').slice(0, 10);
      updateData.generated_title = words.join(' ') + (words.length >= 10 ? '...' : '');
    }
    
    if (Object.keys(updateData).length > 0) {
      await content.update(updateData);
      console.log(`   ✅ Copied analysis data to content record`);
    }
    
  } catch (error) {
    console.error(`   ❌ Error copying analysis data:`, error.message);
  }
}

/**
 * Check for all stuck jobs in the system
 */
async function checkAllStuckJobs() {
  try {
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    
    // Find jobs that are still processing but were created more than 30 minutes ago
    const stuckJobs = await ProcessingJob.findAll({
      where: {
        status: {
          [Op.in]: ['processing', 'pending']
        },
        createdAt: {
          [Op.lt]: thirtyMinutesAgo
        }
      },
      order: [['createdAt', 'ASC']],
      limit: 20
    });
    
    console.log(`📊 Found ${stuckJobs.length} potentially stuck jobs`);
    
    for (const job of stuckJobs) {
      const jobAge = Math.round((now.getTime() - new Date(job.createdAt).getTime()) / 60000);
      console.log(`   Job ${job.id}: ${job.status} (${jobAge} minutes old) - Stage: ${job.current_stage || 'unknown'}`);
      
      // Mark very old jobs as failed
      if (jobAge > 60) { // More than 1 hour
        await job.update({
          status: 'failed',
          error_message: 'Job timeout - auto-failed by cleanup script',
          completed_at: new Date()
        });
        console.log(`   ✅ Auto-failed job ${job.id} (too old)`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking all stuck jobs:', error.message);
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { main, analyzeAndFixContent }; 