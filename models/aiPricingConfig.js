/**
 * AI Pricing Configuration Model for DaySave
 * 
 * PURPOSE:
 * Defines the AI pricing configuration model for storing dynamic cost calculations
 * for AI providers and models. Replaces hardcoded pricing with database-driven
 * configuration that can be managed through the admin interface.
 * 
 * FEATURES:
 * - UUID primary keys for security and scalability
 * - Multi-provider support (OpenAI, Google AI, Google Cloud, etc.)
 * - Flexible pricing models (input/output/thinking tokens)
 * - Special pricing units (per image, per minute, per second)
 * - Effective date tracking for pricing history
 * - Active/inactive status management
 * - Built-in cost calculation methods
 * 
 * FIELDS:
 * - id: UUID primary key
 * - provider: AI provider name (openai, google_ai, google_cloud)
 * - model: Model name (gpt-4o-mini, gemini-1.5-flash, etc.)
 * - input_cost_per_million_tokens: Cost per 1M input tokens in USD
 * - output_cost_per_million_tokens: Cost per 1M output tokens in USD
 * - thinking_cost_per_million_tokens: Cost per 1M thinking tokens (reasoning models)
 * - special_pricing_unit: Special pricing unit type
 * - special_pricing_cost: Cost per special unit
 * - is_active: Whether this pricing is currently active
 * - effective_date: When this pricing becomes effective
 * - notes: Additional notes about this pricing
 * 
 * PRICING MODELS:
 * - Token-based: Most language models (GPT, Gemini)
 * - Image-based: Image generation models (DALL-E, Imagen)
 * - Time-based: Audio processing models (Whisper)
 * - Request-based: API services (Vision, Translation)
 * 
 * METHODS:
 * - calculateCost(): Calculate cost for given token usage
 * - calculateSpecialCost(): Calculate cost for special units
 * - getCurrentPricing(): Get current active pricing for provider/model
 * - getAllCurrentPricing(): Get all active pricing configurations
 * 
 * INDEXES:
 * - provider, model, effective_date (unique)
 * - provider, model for quick lookups
 * - is_active, effective_date for active pricing queries
 * 
 * VALIDATION:
 * - Provider validation against allowed values
 * - Special pricing unit validation
 * - Decimal precision for cost fields
 * - Required field enforcement
 * 
 * AUTHOR: DaySave Development Team
 * CREATED: 2025-08-11 (Dynamic Cost Configuration System)
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AiPricingConfig = sequelize.define('AiPricingConfig', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    provider: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'AI provider (openai, google_ai, google_cloud)',
      validate: {
        isIn: [['openai', 'google_ai', 'google_cloud', 'anthropic', 'azure', 'aws']]
      }
    },
    model: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Model name (gpt-4o-mini, gemini-1.5-flash, etc.)'
    },
    input_cost_per_million_tokens: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: false,
      defaultValue: 0.000000,
      comment: 'Cost per 1M input tokens in USD'
    },
    output_cost_per_million_tokens: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: false,
      defaultValue: 0.000000,
      comment: 'Cost per 1M output tokens in USD'
    },
    thinking_cost_per_million_tokens: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: true,
      defaultValue: null,
      comment: 'Cost per 1M thinking tokens in USD (for reasoning models like Gemini 2.5)'
    },
    special_pricing_unit: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Special pricing unit (per_image, per_minute, per_second, per_1k_requests)',
      validate: {
        isIn: [['per_image', 'per_minute', 'per_second', 'per_hour', 'per_1k_requests', 'per_million_chars', null]]
      }
    },
    special_pricing_cost: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: true,
      defaultValue: null,
      comment: 'Cost per special unit'
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
    tableName: 'ai_pricing_config',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['provider', 'model', 'effective_date'],
        name: 'unique_provider_model_effective_date'
      },
      {
        fields: ['provider', 'model']
      },
      {
        fields: ['is_active', 'effective_date']
      },
      {
        fields: ['effective_date']
      }
    ]
  });

  AiPricingConfig.associate = function(models) {
    // No direct associations for now, but could link to ExternalAiUsage if needed
  };

  // Instance methods
  AiPricingConfig.prototype.calculateCost = function(inputTokens, outputTokens, thinkingTokens = 0) {
    const inputCost = (inputTokens / 1000000) * parseFloat(this.input_cost_per_million_tokens);
    const outputCost = (outputTokens / 1000000) * parseFloat(this.output_cost_per_million_tokens);
    const thinkingCost = thinkingTokens && this.thinking_cost_per_million_tokens ? 
      (thinkingTokens / 1000000) * parseFloat(this.thinking_cost_per_million_tokens) : 0;
    
    return inputCost + outputCost + thinkingCost;
  };

  AiPricingConfig.prototype.calculateSpecialCost = function(units) {
    if (!this.special_pricing_cost || !units) return 0;
    return units * parseFloat(this.special_pricing_cost);
  };

  // Class methods
  AiPricingConfig.getCurrentPricing = async function(provider, model) {
    return await this.findOne({
      where: {
        provider,
        model,
        is_active: true
      },
      order: [['effective_date', 'DESC']]
    });
  };

  AiPricingConfig.getAllCurrentPricing = async function() {
    return await this.findAll({
      where: {
        is_active: true
      },
      order: [['provider', 'ASC'], ['model', 'ASC'], ['effective_date', 'DESC']]
    });
  };

  return AiPricingConfig;
};
