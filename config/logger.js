const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure log directory exists
const logDir = path.join(__dirname, '..', 'logs');
const logBasePath = logDir;
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Custom format for structured logging
const structuredFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const logEntry = {
      timestamp,
      level,
      message,
      ...meta
    };
    return JSON.stringify(logEntry);
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, userId, channel, contentId, ...meta }) => {
    let logLine = `${timestamp} [${level}]`;
    
    // Add context information
    if (userId) logLine += ` [User:${userId}]`;
    if (channel) logLine += ` [${channel}]`;
    if (contentId) logLine += ` [Content:${contentId}]`;
    
    logLine += ` ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      logLine += ` ${JSON.stringify(meta)}`;
    }
    
    return logLine;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: consoleFormat
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logDir, 'app.log'),
      format: structuredFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5
    }),
    
    // Separate file for errors
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: structuredFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5
    }),
    
    // Separate file for multimedia analysis logs
    new winston.transports.File({
      filename: path.join(logDir, 'multimedia.log'),
      format: structuredFormat,
      maxsize: 20 * 1024 * 1024, // 20MB
      maxFiles: 10
    }),
    
    // User activity logs
    new winston.transports.File({
      filename: path.join(logDir, 'user-activity.log'),
      format: structuredFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5
    })
  ]
});

// Enhanced logging methods with context
const enhancedLogger = {
  // Standard logging methods
  debug: (message, meta = {}) => logger.debug(message, meta),
  info: (message, meta = {}) => logger.info(message, meta),
  warn: (message, meta = {}) => logger.warn(message, meta),
  error: (message, meta = {}) => logger.error(message, meta),
  
  // Multimedia analysis logging
  multimedia: {
    start: (userId, contentId, url, options = {}) => {
      logger.info('Multimedia analysis started', {
        userId,
        contentId,
        url,
        channel: 'multimedia',
        action: 'analysis_start',
        options,
        timestamp: new Date().toISOString()
      });
    },
    
    progress: (userId, contentId, step, progress = null, details = {}) => {
      logger.info(`Analysis progress: ${step}`, {
        userId,
        contentId,
        channel: 'multimedia',
        action: 'analysis_progress',
        step,
        progress,
        ...details,
        timestamp: new Date().toISOString()
      });
    },
    
    success: (userId, contentId, results = {}) => {
      logger.info('Multimedia analysis completed successfully', {
        userId,
        contentId,
        channel: 'multimedia',
        action: 'analysis_success',
        transcriptionLength: results.transcription?.length || 0,
        wordCount: results.transcription ? results.transcription.split(' ').length : 0,
        summaryLength: results.summary?.length || 0,
        sentiment: results.sentiment?.label || 'none',
        speakerCount: results.speakers?.length || 0,
        processingTime: results.processingTime || 0,
        timestamp: new Date().toISOString()
      });
    },
    
    error: (userId, contentId, error, context = {}) => {
      logger.error('Multimedia analysis failed', {
        userId,
        contentId,
        channel: 'multimedia',
        action: 'analysis_error',
        error: error.message,
        stack: error.stack,
        ...context,
        timestamp: new Date().toISOString()
      });
    },
    
    transcription: (userId, contentId, provider, wordCount, duration = null) => {
      logger.info('Transcription completed', {
        userId,
        contentId,
        channel: 'multimedia',
        action: 'transcription',
        provider,
        wordCount,
        duration,
        timestamp: new Date().toISOString()
      });
    },
    
    summary: (userId, contentId, summaryLength, originalLength) => {
      logger.info('Summary generated', {
        userId,
        contentId,
        channel: 'multimedia',
        action: 'summary',
        summaryLength,
        originalLength,
        compressionRatio: originalLength > 0 ? (summaryLength / originalLength).toFixed(2) : 0,
        timestamp: new Date().toISOString()
      });
    }
  },
  
  // User activity logging
  user: {
    login: (userId, ip, userAgent = '') => {
      logger.info('User logged in', {
        userId,
        channel: 'auth',
        action: 'login',
        ip,
        userAgent,
        timestamp: new Date().toISOString()
      });
    },
    
    logout: (userId, ip) => {
      logger.info('User logged out', {
        userId,
        channel: 'auth',
        action: 'logout',
        ip,
        timestamp: new Date().toISOString()
      });
    },
    
    contentAdd: (userId, contentId, url, contentType = 'unknown') => {
      logger.info('Content added', {
        userId,
        contentId,
        channel: 'content',
        action: 'add',
        url,
        contentType,
        timestamp: new Date().toISOString()
      });
    },
    
    contentEdit: (userId, contentId, changes = {}) => {
      logger.info('Content edited', {
        userId,
        contentId,
        channel: 'content',
        action: 'edit',
        changes: Object.keys(changes),
        timestamp: new Date().toISOString()
      });
    },
    
    contentDelete: (userId, contentId) => {
      logger.info('Content deleted', {
        userId,
        contentId,
        channel: 'content',
        action: 'delete',
        timestamp: new Date().toISOString()
      });
    }
  },
  
  // System logging
  system: {
    startup: (port, environment) => {
      logger.info('Application started', {
        channel: 'system',
        action: 'startup',
        port,
        environment,
        nodeVersion: process.version,
        timestamp: new Date().toISOString()
      });
    },
    
    shutdown: (reason = 'unknown') => {
      logger.info('Application shutting down', {
        channel: 'system',
        action: 'shutdown',
        reason,
        timestamp: new Date().toISOString()
      });
    },
    
    error: (error, context = {}) => {
      logger.error('System error', {
        channel: 'system',
        action: 'error',
        error: error.message,
        stack: error.stack,
        ...context,
        timestamp: new Date().toISOString()
      });
    }
  },
  
  // API logging
  api: {
    request: (method, url, userId = null, ip = '', statusCode = null, duration = null) => {
      logger.info('API request', {
        userId,
        channel: 'api',
        action: 'request',
        method,
        url,
        ip,
        statusCode,
        duration,
        timestamp: new Date().toISOString()
      });
    },
    
    error: (method, url, error, userId = null, ip = '') => {
      logger.error('API error', {
        userId,
        channel: 'api',
        action: 'error',
        method,
        url,
        ip,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    }
  }
};

// Legacy methods for backward compatibility
enhancedLogger.logInfo = (message, context = {}) => {
  enhancedLogger.info(message, context);
};

enhancedLogger.logError = (message, context = {}) => {
  enhancedLogger.error(message, context);
};

enhancedLogger.logWarning = (message, context = {}) => {
  enhancedLogger.warn(message, context);
};

// Export specific functions for backward compatibility
const logAuthEvent = (event, data = {}) => {
  enhancedLogger.info(`AUTH_EVENT: ${event}`, {
    channel: 'auth',
    event,
    ...data,
    timestamp: new Date().toISOString()
  });
};

const logAuthError = (event, error, data = {}) => {
  enhancedLogger.error(`AUTH_ERROR: ${event}`, {
    channel: 'auth',
    event,
    error: error.message || error,
    stack: error.stack,
    ...data,
    timestamp: new Date().toISOString()
  });
};

const logOAuthFlow = (event, data = {}) => {
  enhancedLogger.info(`OAUTH_FLOW: ${event}`, {
    channel: 'auth',
    event,
    ...data,
    timestamp: new Date().toISOString()
  });
};

const logOAuthError = (event, error, data = {}) => {
  enhancedLogger.error(`OAUTH_ERROR: ${event}`, {
    channel: 'auth',
    event,
    error: error.message || error,
    stack: error.stack,
    ...data,
    timestamp: new Date().toISOString()
  });
};

const logSecurityEvent = (event, data = {}) => {
  enhancedLogger.info(`SECURITY_EVENT: ${event}`, {
    channel: 'security',
    event,
    ...data,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  ...enhancedLogger,
  logAuthEvent,
  logAuthError,
  logOAuthFlow,
  logOAuthError,
  logSecurityEvent,
  logBasePath
}; 