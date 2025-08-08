const { v4: uuidv4 } = require('uuid');

/**
 * StorageUsage Model
 * 
 * Tracks Google Cloud Storage usage on a per-user, per-file, per-submission basis.
 * This enables accurate billing for storage costs and provides detailed analytics
 * for storage optimization and cost management.
 * 
 * FEATURES:
 * - Per-file storage tracking with versioning support
 * - Storage lifecycle tracking (upload, access, deletion)
 * - Storage cost calculation based on GCS pricing
 * - Storage analytics and reporting
 * - Integration with billing and subscription systems
 * 
 * @param {Object} sequelize - Sequelize instance
 * @param {Object} DataTypes - Sequelize data types
 * @returns {Object} StorageUsage model
 */
module.exports = (sequelize, DataTypes) => {
  const StorageUsage = sequelize.define('StorageUsage', {
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
      allowNull: false,
      comment: 'Unique UUID identifier for the storage usage record'
    },
    user_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'User who owns the stored file'
    },
    content_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      references: {
        model: 'content',
        key: 'id'
      },
      comment: 'Content item associated with this storage (null for direct file uploads)'
    },
    file_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      references: {
        model: 'files',
        key: 'id'
      },
      comment: 'File record associated with this storage'
    },
    processing_job_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      references: {
        model: 'processing_jobs',
        key: 'id'
      },
      comment: 'Processing job that created this stored file'
    },
    storage_provider: {
      type: DataTypes.ENUM('google_cloud_storage', 'local', 'aws_s3', 'azure_blob', 'other'),
      allowNull: false,
      defaultValue: 'google_cloud_storage',
      comment: 'Storage provider where the file is stored'
    },
    storage_location: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: 'Full path/URI to the stored file (GCS URI, local path, etc.)'
    },
    bucket_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'GCS bucket name or equivalent storage container'
    },
    object_name: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: 'Object/file name within the storage container'
    },
    file_type: {
      type: DataTypes.ENUM(
        'image', 'video', 'audio', 'document', 'thumbnail', 
        'processed_video', 'processed_audio', 'processed_image',
        'cache', 'temporary', 'backup', 'other'
      ),
      allowNull: false,
      comment: 'Type of stored file for categorization and billing'
    },
    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'MIME type of the stored file'
    },
    file_size_bytes: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
      comment: 'Size of the file in bytes'
    },
    storage_class: {
      type: DataTypes.ENUM('standard', 'nearline', 'coldline', 'archive', 'multi_regional', 'regional'),
      allowNull: false,
      defaultValue: 'standard',
      comment: 'GCS storage class for cost optimization'
    },
    operation_type: {
      type: DataTypes.ENUM('upload', 'download', 'delete', 'access', 'copy', 'move', 'lifecycle_transition'),
      allowNull: false,
      comment: 'Type of storage operation performed'
    },
    operation_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Number of operations (for batch operations)'
    },
    bandwidth_bytes: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
      comment: 'Bandwidth used for the operation (egress for downloads)'
    },
    estimated_cost_usd: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: false,
      defaultValue: 0.000000,
      comment: 'Estimated cost in USD for this storage operation'
    },
    actual_cost_usd: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: true,
      comment: 'Actual cost from GCS billing (when available)'
    },
    billing_period: {
      type: DataTypes.STRING(7), // YYYY-MM format
      allowNull: false,
      comment: 'Billing period this usage belongs to (YYYY-MM)'
    },
    success: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether the storage operation was successful'
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error message if the operation failed'
    },
    error_code: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Error code from the storage provider'
    },
    duration_ms: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Duration of the storage operation in milliseconds'
    },
    geographic_region: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Geographic region where the storage operation occurred'
    },
    access_method: {
      type: DataTypes.ENUM('direct', 'signed_url', 'api', 'cdn', 'other'),
      allowNull: true,
      comment: 'Method used to access the stored file'
    },
    retention_period_days: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Retention period for the stored file (for lifecycle management)'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether the file is currently stored (false when deleted)'
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the file was deleted (for tracking storage lifecycle)'
    },
    last_accessed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the file was last accessed (for access pattern analysis)'
    },
    session_id: {
      type: DataTypes.STRING(36),
      allowNull: true,
      comment: 'Session identifier for grouping related storage operations'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional metadata about the storage operation'
    },
    provider_request_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Request ID from the storage provider for tracking'
    },
    provider_response_metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Raw response metadata from the storage provider'
    }
  }, {
    tableName: 'storage_usage',
    timestamps: true,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['content_id']
      },
      {
        fields: ['file_id']
      },
      {
        fields: ['processing_job_id']
      },
      {
        fields: ['storage_provider']
      },
      {
        fields: ['billing_period']
      },
      {
        fields: ['operation_type']
      },
      {
        fields: ['file_type']
      },
      {
        fields: ['storage_class']
      },
      {
        fields: ['is_active']
      },
      {
        fields: ['createdAt']
      },
      {
        fields: ['deleted_at']
      },
      {
        fields: ['last_accessed_at']
      },
      // Composite indexes for common billing queries
      {
        fields: ['user_id', 'billing_period']
      },
      {
        fields: ['user_id', 'storage_provider', 'billing_period']
      },
      {
        fields: ['billing_period', 'storage_provider']
      },
      {
        fields: ['user_id', 'is_active']
      },
      {
        fields: ['file_id', 'operation_type']
      },
      {
        fields: ['storage_provider', 'storage_class', 'createdAt']
      },
      {
        fields: ['user_id', 'file_type', 'billing_period']
      }
    ],
    comment: 'Tracks Google Cloud Storage usage for billing and analytics'
  });

  StorageUsage.associate = (models) => {
    StorageUsage.belongsTo(models.User, { 
      foreignKey: 'user_id', 
      as: 'user',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    
    StorageUsage.belongsTo(models.Content, { 
      foreignKey: 'content_id', 
      as: 'content',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
    
    StorageUsage.belongsTo(models.File, { 
      foreignKey: 'file_id', 
      as: 'file',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
    
    StorageUsage.belongsTo(models.ProcessingJob, { 
      foreignKey: 'processing_job_id', 
      as: 'processingJob',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
  };

  // Class methods for common queries
  StorageUsage.getUserMonthlyStorage = async function(userId, billingPeriod) {
    return this.findAll({
      where: {
        user_id: userId,
        billing_period: billingPeriod,
        is_active: true
      },
      attributes: [
        'storage_provider',
        'storage_class',
        'file_type',
        [sequelize.fn('SUM', sequelize.col('file_size_bytes')), 'total_bytes'],
        [sequelize.fn('SUM', sequelize.col('estimated_cost_usd')), 'total_cost'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'file_count']
      ],
      group: ['storage_provider', 'storage_class', 'file_type']
    });
  };

  StorageUsage.getSystemStorageUsage = async function(billingPeriod) {
    return this.findAll({
      where: {
        billing_period: billingPeriod,
        is_active: true
      },
      attributes: [
        'storage_provider',
        'storage_class',
        [sequelize.fn('SUM', sequelize.col('file_size_bytes')), 'total_bytes'],
        [sequelize.fn('SUM', sequelize.col('estimated_cost_usd')), 'total_cost'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'file_count'],
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('user_id'))), 'user_count']
      ],
      group: ['storage_provider', 'storage_class']
    });
  };

  StorageUsage.getUserStorageGrowth = async function(userId, startDate, endDate) {
    return this.findAll({
      where: {
        user_id: userId,
        createdAt: {
          [sequelize.Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        'file_type',
        [sequelize.fn('SUM', sequelize.col('file_size_bytes')), 'daily_bytes'],
        [sequelize.fn('SUM', sequelize.col('estimated_cost_usd')), 'daily_cost']
      ],
      group: [sequelize.fn('DATE', sequelize.col('createdAt')), 'file_type'],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']]
    });
  };

  StorageUsage.getTopStorageUsers = async function(billingPeriod, limit = 10) {
    return this.findAll({
      where: {
        billing_period: billingPeriod,
        is_active: true
      },
      attributes: [
        'user_id',
        [sequelize.fn('SUM', sequelize.col('file_size_bytes')), 'total_bytes'],
        [sequelize.fn('SUM', sequelize.col('estimated_cost_usd')), 'total_cost'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'file_count']
      ],
      group: ['user_id'],
      order: [[sequelize.fn('SUM', sequelize.col('file_size_bytes')), 'DESC']],
      limit: limit,
      include: [
        {
          model: sequelize.models.User,
          as: 'user',
          attributes: ['id', 'username', 'email']
        }
      ]
    });
  };

  return StorageUsage;
};