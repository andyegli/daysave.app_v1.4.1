'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('subscription_transactions', {
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
      transaction_type: {
        type: Sequelize.ENUM('purchase', 'renewal', 'upgrade', 'downgrade', 'cancellation', 'refund'),
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'USD'
      },
      billing_cycle: {
        type: Sequelize.ENUM('monthly', 'yearly'),
        allowNull: false,
        defaultValue: 'monthly'
      },
      status: {
        type: Sequelize.ENUM('pending', 'completed', 'failed', 'cancelled', 'refunded'),
        allowNull: false,
        defaultValue: 'pending'
      },
      // Payment details (mock)
      payment_method: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      transaction_id: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      payment_gateway: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'mock'
      },
      payment_gateway_response: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      // Subscription period
      period_start: {
        type: Sequelize.DATE,
        allowNull: true
      },
      period_end: {
        type: Sequelize.DATE,
        allowNull: true
      },
      // Previous plan (for upgrades/downgrades)
      previous_plan_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: {
          model: 'subscription_plans',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      proration_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      // Additional details
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true
      },
      processed_at: {
        type: Sequelize.DATE,
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
    await queryInterface.addIndex('subscription_transactions', ['user_id']);
    await queryInterface.addIndex('subscription_transactions', ['subscription_plan_id']);
    await queryInterface.addIndex('subscription_transactions', ['transaction_type']);
    await queryInterface.addIndex('subscription_transactions', ['status']);
    await queryInterface.addIndex('subscription_transactions', ['created_at']);
    await queryInterface.addIndex('subscription_transactions', ['transaction_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('subscription_transactions');
  }
}; 