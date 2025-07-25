const express = require('express');
const passport = require('passport');
const router = express.Router();
const { logAuthEvent, logAuthError, logOAuthFlow, logOAuthError } = require('../config/logger');
const { User, Role, Sequelize, SocialAccount, SubscriptionPlan } = require('../models');
const subscriptionService = require('../services/subscriptionService');

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
    ip: req.ip || (req.connection && req.connection.remoteAddress) || req.headers['x-forwarded-for'] || 'unknown',
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
    ip: req.ip || (req.connection && req.connection.remoteAddress) || req.headers['x-forwarded-for'] || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown'
  };
  
  logOAuthFlow('google', 'INITIATE', clientDetails);
  
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  const clientDetails = {
    ip: req.ip || (req.connection && req.connection.remoteAddress) || req.headers['x-forwarded-for'] || 'unknown',
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
    if (info && info.linkAccount && info.linkProfile) {
      req.session.linkProfile = info.linkProfile;
      return res.redirect('/auth/link-account');
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
    ip: req.ip || (req.connection && req.connection.remoteAddress) || req.headers['x-forwarded-for'] || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown'
  };
  
  logOAuthFlow('microsoft', 'INITIATE', clientDetails);
  
  passport.authenticate('microsoft', {
    scope: ['user.read', 'email']
  })(req, res, next);
});

router.get('/microsoft/callback', (req, res, next) => {
  const clientDetails = {
    ip: req.ip || (req.connection && req.connection.remoteAddress) || req.headers['x-forwarded-for'] || 'unknown',
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
    if (info && info.linkAccount && info.linkProfile) {
      req.session.linkProfile = info.linkProfile;
      return res.redirect('/auth/link-account');
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
    ip: req.ip || (req.connection && req.connection.remoteAddress) || req.headers['x-forwarded-for'] || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown'
  };
  
  logOAuthFlow('apple', 'INITIATE', clientDetails);
  
  passport.authenticate('apple', {
    scope: ['name', 'email']
  })(req, res, next);
});

router.get('/apple/callback', (req, res, next) => {
  const clientDetails = {
    ip: req.ip || (req.connection && req.connection.remoteAddress) || req.headers['x-forwarded-for'] || 'unknown',
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
    if (info && info.linkAccount && info.linkProfile) {
      req.session.linkProfile = info.linkProfile;
      return res.redirect('/auth/link-account');
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
    ip: req.ip || (req.connection && req.connection.remoteAddress) || req.headers['x-forwarded-for'] || 'unknown',
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
    ip: req.ip || (req.connection && req.connection.remoteAddress) || req.headers['x-forwarded-for'] || 'unknown',
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
    ip: req.ip || (req.connection && req.connection.remoteAddress) || req.headers['x-forwarded-for'] || 'unknown',
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
    logAuthError('REGISTRATION_VALIDATION_ERROR', new Error(errors.join(' ')), { username, email });
    return res.render('auth/register', {
      title: 'Register - DaySave',
      user: req.user || null,
      error: errors.join(' '),
      success: null,
      username,
      email
    });
  }
  try {
    logAuthEvent('REGISTRATION_ATTEMPT', { username, email });
    const existingUser = await User.findOne({ where: { [Sequelize.Op.or]: [{ username }, { email }] } });
    if (existingUser) {
      logAuthError('REGISTRATION_DUPLICATE', new Error('Username or email already in use.'), { username, email });
      return res.render('auth/register', {
        title: 'Register - DaySave',
        user: req.user || null,
        error: 'Username or email already in use.',
        success: null,
        username,
        email
      });
    }
    const bcrypt = require('bcryptjs');
    const token = require('crypto').randomBytes(32).toString('hex');
    const hashedPassword = await bcrypt.hash(password, 10);
    // Determine if this is the first user
    const userCount = await User.count();
    let assignedRole;
    if (userCount === 0) {
      assignedRole = await Role.findOne({ where: { name: 'admin' } });
    } else {
      assignedRole = await Role.findOne({ where: { name: 'user' } });
    }
    const newUser = await User.create({
      username,
      email,
      password_hash: hashedPassword,
      email_verified: false,
      email_verification_token: token,
      subscription_status: 'trial',
      language: 'en',
      role_id: assignedRole.id
    });
    logAuthEvent('REGISTRATION_USER_CREATED', { userId: newUser.id, username, email });
    
    // Assign Free subscription plan to new user
    try {
      const freePlan = await SubscriptionPlan.findOne({ where: { name: 'free' } });
      if (freePlan) {
        await subscriptionService.createSubscription(newUser.id, freePlan.id, 'monthly');
        logAuthEvent('REGISTRATION_SUBSCRIPTION_ASSIGNED', { 
          userId: newUser.id, 
          planId: freePlan.id,
          planName: 'free' 
        });
      }
    } catch (subscriptionError) {
      logAuthError('REGISTRATION_SUBSCRIPTION_ERROR', subscriptionError, { 
        userId: newUser.id, 
        username, 
        email 
      });
      // Continue with registration even if subscription assignment fails
    }
    
    // Send confirmation email
    const sendMail = require('../utils/send-mail');
    await sendMail({
      to: email,
      subject: 'Confirm your DaySave account',
      html: `<p>Hello ${username},</p><p>Thank you for registering at DaySave. Please confirm your email by clicking the link below:</p><p><a href="${process.env.BASE_URL || `http://localhost:${process.env.APP_PORT || process.env.PORT || 3000}`}/auth/verify-email?token=${token}">Verify Email</a></p><p>If you did not register, you can ignore this email.</p>`
    });
    logAuthEvent('REGISTRATION_EMAIL_SENT', { userId: newUser.id, email });
    return res.render('auth/register', {
      title: 'Register - DaySave',
      user: req.user || null,
      error: null,
      success: 'Registration successful! Please check your email to confirm your account.'
    });
  } catch (err) {
    logAuthError('REGISTRATION_ERROR', err, { username, email });
    return res.render('auth/register', {
      title: 'Register - DaySave',
      user: req.user || null,
      error: 'An error occurred. Please try again.',
      success: null,
      username,
      email
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

// Helper: get provider display name
function getProviderName(provider) {
  if (provider === 'google') return 'Google';
  if (provider === 'microsoft') return 'Microsoft';
  if (provider === 'apple') return 'Apple';
  return provider;
}

// Link account GET
router.get('/link-account', (req, res) => {
  const { linkProfile } = req.session;
  if (!linkProfile) {
    return res.redirect('/auth/login');
  }
  
  // Check if user is already logged in and owns this email
  const isLoggedIn = req.isAuthenticated();
  const isOwnEmail = isLoggedIn && req.user.email === linkProfile.email;
  
  res.render('auth/link-account', {
    email: linkProfile.email,
    provider: linkProfile.provider,
    providerName: getProviderName(linkProfile.provider),
    token: linkProfile.token || '',
    error: null,
    isLoggedIn,
    isOwnEmail,
    user: req.user || null
  });
});

// Link account POST (enhanced with alternative verification methods)
router.post('/link-account', async (req, res) => {
  const { linkProfile } = req.session;
  const { password, verificationMethod } = req.body;
  
  if (!linkProfile) {
    return res.redirect('/auth/login');
  }
  
  try {
    // Find user by email
    const user = await User.findOne({ where: { email: linkProfile.email } });
    if (!user) {
      req.session.linkProfile = null;
      return res.render('auth/login', { 
        title: 'Login - DaySave', 
        user: null, 
        error: 'Account not found.' 
      });
    }
    
    // Check if user is already logged in and owns this email
    const isLoggedIn = req.isAuthenticated();
    const isOwnEmail = isLoggedIn && req.user.email === linkProfile.email;
    
    let verificationPassed = false;
    
    // Method 1: Already logged in with same email - no additional verification needed
    if (isOwnEmail) {
      verificationPassed = true;
      logAuthEvent('OAUTH_LINK_AUTHENTICATED_USER', { 
        userId: user.id, 
        provider: linkProfile.provider,
        email: linkProfile.email 
      });
    }
    // Method 2: Email verification for verified users
    else if (verificationMethod === 'email' && user.email_verified) {
      // Generate and send email verification token
      const crypto = require('crypto');
      const verificationToken = crypto.randomBytes(32).toString('hex');
      
      // Store verification token in session with expiry
      req.session.emailVerificationToken = verificationToken;
      req.session.emailVerificationExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
      
      // Send verification email
      const sendMail = require('../utils/send-mail');
      await sendMail({
        to: linkProfile.email,
        subject: 'Link OAuth Account - DaySave',
        html: `
          <p>Hello,</p>
          <p>You requested to link your ${getProviderName(linkProfile.provider)} account to your DaySave account.</p>
          <p>Click the link below to complete the linking process:</p>
          <p><a href="${process.env.BASE_URL || `http://localhost:${process.env.APP_PORT || 3000}`}/auth/verify-link?token=${verificationToken}">Link Account</a></p>
          <p>This link will expire in 15 minutes.</p>
          <p>If you did not request this, please ignore this email.</p>
        `
      });
      
      return res.render('auth/link-account', {
        email: linkProfile.email,
        provider: linkProfile.provider,
        providerName: getProviderName(linkProfile.provider),
        token: linkProfile.token || '',
        error: null,
        isLoggedIn: false,
        isOwnEmail: false,
        user: null,
        emailSent: true
      });
    }
    // Method 3: Password verification (fallback)
    else if (password) {
      const bcrypt = require('bcryptjs');
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.render('auth/link-account', {
          email: linkProfile.email,
          provider: linkProfile.provider,
          providerName: getProviderName(linkProfile.provider),
          token: linkProfile.token || '',
          error: 'Incorrect password. Please try again.',
          isLoggedIn: false,
          isOwnEmail: false,
          user: null
        });
      }
      verificationPassed = true;
      logAuthEvent('OAUTH_LINK_PASSWORD_VERIFIED', { 
        userId: user.id, 
        provider: linkProfile.provider,
        email: linkProfile.email 
      });
    }
    // No valid verification method provided
    else {
      return res.render('auth/link-account', {
        email: linkProfile.email,
        provider: linkProfile.provider,
        providerName: getProviderName(linkProfile.provider),
        token: linkProfile.token || '',
        error: 'Please choose a verification method.',
        isLoggedIn: false,
        isOwnEmail: false,
        user: null
      });
    }
    
    if (verificationPassed) {
      // Link the provider
      await user.createSocialAccount({
        platform: linkProfile.provider,
        handle: linkProfile.email,
        provider: linkProfile.provider,
        provider_user_id: linkProfile.providerUserId,
        access_token: linkProfile.accessToken,
        refresh_token: linkProfile.refreshToken,
        profile_data: JSON.stringify(linkProfile.profileData)
      });
      
      req.session.linkProfile = null;
      
      // Log the user in if not already logged in
      if (!isLoggedIn) {
        req.login(user, (err) => {
          if (err) {
            return res.render('auth/login', { 
              title: 'Login - DaySave', 
              user: null, 
              error: 'Login failed after linking.' 
            });
          }
          return res.redirect('/dashboard');
        });
      } else {
        // Already logged in, just redirect to dashboard
        return res.redirect('/dashboard');
      }
    }
    
  } catch (err) {
    logAuthError('OAUTH_LINK_ERROR', err, { 
      email: linkProfile.email, 
      provider: linkProfile.provider 
    });
    req.session.linkProfile = null;
    return res.render('auth/login', { 
      title: 'Login - DaySave', 
      user: null, 
      error: 'An error occurred while linking accounts.' 
    });
  }
});

// Email verification route for account linking
router.get('/verify-link', async (req, res) => {
  const { token } = req.query;
  const { linkProfile, emailVerificationToken, emailVerificationExpiry } = req.session;
  
  if (!token || !linkProfile || !emailVerificationToken || !emailVerificationExpiry) {
    return res.redirect('/auth/login?error=invalid_verification_link');
  }
  
  // Check if token is valid and not expired
  if (token !== emailVerificationToken || Date.now() > emailVerificationExpiry) {
    req.session.linkProfile = null;
    req.session.emailVerificationToken = null;
    req.session.emailVerificationExpiry = null;
    return res.redirect('/auth/login?error=verification_link_expired');
  }
  
  try {
    // Find user by email
    const user = await User.findOne({ where: { email: linkProfile.email } });
    if (!user) {
      req.session.linkProfile = null;
      return res.redirect('/auth/login?error=account_not_found');
    }
    
    // Link the provider
    await user.createSocialAccount({
      platform: linkProfile.provider,
      handle: linkProfile.email,
      provider: linkProfile.provider,
      provider_user_id: linkProfile.providerUserId,
      access_token: linkProfile.accessToken,
      refresh_token: linkProfile.refreshToken,
      profile_data: JSON.stringify(linkProfile.profileData)
    });
    
    // Clean up session
    req.session.linkProfile = null;
    req.session.emailVerificationToken = null;
    req.session.emailVerificationExpiry = null;
    
    logAuthEvent('OAUTH_LINK_EMAIL_VERIFIED', { 
      userId: user.id, 
      provider: linkProfile.provider,
      email: linkProfile.email 
    });
    
    // Log the user in
    req.login(user, (err) => {
      if (err) {
        return res.redirect('/auth/login?error=login_failed_after_linking');
      }
      return res.redirect('/dashboard?success=account_linked');
    });
    
  } catch (err) {
    logAuthError('OAUTH_VERIFY_LINK_ERROR', err, { 
      email: linkProfile.email, 
      provider: linkProfile.provider 
    });
    req.session.linkProfile = null;
    return res.redirect('/auth/login?error=linking_failed');
  }
});

// Username/password login
router.post('/login', isNotAuthenticated, async (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.render('auth/login', {
      title: 'Login - DaySave',
      error: 'Please enter both username/email and password.',
      user: null
    });
  }
  try {
    const user = await User.findOne({
      where: {
        [Sequelize.Op.or]: [
          { username: username },
          { email: username }
        ]
      }
    });
    if (!user) {
      return res.render('auth/login', {
        title: 'Login - DaySave',
        error: 'Invalid username/email or password.',
        user: null
      });
    }
    if (!user.email_verified) {
      return res.render('auth/login', {
        title: 'Login - DaySave',
        error: 'Please verify your email before logging in.',
        user: null
      });
    }
    const bcrypt = require('bcryptjs');
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.render('auth/login', {
        title: 'Login - DaySave',
        error: 'Invalid username/email or password.',
        user: null
      });
    }
    req.login(user, (err) => {
      if (err) {
        return next(err);
      }
      return res.redirect('/dashboard');
    });
  } catch (err) {
    return res.render('auth/login', {
      title: 'Login - DaySave',
      error: 'An error occurred. Please try again.',
      user: null
    });
  }
});

module.exports = router; 