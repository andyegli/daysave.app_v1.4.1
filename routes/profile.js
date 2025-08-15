const express = require('express');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const router = express.Router();
const { User } = require('../models');
const { logAuthEvent, logAuthError } = require('../config/logger');

// Import middleware
const {
  isAuthenticated,
  validateUserLogin
} = require('../middleware');

// Change password route
router.post('/change-password', isAuthenticated, async (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;
  const userId = req.user.id;
  
  const clientDetails = {
    ip: req.ip || (req.connection && req.connection.remoteAddress) || req.headers['x-forwarded-for'] || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown'
  };
  
  try {
    // Validate input
    if (!current_password || !new_password || !confirm_password) {
      logAuthEvent('PASSWORD_CHANGE_FAILED', { ...clientDetails, userId, reason: 'missing_fields' });
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }
    
    if (new_password !== confirm_password) {
      logAuthEvent('PASSWORD_CHANGE_FAILED', { ...clientDetails, userId, reason: 'password_mismatch' });
      return res.status(400).json({ 
        success: false, 
        message: 'New passwords do not match' 
      });
    }
    
    if (new_password.length < 8) {
      logAuthEvent('PASSWORD_CHANGE_FAILED', { ...clientDetails, userId, reason: 'password_too_short' });
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 8 characters long' 
      });
    }
    
    // Get user from database
    const user = await User.findByPk(userId);
    if (!user) {
      logAuthError('PASSWORD_CHANGE_USER_NOT_FOUND', new Error('User not found'), { ...clientDetails, userId });
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Verify current password (only for non-OAuth users)
    if (user.password_hash !== 'oauth_user') {
      const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password_hash);
      
      // Log password verification attempt
      logAuthEvent(isCurrentPasswordValid ? 'PASSWORD_VERIFY_SUCCESS' : 'PASSWORD_VERIFY_FAILED', {
        ...clientDetails,
        userId,
        userEmail: user.email,
        attemptedAt: new Date().toISOString()
      });
      
      if (!isCurrentPasswordValid) {
        logAuthEvent('PASSWORD_CHANGE_FAILED', { ...clientDetails, userId, reason: 'invalid_current_password' });
        return res.status(400).json({ 
          success: false, 
          message: 'Current password is incorrect' 
        });
      }
    } else {
      // Log OAuth user attempting password change
      logAuthEvent('PASSWORD_CHANGE_OAUTH_USER', {
        ...clientDetails,
        userId,
        userEmail: user.email,
        attemptedAt: new Date().toISOString()
      });
    }
    
    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(new_password, saltRounds);
    
    // Update password in database
    await user.update({
      password_hash: hashedPassword,
      last_password_change: new Date()
    });
    
    logAuthEvent('PASSWORD_CHANGE_SUCCESS', { ...clientDetails, userId, username: user.username });
    
    res.json({ 
      success: true, 
      message: 'Password changed successfully' 
    });
    
  } catch (error) {
    logAuthError('PASSWORD_CHANGE_ERROR', error, { ...clientDetails, userId });
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while changing password' 
    });
  }
});

// Setup MFA - Generate QR code
router.post('/mfa/setup', isAuthenticated, async (req, res) => {
  const userId = req.user.id;
  const userEmail = req.user.email;
  
  const clientDetails = {
    ip: req.ip || (req.connection && req.connection.remoteAddress) || req.headers['x-forwarded-for'] || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown'
  };
  
  try {
    // Check if MFA is already enabled
    const user = await User.findByPk(userId);
    if (user.totp_enabled) {
      logAuthEvent('MFA_SETUP_ALREADY_ENABLED', { ...clientDetails, userId });
      return res.status(400).json({ 
        success: false, 
        message: 'Two-factor authentication is already enabled' 
      });
    }
    
    // Generate secret and QR code with logo (if available)
    const baseUrl = process.env.BASE_URL || 'https://localhost';
    const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
    
    const secret = speakeasy.generateSecret({
      name: `DaySave (${userEmail})`,
      issuer: 'DaySave',
      length: 32
    });
    
    let enhancedOtpAuthUrl = secret.otpauth_url;
    let logoUrl = null;
    let logoStatus = 'none';
    
    // Only add logo for production/public URLs (not localhost)
    if (!isLocalhost && process.env.NODE_ENV === 'production') {
      logoUrl = `${baseUrl}/images/daysave-2fa-logo.svg`;
      enhancedOtpAuthUrl = `${secret.otpauth_url}&image=${encodeURIComponent(logoUrl)}`;
      logoStatus = 'included';
    } else {
      // For localhost/development, don't include logo as external apps can't access it
      logoStatus = 'skipped_localhost';
      console.log('🎨 2FA Logo: Skipped for localhost - external authenticator apps cannot access localhost URLs');
    }
    
    // Generate QR code as data URL using enhanced URL
    const qrCodeDataURL = await qrcode.toDataURL(enhancedOtpAuthUrl);
    
    // Store temporary secret (not activated until verified)
    await user.update({
      totp_secret: secret.base32
    });
    
    logAuthEvent('MFA_SETUP_INITIATED', { ...clientDetails, userId, userEmail });
    
    res.json({
      success: true,
      qrCode: qrCodeDataURL,
      secret: secret.base32,
      manualEntryKey: secret.base32,
      otpAuthUrl: enhancedOtpAuthUrl,
      logoUrl: logoUrl,
      logoStatus: logoStatus,
      environment: isLocalhost ? 'development' : 'production'
    });
    
  } catch (error) {
    logAuthError('MFA_SETUP_ERROR', error, { ...clientDetails, userId, userEmail });
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while setting up two-factor authentication' 
    });
  }
});

// Verify and enable MFA
router.post('/mfa/verify', isAuthenticated, async (req, res) => {
  const { code } = req.body;
  const userId = req.user.id;
  
  const clientDetails = {
    ip: req.ip || (req.connection && req.connection.remoteAddress) || req.headers['x-forwarded-for'] || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown'
  };
  
  try {
    if (!code) {
      return res.status(400).json({ 
        success: false, 
        message: 'Verification code is required' 
      });
    }
    
    const user = await User.findByPk(userId);
    if (!user.totp_secret) {
      logAuthEvent('MFA_VERIFY_NO_SECRET', { ...clientDetails, userId });
      return res.status(400).json({ 
        success: false, 
        message: 'MFA setup not initiated. Please start setup first.' 
      });
    }
    
    // Verify the code
    const isValid = speakeasy.totp.verify({
      secret: user.totp_secret,
      encoding: 'base32',
      token: code,
      window: 2 // Allow for time drift
    });
    
    // Log all verification attempts for security monitoring
    logAuthEvent(isValid ? 'MFA_TOTP_VERIFY_SUCCESS' : 'MFA_TOTP_VERIFY_FAILED', { 
      ...clientDetails, 
      userId,
      userEmail: user.email,
      codeLength: code ? code.length : 0,
      attemptedAt: new Date().toISOString()
    });
    
    if (!isValid) {
      logAuthEvent('MFA_VERIFY_FAILED', { ...clientDetails, userId, reason: 'invalid_code' });
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid verification code' 
      });
    }
    
    // Generate backup codes
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      backupCodes.push(code);
    }
    
    // Log backup code generation
    logAuthEvent('MFA_BACKUP_CODES_GENERATED', { 
      ...clientDetails, 
      userId, 
      userEmail: user.email,
      codeCount: backupCodes.length,
      generatedAt: new Date().toISOString()
    });
    
    // Enable MFA
    await user.update({
      totp_enabled: true,
      totp_backup_codes: JSON.stringify(backupCodes)
    });
    
    logAuthEvent('MFA_ENABLED_SUCCESS', { ...clientDetails, userId, userEmail: user.email });
    
    res.json({
      success: true,
      message: 'Two-factor authentication enabled successfully',
      backupCodes: backupCodes
    });
    
  } catch (error) {
    logAuthError('MFA_VERIFY_ERROR', error, { ...clientDetails, userId });
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while verifying code' 
    });
  }
});

// Disable MFA
router.post('/mfa/disable', isAuthenticated, async (req, res) => {
  const { password, code } = req.body;
  const userId = req.user.id;
  
  const clientDetails = {
    ip: req.ip || (req.connection && req.connection.remoteAddress) || req.headers['x-forwarded-for'] || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown'
  };
  
  try {
    const user = await User.findByPk(userId);
    
    if (!user.totp_enabled) {
      return res.status(400).json({ 
        success: false, 
        message: 'Two-factor authentication is not enabled' 
      });
    }
    
    // Verify password (for non-OAuth users)
    if (user.password_hash !== 'oauth_user') {
      if (!password) {
        return res.status(400).json({ 
          success: false, 
          message: 'Password is required to disable MFA' 
        });
      }
      
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        logAuthEvent('MFA_DISABLE_FAILED', { ...clientDetails, userId, reason: 'invalid_password' });
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid password' 
        });
      }
    }
    
    // Verify TOTP code (optional - password verification is sufficient)
    let totpVerified = false;
    let disableMethod = 'password_only';
    
    if (code) {
      // If TOTP code is provided, verify it
      const isValid = speakeasy.totp.verify({
        secret: user.totp_secret,
        encoding: 'base32',
        token: code,
        window: 2 // Allow for time drift
      });
      
      // Log TOTP verification attempt for disable
      logAuthEvent(isValid ? 'MFA_DISABLE_TOTP_VERIFY_SUCCESS' : 'MFA_DISABLE_TOTP_VERIFY_FAILED', {
        ...clientDetails,
        userId,
        userEmail: user.email,
        codeLength: code.length,
        attemptedAt: new Date().toISOString()
      });
      
      if (!isValid) {
        logAuthEvent('MFA_DISABLE_FAILED', { ...clientDetails, userId, reason: 'invalid_totp_code' });
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid verification code. Leave blank if you cannot access your authenticator app.' 
        });
      }
      
      totpVerified = true;
      disableMethod = 'password_and_totp';
    } else {
      // No TOTP code provided - password verification is sufficient
      // This allows users who lost their 2FA device to disable MFA with just password
      logAuthEvent('MFA_DISABLE_PASSWORD_ONLY_ATTEMPT', {
        ...clientDetails,
        userId,
        userEmail: user.email,
        reason: 'no_totp_code_provided',
        attemptedAt: new Date().toISOString()
      });
    }
    
    // Disable MFA
    await user.update({
      totp_enabled: false,
      totp_secret: null,
      totp_backup_codes: null
    });
    
    logAuthEvent('MFA_DISABLED_SUCCESS', { 
      ...clientDetails, 
      userId, 
      userEmail: user.email,
      disableMethod: disableMethod,
      totpVerified: totpVerified,
      disabledAt: new Date().toISOString()
    });
    
    const message = totpVerified 
      ? 'Two-factor authentication disabled successfully'
      : 'Two-factor authentication disabled successfully using password verification';
    
    res.json({
      success: true,
      message: message
    });
    
  } catch (error) {
    logAuthError('MFA_DISABLE_ERROR', error, { ...clientDetails, userId });
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while disabling MFA' 
    });
  }
});

// Get MFA status
router.get('/mfa/status', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    
    res.json({
      success: true,
      enabled: user.totp_enabled || false,
      hasBackupCodes: !!user.totp_backup_codes
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while checking MFA status' 
    });
  }
});

module.exports = router;