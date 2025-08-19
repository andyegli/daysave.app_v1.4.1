/**
 * Authentication Middleware for DaySave
 * 
 * PURPOSE:
 * Provides comprehensive authentication and authorization middleware functions
 * for securing routes and managing user access control throughout the application.
 * 
 * FEATURES:
 * - User authentication verification
 * - Role-based access control (RBAC)
 * - Admin and subscription level authorization
 * - Session management and security
 * - Multi-factor authentication (MFA) enforcement
 * - Client detail tracking and logging
 * - Feature-based access control
 * 
 * MIDDLEWARE FUNCTIONS:
 * - isAuthenticated: Verifies user login status
 * - isAdmin: Restricts access to admin users
 * - requireRole: Role-based access control
 * - requireSubscription: Subscription level checks
 * - enforceMfa: Multi-factor authentication enforcement
 * - ensureRoleLoaded: Ensures user role data is available
 * - requireFeature: Feature-based access control
 * 
 * SECURITY FEATURES:
 * - IP address tracking
 * - User agent logging
 * - Authentication event logging
 * - Session validation
 * - Role verification
 * 
 * DEPENDENCIES:
 * - Express.js session management
 * - Passport.js authentication
 * - Database models (User, Role)
 * - Logging system
 * 
 * AUTHOR: DaySave Development Team
 * CREATED: 2025-08-01 (Core Authentication System)
 */

const { logAuthEvent, logAuthError } = require('../config/logger');
const { Role, Permission, RolePermission } = require('../models');

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
    // logAuthEvent('AUTH_CHECK_SUCCESS', {
    //   ...clientDetails,
    //   userId: req.user.id,
    //   username: req.user.username
    // }); // Disabled - too verbose for normal operation
    return next();
  }
  
  logAuthEvent('AUTH_CHECK_FAILED', {
    ...clientDetails,
    requestedUrl: req.originalUrl
  });
  
  // Better AJAX/API detection
  const isAjaxRequest = 
    req.headers['x-requested-with'] === 'XMLHttpRequest' ||
    req.headers.accept?.includes('application/json') ||
    req.headers['content-type']?.includes('application/json') ||
    req.originalUrl.startsWith('/api/') ||
    req.originalUrl.includes('/analysis') ||
    req.originalUrl.includes('/ajax') ||
    req.query.ajax !== undefined;
  
  // Redirect to login for browser requests, JSON for API/AJAX
  if (isAjaxRequest) {
    return res.status(401).json({ error: 'Authentication required' });
  } else {
    return res.redirect('/auth/login');
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

// Middleware to enforce MFA requirements
const enforceMfa = (req, res, next) => {
  const clientDetails = getClientDetails(req);
  
  // Skip MFA enforcement for certain routes
  const skipMfaRoutes = [
    '/profile',
    '/profile/mfa',
    '/auth/logout',
    '/api'
  ];
  
  const shouldSkipMfa = skipMfaRoutes.some(route => 
    req.originalUrl.startsWith(route)
  );
  
  if (shouldSkipMfa) {
    return next();
  }
  
  if (req.isAuthenticated() && req.user) {
    // Check if MFA is required and not enabled
    if (req.user.mfa_required && !req.user.totp_enabled) {
      logAuthEvent('MFA_ENFORCEMENT_REDIRECT', {
        ...clientDetails,
        userId: req.user.id,
        username: req.user.username,
        requestedUrl: req.originalUrl
      });
      
      // Better AJAX/API detection
      const isAjaxRequest = 
        req.headers['x-requested-with'] === 'XMLHttpRequest' ||
        req.headers.accept?.includes('application/json') ||
        req.headers['content-type']?.includes('application/json') ||
        req.originalUrl.startsWith('/api/') ||
        req.originalUrl.includes('/analysis') ||
        req.originalUrl.includes('/ajax') ||
        req.query.ajax !== undefined;
      
      if (isAjaxRequest) {
        return res.status(403).json({ 
          error: 'Multi-factor authentication is required',
          redirectTo: '/profile',
          mfaRequired: true
        });
      } else {
        // Set a flash message for the profile page
        req.session.mfaEnforcementMessage = 'You must enable two-factor authentication before continuing.';
        return res.redirect('/profile');
      }
    }
  }
  
  next();
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
 * Middleware to check if user has specific permissions
 * Used for fine-grained access control based on permissions
 */
const requirePermission = (permissions) => {
  return async (req, res, next) => {
    const clientDetails = getClientDetails(req);
    const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
    
    if (!req.isAuthenticated()) {
      logAuthEvent('PERMISSION_CHECK_FAILED_NOT_AUTHENTICATED', {
        ...clientDetails,
        requiredPermissions
      });
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.Role?.name;
    
    if (!userRole) {
      logAuthEvent('PERMISSION_CHECK_FAILED_NO_ROLE', {
        ...clientDetails,
        userId: req.user.id,
        username: req.user.username,
        requiredPermissions
      });
      return res.status(403).json({ error: 'User role not found' });
    }

    try {
      // Load user's permissions through their role
      const roleWithPermissions = await Role.findByPk(req.user.role_id, {
        include: [{
          model: Permission,
          through: { attributes: [] }
        }]
      });

      if (!roleWithPermissions) {
        logAuthEvent('PERMISSION_CHECK_FAILED_ROLE_NOT_FOUND', {
          ...clientDetails,
          userId: req.user.id,
          username: req.user.username,
          requiredPermissions
        });
        return res.status(403).json({ error: 'Role not found' });
      }

      const userPermissions = roleWithPermissions.Permissions.map(p => p.name);
      const hasAllPermissions = requiredPermissions.every(perm => userPermissions.includes(perm));

      if (hasAllPermissions) {
        logAuthEvent('PERMISSION_CHECK_SUCCESS', {
          ...clientDetails,
          userId: req.user.id,
          username: req.user.username,
          userRole,
          userPermissions: userPermissions.length,
          requiredPermissions
        });
        return next();
      }

      const missingPermissions = requiredPermissions.filter(perm => !userPermissions.includes(perm));
      
      logAuthEvent('PERMISSION_CHECK_FAILED_INSUFFICIENT_PERMISSIONS', {
        ...clientDetails,
        userId: req.user.id,
        username: req.user.username,
        userRole,
        userPermissions: userPermissions.length,
        requiredPermissions,
        missingPermissions
      });

      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: requiredPermissions,
        missing: missingPermissions
      });

    } catch (error) {
      logAuthError('PERMISSION_CHECK_ERROR', error, {
        userId: req.user.id,
        requiredPermissions
      });
      return res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

/**
 * Helper function to check if user has specific permissions (for use in routes)
 */
const hasPermission = async (user, permissions) => {
  const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
  
  try {
    const roleWithPermissions = await Role.findByPk(user.role_id, {
      include: [{
        model: Permission,
        through: { attributes: [] }
      }]
    });

    if (!roleWithPermissions) {
      return false;
    }

    const userPermissions = roleWithPermissions.Permissions.map(p => p.name);
    return requiredPermissions.every(perm => userPermissions.includes(perm));
  } catch (error) {
    logAuthError('HAS_PERMISSION_CHECK_ERROR', error, {
      userId: user.id,
      requiredPermissions
    });
    return false;
  }
};

/**
 * Middleware to check if user is admin or has admin permissions
 * Used to restrict access to admin routes
 */
const isAdmin = (req, res, next) => {
  const clientDetails = getClientDetails(req);
  
  if (!req.isAuthenticated()) {
    logAuthEvent('ADMIN_CHECK_FAILED_NOT_AUTHENTICATED', {
      ...clientDetails,
      requestedUrl: req.originalUrl
    });
    
    // Better AJAX/API detection
    const isAjaxRequest = 
      req.headers['x-requested-with'] === 'XMLHttpRequest' ||
      req.headers.accept?.includes('application/json') ||
      req.headers['content-type']?.includes('application/json') ||
      req.originalUrl.startsWith('/api/') ||
      req.originalUrl.includes('/analysis') ||
      req.originalUrl.includes('/ajax') ||
      req.query.ajax !== undefined;
    
    if (isAjaxRequest) {
      return res.status(401).json({ error: 'Authentication required' });
    } else {
      return res.redirect('/auth/login');
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

  // Allow admin role or manager role for admin access
  const adminRoles = ['admin', 'manager'];
  if (adminRoles.includes(userRole)) {
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

  // Better AJAX/API detection
  const isAjaxRequest = 
    req.headers['x-requested-with'] === 'XMLHttpRequest' ||
    req.headers.accept?.includes('application/json') ||
    req.headers['content-type']?.includes('application/json') ||
    req.originalUrl.startsWith('/api/') ||
    req.originalUrl.includes('/analysis') ||
    req.originalUrl.includes('/ajax') ||
    req.query.ajax !== undefined;

  if (isAjaxRequest) {
    return res.status(403).json({ error: 'Admin privileges required' });
  } else {
    return res.status(403).render('error', {
      user: req.user,
      title: 'Access Denied',
      message: 'You need admin privileges to access this page.'
    });
  }
};

/**
 * Middleware for subscription-based access control
 */
const requireSubscription = (subscriptionLevels) => {
  return (req, res, next) => {
    const clientDetails = getClientDetails(req);
    const requiredLevels = Array.isArray(subscriptionLevels) ? subscriptionLevels : [subscriptionLevels];
    
    if (!req.isAuthenticated()) {
      logAuthEvent('SUBSCRIPTION_CHECK_FAILED_NOT_AUTHENTICATED', {
        ...clientDetails,
        requiredLevels
      });
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userSubscription = req.user.subscription_status;
    
    if (requiredLevels.includes(userSubscription)) {
      logAuthEvent('SUBSCRIPTION_CHECK_SUCCESS', {
        ...clientDetails,
        userId: req.user.id,
        username: req.user.username,
        userSubscription,
        requiredLevels
      });
      return next();
    }

    logAuthEvent('SUBSCRIPTION_CHECK_FAILED_INSUFFICIENT_LEVEL', {
      ...clientDetails,
      userId: req.user.id,
      username: req.user.username,
      userSubscription,
      requiredLevels
    });

    return res.status(403).json({ 
      error: 'Subscription upgrade required',
      current: userSubscription,
      required: requiredLevels
    });
  };
};

module.exports = {
  isAuthenticated,
  isNotAuthenticated,
  requireRole,
  requirePermission,
  hasPermission,
  requireSubscription,
  logAuthAttempt,
  getClientDetails,
  ensureRoleLoaded,
  requireTesterPermission,
  isAdmin,
  enforceMfa
}; 