/**
 * Login Tracking Utility
 * Updates UserDevice table with login timestamps and device information
 */

const { UserDevice } = require('../models');
const crypto = require('crypto');

/**
 * Generate a simple device fingerprint from request headers
 * @param {Object} req - Express request object
 * @returns {string} Device fingerprint
 */
function generateDeviceFingerprint(req) {
  const userAgent = req.headers['user-agent'] || 'unknown';
  const acceptLanguage = req.headers['accept-language'] || 'unknown';
  const acceptEncoding = req.headers['accept-encoding'] || 'unknown';
  
  // Create a simple fingerprint from headers
  const fingerprintData = `${userAgent}|${acceptLanguage}|${acceptEncoding}`;
  return crypto.createHash('sha256').update(fingerprintData).digest('hex');
}

/**
 * Extract device type from user agent
 * @param {string} userAgent - User agent string
 * @returns {string} Device type
 */
function getDeviceType(userAgent) {
  if (!userAgent) return 'unknown';
  
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return 'mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'tablet';
  } else {
    return 'desktop';
  }
}

/**
 * Extract browser name from user agent
 * @param {string} userAgent - User agent string
 * @returns {string} Browser name
 */
function getBrowserName(userAgent) {
  if (!userAgent) return 'unknown';
  
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('chrome') && !ua.includes('edge')) {
    return 'chrome';
  } else if (ua.includes('firefox')) {
    return 'firefox';
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    return 'safari';
  } else if (ua.includes('edge')) {
    return 'edge';
  } else if (ua.includes('opera')) {
    return 'opera';
  } else {
    return 'unknown';
  }
}

/**
 * Track user login by updating or creating UserDevice record
 * @param {string} userId - User ID
 * @param {Object} req - Express request object
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} UserDevice record
 */
async function trackLogin(userId, req, options = {}) {
  try {
    const userAgent = req.headers['user-agent'] || 'unknown';
    const deviceFingerprint = generateDeviceFingerprint(req);
    const deviceType = getDeviceType(userAgent);
    const browserName = getBrowserName(userAgent);
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    
    // Generate device name
    const deviceName = options.deviceName || `${browserName.charAt(0).toUpperCase() + browserName.slice(1)} on ${deviceType.charAt(0).toUpperCase() + deviceType.slice(1)}`;
    
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
      login_count: created ? 1 : undefined // Only set on creation, let DB handle increment
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
    
    console.log(`📱 Login tracked: User ${userId} from ${deviceType} (${browserName}) - ${created ? 'New' : 'Existing'} device`);
    
    return userDevice;
    
  } catch (error) {
    console.error('❌ Error tracking login:', error);
    // Don't throw error - login tracking shouldn't break the login process
    return null;
  }
}

/**
 * Get user's recent login devices
 * @param {string} userId - User ID
 * @param {number} limit - Number of devices to return
 * @returns {Promise<Array>} Array of UserDevice records
 */
async function getRecentLoginDevices(userId, limit = 5) {
  try {
    return await UserDevice.findAll({
      where: { user_id: userId },
      order: [['last_login_at', 'DESC']],
      limit: limit
    });
  } catch (error) {
    console.error('❌ Error getting recent login devices:', error);
    return [];
  }
}

module.exports = {
  trackLogin,
  getRecentLoginDevices,
  generateDeviceFingerprint,
  getDeviceType,
  getBrowserName
};
