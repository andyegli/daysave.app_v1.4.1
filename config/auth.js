const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const AppleStrategy = require('passport-apple').Strategy;
const WebAuthnStrategy = require('passport-fido2-webauthn');
const { User, SocialAccount, Role, UserPasskey } = require('../models');
const { logOAuthFlow, logOAuthError, logAuthEvent, logAuthError } = require('./logger');

// OAuth Configuration
const oauthConfig = {
  google: {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || `${process.env.BASE_URL || 'http://localhost:3000'}/auth/google/callback`
  },
  microsoft: {
    clientID: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    callbackURL: process.env.MICROSOFT_CALLBACK_URL || `${process.env.BASE_URL || 'http://localhost:3000'}/auth/microsoft/callback`
  },
  apple: {
    clientID: process.env.APPLE_CLIENT_ID,
    teamID: process.env.APPLE_TEAM_ID,
    keyID: process.env.APPLE_KEY_ID,
    privateKeyLocation: process.env.APPLE_PRIVATE_KEY_PATH,
    callbackURL: process.env.APPLE_CALLBACK_URL || `${process.env.BASE_URL || 'http://localhost:3000'}/auth/apple/callback`
  }
};

// WebAuthn Configuration - Dynamic origin handling for localhost and production
const getWebAuthnOrigin = () => {
  console.log('🔍 DEBUG: WEBAUTHN_ORIGIN env var:', process.env.WEBAUTHN_ORIGIN);
  console.log('🔍 DEBUG: BASE_URL env var:', process.env.BASE_URL);
  console.log('🔍 DEBUG: ALLOWED_ORIGINS env var:', process.env.ALLOWED_ORIGINS);
  
  if (process.env.WEBAUTHN_ORIGIN) {
    console.log('🔍 Using env WEBAUTHN_ORIGIN:', process.env.WEBAUTHN_ORIGIN);
    return process.env.WEBAUTHN_ORIGIN;
  }
  
  // Build origins array from ALLOWED_ORIGINS and localhost defaults
  const origins = [];
  
  // Add localhost development origins
  const appPort = process.env.APP_PORT || 3000;
  origins.push(
    `http://localhost:${appPort}`,
    `https://localhost`,
    `https://localhost:443`,
    `http://localhost:3000`
  );
  
  // Add origins from ALLOWED_ORIGINS environment variable
  if (process.env.ALLOWED_ORIGINS) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',')
      .map(origin => origin.trim())
      .filter(origin => origin.length > 0);
    
    origins.push(...allowedOrigins);
    console.log('🔍 Added origins from ALLOWED_ORIGINS:', allowedOrigins);
  }
  
  // Remove duplicates
  const uniqueOrigins = [...new Set(origins)];
  
  console.log('🔍 Using dynamic origins array:', uniqueOrigins);
  return uniqueOrigins;
};

const webauthnConfig = {
  rpID: process.env.WEBAUTHN_RP_ID || 'localhost',
  rpName: process.env.WEBAUTHN_RP_NAME || 'DaySave',
  origin: getWebAuthnOrigin(),
  timeout: 60000,
  challengeTimeout: 60000
};

// Debug WebAuthn configuration
console.log('🔐 WebAuthn Configuration:', {
  rpID: webauthnConfig.rpID,
  rpName: webauthnConfig.rpName,
  origin: webauthnConfig.origin,
  env_origin: process.env.WEBAUTHN_ORIGIN,
  env_base_url: process.env.BASE_URL
});

// Helper function to get the default role
const getDefaultRole = async () => {
  try {
    const role = await Role.findOne({ where: { name: 'user' } });
    if (!role) {
      logAuthError('DEFAULT_ROLE_NOT_FOUND', new Error('Default role "user" not found in database.'), {});
      return null;
    }
    return role;
  } catch (error) {
    logAuthError('GET_DEFAULT_ROLE_ERROR', error, {});
    throw error; // Rethrow to be caught by the strategy's catch block
  }
};

// Helper function to detect device type from user agent
const detectDeviceType = (userAgent) => {
  if (!userAgent) return 'unknown';
  
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return 'phone';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'tablet';
  } else if (ua.includes('macintosh') || ua.includes('mac os')) {
    return 'laptop';
  } else if (ua.includes('windows') || ua.includes('linux')) {
    return 'desktop';
  }
  return 'unknown';
};

// Helper function to generate device name
const generateDeviceName = (userAgent, deviceType) => {
  if (!userAgent) return `${deviceType.charAt(0).toUpperCase() + deviceType.slice(1)} Device`;
  
  const ua = userAgent.toLowerCase();
  if (ua.includes('chrome')) return `Chrome on ${deviceType}`;
  if (ua.includes('firefox')) return `Firefox on ${deviceType}`;
  if (ua.includes('safari') && !ua.includes('chrome')) return `Safari on ${deviceType}`;
  if (ua.includes('edge')) return `Edge on ${deviceType}`;
  
  return `${deviceType.charAt(0).toUpperCase() + deviceType.slice(1)} Device`;
};

// Passport serialization
passport.serializeUser((user, done) => {
  try {
    logAuthEvent('USER_SERIALIZE', { userId: user.id, username: user.username });
    done(null, user.id);
  } catch (error) {
    logAuthError('USER_SERIALIZE', error, { userId: user.id });
    done(error, null);
  }
});

passport.deserializeUser(async (id, done) => {
  try {
    // Force include Role relationship every time
    const user = await User.findByPk(id, { 
      include: [{ 
        model: Role, 
        required: false  // Use LEFT JOIN to avoid issues if role is missing
      }] 
    });
    
    if (user) {
      // Ensure role is properly attached if it exists but wasn't loaded
      if (!user.Role && user.role_id) {
        try {
          const role = await Role.findByPk(user.role_id);
          if (role) {
            user.Role = role;
            user.dataValues.Role = role; // Ensure it's in dataValues too
          }
        } catch (roleError) {
          logAuthError('USER_ROLE_LOAD_FALLBACK', roleError, { userId: id, roleId: user.role_id });
        }
      }
    } else {
      logAuthEvent('USER_DESERIALIZE_NOT_FOUND', { userId: id });
    }
    done(null, user);
  } catch (error) {
    logAuthError('USER_DESERIALIZE', error, { userId: id });
    done(error, null);
  }
});

// WebAuthn Strategy
passport.use(new WebAuthnStrategy(
  {
    ...webauthnConfig,

    store: {
      challenge: (req, challenge) => {
        req.session.challenge = challenge;
      },
      getChallenge: (req) => {
        return req.session.challenge;
      },
      getUser: (req) => {
        // Return the authenticated user for passkey registration
        console.log('WebAuthn getUser called:', { 
          hasUser: !!req.user, 
          userId: req.user?.id, 
          username: req.user?.username 
        });
        return req.user;
      },
      verify: async (req, challenge, callback) => {
        // This function is called during registration to verify the challenge
        try {
          // Get the challenge from session
          const sessionChallenge = req.session.challenge;
          
          if (!sessionChallenge) {
            console.log('WebAuthn store verify: No session challenge found');
            return callback(new Error('No session challenge found'));
          }
          
          // Compare challenges
          const sessionChallengeBuffer = Buffer.from(sessionChallenge, 'base64url');
          if (!challenge.equals(sessionChallengeBuffer)) {
            console.log('WebAuthn store verify: Challenge mismatch');
            return callback(new Error('Challenge mismatch'));
          }
          
          // Return success with user context for registration
          const user = req.user;
          return callback(null, true, { user: user });
        } catch (error) {
          return callback(error);
        }
      }
    }
  },
  // Verify function for authentication (login)
  async (id, userHandle, cb) => {
    try {
      // The id parameter should already be a string credential ID
      const requestDetails = {
        credentialId: id, // Use directly without conversion
        userHandle: userHandle ? Buffer.from(userHandle).toString('base64url') : null
      };

      logAuthEvent('WEBAUTHN_AUTHENTICATION_START', requestDetails);

      // Find passkey by credential ID
      const passkey = await UserPasskey.findByCredentialId(requestDetails.credentialId);
      
      if (!passkey) {
        logAuthError('WEBAUTHN_PASSKEY_NOT_FOUND', new Error('Passkey not found'), requestDetails);
        return cb(null, false, { message: 'Passkey not found' });
      }

      if (!passkey.is_active) {
        logAuthError('WEBAUTHN_PASSKEY_INACTIVE', new Error('Passkey is inactive'), {
          ...requestDetails,
          passkeyId: passkey.id,
          userId: passkey.user_id
        });
        return cb(null, false, { message: 'Passkey is inactive' });
      }

      // Update last used timestamp
      await passkey.updateLastUsed();

      // Get the user
      const user = passkey.user;
      if (!user) {
        logAuthError('WEBAUTHN_USER_NOT_FOUND', new Error('User not found for passkey'), {
          ...requestDetails,
          passkeyId: passkey.id,
          userId: passkey.user_id
        });
        return cb(null, false, { message: 'User not found' });
      }

      // Return user and public key for verification
      const publicKey = passkey.credential_public_key;
      
      logAuthEvent('WEBAUTHN_AUTHENTICATION_SUCCESS', {
        ...requestDetails,
        userId: user.id,
        username: user.username,
        passkeyId: passkey.id,
        deviceType: passkey.device_type
      });

      return cb(null, user, publicKey);
    } catch (error) {
      logAuthError('WEBAUTHN_AUTHENTICATION_ERROR', error, {
        credentialId: id || 'unknown'
      });
      return cb(error);
    }
  },
  // Register function for adding new passkeys - 6 parameter version
  async (user, credentialId, publicKey, flags, signCount, cb) => {
    try {
      const requestDetails = {
        userId: user ? user.id : 'unknown',
        credentialId: credentialId
      };

      logAuthEvent('WEBAUTHN_REGISTRATION_START', requestDetails);

      if (!user) {
        logAuthError('WEBAUTHN_NO_USER_PROVIDED', new Error('No user provided for passkey registration'), requestDetails);
        return cb(null, false, { message: 'User authentication required for passkey registration' });
      }

      // Check if credential already exists
      const existingPasskey = await UserPasskey.findByCredentialId(credentialId);
      if (existingPasskey) {
        logAuthError('WEBAUTHN_CREDENTIAL_EXISTS', new Error('Credential already exists'), requestDetails);
        return cb(null, false, { message: 'This passkey is already registered' });
      }

      // Detect device information from user agent (if available in request)
      const deviceType = 'security_key'; // Default to security key type
      const deviceName = `Passkey Device ${Date.now()}`;

      // Create new passkey
      const newPasskey = await UserPasskey.create({
        user_id: user.id,
        credential_id: credentialId,
        credential_public_key: publicKey, // This is already a PEM string from the library
        credential_counter: signCount,
        device_name: deviceName,
        device_type: deviceType,
        browser_info: {
          flags: flags,
          signCount: signCount,
          timestamp: new Date().toISOString()
        }
      });

      logAuthEvent('WEBAUTHN_REGISTRATION_SUCCESS', {
        ...requestDetails,
        passkeyId: newPasskey.id,
        deviceType: deviceType,
        deviceName: deviceName,
        signCount: signCount
      });

      return cb(null, user);
    } catch (error) {
      logAuthError('WEBAUTHN_REGISTRATION_ERROR', error, {
        userId: user ? user.id : 'unknown',
        credentialId: credentialId || 'unknown'
      });
      return cb(error);
    }
  }
));

// Google OAuth Strategy
passport.use(new GoogleStrategy(oauthConfig.google, async (accessToken, refreshToken, profile, done) => {
  const requestDetails = {
    provider: 'google',
    providerUserId: profile.id,
    email: profile.emails?.[0]?.value,
    displayName: profile.displayName
  };

  try {
    logOAuthFlow('google', 'CALLBACK_START', requestDetails);

    // Check if user exists
    let user = await User.findOne({ where: { email: profile.emails[0].value } });
    if (user) {
      // Check if provider is already linked
      const existingSocial = await SocialAccount.findOne({ where: { user_id: user.id, platform: 'google' } });
      if (!existingSocial) {
        // Store profile in session and signal to link
        return done(null, false, {
          linkAccount: true,
          linkProfile: {
            email: profile.emails[0].value,
            provider: 'google',
            providerUserId: profile.id,
            accessToken,
            refreshToken,
            profileData: profile._json
          }
        });
      }
      logOAuthFlow('google', 'USER_FOUND', {
        ...requestDetails,
        userId: user.id,
        username: user.username
      });
    } else {
      logOAuthFlow('google', 'USER_CREATION_START', requestDetails);
      
      // Determine if this is the first user
      const userCount = await User.count();
      let assignedRole;
      if (userCount === 0) {
        assignedRole = await Role.findOne({ where: { name: 'admin' } });
      } else {
        assignedRole = await Role.findOne({ where: { name: 'user' } });
      }
      
      // Create new user
      user = await User.create({
        username: `google_${profile.id}`,
        email: profile.emails[0].value,
        password_hash: 'oauth_user', // Placeholder for OAuth users
        subscription_status: 'trial',
        language: 'en',
        role_id: assignedRole.id,
        first_name: profile.name?.givenName || null,
        last_name: profile.name?.familyName || null
      });

      logOAuthFlow('google', 'USER_CREATION_SUCCESS', {
        ...requestDetails,
        userId: user.id,
        username: user.username
      });
    }

    // Update or create social account record
    logOAuthFlow('google', 'SOCIAL_ACCOUNT_UPDATE_START', {
      ...requestDetails,
      userId: user.id
    });

    // Use findOrCreate with proper where clause to prevent duplicates
    const [socialAccount, created] = await SocialAccount.findOrCreate({
      where: {
        user_id: user.id,
        platform: 'google',
        provider_user_id: profile.id
      },
      defaults: {
        handle: profile.emails[0].value,
        provider: 'google',
        provider_user_id: profile.id,
        access_token: accessToken,
        refresh_token: refreshToken,
        profile_data: JSON.stringify(profile._json),
        auth_type: 'oauth',
        status: 'active'
      }
    });

    // If account exists, update the tokens and profile data
    if (!created) {
      await socialAccount.update({
        access_token: accessToken,
        refresh_token: refreshToken,
        profile_data: JSON.stringify(profile._json),
        handle: profile.emails[0].value,
        last_used_at: new Date(),
        status: 'active'
      });
    }

    logOAuthFlow('google', 'SOCIAL_ACCOUNT_UPDATE_SUCCESS', {
      ...requestDetails,
      userId: user.id
    });

    logOAuthFlow('google', 'CALLBACK_SUCCESS', {
      ...requestDetails,
      userId: user.id,
      username: user.username
    });

    return done(null, user);
  } catch (error) {
    logOAuthError('google', 'CALLBACK_ERROR', error, requestDetails);
    return done(error, null);
  }
}));

// Microsoft OAuth Strategy - only initialize if clientID is provided
if (oauthConfig.microsoft.clientID) {
  passport.use(new MicrosoftStrategy({
    ...oauthConfig.microsoft,
    scope: ['openid', 'profile', 'email', 'User.Read']
  }, async (accessToken, refreshToken, profile, done) => {
  const requestDetails = {
    provider: 'microsoft',
    providerUserId: profile.id,
    email: profile.emails?.[0]?.value,
    displayName: profile.displayName
  };

  try {
    logOAuthFlow('microsoft', 'CALLBACK_START', requestDetails);

    // Check if user exists
    let user = await User.findOne({
      where: { email: profile.emails[0].value }
    });

    if (!user) {
      logOAuthFlow('microsoft', 'USER_CREATION_START', requestDetails);
      
      // Determine if this is the first user
      const userCount = await User.count();
      let assignedRole;
      if (userCount === 0) {
        assignedRole = await Role.findOne({ where: { name: 'admin' } });
      } else {
        assignedRole = await Role.findOne({ where: { name: 'user' } });
      }
      
      // Create new user
      user = await User.create({
        username: `microsoft_${profile.id}`,
        email: profile.emails[0].value,
        password_hash: 'oauth_user', // Placeholder for OAuth users
        subscription_status: 'trial',
        language: 'en',
        role_id: assignedRole.id
      });

      logOAuthFlow('microsoft', 'USER_CREATION_SUCCESS', {
        ...requestDetails,
        userId: user.id,
        username: user.username
      });
    } else {
      logOAuthFlow('microsoft', 'USER_FOUND', {
        ...requestDetails,
        userId: user.id,
        username: user.username
      });
    }

    // Update or create social account record
    logOAuthFlow('microsoft', 'SOCIAL_ACCOUNT_UPDATE_START', {
      ...requestDetails,
      userId: user.id
    });

    // Use findOrCreate with proper where clause to prevent duplicates
    const [socialAccount, created] = await SocialAccount.findOrCreate({
      where: {
        user_id: user.id,
        platform: 'microsoft',
        provider_user_id: profile.id
      },
      defaults: {
        handle: profile.emails[0].value,
        provider: 'microsoft',
        provider_user_id: profile.id,
        access_token: accessToken,
        refresh_token: refreshToken,
        profile_data: JSON.stringify(profile._json || profile),
        auth_type: 'oauth',
        status: 'active'
      }
    });

    // If account exists, update the tokens and profile data
    if (!created) {
      await socialAccount.update({
        access_token: accessToken,
        refresh_token: refreshToken,
        profile_data: JSON.stringify(profile._json || profile),
        handle: profile.emails[0].value,
        last_used_at: new Date(),
        status: 'active'
      });
    }

    logOAuthFlow('microsoft', 'SOCIAL_ACCOUNT_UPDATE_SUCCESS', {
      ...requestDetails,
      userId: user.id
    });

    logOAuthFlow('microsoft', 'CALLBACK_SUCCESS', {
      ...requestDetails,
      userId: user.id,
      username: user.username
    });

    return done(null, user);
  } catch (error) {
    logOAuthError('microsoft', 'CALLBACK_ERROR', error, requestDetails);
    return done(error, null);
  }
}));
}

// Apple OAuth Strategy - only initialize if clientID is provided
if (oauthConfig.apple.clientID) {
  passport.use(new AppleStrategy(oauthConfig.apple, async (accessToken, refreshToken, idToken, profile, done) => {
  // Apple doesn't always provide email, so we need to handle this
  const email = profile.email || `apple_${profile.id}@privaterelay.appleid.com`;
  
  const requestDetails = {
    provider: 'apple',
    providerUserId: profile.id,
    email: email,
    displayName: profile.name?.firstName || 'Apple User'
  };

  try {
    logOAuthFlow('apple', 'CALLBACK_START', requestDetails);
    
    // Check if user exists
    let user = await User.findOne({
      where: { email: email }
    });

    if (!user) {
      logOAuthFlow('apple', 'USER_CREATION_START', requestDetails);
      
      // Determine if this is the first user
      const userCount = await User.count();
      let assignedRole;
      if (userCount === 0) {
        assignedRole = await Role.findOne({ where: { name: 'admin' } });
      } else {
        assignedRole = await Role.findOne({ where: { name: 'user' } });
      }
      
      // Create new user
      user = await User.create({
        username: `apple_${profile.id}`,
        email: email,
        password_hash: 'oauth_user', // Placeholder for OAuth users
        subscription_status: 'trial',
        language: 'en',
        role_id: assignedRole.id
      });

      logOAuthFlow('apple', 'USER_CREATION_SUCCESS', {
        ...requestDetails,
        userId: user.id,
        username: user.username
      });
    } else {
      logOAuthFlow('apple', 'USER_FOUND', {
        ...requestDetails,
        userId: user.id,
        username: user.username
      });
    }

    // Update or create social account record
    logOAuthFlow('apple', 'SOCIAL_ACCOUNT_UPDATE_START', {
      ...requestDetails,
      userId: user.id
    });

    // Use findOrCreate with proper where clause to prevent duplicates
    const [socialAccount, created] = await SocialAccount.findOrCreate({
      where: {
        user_id: user.id,
        platform: 'apple',
        provider_user_id: profile.id
      },
      defaults: {
        handle: email,
        provider: 'apple',
        provider_user_id: profile.id,
        access_token: accessToken,
        refresh_token: refreshToken,
        profile_data: JSON.stringify(profile),
        auth_type: 'oauth',
        status: 'active'
      }
    });

    // If account exists, update the tokens and profile data
    if (!created) {
      await socialAccount.update({
        access_token: accessToken,
        refresh_token: refreshToken,
        profile_data: JSON.stringify(profile),
        handle: email,
        last_used_at: new Date(),
        status: 'active'
      });
    }

    logOAuthFlow('apple', 'SOCIAL_ACCOUNT_UPDATE_SUCCESS', {
      ...requestDetails,
      userId: user.id
    });

    logOAuthFlow('apple', 'CALLBACK_SUCCESS', {
      ...requestDetails,
      userId: user.id,
      username: user.username
    });

    return done(null, user);
  } catch (error) {
    logOAuthError('apple', 'CALLBACK_ERROR', error, requestDetails);
    return done(error, null);
  }
}));
}

module.exports = {
  passport,
  oauthConfig
}; 