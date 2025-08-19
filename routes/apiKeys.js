const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { isAuthenticated, isAdmin, checkUsageLimit, updateUsage, requirePermission } = require('../middleware');
const { authenticateApiKey, requireAdmin } = require('../middleware/apiKey');
const apiKeyService = require('../services/apiKeyService');
const { logAuthEvent, logAuthError } = require('../config/logger');

/**
 * API Key Management Routes
 * Handles CRUD operations for API keys with proper authentication and authorization
 */

/**
 * Validation middleware for API key creation
 */
const validateApiKeyCreation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('API key name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('expiresAt')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Expiration date must be a valid ISO 8601 date'),
  body('permissions')
    .optional()
    .isObject()
    .withMessage('Permissions must be an object'),
  body('rateLimitPerMinute')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Rate limit per minute must be between 1 and 1000'),
  body('rateLimitPerHour')
    .optional()
    .isInt({ min: 1, max: 100000 })
    .withMessage('Rate limit per hour must be between 1 and 100000'),
  body('rateLimitPerDay')
    .optional()
    .isInt({ min: 1, max: 1000000 })
    .withMessage('Rate limit per day must be between 1 and 1000000'),
  body('allowedOrigins')
    .optional()
    .isArray()
    .withMessage('Allowed origins must be an array'),
  body('allowedIps')
    .optional()
    .isArray()
    .withMessage('Allowed IPs must be an array')
];

/**
 * GET /api/keys - Get user's API keys
 */
router.get('/', isAuthenticated, requirePermission('api.view_usage'), async (req, res) => {
  try {
    const { enabled, includeExpired, limit, offset } = req.query;
    
    const options = {
      enabled: enabled !== undefined ? enabled === 'true' : undefined,
      includeExpired: includeExpired === 'true',
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    };
    
    const apiKeys = await apiKeyService.getUserApiKeys(req.user.id, options);
    
    res.json({
      success: true,
      data: apiKeys,
      pagination: {
        limit: options.limit,
        offset: options.offset,
        total: apiKeys.length
      }
    });
  } catch (error) {
    logAuthError('API_KEY_LIST_ERROR', error, {
      userId: req.user.id,
      endpoint: req.originalUrl
    });
    
    res.status(500).json({
      error: 'Failed to retrieve API keys',
      message: 'An error occurred while fetching your API keys'
    });
  }
});

/**
 * POST /api/keys - Create new API key
 */
router.post('/', [
  isAuthenticated,
  requirePermission('api.create_keys'), 
  checkUsageLimit('api_keys'),
  validateApiKeyCreation,
  updateUsage('api_keys')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    
    const keyData = {
      name: req.body.name,
      description: req.body.description,
      expiresAt: req.body.expiresAt,
      permissions: req.body.permissions || {},
      rateLimitPerMinute: req.body.rateLimitPerMinute || 60,
      rateLimitPerHour: req.body.rateLimitPerHour || 1000,
      rateLimitPerDay: req.body.rateLimitPerDay || 10000,
      allowedOrigins: req.body.allowedOrigins,
      allowedIps: req.body.allowedIps,
      metadata: req.body.metadata
    };
    
    const result = await apiKeyService.generateApiKey(req.user.id, keyData);
    
    logAuthEvent('API_KEY_CREATED', {
      userId: req.user.id,
      apiKeyId: result.id,
      keyName: result.name
    });
    
    res.status(201).json({
      success: true,
      data: result,
      message: 'API key created successfully. Save this key securely as it cannot be retrieved again.'
    });
  } catch (error) {
    logAuthError('API_KEY_CREATE_ERROR', error, {
      userId: req.user.id,
      endpoint: req.originalUrl,
      keyName: req.body.name
    });
    
    res.status(500).json({
      error: 'Failed to create API key',
      message: 'An error occurred while creating your API key'
    });
  }
});

/**
 * GET /api/keys/:id - Get specific API key details
 */
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const apiKeys = await apiKeyService.getUserApiKeys(req.user.id);
    const apiKey = apiKeys.find(key => key.id === req.params.id);
    
    if (!apiKey) {
      return res.status(404).json({
        error: 'API key not found',
        message: 'The specified API key does not exist or you do not have access to it'
      });
    }
    
    res.json({
      success: true,
      data: apiKey
    });
  } catch (error) {
    logAuthError('API_KEY_GET_ERROR', error, {
      userId: req.user.id,
      apiKeyId: req.params.id,
      endpoint: req.originalUrl
    });
    
    res.status(500).json({
      error: 'Failed to retrieve API key',
      message: 'An error occurred while fetching the API key details'
    });
  }
});

/**
 * PUT /api/keys/:id - Update API key
 */
router.put('/:id', isAuthenticated, requirePermission('api.manage_keys'), validateApiKeyCreation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    
    const updateData = {
      key_name: req.body.name,
      description: req.body.description,
      expires_at: req.body.expiresAt,
      permissions: req.body.permissions,
      rate_limit_per_minute: req.body.rateLimitPerMinute,
      rate_limit_per_hour: req.body.rateLimitPerHour,
      rate_limit_per_day: req.body.rateLimitPerDay,
      allowed_origins: req.body.allowedOrigins,
      allowed_ips: req.body.allowedIps,
      metadata: req.body.metadata
    };
    
    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    
    const updatedKey = await apiKeyService.updateApiKey(req.params.id, req.user.id, updateData);
    
    logAuthEvent('API_KEY_UPDATED', {
      userId: req.user.id,
      apiKeyId: req.params.id,
      keyName: updatedKey.key_name
    });
    
    res.json({
      success: true,
      data: updatedKey,
      message: 'API key updated successfully'
    });
  } catch (error) {
    logAuthError('API_KEY_UPDATE_ERROR', error, {
      userId: req.user.id,
      apiKeyId: req.params.id,
      endpoint: req.originalUrl
    });
    
    if (error.message === 'API key not found') {
      return res.status(404).json({
        error: 'API key not found',
        message: 'The specified API key does not exist or you do not have access to it'
      });
    }
    
    res.status(500).json({
      error: 'Failed to update API key',
      message: 'An error occurred while updating the API key'
    });
  }
});

/**
 * DELETE /api/keys/:id - Delete API key
 */
router.delete('/:id', isAuthenticated, requirePermission('api.manage_keys'), async (req, res) => {
  try {
    await apiKeyService.deleteApiKey(req.params.id, req.user.id);
    
    logAuthEvent('API_KEY_DELETED', {
      userId: req.user.id,
      apiKeyId: req.params.id
    });
    
    res.json({
      success: true,
      message: 'API key deleted successfully'
    });
  } catch (error) {
    logAuthError('API_KEY_DELETE_ERROR', error, {
      userId: req.user.id,
      apiKeyId: req.params.id,
      endpoint: req.originalUrl
    });
    
    if (error.message === 'API key not found') {
      return res.status(404).json({
        error: 'API key not found',
        message: 'The specified API key does not exist or you do not have access to it'
      });
    }
    
    res.status(500).json({
      error: 'Failed to delete API key',
      message: 'An error occurred while deleting the API key'
    });
  }
});

/**
 * POST /api/keys/:id/toggle - Toggle API key enabled/disabled
 */
router.post('/:id/toggle', isAuthenticated, async (req, res) => {
  try {
    const apiKeys = await apiKeyService.getUserApiKeys(req.user.id);
    const apiKey = apiKeys.find(key => key.id === req.params.id);
    
    if (!apiKey) {
      return res.status(404).json({
        error: 'API key not found',
        message: 'The specified API key does not exist or you do not have access to it'
      });
    }
    
    const newEnabledState = !apiKey.enabled;
    const updatedKey = await apiKeyService.updateApiKey(req.params.id, req.user.id, {
      enabled: newEnabledState
    });
    
    logAuthEvent('API_KEY_TOGGLED', {
      userId: req.user.id,
      apiKeyId: req.params.id,
      enabled: newEnabledState
    });
    
    res.json({
      success: true,
      data: updatedKey,
      message: `API key ${newEnabledState ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    logAuthError('API_KEY_TOGGLE_ERROR', error, {
      userId: req.user.id,
      apiKeyId: req.params.id,
      endpoint: req.originalUrl
    });
    
    res.status(500).json({
      error: 'Failed to toggle API key',
      message: 'An error occurred while toggling the API key status'
    });
  }
});

/**
 * GET /api/keys/:id/usage - Get API key usage statistics
 */
router.get('/:id/usage', isAuthenticated, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const options = {};
    if (startDate) options.startDate = new Date(startDate);
    if (endDate) options.endDate = new Date(endDate);
    
    const stats = await apiKeyService.getUsageStats(req.params.id, options);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logAuthError('API_KEY_USAGE_ERROR', error, {
      userId: req.user.id,
      apiKeyId: req.params.id,
      endpoint: req.originalUrl
    });
    
    res.status(500).json({
      error: 'Failed to retrieve usage statistics',
      message: 'An error occurred while fetching the usage statistics'
    });
  }
});

/**
 * GET /api/keys/:id/usage/export - Export usage data as CSV
 */
router.get('/:id/usage/export', isAuthenticated, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const options = {};
    if (startDate) options.startDate = new Date(startDate);
    if (endDate) options.endDate = new Date(endDate);
    
    const stats = await apiKeyService.getUsageStats(req.params.id, options);
    
    // Simple CSV export (could be enhanced with proper CSV library)
    const csvData = [
      ['Date', 'Endpoint', 'Method', 'Status', 'Response Time (ms)', 'Tokens Used', 'Cost ($)'],
      ...stats.dailyUsage.map(day => [
        day.date,
        '', // Would need detailed usage data for this
        '',
        '',
        '',
        '',
        ''
      ])
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="api-usage-${req.params.id}.csv"`);
    res.send(csvContent);
  } catch (error) {
    logAuthError('API_KEY_EXPORT_ERROR', error, {
      userId: req.user.id,
      apiKeyId: req.params.id,
      endpoint: req.originalUrl
    });
    
    res.status(500).json({
      error: 'Failed to export usage data',
      message: 'An error occurred while exporting the usage data'
    });
  }
});

/**
 * GET /api/keys/usage/summary - Get usage summary for all user's API keys
 */
router.get('/usage/summary', isAuthenticated, async (req, res) => {
  try {
    const apiKeys = await apiKeyService.getUserApiKeys(req.user.id);
    
    // Calculate summary statistics
    const summary = {
      totalKeys: apiKeys.length,
      activeKeys: apiKeys.filter(key => key.enabled && !key.admin_disabled).length,
      totalRequests: apiKeys.reduce((sum, key) => sum + key.usage_count, 0),
      totalCost: 0 // This would need to be calculated from usage stats
    };
    
    // If we have keys, try to get more detailed usage stats
    if (apiKeys.length > 0) {
      try {
        // Get usage stats for all keys in the last 30 days
        const usagePromises = apiKeys.map(key => 
          apiKeyService.getUsageStats(key.id, {
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            endDate: new Date()
          }).catch(() => ({ totalCost: 0, totalRequests: 0 }))
        );
        
        const usageStats = await Promise.all(usagePromises);
        
        summary.totalCost = usageStats.reduce((sum, stats) => sum + (stats.totalCost || 0), 0);
        summary.totalRequests = usageStats.reduce((sum, stats) => sum + (stats.totalRequests || 0), 0);
      } catch (error) {
        console.warn('Error calculating detailed usage stats:', error);
        // Continue with basic stats
      }
    }
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    logAuthError('API_KEY_USAGE_SUMMARY_ERROR', error, {
      userId: req.user.id,
      endpoint: req.originalUrl
    });
    
    res.status(500).json({
      error: 'Failed to retrieve usage summary',
      message: 'An error occurred while fetching the usage summary'
    });
  }
});

// Admin routes
/**
 * GET /api/admin/keys - Get all API keys (admin only)
 */
router.get('/admin/keys', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { userId, enabled, limit, offset } = req.query;
    
    // This would need to be implemented in the service
    // For now, return a placeholder
    res.json({
      success: true,
      data: [],
      message: 'Admin API key listing - to be implemented'
    });
  } catch (error) {
    logAuthError('ADMIN_API_KEY_LIST_ERROR', error, {
      adminId: req.user.id,
      endpoint: req.originalUrl
    });
    
    res.status(500).json({
      error: 'Failed to retrieve API keys',
      message: 'An error occurred while fetching API keys'
    });
  }
});

/**
 * POST /api/admin/keys/:id/disable - Disable API key (admin only)
 */
router.post('/admin/keys/:id/disable', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    
    // This would need to be implemented in the service
    // For now, return a placeholder
    res.json({
      success: true,
      message: 'Admin API key disable - to be implemented'
    });
  } catch (error) {
    logAuthError('ADMIN_API_KEY_DISABLE_ERROR', error, {
      adminId: req.user.id,
      apiKeyId: req.params.id,
      endpoint: req.originalUrl
    });
    
    res.status(500).json({
      error: 'Failed to disable API key',
      message: 'An error occurred while disabling the API key'
    });
  }
});

/**
 * GET /api/admin/usage-stats - Get global usage statistics (admin only)
 */
router.get('/admin/usage-stats', isAuthenticated, isAdmin, async (req, res) => {
  try {
    // This would need to be implemented in the service
    // For now, return a placeholder
    res.json({
      success: true,
      data: {
        totalKeys: 0,
        activeKeys: 0,
        totalRequests: 0,
        totalCost: 0
      },
      message: 'Admin usage stats - to be implemented'
    });
  } catch (error) {
    logAuthError('ADMIN_USAGE_STATS_ERROR', error, {
      adminId: req.user.id,
      endpoint: req.originalUrl
    });
    
    res.status(500).json({
      error: 'Failed to retrieve usage statistics',
      message: 'An error occurred while fetching usage statistics'
    });
  }
});

module.exports = router; 