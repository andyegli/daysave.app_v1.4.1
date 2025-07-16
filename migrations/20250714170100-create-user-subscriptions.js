'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_subscriptions', {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      subscription_plan_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: {
          model: 'subscription_plans',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      status: {
        type: Sequelize.ENUM('active', 'cancelled', 'expired', 'pending', 'suspended'),
        allowNull: false,
        defaultValue: 'active'
      },
      billing_cycle: {
        type: Sequelize.ENUM('monthly', 'yearly'),
        allowNull: false,
        defaultValue: 'monthly'
      },
      current_period_start: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      current_period_end: {
        type: Sequelize.DATE,
        allowNull: false
      },
      next_billing_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      auto_renew: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      // Usage tracking
      usage_file_uploads: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      usage_storage_mb: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      usage_api_requests: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      usage_content_items: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      usage_contacts: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      // Payment information (mock)
      payment_method: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      payment_status: {
        type: Sequelize.ENUM('pending', 'paid', 'failed', 'refunded'),
        allowNull: false,
        defaultValue: 'paid'
      },
      last_payment_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      last_payment_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      // Subscription lifecycle
      trial_start: {
        type: Sequelize.DATE,
        allowNull: true
      },
      trial_end: {
        type: Sequelize.DATE,
        allowNull: true
      },
      cancelled_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      cancellation_reason: {
        type: Sequelize.TEXT,
        allowNull: true
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
    await queryInterface.addIndex('user_subscriptions', ['user_id'], {
      unique: true
    });
    await queryInterface.addIndex('user_subscriptions', ['subscription_plan_id']);
    await queryInterface.addIndex('user_subscriptions', ['status']);
    await queryInterface.addIndex('user_subscriptions', ['current_period_end']);
    await queryInterface.addIndex('user_subscriptions', ['next_billing_date']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('user_subscriptions');
  }
}; 