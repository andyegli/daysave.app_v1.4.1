require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const sequelize = require('./models');
const { passport } = require('./config/auth');

const app = express();

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration (using memory store for development)
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/auth', require('./routes/auth'));

// Basic route
app.get('/', (req, res) => {
  res.render('index', {
    user: req.user,
    authenticated: req.isAuthenticated()
  });
});

// Dashboard route (protected)
app.get('/dashboard', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/auth/login');
  }
  res.render('dashboard', {
    user: req.user,
    title: 'Dashboard - DaySave'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    error: process.env.NODE_ENV === 'development' ? err : {},
    message: 'Something went wrong!',
    title: 'Error - DaySave'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', {
    error: {},
    message: 'Page not found',
    title: '404 - DaySave'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
