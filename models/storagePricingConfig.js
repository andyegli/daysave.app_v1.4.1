const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StoragePricingConfig = sequelize.define('StoragePricingConfig', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    provider: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Storage provider (google_cloud_storage, local, aws_s3)',
      validate: {
        isIn: [['google_cloud_storage', 'local', 'aws_s3', 'azure_blob', 'digital_ocean']]
      }
    },
    storage_class: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Storage class (standard, nearline, coldline, archive)',
      validate: {
        isIn: [['standard', 'nearline', 'coldline', 'archive', 'intelligent_tiering', 'glacier']]
      }
    },
    storage_cost_per_gb_month: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: false,
      defaultValue: 0.000000,
      comment: 'Cost per GB per month in USD'
    },
    operation_cost_per_1k: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: false,
      defaultValue: 0.000000,
      comment: 'Cost per 1,000 operations in USD'
    },
    egress_cost_per_gb: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: false,
      defaultValue: 0.000000,
      comment: 'Cost per GB of data egress in USD'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether this pricing is currently active'
    },
    effective_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'When this pricing becomes effective'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Additional notes about this pricing'
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
    tableName: 'storage_pricing_config',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['provider', 'storage_class', 'effective_date'],
        name: 'unique_provider_class_effective_date'
      },
      {
        fields: ['provider', 'storage_class']
      },
      {
        fields: ['is_active', 'effective_date']
      },
      {
        fields: ['effective_date']
      }
    ]
  });

  StoragePricingConfig.associate = function(models) {
    // No direct associations for now, but could link to StorageUsage if needed
  };

  // Instance methods
  StoragePricingConfig.prototype.calculateStorageCost = function(sizeGB, durationMonths = 1) {
    return sizeGB * durationMonths * parseFloat(this.storage_cost_per_gb_month);
  };

  StoragePricingConfig.prototype.calculateOperationCost = function(operationCount) {
    return (operationCount / 1000) * parseFloat(this.operation_cost_per_1k);
  };

  StoragePricingConfig.prototype.calculateEgressCost = function(egressGB) {
    return egressGB * parseFloat(this.egress_cost_per_gb);
  };

  // Class methods
  StoragePricingConfig.getCurrentPricing = async function(provider, storageClass) {
    return await this.findOne({
      where: {
        provider,
        storage_class: storageClass,
        is_active: true
      },
      order: [['effective_date', 'DESC']]
    });
  };

  StoragePricingConfig.getAllCurrentPricing = async function() {
    return await this.findAll({
      where: {
        is_active: true
      },
      order: [['provider', 'ASC'], ['storage_class', 'ASC'], ['effective_date', 'DESC']]
    });
  };

  StoragePricingConfig.getProviderPricing = async function(provider) {
    return await this.findAll({
      where: {
        provider,
        is_active: true
      },
      order: [['storage_class', 'ASC'], ['effective_date', 'DESC']]
    });
  };

  return StoragePricingConfig;
};
