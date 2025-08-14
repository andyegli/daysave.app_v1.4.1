#!/usr/bin/env node

/**
 * Test Usage Tracking Script
 * 
 * Tests and verifies that both AI usage and storage usage tracking are working correctly
 * for different file types and content processing scenarios.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Database models
const { ExternalAiUsage, StorageUsage, sequelize } = require('../models');

async function testUsageTracking() {
  try {
    console.log('🔍 Testing Usage Tracking System...\n');
    
    // Check current counts
    const initialAiCount = await ExternalAiUsage.count();
    const initialStorageCount = await StorageUsage.count();
    
    console.log(`📊 Current Database State:`);
    console.log(`   AI Usage Records: ${initialAiCount}`);
    console.log(`   Storage Usage Records: ${initialStorageCount}\n`);
    
    // Check for today's records
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const todayAiUsage = await ExternalAiUsage.findAll({
      where: {
        createdAt: {
          [sequelize.Sequelize.Op.gte]: todayStart
        }
      },
      order: [['createdAt', 'DESC']],
      limit: 10
    });
    
    const todayStorageUsage = await StorageUsage.findAll({
      where: {
        createdAt: {
          [sequelize.Sequelize.Op.gte]: todayStart
        }
      },
      order: [['createdAt', 'DESC']],
      limit: 10
    });
    
    console.log(`📈 Today's Activity:`);
    console.log(`   AI Usage Records Today: ${todayAiUsage.length}`);
    console.log(`   Storage Usage Records Today: ${todayStorageUsage.length}\n`);
    
    if (todayAiUsage.length > 0) {
      console.log(`🤖 Recent AI Usage:`);
      for (const usage of todayAiUsage) {
        console.log(`   - ${usage.ai_provider}/${usage.ai_model} - ${usage.operation_type}`);
        console.log(`     User: ${usage.user_id}, Cost: $${usage.estimated_cost_usd}`);
        console.log(`     Tokens: ${usage.input_tokens}+${usage.output_tokens}=${usage.total_tokens}`);
        console.log(`     Time: ${usage.createdAt.toISOString()}\n`);
      }
    }
    
    if (todayStorageUsage.length > 0) {
      console.log(`💾 Recent Storage Usage:`);
      for (const usage of todayStorageUsage) {
        console.log(`   - ${usage.storage_provider} - ${usage.operation_type}`);
        console.log(`     User: ${usage.user_id}, Size: ${usage.file_size_bytes} bytes`);
        console.log(`     Cost: $${usage.estimated_cost_usd}, File: ${usage.object_name}`);
        console.log(`     Time: ${usage.createdAt.toISOString()}\n`);
      }
    }
    
    // Check for any tracking errors in recent records
    const recentErrors = await ExternalAiUsage.findAll({
      where: {
        success: false,
        createdAt: {
          [sequelize.Sequelize.Op.gte]: todayStart
        }
      }
    });
    
    if (recentErrors.length > 0) {
      console.log(`❌ AI Usage Tracking Errors Today: ${recentErrors.length}`);
      for (const error of recentErrors) {
        console.log(`   - ${error.error_message}`);
      }
    }
    
    // Cost Summary
    if (todayAiUsage.length > 0) {
      const totalAiCost = todayAiUsage.reduce((sum, usage) => 
        sum + parseFloat(usage.estimated_cost_usd), 0);
      console.log(`💰 Total AI Cost Today: $${totalAiCost.toFixed(6)}`);
    }
    
    if (todayStorageUsage.length > 0) {
      const totalStorageCost = todayStorageUsage.reduce((sum, usage) => 
        sum + parseFloat(usage.estimated_cost_usd), 0);
      console.log(`💰 Total Storage Cost Today: $${totalStorageCost.toFixed(6)}`);
    }
    
    console.log('\n✅ Usage tracking test completed!');
    console.log('\n💡 To test tracking:');
    console.log('   1. Upload an image file through the web interface');
    console.log('   2. Submit a content URL for processing');
    console.log('   3. Run this script again to see new records');
    
  } catch (error) {
    console.error('❌ Usage tracking test failed:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the test
if (require.main === module) {
  testUsageTracking();
}

module.exports = { testUsageTracking };
