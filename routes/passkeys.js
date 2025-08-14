const express = require('express');
const passport = require('passport');
const router = express.Router();
const { logAuthEvent, logAuthError } = require('../config/logger');
const { User, UserPasskey } = require('../models');
const { isAuthenticated, authRateLimiter } = require('../middleware');

// Apply rate limiting to passkey routes
router.use(authRateLimiter);

// Passkey Registration Challenge - Generate challenge for registering new passkey
router.get('/register/begin', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const clientDetails = {
      ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      userId: user.id,
      username: user.username
    };

    logAuthEvent('PASSKEY_REGISTRATION_CHALLENGE_START', clientDetails);

    // Generate challenge using Passport strategy's built-in methods
    const crypto = require('crypto');
    const challenge = Buffer.from(crypto.randomBytes(32)).toString('base64url');
    
    // Store challenge in session
    req.session.challenge = challenge;
    req.session.challengeType = 'registration';
    req.session.challengeExpiry = Date.now() + 60000; // 1 minute

    // Create WebAuthn credential creation options
    const credentialCreationOptions = {
      challenge: challenge,
      rp: {
        name: process.env.WEBAUTHN_RP_NAME || 'DaySave',
        id: process.env.WEBAUTHN_RP_ID || 'localhost'
      },
      user: {
        id: Buffer.from(user.id).toString('base64url'),
        name: user.email,
        displayName: user.username
      },
      pubKeyCredParams: [
        {
          alg: -7, // ES256
          type: 'public-key'
        },
        {
          alg: -257, // RS256
          type: 'public-key'
        }
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Prefer platform authenticators (Face ID, Touch ID, Windows Hello)
        userVerification: 'preferred',
        residentKey: 'preferred'
      },
      timeout: 60000,
      attestation: 'none'
    };

    // Get existing passkeys to exclude them
    const existingPasskeys = await UserPasskey.getUserPasskeys(user.id, true);
    if (existingPasskeys.length > 0) {
      credentialCreationOptions.excludeCredentials = existingPasskeys.map(passkey => ({
        id: Buffer.from(passkey.credential_id, 'base64url'),
        type: 'public-key'
      }));
    }

    logAuthEvent('PASSKEY_REGISTRATION_CHALLENGE_SUCCESS', {
      ...clientDetails,
      challengeId: challenge.substr(0, 8) + '...'
    });

    res.json({
      success: true,
      options: credentialCreationOptions
    });

  } catch (error) {
    const clientDetails = {
      ip: req.ip || 'unknown',
      userId: req.user ? req.user.id : 'unknown'
    };
    
    logAuthError('PASSKEY_REGISTRATION_CHALLENGE_ERROR', error, clientDetails);
    res.status(500).json({
      success: false,
      error: 'Failed to generate registration challenge'
    });
  }
});

// Passkey Registration Verification - Complete passkey registration
router.post('/register/finish', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const { credential, deviceName } = req.body;
    
    const clientDetails = {
      ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      userId: user.id,
      username: user.username
    };

    logAuthEvent('PASSKEY_REGISTRATION_VERIFICATION_START', clientDetails);

    // Verify challenge and session
    if (!req.session.challenge || req.session.challengeType !== 'registration') {
      logAuthError('PASSKEY_REGISTRATION_NO_CHALLENGE', new Error('No valid challenge found'), clientDetails);
      return res.status(400).json({
        success: false,
        error: 'No valid challenge found. Please start registration again.'
      });
    }

    if (Date.now() > req.session.challengeExpiry) {
      logAuthError('PASSKEY_REGISTRATION_CHALLENGE_EXPIRED', new Error('Challenge expired'), clientDetails);
      return res.status(400).json({
        success: false,
        error: 'Challenge expired. Please start registration again.'
      });
    }

    // Prepare credential data for passport strategy
    // The strategy expects the credential data directly in the request body
    const originalBody = req.body;
    req.body = credential; // Set the credential as the body directly
    
    // Use passport authenticate for verification
    passport.authenticate('webauthn', { session: false }, async (err, authUser, info) => {
      if (err) {
        logAuthError('PASSKEY_REGISTRATION_VERIFICATION_ERROR', err, clientDetails);
        return res.status(500).json({
          success: false,
          error: 'Registration verification failed'
        });
      }

      if (!authUser) {
        logAuthError('PASSKEY_REGISTRATION_VERIFICATION_FAILED', new Error(info?.message || 'Verification failed'), clientDetails);
        return res.status(400).json({
          success: false,
          error: info?.message || 'Registration verification failed'
        });
      }

      // Update device name if provided
      if (deviceName) {
        try {
          const latestPasskey = await UserPasskey.findOne({
            where: { user_id: user.id },
            order: [['created_at', 'DESC']]
          });
          
          if (latestPasskey) {
            latestPasskey.device_name = deviceName.trim().substring(0, 100);
            await latestPasskey.save();
          }
        } catch (updateError) {
          // Log but don't fail the registration
          logAuthError('PASSKEY_DEVICE_NAME_UPDATE_ERROR', updateError, {
            ...clientDetails,
            deviceName: deviceName
          });
        }
      }

      // Restore original request body
      req.body = originalBody;
      
      // Clear challenge from session
      delete req.session.challenge;
      delete req.session.challengeType;
      delete req.session.challengeExpiry;

      logAuthEvent('PASSKEY_REGISTRATION_SUCCESS', {
        ...clientDetails,
        deviceName: deviceName || 'Auto-detected'
      });

      res.json({
        success: true,
        message: 'Passkey registered successfully'
      });
    })(req, res);

  } catch (error) {
    const clientDetails = {
      ip: req.ip || 'unknown',
      userId: req.user ? req.user.id : 'unknown'
    };
    
    logAuthError('PASSKEY_REGISTRATION_FINISH_ERROR', error, clientDetails);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
});

// Passkey Authentication Challenge - Generate challenge for login
router.get('/authenticate/begin', async (req, res) => {
  try {
    const clientDetails = {
      ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    };

    logAuthEvent('PASSKEY_AUTHENTICATION_CHALLENGE_START', clientDetails);

    // Generate challenge
    const crypto = require('crypto');
    const challenge = Buffer.from(crypto.randomBytes(32)).toString('base64url');
    
    // Store challenge in session
    req.session.challenge = challenge;
    req.session.challengeType = 'authentication';
    req.session.challengeExpiry = Date.now() + 60000; // 1 minute

    // Create WebAuthn assertion options
    const assertionOptions = {
      challenge: challenge,
      timeout: 60000,
      rpId: process.env.WEBAUTHN_RP_ID || 'localhost',
      userVerification: 'preferred'
    };

    logAuthEvent('PASSKEY_AUTHENTICATION_CHALLENGE_SUCCESS', {
      ...clientDetails,
      challengeId: challenge.substr(0, 8) + '...'
    });

    res.json({
      success: true,
      options: assertionOptions
    });

  } catch (error) {
    const clientDetails = {
      ip: req.ip || 'unknown'
    };
    
    logAuthError('PASSKEY_AUTHENTICATION_CHALLENGE_ERROR', error, clientDetails);
    res.status(500).json({
      success: false,
      error: 'Failed to generate authentication challenge'
    });
  }
});

// Passkey Authentication Verification - Complete passkey login
router.post('/authenticate/finish', async (req, res) => {
  console.log('🚀 /authenticate/finish route reached!');
  
  // Debug request information
  console.log('🔍 Passkey Authentication Debug:', {
    headers: {
      origin: req.headers.origin,
      host: req.headers.host,
      referer: req.headers.referer,
      'x-forwarded-proto': req.headers['x-forwarded-proto'],
      'x-forwarded-host': req.headers['x-forwarded-host']
    },
    url: req.url,
    protocol: req.protocol,
    secure: req.secure,
    originalUrl: req.originalUrl
  });

  // Ensure the origin header is properly set for WebAuthn validation
  if (!req.headers.origin && req.headers.referer) {
    const refererUrl = new URL(req.headers.referer);
    req.headers.origin = refererUrl.origin;
    console.log('🔧 Set origin from referer:', req.headers.origin);
  }

  // Force the origin to match our WebAuthn configuration for debugging
  if (req.headers.origin !== 'https://localhost') {
    console.log('⚠️ Origin mismatch detected, forcing to https://localhost. Original:', req.headers.origin);
    req.headers.origin = 'https://localhost';
  }

  try {
    const { credential } = req.body;
    
    const clientDetails = {
      ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    };

    logAuthEvent('PASSKEY_AUTHENTICATION_VERIFICATION_START', clientDetails);

    // Verify challenge and session
    if (!req.session.challenge || req.session.challengeType !== 'authentication') {
      logAuthError('PASSKEY_AUTHENTICATION_NO_CHALLENGE', new Error('No valid challenge found'), clientDetails);
      return res.status(400).json({
        success: false,
        error: 'No valid challenge found. Please start authentication again.'
      });
    }

    if (Date.now() > req.session.challengeExpiry) {
      logAuthError('PASSKEY_AUTHENTICATION_CHALLENGE_EXPIRED', new Error('Challenge expired'), clientDetails);
      return res.status(400).json({
        success: false,
        error: 'Challenge expired. Please start authentication again.'
      });
    }

    // Prepare credential data for passport strategy
    // The strategy expects the credential data directly in the request body
    const originalBody = req.body;
    req.body = credential; // Set the credential as the body directly
    
    // Use passport authenticate for verification
    passport.authenticate('webauthn', (err, user, info) => {
      // Restore original request body
      req.body = originalBody;
      
      if (err) {
        logAuthError('PASSKEY_AUTHENTICATION_VERIFICATION_ERROR', err, clientDetails);
        return res.status(500).json({
          success: false,
          error: 'Authentication verification failed'
        });
      }

      if (!user) {
        logAuthError('PASSKEY_AUTHENTICATION_VERIFICATION_FAILED', new Error(info?.message || 'Verification failed'), clientDetails);
        return res.status(400).json({
          success: false,
          error: info?.message || 'Authentication verification failed'
        });
      }

      // Log the user in
      req.login(user, (loginErr) => {
        if (loginErr) {
          logAuthError('PASSKEY_LOGIN_ERROR', loginErr, {
            ...clientDetails,
            userId: user.id
          });
          return res.status(500).json({
            success: false,
            error: 'Login failed after authentication'
          });
        }

        // Clear challenge from session
        delete req.session.challenge;
        delete req.session.challengeType;
        delete req.session.challengeExpiry;

        logAuthEvent('PASSKEY_AUTHENTICATION_SUCCESS', {
          ...clientDetails,
          userId: user.id,
          username: user.username
        });

        res.json({
          success: true,
          message: 'Authentication successful',
          redirectUrl: '/dashboard'
        });
      });
    })(req, res);

  } catch (error) {
    const clientDetails = {
      ip: req.ip || 'unknown'
    };
    
    logAuthError('PASSKEY_AUTHENTICATION_FINISH_ERROR', error, clientDetails);
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
});

// Get User's Passkeys - List all passkeys for the authenticated user
router.get('/list', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const clientDetails = {
      ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
      userId: user.id,
      username: user.username
    };

    logAuthEvent('PASSKEY_LIST_REQUEST', clientDetails);

    const passkeys = await UserPasskey.getUserPasskeys(user.id, false); // Include inactive passkeys

    const passkeyData = passkeys.map(passkey => ({
      id: passkey.id,
      device_name: passkey.getDeviceDisplayName(),
      device_type: passkey.device_type,
      device_icon: passkey.getDeviceIcon(),
      last_used_at: passkey.last_used_at,
      created_at: passkey.created_at,
      is_active: passkey.is_active,
      browser_info: passkey.browser_info
    }));

    res.json({
      success: true,
      passkeys: passkeyData,
      count: passkeyData.length
    });

  } catch (error) {
    const clientDetails = {
      ip: req.ip || 'unknown',
      userId: req.user ? req.user.id : 'unknown'
    };
    
    logAuthError('PASSKEY_LIST_ERROR', error, clientDetails);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve passkeys'
    });
  }
});

// Update Passkey - Rename or toggle active status
router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const passkeyId = req.params.id;
    const { device_name, is_active } = req.body;
    
    const clientDetails = {
      ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
      userId: user.id,
      username: user.username,
      passkeyId: passkeyId
    };

    logAuthEvent('PASSKEY_UPDATE_REQUEST', clientDetails);

    // Find the passkey
    const passkey = await UserPasskey.findOne({
      where: { 
        id: passkeyId,
        user_id: user.id 
      }
    });

    if (!passkey) {
      logAuthError('PASSKEY_UPDATE_NOT_FOUND', new Error('Passkey not found'), clientDetails);
      return res.status(404).json({
        success: false,
        error: 'Passkey not found'
      });
    }

    // Update fields
    if (device_name !== undefined) {
      passkey.device_name = device_name.trim().substring(0, 100);
    }
    
    if (is_active !== undefined) {
      passkey.is_active = Boolean(is_active);
    }

    await passkey.save();

    logAuthEvent('PASSKEY_UPDATE_SUCCESS', {
      ...clientDetails,
      changes: { device_name, is_active }
    });

    res.json({
      success: true,
      message: 'Passkey updated successfully',
      passkey: {
        id: passkey.id,
        device_name: passkey.getDeviceDisplayName(),
        device_type: passkey.device_type,
        device_icon: passkey.getDeviceIcon(),
        last_used_at: passkey.last_used_at,
        created_at: passkey.created_at,
        is_active: passkey.is_active
      }
    });

  } catch (error) {
    const clientDetails = {
      ip: req.ip || 'unknown',
      userId: req.user ? req.user.id : 'unknown',
      passkeyId: req.params.id
    };
    
    logAuthError('PASSKEY_UPDATE_ERROR', error, clientDetails);
    res.status(500).json({
      success: false,
      error: 'Failed to update passkey'
    });
  }
});

// Delete Passkey - Remove a passkey from user's account
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const passkeyId = req.params.id;
    
    const clientDetails = {
      ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
      userId: user.id,
      username: user.username,
      passkeyId: passkeyId
    };

    logAuthEvent('PASSKEY_DELETE_REQUEST', clientDetails);

    // Find the passkey
    const passkey = await UserPasskey.findOne({
      where: { 
        id: passkeyId,
        user_id: user.id 
      }
    });

    if (!passkey) {
      logAuthError('PASSKEY_DELETE_NOT_FOUND', new Error('Passkey not found'), clientDetails);
      return res.status(404).json({
        success: false,
        error: 'Passkey not found'
      });
    }

    // Check if this is the last passkey and user has no password
    const passkeyCount = await UserPasskey.countUserPasskeys(user.id, true);
    const hasPassword = user.password_hash && user.password_hash !== 'oauth_user';
    
    if (passkeyCount === 1 && !hasPassword) {
      logAuthError('PASSKEY_DELETE_LAST_AUTH_METHOD', new Error('Cannot delete last authentication method'), clientDetails);
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your last authentication method. Please set a password or add another passkey first.'
      });
    }

    await passkey.destroy();

    logAuthEvent('PASSKEY_DELETE_SUCCESS', clientDetails);

    res.json({
      success: true,
      message: 'Passkey deleted successfully'
    });

  } catch (error) {
    const clientDetails = {
      ip: req.ip || 'unknown',
      userId: req.user ? req.user.id : 'unknown',
      passkeyId: req.params.id
    };
    
    logAuthError('PASSKEY_DELETE_ERROR', error, clientDetails);
    res.status(500).json({
      success: false,
      error: 'Failed to delete passkey'
    });
  }
});

module.exports = router; 