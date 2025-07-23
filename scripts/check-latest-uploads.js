#!/usr/bin/env node

/**
 * Check Latest Uploads
 * 
 * Check the most recent files uploaded to see their processing status
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