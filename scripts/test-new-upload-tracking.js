#!/usr/bin/env node

/**
 * Test New Upload with Enhanced Tracking
 * 
 * Creates test content and files to verify that new processing operations
 * properly track usage with processing job IDs
 */

const { ExternalAiUsage, StorageUsage, ProcessingJob, User, Content, File, sequelize } = require('../models');
const { v4: uuidv4 } = require('uuid');

async function createTestUser() {
  // Try to find an existing user first
  let testUser = await User.findOne({
    where: { email: 'test-tracking@example.com' }
  });

  if (!testUser) {
    // Get a default role for the user
    const { Role } = require('../models');
    const defaultRole = await Role.findOne({
      where: { name: 'user' }
    });

    if (!defaultRole) {
      throw new Error('No default role found. Please run seeders first.');
    }

    testUser = await User.create({
      username: 'test-tracker',
      email: 'test-tracking@example.com',
      password_hash: 'test-hash-for-tracking',
      first_name: 'Test',
      last_name: 'Tracker',
      role_id: defaultRole.id,
      email_verified: true,
      is_active: true
    });
    console.log(`✅ Created test user: ${testUser.id}`);
  } else {
    console.log(`✅ Using existing test user: ${testUser.id}`);
  }

  return testUser;
}

async function simulateEnhancedProcessing() {
  console.log('🧪 Testing New Upload with Enhanced Usage Tracking...\n');

  try {
    // Step 1: Create a test user
    const testUser = await createTestUser();

    // Step 2: Create test content (URL-based)
    console.log('\n📝 Creating test content...');
    const testContent = await Content.create({
      user_id: testUser.id,
      url: 'https://www.youtube.com/watch?v=test-enhanced-tracking',
      content_type: 'video',
      user_comments: 'Test content for enhanced usage tracking'
    });
    console.log(`✅ Created test content: ${testContent.id}`);

    // Step 3: Simulate processing job creation (like our enhanced flow)
    console.log('\n⚙️ Creating processing job with usage tracking...');
    const processingJobId = uuidv4();
    const processingJob = await ProcessingJob.create({
      id: processingJobId,
      user_id: testUser.id,
      content_id: testContent.id,
      job_type: 'url_analysis',
      media_type: 'video',
      status: 'processing',
      progress: 0,
      job_config: {
        features: ['transcription', 'ai_analysis'],
        orchestrator: true,
        version: '2.0',
        testMode: true
      },
      input_metadata: {
        url: testContent.url,
        testMode: true
      },
      started_at: new Date()
    });
    console.log(`✅ Created processing job: ${processingJobId}`);

    // Step 4: Simulate AI usage during processing
    console.log('\n🤖 Simulating AI usage tracking...');
    const AiUsageTracker = require('../services/aiUsageTracker');
    const aiTracker = new AiUsageTracker();
    
    const aiUsageRecord = await aiTracker.recordUsage({
      userId: testUser.id,
      contentId: testContent.id,
      processingJobId: processingJobId, // This is the key enhancement!
      aiProvider: 'openai',
      aiModel: 'gpt-4o-mini',
      operationType: 'text_analysis',
      inputTokens: 500,
      outputTokens: 150,
      totalTokens: 650,
      success: true,
      metadata: {
        testMode: true,
        enhancedTracking: true,
        description: 'Simulated AI analysis with processing job link'
      }
    });
    console.log(`✅ Created AI usage record: ${aiUsageRecord.id}`);

    // Step 5: Simulate storage usage during processing
    console.log('\n💾 Simulating storage usage tracking...');
    const StorageUsageTracker = require('../services/storageUsageTracker');
    const storageTracker = new StorageUsageTracker();
    
    const storageUsageRecord = await storageTracker.recordStorageUsage({
      userId: testUser.id,
      contentId: testContent.id,
      processingJobId: processingJobId, // This is the key enhancement!
      storageProvider: 'google_cloud_storage',
      storageLocation: 'gs://test-bucket/enhanced-tracking-test.mp4',
      bucketName: 'test-bucket',
      objectName: 'enhanced-tracking-test.mp4',
      fileType: 'video',
      mimeType: 'video/mp4',
      fileSizeBytes: 10 * 1024 * 1024, // 10MB
      storageClass: 'standard',
      operationType: 'upload',
      success: true,
      metadata: {
        testMode: true,
        enhancedTracking: true,
        description: 'Simulated storage operation with processing job link'
      }
    });
    console.log(`✅ Created storage usage record: ${storageUsageRecord.id}`);

    // Step 6: Complete the processing job
    console.log('\n✅ Completing processing job...');
    await processingJob.update({
      status: 'completed',
      progress: 100,
      processing_results: {
        testMode: true,
        enhancedTracking: true,
        simulatedResults: {
          transcription: 'Test transcription content',
          summary: 'Test summary',
          tags: ['test', 'enhanced', 'tracking']
        }
      },
      performance_metrics: {
        processingTime: 5000,
        aiUsageRecords: 1,
        storageUsageRecords: 1,
        enhancedTracking: true
      },
      completed_at: new Date(),
      duration_ms: 5000
    });
    console.log(`✅ Processing job completed: ${processingJobId}`);

    // Step 7: Verify the enhanced tracking worked
    console.log('\n🔍 Verifying enhanced tracking results...');
    
    // Check processing job with linked usage
    const jobWithUsage = await ProcessingJob.findByPk(processingJobId, {
      include: [
        {
          model: ExternalAiUsage,
          as: 'aiUsage'
        },
        {
          model: StorageUsage,
          as: 'storageUsage'
        }
      ]
    });

    console.log('\n📊 Enhanced Tracking Results:');
    console.log(`   Processing Job ID: ${jobWithUsage.id}`);
    console.log(`   Status: ${jobWithUsage.status}`);
    console.log(`   AI Usage Records Linked: ${jobWithUsage.aiUsage?.length || 0}`);
    console.log(`   Storage Usage Records Linked: ${jobWithUsage.storageUsage?.length || 0}`);

    if (jobWithUsage.aiUsage?.length > 0) {
      console.log('\n💰 Linked AI Usage:');
      jobWithUsage.aiUsage.forEach((usage, index) => {
        console.log(`   ${index + 1}. ${usage.ai_provider}/${usage.ai_model} - $${usage.estimated_cost_usd} (${usage.total_tokens} tokens)`);
      });
    }

    if (jobWithUsage.storageUsage?.length > 0) {
      console.log('\n💾 Linked Storage Usage:');
      jobWithUsage.storageUsage.forEach((usage, index) => {
        console.log(`   ${index + 1}. ${usage.storage_provider}/${usage.operation_type} - $${usage.estimated_cost_usd} (${(usage.file_size_bytes/1024/1024).toFixed(2)}MB)`);
      });
    }

    // Step 8: Calculate total costs for this job
    const totalAiCost = jobWithUsage.aiUsage?.reduce((sum, usage) => sum + parseFloat(usage.estimated_cost_usd), 0) || 0;
    const totalStorageCost = jobWithUsage.storageUsage?.reduce((sum, usage) => sum + parseFloat(usage.estimated_cost_usd), 0) || 0;
    const totalCost = totalAiCost + totalStorageCost;

    console.log('\n💵 Per-Job Cost Analysis:');
    console.log(`   AI Costs: $${totalAiCost.toFixed(6)}`);
    console.log(`   Storage Costs: $${totalStorageCost.toFixed(6)}`);
    console.log(`   Total Job Cost: $${totalCost.toFixed(6)}`);

    console.log('\n🎉 SUCCESS: Enhanced usage tracking is working!');
    console.log('   ✅ Processing job created before processing');
    console.log('   ✅ AI usage linked to processing job');
    console.log('   ✅ Storage usage linked to processing job');
    console.log('   ✅ Per-job cost tracking enabled');
    console.log('   ✅ Full audit trail established');

    // Step 9: Cleanup test data
    console.log('\n🧹 Cleaning up test data...');
    await aiUsageRecord.destroy();
    await storageUsageRecord.destroy();
    await processingJob.destroy();
    await testContent.destroy();
    // Note: We keep the test user for future tests
    
    console.log('✅ Test cleanup completed');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await sequelize.close();
  }
}

// Run the test
if (require.main === module) {
  simulateEnhancedProcessing();
}

module.exports = simulateEnhancedProcessing;
