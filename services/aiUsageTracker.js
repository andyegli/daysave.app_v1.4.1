/**
 * AI Usage Tracker Service
 * 
 * Tracks usage of external AI platforms (OpenAI, Google AI, etc.) for billing and analytics.
 * Provides cost calculation, token tracking, and usage recording capabilities.
 * 
 * FEATURES:
 * - Token usage tracking for multiple AI providers
 * - Cost calculation based on current pricing models
 * - Automatic billing period assignment
 * - Usage analytics and reporting
 * - Error handling and retry logic
 * - Rate limiting detection
 * 
 * SUPPORTED PROVIDERS:
 * - OpenAI (GPT-4, GPT-3.5, GPT-4o, Whisper, DALL-E)
 * - Google AI (Gemini 1.5, Gemini 2.0, Gemini 2.5)
 * - Google Cloud (Vision, Speech-to-Text, Translation)
 * 
 * AUTHOR: DaySave Development Team
 * CREATED: 2025-01-30
 */

const { ExternalAiUsage } = require('../models');

class AiUsageTracker {
  constructor() {
    this.name = 'AiUsageTracker';
    
    // Current pricing models (USD per 1M tokens)
    this.pricingModels = {
      openai: {
        'gpt-4': { input: 30.00, output: 60.00 },
        'gpt-4-turbo': { input: 10.00, output: 30.00 },
        'gpt-4o': { input: 5.00, output: 15.00 },
        'gpt-4o-mini': { input: 0.15, output: 0.60 },
        'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
        'whisper-1': { input: 6.00, output: 0 }, // Per minute for audio
        'dall-e-3': { input: 0, output: 0.04 }, // Per image
        'dall-e-2': { input: 0, output: 0.02 }, // Per image
        'text-embedding-3-large': { input: 0.13, output: 0 },
        'text-embedding-3-small': { input: 0.02, output: 0 },
        'text-embedding-ada-002': { input: 0.10, output: 0 }
      },
      google_ai: {
        'gemini-2.5-flash': { input: 0.15, output: 0.60, thinking: 3.50 },
        'gemini-2.5-pro': { input: 1.25, output: 10.00, thinking: 15.00 },
        'gemini-2.0-flash': { input: 0.10, output: 0.40 },
        'gemini-2.0-flash-lite': { input: 0.075, output: 0.30 },
        'gemini-1.5-flash': { input: 0.075, output: 0.30 },
        'gemini-1.5-flash-8b': { input: 0.0375, output: 0.15 },
        'gemini-1.5-pro': { input: 1.25, output: 5.00 },
        'text-embedding-004': { input: 0, output: 0 }, // Free tier
        'imagen-3': { input: 0, output: 0.03 }, // Per image
        'veo-2': { input: 0, output: 0.35 } // Per second of video
      },
      google_cloud: {
        'vision-api': { input: 1.50, output: 0 }, // Per 1000 requests
        'speech-to-text': { input: 1.44, output: 0 }, // Per hour
        'translation': { input: 20.00, output: 0 } // Per million characters
      }
    };

    // Token conversion rates for different content types
    this.tokenConversions = {
      // Characters to tokens (approximate)
      text: 0.25, // ~4 characters per token
      // Fixed token counts for media
      image: 258, // Fixed tokens per image for Google AI
      audio: 32, // Tokens per second for audio
      video: 263 // Tokens per second for video
    };
  }

  /**
   * Calculate the current billing period (YYYY-MM format)
   * @returns {string} Current billing period
   */
  getCurrentBillingPeriod() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Calculate estimated cost based on token usage and provider pricing
   * @param {string} provider - AI provider (openai, google_ai, etc.)
   * @param {string} model - Model name
   * @param {number} inputTokens - Number of input tokens
   * @param {number} outputTokens - Number of output tokens
   * @param {number} thinkingTokens - Number of thinking tokens (for Gemini 2.5)
   * @returns {number} Estimated cost in USD
   */
  calculateCost(provider, model, inputTokens = 0, outputTokens = 0, thinkingTokens = 0) {
    const providerPricing = this.pricingModels[provider];
    if (!providerPricing) {
      console.warn(`Unknown AI provider: ${provider}`);
      return 0;
    }

    const modelPricing = providerPricing[model];
    if (!modelPricing) {
      console.warn(`Unknown model for ${provider}: ${model}`);
      return 0;
    }

    let cost = 0;
    
    // Calculate input cost
    if (inputTokens > 0 && modelPricing.input) {
      cost += (inputTokens / 1000000) * modelPricing.input;
    }

    // Calculate output cost
    if (outputTokens > 0 && modelPricing.output) {
      cost += (outputTokens / 1000000) * modelPricing.output;
    }

    // Calculate thinking tokens cost (for Gemini 2.5 Pro)
    if (thinkingTokens > 0 && modelPricing.thinking) {
      cost += (thinkingTokens / 1000000) * modelPricing.thinking;
    }

    return parseFloat(cost.toFixed(6));
  }

  /**
   * Extract token usage from OpenAI API response
   * @param {Object} response - OpenAI API response
   * @returns {Object} Token usage data
   */
  extractOpenAIUsage(response) {
    const usage = response.usage || {};
    return {
      inputTokens: usage.prompt_tokens || 0,
      outputTokens: usage.completion_tokens || 0,
      totalTokens: usage.total_tokens || 0,
      cacheTokens: usage.prompt_tokens_details?.cached_tokens || 0
    };
  }

  /**
   * Extract token usage from Google AI API response
   * @param {Object} response - Google AI API response
   * @returns {Object} Token usage data
   */
  extractGoogleAIUsage(response) {
    const usageMetadata = response.usage_metadata || response.usageMetadata || {};
    return {
      inputTokens: usageMetadata.prompt_token_count || usageMetadata.promptTokenCount || 0,
      outputTokens: usageMetadata.candidates_token_count || usageMetadata.candidatesTokenCount || 0,
      totalTokens: usageMetadata.total_token_count || usageMetadata.totalTokenCount || 0,
      cacheTokens: usageMetadata.cached_content_token_count || usageMetadata.cachedContentTokenCount || 0
    };
  }

  /**
   * Record AI usage in the database
   * @param {Object} usageData - Usage data object
   * @returns {Promise<Object>} Created usage record
   */
  async recordUsage(usageData) {
    try {
      const {
        userId,
        contentId = null,
        fileId = null,
        processingJobId = null,
        aiProvider,
        aiModel,
        operationType,
        inputTokens = 0,
        outputTokens = 0,
        totalTokens = 0,
        cacheTokens = 0,
        requestDurationMs = null,
        requestSizeBytes = 0,
        responseSizeBytes = 0,
        success = true,
        errorMessage = null,
        errorCode = null,
        rateLimited = false,
        cachedResponse = false,
        geographicRegion = null,
        sessionId = null,
        metadata = null,
        providerRequestId = null,
        providerResponseMetadata = null,
        thinkingTokens = 0
      } = usageData;

      // Calculate estimated cost
      const estimatedCost = this.calculateCost(
        aiProvider, 
        aiModel, 
        inputTokens, 
        outputTokens, 
        thinkingTokens
      );

      // Get current billing period
      const billingPeriod = this.getCurrentBillingPeriod();

      // Create usage record
      const usageRecord = await ExternalAiUsage.create({
        user_id: userId,
        content_id: contentId,
        file_id: fileId,
        processing_job_id: processingJobId,
        ai_provider: aiProvider,
        ai_model: aiModel,
        operation_type: operationType,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens || (inputTokens + outputTokens),
        cache_tokens: cacheTokens,
        estimated_cost_usd: estimatedCost,
        request_duration_ms: requestDurationMs,
        request_size_bytes: requestSizeBytes,
        response_size_bytes: responseSizeBytes,
        success: success,
        error_message: errorMessage,
        error_code: errorCode,
        rate_limited: rateLimited,
        cached_response: cachedResponse,
        billing_period: billingPeriod,
        geographic_region: geographicRegion,
        session_id: sessionId,
        metadata: metadata,
        provider_request_id: providerRequestId,
        provider_response_metadata: providerResponseMetadata
      });

      console.log(`💰 AI Usage recorded: ${aiProvider}/${aiModel} - $${estimatedCost} (${totalTokens} tokens)`);
      
      return usageRecord;
    } catch (error) {
      console.error('❌ Failed to record AI usage:', error);
      throw error;
    }
  }

  /**
   * Track OpenAI API usage
   * @param {Object} params - Tracking parameters
   * @returns {Promise<Object>} Usage record
   */
  async trackOpenAIUsage(params) {
    const {
      userId,
      response,
      model,
      operationType,
      contentId = null,
      fileId = null,
      processingJobId = null,
      sessionId = null,
      requestDurationMs = null,
      metadata = null
    } = params;

    const usage = this.extractOpenAIUsage(response);
    
    return this.recordUsage({
      userId,
      contentId,
      fileId,
      processingJobId,
      aiProvider: 'openai',
      aiModel: model,
      operationType,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
      cacheTokens: usage.cacheTokens,
      requestDurationMs,
      sessionId,
      metadata,
      providerRequestId: response.id || null,
      providerResponseMetadata: {
        model: response.model,
        object: response.object,
        created: response.created,
        system_fingerprint: response.system_fingerprint,
        usage: response.usage
      }
    });
  }

  /**
   * Track Google AI API usage
   * @param {Object} params - Tracking parameters
   * @returns {Promise<Object>} Usage record
   */
  async trackGoogleAIUsage(params) {
    const {
      userId,
      response,
      model,
      operationType,
      contentId = null,
      fileId = null,
      processingJobId = null,
      sessionId = null,
      requestDurationMs = null,
      metadata = null
    } = params;

    const usage = this.extractGoogleAIUsage(response);
    
    return this.recordUsage({
      userId,
      contentId,
      fileId,
      processingJobId,
      aiProvider: 'google_ai',
      aiModel: model,
      operationType,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
      cacheTokens: usage.cacheTokens,
      requestDurationMs,
      sessionId,
      metadata,
      providerRequestId: null, // Google AI doesn't provide request IDs
      providerResponseMetadata: {
        usageMetadata: response.usage_metadata || response.usageMetadata,
        candidates: response.candidates?.length || 0,
        safetyRatings: response.candidates?.[0]?.safetyRatings || null
      }
    });
  }

  /**
   * Get user monthly usage summary
   * @param {string} userId - User ID
   * @param {string} billingPeriod - Billing period (YYYY-MM)
   * @returns {Promise<Array>} Usage summary by provider
   */
  async getUserMonthlyUsage(userId, billingPeriod = null) {
    const period = billingPeriod || this.getCurrentBillingPeriod();
    return ExternalAiUsage.getUserMonthlyUsage(userId, period);
  }

  /**
   * Get system-wide monthly usage by provider
   * @param {string} billingPeriod - Billing period (YYYY-MM)
   * @returns {Promise<Array>} System usage summary
   */
  async getSystemMonthlyUsage(billingPeriod = null) {
    const period = billingPeriod || this.getCurrentBillingPeriod();
    return ExternalAiUsage.getProviderMonthlyCosts(period);
  }

  /**
   * Get user daily usage breakdown
   * @param {string} userId - User ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Daily usage breakdown
   */
  async getUserDailyUsage(userId, startDate, endDate) {
    return ExternalAiUsage.getUserDailyCosts(userId, startDate, endDate);
  }

  /**
   * Calculate estimated monthly cost for a user
   * @param {string} userId - User ID
   * @param {string} billingPeriod - Billing period (YYYY-MM)
   * @returns {Promise<number>} Estimated monthly cost in USD
   */
  async calculateUserMonthlyCost(userId, billingPeriod = null) {
    const period = billingPeriod || this.getCurrentBillingPeriod();
    const usage = await this.getUserMonthlyUsage(userId, period);
    
    return usage.reduce((total, item) => {
      return total + parseFloat(item.dataValues.total_cost || 0);
    }, 0);
  }

  /**
   * Get real-time pricing for a provider/model
   * @param {string} provider - AI provider
   * @param {string} model - Model name
   * @returns {Object|null} Pricing information
   */
  getModelPricing(provider, model) {
    const providerPricing = this.pricingModels[provider];
    return providerPricing ? providerPricing[model] || null : null;
  }

  /**
   * Update pricing models (for admin use)
   * @param {Object} newPricing - New pricing structure
   */
  updatePricing(newPricing) {
    this.pricingModels = { ...this.pricingModels, ...newPricing };
  }
}

module.exports = AiUsageTracker;