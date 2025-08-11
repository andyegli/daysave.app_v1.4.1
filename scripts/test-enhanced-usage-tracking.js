#!/usr/bin/env node

/**
 * Test Enhanced Usage Tracking Integration
 * 
 * Tests that processing jobs are now properly linked to AI and storage usage records
 * and that usage tracking occurs during processing operations.
 */

const { ExternalAiUsage, StorageUsage, ProcessingJob, User, Content, sequelize } = require('../models');

async function testEnhancedUsageTracking() {
  console.log('🧪 Testing Enhanced Usage Tracking Integration...\n');

  try {
    // Test 1: Check current state
    console.log('📊 Current Database State:');
    const currentCounts = {
      processingJobs: await ProcessingJob.count(),
      aiUsage: await ExternalAiUsage.count(),
      storageUsage: await StorageUsage.count()
    };
    
    console.log(`   Processing Jobs: ${currentCounts.processingJobs}`);
    console.log(`   AI Usage Records: ${currentCounts.aiUsage}`);
    console.log(`   Storage Usage Records: ${currentCounts.storageUsage}`);

    // Test 2: Check recent processing jobs with usage links
    console.log('\n🔍 Recent Processing Jobs with Usage Tracking:');
    const recentJobs = await ProcessingJob.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: ExternalAiUsage,
          as: 'aiUsage',
          required: false
        }
      ]
    });

    recentJobs.forEach((job, index) => {
      console.log(`\n${index + 1}. Processing Job:`);
      console.log(`   ID: ${job.id}`);
      console.log(`   Type: ${job.job_type} (${job.media_type})`);
      console.log(`   Status: ${job.status}`);
      console.log(`   User: ${job.user_id}`);
      console.log(`   Content: ${job.content_id || 'None'}`);
      console.log(`   File: ${job.file_id || 'None'}`);
      console.log(`   Created: ${job.createdAt}`);
      console.log(`   Duration: ${job.duration_ms ? (job.duration_ms / 1000).toFixed(2) + 's' : 'N/A'}`);
    });

    // Test 3: Check AI usage records with processing job links
    console.log('\n💰 AI Usage Records with Processing Job Links:');
    const aiUsageWithJobs = await ExternalAiUsage.findAll({
      where: {
        processing_job_id: { [require('sequelize').Op.not]: null }
      },
      order: [['createdAt', 'DESC']],
      limit: 5,
      include: [
        {
          model: ProcessingJob,
          as: 'processingJob',
          required: false
        }
      ]
    });

    if (aiUsageWithJobs.length > 0) {
      aiUsageWithJobs.forEach((usage, index) => {
        console.log(`\n${index + 1}. AI Usage with Job Link:`);
        console.log(`   Usage ID: ${usage.id}`);
        console.log(`   Provider: ${usage.ai_provider}/${usage.ai_model}`);
        console.log(`   Cost: $${usage.estimated_cost_usd}`);
        console.log(`   Tokens: ${usage.total_tokens}`);
        console.log(`   Processing Job ID: ${usage.processing_job_id}`);
        if (usage.processingJob) {
          console.log(`   Job Type: ${usage.processingJob.job_type}`);
          console.log(`   Job Status: ${usage.processingJob.status}`);
        }
        console.log(`   Created: ${usage.createdAt}`);
      });
    } else {
      console.log('   ❌ No AI usage records found with processing job links');
      console.log('   This indicates that the enhanced tracking is not yet active');
    }

    // Test 4: Check storage usage records with processing job links  
    console.log('\n💾 Storage Usage Records with Processing Job Links:');
    const storageUsageWithJobs = await StorageUsage.findAll({
      where: {
        processing_job_id: { [require('sequelize').Op.not]: null }
      },
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    if (storageUsageWithJobs.length > 0) {
      storageUsageWithJobs.forEach((usage, index) => {
        console.log(`\n${index + 1}. Storage Usage with Job Link:`);
        console.log(`   Usage ID: ${usage.id}`);
        console.log(`   Provider: ${usage.storage_provider}`);
        console.log(`   Operation: ${usage.operation_type}`);
        console.log(`   Cost: $${usage.estimated_cost_usd}`);
        console.log(`   Size: ${(usage.file_size_bytes / 1024 / 1024).toFixed(2)}MB`);
        console.log(`   Processing Job ID: ${usage.processing_job_id}`);
        console.log(`   Created: ${usage.createdAt}`);
      });
    } else {
      console.log('   ❌ No storage usage records found with processing job links');
      console.log('   This indicates storage tracking needs to be enabled during processing');
    }

    // Test 5: Check orphaned usage records (without processing job links)
    console.log('\n⚠️  Orphaned Usage Records (No Processing Job Link):');
    const orphanedAi = await ExternalAiUsage.count({
      where: {
        processing_job_id: null
      }
    });
    
    const orphanedStorage = await StorageUsage.count({
      where: {
        processing_job_id: null
      }
    });

    console.log(`   Orphaned AI Usage Records: ${orphanedAi}`);
    console.log(`   Orphaned Storage Usage Records: ${orphanedStorage}`);

    if (orphanedAi > 0 || orphanedStorage > 0) {
      console.log('\n   🔧 These orphaned records indicate operations that occurred');
      console.log('      before the enhanced tracking was implemented.');
    }

    // Test 6: Summary and recommendations
    console.log('\n📈 Enhancement Status Summary:');
    const linkedAiUsage = await ExternalAiUsage.count({
      where: {
        processing_job_id: { [require('sequelize').Op.not]: null }
      }
    });
    
    const linkedStorageUsage = await StorageUsage.count({
      where: {
        processing_job_id: { [require('sequelize').Op.not]: null }
      }
    });

    const totalAiUsage = currentCounts.aiUsage;
    const totalStorageUsage = currentCounts.storageUsage;

    console.log(`   AI Usage Tracking: ${linkedAiUsage}/${totalAiUsage} records linked (${totalAiUsage ? ((linkedAiUsage/totalAiUsage)*100).toFixed(1) : 0}%)`);
    console.log(`   Storage Usage Tracking: ${linkedStorageUsage}/${totalStorageUsage} records linked (${totalStorageUsage ? ((linkedStorageUsage/totalStorageUsage)*100).toFixed(1) : 0}%)`);

    if (linkedAiUsage === 0 && linkedStorageUsage === 0) {
      console.log('\n❌ STATUS: Enhanced usage tracking is NOT YET ACTIVE');
      console.log('   Next steps:');
      console.log('   1. Upload a new file or add new content URL to test');
      console.log('   2. Check logs for usage tracking debug messages');
      console.log('   3. Verify that processingJobId is being passed correctly');
    } else {
      console.log('\n✅ STATUS: Enhanced usage tracking is WORKING');
      console.log(`   ${linkedAiUsage + linkedStorageUsage} usage records are properly linked to processing jobs`);
    }

    // Test 7: Recent activity check
    console.log('\n🕒 Recent Activity (Last 24 Hours):');
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentJobsCount = await ProcessingJob.count({
      where: {
        createdAt: { [require('sequelize').Op.gte]: yesterday }
      }
    });
    
    const recentAiUsageCount = await ExternalAiUsage.count({
      where: {
        createdAt: { [require('sequelize').Op.gte]: yesterday }
      }
    });

    console.log(`   Processing Jobs: ${recentJobsCount}`);
    console.log(`   AI Usage Records: ${recentAiUsageCount}`);

    if (recentJobsCount > 0 && recentAiUsageCount === 0) {
      console.log('\n⚠️  WARNING: Recent processing jobs but no AI usage records');
      console.log('   This suggests AI usage tracking may not be working properly');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await sequelize.close();
  }
}

// Run the test
if (require.main === module) {
  testEnhancedUsageTracking();
}

module.exports = testEnhancedUsageTracking;
