const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SubscriptionTransaction = sequelize.define('SubscriptionTransaction', {
    id: {
      type: DataTypes.CHAR(36),
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    subscription_plan_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: {
        model: 'subscription_plans',
        key: 'id'
      }
    },
    transaction_type: {
      type: DataTypes.ENUM('purchase', 'renewal', 'upgrade', 'downgrade', 'cancellation', 'refund'),
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'USD'
    },
    billing_cycle: {
      type: DataTypes.ENUM('monthly', 'yearly'),
      allowNull: false,
      defaultValue: 'monthly'
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'cancelled', 'refunded'),
      allowNull: false,
      defaultValue: 'pending'
    },
    // Payment details (mock)
    payment_method: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    transaction_id: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    payment_gateway: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'mock'
    },
    payment_gateway_response: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Subscription period
    period_start: {
      type: DataTypes.DATE,
      allowNull: true
    },
    period_end: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Previous plan (for upgrades/downgrades)
    previous_plan_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      references: {
        model: 'subscription_plans',
        key: 'id'
      }
    },
    proration_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    // Additional details
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    },
    processed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'subscription_transactions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['subscription_plan_id']
      },
      {
        fields: ['transaction_type']
      },
      {
        fields: ['status']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['transaction_id']
      }
    ]
  });

  SubscriptionTransaction.associate = function(models) {
    SubscriptionTransaction.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
    
    SubscriptionTransaction.belongsTo(models.SubscriptionPlan, {
      foreignKey: 'subscription_plan_id',
      as: 'subscriptionPlan'
    });
    
    SubscriptionTransaction.belongsTo(models.SubscriptionPlan, {
      foreignKey: 'previous_plan_id',
      as: 'previousPlan'
    });
  };

  return SubscriptionTransaction;
}; 