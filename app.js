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
  isAuthenticated
} = require('./middleware');

const app = express();

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Security middleware (apply first)
app.use(securityHeaders());
app.use(require('./middleware').logAllHeaders);
app.use(corsMiddleware);

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

// Sync database models
db.sequelize.sync().then(() => {
  console.log('Database synced');

  // Sync session store
  return sessionStore.sync();
}).then(() => {
  console.log('Session store synced');

  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Always false for local development; set to true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax' // 'strict' can cause issues with some OAuth flows
    },
    name: 'daysave.sid' // Change default session name for security
  }));

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Ensure role is loaded for all authenticated requests
  app.use(ensureRoleLoaded);

  // Serve static files with security headers
  app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1d', // Cache static files for 1 day
    etag: true
  }));

  // Log application startup
  logAuthEvent('APPLICATION_STARTUP', {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.APP_PORT || process.env.PORT || 3000,
    logBasePath: logBasePath,
    timestamp: new Date().toISOString()
  });

  // Log all users in development mode
  if (process.env.NODE_ENV === 'development') {
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
  app.use('/admin', require('./routes/admin'));
  const contactsRouter = require('./routes/contacts');
  app.use('/contacts', contactsRouter);
  app.use('/files', require('./routes/files'));
  app.use('/content', require('./routes/content'));
  app.use('/multimedia', require('./routes/multimedia'));
  app.use('/api/keys', require('./routes/apiKeys'));

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
  app.get('/dashboard', isAuthenticated, (req, res) => {
    const clientDetails = {
      ip: req.ip || (req.connection && req.connection.remoteAddress) || req.headers['x-forwarded-for'] || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    };
    
    logAuthEvent('DASHBOARD_ACCESSED', {
      ...clientDetails,
      userId: req.user.id,
      username: req.user.username
    });
    
    res.render('dashboard', { 
      title: 'Dashboard - DaySave',
      user: req.user
    });
  });

  // API Key Management route
  app.get('/api-keys', isAuthenticated, (req, res) => {
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

  // Profile route (protected)
  app.get('/profile', (req, res) => {
    if (!req.isAuthenticated()) {
      return res.redirect('/auth/login');
    }
    res.render('profile', {
      user: req.user,
      title: 'Profile - DaySave'
    });
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // 404 handler (must be before error handler)
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    const isDevelopment = process.env.NODE_ENV === 'development';
    res.status(status);
    res.render('error', {
      title: 'Error',
      message: isDevelopment ? err.message : 'Internal Server Error',
      user: req.user || null
    });
  });

  // Start the server
  const PORT = process.env.APP_PORT || process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📁 Auth logs will be written to: ${logBasePath}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });

}).catch(err => {
  console.error('Failed to sync database or session store:', err);
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