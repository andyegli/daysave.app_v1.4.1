// Authentication middleware
const { isAuthenticated, isAdmin, ensureRoleLoaded, requireTesterPermission } = require('./auth');

// Error handling middleware
const { errorHandler } = require('./error');

// Security middleware
const { securityHeaders } = require('./security');

// Validation middleware
const { validate } = require('./validation');

// Export all middleware
module.exports = {
  isAuthenticated,
  isAdmin,
  ensureRoleLoaded,
  requireTesterPermission,
  validate,
  errorHandler,
  securityHeaders
}; 