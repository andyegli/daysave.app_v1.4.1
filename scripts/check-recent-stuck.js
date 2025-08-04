#!/usr/bin/env node

require('dotenv').config();
const { Content, ProcessingJob } = require('../models');
const { Op } = require('sequelize');

async function checkRecentContent() {
  try {
    console.log('🔍 Checking recent content for stuck processing...');
    
    // Get content from last 24 hours
    const recent = await Content.findAll({
      where: { 
        createdAt: { 
          [Op.gte]: new Date(Date.now() - 24*60*60*1000) 
        } 
      },
      order: [['createdAt', 'DESC']],
      limit: 15
    });
    
    console.log(`📅 Found ${recent.length} items from last 24 hours:\n`);
    
    for (const content of recent) {
      const jobs = await ProcessingJob.findAll({ 
        where: { content_id: content.id },
        order: [['createdAt', 'DESC']]
      });
      
      const hasTranscription = !!(content.transcription && content.transcription.length > 50);
      const hasSummary = !!(content.summary && content.summary.length > 10);
      const hasTitle = !!content.generated_title;
      const hasTags = !!(content.auto_tags && content.auto_tags.length > 0);
      
      // Calculate completion percentage
      const features = [hasTranscription, hasSummary, hasTitle, hasTags];
      const completed = features.filter(Boolean).length;
      const percentage = Math.round((completed / features.length) * 100);
      
      console.log(`📋 ${content.id.substring(0,8)}... (${percentage}%)`);
      console.log(`   🔗 URL: ${content.url?.substring(0,60) || 'No URL'}...`);
      console.log(`   ⏰ Created: ${content.createdAt.toLocaleString()}`);
      console.log(`   📝 Transcription: ${hasTranscription ? '✅' : '❌'}`);
      console.log(`   📄 Summary: ${hasSummary ? '✅' : '❌'}`);
      console.log(`   🏷️  Title: ${hasTitle ? '✅' : '❌'}`);
      console.log(`   🎯 Tags: ${hasTags ? '✅' : '❌'}`);
      console.log(`   ⚙️  Processing Jobs: ${jobs.length}`);
      
      if (jobs.length > 0) {
        const latestJob = jobs[0];
        console.log(`      Latest Job: ${latestJob.status} (${latestJob.progress || 0}%) - ${latestJob.current_stage || 'No stage'}`);
        console.log(`      Job Created: ${latestJob.createdAt.toLocaleString()}`);
        console.log(`      Job Updated: ${latestJob.updatedAt.toLocaleString()}`);
        
        // Check if job is stuck
        const jobAge = Date.now() - new Date(latestJob.createdAt).getTime();
        if (jobAge > 10 * 60 * 1000 && latestJob.status === 'processing') {
          console.log(`      ⚠️  Job may be stuck (${Math.round(jobAge / 60000)} minutes old)`);
        }
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit();
  }
}

checkRecentContent();