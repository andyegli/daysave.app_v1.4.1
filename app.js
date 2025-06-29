require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const sequelize = require('./models');
const { passport } = require('./config/auth');
const { logAuthEvent, logAuthError, logBasePath } = require('./config/logger');

// Import middleware
const {
  errorHandler,
  notFoundHandler,
  securityHeaders,
  requestLogger,
  sanitizeInput,
  corsOptions
} = require('./middleware');

const app = express();

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Security middleware (apply first)
app.use(securityHeaders);
app.use(corsOptions);

// Request logging middleware
app.use(requestLogger);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization middleware
app.use(sanitizeInput);

// Session configuration (using memory store for development)
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict'
  },
  name: 'daysave.sid' // Change default session name for security
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Serve static files with security headers
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d', // Cache static files for 1 day
  etag: true
}));

// Log application startup
logAuthEvent('APPLICATION_STARTUP', {
  nodeEnv: process.env.NODE_ENV,
  port: process.env.PORT || 3000,
  logBasePath: logBasePath,
  timestamp: new Date().toISOString()
});

// Routes
app.use('/auth', require('./routes/auth'));

// Basic route
app.get('/', (req, res) => {
  const clientDetails = {
    ip: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown',
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

// Dashboard route (protected)
app.get('/dashboard', (req, res) => {
  const clientDetails = {
    ip: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown'
  };
  
  if (!req.isAuthenticated()) {
    logAuthEvent('DASHBOARD_ACCESS_DENIED', {
      ...clientDetails,
      redirectTo: '/auth/login'
    });
    return res.redirect('/auth/login');
  }
  
  logAuthEvent('DASHBOARD_ACCESSED', {
    ...clientDetails,
    userId: req.user.id,
    username: req.user.username
  });
  
  res.render('dashboard', {
    user: req.user,
    title: 'Dashboard - DaySave'
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
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Auth logs will be written to: ${logBasePath}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  app.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  app.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
