const { logError } = require('../config/logger');

// Helper function to get client details
const getClientDetails = (req) => ({
  ip: req.ip || (req.connection && req.connection.remoteAddress) || req.headers['x-forwarded-for'] || 'unknown',
  userAgent: req.headers['user-agent'] || 'unknown',
  referer: req.headers.referer || 'unknown',
  url: req.originalUrl,
  method: req.method
});

// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  const clientDetails = getClientDetails(req);
  
  // Log the error with context
  logError('GLOBAL_ERROR_HANDLER', {
    ...clientDetails,
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name,
      code: err.code
    },
    userId: req.user?.id || 'unauthenticated'
  });

  // Set default error status
  const status = err.status || err.statusCode || 500;
  
  // Determine if we should show detailed error info
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Prepare error response
  const errorResponse = {
    error: {
      message: isDevelopment ? err.message : 'Internal Server Error',
      status: status
    }
  };

  // Add stack trace in development
  if (isDevelopment && err.stack) {
    errorResponse.error.stack = err.stack;
  }

  // Handle specific error types
  if (err.name === 'SequelizeValidationError') {
    errorResponse.error.message = 'Validation Error';
    errorResponse.error.details = err.errors.map(e => ({
      field: e.path,
      message: e.message
    }));
  } else if (err.name === 'SequelizeUniqueConstraintError') {
    errorResponse.error.message = 'Duplicate Entry';
    errorResponse.error.details = err.errors.map(e => ({
      field: e.path,
      message: e.message
    }));
  } else if (err.name === 'JsonWebTokenError') {
    errorResponse.error.message = 'Invalid Token';
  } else if (err.name === 'TokenExpiredError') {
    errorResponse.error.message = 'Token Expired';
  }

  // Send error response
  res.status(status).json(errorResponse);
};

// 404 handler middleware
const notFoundHandler = (req, res, next) => {
  const clientDetails = getClientDetails(req);
  
  logError('NOT_FOUND', {
    ...clientDetails,
    userId: req.user?.id || 'unauthenticated'
  });

  const error = new Error(`Route ${req.originalUrl} not found`);
  error.status = 404;
  next(error);
};

// Async error wrapper middleware
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Validation error handler
const validationErrorHandler = (err, req, res, next) => {
  if (err.name === 'ValidationError' || err.name === 'SequelizeValidationError') {
    const clientDetails = getClientDetails(req);
    
    logError('VALIDATION_ERROR', {
      ...clientDetails,
      error: {
        message: err.message,
        details: err.errors || err.details
      },
      userId: req.user?.id || 'unauthenticated'
    });

    return res.status(400).json({
      error: {
        message: 'Validation Error',
        details: err.errors || err.details
      }
    });
  }
  next(err);
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  validationErrorHandler,
  getClientDetails
}; 