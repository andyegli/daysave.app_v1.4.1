#!/usr/bin/env node

/**
 * Check Content Table Processing Status
 * 
 * Check the Content table for unprocessed items that need AI analysis
 */

const { Content, User, ProcessingJob } = require('../models');
const { Op } = require('sequelize');

async function main() {
  try {
    console.log('🔍 Investigating Content table processing status...');
    
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
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 10
    });
    
    console.log(`📋 Found ${unprocessedContent.length} unprocessed content items:`);
    for (const content of unprocessedContent) {
      const isDoc = content.url?.includes('.docx') || content.url?.includes('.pdf') || content.content_type === 'document';
      
      console.log(`\n📄 ${content.url || 'No URL'} (${content.id}) ${isDoc ? '📝 DOCUMENT' : ''}`);
      console.log(`   Type: ${content.content_type}`);
      console.log(`   Created: ${content.createdAt}`);
      console.log(`   User: ${content.User.username}`);
      console.log(`   Has summary: ${!!content.summary}`);
      console.log(`   Has generated_title: ${!!content.generated_title}`);
      console.log(`   Has auto_tags: ${!!content.auto_tags}`);
      console.log(`   Has transcription: ${!!content.transcription}`);
      
      // Check processing jobs for this content
      const jobs = await ProcessingJob.findAll({
        where: { 
          [Op.or]: [
            { content_id: content.id },
            { user_id: content.user_id }
          ]
        },
        order: [['createdAt', 'DESC']],
        limit: 3
      });
      
      console.log(`   Processing jobs: ${jobs.length}`);
      for (const job of jobs) {
        console.log(`     - ${job.job_type}: ${job.status} (${job.progress}%) - Created: ${job.createdAt}`);
      }
    }
    
    // Check Content records that should be documents specifically
    console.log('\n📝 Looking for document-type content:');
    const documentContent = await Content.findAll({
      where: {
        [Op.or]: [
          { content_type: 'document' },
          { url: { [Op.like]: '%.docx%' } },
          { url: { [Op.like]: '%.pdf%' } },
          { url: { [Op.like]: '%.doc%' } }
        ]
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
    
    console.log(`📋 Found ${documentContent.length} document content items:`);
    for (const content of documentContent) {
      console.log(`\n📄 ${content.url || 'No URL'} (${content.id})`);
      console.log(`   Created: ${content.createdAt}`);
      console.log(`   User: ${content.User.username}`);
      console.log(`   Content type: ${content.content_type}`);
      console.log(`   Has summary: ${!!content.summary} (${content.summary?.length || 0} chars)`);
      console.log(`   Has generated_title: ${!!content.generated_title}`);
      console.log(`   Has auto_tags: ${!!content.auto_tags} (${content.auto_tags?.length || 0} tags)`);
      console.log(`   Has transcription: ${!!content.transcription} (${content.transcription?.length || 0} chars)`);
    }
    
    // Check the specific stuck content ID mentioned in earlier logs
    console.log('\n🎯 Checking specific content ID from logs...');
    const stuckContentIds = [
      '53a31004-bc5a-4b6d-bf3e-93f2a7371e68',
      '90607155-f215-4afe-ba4b-abc2b3aac469',
      '0d88ac5f-8cf9-4356-82e7-1a581d71d0d7',
      '3469f00c-7d24-4dc5-b1db-ba606edfc5e4',
      'd44e5318-a5ee-4010-bb09-84fcb63bb1fa'
    ];
    
    for (const contentId of stuckContentIds) {
      const stuckContent = await Content.findOne({
        where: { id: contentId },
        include: [{
          model: User,
          attributes: ['id', 'username', 'email']
        }]
      });
      
      if (stuckContent) {
        const isDoc = stuckContent.url?.includes('.docx') || stuckContent.url?.includes('.pdf') || stuckContent.content_type === 'document';
        
        console.log(`\n🔍 Found content: ${stuckContent.url || 'No URL'} (${stuckContent.id}) ${isDoc ? '📝 DOCUMENT' : ''}`);
        console.log(`   Type: ${stuckContent.content_type}`);
        console.log(`   Created: ${stuckContent.createdAt}`);
        console.log(`   User: ${stuckContent.User.username}`);
        console.log(`   Has summary: ${!!stuckContent.summary}`);
        console.log(`   Has generated_title: ${!!stuckContent.generated_title}`);
        console.log(`   Has auto_tags: ${!!stuckContent.auto_tags}`);
        console.log(`   Metadata:`, stuckContent.metadata ? JSON.stringify(stuckContent.metadata, null, 2) : 'null');
      } else {
        console.log(`❌ Content with ID ${contentId} not found`);
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
    console.log('\n✅ Content table investigation completed');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Investigation failed:', error);
    process.exit(1);
  });
}

module.exports = { main }; 