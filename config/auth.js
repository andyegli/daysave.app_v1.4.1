const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const AppleStrategy = require('passport-apple').Strategy;
const { User, SocialAccount, Role } = require('../models');
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
      
      // Log successful deserialization with role info
      logAuthEvent('USER_DESERIALIZE_SUCCESS', { 
        userId: id, 
        username: user.username,
        hasRole: !!user.Role,
        roleName: user.Role ? user.Role.name : 'none'
      });
    } else {
      logAuthEvent('USER_DESERIALIZE_NOT_FOUND', { userId: id });
    }
    done(null, user);
  } catch (error) {
    logAuthError('USER_DESERIALIZE', error, { userId: id });
    done(error, null);
  }
});

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