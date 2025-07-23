require('dotenv').config();

// Enhanced logging controls for cleaner development experience
const enableSQLLogging = process.env.ENABLE_SQL_LOGGING === 'true';
const enableMultimediaConsoleLogging = process.env.ENABLE_MULTIMEDIA_CONSOLE_LOGGING === 'true';
const enableProcessorStepLogging = process.env.ENABLE_PROCESSOR_STEP_LOGGING === 'true';
const enablePerformanceConsoleLogging = process.env.ENABLE_PERFORMANCE_CONSOLE_LOGGING === 'true';
const enableStartupValidationLogging = process.env.ENABLE_STARTUP_VALIDATION_LOGGING === 'true';

// Additional logging controls for reducing console spam
const enableAuthEventLogging = process.env.ENABLE_AUTH_EVENT_LOGGING === 'true';
const enableStatusPollingLogging = process.env.ENABLE_STATUS_POLLING_LOGGING === 'true';
const enableAnalysisRequestLogging = process.env.ENABLE_ANALYSIS_REQUEST_LOGGING === 'true';
const enablePerformanceAlertLogging = process.env.ENABLE_PERFORMANCE_ALERT_LOGGING === 'true';

module.exports = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_USER_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: enableSQLLogging ? console.log : false
  },
  test: {
    username: process.env.DB_USER,
    password: process.env.DB_USER_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_USER_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false
  }
};

// Export logging controls for use in other modules
module.exports.logging = {
  enableSQLLogging,
  enableMultimediaConsoleLogging,
  enableProcessorStepLogging,
  enablePerformanceConsoleLogging,
  enableStartupValidationLogging,
  enableAuthEventLogging,
  enableStatusPollingLogging,
  enableAnalysisRequestLogging,
  enablePerformanceAlertLogging
}; 