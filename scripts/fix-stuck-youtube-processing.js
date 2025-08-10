#!/usr/bin/env node

/**
 * Fix Stuck YouTube Processing Records
 * 
 * This script fixes VideoAnalysis records that are stuck in "processing" status
 * and creates missing ProcessingJob records for them.
 */

const { Content, ProcessingJob, VideoAnalysis } = require('../models');
const { v4: uuidv4 } = require('uuid');

async function fixStuckProcessing() {
  try {
    console.log('🔧 Fixing stuck YouTube processing records...');
    
    // Find VideoAnalysis records stuck in processing status
    const stuckAnalysis = await VideoAnalysis.findAll({
      where: {
        status: 'processing',
        progress: 0
      },
      include: [{
        model: Content,
        as: 'content',
        required: true
      }],
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`   Found ${stuckAnalysis.length} stuck analysis record(s)`);
    
    for (const analysis of stuckAnalysis) {
      console.log(`\n🎬 Fixing VideoAnalysis: ${analysis.id}`);
      console.log(`   Content: ${analysis.content_id}`);
      console.log(`   URL: ${analysis.content?.url}`);
      console.log(`   Started: ${analysis.started_at}`);
      
      // Check if ProcessingJob already exists
      const existingJob = await ProcessingJob.findOne({
        where: { content_id: analysis.content_id }
      });
      
      if (existingJob) {
        console.log(`   ✅ ProcessingJob already exists: ${existingJob.id}`);
      } else {
        // Create ProcessingJob record
        const jobRecord = {
          id: uuidv4(),
          user_id: analysis.user_id,
          content_id: analysis.content_id,
          file_id: null,
          job_type: 'video_analysis',
          media_type: 'video',
          status: 'completed',
          progress: 100,
          current_stage: 'completed',
          started_at: analysis.started_at || new Date(),
          completed_at: new Date(),
          estimated_completion: new Date(),
          duration_ms: Date.now() - (analysis.started_at ? new Date(analysis.started_at).getTime() : Date.now()),
          metadata: {
            compatibility_mode: true,
            orchestrator_used: false,
            backward_compatibility: true,
            migration_fix: true,
            analysis_id: analysis.id,
            url: analysis.content?.url,
            content_type: 'video'
          },
          configuration: {
            transcription: true,
            sentiment: true,
            summarization: true,
            thumbnails: true,
            speaker_identification: true
          },
          results: {
            transcription: !!analysis.transcription,
            summary: !!analysis.content?.summary,
            sentiment: !!analysis.content?.sentiment,
            auto_tags: !!(analysis.content?.auto_tags && analysis.content.auto_tags.length > 0),
            thumbnail_count: 0,
            speaker_count: 0
          }
        };
        
        await ProcessingJob.create(jobRecord);
        console.log(`   ✅ Created ProcessingJob: ${jobRecord.id}`);
      }
      
      // Update VideoAnalysis status to ready
      await VideoAnalysis.update({
        status: 'ready',
        progress: 100,
        completed_at: new Date()
      }, {
        where: { id: analysis.id }
      });
      
      console.log(`   ✅ Updated VideoAnalysis status to 'ready'`);
    }
    
    console.log(`\n✅ Fixed ${stuckAnalysis.length} stuck processing record(s)`);
    
  } catch (error) {
    console.error('❌ Error fixing stuck processing:', error);
  }
}

// Run the fix
fixStuckProcessing()
  .then(() => {
    console.log('\n🎯 Stuck processing fix complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
