const express = require('express');
const passport = require('passport');
const router = express.Router();
const { logAuthEvent, logAuthError, logOAuthFlow, logOAuthError } = require('../config/logger');

// Import middleware
const {
  isAuthenticated,
  isNotAuthenticated,
  logAuthAttempt,
  authRateLimiter,
  validateUserLogin
} = require('../middleware');

// Apply rate limiting to auth routes
router.use(authRateLimiter);

// Login page
router.get('/login', isNotAuthenticated, (req, res) => {
  const clientDetails = {
    ip: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown'
  };
  
  logAuthEvent('LOGIN_PAGE_ACCESSED', {
    ...clientDetails,
    error: req.query.error
  });
  
  res.render('auth/login', {
    title: 'Login - DaySave',
    error: req.query.error
  });
});

// Google OAuth routes
router.get('/google', (req, res, next) => {
  const clientDetails = {
    ip: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown'
  };
  
  logOAuthFlow('google', 'INITIATE', clientDetails);
  
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  const clientDetails = {
    ip: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown'
  };
  
  logOAuthFlow('google', 'CALLBACK_RECEIVED', {
    ...clientDetails,
    query: req.query,
    session: req.session
  });
  
  passport.authenticate('google', (err, user, info) => {
    logOAuthFlow('google', 'CALLBACK_PROCESSING', { 
      ...clientDetails, 
      userId: user ? user.id : 'No User', 
      error: err ? err.message : 'No Error', 
      info: info,
      session: req.session
    });

    if (err) {
      logOAuthError('google', 'AUTHENTICATION_ERROR', err, clientDetails);
      return res.redirect('/auth/login?error=authentication_failed');
    }
    if (!user) {
      logOAuthFlow('google', 'AUTHENTICATION_FAILED', { ...clientDetails, info: info });
      return res.redirect('/auth/login?error=user_not_found');
    }
    req.login(user, (loginErr) => {
      logOAuthFlow('google', 'REQ_LOGIN_CALLBACK', { 
        ...clientDetails, 
        userId: user.id,
        loginErr: loginErr ? loginErr.message : 'No Error',
        session: req.session,
        isAuthenticated: req.isAuthenticated()
      });

      if (loginErr) {
        logAuthError('LOGIN_ERROR', loginErr, { ...clientDetails, userId: user.id });
        return res.redirect('/auth/login?error=login_failed');
      }
      
      // Explicitly save the session before redirecting
      req.session.save((saveErr) => {
        logOAuthFlow('google', 'SESSION_SAVE_CALLBACK', { 
          ...clientDetails, 
          userId: user.id,
          saveErr: saveErr ? saveErr.message : 'No Error',
          session: req.session,
          isAuthenticated: req.isAuthenticated()
        });

        if (saveErr) {
          logAuthError('SESSION_SAVE_ERROR', saveErr, { ...clientDetails, userId: user.id });
          return res.redirect('/auth/login?error=session_save_failed');
        }
        logAuthEvent('LOGIN_SUCCESS', { ...clientDetails, userId: user.id, username: user.username });
        return res.redirect('/dashboard');
      });
    });
  })(req, res, next);
});

// Microsoft OAuth routes
router.get('/microsoft', (req, res, next) => {
  const clientDetails = {
    ip: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown'
  };
  
  logOAuthFlow('microsoft', 'INITIATE', clientDetails);
  
  passport.authenticate('microsoft', {
    scope: ['user.read', 'email']
  })(req, res, next);
});

router.get('/microsoft/callback', (req, res, next) => {
  const clientDetails = {
    ip: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown'
  };
  
  logOAuthFlow('microsoft', 'CALLBACK_RECEIVED', {
    ...clientDetails,
    query: req.query
  });
  
  passport.authenticate('microsoft', (err, user, info) => {
    logOAuthFlow('microsoft', 'CALLBACK_PROCESSING', { ...clientDetails, userId: user ? user.id : null, error: err, info: info });

    if (err) {
      logOAuthError('microsoft', 'AUTHENTICATION_ERROR', err, clientDetails);
      return res.redirect('/auth/login?error=authentication_failed');
    }
    if (!user) {
      logOAuthFlow('microsoft', 'AUTHENTICATION_FAILED', { ...clientDetails, info: info });
      return res.redirect('/auth/login?error=user_not_found');
    }
    req.login(user, (loginErr) => {
      if (loginErr) {
        logAuthError('LOGIN_ERROR', loginErr, { ...clientDetails, userId: user.id });
        return res.redirect('/auth/login?error=login_failed');
      }
      // Explicitly save the session before redirecting
      req.session.save((saveErr) => {
        if (saveErr) {
          logAuthError('SESSION_SAVE_ERROR', saveErr, { ...clientDetails, userId: user.id });
          return res.redirect('/auth/login?error=session_save_failed');
        }
        logAuthEvent('LOGIN_SUCCESS', { ...clientDetails, userId: user.id, username: user.username });
        return res.redirect('/dashboard');
      });
    });
  })(req, res, next);
});

// Apple OAuth routes
router.get('/apple', (req, res, next) => {
  const clientDetails = {
    ip: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown'
  };
  
  logOAuthFlow('apple', 'INITIATE', clientDetails);
  
  passport.authenticate('apple', {
    scope: ['name', 'email']
  })(req, res, next);
});

router.get('/apple/callback', (req, res, next) => {
  const clientDetails = {
    ip: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown'
  };
  
  logOAuthFlow('apple', 'CALLBACK_RECEIVED', {
    ...clientDetails,
    query: req.query
  });
  
  passport.authenticate('apple', (err, user, info) => {
    logOAuthFlow('apple', 'CALLBACK_PROCESSING', { ...clientDetails, userId: user ? user.id : null, error: err, info: info });

    if (err) {
      logOAuthError('apple', 'AUTHENTICATION_ERROR', err, clientDetails);
      return res.redirect('/auth/login?error=authentication_failed');
    }
    if (!user) {
      logOAuthFlow('apple', 'AUTHENTICATION_FAILED', { ...clientDetails, info: info });
      return res.redirect('/auth/login?error=user_not_found');
    }
    req.login(user, (loginErr) => {
      if (loginErr) {
        logAuthError('LOGIN_ERROR', loginErr, { ...clientDetails, userId: user.id });
        return res.redirect('/auth/login?error=login_failed');
      }
      // Explicitly save the session before redirecting
      req.session.save((saveErr) => {
        if (saveErr) {
          logAuthError('SESSION_SAVE_ERROR', saveErr, { ...clientDetails, userId: user.id });
          return res.redirect('/auth/login?error=session_save_failed');
        }
        logAuthEvent('LOGIN_SUCCESS', { ...clientDetails, userId: user.id, username: user.username });
        return res.redirect('/dashboard');
      });
    });
  })(req, res, next);
});

// Logout
router.get('/logout', isAuthenticated, (req, res) => {
  const clientDetails = {
    ip: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown'
  };
  const userDetails = {
    userId: req.user.id,
    username: req.user.username,
    email: req.user.email
  };
  
  logAuthEvent('LOGOUT_ATTEMPT', {
    ...clientDetails,
    ...userDetails
  });
  
  req.logout((err) => {
    if (err) {
      logAuthError('LOGOUT_ERROR', err, {
        ...clientDetails,
        ...userDetails
      });
      return res.status(500).json({ error: 'Logout failed' });
    }
    
    logAuthEvent('LOGOUT_SUCCESS', {
      ...clientDetails,
      ...userDetails
    });
    
    res.redirect('/');
  });
});

// Get current user info (API endpoint)
router.get('/me', isAuthenticated, (req, res) => {
  const clientDetails = {
    ip: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown'
  };
  
  logAuthEvent('USER_INFO_REQUEST', {
    ...clientDetails,
    userId: req.user.id,
    username: req.user.username
  });
  
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
  const clientDetails = {
    ip: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown'
  };
  
  const status = {
    authenticated: req.isAuthenticated(),
    user: req.isAuthenticated() ? {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email
    } : null
  };
  
  logAuthEvent('AUTH_STATUS_CHECK', {
    ...clientDetails,
    authenticated: status.authenticated,
    userId: status.user?.id || null
  });
  
  res.json(status);
});

module.exports = router; 