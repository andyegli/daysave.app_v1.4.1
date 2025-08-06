'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('external_ai_usage', {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        allowNull: false,
        comment: 'Unique UUID identifier for the AI usage record'
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
        comment: 'User who triggered the AI operation'
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
        comment: 'Content item being processed (null for direct API calls)'
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
        comment: 'File being processed (null for text-only operations)'
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
        comment: 'Processing job that triggered this AI usage'
      },
      ai_provider: {
        type: Sequelize.ENUM('openai', 'google_ai', 'google_cloud', 'anthropic', 'other'),
        allowNull: false,
        comment: 'External AI service provider'
      },
      ai_model: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Specific AI model used (e.g., gpt-4, gemini-1.5-pro)'
      },
      operation_type: {
        type: Sequelize.ENUM(
          'text_generation', 
          'text_analysis', 
          'image_analysis', 
          'video_analysis', 
          'audio_transcription', 
          'ocr', 
          'translation', 
          'summarization',
          'classification',
          'object_detection',
          'face_recognition',
          'sentiment_analysis',
          'other'
        ),
        allowNull: false,
        comment: 'Type of AI operation performed'
      },
      input_tokens: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of input tokens sent to the AI service'
      },
      output_tokens: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of output tokens received from the AI service'
      },
      total_tokens: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total tokens used (input + output)'
      },
      cache_tokens: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Number of cached tokens used (for providers that support caching)'
      },
      estimated_cost_usd: {
        type: Sequelize.DECIMAL(10, 6),
        allowNull: false,
        defaultValue: 0.000000,
        comment: 'Estimated cost in USD based on provider pricing'
      },
      actual_cost_usd: {
        type: Sequelize.DECIMAL(10, 6),
        allowNull: true,
        comment: 'Actual cost from provider billing (when available)'
      },
      request_duration_ms: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Duration of the API request in milliseconds'
      },
      request_size_bytes: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Size of the request payload in bytes'
      },
      response_size_bytes: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Size of the response payload in bytes'
      },
      success: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether the AI operation was successful'
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error message if the operation failed'
      },
      error_code: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Error code from the AI provider'
      },
      rate_limited: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether the request was rate limited'
      },
      cached_response: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether the response was served from cache'
      },
      billing_period: {
        type: Sequelize.STRING(7), // YYYY-MM format
        allowNull: false,
        comment: 'Billing period this usage belongs to (YYYY-MM)'
      },
      geographic_region: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Geographic region where the request was processed'
      },
      session_id: {
        type: Sequelize.STRING(36),
        allowNull: true,
        comment: 'Session identifier for grouping related requests'
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional metadata including prompt info, model parameters, etc.'
      },
      provider_request_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Request ID from the AI provider for tracking'
      },
      provider_response_metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Raw response metadata from the AI provider'
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
      comment: 'Tracks usage of external AI platforms for billing and analytics'
    });

    // Create indexes for optimal query performance
    await queryInterface.addIndex('external_ai_usage', ['user_id'], {
      name: 'idx_external_ai_usage_user_id'
    });

    await queryInterface.addIndex('external_ai_usage', ['content_id'], {
      name: 'idx_external_ai_usage_content_id'
    });

    await queryInterface.addIndex('external_ai_usage', ['file_id'], {
      name: 'idx_external_ai_usage_file_id'
    });

    await queryInterface.addIndex('external_ai_usage', ['processing_job_id'], {
      name: 'idx_external_ai_usage_processing_job_id'
    });

    await queryInterface.addIndex('external_ai_usage', ['ai_provider'], {
      name: 'idx_external_ai_usage_ai_provider'
    });

    await queryInterface.addIndex('external_ai_usage', ['ai_model'], {
      name: 'idx_external_ai_usage_ai_model'
    });

    await queryInterface.addIndex('external_ai_usage', ['operation_type'], {
      name: 'idx_external_ai_usage_operation_type'
    });

    await queryInterface.addIndex('external_ai_usage', ['billing_period'], {
      name: 'idx_external_ai_usage_billing_period'
    });

    await queryInterface.addIndex('external_ai_usage', ['createdAt'], {
      name: 'idx_external_ai_usage_created_at'
    });

    await queryInterface.addIndex('external_ai_usage', ['success'], {
      name: 'idx_external_ai_usage_success'
    });

    await queryInterface.addIndex('external_ai_usage', ['rate_limited'], {
      name: 'idx_external_ai_usage_rate_limited'
    });

    // Composite indexes for common billing queries
    await queryInterface.addIndex('external_ai_usage', ['user_id', 'billing_period'], {
      name: 'idx_external_ai_usage_user_billing'
    });

    await queryInterface.addIndex('external_ai_usage', ['user_id', 'ai_provider', 'billing_period'], {
      name: 'idx_external_ai_usage_user_provider_billing'
    });

    await queryInterface.addIndex('external_ai_usage', ['ai_provider', 'ai_model', 'createdAt'], {
      name: 'idx_external_ai_usage_provider_model_date'
    });

    await queryInterface.addIndex('external_ai_usage', ['user_id', 'createdAt'], {
      name: 'idx_external_ai_usage_user_date'
    });

    await queryInterface.addIndex('external_ai_usage', ['billing_period', 'ai_provider'], {
      name: 'idx_external_ai_usage_billing_provider'
    });

    await queryInterface.addIndex('external_ai_usage', ['content_id', 'operation_type'], {
      name: 'idx_external_ai_usage_content_operation'
    });

    await queryInterface.addIndex('external_ai_usage', ['processing_job_id', 'ai_provider'], {
      name: 'idx_external_ai_usage_job_provider'
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop indexes first
    const indexes = [
      'idx_external_ai_usage_user_id',
      'idx_external_ai_usage_content_id',
      'idx_external_ai_usage_file_id',
      'idx_external_ai_usage_processing_job_id',
      'idx_external_ai_usage_ai_provider',
      'idx_external_ai_usage_ai_model',
      'idx_external_ai_usage_operation_type',
      'idx_external_ai_usage_billing_period',
      'idx_external_ai_usage_created_at',
      'idx_external_ai_usage_success',
      'idx_external_ai_usage_rate_limited',
      'idx_external_ai_usage_user_billing',
      'idx_external_ai_usage_user_provider_billing',
      'idx_external_ai_usage_provider_model_date',
      'idx_external_ai_usage_user_date',
      'idx_external_ai_usage_billing_provider',
      'idx_external_ai_usage_content_operation',
      'idx_external_ai_usage_job_provider'
    ];

    for (const indexName of indexes) {
      try {
        await queryInterface.removeIndex('external_ai_usage', indexName);
      } catch (error) {
        console.log(`Index ${indexName} may not exist:`, error.message);
      }
    }

    await queryInterface.dropTable('external_ai_usage');
  }
};