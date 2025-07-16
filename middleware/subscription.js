const subscriptionService = require('../services/subscriptionService');
const logger = require('../config/logger');

/**
 * Subscription Middleware
 * Provides feature access control and usage limit enforcement based on subscription plans
 */

/**
 * Ensure user has an active subscription
 */
const requireActiveSubscription = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const subscription = await subscriptionService.getUserSubscription(req.user.id);
    
    if (!subscription) {
      logger.warn('User attempted to access feature without subscription', {
        userId: req.user.id,
        route: req.originalUrl
      });
      
      return res.status(403).json({
        success: false,
        error: 'Active subscription required',
        upgradeUrl: '/subscription/plans'
      });
    }

    if (subscription.status !== 'active') {
      logger.warn('User attempted to access feature with inactive subscription', {
        userId: req.user.id,
        status: subscription.status,
        route: req.originalUrl
      });
      
      return res.status(403).json({
        success: false,
        error: `Subscription is ${subscription.status}. Please update your subscription.`,
        upgradeUrl: '/subscription/plans'
      });
    }

    // Attach subscription to request for use in subsequent middleware/routes
    req.subscription = subscription;
    next();
  } catch (error) {
    logger.error('Error checking subscription status', {
      userId: req.user?.id,
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to verify subscription status'
    });
  }
};

/**
 * Check if user has required feature access
 * @param {string} feature - Feature name (e.g., 'ai_analysis_enabled', 'premium_support')
 */
const requireFeature = (feature) => {
  return async (req, res, next) => {
    try {
      // First ensure active subscription
      await new Promise((resolve, reject) => {
        requireActiveSubscription(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const plan = req.subscription.subscriptionPlan;
      
      if (!plan[feature]) {
        logger.warn('User attempted to access premium feature', {
          userId: req.user.id,
          feature,
          planName: plan.name,
          route: req.originalUrl
        });
        
        return res.status(403).json({
          success: false,
          error: `This feature requires a premium subscription`,
          feature,
          upgradeUrl: '/subscription/plans'
        });
      }

      next();
    } catch (error) {
      logger.error('Error checking feature access', {
        userId: req.user?.id,
        feature,
        error: error.message
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to verify feature access'
      });
    }
  };
};

/**
 * Check usage limits before allowing action
 * @param {string} feature - Usage feature (e.g., 'file_uploads', 'api_requests')
 * @param {number|function} amount - Amount to check (can be function that extracts from req)
 */
const checkUsageLimit = (feature, amount = 1) => {
  return async (req, res, next) => {
    try {
      // First ensure active subscription
      await new Promise((resolve, reject) => {
        requireActiveSubscription(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Calculate amount to check
      let checkAmount = amount;
      if (typeof amount === 'function') {
        checkAmount = amount(req);
      }

      const usageCheck = await subscriptionService.checkUsageLimit(
        req.user.id,
        feature,
        checkAmount
      );

      if (!usageCheck.allowed) {
        logger.warn('User exceeded usage limit', {
          userId: req.user.id,
          feature,
          currentUsage: usageCheck.currentUsage,
          limit: usageCheck.limit,
          requestedAmount: checkAmount,
          route: req.originalUrl
        });
        
        return res.status(429).json({
          success: false,
          error: 'Usage limit exceeded',
          feature,
          usage: usageCheck,
          upgradeUrl: '/subscription/plans'
        });
      }

      // Attach usage info to request
      req.usageCheck = usageCheck;
      next();
    } catch (error) {
      logger.error('Error checking usage limit', {
        userId: req.user?.id,
        feature,
        error: error.message
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to verify usage limits'
      });
    }
  };
};

/**
 * Update usage counter after successful action
 * @param {string} feature - Usage feature
 * @param {number|function} amount - Amount to increment
 */
const updateUsage = (feature, amount = 1) => {
  return async (req, res, next) => {
    try {
      // Store original res.json to intercept successful responses
      const originalJson = res.json;
      
      res.json = function(data) {
        // Only update usage on successful responses (2xx status codes)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Calculate amount to update
          let updateAmount = amount;
          if (typeof amount === 'function') {
            updateAmount = amount(req, data);
          }

          // Update usage asynchronously (don't block response)
          subscriptionService.updateUsage(req.user.id, feature, updateAmount)
            .then(() => {
              logger.info('Updated usage counter', {
                userId: req.user.id,
                feature,
                amount: updateAmount
              });
            })
            .catch((error) => {
              logger.error('Failed to update usage counter', {
                userId: req.user.id,
                feature,
                amount: updateAmount,
                error: error.message
              });
            });
        }
        
        // Call original json method
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      logger.error('Error setting up usage tracking', {
        userId: req.user?.id,
        feature,
        error: error.message
      });
      next(); // Continue anyway, don't block the request
    }
  };
};

/**
 * Combined middleware to check limits and update usage
 * @param {string} feature - Usage feature
 * @param {number|function} amount - Amount to check/update
 */
const enforceUsageLimit = (feature, amount = 1) => {
  return [
    checkUsageLimit(feature, amount),
    updateUsage(feature, amount)
  ];
};

/**
 * Check file size limits
 * @param {string} sizeField - Field name containing file size in bytes
 */
const checkFileSizeLimit = (sizeField = 'size') => {
  return async (req, res, next) => {
    try {
      // First ensure active subscription
      await new Promise((resolve, reject) => {
        requireActiveSubscription(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const plan = req.subscription.subscriptionPlan;
      const maxSizeMB = plan.max_file_size_mb;
      
      // Get file size from request
      let fileSizeBytes = 0;
      
      if (req.files && req.files.length > 0) {
        // Handle multiple files
        const totalSize = req.files.reduce((total, file) => total + file.size, 0);
        fileSizeBytes = totalSize;
      } else if (req.file) {
        // Handle single file
        fileSizeBytes = req.file.size;
      } else if (req.body && req.body[sizeField]) {
        // Handle size in request body
        fileSizeBytes = parseInt(req.body[sizeField]);
      }

      const fileSizeMB = fileSizeBytes / (1024 * 1024);
      
      if (maxSizeMB !== -1 && fileSizeMB > maxSizeMB) {
        logger.warn('User attempted to upload file exceeding size limit', {
          userId: req.user.id,
          fileSizeMB: fileSizeMB.toFixed(2),
          maxSizeMB,
          planName: plan.name
        });
        
        return res.status(413).json({
          success: false,
          error: 'File size exceeds plan limit',
          fileSizeMB: fileSizeMB.toFixed(2),
          maxSizeMB,
          upgradeUrl: '/subscription/plans'
        });
      }

      next();
    } catch (error) {
      logger.error('Error checking file size limit', {
        userId: req.user?.id,
        error: error.message
      });
      
      res.status(500).json({
        success: false,
        error: 'Failed to verify file size limits'
      });
    }
  };
};

/**
 * Add subscription info to response headers for client-side usage tracking
 */
const addSubscriptionHeaders = async (req, res, next) => {
  try {
    if (req.user && req.subscription) {
      const plan = req.subscription.subscriptionPlan;
      
      res.set({
        'X-Subscription-Plan': plan.name,
        'X-Subscription-Status': req.subscription.status,
        'X-File-Upload-Limit': plan.max_file_uploads,
        'X-Storage-Limit-GB': plan.max_storage_gb,
        'X-API-Key-Limit': plan.max_api_keys,
        'X-API-Request-Limit': plan.max_api_requests_per_hour
      });
    }
    
    next();
  } catch (error) {
    logger.error('Error adding subscription headers', {
      userId: req.user?.id,
      error: error.message
    });
    next(); // Continue anyway
  }
};

/**
 * Subscription-aware rate limiting
 * @param {string} feature - Feature to rate limit (e.g., 'api_requests')
 * @param {number} windowMs - Time window in milliseconds
 */
const subscriptionRateLimit = (feature, windowMs = 3600000) => { // Default 1 hour
  const requests = new Map(); // Store requests per user
  
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next();
      }

      // First ensure active subscription
      await new Promise((resolve, reject) => {
        requireActiveSubscription(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const plan = req.subscription.subscriptionPlan;
      const limit = plan[`max_${feature}`];
      
      // Unlimited access
      if (limit === -1) {
        return next();
      }

      const userId = req.user.id;
      const now = Date.now();
      const windowStart = now - windowMs;
      
      // Get user's request history
      if (!requests.has(userId)) {
        requests.set(userId, []);
      }
      
      const userRequests = requests.get(userId);
      
      // Remove old requests outside the window
      const validRequests = userRequests.filter(timestamp => timestamp > windowStart);
      requests.set(userId, validRequests);
      
      // Check if limit exceeded
      if (validRequests.length >= limit) {
        logger.warn('User exceeded rate limit', {
          userId,
          feature,
          limit,
          currentRequests: validRequests.length
        });
        
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          feature,
          limit,
          windowMs,
          retryAfter: Math.ceil((validRequests[0] + windowMs - now) / 1000)
        });
      }
      
      // Add current request
      validRequests.push(now);
      requests.set(userId, validRequests);
      
      next();
    } catch (error) {
      logger.error('Error in subscription rate limiting', {
        userId: req.user?.id,
        feature,
        error: error.message
      });
      next(); // Continue on error
    }
  };
};

module.exports = {
  requireActiveSubscription,
  requireFeature,
  checkUsageLimit,
  updateUsage,
  enforceUsageLimit,
  checkFileSizeLimit,
  addSubscriptionHeaders,
  subscriptionRateLimit
}; 