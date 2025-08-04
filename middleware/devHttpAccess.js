/**
 * Development HTTP Access Middleware
 * Allows HTTP access from any IP when enabled by admin in development mode
 */

const { AdminSetting } = require('../models');

// Cache the setting to avoid database queries on every request
let devHttpAccessCache = {
  value: false,
  lastCheck: 0,
  cacheDuration: 30000 // 30 seconds
};

/**
 * Check if development HTTP access from any IP is allowed
 */
async function isDevHttpAccessAllowed() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return false;
  }

  const now = Date.now();
  
  // Use cached value if it's recent
  if (now - devHttpAccessCache.lastCheck < devHttpAccessCache.cacheDuration) {
    return devHttpAccessCache.value;
  }

  try {
    const setting = await AdminSetting.findOne({
      order: [['createdAt', 'DESC']]
    });
    
    devHttpAccessCache.value = setting?.allow_dev_http_any_ip || false;
    devHttpAccessCache.lastCheck = now;
    
    return devHttpAccessCache.value;
  } catch (error) {
    console.warn('Could not check dev HTTP access setting:', error.message);
    return false;
  }
}

/**
 * Middleware to log and allow development HTTP access
 */
const devHttpAccessMiddleware = async (req, res, next) => {
  // Only apply in development
  if (process.env.NODE_ENV !== 'development') {
    return next();
  }

  const isAllowed = await isDevHttpAccessAllowed();
  
  if (isAllowed) {
    const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    console.log(`🌐 Dev HTTP Access: Allowing ${req.method} ${req.originalUrl} from ${clientIP}`);
    
    // Add a header to indicate this is development mode
    res.setHeader('X-Dev-Mode', 'true');
    res.setHeader('X-Dev-HTTP-Access', 'enabled');
  }

  next();
};

/**
 * Clear the cache (useful when admin settings change)
 */
function clearDevHttpAccessCache() {
  devHttpAccessCache.lastCheck = 0;
}

module.exports = {
  devHttpAccessMiddleware,
  isDevHttpAccessAllowed,
  clearDevHttpAccessCache
};