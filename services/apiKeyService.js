const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { ApiKey, ApiKeyUsage, ApiKeyAuditLog, User } = require('../models');
const { Op } = require('sequelize');

/**
 * API Key Service - Handles all API key operations
 * Provides secure key generation, validation, usage tracking, and audit logging
 */
class ApiKeyService {
  
  /**
   * Generate a new API key for a user
   * @param {string} userId - User ID
   * @param {Object} keyData - Key configuration
   * @param {string} keyData.name - Key name
   * @param {string} keyData.description - Key description
   * @param {Date} keyData.expiresAt - Expiration date
   * @param {Object} keyData.permissions - Route permissions
   * @param {number} keyData.rateLimitPerMinute - Rate limit per minute
   * @param {number} keyData.rateLimitPerHour - Rate limit per hour
   * @param {number} keyData.rateLimitPerDay - Rate limit per day
   * @param {Array} keyData.allowedOrigins - Allowed origins
   * @param {Array} keyData.allowedIps - Allowed IP addresses
   * @returns {Object} Generated API key data
   */
  async generateApiKey(userId, keyData) {
    try {
      // Generate a secure random API key
      const apiKey = this.generateSecureKey();
      const keyPrefix = apiKey.substring(0, 8);
      const keyHash = await bcrypt.hash(apiKey, 12);
      
      // Create the API key record
      const apiKeyRecord = await ApiKey.create({
        id: uuidv4(),
        user_id: userId,
        key_name: keyData.name,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        description: keyData.description || null,
        expires_at: keyData.expiresAt || null,
        permissions: keyData.permissions || {},
        rate_limit_per_minute: keyData.rateLimitPerMinute || 60,
        rate_limit_per_hour: keyData.rateLimitPerHour || 1000,
        rate_limit_per_day: keyData.rateLimitPerDay || 10000,
        allowed_origins: keyData.allowedOrigins || null,
        allowed_ips: keyData.allowedIps || null,
        metadata: keyData.metadata || null
      });

      // Log the key generation
      await this.logAuditEvent(apiKeyRecord.id, userId, 'CREATE', 
        `API key "${keyData.name}" created`, 'medium');

      return {
        id: apiKeyRecord.id,
        key: apiKey, // Return the plain key only once
        name: keyData.name,
        prefix: keyPrefix,
        created: true
      };
    } catch (error) {
      await this.logAuditEvent(null, userId, 'CREATE', 
        `Failed to create API key: ${error.message}`, 'high', false, error.message);
      throw error;
    }
  }

  /**
   * Validate an API key and return key information
   * @param {string} apiKey - The API key to validate
   * @returns {Object|null} API key record or null if invalid
   */
  async validateApiKey(apiKey) {
    try {
      if (!apiKey || typeof apiKey !== 'string') {
        return null;
      }

      const keyPrefix = apiKey.substring(0, 8);
      
      // Find API key by prefix (for performance)
      const apiKeyRecord = await ApiKey.findOne({
        where: {
          key_prefix: keyPrefix,
          enabled: true,
          admin_disabled: false,
          [Op.or]: [
            { expires_at: null },
            { expires_at: { [Op.gt]: new Date() } }
          ]
        },
        include: [
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'username', 'email', 'role_id']
          }
        ]
      });

      if (!apiKeyRecord) {
        return null;
      }

      // Verify the key hash
      const isValid = await bcrypt.compare(apiKey, apiKeyRecord.key_hash);
      if (!isValid) {
        return null;
      }

      // Update last used timestamp
      await apiKeyRecord.update({
        last_used_at: new Date(),
        usage_count: apiKeyRecord.usage_count + 1
      });

      return apiKeyRecord;
    } catch (error) {
      console.error('API key validation error:', error);
      return null;
    }
  }

  /**
   * Check rate limits for an API key
   * @param {string} apiKeyId - API key ID
   * @returns {Object} Rate limit status
   */
  async checkRateLimit(apiKeyId) {
    try {
      const apiKeyRecord = await ApiKey.findByPk(apiKeyId);
      if (!apiKeyRecord) {
        return { allowed: false, reason: 'Invalid API key' };
      }

      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Check usage in different time windows
      const [minuteUsage, hourUsage, dayUsage] = await Promise.all([
        ApiKeyUsage.count({
          where: {
            api_key_id: apiKeyId,
            createdAt: { [Op.gte]: oneMinuteAgo }
          }
        }),
        ApiKeyUsage.count({
          where: {
            api_key_id: apiKeyId,
            createdAt: { [Op.gte]: oneHourAgo }
          }
        }),
        ApiKeyUsage.count({
          where: {
            api_key_id: apiKeyId,
            createdAt: { [Op.gte]: oneDayAgo }
          }
        })
      ]);

      // Check against limits
      if (minuteUsage >= apiKeyRecord.rate_limit_per_minute) {
        return { 
          allowed: false, 
          reason: 'Rate limit exceeded (per minute)',
          resetTime: new Date(oneMinuteAgo.getTime() + 60 * 1000)
        };
      }

      if (hourUsage >= apiKeyRecord.rate_limit_per_hour) {
        return { 
          allowed: false, 
          reason: 'Rate limit exceeded (per hour)',
          resetTime: new Date(oneHourAgo.getTime() + 60 * 60 * 1000)
        };
      }

      if (dayUsage >= apiKeyRecord.rate_limit_per_day) {
        return { 
          allowed: false, 
          reason: 'Rate limit exceeded (per day)',
          resetTime: new Date(oneDayAgo.getTime() + 24 * 60 * 60 * 1000)
        };
      }

      return { 
        allowed: true, 
        usage: { minuteUsage, hourUsage, dayUsage },
        limits: {
          minute: apiKeyRecord.rate_limit_per_minute,
          hour: apiKeyRecord.rate_limit_per_hour,
          day: apiKeyRecord.rate_limit_per_day
        }
      };
    } catch (error) {
      console.error('Rate limit check error:', error);
      return { allowed: false, reason: 'Internal error' };
    }
  }

  /**
   * Log API key usage
   * @param {string} apiKeyId - API key ID
   * @param {string} userId - User ID
   * @param {Object} usageData - Usage data
   */
  async logUsage(apiKeyId, userId, usageData) {
    try {
      await ApiKeyUsage.create({
        id: uuidv4(),
        api_key_id: apiKeyId,
        user_id: userId,
        endpoint: usageData.endpoint,
        method: usageData.method,
        status_code: usageData.statusCode,
        response_time_ms: usageData.responseTime,
        request_size_bytes: usageData.requestSize || 0,
        response_size_bytes: usageData.responseSize || 0,
        client_ip: usageData.clientIp,
        user_agent: usageData.userAgent,
        referer: usageData.referer,
        origin: usageData.origin,
        request_id: usageData.requestId,
        error_message: usageData.errorMessage,
        tokens_used: usageData.tokensUsed || 0,
        estimated_cost: usageData.estimatedCost || 0,
        cache_hit: usageData.cacheHit || false,
        rate_limited: usageData.rateLimited || false,
        geographic_region: usageData.geographicRegion,
        metadata: usageData.metadata
      });
    } catch (error) {
      console.error('Usage logging error:', error);
    }
  }

  /**
   * Log audit events
   * @param {string} apiKeyId - API key ID (optional)
   * @param {string} userId - User ID
   * @param {string} action - Action type
   * @param {string} description - Description
   * @param {string} severity - Severity level
   * @param {boolean} success - Whether action was successful
   * @param {string} failureReason - Failure reason if applicable
   * @param {string} adminUserId - Admin user ID if applicable
   * @param {Object} oldValues - Old values for updates
   * @param {Object} newValues - New values for updates
   */
  async logAuditEvent(apiKeyId, userId, action, description, severity = 'low', 
                      success = true, failureReason = null, adminUserId = null, 
                      oldValues = null, newValues = null) {
    try {
      await ApiKeyAuditLog.create({
        id: uuidv4(),
        api_key_id: apiKeyId,
        user_id: userId,
        admin_user_id: adminUserId,
        action,
        description,
        severity,
        success,
        failure_reason: failureReason,
        old_values: oldValues,
        new_values: newValues,
        client_ip: null, // Will be set by middleware
        user_agent: null, // Will be set by middleware
        session_id: null, // Will be set by middleware
        request_id: uuidv4()
      });
    } catch (error) {
      console.error('Audit logging error:', error);
    }
  }

  /**
   * Generate a secure API key
   * @returns {string} Secure API key
   */
  generateSecureKey() {
    // Generate a 32-byte random key and encode as base64
    const randomBytes = crypto.randomBytes(32);
    const base64Key = randomBytes.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    return `daysave_${base64Key}`;
  }

  /**
   * Get API keys for a user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Array} API keys
   */
  async getUserApiKeys(userId, options = {}) {
    try {
      const whereClause = { user_id: userId };
      
      if (options.enabled !== undefined) {
        whereClause.enabled = options.enabled;
      }
      
      if (options.includeExpired === false) {
        whereClause[Op.or] = [
          { expires_at: null },
          { expires_at: { [Op.gt]: new Date() } }
        ];
      }

      const apiKeys = await ApiKey.findAll({
        where: whereClause,
        attributes: { exclude: ['key_hash'] }, // Never return the hash
        order: [['createdAt', 'DESC']],
        limit: options.limit || 50,
        offset: options.offset || 0
      });

      return apiKeys;
    } catch (error) {
      console.error('Get user API keys error:', error);
      throw error;
    }
  }

  /**
   * Update API key
   * @param {string} keyId - API key ID
   * @param {string} userId - User ID
   * @param {Object} updateData - Update data
   * @param {string} adminUserId - Admin user ID (optional)
   * @returns {Object} Updated API key
   */
  async updateApiKey(keyId, userId, updateData, adminUserId = null) {
    try {
      const apiKey = await ApiKey.findOne({
        where: { id: keyId, user_id: userId }
      });

      if (!apiKey) {
        throw new Error('API key not found');
      }

      const oldValues = apiKey.toJSON();
      await apiKey.update(updateData);
      const newValues = apiKey.toJSON();

      // Log the update
      await this.logAuditEvent(keyId, userId, 'UPDATE', 
        `API key "${apiKey.key_name}" updated`, 'medium', true, null, 
        adminUserId, oldValues, newValues);

      return apiKey;
    } catch (error) {
      await this.logAuditEvent(keyId, userId, 'UPDATE', 
        `Failed to update API key: ${error.message}`, 'high', false, error.message);
      throw error;
    }
  }

  /**
   * Delete API key
   * @param {string} keyId - API key ID
   * @param {string} userId - User ID
   * @param {string} adminUserId - Admin user ID (optional)
   */
  async deleteApiKey(keyId, userId, adminUserId = null) {
    try {
      const apiKey = await ApiKey.findOne({
        where: { id: keyId, user_id: userId }
      });

      if (!apiKey) {
        throw new Error('API key not found');
      }

      await apiKey.destroy();

      // Log the deletion
      await this.logAuditEvent(keyId, userId, 'DELETE', 
        `API key "${apiKey.key_name}" deleted`, 'high', true, null, adminUserId);

      return { success: true };
    } catch (error) {
      await this.logAuditEvent(keyId, userId, 'DELETE', 
        `Failed to delete API key: ${error.message}`, 'high', false, error.message);
      throw error;
    }
  }

  /**
   * Get usage statistics for an API key
   * @param {string} keyId - API key ID
   * @param {Object} options - Query options
   * @returns {Object} Usage statistics
   */
  async getUsageStats(keyId, options = {}) {
    try {
      const startDate = options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = options.endDate || new Date();

      const usage = await ApiKeyUsage.findAll({
        where: {
          api_key_id: keyId,
          createdAt: {
            [Op.between]: [startDate, endDate]
          }
        },
        order: [['createdAt', 'DESC']]
      });

      // Calculate statistics
      const stats = {
        totalRequests: usage.length,
        successfulRequests: usage.filter(u => u.status_code < 400).length,
        errorRequests: usage.filter(u => u.status_code >= 400).length,
        averageResponseTime: usage.reduce((sum, u) => sum + u.response_time_ms, 0) / usage.length || 0,
        totalTokensUsed: usage.reduce((sum, u) => sum + u.tokens_used, 0),
        totalCost: usage.reduce((sum, u) => sum + parseFloat(u.estimated_cost), 0),
        cacheHitRate: usage.filter(u => u.cache_hit).length / usage.length || 0,
        rateLimitedRequests: usage.filter(u => u.rate_limited).length,
        uniqueIPs: [...new Set(usage.map(u => u.client_ip))].length,
        topEndpoints: this.getTopEndpoints(usage),
        dailyUsage: this.getDailyUsage(usage, startDate, endDate)
      };

      return stats;
    } catch (error) {
      console.error('Get usage stats error:', error);
      throw error;
    }
  }

  /**
   * Get top endpoints from usage data
   * @param {Array} usage - Usage data
   * @returns {Array} Top endpoints
   */
  getTopEndpoints(usage) {
    const endpointCount = {};
    usage.forEach(u => {
      const key = `${u.method} ${u.endpoint}`;
      endpointCount[key] = (endpointCount[key] || 0) + 1;
    });

    return Object.entries(endpointCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([endpoint, count]) => ({ endpoint, count }));
  }

  /**
   * Get daily usage breakdown
   * @param {Array} usage - Usage data
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Array} Daily usage
   */
  getDailyUsage(usage, startDate, endDate) {
    const dailyUsage = {};
    
    // Initialize all days in range
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      dailyUsage[dateKey] = 0;
    }

    // Count usage per day
    usage.forEach(u => {
      const dateKey = u.createdAt.toISOString().split('T')[0];
      dailyUsage[dateKey] = (dailyUsage[dateKey] || 0) + 1;
    });

    return Object.entries(dailyUsage)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}

module.exports = new ApiKeyService(); 