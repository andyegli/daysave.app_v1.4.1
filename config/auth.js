const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const AppleStrategy = require('passport-apple').Strategy;
const { User, SocialAccount } = require('../models');

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

// Passport serialization
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
passport.use(new GoogleStrategy(oauthConfig.google, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user exists
    let user = await User.findOne({
      where: { email: profile.emails[0].value }
    });

    if (!user) {
      // Create new user
      user = await User.create({
        username: `google_${profile.id}`,
        email: profile.emails[0].value,
        password_hash: 'oauth_user', // Placeholder for OAuth users
        subscription_status: 'trial',
        language: 'en'
      });
    }

    // Update or create social account record
    await SocialAccount.upsert({
      user_id: user.id,
      provider: 'google',
      provider_user_id: profile.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      profile_data: JSON.stringify(profile._json)
    });

    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

// Microsoft OAuth Strategy
passport.use(new MicrosoftStrategy(oauthConfig.microsoft, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user exists
    let user = await User.findOne({
      where: { email: profile.emails[0].value }
    });

    if (!user) {
      // Create new user
      user = await User.create({
        username: `microsoft_${profile.id}`,
        email: profile.emails[0].value,
        password_hash: 'oauth_user', // Placeholder for OAuth users
        subscription_status: 'trial',
        language: 'en'
      });
    }

    // Update or create social account record
    await SocialAccount.upsert({
      user_id: user.id,
      provider: 'microsoft',
      provider_user_id: profile.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      profile_data: JSON.stringify(profile._json)
    });

    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

// Apple OAuth Strategy
passport.use(new AppleStrategy(oauthConfig.apple, async (accessToken, refreshToken, idToken, profile, done) => {
  try {
    // Apple doesn't always provide email, so we need to handle this
    const email = profile.email || `apple_${profile.id}@privaterelay.appleid.com`;
    
    // Check if user exists
    let user = await User.findOne({
      where: { email: email }
    });

    if (!user) {
      // Create new user
      user = await User.create({
        username: `apple_${profile.id}`,
        email: email,
        password_hash: 'oauth_user', // Placeholder for OAuth users
        subscription_status: 'trial',
        language: 'en'
      });
    }

    // Update or create social account record
    await SocialAccount.upsert({
      user_id: user.id,
      provider: 'apple',
      provider_user_id: profile.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      profile_data: JSON.stringify(profile)
    });

    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

module.exports = {
  passport,
  oauthConfig
}; 