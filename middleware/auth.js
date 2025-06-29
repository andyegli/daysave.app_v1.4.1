const { logAuthEvent, logAuthError } = require('../config/logger');

// Helper function to get client details
const getClientDetails = (req) => ({
  ip: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown',
  userAgent: req.headers['user-agent'] || 'unknown',
  referer: req.headers.referer || 'unknown'
});

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  const clientDetails = getClientDetails(req);
  
  if (req.isAuthenticated()) {
    logAuthEvent('AUTH_CHECK_SUCCESS', {
      ...clientDetails,
      userId: req.user.id,
      username: req.user.username
    });
    return next();
  }
  
  logAuthEvent('AUTH_CHECK_FAILED', {
    ...clientDetails,
    requestedUrl: req.originalUrl
  });
  
  res.status(401).json({ error: 'Authentication required' });
};

// Middleware to check if user is not authenticated
const isNotAuthenticated = (req, res, next) => {
  const clientDetails = getClientDetails(req);
  
  if (!req.isAuthenticated()) {
    logAuthEvent('AUTH_REDIRECT_CHECK', {
      ...clientDetails,
      requestedUrl: req.originalUrl
    });
    return next();
  }
  
  logAuthEvent('AUTH_ALREADY_AUTHENTICATED', {
    ...clientDetails,
    userId: req.user.id,
    username: req.user.username,
    redirectTo: '/dashboard'
  });
  
  res.redirect('/dashboard');
};

// Middleware to require specific roles
const requireRole = (roles) => {
  return (req, res, next) => {
    const clientDetails = getClientDetails(req);
    
    if (!req.isAuthenticated()) {
      logAuthEvent('ROLE_CHECK_FAILED_NOT_AUTHENTICATED', {
        ...clientDetails,
        requiredRoles: Array.isArray(roles) ? roles : [roles]
      });
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.role?.name || req.user.role_id;
    const hasRole = Array.isArray(roles) 
      ? roles.includes(userRole)
      : userRole === roles;

    if (hasRole) {
      logAuthEvent('ROLE_CHECK_SUCCESS', {
        ...clientDetails,
        userId: req.user.id,
        username: req.user.username,
        userRole,
        requiredRoles: Array.isArray(roles) ? roles : [roles]
      });
      return next();
    }

    logAuthEvent('ROLE_CHECK_FAILED_INSUFFICIENT_PERMISSIONS', {
      ...clientDetails,
      userId: req.user.id,
      username: req.user.username,
      userRole,
      requiredRoles: Array.isArray(roles) ? roles : [roles]
    });

    res.status(403).json({ error: 'Insufficient permissions' });
  };
};

// Middleware to log authentication attempts
const logAuthAttempt = (req, res, next) => {
  const clientDetails = getClientDetails(req);
  
  logAuthEvent('AUTH_ATTEMPT', {
    ...clientDetails,
    method: req.method,
    url: req.originalUrl,
    body: req.method === 'POST' ? { ...req.body, password: '[REDACTED]' } : undefined
  });
  
  next();
};

module.exports = {
  isAuthenticated,
  isNotAuthenticated,
  requireRole,
  logAuthAttempt,
  getClientDetails
}; 