'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('Adding usage limits to subscription_plans table...');
    
    // Add new columns for AI usage and cost limits
    await queryInterface.addColumn('subscription_plans', 'max_ai_tokens_per_month', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 10000,
      comment: 'Maximum AI tokens allowed per month (-1 for unlimited)'
    });

    await queryInterface.addColumn('subscription_plans', 'max_ai_cost_per_month_usd', {
      type: Sequelize.DECIMAL(10, 4),
      allowNull: false,
      defaultValue: 1.0000,
      comment: 'Maximum AI costs allowed per month in USD (-1 for unlimited)'
    });

    await queryInterface.addColumn('subscription_plans', 'max_storage_cost_per_month_usd', {
      type: Sequelize.DECIMAL(10, 4),
      allowNull: false,
      defaultValue: 1.0000,
      comment: 'Maximum storage costs allowed per month in USD (-1 for unlimited)'
    });

    await queryInterface.addColumn('subscription_plans', 'max_total_cost_per_month_usd', {
      type: Sequelize.DECIMAL(10, 4),
      allowNull: false,
      defaultValue: 2.0000,
      comment: 'Maximum total costs (AI + Storage) allowed per month in USD (-1 for unlimited)'
    });

    await queryInterface.addColumn('subscription_plans', 'usage_alerts_enabled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether to send usage alerts to users'
    });

    await queryInterface.addColumn('subscription_plans', 'usage_alert_threshold_percent', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 80,
      comment: 'Percentage of limit at which to send usage alerts'
    });

    console.log('✅ Added usage limit columns to subscription_plans');
  },

  async down(queryInterface, Sequelize) {
    console.log('Removing usage limits from subscription_plans table...');
    
    await queryInterface.removeColumn('subscription_plans', 'max_ai_tokens_per_month');
    await queryInterface.removeColumn('subscription_plans', 'max_ai_cost_per_month_usd');
    await queryInterface.removeColumn('subscription_plans', 'max_storage_cost_per_month_usd');
    await queryInterface.removeColumn('subscription_plans', 'max_total_cost_per_month_usd');
    await queryInterface.removeColumn('subscription_plans', 'usage_alerts_enabled');
    await queryInterface.removeColumn('subscription_plans', 'usage_alert_threshold_percent');
    
    console.log('✅ Removed usage limit columns from subscription_plans');
  }
};
