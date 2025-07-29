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
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback'
  },
  microsoft: {
    clientID: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    callbackURL: process.env.MICROSOFT_CALLBACK_URL || '/auth/microsoft/callback'
  },
  apple: {
    clientID: process.env.APPLE_CLIENT_ID,
    teamID: process.env.APPLE_TEAM_ID,
    keyID: process.env.APPLE_KEY_ID,
    privateKeyLocation: process.env.APPLE_PRIVATE_KEY_PATH,
    callbackURL: process.env.APPLE_CALLBACK_URL || '/auth/apple/callback'
  }
};

// WebAuthn Configuration
const webauthnConfig = {
  rpID: process.env.WEBAUTHN_RP_ID || 'localhost',
  rpName: process.env.WEBAUTHN_RP_NAME || 'DaySave',
  origin: process.env.WEBAUTHN_ORIGIN || `http://localhost:${process.env.APP_PORT || 3000}`,
  timeout: 60000,
  challengeTimeout: 60000
};

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
      
      // Log successful deserialization with role info (only when enabled)
      const { logging } = require('./config');
      if (logging.enableAuthEventLogging) {
        logAuthEvent('USER_DESERIALIZE_SUCCESS', { 
          userId: id, 
          username: user.username,
          hasRole: !!user.Role,
          roleName: user.Role ? user.Role.name : 'none'
        });
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
      verify: async (req, id, publicKey, counter) => {
        // This function is called during registration to verify the credential
        // Return true to accept the credential, false to reject
        try {
          // Convert credential ID to base64url for checking
          const credentialIdBase64 = Buffer.from(id).toString('base64url');
          
          // Basic validation - check if credential ID already exists
          const existingPasskey = await UserPasskey.findByCredentialId(credentialIdBase64);
          
          if (existingPasskey) {
            // Credential already exists - reject
            console.log('WebAuthn verify: Credential already exists, rejecting');
            return false;
          }
          
          // Additional validation can be added here
          // For now, accept all new credentials
          console.log('WebAuthn verify: New credential accepted');
          return true;
        } catch (error) {
          console.error('WebAuthn store verify error:', error);
          return false;
        }
      }
    }
  },
  async (id, userHandle, req, done) => {
    try {
      const requestDetails = {
        credentialId: Buffer.from(id).toString('base64url'),
        userHandle: userHandle ? Buffer.from(userHandle).toString('base64url') : null,
        ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown'
      };

      logAuthEvent('WEBAUTHN_AUTHENTICATION_START', requestDetails);

      // Find passkey by credential ID
      const passkey = await UserPasskey.findByCredentialId(requestDetails.credentialId);
      
      if (!passkey) {
        logAuthError('WEBAUTHN_PASSKEY_NOT_FOUND', new Error('Passkey not found'), requestDetails);
        return done(null, false, { message: 'Passkey not found' });
      }

      if (!passkey.is_active) {
        logAuthError('WEBAUTHN_PASSKEY_INACTIVE', new Error('Passkey is inactive'), {
          ...requestDetails,
          passkeyId: passkey.id,
          userId: passkey.user_id
        });
        return done(null, false, { message: 'Passkey is inactive' });
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
        return done(null, false, { message: 'User not found' });
      }

      logAuthEvent('WEBAUTHN_AUTHENTICATION_SUCCESS', {
        ...requestDetails,
        userId: user.id,
        username: user.username,
        passkeyId: passkey.id,
        deviceType: passkey.device_type
      });

      return done(null, user);
    } catch (error) {
      logAuthError('WEBAUTHN_AUTHENTICATION_ERROR', error, {
        credentialId: id ? Buffer.from(id).toString('base64url') : 'unknown',
        ip: req.ip || 'unknown'
      });
      return done(error);
    }
  },
  async (user, id, publicKey, counter, req, done) => {
    try {
      const requestDetails = {
        userId: user ? user.id : 'new_user',
        credentialId: Buffer.from(id).toString('base64url'),
        counter: counter,
        ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown'
      };

      logAuthEvent('WEBAUTHN_REGISTRATION_START', requestDetails);

      // If user is provided, this is adding a passkey to existing account
      if (user) {
        // Check if credential already exists
        const existingPasskey = await UserPasskey.findByCredentialId(requestDetails.credentialId);
        if (existingPasskey) {
          logAuthError('WEBAUTHN_CREDENTIAL_EXISTS', new Error('Credential already exists'), requestDetails);
          return done(null, false, { message: 'This passkey is already registered' });
        }

        // Detect device information
        const deviceType = detectDeviceType(requestDetails.userAgent);
        const deviceName = generateDeviceName(requestDetails.userAgent, deviceType);

        // Create new passkey
        const newPasskey = await UserPasskey.create({
          user_id: user.id,
          credential_id: requestDetails.credentialId,
          credential_public_key: Buffer.from(publicKey).toString('base64url'),
          credential_counter: counter,
          device_name: deviceName,
          device_type: deviceType,
          browser_info: {
            userAgent: requestDetails.userAgent,
            ip: requestDetails.ip,
            timestamp: new Date().toISOString()
          }
        });

        logAuthEvent('WEBAUTHN_REGISTRATION_SUCCESS', {
          ...requestDetails,
          passkeyId: newPasskey.id,
          deviceType: deviceType,
          deviceName: deviceName
        });

        return done(null, user);
      }

      // This shouldn't happen in our flow (we always require existing user for registration)
      logAuthError('WEBAUTHN_NO_USER_PROVIDED', new Error('No user provided for passkey registration'), requestDetails);
      return done(null, false, { message: 'User authentication required for passkey registration' });
    } catch (error) {
      logAuthError('WEBAUTHN_REGISTRATION_ERROR', error, {
        userId: user ? user.id : 'unknown',
        credentialId: id ? Buffer.from(id).toString('base64url') : 'unknown'
      });
      return done(error);
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

    await SocialAccount.upsert({
      user_id: user.id,
      platform: 'google',
      handle: profile.emails[0].value,
      provider: 'google',
      provider_user_id: profile.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      profile_data: JSON.stringify(profile._json)
    });

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

// Microsoft OAuth Strategy
passport.use(new MicrosoftStrategy(oauthConfig.microsoft, async (accessToken, refreshToken, profile, done) => {
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

    await SocialAccount.upsert({
      user_id: user.id,
      platform: 'microsoft',
      handle: profile.emails[0].value,
      provider: 'microsoft',
      provider_user_id: profile.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      profile_data: JSON.stringify(profile._json)
    });

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

// Apple OAuth Strategy
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

    await SocialAccount.upsert({
      user_id: user.id,
      platform: 'apple',
      handle: email,
      provider: 'apple',
      provider_user_id: profile.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      profile_data: JSON.stringify(profile)
    });

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

module.exports = {
  passport,
  oauthConfig
}; 