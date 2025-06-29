const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure log directory exists
const ensureLogDirectory = (logPath) => {
  const logDir = path.dirname(logPath);
  
  try {
    if (!fs.existsSync(logDir)) {
      console.log(`📁 Creating log directory: ${logDir}`);
      fs.mkdirSync(logDir, { recursive: true, mode: 0o755 });
    }
    
    // Ensure directory is writable
    try {
      fs.accessSync(logDir, fs.constants.W_OK);
    } catch (error) {
      console.log(`🔧 Setting write permissions for: ${logDir}`);
      fs.chmodSync(logDir, 0o755);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Error creating log directory: ${error.message}`);
    return false;
  }
};

// Define log locations with fallbacks
const logLocations = [
  path.join(__dirname, '../logs'),
  path.join(__dirname, '../app-logs'),
  '/tmp/daysave-logs'
];

let logBasePath = null;
for (const location of logLocations) {
  if (ensureLogDirectory(path.join(location, 'auth.log'))) {
    logBasePath = location;
    break;
  }
}

if (!logBasePath) {
  console.error('❌ Could not create any log directory, using console only');
  logBasePath = '/tmp';
}

// Custom format for authentication logs
const authLogFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaStr}`;
  })
);

// Create logger instances
const authLogger = winston.createLogger({
  level: 'info',
  format: authLogFormat,
  transports: [
    // Auth-specific log file
    new winston.transports.File({
      filename: path.join(logBasePath, 'auth.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    // Error log file
    new winston.transports.File({
      filename: path.join(logBasePath, 'auth-errors.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 3,
      tailable: true
    })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  authLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Helper functions for authentication logging
const logAuthEvent = (event, details = {}) => {
  const logData = {
    event,
    timestamp: new Date().toISOString(),
    ip: details.ip || 'unknown',
    userAgent: details.userAgent || 'unknown',
    ...details
  };

  authLogger.info(`AUTH_EVENT: ${event}`, logData);
};

const logAuthError = (event, error, details = {}) => {
  const logData = {
    event,
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ip: details.ip || 'unknown',
    userAgent: details.userAgent || 'unknown',
    ...details
  };

  authLogger.error(`AUTH_ERROR: ${event}`, logData);
};

const logOAuthFlow = (provider, step, details = {}) => {
  const logData = {
    provider,
    step,
    timestamp: new Date().toISOString(),
    ip: details.ip || 'unknown',
    userAgent: details.userAgent || 'unknown',
    ...details
  };

  authLogger.info(`OAUTH_FLOW: ${provider.toUpperCase()} - ${step}`, logData);
};

const logOAuthError = (provider, step, error, details = {}) => {
  const logData = {
    provider,
    step,
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ip: details.ip || 'unknown',
    userAgent: details.userAgent || 'unknown',
    ...details
  };

  authLogger.error(`OAUTH_ERROR: ${provider.toUpperCase()} - ${step}`, logData);
};

module.exports = {
  authLogger,
  logAuthEvent,
  logAuthError,
  logOAuthFlow,
  logOAuthError,
  logBasePath
}; 