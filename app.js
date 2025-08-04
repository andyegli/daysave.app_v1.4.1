require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const db = require('./models');
const { passport } = require('./config/auth');
const { logAuthEvent, logAuthError, logBasePath } = require('./config/logger');

// Import middleware
const {
  errorHandler,
  notFoundHandler,
  securityHeaders,
  requestLogger,
  sanitizeInput,
  corsMiddleware,
  ensureRoleLoaded,
  isAuthenticated,
  enforceMfa,
  deviceFingerprintMiddleware,
  devHttpAccessMiddleware
} = require('./middleware');

const app = express();

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Security middleware (apply first)
app.use(securityHeaders());
// app.use(require('./middleware').logAllHeaders); // Disabled - too verbose for normal operation
app.use(corsMiddleware);

// Development HTTP access middleware (when enabled by admin)
app.use(devHttpAccessMiddleware);

// Device fingerprinting middleware (for fraud detection)
app.use(deviceFingerprintMiddleware({
  enableFraudDetection: true,
  logAllRequests: false,
  skipRoutes: ['/health', '/favicon.ico', '/uploads', '/js', '/css', '/images']
}));

// Request logging middleware
app.use(requestLogger);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization middleware
app.use(sanitizeInput);

// Define session model
const Session = db.sequelize.define('Session', {
  sid: {
    type: db.Sequelize.STRING,
    primaryKey: true
  },
  userId: db.Sequelize.STRING,
  expires: db.Sequelize.DATE,
  data: db.Sequelize.TEXT
});

// Configure session store
const sessionStore = new SequelizeStore({
  db: db.sequelize,
  table: 'Session',
  extendDefaultFields: (defaults, session) => {
    return {
      data: defaults.data,
      expires: defaults.expires,
      userId: session.userId
    };
  },
  checkExpirationInterval: 15 * 60 * 1000, // The interval at which to cleanup expired sessions in milliseconds.
  expiration: 24 * 60 * 60 * 1000  // The maximum age (in milliseconds) of a valid session.
});

/**
 * Check database connectivity before attempting sync
 */
async function checkDatabaseConnection() {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Database connection has been established successfully.');
    return true;
  } catch (error) {
    console.error('\n❌ DATABASE CONNECTION FAILED');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (error.name === 'SequelizeConnectionRefusedError' || error.original?.code === 'ECONNREFUSED') {
      console.error('🔴 MySQL database server is not running');
      console.error('');
      console.error('💡 To fix this issue, please start your MySQL server:');
      console.error('   • Using Homebrew: brew services start mysql');
      console.error('   • Using XAMPP: Start the MySQL service in XAMPP control panel');
      console.error('   • Using MAMP: Start the MySQL server in MAMP');
      console.error('   • Manual start: sudo /usr/local/mysql/support-files/mysql.server start');
      console.error('');
      console.error('📋 Current database configuration:');
      console.error(`   • Host: ${process.env.DB_HOST || 'localhost'}`);
      console.error(`   • Port: ${process.env.DB_PORT || '3306'}`);
      console.error(`   • Database: ${process.env.DB_NAME || 'daysave_v141'}`);
      console.error(`   • User: ${process.env.DB_USER || 'root'}`);
    } else if (error.name === 'SequelizeAccessDeniedError') {
      console.error('🔴 Database authentication failed');
      console.error('');
      console.error('💡 Please check your database credentials in .env file:');
      console.error('   • DB_USER (current: ' + (process.env.DB_USER || 'root') + ')');
      console.error('   • DB_PASSWORD');
      console.error('   • DB_NAME (current: ' + (process.env.DB_NAME || 'daysave_v141') + ')');
    } else {
      console.error('🔴 Database connection error:', error.message);
      console.error('');
      console.error('💡 Please check:');
      console.error('   • Database server is running');
      console.error('   • Connection settings in .env file');
      console.error('   • Network connectivity');
    }
    
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('');
    return false;
  }
}

// Check database connection first
checkDatabaseConnection().then(async (connected) => {
  if (!connected) {
    console.error('❌ Cannot start application without database connection');
    process.exit(1);
  }

  // Sync database models
  return db.sequelize.sync();
}).then(() => {
  console.log('✅ Database synced');

  // Sync session store
  return sessionStore.sync();
}).then(() => {
  console.log('Session store synced');

  // Run startup validation
  const StartupValidator = require('./services/startupValidation');
  const validator = new StartupValidator();
  return validator.validateAll();
}).then((validationResults) => {
  console.log('Startup validation completed');
  
  // Store validation results globally for health checks
  app.locals.startupValidation = validationResults;

  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Always false for local development; set to true in production with HTTPS
      httpOnly: false, // Temporarily set to false for AJAX debugging
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax', // Keep lax for compatibility
      domain: 'localhost', // Explicitly set domain for localhost
      path: '/' // Explicitly set path
    },
    name: 'daysave.sid' // Change default session name for security
  }));

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Ensure role is loaded for all authenticated requests
  app.use(ensureRoleLoaded);
  
  // Enhanced role loading middleware for admin routes
  app.use('/admin', async (req, res, next) => {
    if (req.isAuthenticated() && req.user) {
      // Force reload role if not present or if accessing admin routes
      if (!req.user.Role || !req.user.Role.name) {
        try {
          const { Role } = require('./models');
          const role = await Role.findByPk(req.user.role_id);
          if (role) {
            req.user.Role = role;
            req.user.dataValues.Role = role;
            console.log(`🔧 Admin route role loading: ${req.user.username} → ${role.name}`);
          }
        } catch (error) {
          console.error('Admin route role loading failed:', error);
        }
      }
    }
    next();
  });

  // Serve static files with security headers
  app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1d', // Cache static files for 1 day
    etag: true
  }));
  
  // Serve uploads directory for thumbnails and other user content
  app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    maxAge: '1h', // Cache uploads for 1 hour
    etag: true
  }));

  // Log application startup
  logAuthEvent('APPLICATION_STARTUP', {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.APP_PORT || process.env.PORT || 3000,
    logBasePath: logBasePath,
    timestamp: new Date().toISOString()
  });

  // Log all users in development mode (only when enabled)
  if (process.env.NODE_ENV === 'development' && process.env.ENABLE_STARTUP_VALIDATION_LOGGING === 'true') {
    const { User } = require('./models');
    User.findAll({ attributes: ['username', 'email'] }).then(users => {
      console.log('Registered users:');
      users.forEach(u => console.log(`- ${u.username} <${u.email}>`));
    }).catch(err => {
      console.error('Error fetching users:', err);
    });
  }

  // Routes
  app.use('/auth', require('./routes/auth'));
  app.use('/passkeys', require('./routes/passkeys'));
  app.use('/admin', require('./routes/admin'));
  app.use('/contacts', require('./routes/contacts'));
  app.use('/files', require('./routes/files'));
  app.use('/content', require('./routes/content'));
  app.use('/multimedia', require('./routes/multimedia'));
  app.use('/api/keys', require('./routes/apiKeys'));
  app.use('/api/places', require('./routes/places'));
  app.use('/subscription', require('./routes/subscription'));
  app.use('/api/subscription', require('./routes/subscription'));
  app.use('/profile', require('./routes/profile'));

  // Test endpoints for AI pipeline testing (publicly accessible)
  app.get('/test-google-api', async (req, res) => {
    try {
      const MultimediaAnalyzer = require('./services/multimedia/MultimediaAnalyzer');
      const analyzer = new MultimediaAnalyzer({ enableLogging: false });
      
      // Check if Google Vision API is available
      if (analyzer.visionClient || analyzer.googleApiKey) {
        res.json({
          success: true,
          message: 'Google Vision API is accessible',
          method: analyzer.visionClient ? 'Service Account' : 'API Key'
        });
      } else {
        res.json({
          success: false,
          message: 'Google Vision API credentials not configured'
        });
      }
    } catch (error) {
      res.json({
        success: false,
        message: `Google Vision API test failed: ${error.message}`
      });
    }
  });

  app.get('/test-openai-api', async (req, res) => {
    try {
      const openaiApiKey = process.env.OPENAI_API_KEY;
      
      if (openaiApiKey) {
        // Simple test of OpenAI API availability
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey: openaiApiKey });
        
        res.json({
          success: true,
          message: 'OpenAI API key is configured and accessible'
        });
      } else {
        res.json({
          success: false,
          message: 'OpenAI API key not configured'
        });
      }
    } catch (error) {
      res.json({
        success: false,
        message: `OpenAI API test failed: ${error.message}`
      });
    }
  });

  app.get('/test-object-detection', async (req, res) => {
    try {
      const MultimediaAnalyzer = require('./services/multimedia/MultimediaAnalyzer');
      const analyzer = new MultimediaAnalyzer({ enableLogging: false });
      
      if (analyzer.visionClient || analyzer.googleApiKey || process.env.OPENAI_API_KEY) {
        res.json({
          success: true,
          message: 'Object detection service available via Google Vision or OpenAI'
        });
      } else {
        res.json({
          success: false,
          message: 'No API keys configured for object detection'
        });
      }
    } catch (error) {
      res.json({
        success: false,
        message: `Object detection test failed: ${error.message}`
      });
    }
  });

  app.get('/test-ocr', async (req, res) => {
    try {
      const MultimediaAnalyzer = require('./services/multimedia/MultimediaAnalyzer');
      const analyzer = new MultimediaAnalyzer({ enableLogging: false });
      
      if (analyzer.visionClient || analyzer.googleApiKey || process.env.OPENAI_API_KEY) {
        res.json({
          success: true,
          message: 'OCR text extraction service available via Google Vision or OpenAI'
        });
      } else {
        res.json({
          success: false,
          message: 'No API keys configured for OCR'
        });
      }
    } catch (error) {
      res.json({
        success: false,
        message: `OCR test failed: ${error.message}`
      });
    }
  });

  app.get('/test-image-description', async (req, res) => {
    try {
      if (process.env.OPENAI_API_KEY) {
        res.json({
          success: true,
          message: 'Image description service available via OpenAI Vision'
        });
      } else {
        res.json({
          success: false,
          message: 'OpenAI API key not configured for image description'
        });
      }
    } catch (error) {
      res.json({
        success: false,
        message: `Image description test failed: ${error.message}`
      });
    }
  });

  app.get('/test-sentiment', async (req, res) => {
    try {
      if (process.env.OPENAI_API_KEY) {
        res.json({
          success: true,
          message: 'Sentiment analysis service available via OpenAI'
        });
      } else {
        res.json({
          success: false,
          message: 'OpenAI API key not configured for sentiment analysis'
        });
      }
    } catch (error) {
      res.json({
        success: false,
        message: `Sentiment analysis test failed: ${error.message}`
      });
    }
  });

  // Health check endpoints
  app.get('/health', (req, res) => {
    const validationResults = app.locals.startupValidation || {};
    const StartupValidator = require('./services/startupValidation');
    const validator = new StartupValidator();
    
    const isHealthy = validator.areAllCriticalServicesOperational ? 
      validator.areAllCriticalServicesOperational() : 
      Object.keys(validationResults).every(key => 
        key === 'oauth' ? 
          Object.keys(validationResults.oauth).every(okey => 
            validationResults.oauth[okey].status === 'success' || !validationResults.oauth[okey].critical
          ) :
          validationResults[key].status === 'success' || !validationResults[key].critical
      );
    
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: validationResults
    });
  });

  app.get('/health/detailed', (req, res) => {
    const validationResults = app.locals.startupValidation || {};
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: require('./package.json').version,
      services: validationResults
    });
  });

  // Secure file serving route - redirect /uploads/ to secure serve endpoint
  app.get('/uploads/:userId/:filename', (req, res) => {
    const { userId, filename } = req.params;
    res.redirect(`/files/serve/${userId}/${filename}`);
  });

  // Basic route
  app.get('/', (req, res) => {
    const clientDetails = {
      ip: req.ip || (req.connection && req.connection.remoteAddress) || req.headers['x-forwarded-for'] || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    };
    
    logAuthEvent('HOME_PAGE_ACCESSED', {
      ...clientDetails,
      authenticated: req.isAuthenticated(),
      userId: req.user?.id || null
    });
    
    res.render('index', {
      user: req.user,
      authenticated: req.isAuthenticated()
    });
  });

  // Dashboard route
  app.get('/dashboard', isAuthenticated, enforceMfa, async (req, res) => {
    const clientDetails = {
      ip: req.ip || (req.connection && req.connection.remoteAddress) || req.headers['x-forwarded-for'] || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    };
    
    logAuthEvent('DASHBOARD_ACCESSED', {
      ...clientDetails,
      userId: req.user.id,
      username: req.user.username
    });
    
    // Load user's subscription information
    let subscriptionInfo = null;
    try {
      const subscriptionService = require('./services/subscriptionService');
      subscriptionInfo = await subscriptionService.getUserSubscription(req.user.id);
    } catch (error) {
      console.error('Error loading subscription info for dashboard:', error);
    }
    
    res.render('dashboard', { 
      title: 'Dashboard - DaySave',
      user: req.user,
      subscription: subscriptionInfo
    });
  });

  // API Key Management route
  app.get('/api-keys', isAuthenticated, enforceMfa, (req, res) => {
    const clientDetails = {
      ip: req.ip || (req.connection && req.connection.remoteAddress) || req.headers['x-forwarded-for'] || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    };
    
    logAuthEvent('API_KEY_MANAGEMENT_ACCESSED', {
      ...clientDetails,
      userId: req.user.id,
      username: req.user.username
    });
    
    res.render('api-keys/manage', { 
      title: 'API Key Management - DaySave',
      user: req.user
    });
  });

  // Profile route
  app.get('/profile', isAuthenticated, async (req, res) => {
    const clientDetails = {
      ip: req.ip || (req.connection && req.connection.remoteAddress) || req.headers['x-forwarded-for'] || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    };
    
    logAuthEvent('PROFILE_ACCESSED', {
      ...clientDetails,
      userId: req.user.id,
      username: req.user.username
    });
    
    // Load user's subscription information for profile
    let subscriptionInfo = null;
    try {
      const subscriptionService = require('./services/subscriptionService');
      subscriptionInfo = await subscriptionService.getUserSubscription(req.user.id);
    } catch (error) {
      console.error('Error loading subscription info for profile:', error);
    }
    
    // Get MFA enforcement message and clear it
    const mfaEnforcementMessage = req.session.mfaEnforcementMessage;
    if (mfaEnforcementMessage) {
      delete req.session.mfaEnforcementMessage;
    }
    
    res.render('profile', { 
      title: 'Profile - DaySave',
      user: req.user,
      subscription: subscriptionInfo,
      mfaEnforcementMessage
    });
  });

  // Admin dashboard route
  app.get('/admin/dashboard', isAuthenticated, enforceMfa, async (req, res) => {
    // Force role loading for admin access
    if (!req.user.Role) {
      const { Role } = require('./models');
      const role = await Role.findByPk(req.user.role_id);
      if (role) {
        req.user.Role = role;
      }
    }
    
    // Check admin permission
    if (!req.user.Role || req.user.Role.name !== 'admin') {
      return res.status(403).render('error', {
        user: req.user,
        title: 'Access Denied',
        message: 'You do not have administrator privileges.'
      });
    }

    res.render('admin-dashboard', {
      title: 'Admin Dashboard - DaySave',
      user: req.user
    });
  });

  // Temporary debug route for admin session issues
  app.get('/debug-admin-session', async (req, res) => {
    try {
      const { User, Role } = require('./models');
      
      // Get all admin users
      const adminUsers = await User.findAll({
        include: [{ model: Role, where: { name: 'admin' }, required: true }]
      });
      
      // Check current session user if authenticated
      let sessionInfo = null;
      if (req.isAuthenticated() && req.user) {
        const freshUser = await User.findByPk(req.user.id, { include: [Role] });
        sessionInfo = {
          sessionUserId: req.user.id,
          sessionUsername: req.user.username,
          sessionHasRole: !!req.user.Role,
          sessionRoleName: req.user.Role ? req.user.Role.name : null,
          dbRoleName: freshUser.Role ? freshUser.Role.name : null,
          isAdmin: req.user.Role && req.user.Role.name === 'admin',
          templateCondition: req.user && req.user.Role && req.user.Role.name === 'admin'
        };
      }
      
      res.json({
        status: 'debug_info',
        authenticated: req.isAuthenticated(),
        adminUsers: adminUsers.map(u => ({
          id: u.id,
          username: u.username,
          email: u.email,
          role: u.Role.name
        })),
        currentSession: sessionInfo,
        fixInstructions: {
          ifNotAuthenticated: 'Please log in as an admin user',
          ifNoRole: 'Session missing role - try /auth/refresh-session',
          ifNotAdmin: 'User is not an admin - contact administrator',
          browserFix: 'Try hard refresh (Ctrl+F5) or clear browser cache'
        }
      });
      
    } catch (error) {
      res.status(500).json({ 
        error: 'Debug failed', 
        message: error.message,
        fix: 'Try restarting the application or checking database connectivity'
      });
    }
  });

  // Error handling middleware
  app.use(errorHandler);

  // Start the server
  const PORT = process.env.APP_PORT || process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📁 Auth logs will be written to: ${logBasePath}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });

}).catch(err => {
  console.error('\n❌ APPLICATION STARTUP FAILED');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (err.name && err.name.includes('Sequelize')) {
    console.error('🔴 Database synchronization failed:', err.message);
    console.error('');
    console.error('💡 This could be due to:');
    console.error('   • Database schema conflicts');
    console.error('   • Missing database tables');
    console.error('   • Insufficient database permissions');
    console.error('   • Database version compatibility issues');
    console.error('');
    console.error('🔧 Try running database migrations:');
    console.error('   npx sequelize-cli db:migrate');
  } else if (err.message && err.message.includes('session')) {
    console.error('🔴 Session store initialization failed:', err.message);
    console.error('');
    console.error('💡 This could be due to:');
    console.error('   • Session table creation issues');
    console.error('   • Database permission problems');
    console.error('   • Invalid session configuration');
  } else {
    console.error('🔴 Unknown startup error:', err.message);
    console.error('');
    console.error('💡 Please check:');
    console.error('   • All environment variables are set correctly');
    console.error('   • All required services are running');
    console.error('   • Application logs for more details');
  }
  
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('');
  console.error('❌ Exiting application...');
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app;