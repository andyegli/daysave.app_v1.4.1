/**
 * Migration: Create Cost Configuration Tables
 * 
 * PURPOSE:
 * Creates database tables for storing dynamic AI and storage pricing configuration.
 * Replaces hardcoded pricing with database-driven configuration that can be
 * managed through the admin interface without code deployments.
 * 
 * TABLES CREATED:
 * - ai_pricing_config: AI provider and model pricing configuration
 * - storage_pricing_config: Storage provider and class pricing configuration
 * 
 * FEATURES:
 * - UUID primary keys for security and scalability
 * - Effective date support for pricing history
 * - Active/inactive status management
 * - Comprehensive indexing for performance
 * - Multi-provider and multi-model support
 * 
 * INDEXES:
 * - Provider/model lookup indexes
 * - Active status and effective date indexes
 * - Performance optimization for common queries
 * 
 * AUTHOR: DaySave Development Team
 * CREATED: 2025-08-11
 */

'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('Creating cost configuration tables...');
    
    // Create AI pricing configuration table
    await queryInterface.createTable('ai_pricing_config', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      provider: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'AI provider (openai, google_ai, google_cloud)'
      },
      model: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Model name (gpt-4o-mini, gemini-1.5-flash, etc.)'
      },
      input_cost_per_million_tokens: {
        type: Sequelize.DECIMAL(10, 6),
        allowNull: false,
        defaultValue: 0.000000,
        comment: 'Cost per 1M input tokens in USD'
      },
      output_cost_per_million_tokens: {
        type: Sequelize.DECIMAL(10, 6),
        allowNull: false,
        defaultValue: 0.000000,
        comment: 'Cost per 1M output tokens in USD'
      },
      thinking_cost_per_million_tokens: {
        type: Sequelize.DECIMAL(10, 6),
        allowNull: true,
        defaultValue: 0.000000,
        comment: 'Cost per 1M thinking tokens in USD (for reasoning models)'
      },
      special_pricing_unit: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Special pricing unit (per_image, per_minute, per_second)'
      },
      special_pricing_cost: {
        type: Sequelize.DECIMAL(10, 6),
        allowNull: true,
        defaultValue: 0.000000,
        comment: 'Cost per special unit'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether this pricing is currently active'
      },
      effective_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'When this pricing becomes effective'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Additional notes about this pricing'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Create storage pricing configuration table
    await queryInterface.createTable('storage_pricing_config', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      provider: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Storage provider (google_cloud_storage, local, aws_s3)'
      },
      storage_class: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Storage class (standard, nearline, coldline, archive)'
      },
      storage_cost_per_gb_month: {
        type: Sequelize.DECIMAL(10, 6),
        allowNull: false,
        defaultValue: 0.000000,
        comment: 'Cost per GB per month in USD'
      },
      operation_cost_per_1k: {
        type: Sequelize.DECIMAL(10, 6),
        allowNull: false,
        defaultValue: 0.000000,
        comment: 'Cost per 1,000 operations in USD'
      },
      egress_cost_per_gb: {
        type: Sequelize.DECIMAL(10, 6),
        allowNull: false,
        defaultValue: 0.000000,
        comment: 'Cost per GB of data egress in USD'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether this pricing is currently active'
      },
      effective_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'When this pricing becomes effective'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Additional notes about this pricing'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes for performance
    await queryInterface.addIndex('ai_pricing_config', ['provider', 'model']);
    await queryInterface.addIndex('ai_pricing_config', ['is_active', 'effective_date']);
    await queryInterface.addIndex('storage_pricing_config', ['provider', 'storage_class']);
    await queryInterface.addIndex('storage_pricing_config', ['is_active', 'effective_date']);

    console.log('✅ Created cost configuration tables');
  },

  async down(queryInterface, Sequelize) {
    console.log('Dropping cost configuration tables...');
    
    await queryInterface.dropTable('storage_pricing_config');
    await queryInterface.dropTable('ai_pricing_config');
    
    console.log('✅ Dropped cost configuration tables');
  }
};
