/**
 * Storage Pricing Configuration Model for DaySave
 * 
 * PURPOSE:
 * Defines the storage pricing configuration model for storing dynamic cost calculations
 * for storage providers and classes. Enables database-driven storage cost management
 * with support for multiple providers and storage tiers.
 * 
 * FEATURES:
 * - UUID primary keys for security and scalability
 * - Multi-provider support (Google Cloud Storage, AWS S3, Local, etc.)
 * - Storage class optimization (Standard, Nearline, Coldline, Archive)
 * - Comprehensive cost tracking (storage, operations, egress)
 * - Effective date tracking for pricing history
 * - Active/inactive status management
 * - Built-in cost calculation methods
 * 
 * FIELDS:
 * - id: UUID primary key
 * - provider: Storage provider name (google_cloud_storage, aws_s3, local)
 * - storage_class: Storage class (standard, nearline, coldline, archive)
 * - storage_cost_per_gb_month: Cost per GB per month in USD
 * - operation_cost_per_1k: Cost per 1,000 operations in USD
 * - egress_cost_per_gb: Cost per GB of data egress in USD
 * - is_active: Whether this pricing is currently active
 * - effective_date: When this pricing becomes effective
 * - notes: Additional notes about this pricing
 * 
 * STORAGE CLASSES:
 * - Standard: Frequently accessed data
 * - Nearline: Accessed less than once per month
 * - Coldline: Accessed less than once per quarter
 * - Archive: Accessed less than once per year
 * - Intelligent Tiering: Automatic tier optimization
 * 
 * COST COMPONENTS:
 * - Storage: Monthly cost per GB of data stored
 * - Operations: Cost per API operation (read, write, list)
 * - Egress: Cost per GB of data transferred out
 * - Early deletion: Additional charges for early deletion
 * 
 * METHODS:
 * - calculateStorageCost(): Calculate storage cost for size and duration
 * - calculateOperationCost(): Calculate cost for operations
 * - calculateEgressCost(): Calculate cost for data egress
 * - getCurrentPricing(): Get current active pricing for provider/class
 * - getAllCurrentPricing(): Get all active pricing configurations
 * - getProviderPricing(): Get all pricing for specific provider
 * 
 * INDEXES:
 * - provider, storage_class, effective_date (unique)
 * - provider, storage_class for quick lookups
 * - is_active, effective_date for active pricing queries
 * 
 * VALIDATION:
 * - Provider validation against allowed values
 * - Storage class validation against allowed values
 * - Decimal precision for cost fields
 * - Required field enforcement
 * 
 * AUTHOR: DaySave Development Team
 * CREATED: 2025-08-11 (Dynamic Cost Configuration System)
 */

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
