#!/usr/bin/env node

/**
 * OAuth Configuration Checker
 * Helps verify that all necessary OAuth callback URLs are configured
 */

require('dotenv').config();

console.log('🔍 DaySave OAuth Configuration Status');
console.log('=====================================\n');

// Check environment
console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🆔 Google Client ID: ${process.env.GOOGLE_CLIENT_ID ? 'Set ✅' : 'Missing ❌'}`);
console.log(`🔑 Google Client Secret: ${process.env.GOOGLE_CLIENT_SECRET ? 'Set ✅' : 'Missing ❌'}\n`);

// Show current callback URL
const getCallbackURL = (provider) => {
  const envVar = `${provider.toUpperCase()}_CALLBACK_URL`;
  if (process.env[envVar]) {
    return process.env[envVar];
  }
  
  if (process.env.NODE_ENV === 'production') {
    return `https://daysave.app/auth/${provider}/callback`;
  }
  
  return `${process.env.BASE_URL || 'http://localhost:3000'}/auth/${provider}/callback`;
};

console.log(`🔗 Current Google Callback URL: ${getCallbackURL('google')}\n`);

console.log('📋 REQUIRED: Add these URLs to your Google Developer Console');
console.log('   Go to: https://console.developers.google.com/');
console.log('   Navigate to: APIs & Services > Credentials > OAuth 2.0 Client IDs');
console.log('   Add these Authorized Redirect URIs:\n');

const requiredCallbacks = [
  `${process.env.BASE_URL || 'http://localhost:3000'}/auth/google/callback`,
  'http://localhost/auth/google/callback',
  'https://daysave.app/auth/google/callback'
];

console.log('⚠️  IMPORTANT: Google OAuth does NOT allow .local domains!');
console.log('   daysave.local URLs will be rejected by Google for security reasons.\n');

requiredCallbacks.forEach((url, index) => {
  console.log(`   ${index + 1}. ${url}`);
});

console.log('\n🎯 TESTING: Test these URLs after updating Google Console:');
console.log(`   • ${process.env.BASE_URL || 'http://localhost:3000'}/auth/login (Direct development - WORKS with Google OAuth)`);
console.log('   • https://daysave.app/auth/login (Production - WORKS with Google OAuth)');
console.log('   • https://daysave.local/auth/login (⚠️  Will NOT work - Google rejects .local domains)\n');

console.log('⚠️  IMPORTANT: Changes to Google Console may take 5-10 minutes to propagate\n');

// Check if we can determine the issue
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  console.log('✅ Google OAuth credentials are configured');
  console.log('🔧 Issue: Callback URLs need to be added to Google Developer Console');
} else {
  console.log('❌ Google OAuth credentials are missing from environment variables');
}

console.log('\n📖 For more help: https://developers.google.com/identity/protocols/oauth2/web-server');
