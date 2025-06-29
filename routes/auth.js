const express = require('express');
const passport = require('passport');
const router = express.Router();

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
};

// Middleware to check if user is not authenticated
const isNotAuthenticated = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return next();
  }
  res.redirect('/dashboard');
};

// Login page
router.get('/login', isNotAuthenticated, (req, res) => {
  res.render('auth/login', {
    title: 'Login - DaySave',
    error: req.query.error
  });
});

// Google OAuth routes
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: '/auth/login?error=google_auth_failed',
    successRedirect: '/dashboard'
  })
);

// Microsoft OAuth routes
router.get('/microsoft', passport.authenticate('microsoft', {
  scope: ['user.read', 'email']
}));

router.get('/microsoft/callback',
  passport.authenticate('microsoft', {
    failureRedirect: '/auth/login?error=microsoft_auth_failed',
    successRedirect: '/dashboard'
  })
);

// Apple OAuth routes
router.get('/apple', passport.authenticate('apple', {
  scope: ['name', 'email']
}));

router.get('/apple/callback',
  passport.authenticate('apple', {
    failureRedirect: '/auth/login?error=apple_auth_failed',
    successRedirect: '/dashboard'
  })
);

// Logout
router.get('/logout', isAuthenticated, (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.redirect('/');
  });
});

// Get current user info (API endpoint)
router.get('/me', isAuthenticated, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      subscription_status: req.user.subscription_status,
      language: req.user.language
    }
  });
});

// Check authentication status
router.get('/status', (req, res) => {
  res.json({
    authenticated: req.isAuthenticated(),
    user: req.isAuthenticated() ? {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email
    } : null
  });
});

module.exports = router; 