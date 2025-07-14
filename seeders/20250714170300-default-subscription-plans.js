'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { v4: uuidv4 } = require('uuid');
    const now = new Date();

    await queryInterface.bulkInsert('subscription_plans', [
      {
        id: uuidv4(),
        name: 'free',
        display_name: 'Free',
        description: 'Basic features for personal use',
        price_monthly: 0.00,
        price_yearly: 0.00,
        max_file_uploads: 5,
        max_file_size_mb: 5,
        max_api_keys: 1,
        max_api_requests_per_hour: 50,
        max_content_items: 25,
        max_contacts: 10,
        max_storage_gb: 1,
        ai_analysis_enabled: true,
        premium_support: false,
        advanced_analytics: false,
        custom_integrations: false,
        is_active: true,
        sort_order: 1,
        is_default: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'small',
        display_name: 'Small',
        description: 'Perfect for small businesses and growing teams',
        price_monthly: 9.99,
        price_yearly: 99.99,
        max_file_uploads: 20,
        max_file_size_mb: 25,
        max_api_keys: 3,
        max_api_requests_per_hour: 200,
        max_content_items: 100,
        max_contacts: 50,
        max_storage_gb: 5,
        ai_analysis_enabled: true,
        premium_support: true,
        advanced_analytics: true,
        custom_integrations: false,
        is_active: true,
        sort_order: 2,
        is_default: false,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'medium',
        display_name: 'Medium',
        description: 'Ideal for medium-sized businesses with advanced needs',
        price_monthly: 29.99,
        price_yearly: 299.99,
        max_file_uploads: 50,
        max_file_size_mb: 100,
        max_api_keys: 10,
        max_api_requests_per_hour: 500,
        max_content_items: 500,
        max_contacts: 250,
        max_storage_gb: 20,
        ai_analysis_enabled: true,
        premium_support: true,
        advanced_analytics: true,
        custom_integrations: true,
        is_active: true,
        sort_order: 3,
        is_default: false,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'large',
        display_name: 'Large',
        description: 'Comprehensive solution for large organizations',
        price_monthly: 79.99,
        price_yearly: 799.99,
        max_file_uploads: 200,
        max_file_size_mb: 500,
        max_api_keys: 25,
        max_api_requests_per_hour: 2000,
        max_content_items: 2000,
        max_contacts: 1000,
        max_storage_gb: 100,
        ai_analysis_enabled: true,
        premium_support: true,
        advanced_analytics: true,
        custom_integrations: true,
        is_active: true,
        sort_order: 4,
        is_default: false,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'unlimited',
        display_name: 'Unlimited',
        description: 'Enterprise-grade solution with unlimited resources',
        price_monthly: 199.99,
        price_yearly: 1999.99,
        max_file_uploads: -1, // -1 represents unlimited
        max_file_size_mb: 1000,
        max_api_keys: -1,
        max_api_requests_per_hour: -1,
        max_content_items: -1,
        max_contacts: -1,
        max_storage_gb: -1,
        ai_analysis_enabled: true,
        premium_support: true,
        advanced_analytics: true,
        custom_integrations: true,
        is_active: true,
        sort_order: 5,
        is_default: false,
        created_at: now,
        updated_at: now
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('subscription_plans', null, {});
  }
}; 