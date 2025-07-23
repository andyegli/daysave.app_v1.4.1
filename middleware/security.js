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
      const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : [`http://localhost:${process.env.APP_PORT || process.env.PORT || 3000}`, 'http://localhost:5000'];
    
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

// Security headers middleware
const securityHeaders = () => {
  const cspDirectives = {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com", "https://unpkg.com"],
    scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "https://maps.googleapis.com", "https://code.jquery.com"],
    imgSrc: ["'self'", "data:", "https:", "https://maps.googleapis.com", "https://maps.gstatic.com"],
    connectSrc: ["'self'", "https://maps.googleapis.com", "https://maps.gstatic.com"],
    fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://fonts.gstatic.com"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'self'"],
    scriptSrcAttr: ["'none'"]
  };

  // DISABLE upgrade-insecure-requests for localhost development to prevent SSL errors
  // Only enable in production on HTTPS servers
  if (process.env.NODE_ENV === 'production') {
    cspDirectives.upgradeInsecureRequests = [];
  }
  // For development: don't set upgradeInsecureRequests at all (leave undefined)

  return helmet({
    contentSecurityPolicy: {
      directives: cspDirectives
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: process.env.NODE_ENV === 'production' ? {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    } : false // Disable HSTS for development to prevent localhost SSL errors
  });
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