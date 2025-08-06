const { v4: uuidv4 } = require('uuid');

/**
 * ExternalAiUsage Model
 * 
 * Tracks usage of external AI platforms (OpenAI, Google AI, etc.) for billing and analytics.
 * This is separate from the ApiKeyUsage model which tracks usage of the DaySave API itself.
 * This model tracks how much external AI services cost when processing user content.
 * 
 * @param {Object} sequelize - Sequelize instance
 * @param {Object} DataTypes - Sequelize data types
 * @returns {Object} ExternalAiUsage model
 */
module.exports = (sequelize, DataTypes) => {
  const ExternalAiUsage = sequelize.define('ExternalAiUsage', {
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
      allowNull: false,
      comment: 'Unique UUID identifier for the AI usage record'
    },
    user_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'User who triggered the AI operation'
    },
    content_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      references: {
        model: 'content',
        key: 'id'
      },
      comment: 'Content item being processed (null for direct API calls)'
    },
    file_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      references: {
        model: 'files',
        key: 'id'
      },
      comment: 'File being processed (null for text-only operations)'
    },
    processing_job_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      references: {
        model: 'processing_jobs',
        key: 'id'
      },
      comment: 'Processing job that triggered this AI usage'
    },
    ai_provider: {
      type: DataTypes.ENUM('openai', 'google_ai', 'google_cloud', 'anthropic', 'other'),
      allowNull: false,
      comment: 'External AI service provider'
    },
    ai_model: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Specific AI model used (e.g., gpt-4, gemini-1.5-pro)'
    },
    operation_type: {
      type: DataTypes.ENUM(
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
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of input tokens sent to the AI service'
    },
    output_tokens: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of output tokens received from the AI service'
    },
    total_tokens: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total tokens used (input + output)'
    },
    cache_tokens: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Number of cached tokens used (for providers that support caching)'
    },
    estimated_cost_usd: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: false,
      defaultValue: 0.000000,
      comment: 'Estimated cost in USD based on provider pricing'
    },
    actual_cost_usd: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: true,
      comment: 'Actual cost from provider billing (when available)'
    },
    request_duration_ms: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Duration of the API request in milliseconds'
    },
    request_size_bytes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Size of the request payload in bytes'
    },
    response_size_bytes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Size of the response payload in bytes'
    },
    success: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether the AI operation was successful'
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error message if the operation failed'
    },
    error_code: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Error code from the AI provider'
    },
    rate_limited: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether the request was rate limited'
    },
    cached_response: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether the response was served from cache'
    },
    billing_period: {
      type: DataTypes.STRING(7), // YYYY-MM format
      allowNull: false,
      comment: 'Billing period this usage belongs to (YYYY-MM)'
    },
    geographic_region: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Geographic region where the request was processed'
    },
    session_id: {
      type: DataTypes.STRING(36),
      allowNull: true,
      comment: 'Session identifier for grouping related requests'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional metadata including prompt info, model parameters, etc.'
    },
    provider_request_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Request ID from the AI provider for tracking'
    },
    provider_response_metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Raw response metadata from the AI provider'
    }
  }, {
    tableName: 'external_ai_usage',
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
        fields: ['ai_provider']
      },
      {
        fields: ['ai_model']
      },
      {
        fields: ['operation_type']
      },
      {
        fields: ['billing_period']
      },
      {
        fields: ['createdAt']
      },
      {
        fields: ['success']
      },
      {
        fields: ['rate_limited']
      },
      // Composite indexes for common billing queries
      {
        fields: ['user_id', 'billing_period']
      },
      {
        fields: ['user_id', 'ai_provider', 'billing_period']
      },
      {
        fields: ['ai_provider', 'ai_model', 'createdAt']
      },
      {
        fields: ['user_id', 'createdAt']
      },
      {
        fields: ['billing_period', 'ai_provider']
      },
      {
        fields: ['content_id', 'operation_type']
      },
      {
        fields: ['processing_job_id', 'ai_provider']
      }
    ],
    comment: 'Tracks usage of external AI platforms for billing and analytics'
  });

  ExternalAiUsage.associate = (models) => {
    ExternalAiUsage.belongsTo(models.User, { 
      foreignKey: 'user_id', 
      as: 'user',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    
    ExternalAiUsage.belongsTo(models.Content, { 
      foreignKey: 'content_id', 
      as: 'content',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
    
    ExternalAiUsage.belongsTo(models.File, { 
      foreignKey: 'file_id', 
      as: 'file',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
    
    ExternalAiUsage.belongsTo(models.ProcessingJob, { 
      foreignKey: 'processing_job_id', 
      as: 'processingJob',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
  };

  // Class methods for common queries
  ExternalAiUsage.getUserMonthlyUsage = async function(userId, billingPeriod) {
    return this.findAll({
      where: {
        user_id: userId,
        billing_period: billingPeriod,
        success: true
      },
      attributes: [
        'ai_provider',
        'ai_model',
        [sequelize.fn('SUM', sequelize.col('total_tokens')), 'total_tokens'],
        [sequelize.fn('SUM', sequelize.col('estimated_cost_usd')), 'total_cost'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'request_count']
      ],
      group: ['ai_provider', 'ai_model']
    });
  };

  ExternalAiUsage.getProviderMonthlyCosts = async function(billingPeriod) {
    return this.findAll({
      where: {
        billing_period: billingPeriod,
        success: true
      },
      attributes: [
        'ai_provider',
        [sequelize.fn('SUM', sequelize.col('estimated_cost_usd')), 'total_cost'],
        [sequelize.fn('SUM', sequelize.col('total_tokens')), 'total_tokens'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'request_count']
      ],
      group: ['ai_provider']
    });
  };

  ExternalAiUsage.getUserDailyCosts = async function(userId, startDate, endDate) {
    return this.findAll({
      where: {
        user_id: userId,
        success: true,
        createdAt: {
          [sequelize.Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        'ai_provider',
        [sequelize.fn('SUM', sequelize.col('estimated_cost_usd')), 'daily_cost'],
        [sequelize.fn('SUM', sequelize.col('total_tokens')), 'daily_tokens']
      ],
      group: [sequelize.fn('DATE', sequelize.col('createdAt')), 'ai_provider'],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']]
    });
  };

  return ExternalAiUsage;
};