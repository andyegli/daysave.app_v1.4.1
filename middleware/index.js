// Authentication middleware
const authMiddleware = require('./auth');

// Error handling middleware
const errorMiddleware = require('./error');

// Security middleware
const securityMiddleware = require('./security');

// Validation middleware
const validationMiddleware = require('./validation');

// Export all middleware
module.exports = {
  // Authentication
  isAuthenticated: authMiddleware.isAuthenticated,
  isNotAuthenticated: authMiddleware.isNotAuthenticated,
  requireRole: authMiddleware.requireRole,
  logAuthAttempt: authMiddleware.logAuthAttempt,
  
  // Error handling
  errorHandler: errorMiddleware.errorHandler,
  notFoundHandler: errorMiddleware.notFoundHandler,
  asyncHandler: errorMiddleware.asyncHandler,
  validationErrorHandler: errorMiddleware.validationErrorHandler,
  
  // Security
  setupRateLimiter: securityMiddleware.setupRateLimiter,
  authRateLimiter: securityMiddleware.authRateLimiter,
  apiRateLimiter: securityMiddleware.apiRateLimiter,
  corsMiddleware: securityMiddleware.corsMiddleware,
  securityHeaders: securityMiddleware.securityHeaders,
  securityMiddleware: securityMiddleware.securityMiddleware,
  requestLogger: securityMiddleware.requestLogger,
  csrfProtection: securityMiddleware.csrfProtection,
  sanitizeInput: securityMiddleware.sanitizeInput,
  
  // Validation
  handleValidationErrors: validationMiddleware.handleValidationErrors,
  validateUserRegistration: validationMiddleware.validateUserRegistration,
  validateUserLogin: validationMiddleware.validateUserLogin,
  validateContact: validationMiddleware.validateContact,
  validateContent: validationMiddleware.validateContent,
  validateId: validationMiddleware.validateId,
  validatePagination: validationMiddleware.validatePagination,
  validateSearch: validationMiddleware.validateSearch,
  validateFileUpload: validationMiddleware.validateFileUpload,
  validateGroup: validationMiddleware.validateGroup,
  validateSettings: validationMiddleware.validateSettings,
  
  // Helper functions
  getClientDetails: authMiddleware.getClientDetails,
  logAllHeaders: securityMiddleware.logAllHeaders
}; 