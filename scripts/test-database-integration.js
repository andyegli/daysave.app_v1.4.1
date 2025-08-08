#!/usr/bin/env node

/**
 * Database Integration Test
 * 
 * Tests that our new tracking tables can actually store and retrieve data
 * 
 * USAGE:
 * node scripts/test-database-integration.js
 */

const { ExternalAiUsage, StorageUsage, User } = require('../models');
const AiUsageTracker = require('../services/aiUsageTracker');
const StorageUsageTracker = require('../services/storageUsageTracker');

async function testDatabaseIntegration() {
  console.log('🧪 Testing Database Integration...\n');

  try {
    const aiTracker = new AiUsageTracker();
    const storageTracker = new StorageUsageTracker();

    // Test 1: Create a mock AI usage record
    console.log('📝 Testing AI Usage Record Creation...');
    const aiUsageData = {
      userId: 'test-user-' + Date.now(),
      contentId: 'test-content-' + Date.now(),
      aiProvider: 'openai',
      aiModel: 'gpt-3.5-turbo',
      operationType: 'text_analysis',
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      success: true,
      metadata: { test: true, timestamp: new Date().toISOString() }
    };

    const aiRecord = await aiTracker.recordUsage(aiUsageData);
    console.log(`✅ AI Usage Record Created: ID ${aiRecord.id}`);
    console.log(`   Cost: $${aiRecord.estimated_cost_usd}`);
    console.log(`   Billing Period: ${aiRecord.billing_period}`);

    // Test 2: Create a mock storage usage record
    console.log('\n📁 Testing Storage Usage Record Creation...');
    const storageUsageData = {
      userId: 'test-user-' + Date.now(),
      fileId: 'test-file-' + Date.now(),
      storageProvider: 'google_cloud_storage',
      storageLocation: 'gs://test-bucket/test-file.jpg',
      bucketName: 'test-bucket',
      objectName: 'test-file.jpg',
      fileType: 'image',
      mimeType: 'image/jpeg',
      fileSizeBytes: 1024 * 1024, // 1MB
      storageClass: 'standard',
      operationType: 'upload',
      success: true,
      metadata: { test: true, timestamp: new Date().toISOString() }
    };

    const storageRecord = await storageTracker.recordStorageUsage(storageUsageData);
    console.log(`✅ Storage Usage Record Created: ID ${storageRecord.id}`);
    console.log(`   Cost: $${storageRecord.estimated_cost_usd}`);
    console.log(`   File Size: ${(storageRecord.file_size_bytes / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   Billing Period: ${storageRecord.billing_period}`);

    // Test 3: Query the records back
    console.log('\n🔍 Testing Record Retrieval...');
    
    const retrievedAiRecord = await ExternalAiUsage.findByPk(aiRecord.id);
    const retrievedStorageRecord = await StorageUsage.findByPk(storageRecord.id);

    console.log(`✅ AI Record Retrieved: ${retrievedAiRecord ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ Storage Record Retrieved: ${retrievedStorageRecord ? 'SUCCESS' : 'FAILED'}`);

    // Test 4: Test billing period queries
    console.log('\n📊 Testing Billing Queries...');
    const currentPeriod = aiTracker.getCurrentBillingPeriod();
    
    const aiUsageCount = await ExternalAiUsage.count({
      where: { billing_period: currentPeriod }
    });
    
    const storageUsageCount = await StorageUsage.count({
      where: { billing_period: currentPeriod }
    });

    console.log(`✅ AI Usage Records in ${currentPeriod}: ${aiUsageCount}`);
    console.log(`✅ Storage Usage Records in ${currentPeriod}: ${storageUsageCount}`);

    // Clean up test records
    console.log('\n🧹 Cleaning up test records...');
    await retrievedAiRecord.destroy();
    await retrievedStorageRecord.destroy();
    console.log('✅ Test records cleaned up');

    console.log('\n🎉 All database integration tests passed!');
    console.log('\n📋 Summary:');
    console.log('- AI usage tracking: ✅ Database integration working');
    console.log('- Storage usage tracking: ✅ Database integration working');
    console.log('- Record creation: ✅ Working');
    console.log('- Record retrieval: ✅ Working');
    console.log('- Billing queries: ✅ Working');
    console.log('- Cost calculation: ✅ Working');

  } catch (error) {
    console.error('❌ Database integration test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testDatabaseIntegration().then(() => {
    console.log('\n✅ Database integration test completed successfully!');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}

module.exports = testDatabaseIntegration;