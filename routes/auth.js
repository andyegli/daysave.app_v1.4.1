const express = require('express');
const passport = require('passport');
const router = express.Router();
const { logAuthEvent, logAuthError, logOAuthFlow, logOAuthError } = require('../config/logger');
const { User, Role, Sequelize, SocialAccount, SubscriptionPlan, UserDevice, LoginAttempt } = require('../models');
const subscriptionService = require('../services/subscriptionService');
const { deviceFingerprinting } = require('../middleware/deviceFingerprinting');
const geoLocationService = require('../services/geoLocationService');

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
  const { username, password, deviceFingerprint } = req.body;
  
  // Client information for logging
  const clientInfo = {
    ip: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'] || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    timestamp: new Date()
  };

  // Get geolocation for IP
  const geoLocation = geoLocationService.getLocationInfo(clientInfo.ip);

  if (!username || !password) {
    await logLoginAttempt(null, false, 'Missing credentials', clientInfo, deviceFingerprint, geoLocation);
    return res.render('auth/login', {
      title: 'Login - DaySave',
      error: 'Please enter both username/email and password.',
      user: null
    });
  }

  try {
    // Find user
    const user = await User.findOne({
      where: {
        [Sequelize.Op.or]: [
          { username: username },
          { email: username }
        ]
      }
    });

    if (!user) {
      await logLoginAttempt(null, false, 'User not found', clientInfo, deviceFingerprint, geoLocation);
      return res.render('auth/login', {
        title: 'Login - DaySave',
        error: 'Invalid username/email or password.',
        user: null
      });
    }

    if (!user.email_verified) {
      await logLoginAttempt(user.id, false, 'Email not verified', clientInfo, deviceFingerprint, geoLocation);
      return res.render('auth/login', {
        title: 'Login - DaySave',
        error: 'Please verify your email before logging in.',
        user: null
      });
    }

    // Verify password
    const bcrypt = require('bcryptjs');
    const valid = await bcrypt.compare(password, user.password_hash);
    
    if (!valid) {
      await logLoginAttempt(user.id, false, 'Invalid password', clientInfo, deviceFingerprint, geoLocation);
      return res.render('auth/login', {
        title: 'Login - DaySave',
        error: 'Invalid username/email or password.',
        user: null
      });
    }

    // Process device fingerprint
    let fingerprintData = null;
    let riskAssessment = null;
    
    if (deviceFingerprint) {
      try {
        fingerprintData = typeof deviceFingerprint === 'string' 
          ? JSON.parse(deviceFingerprint) 
          : deviceFingerprint;
        
        // Perform risk assessment
        riskAssessment = await assessLoginRisk(user.id, fingerprintData, clientInfo, geoLocation);
        
        // Check if login should be blocked
        if (riskAssessment.blocked) {
          await logLoginAttempt(user.id, false, `Blocked: ${riskAssessment.reason}`, clientInfo, fingerprintData, geoLocation);
          
          logAuthError('LOGIN_BLOCKED', {
            userId: user.id,
            username: user.username,
            reason: riskAssessment.reason,
            riskScore: riskAssessment.riskScore,
            location: geoLocation?.locationString,
            ...clientInfo
          });

          return res.render('auth/login', {
            title: 'Login - DaySave',
            error: 'Login blocked due to security policy. Please contact support if this is an error.',
            user: null
          });
        }

        // Update user's device fingerprint if needed
        if (fingerprintData.fingerprint) {
          await User.update(
            { device_fingerprint: fingerprintData.fingerprint },
            { where: { id: user.id } }
          );
        }

        // Manage trusted devices
        await handleDeviceManagement(user.id, fingerprintData, clientInfo, riskAssessment, geoLocation);

      } catch (fingerprintError) {
        console.warn('⚠️ Device fingerprint processing failed:', fingerprintError);
        // Continue with login even if fingerprinting fails
      }
    }

    // Successful login
    await logLoginAttempt(user.id, true, 'Successful login', clientInfo, fingerprintData, geoLocation);
    
    logAuthEvent('LOGIN_SUCCESS', {
      userId: user.id,
      username: user.username,
      riskScore: riskAssessment?.riskScore || 0,
      deviceTrusted: riskAssessment?.deviceTrusted || false,
      location: geoLocation?.locationString,
      ...clientInfo
    });

    // Update user's last known location if significantly changed
    if (geoLocation && geoLocation.country) {
      await updateUserLocation(user.id, geoLocation);
    }

    req.login(user, (err) => {
      if (err) {
        return next(err);
      }
      
      // Add security information to session
      req.session.securityInfo = {
        loginTime: new Date(),
        deviceFingerprint: fingerprintData?.fingerprint,
        riskScore: riskAssessment?.riskScore || 0,
        deviceTrusted: riskAssessment?.deviceTrusted || false
      };
      
      return res.redirect('/dashboard');
    });

  } catch (err) {
    console.error('❌ Login error:', err);
    await logLoginAttempt(null, false, 'System error', clientInfo, deviceFingerprint, geoLocation);
    
    return res.render('auth/login', {
      title: 'Login - DaySave',
      error: 'An error occurred. Please try again.',
      user: null
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

/**
 * Helper Functions for Device Fingerprinting
 */

/**
 * Log login attempt with device fingerprint and geolocation information
 */
async function logLoginAttempt(userId, success, reason, clientInfo, fingerprintData, geoLocation) {
  try {
    const fingerprintHash = fingerprintData?.fingerprint || null;
    
    const loginAttemptData = {
      user_id: userId,
      ip_address: clientInfo.ip,
      user_agent: clientInfo.userAgent,
      device_fingerprint: fingerprintHash,
      success: success,
      failure_reason: success ? null : reason,
      attempted_at: new Date()
    };

    // Add geolocation data if available
    if (geoLocation) {
      loginAttemptData.country = geoLocation.country;
      loginAttemptData.region = geoLocation.region;
      loginAttemptData.city = geoLocation.city;
      loginAttemptData.latitude = geoLocation.latitude;
      loginAttemptData.longitude = geoLocation.longitude;
      loginAttemptData.timezone = geoLocation.timezone;
      loginAttemptData.isp = geoLocation.isp;
      loginAttemptData.is_vpn = geoLocation.isVPN || false;
    }

    await LoginAttempt.create(loginAttemptData);

    console.log(`🔐 Login attempt logged: ${success ? 'SUCCESS' : 'FAILED'} - ${reason || 'N/A'} from ${geoLocation?.locationString || clientInfo.ip}`);
  } catch (error) {
    console.error('❌ Error logging login attempt:', error);
  }
}

/**
 * Assess login risk based on device fingerprint, user history, and location
 */
async function assessLoginRisk(userId, fingerprintData, clientInfo, geoLocation) {
  try {
    const assessment = {
      riskScore: 0,
      blocked: false,
      reason: null,
      deviceTrusted: false,
      flags: []
    };

    if (!fingerprintData) {
      assessment.riskScore = 0.2; // Slight risk for missing fingerprint
      assessment.flags.push('NO_FINGERPRINT');
      return assessment;
    }

    // Check if device is already trusted
    const trustedDevice = await deviceFingerprinting.isDeviceTrusted(
      fingerprintData.fingerprint, 
      userId
    );
    
    if (trustedDevice) {
      assessment.deviceTrusted = true;
      assessment.riskScore = 0.1; // Low risk for trusted devices
      
      // Even trusted devices can be flagged for suspicious location changes
      if (geoLocation) {
        const locationRisk = await assessLocationRisk(userId, geoLocation);
        assessment.riskScore += locationRisk.score;
        assessment.flags.push(...locationRisk.flags);
      }
      
      return assessment;
    }

    // Use the risk assessment from device fingerprinting middleware
    if (fingerprintData.components) {
      // Recreate analysis similar to middleware
      const mockReq = {
        headers: { 'user-agent': clientInfo.userAgent },
        ip: clientInfo.ip
      };
      
      const riskScore = deviceFingerprinting.calculateRiskScore(fingerprintData, mockReq, geoLocation);
      assessment.riskScore = riskScore;

      // Determine if login should be blocked
      if (riskScore >= deviceFingerprinting.riskThresholds.critical) {
        assessment.blocked = true;
        assessment.reason = 'CRITICAL_RISK_SCORE';
      }

      // Generate flags
      if (deviceFingerprinting.detectBot(clientInfo.userAgent)) {
        assessment.flags.push('BOT_DETECTED');
        assessment.blocked = true;
        assessment.reason = 'BOT_DETECTED';
      }
    }

    // Location-based risk assessment
    if (geoLocation) {
      const locationRisk = await assessLocationRisk(userId, geoLocation);
      assessment.riskScore += locationRisk.score;
      assessment.flags.push(...locationRisk.flags);
      
      // Block if location is extremely suspicious
      if (locationRisk.blocked) {
        assessment.blocked = true;
        assessment.reason = locationRisk.reason;
      }
    }

    // Check for recent suspicious activity
    const recentFailures = await LoginAttempt.count({
      where: {
        ip_address: clientInfo.ip,
        success: false,
        attempted_at: {
          [Sequelize.Op.gte]: new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
        }
      }
    });

    if (recentFailures >= 5) {
      assessment.riskScore += 0.3;
      assessment.flags.push('MULTIPLE_FAILURES');
    }

    // Check for impossible travel (user logged in from very different location recently)
    const impossibleTravel = await checkImpossibleTravel(userId, geoLocation);
    if (impossibleTravel.detected) {
      assessment.riskScore += 0.4;
      assessment.flags.push('IMPOSSIBLE_TRAVEL');
      assessment.blocked = true;
      assessment.reason = 'IMPOSSIBLE_TRAVEL_DETECTED';
    }

    // Final blocking decision
    if (assessment.riskScore >= 0.8 && !assessment.blocked) {
      assessment.blocked = true;
      assessment.reason = 'HIGH_RISK_SCORE';
    }

    return assessment;

  } catch (error) {
    console.error('❌ Error assessing login risk:', error);
    return {
      riskScore: 0.5,
      blocked: false,
      reason: 'ASSESSMENT_ERROR',
      deviceTrusted: false,
      flags: ['ASSESSMENT_ERROR']
    };
  }
}

/**
 * Assess location-based risk for login attempt
 */
async function assessLocationRisk(userId, geoLocation) {
  try {
    const locationRisk = {
      score: 0,
      blocked: false,
      reason: null,
      flags: []
    };

    if (!geoLocation) {
      return locationRisk;
    }

    // VPN/Proxy detection
    if (geoLocation.isVPN) {
      locationRisk.score += 0.3;
      locationRisk.flags.push('VPN_PROXY_DETECTED');
    }

    // High-risk countries
    if (geoLocation.riskFactors && geoLocation.riskFactors.includes('HIGH_RISK_COUNTRY')) {
      locationRisk.score += 0.2;
      locationRisk.flags.push('HIGH_RISK_COUNTRY');
    }

    // Hosting providers (suspicious for regular users)
    if (geoLocation.riskFactors && geoLocation.riskFactors.includes('HOSTING_PROVIDER')) {
      locationRisk.score += 0.25;
      locationRisk.flags.push('HOSTING_PROVIDER');
    }

    // Low confidence location data
    if (geoLocation.confidence < 0.3) {
      locationRisk.score += 0.1;
      locationRisk.flags.push('LOW_LOCATION_CONFIDENCE');
    }

    // Get user's recent locations to check for anomalies
    const recentLogins = await LoginAttempt.findAll({
      where: {
        user_id: userId,
        success: true,
        country: { [Sequelize.Op.not]: null },
        attempted_at: {
          [Sequelize.Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      order: [['attempted_at', 'DESC']],
      limit: 10
    });

    if (recentLogins.length > 0) {
      const recentCountries = [...new Set(recentLogins.map(login => login.country))];
      
      // First time from this country
      if (!recentCountries.includes(geoLocation.country)) {
        locationRisk.score += 0.2;
        locationRisk.flags.push('NEW_COUNTRY');
      }

      // Check for multiple countries in short time (possible account compromise)
      const recentCountriesLast24h = [...new Set(recentLogins
        .filter(login => login.attempted_at > new Date(Date.now() - 24 * 60 * 60 * 1000))
        .map(login => login.country))];
      
      if (recentCountriesLast24h.length > 2) {
        locationRisk.score += 0.3;
        locationRisk.flags.push('MULTIPLE_COUNTRIES_24H');
      }
    }

    // Block if risk is extremely high
    if (locationRisk.score >= 0.7) {
      locationRisk.blocked = true;
      locationRisk.reason = 'EXTREMELY_SUSPICIOUS_LOCATION';
    }

    return locationRisk;

  } catch (error) {
    console.error('❌ Error assessing location risk:', error);
    return {
      score: 0.1,
      blocked: false,
      reason: 'LOCATION_ASSESSMENT_ERROR',
      flags: ['LOCATION_ASSESSMENT_ERROR']
    };
  }
}

/**
 * Check for impossible travel patterns
 */
async function checkImpossibleTravel(userId, currentLocation) {
  try {
    if (!currentLocation || !currentLocation.latitude || !currentLocation.longitude) {
      return { detected: false };
    }

    // Get the most recent successful login with location data
    const lastLogin = await LoginAttempt.findOne({
      where: {
        user_id: userId,
        success: true,
        latitude: { [Sequelize.Op.not]: null },
        longitude: { [Sequelize.Op.not]: null },
        attempted_at: {
          [Sequelize.Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      order: [['attempted_at', 'DESC']]
    });

    if (!lastLogin) {
      return { detected: false };
    }

    // Calculate distance between locations
    const distance = geoLocationService.calculateDistance(
      parseFloat(lastLogin.latitude),
      parseFloat(lastLogin.longitude),
      currentLocation.latitude,
      currentLocation.longitude
    );

    // Calculate time difference in hours
    const timeDiff = (Date.now() - new Date(lastLogin.attempted_at).getTime()) / (1000 * 60 * 60);

    // Calculate maximum possible speed (km/h)
    const maxPossibleSpeed = distance / timeDiff;

    // Consider impossible if speed > 900 km/h (faster than commercial aircraft)
    if (maxPossibleSpeed > 900) {
      return {
        detected: true,
        distance: distance,
        timeDiff: timeDiff,
        speed: maxPossibleSpeed,
        lastLocation: `${lastLogin.city || 'Unknown'}, ${lastLogin.country || 'Unknown'}`,
        currentLocation: currentLocation.locationString
      };
    }

    return { detected: false };

  } catch (error) {
    console.error('❌ Error checking impossible travel:', error);
    return { detected: false };
  }
}

/**
 * Handle device management (trust, tracking, etc.)
 */
async function handleDeviceManagement(userId, fingerprintData, clientInfo, riskAssessment, geoLocation) {
  try {
    if (!fingerprintData?.fingerprint) {
      return;
    }

    const deviceData = {
      user_id: userId,
      device_fingerprint: fingerprintData.fingerprint,
      is_trusted: riskAssessment.deviceTrusted || riskAssessment.riskScore < 0.3,
      last_login_at: new Date()
    };

    // Add geolocation data if available
    if (geoLocation) {
      deviceData.country = geoLocation.country;
      deviceData.region = geoLocation.region;
      deviceData.city = geoLocation.city;
      deviceData.latitude = geoLocation.latitude;
      deviceData.longitude = geoLocation.longitude;
      deviceData.timezone = geoLocation.timezone;
      deviceData.location_confidence = geoLocation.confidence;
    }

    // Update or create device record
    await UserDevice.upsert(deviceData);

    // Auto-trust device if risk is very low and no red flags
    if (riskAssessment.riskScore < 0.2 && riskAssessment.flags.length === 0) {
      await deviceFingerprinting.trustDevice(fingerprintData.fingerprint, userId);
      console.log('✅ Device auto-trusted due to low risk');
    }

    console.log('📱 Device management completed for user:', userId, 'from', geoLocation?.locationString || clientInfo.ip);

  } catch (error) {
    console.error('❌ Error in device management:', error);
  }
}

/**
 * Update user's last known location if significantly changed
 */
async function updateUserLocation(userId, geoLocation) {
  try {
    const user = await User.findByPk(userId);
    if (!user) return;

    const currentLocation = {
      country: geoLocation.country,
      city: geoLocation.city
    };

    const lastLocation = {
      country: user.last_login_country,
      city: user.last_login_city
    };

    // Check if location has significantly changed
    const locationComparison = geoLocationService.compareLocations(currentLocation, lastLocation);
    
    if (locationComparison.significantChange) {
      await User.update({
        last_login_country: geoLocation.country,
        last_login_city: geoLocation.city,
        location_changed_at: new Date()
      }, {
        where: { id: userId }
      });

      console.log(`🌍 User ${userId} location updated: ${geoLocation.locationString} (${locationComparison.reason})`);
      
      // Log significant location change for security monitoring
      logAuthEvent('LOCATION_CHANGE', {
        userId: userId,
        newLocation: geoLocation.locationString,
        previousLocation: `${lastLocation.city || 'Unknown'}, ${lastLocation.country || 'Unknown'}`,
        reason: locationComparison.reason,
        distance: locationComparison.distance
      });
    }

  } catch (error) {
    console.error('❌ Error updating user location:', error);
  }
}

module.exports = router; 