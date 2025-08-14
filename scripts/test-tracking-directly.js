#!/usr/bin/env node

/**
 * Direct Test of Usage Tracking Services
 * 
 * Tests the tracking services directly to ensure they work correctly
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const AiUsageTracker = require('../services/aiUsageTracker');
const StorageUsageTracker = require('../services/storageUsageTracker');

async function testTrackingDirectly() {
  try {
    console.log('🧪 Testing Usage Tracking Services Directly...\n');

    // Test AI Usage Tracker
    console.log('1️⃣ Testing AI Usage Tracker...');
    const aiTracker = new AiUsageTracker();
    
    const testAiUsage = await aiTracker.trackOpenAIUsage({
      userId: 'test-user-123',
      fileId: 'test-file-456',
      contentId: 'test-content-789',
      model: 'gpt-4',
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      operationType: 'title_generation',
      cost: 0.0045,
      processingJobId: 'test-job-101',
      sessionId: 'test-session-202',
      requestDuration: 1500
    });
    console.log('✅ AI Usage Tracker Test Result:', testAiUsage ? 'SUCCESS' : 'FAILED');

    // Test Storage Usage Tracker
    console.log('\n2️⃣ Testing Storage Usage Tracker...');
    const storageTracker = new StorageUsageTracker();
    
    const testStorageUsage = await storageTracker.trackFileUpload({
      userId: 'test-user-123',
      fileId: 'test-file-456',
      filename: 'test-image.jpg',
      originalSize: 2048576, // 2MB
      compressedSize: 1024000, // ~1MB
      storageType: 'google_cloud',
      compressionUsed: true,
      uploadDuration: 3000
    });
    console.log('✅ Storage Usage Tracker Test Result:', testStorageUsage ? 'SUCCESS' : 'FAILED');

    // Check database
    const { ExternalAiUsage, StorageUsage } = require('../models');
    const aiCount = await ExternalAiUsage.count();
    const storageCount = await StorageUsage.count();
    
    console.log('\n📊 Database State After Test:');
    console.log(`   AI Usage Records: ${aiCount}`);
    console.log(`   Storage Usage Records: ${storageCount}`);

    console.log('\n✅ Direct tracking test completed!');

  } catch (error) {
    console.error('❌ Error testing tracking services:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    process.exit(0);
  }
}

testTrackingDirectly();
