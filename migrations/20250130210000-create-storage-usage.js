'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('storage_usage', {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        allowNull: false,
        comment: 'Unique UUID identifier for the storage usage record'
      },
      user_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'User who owns the stored file'
      },
      content_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: {
          model: 'content',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Content item associated with this storage (null for direct file uploads)'
      },
      file_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: {
          model: 'files',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'File record associated with this storage'
      },
      processing_job_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: {
          model: 'processing_jobs',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Processing job that created this stored file'
      },
      storage_provider: {
        type: Sequelize.ENUM('google_cloud_storage', 'local', 'aws_s3', 'azure_blob', 'other'),
        allowNull: false,
        defaultValue: 'google_cloud_storage',
        comment: 'Storage provider where the file is stored'
      },
      storage_location: {
        type: Sequelize.STRING(500),
        allowNull: false,
        comment: 'Full path/URI to the stored file (GCS URI, local path, etc.)'
      },
      bucket_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'GCS bucket name or equivalent storage container'
      },
      object_name: {
        type: Sequelize.STRING(500),
        allowNull: false,
        comment: 'Object/file name within the storage container'
      },
      file_type: {
        type: Sequelize.ENUM(
          'image', 'video', 'audio', 'document', 'thumbnail', 
          'processed_video', 'processed_audio', 'processed_image',
          'cache', 'temporary', 'backup', 'other'
        ),
        allowNull: false,
        comment: 'Type of stored file for categorization and billing'
      },
      mime_type: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'MIME type of the stored file'
      },
      file_size_bytes: {
        type: Sequelize.BIGINT,
        allowNull: false,
        defaultValue: 0,
        comment: 'Size of the file in bytes'
      },
      storage_class: {
        type: Sequelize.ENUM('standard', 'nearline', 'coldline', 'archive', 'multi_regional', 'regional'),
        allowNull: false,
        defaultValue: 'standard',
        comment: 'GCS storage class for cost optimization'
      },
      operation_type: {
        type: Sequelize.ENUM('upload', 'download', 'delete', 'access', 'copy', 'move', 'lifecycle_transition'),
        allowNull: false,
        comment: 'Type of storage operation performed'
      },
      operation_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Number of operations (for batch operations)'
      },
      bandwidth_bytes: {
        type: Sequelize.BIGINT,
        allowNull: false,
        defaultValue: 0,
        comment: 'Bandwidth used for the operation (egress for downloads)'
      },
      estimated_cost_usd: {
        type: Sequelize.DECIMAL(10, 6),
        allowNull: false,
        defaultValue: 0.000000,
        comment: 'Estimated cost in USD for this storage operation'
      },
      actual_cost_usd: {
        type: Sequelize.DECIMAL(10, 6),
        allowNull: true,
        comment: 'Actual cost from GCS billing (when available)'
      },
      billing_period: {
        type: Sequelize.STRING(7), // YYYY-MM format
        allowNull: false,
        comment: 'Billing period this usage belongs to (YYYY-MM)'
      },
      success: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether the storage operation was successful'
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error message if the operation failed'
      },
      error_code: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Error code from the storage provider'
      },
      duration_ms: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Duration of the storage operation in milliseconds'
      },
      geographic_region: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Geographic region where the storage operation occurred'
      },
      access_method: {
        type: Sequelize.ENUM('direct', 'signed_url', 'api', 'cdn', 'other'),
        allowNull: true,
        comment: 'Method used to access the stored file'
      },
      retention_period_days: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Retention period for the stored file (for lifecycle management)'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether the file is currently stored (false when deleted)'
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the file was deleted (for tracking storage lifecycle)'
      },
      last_accessed_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the file was last accessed (for access pattern analysis)'
      },
      session_id: {
        type: Sequelize.STRING(36),
        allowNull: true,
        comment: 'Session identifier for grouping related storage operations'
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional metadata about the storage operation'
      },
      provider_request_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Request ID from the storage provider for tracking'
      },
      provider_response_metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Raw response metadata from the storage provider'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    }, {
      comment: 'Tracks Google Cloud Storage usage for billing and analytics'
    });

    // Create indexes for optimal query performance
    await queryInterface.addIndex('storage_usage', ['user_id'], {
      name: 'idx_storage_usage_user_id'
    });

    await queryInterface.addIndex('storage_usage', ['content_id'], {
      name: 'idx_storage_usage_content_id'
    });

    await queryInterface.addIndex('storage_usage', ['file_id'], {
      name: 'idx_storage_usage_file_id'
    });

    await queryInterface.addIndex('storage_usage', ['processing_job_id'], {
      name: 'idx_storage_usage_processing_job_id'
    });

    await queryInterface.addIndex('storage_usage', ['storage_provider'], {
      name: 'idx_storage_usage_storage_provider'
    });

    await queryInterface.addIndex('storage_usage', ['billing_period'], {
      name: 'idx_storage_usage_billing_period'
    });

    await queryInterface.addIndex('storage_usage', ['operation_type'], {
      name: 'idx_storage_usage_operation_type'
    });

    await queryInterface.addIndex('storage_usage', ['file_type'], {
      name: 'idx_storage_usage_file_type'
    });

    await queryInterface.addIndex('storage_usage', ['storage_class'], {
      name: 'idx_storage_usage_storage_class'
    });

    await queryInterface.addIndex('storage_usage', ['is_active'], {
      name: 'idx_storage_usage_is_active'
    });

    await queryInterface.addIndex('storage_usage', ['createdAt'], {
      name: 'idx_storage_usage_created_at'
    });

    await queryInterface.addIndex('storage_usage', ['deleted_at'], {
      name: 'idx_storage_usage_deleted_at'
    });

    await queryInterface.addIndex('storage_usage', ['last_accessed_at'], {
      name: 'idx_storage_usage_last_accessed_at'
    });

    // Composite indexes for common billing queries
    await queryInterface.addIndex('storage_usage', ['user_id', 'billing_period'], {
      name: 'idx_storage_usage_user_billing'
    });

    await queryInterface.addIndex('storage_usage', ['user_id', 'storage_provider', 'billing_period'], {
      name: 'idx_storage_usage_user_provider_billing'
    });

    await queryInterface.addIndex('storage_usage', ['billing_period', 'storage_provider'], {
      name: 'idx_storage_usage_billing_provider'
    });

    await queryInterface.addIndex('storage_usage', ['user_id', 'is_active'], {
      name: 'idx_storage_usage_user_active'
    });

    await queryInterface.addIndex('storage_usage', ['file_id', 'operation_type'], {
      name: 'idx_storage_usage_file_operation'
    });

    await queryInterface.addIndex('storage_usage', ['storage_provider', 'storage_class', 'createdAt'], {
      name: 'idx_storage_usage_provider_class_date'
    });

    await queryInterface.addIndex('storage_usage', ['user_id', 'file_type', 'billing_period'], {
      name: 'idx_storage_usage_user_type_billing'
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop indexes first
    const indexes = [
      'idx_storage_usage_user_id',
      'idx_storage_usage_content_id',
      'idx_storage_usage_file_id',
      'idx_storage_usage_processing_job_id',
      'idx_storage_usage_storage_provider',
      'idx_storage_usage_billing_period',
      'idx_storage_usage_operation_type',
      'idx_storage_usage_file_type',
      'idx_storage_usage_storage_class',
      'idx_storage_usage_is_active',
      'idx_storage_usage_created_at',
      'idx_storage_usage_deleted_at',
      'idx_storage_usage_last_accessed_at',
      'idx_storage_usage_user_billing',
      'idx_storage_usage_user_provider_billing',
      'idx_storage_usage_billing_provider',
      'idx_storage_usage_user_active',
      'idx_storage_usage_file_operation',
      'idx_storage_usage_provider_class_date',
      'idx_storage_usage_user_type_billing'
    ];

    for (const indexName of indexes) {
      try {
        await queryInterface.removeIndex('storage_usage', indexName);
      } catch (error) {
        console.log(`Index ${indexName} may not exist:`, error.message);
      }
    }

    await queryInterface.dropTable('storage_usage');
  }
};