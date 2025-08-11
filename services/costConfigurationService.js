/**
 * Cost Configuration Service
 * 
 * Provides dynamic cost calculation based on database-stored pricing configuration.
 * Replaces hardcoded pricing in AiUsageTracker and StorageUsageTracker with
 * configurable pricing that can be managed through the admin interface.
 * 
 * FEATURES:
 * - Database-driven pricing configuration
 * - Automatic fallback to default pricing
 * - Caching for performance optimization
 * - Support for effective dates and pricing history
 * - Real-time pricing updates without code changes
 * 
 * PRICING SOURCES:
 * 1. Database tables (ai_pricing_config, storage_pricing_config)
 * 2. Admin interface for updates
 * 3. Fallback to hardcoded defaults if database unavailable
 * 
 * AUTHOR: DaySave Development Team
 * CREATED: 2025-08-11
 */

const { AiPricingConfig, StoragePricingConfig } = require('../models');

class CostConfigurationService {
  constructor() {
    this.name = 'CostConfigurationService';
    this.cache = {
      ai: new Map(),
      storage: new Map(),
      lastUpdated: null
    };
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    // Fallback pricing if database is unavailable
    this.fallbackPricing = {
      ai: {
        'openai/gpt-4o-mini': { input: 0.15, output: 0.60 },
        'google_ai/gemini-1.5-flash': { input: 0.075, output: 0.30 }
      },
      storage: {
        'google_cloud_storage/standard': { storage: 0.020, operations: 0.0050, egress: 0.01 },
        'local/standard': { storage: 0.00, operations: 0.00, egress: 0.00 }
      }
    };
  }

  /**
   * Get AI model pricing from database or cache
   * @param {string} provider - AI provider (openai, google_ai, etc.)
   * @param {string} model - Model name (gpt-4o-mini, gemini-1.5-flash, etc.)
   * @returns {Promise<Object|null>} Pricing configuration
   */
  async getAiPricing(provider, model) {
    try {
      const cacheKey = `${provider}/${model}`;
      
      // Check cache first
      if (this.isCacheValid() && this.cache.ai.has(cacheKey)) {
        return this.cache.ai.get(cacheKey);
      }

      // Get from database
      const pricing = await AiPricingConfig.getCurrentPricing(provider, model);
      
      if (pricing) {
        const pricingData = {
          input: parseFloat(pricing.input_cost_per_million_tokens),
          output: parseFloat(pricing.output_cost_per_million_tokens),
          thinking: pricing.thinking_cost_per_million_tokens ? 
            parseFloat(pricing.thinking_cost_per_million_tokens) : null,
          specialUnit: pricing.special_pricing_unit,
          specialCost: pricing.special_pricing_cost ? 
            parseFloat(pricing.special_pricing_cost) : null,
          effectiveDate: pricing.effective_date,
          notes: pricing.notes
        };
        
        // Cache the result
        this.cache.ai.set(cacheKey, pricingData);
        this.updateCacheTimestamp();
        
        return pricingData;
      }

      // Fallback to hardcoded pricing
      const fallback = this.fallbackPricing.ai[cacheKey];
      if (fallback) {
        console.warn(`Using fallback pricing for ${provider}/${model}`);
        return fallback;
      }

      console.warn(`No pricing found for ${provider}/${model}`);
      return null;

    } catch (error) {
      console.error('Error getting AI pricing:', error);
      
      // Return fallback pricing on error
      const fallback = this.fallbackPricing.ai[`${provider}/${model}`];
      if (fallback) {
        console.warn(`Using fallback pricing due to error for ${provider}/${model}`);
        return fallback;
      }
      
      return null;
    }
  }

  /**
   * Get storage pricing from database or cache
   * @param {string} provider - Storage provider (google_cloud_storage, local, etc.)
   * @param {string} storageClass - Storage class (standard, nearline, etc.)
   * @returns {Promise<Object|null>} Pricing configuration
   */
  async getStoragePricing(provider, storageClass = 'standard') {
    try {
      const cacheKey = `${provider}/${storageClass}`;
      
      // Check cache first
      if (this.isCacheValid() && this.cache.storage.has(cacheKey)) {
        return this.cache.storage.get(cacheKey);
      }

      // Get from database
      const pricing = await StoragePricingConfig.getCurrentPricing(provider, storageClass);
      
      if (pricing) {
        const pricingData = {
          storage: parseFloat(pricing.storage_cost_per_gb_month),
          operations: parseFloat(pricing.operation_cost_per_1k),
          egress: parseFloat(pricing.egress_cost_per_gb),
          effectiveDate: pricing.effective_date,
          notes: pricing.notes
        };
        
        // Cache the result
        this.cache.storage.set(cacheKey, pricingData);
        this.updateCacheTimestamp();
        
        return pricingData;
      }

      // Fallback to hardcoded pricing
      const fallback = this.fallbackPricing.storage[cacheKey];
      if (fallback) {
        console.warn(`Using fallback pricing for ${provider}/${storageClass}`);
        return fallback;
      }

      console.warn(`No pricing found for ${provider}/${storageClass}`);
      return null;

    } catch (error) {
      console.error('Error getting storage pricing:', error);
      
      // Return fallback pricing on error
      const fallback = this.fallbackPricing.storage[`${provider}/${storageClass}`];
      if (fallback) {
        console.warn(`Using fallback pricing due to error for ${provider}/${storageClass}`);
        return fallback;
      }
      
      return null;
    }
  }

  /**
   * Calculate AI cost using database pricing
   * @param {string} provider - AI provider
   * @param {string} model - Model name
   * @param {number} inputTokens - Input tokens
   * @param {number} outputTokens - Output tokens
   * @param {number} thinkingTokens - Thinking tokens (optional)
   * @returns {Promise<number>} Cost in USD
   */
  async calculateAiCost(provider, model, inputTokens, outputTokens, thinkingTokens = 0) {
    const pricing = await this.getAiPricing(provider, model);
    
    if (!pricing) {
      console.warn(`No pricing available for ${provider}/${model}, returning 0 cost`);
      return 0;
    }

    // Calculate cost per million tokens
    const inputCost = (inputTokens / 1000000) * pricing.input;
    const outputCost = (outputTokens / 1000000) * pricing.output;
    const thinkingCost = thinkingTokens && pricing.thinking ? 
      (thinkingTokens / 1000000) * pricing.thinking : 0;

    return inputCost + outputCost + thinkingCost;
  }

  /**
   * Calculate storage cost using database pricing
   * @param {string} provider - Storage provider
   * @param {string} storageClass - Storage class
   * @param {number} sizeGB - Size in GB
   * @param {number} operations - Number of operations
   * @param {number} egressGB - Egress in GB
   * @param {number} durationMonths - Duration in months
   * @returns {Promise<number>} Cost in USD
   */
  async calculateStorageCost(provider, storageClass, sizeGB, operations = 0, egressGB = 0, durationMonths = 1) {
    const pricing = await this.getStoragePricing(provider, storageClass);
    
    if (!pricing) {
      console.warn(`No pricing available for ${provider}/${storageClass}, returning 0 cost`);
      return 0;
    }

    const storageCost = sizeGB * durationMonths * pricing.storage;
    const operationCost = (operations / 1000) * pricing.operations;
    const egressCost = egressGB * pricing.egress;

    return storageCost + operationCost + egressCost;
  }

  /**
   * Get all current AI pricing configurations
   * @returns {Promise<Array>} All active AI pricing configurations
   */
  async getAllAiPricing() {
    try {
      return await AiPricingConfig.getAllCurrentPricing();
    } catch (error) {
      console.error('Error getting all AI pricing:', error);
      return [];
    }
  }

  /**
   * Get all current storage pricing configurations
   * @returns {Promise<Array>} All active storage pricing configurations
   */
  async getAllStoragePricing() {
    try {
      return await StoragePricingConfig.getAllCurrentPricing();
    } catch (error) {
      console.error('Error getting all storage pricing:', error);
      return [];
    }
  }

  /**
   * Clear cache (useful when pricing is updated)
   */
  clearCache() {
    this.cache.ai.clear();
    this.cache.storage.clear();
    this.cache.lastUpdated = null;
    console.log('💾 Cost configuration cache cleared');
  }

  /**
   * Check if cache is still valid
   * @returns {boolean} Whether cache is valid
   */
  isCacheValid() {
    if (!this.cache.lastUpdated) return false;
    return (Date.now() - this.cache.lastUpdated) < this.cacheTimeout;
  }

  /**
   * Update cache timestamp
   */
  updateCacheTimestamp() {
    this.cache.lastUpdated = Date.now();
  }

  /**
   * Warm up cache by loading commonly used pricing
   */
  async warmUpCache() {
    try {
      console.log('🔥 Warming up cost configuration cache...');
      
      // Load common AI models
      const commonAiModels = [
        ['openai', 'gpt-4o-mini'],
        ['google_ai', 'gemini-1.5-flash'],
        ['openai', 'gpt-4'],
        ['google_ai', 'gemini-1.5-pro']
      ];

      // Load common storage configurations
      const commonStorageConfigs = [
        ['google_cloud_storage', 'standard'],
        ['local', 'standard']
      ];

      // Warm up AI pricing cache
      await Promise.all(
        commonAiModels.map(([provider, model]) => 
          this.getAiPricing(provider, model)
        )
      );

      // Warm up storage pricing cache
      await Promise.all(
        commonStorageConfigs.map(([provider, storageClass]) => 
          this.getStoragePricing(provider, storageClass)
        )
      );

      console.log(`✅ Cache warmed up: ${this.cache.ai.size} AI models, ${this.cache.storage.size} storage configs`);
      
    } catch (error) {
      console.error('Error warming up cache:', error);
    }
  }
}

// Export singleton instance
module.exports = new CostConfigurationService();
