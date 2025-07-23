#!/usr/bin/env node

/**
 * Check Content Processing Status
 * 
 * Check the Content table for stuck processing items
 */

const { Content, File, User, ProcessingJob } = require('../models');
const { Op } = require('sequelize');

async function main() {
  try {
    console.log('🔍 Investigating Content processing status...');
    
    // Check the specific stuck content ID
    const stuckContentId = '53a31004-bc5a-4b6d-bf3e-93f2a7371e68';
    console.log(`\n🎯 Checking specific stuck content ID: ${stuckContentId}`);
    
    const stuckContent = await Content.findOne({
      where: { id: stuckContentId },
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'email']
        },
        {
          model: File,
          required: false
        }
      ]
    });
    
    if (stuckContent) {
      console.log(`\n🔍 Found stuck content: ${stuckContent.title || 'No title'}`);
      console.log(`   ID: ${stuckContent.id}`);
      console.log(`   Type: ${stuckContent.content_type}`);
      console.log(`   Has summary: ${!!stuckContent.summary}`);
      console.log(`   Has generated_title: ${!!stuckContent.generated_title}`);
      console.log(`   Has auto_tags: ${!!stuckContent.auto_tags}`);
      console.log(`   User: ${stuckContent.User.username}`);
      console.log(`   Created: ${stuckContent.createdAt}`);
      
      if (stuckContent.File) {
        console.log(`   Associated File: ${stuckContent.File.filename}`);
        console.log(`   File MIME: ${stuckContent.File.metadata?.mimetype}`);
        console.log(`   File path: ${stuckContent.File.file_path}`);
      } else {
        console.log(`   No associated File found`);
      }
      
      // Check processing jobs for this content
      const jobs = await ProcessingJob.findAll({
        where: { 
          [Op.or]: [
            { file_id: stuckContent.file_id },
            { user_id: stuckContent.user_id }
          ]
        },
        order: [['createdAt', 'DESC']],
        limit: 5
      });
      
      console.log(`   Processing jobs: ${jobs.length}`);
      for (const job of jobs) {
        console.log(`     - ${job.job_type}: ${job.status} (${job.progress}%) - File: ${job.file_id}`);
      }
      
    } else {
      console.log(`❌ Content with ID ${stuckContentId} not found`);
    }
    
    // Check recent content that might be stuck
    console.log('\n📊 Recent content without processing:');
    const unprocessedContent = await Content.findAll({
      where: {
        [Op.and]: [
          { summary: null },
          { generated_title: null }
        ]
      },
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'email']
        },
        {
          model: File,
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 10
    });
    
    console.log(`📋 Found ${unprocessedContent.length} unprocessed content items:`);
    for (const content of unprocessedContent) {
      console.log(`\n📄 ${content.title || content.File?.filename || 'No title'} (${content.id})`);
      console.log(`   Type: ${content.content_type}`);
      console.log(`   Created: ${content.createdAt}`);
      console.log(`   User: ${content.User.username}`);
      console.log(`   Has File: ${!!content.File}`);
      
      if (content.File) {
        const isDoc = content.File.metadata?.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                     content.File.filename?.endsWith('.docx');
        console.log(`   File: ${content.File.filename} ${isDoc ? '📝 DOCX' : ''}`);
        console.log(`   MIME: ${content.File.metadata?.mimetype}`);
      }
    }
    
    // Check Content records that should be documents
    console.log('\n📝 Looking for document-type content:');
    const documentContent = await Content.findAll({
      where: {
        content_type: 'document'
      },
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'email']
        },
        {
          model: File,
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    
    console.log(`📋 Found ${documentContent.length} document content items:`);
    for (const content of documentContent) {
      console.log(`\n📄 ${content.title || content.File?.filename || 'No title'} (${content.id})`);
      console.log(`   Created: ${content.createdAt}`);
      console.log(`   User: ${content.User.username}`);
      console.log(`   Has summary: ${!!content.summary}`);
      console.log(`   Has generated_title: ${!!content.generated_title}`);
      console.log(`   Has auto_tags: ${!!content.auto_tags}`);
      
      if (content.File) {
        console.log(`   File: ${content.File.filename}`);
        console.log(`   MIME: ${content.File.metadata?.mimetype}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Investigation failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().then(() => {
    console.log('\n✅ Content investigation completed');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Investigation failed:', error);
    process.exit(1);
  });
}

module.exports = { main }; 