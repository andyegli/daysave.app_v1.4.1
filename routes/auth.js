const express = require('express');
const passport = require('passport');
const router = express.Router();
const { logAuthEvent, logAuthError, logOAuthFlow, logOAuthError } = require('../config/logger');
const { User } = require('../models');
const db = require('../config/db');

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
    error: req.query.error,
    user: req.user || null
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

// Registration page
router.get('/register', isNotAuthenticated, (req, res) => {
  res.render('auth/register', {
    title: 'Register - DaySave',
    user: req.user || null,
    error: null,
    success: null
  });
});

// Registration handler
router.post('/register', isNotAuthenticated, async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;
  const errors = [];
  if (!username || username.length < 3) errors.push('Username must be at least 3 characters.');
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push('Invalid email address.');
  if (!password || password.length < 8) errors.push('Password must be at least 8 characters.');
  if (password !== confirmPassword) errors.push('Passwords do not match.');
  if (errors.length) {
    return res.render('auth/register', {
      title: 'Register - DaySave',
      user: req.user || null,
      error: errors.join(' '),
      success: null
    });
  }
  try {
    const existingUser = await User.findOne({ where: { [db.Sequelize.Op.or]: [{ username }, { email }] } });
    if (existingUser) {
      return res.render('auth/register', {
        title: 'Register - DaySave',
        user: req.user || null,
        error: 'Username or email already in use.',
        success: null
      });
    }
    const bcrypt = require('bcryptjs');
    const token = require('crypto').randomBytes(32).toString('hex');
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      username,
      email,
      password_hash: hashedPassword,
      email_verified: false,
      email_verification_token: token,
      subscription_status: 'trial',
      language: 'en',
      role_id: (await db.Role.findOne({ where: { name: 'user' } })).id
    });
    // Send confirmation email
    const sendMail = require('../../utils/send-mail');
    await sendMail({
      to: email,
      subject: 'Confirm your DaySave account',
      html: `<p>Hello ${username},</p><p>Thank you for registering at DaySave. Please confirm your email by clicking the link below:</p><p><a href="${process.env.BASE_URL || 'http://localhost:3000'}/auth/verify-email?token=${token}">Verify Email</a></p><p>If you did not register, you can ignore this email.</p>`
    });
    return res.render('auth/register', {
      title: 'Register - DaySave',
      user: req.user || null,
      error: null,
      success: 'Registration successful! Please check your email to confirm your account.'
    });
  } catch (err) {
    return res.render('auth/register', {
      title: 'Register - DaySave',
      user: req.user || null,
      error: 'An error occurred. Please try again.',
      success: null
    });
  }
});

// Email verification route
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.render('auth/login', {
      title: 'Login - DaySave',
      user: req.user || null,
      error: 'Invalid or missing verification token.'
    });
  }
  try {
    const user = await User.findOne({ where: { email_verification_token: token } });
    if (!user) {
      return res.render('auth/login', {
        title: 'Login - DaySave',
        user: req.user || null,
        error: 'Invalid or expired verification token.'
      });
    }
    user.email_verified = true;
    user.email_verification_token = null;
    await user.save();
    return res.render('auth/login', {
      title: 'Login - DaySave',
      user: req.user || null,
      error: null,
      success: 'Your email has been verified! You can now log in.'
    });
  } catch (err) {
    return res.render('auth/login', {
      title: 'Login - DaySave',
      user: req.user || null,
      error: 'An error occurred during verification.'
    });
  }
});

module.exports = router; 