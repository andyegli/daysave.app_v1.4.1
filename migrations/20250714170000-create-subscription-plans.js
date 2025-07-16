'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('subscription_plans', {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      display_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      price_monthly: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      price_yearly: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      // Feature limits
      max_file_uploads: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 10
      },
      max_file_size_mb: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 10
      },
      max_api_keys: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      max_api_requests_per_hour: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 100
      },
      max_content_items: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 100
      },
      max_contacts: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 50
      },
      max_storage_gb: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      // Feature access flags
      ai_analysis_enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      premium_support: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      advanced_analytics: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      custom_integrations: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      // Plan settings
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      sort_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      is_default: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('subscription_plans', ['name'], {
      unique: true
    });
    await queryInterface.addIndex('subscription_plans', ['is_active']);
    await queryInterface.addIndex('subscription_plans', ['sort_order']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('subscription_plans');
  }
}; 