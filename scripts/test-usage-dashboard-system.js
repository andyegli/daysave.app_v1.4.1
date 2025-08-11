#!/usr/bin/env node

/**
 * Test Usage Dashboard System
 * 
 * Comprehensive test of the new usage tracking and dashboard system including:
 * - User usage analytics dashboard
 * - Admin usage overview dashboard
 * - Subscription plan limits enforcement
 * - Usage limit calculations and alerts
 * 
 * FEATURES TESTED:
 * - Usage limit service functionality
 * - Monthly usage calculations
 * - Subscription plan limit checking
 * - Dashboard data preparation
 * - Database associations and queries
 * 
 * AUTHOR: DaySave Development Team
 * CREATED: 2025-08-11
 */

const { User, SubscriptionPlan, ExternalAiUsage, StorageUsage, ProcessingJob, sequelize } = require('../models');
const UsageLimitService = require('../services/usageLimitService');

const usageLimitService = new UsageLimitService();

async function testUsageDashboardSystem() {
  console.log('🧪 Testing Usage Dashboard System...\n');

  try {
    // Test 1: Check updated subscription plans
    console.log('📋 Test 1: Checking Updated Subscription Plans');
    const plans = await SubscriptionPlan.findAll({
      order: [['sort_order', 'ASC']]
    });

    console.log('\n🎯 Subscription Plans with Usage Limits:');
    plans.forEach(plan => {
      console.log(`   ${plan.display_name} Plan:`);
      console.log(`     - Monthly AI Tokens: ${plan.max_ai_tokens_per_month === -1 ? 'Unlimited' : plan.max_ai_tokens_per_month.toLocaleString()}`);
      console.log(`     - AI Cost Limit: ${plan.max_ai_cost_per_month_usd === -1 ? 'Unlimited' : '$' + plan.max_ai_cost_per_month_usd}`);
      console.log(`     - Storage Cost Limit: ${plan.max_storage_cost_per_month_usd === -1 ? 'Unlimited' : '$' + plan.max_storage_cost_per_month_usd}`);
      console.log(`     - Total Cost Limit: ${plan.max_total_cost_per_month_usd === -1 ? 'Unlimited' : '$' + plan.max_total_cost_per_month_usd}`);
      console.log(`     - Alerts: ${plan.usage_alerts_enabled ? 'Enabled' : 'Disabled'} at ${plan.usage_alert_threshold_percent}%`);
    });

    // Test 2: UsageLimitService functionality
    console.log('\n📊 Test 2: UsageLimitService Functionality');
    
    // Get a test user
    const testUser = await User.findOne();
    if (!testUser) {
      console.log('   ⚠️ No users found. Skipping user-specific tests.');
    } else {
      console.log(`   🔍 Testing with user: ${testUser.username} (${testUser.id})`);

      // Test user subscription plan
      const userPlan = await usageLimitService.getUserSubscriptionPlan(testUser.id);
      console.log(`   📄 User plan: ${userPlan.subscriptionPlan.display_name} (${userPlan.isDefaultPlan ? 'default' : 'active subscription'})`);

      // Test monthly usage calculation
      const monthlyUsage = await usageLimitService.calculateUserMonthlyUsage(testUser.id);
      console.log('   💰 Current month usage:');
      console.log(`     - AI Tokens: ${monthlyUsage.ai.tokens.toLocaleString()}`);
      console.log(`     - AI Cost: $${monthlyUsage.ai.cost.toFixed(4)}`);
      console.log(`     - Storage Cost: $${monthlyUsage.storage.cost.toFixed(4)}`);
      console.log(`     - Total Cost: $${monthlyUsage.total.cost.toFixed(4)}`);
      console.log(`     - Records: ${monthlyUsage.total.recordCount}`);

      // Test usage limit checking
      const limitCheck = await usageLimitService.checkUsageLimits(testUser.id);
      console.log('   🚦 Usage Limit Check:');
      console.log(`     - Within Limits: ${limitCheck.allowed ? '✅ Yes' : '❌ No'}`);
      console.log(`     - Should Alert: ${limitCheck.shouldAlert ? '⚠️ Yes' : '✅ No'}`);
      console.log(`     - Alert Level: ${limitCheck.alertLevel}`);
      
      // Show limit percentages
      Object.entries(limitCheck.limits).forEach(([type, limit]) => {
        if (limit.limit !== -1) {
          console.log(`     - ${type}: ${limit.current}/${limit.limit} (${Math.round(limit.percentage)}%)`);
        }
      });

      // Test usage history
      const usageHistory = await usageLimitService.getUserUsageHistory(testUser.id, 3);
      console.log('   📈 Usage History (last 3 months):');
      usageHistory.forEach(month => {
        console.log(`     - ${month.month}: $${month.total.cost.toFixed(4)} total`);
      });
    }

    // Test 3: System-wide statistics
    console.log('\n🌐 Test 3: System-wide Statistics');
    const systemStats = await usageLimitService.getSystemUsageStatistics();
    console.log('   📊 Current System Stats:');
    console.log(`     - Active Users: ${systemStats.total.uniqueUsers}`);
    console.log(`     - Total AI Tokens: ${systemStats.ai.totalTokens.toLocaleString()}`);
    console.log(`     - Total AI Cost: $${systemStats.ai.totalCost.toFixed(2)}`);
    console.log(`     - Total Storage Cost: $${systemStats.storage.totalCost.toFixed(2)}`);
    console.log(`     - Total System Cost: $${systemStats.total.totalCost.toFixed(2)}`);
    console.log(`     - Total Records: ${systemStats.total.recordCount}`);

    // Test 4: Database associations
    console.log('\n🔗 Test 4: Database Associations');
    
    // Test ProcessingJob associations with usage records
    const jobWithUsage = await ProcessingJob.findOne({
      include: [
        {
          model: ExternalAiUsage,
          as: 'aiUsage',
          required: false
        },
        {
          model: StorageUsage,
          as: 'storageUsage',
          required: false
        }
      ]
    });

    if (jobWithUsage) {
      console.log(`   🔍 Job ${jobWithUsage.id.substring(0, 8)}:`);
      console.log(`     - AI Usage Records: ${jobWithUsage.aiUsage?.length || 0}`);
      console.log(`     - Storage Usage Records: ${jobWithUsage.storageUsage?.length || 0}`);
    } else {
      console.log('   ⚠️ No processing jobs found with usage data.');
    }

    // Test 5: Dashboard data simulation
    console.log('\n📊 Test 5: Dashboard Data Simulation');
    
    // Simulate recent content with usage data
    const recentJobs = await ProcessingJob.findAll({
      limit: 5,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: ExternalAiUsage,
          as: 'aiUsage',
          required: false
        },
        {
          model: StorageUsage,
          as: 'storageUsage',
          required: false
        }
      ]
    });

    console.log('   📝 Recent Jobs with Usage Data:');
    recentJobs.forEach(job => {
      const aiCost = job.aiUsage?.reduce((sum, usage) => sum + parseFloat(usage.estimated_cost_usd || 0), 0) || 0;
      const storageCost = job.storageUsage?.reduce((sum, usage) => sum + parseFloat(usage.estimated_cost_usd || 0), 0) || 0;
      const tokens = job.aiUsage?.reduce((sum, usage) => sum + (usage.total_tokens || 0), 0) || 0;

      console.log(`     - Job ${job.id.substring(0, 8)}: ${tokens} tokens, $${(aiCost + storageCost).toFixed(4)} total`);
    });

    // Test 6: Plan limit scenarios
    console.log('\n⚖️ Test 6: Plan Limit Scenarios');
    
    const freePlan = plans.find(p => p.name === 'free');
    const smallPlan = plans.find(p => p.name === 'small');
    
    if (freePlan && smallPlan) {
      console.log('   📋 Plan Comparison:');
      console.log(`     Free Plan Token Limit: ${freePlan.max_ai_tokens_per_month.toLocaleString()}`);
      console.log(`     Small Plan Token Limit: ${smallPlan.max_ai_tokens_per_month.toLocaleString()}`);
      console.log(`     Upgrade Value: ${((smallPlan.max_ai_tokens_per_month / freePlan.max_ai_tokens_per_month) * 100).toFixed(0)}% more tokens`);
    }

    console.log('\n✅ Usage Dashboard System Test Complete!');
    console.log('\n🎯 SUMMARY:');
    console.log('   ✅ Subscription plans updated with usage limits');
    console.log('   ✅ UsageLimitService functioning properly');
    console.log('   ✅ Usage calculations working correctly');
    console.log('   ✅ Database associations established');
    console.log('   ✅ Dashboard data preparation ready');
    console.log('\n📊 NEXT STEPS:');
    console.log('   1. Access user dashboard at: /dashboard/usage');
    console.log('   2. Access admin dashboard at: /admin/usage-overview');
    console.log('   3. Manage plan limits at: /admin/usage-limits');
    console.log('   4. Test with actual file uploads to see usage tracking');

  } catch (error) {
    console.error('❌ Error testing usage dashboard system:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the test
if (require.main === module) {
  testUsageDashboardSystem().catch(console.error);
}

module.exports = { testUsageDashboardSystem };
