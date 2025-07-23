const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserSubscription = sequelize.define('UserSubscription', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    subscription_plan_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'subscription_plans',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('active', 'cancelled', 'expired', 'pending', 'suspended'),
      allowNull: false,
      defaultValue: 'active'
    },
    billing_cycle: {
      type: DataTypes.ENUM('monthly', 'yearly'),
      allowNull: false,
      defaultValue: 'monthly'
    },
    current_period_start: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    current_period_end: {
      type: DataTypes.DATE,
      allowNull: false
    },
    next_billing_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    auto_renew: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    // Usage tracking
    usage_file_uploads: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    usage_storage_mb: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    usage_api_requests: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    usage_content_items: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    usage_contacts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    usage_api_keys: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    // Payment information (mock)
    payment_method: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    payment_status: {
      type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
      allowNull: false,
      defaultValue: 'paid'
    },
    last_payment_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    last_payment_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    // Subscription lifecycle
    trial_start: {
      type: DataTypes.DATE,
      allowNull: true
    },
    trial_end: {
      type: DataTypes.DATE,
      allowNull: true
    },
    cancelled_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    cancellation_reason: {
      type: DataTypes.TEXT,
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
    tableName: 'user_subscriptions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['user_id']
      },
      {
        fields: ['subscription_plan_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['current_period_end']
      },
      {
        fields: ['next_billing_date']
      }
    ]
  });

  UserSubscription.associate = function(models) {
    UserSubscription.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
    
    UserSubscription.belongsTo(models.SubscriptionPlan, {
      foreignKey: 'subscription_plan_id',
      as: 'subscriptionPlan'
    });
    
    UserSubscription.hasMany(models.SubscriptionTransaction, {
      foreignKey: 'user_id',
      as: 'transactions'
    });
  };

  return UserSubscription;
}; 