const express = require('express');
const passport = require('passport');
const router = express.Router();
const { logAuthEvent, logAuthError, logOAuthFlow, logOAuthError } = require('../config/logger');
const { User, Role, Sequelize, SocialAccount, SubscriptionPlan } = require('../models');
const subscriptionService = require('../services/subscriptionService');
const { trackLogin } = require('../utils/login-tracker');
const { trackSuccessfulLogin, trackFailedLogin } = require('../utils/loginAttemptTracker');

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

// Test login page (no JavaScript)
router.get('/test-login', (req, res) => {
  res.render('test-login', {
    title: 'Test Login - DaySave'
  });
});

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
  
  // Generate CSRF token for the session
  const crypto = require('crypto');
  const csrfToken = crypto.randomBytes(32).toString('hex');
  req.session.csrfToken = csrfToken;
  
  res.render('auth/login', {
    title: 'Login - DaySave',
    error: req.query.error,
    success: req.query.success,
    user: req.user || null,
    csrfToken: csrfToken
  });
});

// Google OAuth routes
router.get('/google', (req, res, next) => {
  const clientDetails = {
    ip: req.ip || (req.connection && req.connection.remoteAddress) || req.headers['x-forwarded-for'] || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown'
  };
  
  // Check if this is a manual linking request
  if (req.query.manual_link === 'true' && req.isAuthenticated()) {
    req.session.manualLinkRequest = {
      provider: 'google',
      userId: req.user.id,
      timestamp: Date.now()
    };
  }
  
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
  
  // Check if this is a manual linking request
  const isManualLink = req.session.manualLinkRequest;
  
  logOAuthFlow('google', 'CALLBACK_RECEIVED', {
    ...clientDetails,
    query: req.query,
    session: req.session,
    isManualLink: isManualLink
  });
  
  passport.authenticate('google', (err, user, info) => {
    logOAuthFlow('google', 'CALLBACK_PROCESSING', { 
      ...clientDetails, 
      userId: user ? user.id : 'No User', 
      error: err ? err.message : 'No Error', 
      info: info,
      session: req.session,
      isManualLink: isManualLink
    });

    if (err) {
      logOAuthError('google', 'AUTHENTICATION_ERROR', err, clientDetails);
      return res.redirect('/auth/login?error=authentication_failed');
    }
    
    // Handle manual linking from profile page
    if (isManualLink && req.isAuthenticated()) {
      return handleManualOAuthLink(req, res, 'google', user, info);
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
      req.session.save(async (saveErr) => {
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
        
        // Track successful login in both UserDevice and LoginAttempt tables
        await trackLogin(user.id, req, { loginMethod: 'oauth_google' });
        await trackSuccessfulLogin(user.id, req, { loginMethod: 'oauth_google' });
        
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
  
  // Check if this is a manual linking request
  if (req.query.manual_link === 'true' && req.isAuthenticated()) {
    req.session.manualLinkRequest = {
      provider: 'microsoft',
      userId: req.user.id,
      timestamp: Date.now()
    };
  }
  
  logOAuthFlow('microsoft', 'INITIATE', clientDetails);
  
  passport.authenticate('microsoft', {
    scope: ['openid', 'profile', 'email', 'User.Read']
  })(req, res, next);
});

router.get('/microsoft/callback', (req, res, next) => {
  const clientDetails = {
    ip: req.ip || (req.connection && req.connection.remoteAddress) || req.headers['x-forwarded-for'] || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown'
  };
  
  // Check if this is a manual linking request
  const isManualLink = req.session.manualLinkRequest;
  
  logOAuthFlow('microsoft', 'CALLBACK_RECEIVED', {
    ...clientDetails,
    query: req.query,
    isManualLink: isManualLink
  });
  
  passport.authenticate('microsoft', (err, user, info) => {
    logOAuthFlow('microsoft', 'CALLBACK_PROCESSING', { ...clientDetails, userId: user ? user.id : null, error: err, info: info, isManualLink: isManualLink });

    if (err) {
      logOAuthError('microsoft', 'AUTHENTICATION_ERROR', err, clientDetails);
      return res.redirect('/auth/login?error=authentication_failed');
    }
    
    // Handle manual linking from profile page
    if (isManualLink && req.isAuthenticated()) {
      return handleManualOAuthLink(req, res, 'microsoft', user, info);
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
      req.session.save(async (saveErr) => {
        if (saveErr) {
          logAuthError('SESSION_SAVE_ERROR', saveErr, { ...clientDetails, userId: user.id });
          return res.redirect('/auth/login?error=session_save_failed');
        }
        
        // Track successful login in both UserDevice and LoginAttempt tables
        await trackLogin(user.id, req, { loginMethod: 'oauth_microsoft' });
        await trackSuccessfulLogin(user.id, req, { loginMethod: 'oauth_microsoft' });
        
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
  
  // Check if this is a manual linking request
  if (req.query.manual_link === 'true' && req.isAuthenticated()) {
    req.session.manualLinkRequest = {
      provider: 'apple',
      userId: req.user.id,
      timestamp: Date.now()
    };
  }
  
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
  
  // Check if this is a manual linking request
  const isManualLink = req.session.manualLinkRequest;
  
  logOAuthFlow('apple', 'CALLBACK_RECEIVED', {
    ...clientDetails,
    query: req.query,
    isManualLink: isManualLink
  });
  
  passport.authenticate('apple', (err, user, info) => {
    logOAuthFlow('apple', 'CALLBACK_PROCESSING', { ...clientDetails, userId: user ? user.id : null, error: err, info: info, isManualLink: isManualLink });

    if (err) {
      logOAuthError('apple', 'AUTHENTICATION_ERROR', err, clientDetails);
      return res.redirect('/auth/login?error=authentication_failed');
    }
    
    // Handle manual linking from profile page
    if (isManualLink && req.isAuthenticated()) {
      return handleManualOAuthLink(req, res, 'apple', user, info);
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
      req.session.save(async (saveErr) => {
        if (saveErr) {
          logAuthError('SESSION_SAVE_ERROR', saveErr, { ...clientDetails, userId: user.id });
          return res.redirect('/auth/login?error=session_save_failed');
        }
        
        // Track successful login in both UserDevice and LoginAttempt tables
        await trackLogin(user.id, req, { loginMethod: 'oauth_apple' });
        await trackSuccessfulLogin(user.id, req, { loginMethod: 'oauth_apple' });
        
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

// Forgot Passkey Recovery - Start recovery process
router.get('/forgot-passkey', (req, res) => {
  res.render('auth/forgot-passkey', {
    title: 'Lost/Forgot Passkey - DaySave',
    user: null,
    error: null,
    success: null
  });
});

// Forgot Passkey Recovery - Send recovery email
router.post('/forgot-passkey', async (req, res) => {
  const { email } = req.body;
  
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.render('auth/forgot-passkey', {
      title: 'Lost/Forgot Passkey - DaySave',
      user: null,
      error: 'Please enter a valid email address.',
      success: null
    });
  }
  
  try {
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      // Don't reveal if email exists for security
      return res.render('auth/forgot-passkey', {
        title: 'Lost/Forgot Passkey - DaySave',
        user: null,
        error: null,
        success: 'If an account with this email exists, you will receive recovery instructions.'
      });
    }
    
    // Check if user has any passkeys
    const passkeyCount = await UserPasskey.countUserPasskeys(user.id, true);
    
    if (passkeyCount === 0) {
      return res.render('auth/forgot-passkey', {
        title: 'Lost/Forgot Passkey - DaySave',
        user: null,
        error: 'No passkeys found for this account. You can log in with your password instead.',
        success: null
      });
    }
    
    // Generate recovery token
    const crypto = require('crypto');
    const recoveryToken = crypto.randomBytes(32).toString('hex');
    
    // Store recovery token in user record (you might want to create a separate table for this)
    user.email_verification_token = recoveryToken; // Reusing this field for recovery
    user.updated_at = new Date();
    await user.save();
    
    // Send recovery email
    const sendMail = require('../utils/send-mail');
    await sendMail({
      to: email,
      subject: 'Passkey Recovery - DaySave',
      html: `
        <h2>Passkey Recovery Request</h2>
        <p>Hello ${user.username},</p>
        <p>You requested to recover access to your passkeys for your DaySave account.</p>
        <p>Click the link below to manage your passkeys and recover access:</p>
        <p><a href="${process.env.BASE_URL || `http://localhost:${process.env.APP_PORT || 3000}`}/auth/recover-passkey?token=${recoveryToken}" style="display: inline-block; padding: 12px 24px; background-color: #667eea; color: white; text-decoration: none; border-radius: 8px;">Recover Passkeys</a></p>
        <p><strong>What you can do:</strong></p>
        <ul>
          <li>Remove lost or compromised passkeys</li>
          <li>Add new passkeys for your current devices</li>
          <li>Review your account security</li>
        </ul>
        <p>This link will expire in 1 hour for security.</p>
        <p>If you did not request this recovery, please ignore this email and ensure your account is secure.</p>
        <hr>
        <p><small>DaySave - Secure Content Management</small></p>
      `
    });
    
    logAuthEvent('PASSKEY_RECOVERY_EMAIL_SENT', {
      userId: user.id,
      email: user.email,
      ip: req.ip || req.headers['x-forwarded-for'] || 'unknown'
    });
    
    res.render('auth/forgot-passkey', {
      title: 'Lost/Forgot Passkey - DaySave',
      user: null,
      error: null,
      success: 'Recovery instructions have been sent to your email address.'
    });
    
  } catch (error) {
    logAuthError('PASSKEY_RECOVERY_ERROR', error, {
      email: email,
      ip: req.ip || 'unknown'
    });
    
    res.render('auth/forgot-passkey', {
      title: 'Lost/Forgot Passkey - DaySave',
      user: null,
      error: 'An error occurred. Please try again.',
      success: null
    });
  }
});

// Passkey Recovery - Verify token and show recovery page
router.get('/recover-passkey', async (req, res) => {
  const { token } = req.query;
  
  if (!token) {
    return res.redirect('/auth/forgot-passkey?error=invalid_token');
  }
  
  try {
    const user = await User.findOne({ 
      where: { email_verification_token: token },
      include: [{ model: Role, as: 'Role' }]
    });
    
    if (!user) {
      return res.redirect('/auth/forgot-passkey?error=invalid_token');
    }
    
    // Check if token is recent (1 hour)
    const tokenAge = Date.now() - user.updated_at.getTime();
    if (tokenAge > 60 * 60 * 1000) {
      return res.redirect('/auth/forgot-passkey?error=expired_token');
    }
    
    // Get user's passkeys
    const passkeys = await UserPasskey.getUserPasskeys(user.id, false);
    
    res.render('auth/recover-passkey', {
      title: 'Recover Passkeys - DaySave',
      user: user,
      passkeys: passkeys,
      token: token,
      error: null,
      success: null
    });
    
  } catch (error) {
    logAuthError('PASSKEY_RECOVERY_PAGE_ERROR', error, {
      token: token ? token.substr(0, 8) + '...' : 'none',
      ip: req.ip || 'unknown'
    });
    
    res.redirect('/auth/forgot-passkey?error=recovery_failed');
  }
});

// Username/password login
router.post('/login', isNotAuthenticated, async (req, res, next) => {
  const { username, password } = req.body;
  
  const clientDetails = {
    ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown'
  };
  
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
      logAuthEvent('LOGIN_FAILED_USER_NOT_FOUND', { ...clientDetails, username });
      
      // Track failed login attempt (no user ID available)
      await trackFailedLogin(null, req, 'USER_NOT_FOUND', { loginMethod: 'password' });
      
      return res.render('auth/login', {
        title: 'Login - DaySave',
        error: 'Invalid username/email or password.',
        user: null
      });
    }
    
    if (!user.email_verified) {
      logAuthEvent('LOGIN_FAILED_EMAIL_NOT_VERIFIED', { ...clientDetails, userId: user.id, username: user.username });
      
      // Track failed login attempt
      await trackFailedLogin(user.id, req, 'EMAIL_NOT_VERIFIED', { loginMethod: 'password' });
      
      return res.render('auth/login', {
        title: 'Login - DaySave',
        error: 'Please verify your email before logging in.',
        user: null
      });
    }
    
    const bcrypt = require('bcryptjs');
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      logAuthEvent('LOGIN_FAILED_INVALID_PASSWORD', { ...clientDetails, userId: user.id, username: user.username });
      
      // Track failed login attempt
      await trackFailedLogin(user.id, req, 'INVALID_PASSWORD', { loginMethod: 'password' });
      
      return res.render('auth/login', {
        title: 'Login - DaySave',
        error: 'Invalid username/email or password.',
        user: null
      });
    }
    
    // Check if user has 2FA enabled
    if (user.totp_enabled) {
      // Store user ID in session for 2FA verification
      req.session.pendingUserId = user.id;
      req.session.pendingUserEmail = user.email;
      req.session.pendingUserUsername = user.username;
      
      logAuthEvent('LOGIN_2FA_REQUIRED', { 
        ...clientDetails, 
        userId: user.id, 
        username: user.username,
        email: user.email 
      });
      
      return res.redirect('/auth/verify-2fa');
    }
    
    // No 2FA required, complete login
    req.login(user, async (err) => {
      if (err) {
        logAuthError('LOGIN_SESSION_ERROR', err, { ...clientDetails, userId: user.id });
        return next(err);
      }
      
      // Track successful login in both UserDevice and LoginAttempt tables
      await trackLogin(user.id, req, { loginMethod: 'password' });
      await trackSuccessfulLogin(user.id, req, { loginMethod: 'password' });
      
      logAuthEvent('LOGIN_SUCCESS', { 
        ...clientDetails, 
        userId: user.id, 
        username: user.username,
        email: user.email 
      });
      
      return res.redirect('/dashboard');
    });
    
  } catch (err) {
    logAuthError('LOGIN_ERROR', err, { ...clientDetails, username });
    return res.render('auth/login', {
      title: 'Login - DaySave',
      error: 'An error occurred. Please try again.',
      user: null
    });
  }
});

// Show 2FA verification page
router.get('/verify-2fa', (req, res) => {
  // Check if user has pending 2FA verification
  if (!req.session.pendingUserId) {
    return res.redirect('/auth/login?error=Session expired. Please log in again.');
  }
  
  res.render('auth/verify-2fa', {
    title: 'Two-Factor Authentication - DaySave',
    error: req.query.error,
    success: req.query.success
  });
});

// Handle 2FA verification
router.post('/verify-2fa', async (req, res, next) => {
  const { code } = req.body;
  
  const clientDetails = {
    ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown'
  };
  
  // Check if user has pending 2FA verification
  if (!req.session.pendingUserId) {
    return res.redirect('/auth/login?error=Session expired. Please log in again.');
  }
  
  if (!code || !/^\d{6}$/.test(code)) {
    return res.render('auth/verify-2fa', {
      title: 'Two-Factor Authentication - DaySave',
      error: 'Please enter a valid 6-digit verification code.',
      success: null
    });
  }
  
  try {
    const user = await User.findByPk(req.session.pendingUserId);
    if (!user) {
      return res.redirect('/auth/login?error=User not found. Please log in again.');
    }
    
    if (!user.totp_enabled || !user.totp_secret) {
      logAuthEvent('2FA_VERIFY_NO_SECRET', { ...clientDetails, userId: user.id });
      return res.render('auth/verify-2fa', {
        title: 'Two-Factor Authentication - DaySave',
        error: '2FA is not properly configured. Please contact support.',
        success: null
      });
    }
    
    // Verify the TOTP code
    const speakeasy = require('speakeasy');
    const isValid = speakeasy.totp.verify({
      secret: user.totp_secret,
      encoding: 'base32',
      token: code,
      window: 2 // Allow for time drift
    });
    
    // Log verification attempt
    logAuthEvent(isValid ? '2FA_VERIFY_SUCCESS' : '2FA_VERIFY_FAILED', {
      ...clientDetails,
      userId: user.id,
      username: user.username,
      email: user.email,
      codeLength: code.length,
      attemptedAt: new Date().toISOString()
    });
    
    if (!isValid) {
      // Track failed 2FA attempt
      await trackFailedLogin(user.id, req, 'INVALID_2FA_CODE', { loginMethod: '2fa_totp' });
      
      return res.render('auth/verify-2fa', {
        title: 'Two-Factor Authentication - DaySave',
        error: 'Invalid verification code. Please try again.',
        success: null
      });
    }
    
    // 2FA verification successful, complete login
    req.login(user, async (err) => {
      if (err) {
        logAuthError('2FA_LOGIN_SESSION_ERROR', err, { ...clientDetails, userId: user.id });
        return next(err);
      }
      
      // Track successful login in both UserDevice and LoginAttempt tables
      await trackLogin(user.id, req, { loginMethod: '2fa_totp' });
      await trackSuccessfulLogin(user.id, req, { loginMethod: '2fa_totp' });
      
      // Clear pending session data
      delete req.session.pendingUserId;
      delete req.session.pendingUserEmail;
      delete req.session.pendingUserUsername;
      
      logAuthEvent('LOGIN_SUCCESS_WITH_2FA', {
        ...clientDetails,
        userId: user.id,
        username: user.username,
        email: user.email
      });
      
      return res.redirect('/dashboard');
    });
    
  } catch (error) {
    logAuthError('2FA_VERIFY_ERROR', error, {
      ...clientDetails,
      userId: req.session.pendingUserId
    });
    
    return res.render('auth/verify-2fa', {
      title: 'Two-Factor Authentication - DaySave',
      error: 'An error occurred. Please try again.',
      success: null
    });
  }
});

// Handle 2FA backup code verification
router.post('/verify-2fa-backup', async (req, res, next) => {
  const { backupCode } = req.body;
  
  const clientDetails = {
    ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown'
  };
  
  // Check if user has pending 2FA verification
  if (!req.session.pendingUserId) {
    return res.redirect('/auth/login?error=Session expired. Please log in again.');
  }
  
  if (!backupCode || !/^[A-Z0-9]{8}$/.test(backupCode)) {
    return res.render('auth/verify-2fa', {
      title: 'Two-Factor Authentication - DaySave',
      error: 'Please enter a valid 8-character backup code.',
      success: null
    });
  }
  
  try {
    const user = await User.findByPk(req.session.pendingUserId);
    if (!user) {
      return res.redirect('/auth/login?error=User not found. Please log in again.');
    }
    
    if (!user.totp_enabled || !user.totp_backup_codes) {
      logAuthEvent('2FA_BACKUP_VERIFY_NO_CODES', { ...clientDetails, userId: user.id });
      return res.render('auth/verify-2fa', {
        title: 'Two-Factor Authentication - DaySave',
        error: 'No backup codes available. Please use your authenticator app.',
        success: null
      });
    }
    
    // Parse backup codes
    let backupCodes;
    try {
      backupCodes = JSON.parse(user.totp_backup_codes);
    } catch (error) {
      logAuthError('2FA_BACKUP_CODES_PARSE_ERROR', error, { ...clientDetails, userId: user.id });
      return res.render('auth/verify-2fa', {
        title: 'Two-Factor Authentication - DaySave',
        error: 'Backup codes are corrupted. Please contact support.',
        success: null
      });
    }
    
    // Handle both old format (strings) and new format (objects)
    let codeIndex = -1;
    let isOldFormat = false;
    
    // Check if it's old format (array of strings) or new format (array of objects)
    if (backupCodes.length > 0 && typeof backupCodes[0] === 'string') {
      // Old format: array of strings
      isOldFormat = true;
      codeIndex = backupCodes.findIndex(code => code === backupCode);
    } else {
      // New format: array of objects with code, used, usedAt properties
      codeIndex = backupCodes.findIndex(code => code.code === backupCode && !code.used);
    }
    
    // Log verification attempt
    logAuthEvent(codeIndex !== -1 ? '2FA_BACKUP_VERIFY_SUCCESS' : '2FA_BACKUP_VERIFY_FAILED', {
      ...clientDetails,
      userId: user.id,
      username: user.username,
      email: user.email,
      codeLength: backupCode.length,
      format: isOldFormat ? 'old_string' : 'new_object',
      attemptedAt: new Date().toISOString()
    });
    
    if (codeIndex === -1) {
      return res.render('auth/verify-2fa', {
        title: 'Two-Factor Authentication - DaySave',
        error: 'Invalid or already used backup code. Please try another one.',
        success: null
      });
    }
    
    // Mark backup code as used
    if (isOldFormat) {
      // Convert old format to new format and mark as used
      const newBackupCodes = backupCodes.map((code, index) => ({
        code: code,
        used: index === codeIndex,
        usedAt: index === codeIndex ? new Date().toISOString() : null,
        createdAt: new Date().toISOString() // Approximate creation time
      }));
      backupCodes = newBackupCodes;
    } else {
      // New format: just mark as used
      backupCodes[codeIndex].used = true;
      backupCodes[codeIndex].usedAt = new Date().toISOString();
    }
    
    await user.update({
      totp_backup_codes: JSON.stringify(backupCodes)
    });
    
    // Backup code verification successful, complete login
    req.login(user, async (err) => {
      if (err) {
        logAuthError('2FA_BACKUP_LOGIN_SESSION_ERROR', err, { ...clientDetails, userId: user.id });
        return next(err);
      }
      
      // Track successful login in both UserDevice and LoginAttempt tables
      await trackLogin(user.id, req, { loginMethod: '2fa_backup' });
      await trackSuccessfulLogin(user.id, req, { loginMethod: '2fa_backup' });
      
      // Clear pending session data
      delete req.session.pendingUserId;
      delete req.session.pendingUserEmail;
      delete req.session.pendingUserUsername;
      
      logAuthEvent('LOGIN_SUCCESS_WITH_2FA_BACKUP', {
        ...clientDetails,
        userId: user.id,
        username: user.username,
        email: user.email,
        backupCodeUsed: true
      });
      
      return res.redirect('/dashboard');
    });
    
  } catch (error) {
    logAuthError('2FA_BACKUP_VERIFY_ERROR', error, {
      ...clientDetails,
      userId: req.session.pendingUserId
    });
    
    return res.render('auth/verify-2fa', {
      title: 'Two-Factor Authentication - DaySave',
      error: 'An error occurred. Please try again.',
      success: null
    });
  }
});

// Show 2FA reset page
router.get('/reset-2fa', (req, res) => {
  res.render('auth/reset-2fa', {
    title: 'Reset Two-Factor Authentication - DaySave',
    error: req.query.error,
    success: req.query.success
  });
});

// Handle 2FA reset request
router.post('/reset-2fa', async (req, res) => {
  const { email, reason } = req.body;
  
  const clientDetails = {
    ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown'
  };
  
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.render('auth/reset-2fa', {
      title: 'Reset Two-Factor Authentication - DaySave',
      error: 'Please enter a valid email address.',
      success: null
    });
  }
  
  if (!reason || reason.trim().length < 10) {
    return res.render('auth/reset-2fa', {
      title: 'Reset Two-Factor Authentication - DaySave',
      error: 'Please provide a detailed reason for the 2FA reset request.',
      success: null
    });
  }
  
  try {
    const user = await User.findOne({ where: { email } });
    
    // Always show success message for security (don't reveal if email exists)
    const successMessage = 'If an account with this email exists and has 2FA enabled, an admin will review your request. You will be contacted within 24-48 hours.';
    
    if (user && user.totp_enabled) {
      // Log the reset request
      logAuthEvent('2FA_RESET_REQUEST_SUBMITTED', {
        ...clientDetails,
        userId: user.id,
        username: user.username,
        email: user.email,
        reason: reason.substring(0, 200), // Limit reason length in logs
        requestedAt: new Date().toISOString()
      });
      
      // Send notification email to admins (you can implement this)
      // For now, just log it for admin review
      console.log(`2FA Reset Request: User ${user.username} (${user.email}) requested 2FA reset. Reason: ${reason}`);
    } else {
      // Log attempt even if user doesn't exist or doesn't have 2FA
      logAuthEvent('2FA_RESET_REQUEST_INVALID', {
        ...clientDetails,
        email: email,
        reason: 'User not found or 2FA not enabled'
      });
    }
    
    res.render('auth/reset-2fa', {
      title: 'Reset Two-Factor Authentication - DaySave',
      error: null,
      success: successMessage
    });
    
  } catch (error) {
    logAuthError('2FA_RESET_REQUEST_ERROR', error, {
      ...clientDetails,
      email: email
    });
    
    res.render('auth/reset-2fa', {
      title: 'Reset Two-Factor Authentication - DaySave',
      error: 'An error occurred. Please try again.',
      success: null
    });
  }
});

// Debug route to check current session user role
router.get('/debug-session', isAuthenticated, async (req, res) => {
  try {
    const sessionUser = req.user;
    
    // Get fresh user data from database
    const freshUser = await User.findByPk(sessionUser.id, { 
      include: [{ model: Role }] 
    });
    
    const sessionRole = sessionUser.Role ? sessionUser.Role.name : 'NO ROLE IN SESSION';
    const dbRole = freshUser.Role ? freshUser.Role.name : 'NO ROLE IN DB';
    
    const debugInfo = {
      sessionUser: {
        id: sessionUser.id,
        username: sessionUser.username,
        hasRole: !!sessionUser.Role,
        roleName: sessionRole,
        templateCondition: sessionUser && sessionUser.Role && sessionUser.Role.name === 'admin'
      },
      freshUser: {
        id: freshUser.id,
        username: freshUser.username,
        hasRole: !!freshUser.Role,
        roleName: dbRole,
        templateCondition: freshUser && freshUser.Role && freshUser.Role.name === 'admin'
      },
      mismatch: sessionRole !== dbRole
    };
    
    res.json({
      status: 'debug_info',
      data: debugInfo,
      message: debugInfo.mismatch ? 'Role mismatch detected - session needs refresh' : 'Session and DB roles match'
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Debug failed', message: error.message });
  }
});

// Force refresh user session with fresh role data
router.post('/refresh-session', isAuthenticated, async (req, res) => {
  try {
    // Get fresh user data from database
    const freshUser = await User.findByPk(req.user.id, { 
      include: [{ model: Role }] 
    });
    
    if (!freshUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update the session user object
    req.login(freshUser, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Session refresh failed', message: err.message });
      }
      
      res.json({
        success: true,
        message: 'Session refreshed successfully',
        user: {
          id: freshUser.id,
          username: freshUser.username,
          role: freshUser.Role ? freshUser.Role.name : null,
          adminLinkWillShow: freshUser && freshUser.Role && freshUser.Role.name === 'admin'
        }
      });
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Refresh failed', message: error.message });
  }
});

// Forgot Password - Show form
router.get('/forgot-password', isNotAuthenticated, (req, res) => {
  res.render('auth/forgot-password', {
    title: 'Forgot Password - DaySave',
    user: null,
    error: req.query.error,
    success: req.query.success
  });
});

// Forgot Password - Send reset email
router.post('/forgot-password', isNotAuthenticated, async (req, res) => {
  const { identifier } = req.body;
  
  const clientDetails = {
    ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown'
  };
  
  if (!identifier) {
    logAuthEvent('PASSWORD_RESET_INVALID_INPUT', { ...clientDetails, identifier });
    return res.render('auth/forgot-password', {
      title: 'Forgot Password - DaySave',
      user: null,
      error: 'Please enter your email address or username.',
      success: null
    });
  }
  
  // Check if identifier is email or username
  const isEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(identifier);
  const isUsername = /^[a-zA-Z0-9_.-]+$/.test(identifier) && identifier.length >= 3;
  
  if (!isEmail && !isUsername) {
    logAuthEvent('PASSWORD_RESET_INVALID_FORMAT', { ...clientDetails, identifier });
    return res.render('auth/forgot-password', {
      title: 'Forgot Password - DaySave',
      user: null,
      error: 'Please enter a valid email address or username.',
      success: null
    });
  }
  
  try {
    // Find user by email or username
    const whereClause = isEmail ? { email: identifier } : { username: identifier };
    const user = await User.findOne({ where: whereClause });
    
    // Always show success message for security (don't reveal if email exists)
    const successMessage = 'If an account with this email exists, you will receive password reset instructions.';
    
    if (!user) {
      logAuthEvent('PASSWORD_RESET_USER_NOT_FOUND', { ...clientDetails, identifier, isEmail });
      return res.render('auth/forgot-password', {
        title: 'Forgot Password - DaySave',
        user: null,
        error: null,
        success: successMessage
      });
    }
    
    // Generate reset token
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now
    
    // Store reset token in user record (reusing email_verification_token field)
    user.email_verification_token = resetToken;
    user.updated_at = new Date();
    await user.save();
    
    // Send reset email
    const sendMail = require('../utils/send-mail');
    const resetUrl = `${process.env.BASE_URL || `http://localhost:${process.env.APP_PORT || 3000}`}/auth/reset-password?token=${resetToken}`;
    
    await sendMail({
      to: user.email,
      subject: 'Password Reset - DaySave',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #667eea;">Password Reset Request</h2>
          <p>Hello ${user.username},</p>
          <p>You requested to reset your password for your DaySave account.</p>
          <p>Click the button below to reset your password:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #667eea; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
          </p>
          <p><strong>Important:</strong></p>
          <ul>
            <li>This link will expire in 1 hour for security</li>
            <li>If you didn't request this reset, please ignore this email</li>
            <li>Never share this link with anyone</li>
          </ul>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="font-size: 12px; color: #888;">DaySave - Secure Content Management</p>
        </div>
      `
    });
    
    logAuthEvent('PASSWORD_RESET_EMAIL_SENT', {
      ...clientDetails,
      userId: user.id,
      email: user.email
    });
    
    res.render('auth/forgot-password', {
      title: 'Forgot Password - DaySave',
      user: null,
      error: null,
      success: successMessage
    });
    
  } catch (error) {
    logAuthError('PASSWORD_RESET_ERROR', error, {
      ...clientDetails,
      identifier: identifier
    });
    
    res.render('auth/forgot-password', {
      title: 'Forgot Password - DaySave',
      user: null,
      error: 'An error occurred. Please try again.',
      success: null
    });
  }
});

// Reset Password - Show form (verify token)
router.get('/reset-password', isNotAuthenticated, async (req, res) => {
  const { token } = req.query;
  
  if (!token) {
    return res.redirect('/auth/forgot-password?error=Invalid reset link');
  }
  
  try {
    const user = await User.findOne({ 
      where: { email_verification_token: token }
    });
    
    if (!user) {
      return res.redirect('/auth/forgot-password?error=Invalid or expired reset link');
    }
    
    // Check if token is expired (1 hour)
    const tokenAge = Date.now() - new Date(user.updated_at).getTime();
    if (tokenAge > 3600000) {
      return res.redirect('/auth/forgot-password?error=Reset link has expired. Please request a new one.');
    }
    
    res.render('auth/reset-password', {
      title: 'Reset Password - DaySave',
      user: null,
      token: token,
      error: null,
      success: null
    });
    
  } catch (error) {
    logAuthError('PASSWORD_RESET_VERIFY_ERROR', error, {
      ip: req.ip || 'unknown',
      token: token
    });
    
    res.redirect('/auth/forgot-password?error=An error occurred. Please try again.');
  }
});

// Reset Password - Process new password
router.post('/reset-password', isNotAuthenticated, async (req, res) => {
  const { token, new_password, confirm_password } = req.body;
  
  const clientDetails = {
    ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown'
  };
  
  if (!token || !new_password || !confirm_password) {
    return res.render('auth/reset-password', {
      title: 'Reset Password - DaySave',
      user: null,
      token: token,
      error: 'All fields are required.',
      success: null
    });
  }
  
  if (new_password !== confirm_password) {
    return res.render('auth/reset-password', {
      title: 'Reset Password - DaySave',
      user: null,
      token: token,
      error: 'Passwords do not match.',
      success: null
    });
  }
  
  if (new_password.length < 8) {
    return res.render('auth/reset-password', {
      title: 'Reset Password - DaySave',
      user: null,
      token: token,
      error: 'Password must be at least 8 characters long.',
      success: null
    });
  }
  
  try {
    const user = await User.findOne({ 
      where: { email_verification_token: token }
    });
    
    if (!user) {
      return res.redirect('/auth/forgot-password?error=Invalid or expired reset link');
    }
    
    // Check if token is expired (1 hour)
    const tokenAge = Date.now() - new Date(user.updated_at).getTime();
    if (tokenAge > 3600000) {
      return res.redirect('/auth/forgot-password?error=Reset link has expired. Please request a new one.');
    }
    
    // Hash new password
    const bcrypt = require('bcryptjs');
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(new_password, saltRounds);
    
    // Update user password and clear token
    await user.update({
      password_hash: password_hash,
      email_verification_token: null,
      last_password_change: new Date(),
      updated_at: new Date()
    });
    
    logAuthEvent('PASSWORD_RESET_SUCCESS', {
      ...clientDetails,
      userId: user.id,
      email: user.email
    });
    
    res.redirect('/auth/login?success=Password reset successful. You can now log in with your new password.');
    
  } catch (error) {
    logAuthError('PASSWORD_RESET_COMPLETE_ERROR', error, {
      ...clientDetails,
      token: token
    });
    
    res.render('auth/reset-password', {
      title: 'Reset Password - DaySave',
      user: null,
      token: token,
      error: 'An error occurred. Please try again.',
      success: null
    });
  }
});

// ===== MANUAL OAUTH LINKING HANDLER =====

// Handle manual OAuth linking from profile page
async function handleManualOAuthLink(req, res, provider, oauthUser, info) {
  const currentUser = req.user;
  const { SocialAccount } = require('../models');
  
  const clientDetails = {
    ip: req.ip || (req.connection && req.connection.remoteAddress) || req.headers['x-forwarded-for'] || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown'
  };
  
  try {
    // Clear the manual link request from session
    const linkRequest = req.session.manualLinkRequest;
    req.session.manualLinkRequest = null;
    
    if (!linkRequest || linkRequest.provider !== provider || linkRequest.userId !== currentUser.id) {
      logAuthError('MANUAL_OAUTH_LINK_INVALID_SESSION', new Error('Invalid link request'), {
        ...clientDetails,
        currentUserId: currentUser.id,
        provider: provider,
        linkRequest: linkRequest
      });
      return res.redirect('/profile?error=Invalid linking session. Please try again.');
    }
    
    // Get OAuth profile data
    let oauthProfile;
    if (oauthUser) {
      // User already exists with this OAuth account
      const existingSocial = await SocialAccount.findOne({
        where: { user_id: oauthUser.id, provider: provider }
      });
      
      if (existingSocial) {
        oauthProfile = {
          email: existingSocial.handle,
          provider: provider,
          providerUserId: existingSocial.provider_user_id
        };
      }
    } else if (info && info.linkProfile) {
      // OAuth returned profile data for linking
      oauthProfile = info.linkProfile;
    } else {
      // This shouldn't happen, but handle gracefully
      logAuthError('MANUAL_OAUTH_LINK_NO_PROFILE', new Error('No OAuth profile data'), {
        ...clientDetails,
        currentUserId: currentUser.id,
        provider: provider,
        oauthUser: oauthUser ? oauthUser.id : null,
        info: info
      });
      return res.redirect('/profile?error=OAuth profile data not available. Please try again.');
    }
    
    // Check if this OAuth account is already linked to the current user
    const existingLink = await SocialAccount.findOne({
      where: { 
        user_id: currentUser.id, 
        provider: provider 
      }
    });
    
    if (existingLink) {
      logAuthEvent('MANUAL_OAUTH_LINK_ALREADY_EXISTS', {
        ...clientDetails,
        currentUserId: currentUser.id,
        provider: provider,
        existingAccountId: existingLink.id
      });
      return res.redirect('/profile?info=This account is already linked to your profile.');
    }
    
    // Check if this OAuth account is linked to a different user
    const conflictingLink = await SocialAccount.findOne({
      where: { 
        provider: provider,
        provider_user_id: oauthProfile.providerUserId
      }
    });
    
    if (conflictingLink && conflictingLink.user_id !== currentUser.id) {
      logAuthEvent('MANUAL_OAUTH_LINK_CONFLICT', {
        ...clientDetails,
        currentUserId: currentUser.id,
        conflictingUserId: conflictingLink.user_id,
        provider: provider,
        providerUserId: oauthProfile.providerUserId
      });
      return res.redirect('/profile?error=This account is already linked to another user.');
    }
    
    // Create the social account link
    const newSocialAccount = await SocialAccount.create({
      user_id: currentUser.id,
      platform: provider,
      handle: oauthProfile.email,
      provider: provider,
      provider_user_id: oauthProfile.providerUserId,
      access_token: oauthProfile.accessToken || null,
      refresh_token: oauthProfile.refreshToken || null,
      profile_data: JSON.stringify(oauthProfile.profileData || {})
    });
    
    logAuthEvent('MANUAL_OAUTH_LINK_SUCCESS', {
      ...clientDetails,
      currentUserId: currentUser.id,
      provider: provider,
      linkedAccountId: newSocialAccount.id,
      oauthEmail: oauthProfile.email,
      currentUserEmail: currentUser.email
    });
    
    const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
    return res.redirect(`/profile?success=${providerName} account linked successfully! You can now sign in using ${providerName}.`);
    
  } catch (error) {
    logAuthError('MANUAL_OAUTH_LINK_ERROR', error, {
      ...clientDetails,
      currentUserId: currentUser.id,
      provider: provider
    });
    
    return res.redirect('/profile?error=Failed to link account. Please try again.');
  }
}

module.exports = router; 