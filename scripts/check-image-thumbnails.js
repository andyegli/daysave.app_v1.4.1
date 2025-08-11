#!/usr/bin/env node

/**
 * Check Image Thumbnail Generation Status
 * 
 * This script checks the thumbnail generation status for recent image uploads
 * and identifies why thumbnails might not be generated properly.
 */

require('dotenv').config();
const { File, Thumbnail, ProcessingJob, User } = require('../models');

async function checkImageThumbnails() {
  try {
    console.log('🔍 Checking recent image uploads and thumbnail generation...');
    
    // Find recent image files
    const recentImageFiles = await File.findAll({
      where: {
        metadata: {
          mimetype: {
            [require('sequelize').Op.like]: 'image/%'
          }
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
    
    console.log(`\n📁 Found ${recentImageFiles.length} recent image files:`);
    
    for (const file of recentImageFiles) {
      console.log(`\n🖼️ Image File: ${file.id}`);
      console.log(`   Filename: ${file.filename}`);
      console.log(`   Type: ${file.metadata?.mimetype || 'Unknown'}`);
      console.log(`   Size: ${file.metadata?.size ? (file.metadata.size / 1024).toFixed(1) + ' KB' : 'Unknown'}`);
      console.log(`   User: ${file.User?.username || 'Unknown'}`);
      console.log(`   Created: ${file.createdAt.toISOString()}`);
      console.log(`   File Path: ${file.file_path}`);
      console.log(`   Summary: ${file.summary ? 'Present (' + file.summary.length + ' chars)' : 'Missing'}`);
      console.log(`   Generated Title: ${file.generated_title || 'Missing'}`);
      console.log(`   Auto Tags: ${file.auto_tags ? file.auto_tags.length + ' tags' : 'Missing'}`);
      
      // Check thumbnails
      console.log('\n📸 Thumbnails:');
      const thumbnails = await Thumbnail.findAll({
        where: { file_id: file.id },
        order: [['createdAt', 'DESC']]
      });
      
      if (thumbnails.length === 0) {
        console.log('   ❌ No thumbnails found');
      } else {
        console.log(`   ✅ Found ${thumbnails.length} thumbnails:`);
        thumbnails.forEach((thumb, i) => {
          console.log(`     ${i+1}. ${thumb.file_name}`);
          console.log(`        Size: ${thumb.width}x${thumb.height} pixels`);
          console.log(`        File Size: ${thumb.file_size ? (thumb.file_size / 1024).toFixed(1) + ' KB' : 'Unknown'}`);
          console.log(`        Type: ${thumb.thumbnail_type || 'Unknown'}`);
          console.log(`        Path: ${thumb.file_path}`);
          console.log(`        Status: ${thumb.status}`);
        });
      }
      
      // Check processing jobs
      console.log('\n📊 Processing Jobs:');
      const jobs = await ProcessingJob.findAll({
        where: { file_id: file.id },
        order: [['createdAt', 'DESC']]
      });
      
      if (jobs.length === 0) {
        console.log('   ❌ No processing jobs found');
      } else {
        console.log(`   ✅ Found ${jobs.length} processing jobs:`);
        jobs.forEach((job, i) => {
          console.log(`     ${i+1}. Job ${job.id.substring(0, 8)}...`);
          console.log(`        Type: ${job.job_type}`);
          console.log(`        Status: ${job.status}`);
          console.log(`        Progress: ${job.progress}%`);
          console.log(`        Stage: ${job.current_stage || 'Unknown'}`);
          if (job.started_at) console.log(`        Started: ${job.started_at.toISOString()}`);
          if (job.completed_at) console.log(`        Completed: ${job.completed_at.toISOString()}`);
          if (job.error_message) console.log(`        ❌ Error: ${job.error_message}`);
          if (job.error_details) console.log(`        ❌ Details: ${JSON.stringify(job.error_details, null, 2)}`);
        });
      }
      
      // Analysis
      console.log('\n🔍 Analysis:');
      const hasProcessingJob = jobs.length > 0;
      const hasCompletedJob = jobs.some(job => job.status === 'completed');
      const hasFailedJob = jobs.some(job => job.status === 'failed');
      const hasThumbnails = thumbnails.length > 0;
      const hasAnalysis = !!(file.summary || file.generated_title || (file.auto_tags && file.auto_tags.length > 0));
      
      console.log(`   Processing Job: ${hasProcessingJob ? '✅' : '❌'}`);
      console.log(`   Completed Job: ${hasCompletedJob ? '✅' : '❌'}`);
      console.log(`   Failed Job: ${hasFailedJob ? '⚠️' : '✅'}`);
      console.log(`   Thumbnails: ${hasThumbnails ? '✅' : '❌'}`);
      console.log(`   AI Analysis: ${hasAnalysis ? '✅' : '❌'}`);
      
      if (!hasProcessingJob) {
        console.log('   🔧 Issue: No processing job was created for this image');
      } else if (hasFailedJob) {
        console.log('   🔧 Issue: Processing job failed - check error details above');
      } else if (!hasCompletedJob) {
        console.log('   🔧 Issue: Processing job is still running or stuck');
      } else if (!hasThumbnails) {
        console.log('   🔧 Issue: Processing completed but no thumbnails were created');
      }
      
      console.log('\n' + '─'.repeat(80));
    }
    
    // Check thumbnail directory
    console.log('\n📁 Checking thumbnail directory...');
    const fs = require('fs');
    const path = require('path');
    const thumbnailDir = path.join(process.cwd(), 'uploads', 'thumbnails');
    
    if (fs.existsSync(thumbnailDir)) {
      const thumbnailFiles = fs.readdirSync(thumbnailDir);
      console.log(`   ✅ Thumbnail directory exists with ${thumbnailFiles.length} files`);
      if (thumbnailFiles.length > 0) {
        console.log('   Recent thumbnail files:');
        thumbnailFiles.slice(0, 5).forEach((filename, i) => {
          const filePath = path.join(thumbnailDir, filename);
          const stats = fs.statSync(filePath);
          console.log(`     ${i+1}. ${filename} (${(stats.size / 1024).toFixed(1)} KB, ${stats.mtime.toISOString()})`);
        });
      }
    } else {
      console.log('   ❌ Thumbnail directory does not exist');
    }
    
  } catch (error) {
    console.error('❌ Error checking image thumbnails:', error);
    console.error(error.stack);
  }
}

if (require.main === module) {
  checkImageThumbnails().then(() => {
    console.log('\n✅ Image thumbnail check completed');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { checkImageThumbnails };
