#!/usr/bin/env node
/**
 * Latest Upload Status Checker for DaySave
 * 
 * PURPOSE:
 * Monitors and reports on the most recent file uploads and URL content submissions
 * to verify AI processing status and identify any issues with automatic analysis.
 * 
 * USAGE:
 * node scripts/check-latest-uploads.js
 * 
 * FEATURES:
 * - Lists latest 5 file uploads with processing status
 * - Lists latest 5 URL content submissions
 * - Shows processing job status and completion
 * - Reports AI analysis results (summary, title, tags, transcription)
 * - Identifies documents needing processing
 * 
 * TRACKED INFORMATION:
 * - File details (name, type, size, user)
 * - Content metadata (URL, type, creation time)
 * - Processing status (summary, title, tags)
 * - Processing jobs and their completion
 * - Character counts for generated content
 * 
 * OUTPUT FORMAT:
 * - Chronological listing (newest first)
 * - Processing status indicators (true/false)
 * - Content length metrics
 * - Special markers for document types
 * - Processing job summaries
 * 
 * DETECTION FEATURES:
 * - Identifies DOCX files needing AI analysis
 * - Flags content missing titles or tags
 * - Shows processing job history
 * - Highlights incomplete analysis
 * 
 * USE CASES:
 * - Daily monitoring of upload processing
 * - Quality assurance for AI analysis
 * - Debugging processing pipeline issues
 * - User support and troubleshooting
 * 
 * DEPENDENCIES:
 * - Database models (File, Content, User, ProcessingJob)
 * - Environment configuration
 * 
 * AUTHOR: DaySave Development Team
 * CREATED: 2025-08-01 (Upload Monitoring Tools)
 */

const { File, Content, User, ProcessingJob } = require('../models');

async function main() {
  try {
    console.log('🔍 Checking latest uploads...');
    
    // Check latest File uploads
    console.log('\n📄 Latest File uploads:');
    const latestFiles = await File.findAll({
      include: [{
        model: User,
        attributes: ['id', 'username', 'email']
      }],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    for (const file of latestFiles) {
      const isDoc = file.metadata?.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                   file.filename?.endsWith('.docx');
      
      console.log(`\n📋 ${file.filename} (${file.id}) ${isDoc ? '📝 DOCX' : ''}`);
      console.log(`   Created: ${file.createdAt}`);
      console.log(`   MIME: ${file.metadata?.mimetype}`);
      console.log(`   Content type: ${file.content_type}`);
      console.log(`   User: ${file.User.username}`);
      console.log(`   Has summary: ${!!file.summary} (${file.summary?.length || 0} chars)`);
      console.log(`   Has title: ${!!file.generated_title}`);
      console.log(`   Has tags: ${!!file.auto_tags} (${file.auto_tags?.length || 0} tags)`);
      console.log(`   Has transcription: ${!!file.transcription} (${file.transcription?.length || 0} chars)`);
      
      // Check processing jobs
      const jobs = await ProcessingJob.findAll({
        where: { file_id: file.id },
        order: [['createdAt', 'DESC']],
        limit: 2
      });
      
      console.log(`   Processing jobs: ${jobs.length}`);
      for (const job of jobs) {
        console.log(`     - ${job.job_type}: ${job.status} (${job.progress}%) - ${job.createdAt}`);
      }
      
      if (isDoc && (!file.summary && !file.generated_title && !file.auto_tags)) {
        console.log(`   ⚠️ DOCX NEEDS PROCESSING - missing AI analysis!`);
      }
    }
    
    // Check latest Content submissions
    console.log('\n🌐 Latest Content submissions:');
    const latestContent = await Content.findAll({
      include: [{
        model: User,
        attributes: ['id', 'username', 'email']
      }],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    for (const content of latestContent) {
      const isDoc = content.url?.includes('.docx') || content.url?.includes('.pdf') || content.content_type === 'document';
      
      console.log(`\n🌐 ${content.url?.substring(0, 60) || 'No URL'}... (${content.id}) ${isDoc ? '📝 DOCUMENT' : ''}`);
      console.log(`   Created: ${content.createdAt}`);
      console.log(`   Type: ${content.content_type}`);
      console.log(`   User: ${content.User.username}`);
      console.log(`   Has summary: ${!!content.summary} (${content.summary?.length || 0} chars)`);
      console.log(`   Has title: ${!!content.generated_title}`);
      console.log(`   Has tags: ${!!content.auto_tags} (${content.auto_tags?.length || 0} tags)`);
      
      if (isDoc && (!content.summary && !content.generated_title && !content.auto_tags)) {
        console.log(`   ⚠️ DOCUMENT NEEDS PROCESSING - missing AI analysis!`);
      }
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().then(() => {
    console.log('\n✅ Latest uploads check completed');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Check failed:', error);
    process.exit(1);
  });
}

module.exports = { main }; 