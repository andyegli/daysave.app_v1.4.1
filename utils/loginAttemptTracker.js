/**
 * Login Attempt Tracker
 * 
 * Comprehensive tracking system that records all login attempts in the LoginAttempt table
 * with device fingerprinting, geolocation, and risk assessment.
 * 
 * @version 1.0.0
 * @author DaySave Security Team
 */

const { LoginAttempt, UserDevice, User } = require('../models');
const { generateDeviceFingerprint, getDeviceType, getBrowserName } = require('./login-tracker');
const { logAuthEvent, logAuthError } = require('../config/logger');
const crypto = require('crypto');

/**
 * Simple geolocation service (placeholder - can be enhanced with real service)
 */
class SimpleGeoLocationService {
  /**
   * Get location information for IP address
   * @param {string} ip - IP address
   * @returns {Object} Location information
   */
  getLocationInfo(ip) {
    // Basic IP range detection for common cases
    const locationData = {
      ip: ip,
      country: null,
      region: null,
      city: null,
      latitude: null,
      longitude: null,
      timezone: null,
      isp: null,
      isVPN: false,
      confidence: 0.5
    };

    // Simple detection for localhost and private IPs
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
      locationData.country = 'LOCAL';
      locationData.city = 'localhost';
      locationData.confidence = 1.0;
      return locationData;
    }

    // Basic country detection based on IP ranges (simplified)
    // In production, use a real geolocation service like MaxMind, IPinfo, etc.
    const firstOctet = parseInt(ip.split('.')[0]);
    
    if (firstOctet >= 1 && firstOctet <= 126) {
      locationData.country = 'US';
      locationData.region = 'CA';
      locationData.city = 'Unknown';
    } else if (firstOctet >= 128 && firstOctet <= 191) {
      locationData.country = 'EU';
      locationData.region = 'UK';
      locationData.city = 'Unknown';
    } else {
      locationData.country = 'XX';
      locationData.city = 'Unknown';
    }

    // Basic VPN detection (very simplified)
    if (ip.includes('vpn') || ip.includes('proxy')) {
      locationData.isVPN = true;
    }

    return locationData;
  }

  /**
   * Format location for display
   * @param {Object} location - Location data
   * @returns {string} Formatted location string
   */
  formatLocationForDisplay(location) {
    if (!location) return 'Unknown Location';
    
    const parts = [];
    if (location.city && location.city !== 'Unknown') parts.push(location.city);
    if (location.region) parts.push(location.region);
    if (location.country) parts.push(location.country);
    
    let display = parts.join(', ') || 'Unknown Location';
    
    if (location.isVPN) {
      display += ' (VPN/Proxy)';
    }
    
    return display;
  }
}

const geoLocationService = new SimpleGeoLocationService();

/**
 * Enhanced device fingerprint generation
 * @param {Object} req - Express request object
 * @returns {string} Enhanced device fingerprint
 */
function generateEnhancedDeviceFingerprint(req) {
  const userAgent = req.headers['user-agent'] || 'unknown';
  const acceptLanguage = req.headers['accept-language'] || 'unknown';
  const acceptEncoding = req.headers['accept-encoding'] || 'unknown';
  const connection = req.headers.connection || 'unknown';
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  
  // Create enhanced fingerprint from multiple headers
  const fingerprintData = `${userAgent}|${acceptLanguage}|${acceptEncoding}|${connection}|${ip}`;
  return crypto.createHash('sha256').update(fingerprintData).digest('hex');
}

/**
 * Calculate risk score for login attempt
 * @param {Object} req - Express request object
 * @param {Object} geoLocation - Geolocation data
 * @param {boolean} isSuccess - Whether login was successful
 * @returns {number} Risk score (0-1)
 */
function calculateLoginRiskScore(req, geoLocation, isSuccess) {
  let riskScore = 0;
  
  const userAgent = req.headers['user-agent'] || '';
  
  // Failed login increases risk
  if (!isSuccess) {
    riskScore += 0.3;
  }
  
  // Bot detection
  if (/bot|crawler|spider|scraper/i.test(userAgent)) {
    riskScore += 0.4;
  }
  
  // Headless browser detection
  if (/headless|phantom|selenium|puppeteer/i.test(userAgent)) {
    riskScore += 0.5;
  }
  
  // VPN/Proxy detection
  if (geoLocation && geoLocation.isVPN) {
    riskScore += 0.2;
  }
  
  // Unknown location
  if (!geoLocation || !geoLocation.country) {
    riskScore += 0.1;
  }
  
  // Unusual user agent
  if (!userAgent || userAgent === 'unknown' || userAgent.length < 10) {
    riskScore += 0.2;
  }
  
  return Math.min(riskScore, 1.0);
}

/**
 * Record login attempt in database
 * @param {Object} params - Login attempt parameters
 * @returns {Promise<Object>} Created LoginAttempt record
 */
async function recordLoginAttempt({
  userId,
  req,
  success = false,
  failureReason = null,
  loginMethod = 'password'
}) {
  try {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const deviceFingerprint = generateEnhancedDeviceFingerprint(req);
    
    // Get geolocation information
    const geoLocation = geoLocationService.getLocationInfo(ip);
    
    // Calculate risk score
    const riskScore = calculateLoginRiskScore(req, geoLocation, success);
    
    // Create login attempt record
    const loginAttempt = await LoginAttempt.create({
      user_id: userId,
      device_fingerprint: deviceFingerprint,
      ip: ip, // Legacy field
      ip_address: ip, // New field
      attempted_at: new Date(),
      success: success,
      failure_reason: failureReason,
      
      // Geolocation data
      country: geoLocation.country,
      region: geoLocation.region,
      city: geoLocation.city,
      latitude: geoLocation.latitude,
      longitude: geoLocation.longitude,
      timezone: geoLocation.timezone,
      isp: geoLocation.isp,
      is_vpn: geoLocation.isVPN,
      location_confidence: geoLocation.confidence,
      
      // Additional metadata
      user_agent: userAgent,
      login_method: loginMethod,
      risk_score: riskScore,
      
      // Attempt tracking
      attempt_count: 1,
      last_attempt_at: new Date()
    });
    
    console.log(`📊 Login attempt recorded: ${success ? 'SUCCESS' : 'FAILED'} - User: ${userId}, IP: ${ip}, Risk: ${riskScore.toFixed(2)}`);
    
    // Also update UserDevice table for successful logins
    if (success) {
      await updateUserDevice(userId, req, { loginMethod });
    }
    
    return loginAttempt;
    
  } catch (error) {
    console.error('❌ Error recording login attempt:', error);
    
    // Log the error but don't throw - login tracking shouldn't break authentication
    logAuthError('LOGIN_ATTEMPT_TRACKING_ERROR', error, {
      userId,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    return null;
  }
}

/**
 * Update UserDevice table (existing functionality)
 * @param {string} userId - User ID
 * @param {Object} req - Express request object
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} UserDevice record
 */
async function updateUserDevice(userId, req, options = {}) {
  try {
    const userAgent = req.headers['user-agent'] || 'unknown';
    const deviceFingerprint = generateEnhancedDeviceFingerprint(req);
    const deviceType = getDeviceType(userAgent);
    const browserName = getBrowserName(userAgent);
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    
    // Generate device name
    const deviceName = options.deviceName || 
      `${browserName.charAt(0).toUpperCase() + browserName.slice(1)} on ${deviceType.charAt(0).toUpperCase() + deviceType.slice(1)}`;
    
    // Get geolocation for device record
    const geoLocation = geoLocationService.getLocationInfo(ip);
    
    // Update or create UserDevice record
    const [userDevice, created] = await UserDevice.upsert({
      user_id: userId,
      device_fingerprint: deviceFingerprint,
      device_name: deviceName,
      device_type: deviceType,
      browser_name: browserName,
      ip_address: ip,
      user_agent: userAgent,
      last_login_at: new Date(),
      is_trusted: options.isTrusted || false,
      login_count: 1, // Will be incremented below if not created
      
      // Add geolocation to device record
      country: geoLocation.country,
      region: geoLocation.region,
      city: geoLocation.city,
      location_confidence: geoLocation.confidence
    }, {
      returning: true
    });
    
    // If not created (updated), increment login count
    if (!created) {
      await UserDevice.increment('login_count', {
        where: {
          user_id: userId,
          device_fingerprint: deviceFingerprint
        }
      });
    }
    
    console.log(`📱 Device updated: User ${userId} from ${deviceType} (${browserName}) - ${created ? 'New' : 'Existing'} device`);
    
    return userDevice;
    
  } catch (error) {
    console.error('❌ Error updating user device:', error);
    return null;
  }
}

/**
 * Track successful login
 * @param {string} userId - User ID
 * @param {Object} req - Express request object
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Login attempt record
 */
async function trackSuccessfulLogin(userId, req, options = {}) {
  const loginAttempt = await recordLoginAttempt({
    userId,
    req,
    success: true,
    loginMethod: options.loginMethod || 'password'
  });
  
  // Log successful login event
  logAuthEvent('LOGIN_SUCCESS_TRACKED', {
    userId,
    ip: req.ip || req.headers['x-forwarded-for'],
    userAgent: req.headers['user-agent'],
    loginMethod: options.loginMethod || 'password',
    deviceFingerprint: generateEnhancedDeviceFingerprint(req)
  });
  
  return loginAttempt;
}

/**
 * Track failed login
 * @param {string} userId - User ID (can be null for unknown users)
 * @param {Object} req - Express request object
 * @param {string} failureReason - Reason for failure
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Login attempt record
 */
async function trackFailedLogin(userId, req, failureReason, options = {}) {
  const loginAttempt = await recordLoginAttempt({
    userId,
    req,
    success: false,
    failureReason,
    loginMethod: options.loginMethod || 'password'
  });
  
  // Log failed login event
  logAuthEvent('LOGIN_FAILED_TRACKED', {
    userId,
    ip: req.ip || req.headers['x-forwarded-for'],
    userAgent: req.headers['user-agent'],
    failureReason,
    loginMethod: options.loginMethod || 'password',
    deviceFingerprint: generateEnhancedDeviceFingerprint(req)
  });
  
  return loginAttempt;
}

/**
 * Get recent login attempts for analysis
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Recent login attempts
 */
async function getRecentLoginAttempts(options = {}) {
  try {
    const {
      limit = 50,
      offset = 0,
      userId = null,
      ip = null,
      success = null,
      hoursBack = 24
    } = options;
    
    const where = {};
    
    // Filter by user
    if (userId) {
      where.user_id = userId;
    }
    
    // Filter by IP
    if (ip) {
      where.ip_address = ip;
    }
    
    // Filter by success/failure
    if (success !== null) {
      where.success = success;
    }
    
    // Filter by time range
    if (hoursBack) {
      const timeThreshold = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
      where.attempted_at = {
        [require('sequelize').Op.gte]: timeThreshold
      };
    }
    
    const attempts = await LoginAttempt.findAll({
      where,
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'email'],
          required: false
        }
      ],
      order: [['attempted_at', 'DESC']],
      limit,
      offset
    });
    
    // Add formatted location display
    return attempts.map(attempt => {
      const attemptData = attempt.toJSON();
      attemptData.locationDisplay = geoLocationService.formatLocationForDisplay({
        city: attemptData.city,
        region: attemptData.region,
        country: attemptData.country,
        isVPN: attemptData.is_vpn
      });
      return attemptData;
    });
    
  } catch (error) {
    console.error('❌ Error getting recent login attempts:', error);
    return [];
  }
}

/**
 * Get login statistics
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Login statistics
 */
async function getLoginStatistics(options = {}) {
  try {
    const { hoursBack = 24 } = options;
    const timeThreshold = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    
    const { Op, fn, col } = require('sequelize');
    
    // Total attempts
    const totalAttempts = await LoginAttempt.count({
      where: {
        attempted_at: { [Op.gte]: timeThreshold }
      }
    });
    
    // Successful attempts
    const successfulAttempts = await LoginAttempt.count({
      where: {
        attempted_at: { [Op.gte]: timeThreshold },
        success: true
      }
    });
    
    // Failed attempts
    const failedAttempts = totalAttempts - successfulAttempts;
    
    // Unique IPs
    const uniqueIPs = await LoginAttempt.count({
      where: {
        attempted_at: { [Op.gte]: timeThreshold }
      },
      distinct: true,
      col: 'ip_address'
    });
    
    // High risk attempts (risk score > 0.6)
    const highRiskAttempts = await LoginAttempt.count({
      where: {
        attempted_at: { [Op.gte]: timeThreshold },
        risk_score: { [Op.gt]: 0.6 }
      }
    });
    
    return {
      totalAttempts,
      successfulAttempts,
      failedAttempts,
      uniqueIPs,
      highRiskAttempts,
      successRate: totalAttempts > 0 ? (successfulAttempts / totalAttempts * 100).toFixed(1) : 0
    };
    
  } catch (error) {
    console.error('❌ Error getting login statistics:', error);
    return {
      totalAttempts: 0,
      successfulAttempts: 0,
      failedAttempts: 0,
      uniqueIPs: 0,
      highRiskAttempts: 0,
      successRate: 0
    };
  }
}

module.exports = {
  recordLoginAttempt,
  trackSuccessfulLogin,
  trackFailedLogin,
  updateUserDevice,
  getRecentLoginAttempts,
  getLoginStatistics,
  generateEnhancedDeviceFingerprint,
  geoLocationService
};
