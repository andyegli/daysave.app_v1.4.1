const { logAuthEvent, logAuthError } = require('../config/logger');
const { Role } = require('../models');

// Helper function to get client details
const getClientDetails = (req) => ({
  ip: req.ip || (req.connection && req.connection.remoteAddress) || req.headers['x-forwarded-for'] || 'unknown',
  userAgent: req.headers['user-agent'] || 'unknown',
  referer: req.headers.referer || 'unknown'
});

// Middleware to ensure role is always available
const ensureRoleLoaded = async (req, res, next) => {
  if (req.isAuthenticated() && req.user) {
    // If Role is not loaded or is incomplete, load it
    if (!req.user.Role || !req.user.Role.name) {
      try {
        const role = await Role.findByPk(req.user.role_id);
        if (role) {
          req.user.Role = role;
          // Also provide lowercase alias for compatibility
          req.user.role = role;
        } else {
          logAuthError('ROLE_NOT_FOUND', new Error('User role not found'), {
            userId: req.user.id,
            roleId: req.user.role_id
          });
        }
      } catch (error) {
        logAuthError('ROLE_LOAD_ERROR', error, {
          userId: req.user.id,
          roleId: req.user.role_id
        });
      }
    } else {
      // Ensure lowercase alias exists for compatibility
      req.user.role = req.user.Role;
    }
  }
  next();
};

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
  
  // Redirect to login for browser requests, JSON for API/AJAX
  if (req.accepts(['html', 'json']) === 'html') {
    return res.redirect('/auth/login');
  } else {
    return res.status(401).json({ error: 'Authentication required' });
  }
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

    // Use the consistent Role property (capital R from Sequelize include)
    const userRole = req.user.Role?.name;
    
    if (!userRole) {
      logAuthEvent('ROLE_CHECK_FAILED_NO_ROLE', {
        ...clientDetails,
        userId: req.user.id,
        username: req.user.username,
        requiredRoles: Array.isArray(roles) ? roles : [roles]
      });
      return res.status(403).json({ error: 'User role not found' });
    }

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

/**
 * Middleware to check if user has tester permission
 * Used to restrict access to the multimedia analysis testing interface
 */
function requireTesterPermission(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.user.Role) {
    return res.status(403).json({ error: 'User role not loaded' });
  }

  // Check if user has tester permission through their role
  const hasPermission = req.user.Role.Permissions && 
    req.user.Role.Permissions.some(permission => permission.name === 'tester');

  if (!hasPermission) {
    return res.status(403).json({ 
      error: 'Insufficient permissions. Tester permission required.',
      required_permission: 'tester'
    });
  }

  next();
}

/**
 * Middleware to check if user is admin
 * Used to restrict access to admin routes
 */
const isAdmin = (req, res, next) => {
  const clientDetails = getClientDetails(req);
  
  if (!req.isAuthenticated()) {
    logAuthEvent('ADMIN_CHECK_FAILED_NOT_AUTHENTICATED', {
      ...clientDetails,
      requestedUrl: req.originalUrl
    });
    if (req.accepts(['html', 'json']) === 'html') {
      return res.redirect('/auth/login');
    } else {
      return res.status(401).json({ error: 'Authentication required' });
    }
  }

  // Use the consistent Role property (capital R from Sequelize include)
  const userRole = req.user.Role?.name;
  
  if (!userRole) {
    logAuthEvent('ADMIN_CHECK_FAILED_NO_ROLE', {
      ...clientDetails,
      userId: req.user.id,
      username: req.user.username
    });
    return res.status(403).json({ error: 'User role not found' });
  }

  if (userRole === 'admin') {
    logAuthEvent('ADMIN_CHECK_SUCCESS', {
      ...clientDetails,
      userId: req.user.id,
      username: req.user.username,
      userRole
    });
    return next();
  }

  logAuthEvent('ADMIN_CHECK_FAILED_INSUFFICIENT_PERMISSIONS', {
    ...clientDetails,
    userId: req.user.id,
    username: req.user.username,
    userRole
  });

  if (req.accepts(['html', 'json']) === 'html') {
    return res.status(403).render('error', {
      user: req.user,
      title: 'Access Denied',
      message: 'You need admin privileges to access this page.'
    });
  } else {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
};

module.exports = {
  isAuthenticated,
  isNotAuthenticated,
  requireRole,
  logAuthAttempt,
  getClientDetails,
  ensureRoleLoaded,
  requireTesterPermission,
  isAdmin
}; 