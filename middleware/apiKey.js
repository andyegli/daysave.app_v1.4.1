const { v4: uuidv4 } = require('uuid');
const apiKeyService = require('../services/apiKeyService');
const { logAuthEvent, logAuthError } = require('../config/logger');

/**
 * API Key Authentication Middleware
 * Handles API key validation, rate limiting, and usage logging
 */

/**
 * Extract API key from request headers
 * @param {Object} req - Express request object
 * @returns {string|null} API key or null
 */
const extractApiKey = (req) => {
  // Check Authorization header: "Bearer daysave_..."
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Check X-API-Key header
  const apiKeyHeader = req.headers['x-api-key'];
  if (apiKeyHeader) {
    return apiKeyHeader;
  }
  
  // Check query parameter (less secure, but sometimes needed)
  const queryApiKey = req.query.api_key;
  if (queryApiKey) {
    return queryApiKey;
  }
  
  return null;
};

/**
 * Check if IP is allowed for the API key
 * @param {string} clientIp - Client IP address
 * @param {Array} allowedIps - Array of allowed IPs/ranges
 * @returns {boolean} Whether IP is allowed
 */
const isIpAllowed = (clientIp, allowedIps) => {
  if (!allowedIps || allowedIps.length === 0) {
    return true; // No restrictions
  }
  
  // Simple IP matching (could be enhanced with CIDR support)
  return allowedIps.includes(clientIp);
};

/**
 * Check if origin is allowed for the API key
 * @param {string} origin - Request origin
 * @param {Array} allowedOrigins - Array of allowed origins
 * @returns {boolean} Whether origin is allowed
 */
const isOriginAllowed = (origin, allowedOrigins) => {
  if (!allowedOrigins || allowedOrigins.length === 0) {
    return true; // No restrictions
  }
  
  return allowedOrigins.includes(origin);
};

/**
 * Check if user has permission for the endpoint
 * @param {Object} permissions - API key permissions
 * @param {string} method - HTTP method
 * @param {string} endpoint - API endpoint
 * @returns {boolean} Whether access is allowed
 */
const hasPermission = (permissions, method, endpoint) => {
  if (!permissions || Object.keys(permissions).length === 0) {
    return false; // No permissions defined
  }
  
  // Check exact endpoint match
  const endpointPermissions = permissions[endpoint];
  if (endpointPermissions) {
    return endpointPermissions.includes(method.toUpperCase()) || 
           endpointPermissions.includes('ALL');
  }
  
  // Check wildcard patterns
  for (const [pattern, methods] of Object.entries(permissions)) {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      if (regex.test(endpoint)) {
        return methods.includes(method.toUpperCase()) || methods.includes('ALL');
      }
    }
  }
  
  return false;
};

/**
 * Get client information from request
 * @param {Object} req - Express request object
 * @returns {Object} Client information
 */
const getClientInfo = (req) => {
  const clientIp = req.ip || 
                   req.connection?.remoteAddress || 
                   req.socket?.remoteAddress ||
                   req.headers['x-forwarded-for']?.split(',')[0] ||
                   req.headers['x-real-ip'] ||
                   'unknown';
  
  return {
    ip: clientIp,
    userAgent: req.headers['user-agent'] || 'unknown',
    referer: req.headers['referer'] || null,
    origin: req.headers['origin'] || null,
    sessionId: req.sessionID || null
  };
};

/**
 * Main API key authentication middleware
 * @param {Object} options - Middleware options
 * @param {boolean} options.required - Whether API key is required
 * @param {Array} options.allowedMethods - Allowed HTTP methods
 * @param {boolean} options.logUsage - Whether to log usage
 * @returns {Function} Express middleware function
 */
const authenticateApiKey = (options = {}) => {
  const {
    required = true,
    allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    logUsage = true
  } = options;

  return async (req, res, next) => {
    const requestId = uuidv4();
    const startTime = Date.now();
    const clientInfo = getClientInfo(req);
    
    // Add request ID to request object
    req.requestId = requestId;
    req.apiKeyAuth = { authenticated: false };
    
    try {
      // Extract API key from request
      const apiKey = extractApiKey(req);
      
      if (!apiKey) {
        if (required) {
          return res.status(401).json({
            error: 'API key required',
            message: 'Please provide a valid API key in the Authorization header, X-API-Key header, or api_key query parameter'
          });
        } else {
          return next(); // API key not required, continue without authentication
        }
      }

      // Validate API key
      const apiKeyRecord = await apiKeyService.validateApiKey(apiKey);
      if (!apiKeyRecord) {
        if (logUsage) {
          await apiKeyService.logUsage(null, null, {
            endpoint: req.originalUrl,
            method: req.method,
            statusCode: 401,
            responseTime: Date.now() - startTime,
            clientIp: clientInfo.ip,
            userAgent: clientInfo.userAgent,
            referer: clientInfo.referer,
            origin: clientInfo.origin,
            requestId,
            errorMessage: 'Invalid API key',
            rateLimited: false
          });
        }
        
        return res.status(401).json({
          error: 'Invalid API key',
          message: 'The provided API key is invalid, expired, or disabled'
        });
      }

      // Check if method is allowed
      if (!allowedMethods.includes(req.method)) {
        return res.status(405).json({
          error: 'Method not allowed',
          message: `HTTP method ${req.method} is not allowed for this endpoint`
        });
      }

      // Check IP restrictions
      if (!isIpAllowed(clientInfo.ip, apiKeyRecord.allowed_ips)) {
        if (logUsage) {
          await apiKeyService.logUsage(apiKeyRecord.id, apiKeyRecord.user_id, {
            endpoint: req.originalUrl,
            method: req.method,
            statusCode: 403,
            responseTime: Date.now() - startTime,
            clientIp: clientInfo.ip,
            userAgent: clientInfo.userAgent,
            referer: clientInfo.referer,
            origin: clientInfo.origin,
            requestId,
            errorMessage: 'IP address not allowed',
            rateLimited: false
          });
        }
        
        return res.status(403).json({
          error: 'IP not allowed',
          message: 'Your IP address is not authorized to use this API key'
        });
      }

      // Check origin restrictions
      if (!isOriginAllowed(clientInfo.origin, apiKeyRecord.allowed_origins)) {
        if (logUsage) {
          await apiKeyService.logUsage(apiKeyRecord.id, apiKeyRecord.user_id, {
            endpoint: req.originalUrl,
            method: req.method,
            statusCode: 403,
            responseTime: Date.now() - startTime,
            clientIp: clientInfo.ip,
            userAgent: clientInfo.userAgent,
            referer: clientInfo.referer,
            origin: clientInfo.origin,
            requestId,
            errorMessage: 'Origin not allowed',
            rateLimited: false
          });
        }
        
        return res.status(403).json({
          error: 'Origin not allowed',
          message: 'Your origin domain is not authorized to use this API key'
        });
      }

      // Check endpoint permissions
      if (!hasPermission(apiKeyRecord.permissions, req.method, req.originalUrl)) {
        if (logUsage) {
          await apiKeyService.logUsage(apiKeyRecord.id, apiKeyRecord.user_id, {
            endpoint: req.originalUrl,
            method: req.method,
            statusCode: 403,
            responseTime: Date.now() - startTime,
            clientIp: clientInfo.ip,
            userAgent: clientInfo.userAgent,
            referer: clientInfo.referer,
            origin: clientInfo.origin,
            requestId,
            errorMessage: 'Insufficient permissions',
            rateLimited: false
          });
        }
        
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'Your API key does not have permission to access this endpoint'
        });
      }

      // Check rate limits
      const rateLimitResult = await apiKeyService.checkRateLimit(apiKeyRecord.id);
      if (!rateLimitResult.allowed) {
        if (logUsage) {
          await apiKeyService.logUsage(apiKeyRecord.id, apiKeyRecord.user_id, {
            endpoint: req.originalUrl,
            method: req.method,
            statusCode: 429,
            responseTime: Date.now() - startTime,
            clientIp: clientInfo.ip,
            userAgent: clientInfo.userAgent,
            referer: clientInfo.referer,
            origin: clientInfo.origin,
            requestId,
            errorMessage: rateLimitResult.reason,
            rateLimited: true
          });
        }
        
        const resetTime = rateLimitResult.resetTime;
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: rateLimitResult.reason,
          resetTime: resetTime ? resetTime.toISOString() : null
        });
      }

      // Add API key information to request
      req.apiKeyAuth = {
        authenticated: true,
        apiKey: apiKeyRecord,
        user: apiKeyRecord.owner,
        usage: rateLimitResult.usage,
        limits: rateLimitResult.limits
      };

      // Log successful authentication
      logAuthEvent('API_KEY_AUTH_SUCCESS', {
        apiKeyId: apiKeyRecord.id,
        userId: apiKeyRecord.user_id,
        endpoint: req.originalUrl,
        method: req.method,
        clientIp: clientInfo.ip
      });

      // Set up response interceptor for usage logging
      if (logUsage) {
        const originalSend = res.send;
        res.send = function(data) {
          const responseTime = Date.now() - startTime;
          const responseSize = Buffer.byteLength(data || '', 'utf8');
          
          // Log usage asynchronously
          setImmediate(async () => {
            try {
              await apiKeyService.logUsage(apiKeyRecord.id, apiKeyRecord.user_id, {
                endpoint: req.originalUrl,
                method: req.method,
                statusCode: res.statusCode,
                responseTime,
                requestSize: req.headers['content-length'] ? parseInt(req.headers['content-length']) : 0,
                responseSize,
                clientIp: clientInfo.ip,
                userAgent: clientInfo.userAgent,
                referer: clientInfo.referer,
                origin: clientInfo.origin,
                requestId,
                errorMessage: res.statusCode >= 400 ? 'Request failed' : null,
                rateLimited: false,
                geographicRegion: req.geoip?.region || null
              });
            } catch (error) {
              console.error('Usage logging failed:', error);
            }
          });
          
          return originalSend.call(this, data);
        };
      }

      next();
    } catch (error) {
      logAuthError('API_KEY_AUTH_ERROR', error, {
        endpoint: req.originalUrl,
        method: req.method,
        clientIp: clientInfo.ip
      });
      
      res.status(500).json({
        error: 'Authentication error',
        message: 'An error occurred while validating your API key'
      });
    }
  };
};

/**
 * Middleware to require admin permissions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const requireAdmin = (req, res, next) => {
  if (!req.apiKeyAuth?.authenticated) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'This endpoint requires API key authentication'
    });
  }
  
  if (!req.apiKeyAuth.user?.role_id || req.apiKeyAuth.user.role_id !== 'admin') {
    return res.status(403).json({
      error: 'Admin required',
      message: 'This endpoint requires admin privileges'
    });
  }
  
  next();
};

/**
 * Middleware to add CORS headers for API key requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const apiKeyCors = (req, res, next) => {
  // Add API-specific CORS headers
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Expose-Headers', 'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
};

module.exports = {
  authenticateApiKey,
  requireAdmin,
  apiKeyCors,
  extractApiKey,
  getClientInfo
}; 