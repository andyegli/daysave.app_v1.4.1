'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('Updating subscription plans with suggested usage limits...');

    /**
     * SUGGESTED USAGE LIMITS FOR EACH PLAN
     * 
     * These limits are based on:
     * - Current AI pricing: ~$0.25 per 1K tokens for GPT-4o-mini
     * - Storage pricing: ~$0.02 per GB per month
     * - Plan pricing tiers and expected usage patterns
     * 
     * Philosophy:
     * - Free: Generous enough for evaluation, limited enough to encourage upgrades
     * - Small: Good for individuals and small businesses
     * - Medium: Suitable for growing businesses with regular AI usage
     * - Large: For power users and medium enterprises
     * - Unlimited: True enterprise usage with high limits
     */

    try {
      // Update Free Plan ($0/month)
      const freeResult = await queryInterface.sequelize.query(
        `UPDATE subscription_plans SET 
          max_ai_tokens_per_month = 50000,
          max_ai_cost_per_month_usd = 3.0000,
          max_storage_cost_per_month_usd = 1.0000,
          max_total_cost_per_month_usd = 4.0000,
          usage_alerts_enabled = true,
          usage_alert_threshold_percent = 75
         WHERE name = 'free'`
      );

      // Update Small Plan ($9.99/month)
      const smallResult = await queryInterface.sequelize.query(
        `UPDATE subscription_plans SET 
          max_ai_tokens_per_month = 200000,
          max_ai_cost_per_month_usd = 15.0000,
          max_storage_cost_per_month_usd = 5.0000,
          max_total_cost_per_month_usd = 20.0000,
          usage_alerts_enabled = true,
          usage_alert_threshold_percent = 80
         WHERE name = 'small'`
      );

      // Update Medium Plan ($29.99/month)
      const mediumResult = await queryInterface.sequelize.query(
        `UPDATE subscription_plans SET 
          max_ai_tokens_per_month = 800000,
          max_ai_cost_per_month_usd = 60.0000,
          max_storage_cost_per_month_usd = 15.0000,
          max_total_cost_per_month_usd = 75.0000,
          usage_alerts_enabled = true,
          usage_alert_threshold_percent = 85
         WHERE name = 'medium'`
      );

      // Update Large Plan ($79.99/month)
      const largeResult = await queryInterface.sequelize.query(
        `UPDATE subscription_plans SET 
          max_ai_tokens_per_month = 2000000,
          max_ai_cost_per_month_usd = 160.0000,
          max_storage_cost_per_month_usd = 40.0000,
          max_total_cost_per_month_usd = 200.0000,
          usage_alerts_enabled = true,
          usage_alert_threshold_percent = 90
         WHERE name = 'large'`
      );

      // Update Unlimited Plan ($199.99/month)
      const unlimitedResult = await queryInterface.sequelize.query(
        `UPDATE subscription_plans SET 
          max_ai_tokens_per_month = -1,
          max_ai_cost_per_month_usd = -1,
          max_storage_cost_per_month_usd = -1,
          max_total_cost_per_month_usd = -1,
          usage_alerts_enabled = true,
          usage_alert_threshold_percent = 95
         WHERE name = 'unlimited'`
      );

      console.log('✅ Updated all subscription plans with usage limits');
      console.log('\n💡 SUGGESTED USAGE LIMITS SUMMARY:');
      console.log('   Free:      50K tokens, $4 total/month');
      console.log('   Small:     200K tokens, $20 total/month');
      console.log('   Medium:    800K tokens, $75 total/month');
      console.log('   Large:     2M tokens, $200 total/month');
      console.log('   Unlimited: No limits');
      console.log('\n🔧 These limits can be adjusted in the admin panel');
    } catch (error) {
      console.error('Error updating subscription plans:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('Reverting subscription plan usage limits...');
    
    // Reset all plans to default values
    await queryInterface.bulkUpdate('subscription_plans', {
      max_ai_tokens_per_month: 10000,
      max_ai_cost_per_month_usd: 1.0000,
      max_storage_cost_per_month_usd: 1.0000,
      max_total_cost_per_month_usd: 2.0000,
      usage_alerts_enabled: true,
      usage_alert_threshold_percent: 80
    }, {
      where: {}
    });
    
    console.log('✅ Reset all subscription plans to default limits');
  }
};
