#!/usr/bin/env node

/**
 * Check Stuck Files Status
 * 
 * Investigate files that are stuck in waiting status and check their database state
 */

const { File, User, ProcessingJob } = require('../models');
const { Op } = require('sequelize');

async function main() {
  try {
    console.log('🔍 Investigating stuck files...');
    
    // First, let's check recent DOCX files
    console.log('\n📄 Recent DOCX files:');
    const recentDocx = await File.findAll({
      where: {
        [Op.or]: [
          {
            metadata: {
              mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            }
          },
          {
            filename: {
              [Op.like]: '%.docx'
            }
          }
        ]
      },
      include: [{
        model: User,
        attributes: ['id', 'username', 'email']
      }],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    for (const file of recentDocx) {
      console.log(`\n📋 File: ${file.filename} (${file.id})`);
      console.log(`   Created: ${file.createdAt}`);
      console.log(`   MIME type: ${file.metadata?.mimetype}`);
      console.log(`   File path: ${file.file_path}`);
      console.log(`   User: ${file.User.username}`);
      console.log(`   Has summary: ${!!file.summary} (${file.summary?.length || 0} chars)`);
      console.log(`   Has title: ${!!file.generated_title}`);
      console.log(`   Has tags: ${!!file.auto_tags} (${file.auto_tags?.length || 0} tags)`);
      console.log(`   Has transcription: ${!!file.transcription} (${file.transcription?.length || 0} chars)`);
      
      // Check for processing jobs
      const jobs = await ProcessingJob.findAll({
        where: { file_id: file.id },
        order: [['createdAt', 'DESC']],
        limit: 3
      });
      
      console.log(`   Processing jobs: ${jobs.length}`);
      for (const job of jobs) {
        console.log(`     - ${job.job_type}: ${job.status} (${job.progress}%)`);
      }
    }
    
    // Check files with specific ID that was stuck
    console.log('\n🎯 Checking specific stuck file ID...');
    const stuckFileId = '53a31004-bc5a-4b6d-bf3e-93f2a7371e68';
    const stuckFile = await File.findOne({
      where: { id: stuckFileId },
      include: [{
        model: User,
        attributes: ['id', 'username', 'email']
      }]
    });
    
    if (stuckFile) {
      console.log(`\n🔍 Found stuck file: ${stuckFile.filename}`);
      console.log(`   ID: ${stuckFile.id}`);
      console.log(`   MIME type: ${stuckFile.metadata?.mimetype}`);
      console.log(`   File path: ${stuckFile.file_path}`);
      console.log(`   Content type: ${stuckFile.content_type}`);
      console.log(`   Has summary: ${!!stuckFile.summary}`);
      console.log(`   Has title: ${!!stuckFile.generated_title}`);
      console.log(`   Has tags: ${!!stuckFile.auto_tags}`);
      console.log(`   Metadata:`, JSON.stringify(stuckFile.metadata, null, 2));
    } else {
      console.log(`❌ File with ID ${stuckFileId} not found`);
    }
    
    // Check all files without processing
    console.log('\n📊 Files without AI processing (any type):');
    const unprocessed = await File.findAll({
      where: {
        [Op.and]: [
          { summary: null },
          { generated_title: null },
          { auto_tags: null }
        ]
      },
      include: [{
        model: User,
        attributes: ['id', 'username', 'email']
      }],
      order: [['createdAt', 'DESC']],
      limit: 10
    });
    
    console.log(`📋 Found ${unprocessed.length} unprocessed files:`);
    for (const file of unprocessed) {
      const isDoc = file.metadata?.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                    file.filename?.endsWith('.docx');
      
      console.log(`\n📄 ${file.filename} (${file.id}) ${isDoc ? '📝 DOCX' : ''}`);
      console.log(`   MIME: ${file.metadata?.mimetype}`);
      console.log(`   Content type: ${file.content_type}`);
      console.log(`   Created: ${file.createdAt}`);
      console.log(`   User: ${file.User.username}`);
    }
    
  } catch (error) {
    console.error('❌ Investigation failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().then(() => {
    console.log('\n✅ Investigation completed');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Investigation failed:', error);
    process.exit(1);
  });
}

module.exports = { main }; 