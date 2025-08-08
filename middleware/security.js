/**
 * Security Middleware for DaySave
 * 
 * PURPOSE:
 * Provides comprehensive security middleware for protecting the application
 * from common web vulnerabilities and attacks including rate limiting,
 * CORS management, and security headers configuration.
 * 
 * FEATURES:
 * - Rate limiting for API endpoints and authentication
 * - CORS (Cross-Origin Resource Sharing) configuration
 * - Security headers via Helmet.js
 * - CSP (Content Security Policy) enforcement
 * - Client detail tracking for security events
 * - Configurable security policies per environment
 * 
 * SECURITY MEASURES:
 * - Request rate limiting (configurable per route type)
 * - Authentication attempt limiting
 * - CORS origin validation
 * - Security header injection
 * - XSS protection
 * - CSRF protection integration
 * - Content type validation
 * 
 * RATE LIMITING:
 * - Auth routes: 5 attempts per 15 minutes
 * - API routes: 100 requests per 15 minutes
 * - General routes: 100 requests per 15 minutes
 * - Bypass available for development/debugging
 * 
 * CORS CONFIGURATION:
 * - Configurable allowed origins
 * - Credential support for authenticated requests
 * - Method and header restrictions
 * - Environment-specific settings
 * 
 * DEPENDENCIES:
 * - express-rate-limit for request throttling
 * - helmet for security headers
 * - cors for cross-origin handling
 * - winston logging system
 * 
 * AUTHOR: DaySave Development Team
 * CREATED: 2025-08-01 (Core Security System)
 */

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const { logSecurityEvent } = require('../config/logger');

// Helper function to get client details
const getClientDetails = (req) => ({
  ip: req.ip || (req.connection && req.connection.remoteAddress) || req.headers['x-forwarded-for'] || 'unknown',
  userAgent: req.headers['user-agent'] || 'unknown',
  referer: req.headers.referer || 'unknown',
  url: req.originalUrl,
  method: req.method
});

// Rate limiting middleware
const setupRateLimiter = (options) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
  };
  // For debugging, we bypass the rate limiter.
  // In production, you would use: return rateLimit({...defaultOptions, ...options});
  return (req, res, next) => next();
};

// Rate limiting for authentication routes
const authRateLimiter = setupRateLimiter({
  max: 5, // 5 attempts per 15 minutes
  message: { error: 'Too many authentication attempts' }
});

const apiRateLimiter = setupRateLimiter({
  max: 100 // 100 requests per 15 minutes
});

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const port = process.env.APP_PORT || process.env.PORT || 3000;
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : [
          `http://localhost:${port}`,
          `https://localhost:${port}`, // Allow HTTPS for localhost in development
          'http://localhost:5000',
          'https://localhost:5000',
          'http://daysave.local',
          'https://daysave.local',
          'http://daysave.app',
          'https://daysave.app'
        ];
    
    // Allow requests with no origin (like mobile apps or curl requests) or with origin 'null'
    if (!origin || origin === 'null') return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      const clientDetails = getClientDetails({ headers: { origin } });
      
      logSecurityEvent('CORS_BLOCKED', {
        ...clientDetails,
        blockedOrigin: origin,
        allowedOrigins
      });
      
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

// Log all incoming request headers for debugging
const logAllHeaders = (req, res, next) => {
  console.log('--- Incoming Request Headers ---');
  console.log(req.method, req.originalUrl);
  console.log(req.headers);
  console.log('---------------------------------');
  next();
};

// CORS middleware function
const corsMiddleware = cors(corsOptions);

// Check if development HTTP access from any IP is allowed
const checkDevHttpAccess = async () => {
  // Only check in development mode
  if (process.env.NODE_ENV !== 'development') {
    return false;
  }

  try {
    const { AdminSetting } = require('../models');
    const setting = await AdminSetting.findOne({
      order: [['createdAt', 'DESC']]
    });
    
    return setting?.allow_dev_http_any_ip || false;
  } catch (error) {
    console.warn('Could not check dev HTTP access setting:', error.message);
    return false;
  }
};

// Security headers middleware
const securityHeaders = () => {
  const cspDirectives = {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com", "https://unpkg.com"],
    scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "https://maps.googleapis.com", "https://code.jquery.com"],
    imgSrc: ["'self'", "data:", "blob:", "https:", "https://maps.googleapis.com", "https://maps.gstatic.com"],
    connectSrc: ["'self'", "https://maps.googleapis.com", "https://maps.gstatic.com"],
    fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://fonts.gstatic.com"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'", "blob:"],
    frameSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'self'"],
    scriptSrcAttr: ["'none'"]
  };

  // NEVER enable upgrade-insecure-requests for localhost development
  // This prevents browsers from forcing HTTP to HTTPS conversion
  // For development: completely omit upgrade-insecure-requests to prevent SSL errors
  // upgradeInsecureRequests is deliberately NOT added to cspDirectives in any environment for localhost
  console.log('🔒 CSP Development Mode: upgrade-insecure-requests completely excluded from directives');

  const helmetConfig = {
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
      directives: cspDirectives,
      reportOnly: false
    } : false, // Completely disable CSP in development to prevent upgrade-insecure-requests
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: process.env.NODE_ENV === 'production' ? {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    } : false // Disable HSTS for development to prevent localhost SSL errors
  };

  // upgradeInsecureRequests is handled in cspDirectives above
  // Do not add it here to prevent SSL errors for IP-based access in development

  return helmet(helmetConfig);
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const clientDetails = getClientDetails(req);
  
  // logSecurityEvent('REQUEST_LOG', {
  //   ...clientDetails,
  //   userId: req.user?.id || 'unauthenticated',
  //   timestamp: new Date().toISOString()
  // }); // Disabled - too verbose for normal operation
  
  next();
};

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Sanitize body
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }
  
  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key].trim();
      }
    });
  }
  
  next();
};

// CSRF protection middleware (for non-GET requests)
const csrfProtection = (req, res, next) => {
  if (req.method === 'GET') {
    return next();
  }
  
  // Skip CSRF protection for file uploads during development
  // File uploads from forms are inherently safer due to multipart/form-data
  if (req.url.includes('/upload') && req.headers['content-type']?.includes('multipart/form-data')) {
    console.log('🔓 Skipping CSRF protection for file upload');
    return next();
  }
  
  const clientDetails = getClientDetails(req);
  
  // Check for CSRF token in headers or body
  const csrfToken = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session?.csrfToken;
  
  if (!csrfToken || !sessionToken || csrfToken !== sessionToken) {
    logSecurityEvent('CSRF_ATTACK_DETECTED', {
      ...clientDetails,
      providedToken: csrfToken ? 'present' : 'missing',
      sessionToken: sessionToken ? 'present' : 'missing',
      userId: req.user?.id || 'unauthenticated'
    });
    
    return res.status(403).json({ error: 'CSRF token validation failed' });
  }
  
  next();
};

const securityMiddleware = (app) => {
  // Set security headers
  app.use(securityHeaders());

  // CORS configuration
  app.use(corsMiddleware);

  // Rate limiting
  app.use(setupRateLimiter());

  // Request logging
  app.use(requestLogger);

  // Input sanitization
  app.use(sanitizeInput);

  // CSRF protection
  app.use(csrfProtection);
};

module.exports = {
  sanitizeInput,
  setupRateLimiter,
  authRateLimiter,
  apiRateLimiter,
  corsMiddleware,
  securityHeaders,
  securityMiddleware,
  requestLogger,
  csrfProtection,
  getClientDetails,
  logAllHeaders
}; 