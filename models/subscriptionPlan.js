const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SubscriptionPlan = sequelize.define('SubscriptionPlan', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    display_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    price_monthly: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    price_yearly: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    // Feature limits
    max_file_uploads: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10
    },
    max_file_size_mb: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10
    },
    max_api_keys: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    max_api_requests_per_hour: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100
    },
    max_content_items: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100
    },
    max_contacts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 50
    },
    max_storage_gb: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    // Feature access flags
    ai_analysis_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    premium_support: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    advanced_analytics: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    custom_integrations: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    // Plan settings
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
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
    tableName: 'subscription_plans',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['name']
      },
      {
        fields: ['is_active']
      },
      {
        fields: ['sort_order']
      }
    ]
  });

  SubscriptionPlan.associate = function(models) {
    SubscriptionPlan.hasMany(models.UserSubscription, {
      foreignKey: 'subscription_plan_id',
      as: 'userSubscriptions'
    });
    
    SubscriptionPlan.hasMany(models.SubscriptionTransaction, {
      foreignKey: 'subscription_plan_id',
      as: 'transactions'
    });
    
    SubscriptionPlan.hasMany(models.SubscriptionTransaction, {
      foreignKey: 'previous_plan_id',
      as: 'previousPlanTransactions'
    });
  };

  return SubscriptionPlan;
}; 