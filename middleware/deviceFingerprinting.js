/**
 * Device Fingerprinting Middleware
 * 
 * Handles device fingerprint collection, analysis, and fraud detection.
 * Integrates with user authentication and security monitoring.
 * 
 * @version 1.0.0
 * @author DaySave Security Team
 */

const crypto = require('crypto');
const { UserDevice, LoginAttempt, User, AuditLog } = require('../models');
const { logSecurityEvent } = require('../config/logger');
const { v4: uuidv4 } = require('uuid');
const geoLocationService = require('../services/geoLocationService');

class DeviceFingerprinting {
  constructor() {
    this.suspiciousPatterns = new Map();
    this.fingerprintCache = new Map();
    this.riskThresholds = {
      low: 0.3,
      medium: 0.6,
      high: 0.8,
      critical: 0.9
    };
    
    // Initialize suspicious patterns detection
    this.initializeSuspiciousPatterns();
    
    console.log('🔍 DeviceFingerprinting middleware initialized');
  }

  /**
   * Initialize known suspicious patterns
   */
  initializeSuspiciousPatterns() {
    // Bot user agents
    this.suspiciousPatterns.set('bots', [
      /bot/i, /crawler/i, /spider/i, /scraper/i,
      /headless/i, /phantom/i, /selenium/i, /puppeteer/i
    ]);

    // Automation indicators
    this.suspiciousPatterns.set('automation', [
      /webdriver/i, /automation/i, /chrome-automation/i,
      /chromium/i && /headless/i
    ]);

    // VPN indicators (basic patterns)
    this.suspiciousPatterns.set('vpn_keywords', [
      /vpn/i, /proxy/i, /tunnel/i, /anonymous/i
    ]);
  }

  /**
   * Main middleware function
   * @param {Object} options - Middleware configuration
   * @returns {Function} Express middleware
   */
  middleware(options = {}) {
    const {
      requireFingerprint = false,
      enableFraudDetection = true,
      logAllRequests = false,
      skipRoutes = ['/health', '/favicon.ico']
    } = options;

    return async (req, res, next) => {
      const requestId = req.requestId || uuidv4();
      req.requestId = requestId;

      try {
        // Skip certain routes
        if (skipRoutes.some(route => req.path.includes(route))) {
          return next();
        }

        // Extract fingerprint from request
        const fingerprintData = this.extractFingerprint(req);
        
        if (!fingerprintData && requireFingerprint) {
          return res.status(400).json({
            error: 'Device fingerprint required',
            code: 'FINGERPRINT_REQUIRED'
          });
        }

        if (fingerprintData) {
          // Generate and analyze fingerprint
          const analysis = await this.analyzeFingerprint(fingerprintData, req);
          
          // Add to request object
          req.deviceFingerprint = {
            fingerprint: analysis.fingerprint,
            riskScore: analysis.riskScore,
            riskLevel: analysis.riskLevel,
            flags: analysis.flags,
            components: fingerprintData.components
          };

          // Fraud detection
          if (enableFraudDetection) {
            const fraudCheck = await this.performFraudDetection(analysis, req);
            
            if (fraudCheck.blocked) {
              await this.logSecurityIncident(fraudCheck, req);
              return res.status(403).json({
                error: 'Access denied due to security policy',
                code: 'SECURITY_VIOLATION',
                requestId
              });
            }

            req.deviceFingerprint.fraudCheck = fraudCheck;
          }

          // Log if required
          if (logAllRequests || req.deviceFingerprint.riskScore > this.riskThresholds.medium) {
            await this.logFingerprintEvent(req);
          }
        }

        next();
      } catch (error) {
        console.error('❌ Device fingerprinting middleware error:', error);
        
        // Don't block request on fingerprinting errors
        req.deviceFingerprint = {
          error: true,
          message: 'Fingerprinting failed'
        };
        
        next();
      }
    };
  }

  /**
   * Extract fingerprint data from request
   * @param {Object} req - Express request object
   * @returns {Object|null} Fingerprint data
   */
  extractFingerprint(req) {
    // Try different sources for fingerprint data
    const sources = [
      req.body?.deviceFingerprint,
      req.headers['x-device-fingerprint'],
      req.query?.deviceFingerprint
    ];

    for (const source of sources) {
      if (source) {
        try {
          return typeof source === 'string' ? JSON.parse(source) : source;
        } catch (error) {
          console.warn('⚠️ Invalid fingerprint data format:', error);
        }
      }
    }

    return null;
  }

  /**
   * Analyze device fingerprint and calculate risk
   * @param {Object} fingerprintData - Raw fingerprint data
   * @param {Object} req - Express request object
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeFingerprint(fingerprintData, req) {
    const clientIP = this.getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    
    // Get geolocation information
    const geoLocation = geoLocationService.getLocationInfo(clientIP);
    
    // Generate server-side fingerprint hash
    const fingerprint = this.generateFingerprintHash(fingerprintData, req);
    
    // Calculate risk score (including location-based risk)
    const riskScore = this.calculateRiskScore(fingerprintData, req, geoLocation);
    
    // Determine risk level
    const riskLevel = this.getRiskLevel(riskScore);
    
    // Security flags (including location-based flags)
    const flags = await this.generateSecurityFlags(fingerprintData, req, geoLocation);
    
    // Store analysis
    await this.storeFingerprintAnalysis({
      fingerprint,
      riskScore,
      riskLevel,
      flags,
      clientIP,
      userAgent,
      geoLocation,
      components: fingerprintData
    });

    return {
      fingerprint,
      riskScore,
      riskLevel,
      flags,
      clientIP,
      userAgent,
      geoLocation
    };
  }

  /**
   * Generate fingerprint hash from components
   * @param {Object} fingerprintData - Fingerprint components
   * @param {Object} req - Express request object
   * @returns {string} Fingerprint hash
   */
  generateFingerprintHash(fingerprintData, req) {
    const components = {
      // Client-side fingerprint
      clientFingerprint: fingerprintData.fingerprint,
      
      // Server-side components
      userAgent: req.headers['user-agent'],
      acceptLanguage: req.headers['accept-language'],
      acceptEncoding: req.headers['accept-encoding'],
      ip: this.getClientIP(req),
      
      // Selected client components for stability
      screen: fingerprintData.components?.screen,
      timezone: fingerprintData.components?.timezone,
      hardware: fingerprintData.components?.hardware,
      platform: fingerprintData.components?.platform
    };

    const componentString = JSON.stringify(components, Object.keys(components).sort());
    return crypto.createHash('sha256').update(componentString).digest('hex');
  }

  /**
   * Calculate risk score based on multiple factors
   * @param {Object} fingerprintData - Fingerprint data
   * @param {Object} req - Express request object
   * @param {Object} geoLocation - Geolocation data
   * @returns {number} Risk score (0-1)
   */
  calculateRiskScore(fingerprintData, req, geoLocation) {
    let score = 0;
    const userAgent = req.headers['user-agent'] || '';
    
    // Bot detection
    if (this.detectBot(userAgent)) {
      score += 0.4;
    }

    // Automation detection
    if (this.detectAutomation(userAgent)) {
      score += 0.3;
    }

    // Inconsistency detection
    if (this.detectInconsistencies(fingerprintData)) {
      score += 0.2;
    }

    // Rare configuration detection
    if (this.detectRareConfiguration(fingerprintData)) {
      score += 0.15;
    }

    // Headless browser detection
    if (this.detectHeadlessBrowser(fingerprintData)) {
      score += 0.35;
    }

    // VPN/Proxy detection (basic)
    if (this.detectVPNIndicators(req)) {
      score += 0.1;
    }

    // Canvas/WebGL fingerprint anomalies
    if (this.detectFingerprintAnomalies(fingerprintData)) {
      score += 0.2;
    }

    // Location-based risk assessment
    if (geoLocation) {
      score += this.calculateLocationRisk(geoLocation);
    }

    return Math.min(score, 1.0);
  }

  /**
   * Detect bot indicators
   * @param {string} userAgent - User agent string
   * @returns {boolean} Whether bot is detected
   */
  detectBot(userAgent) {
    const botPatterns = this.suspiciousPatterns.get('bots');
    return botPatterns.some(pattern => pattern.test(userAgent));
  }

  /**
   * Detect automation indicators
   * @param {string} userAgent - User agent string
   * @returns {boolean} Whether automation is detected
   */
  detectAutomation(userAgent) {
    const automationPatterns = this.suspiciousPatterns.get('automation');
    return automationPatterns.some(pattern => pattern.test(userAgent));
  }

  /**
   * Detect inconsistencies in fingerprint data
   * @param {Object} fingerprintData - Fingerprint data
   * @returns {boolean} Whether inconsistencies detected
   */
  detectInconsistencies(fingerprintData) {
    const components = fingerprintData.components;
    if (!components) return false;

    // Check for impossible combinations
    const screen = components.screen;
    const viewport = components.viewport;
    
    if (screen && viewport) {
      // Viewport larger than screen
      if (viewport.width > screen.width || viewport.height > screen.height) {
        return true;
      }
    }

    // Check for missing expected properties
    if (components.fallback) {
      return true;
    }

    return false;
  }

  /**
   * Detect rare configurations that might indicate spoofing
   * @param {Object} fingerprintData - Fingerprint data
   * @returns {boolean} Whether rare configuration detected
   */
  detectRareConfiguration(fingerprintData) {
    const components = fingerprintData.components;
    if (!components) return false;

    // Very high or very low screen resolutions
    const screen = components.screen;
    if (screen) {
      const totalPixels = screen.width * screen.height;
      if (totalPixels < 100000 || totalPixels > 20000000) {
        return true;
      }
    }

    // Unusual hardware configurations
    const hardware = components.hardware;
    if (hardware) {
      // Extremely high core count
      if (hardware.hardwareConcurrency > 32) {
        return true;
      }
      
      // Very high memory
      if (hardware.deviceMemory > 32) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detect headless browser indicators
   * @param {Object} fingerprintData - Fingerprint data
   * @returns {boolean} Whether headless browser detected
   */
  detectHeadlessBrowser(fingerprintData) {
    const components = fingerprintData.components;
    if (!components) return false;

    // Missing canvas fingerprint might indicate headless
    if (!components.canvas || components.canvas === 'canvas_unavailable') {
      return true;
    }

    // Missing WebGL might indicate headless
    if (!components.webgl || components.webgl === 'webgl_unavailable') {
      return true;
    }

    // Viewport and screen size inconsistencies
    const viewport = components.viewport;
    const screen = components.screen;
    
    if (viewport && screen) {
      // Exactly matching viewport and screen (common in headless)
      if (viewport.width === screen.width && viewport.height === screen.height) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detect VPN indicators (basic detection)
   * @param {Object} req - Express request object
   * @returns {boolean} Whether VPN indicators detected
   */
  detectVPNIndicators(req) {
    const userAgent = req.headers['user-agent'] || '';
    const vpnPatterns = this.suspiciousPatterns.get('vpn_keywords');
    
    return vpnPatterns.some(pattern => pattern.test(userAgent));
  }

  /**
   * Detect fingerprint anomalies
   * @param {Object} fingerprintData - Fingerprint data
   * @returns {boolean} Whether anomalies detected
   */
  detectFingerprintAnomalies(fingerprintData) {
    const components = fingerprintData.components;
    if (!components) return false;

    // Suspicious canvas fingerprint patterns
    if (components.canvas) {
      // Very short canvas fingerprint might indicate spoofing
      if (components.canvas.length < 10) {
        return true;
      }
    }

    // Empty or minimal font list
    if (components.fonts && Array.isArray(components.fonts)) {
      if (components.fonts.length < 5) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate security flags
   * @param {Object} fingerprintData - Fingerprint data
   * @param {Object} req - Express request object
   * @param {Object} geoLocation - Geolocation data
   * @returns {Promise<Array>} Security flags
   */
  async generateSecurityFlags(fingerprintData, req, geoLocation) {
    const flags = [];
    const userAgent = req.headers['user-agent'] || '';

    if (this.detectBot(userAgent)) flags.push('BOT_DETECTED');
    if (this.detectAutomation(userAgent)) flags.push('AUTOMATION_DETECTED');
    if (this.detectHeadlessBrowser(fingerprintData)) flags.push('HEADLESS_BROWSER');
    if (this.detectInconsistencies(fingerprintData)) flags.push('INCONSISTENT_DATA');
    if (this.detectRareConfiguration(fingerprintData)) flags.push('RARE_CONFIGURATION');
    if (this.detectVPNIndicators(req)) flags.push('VPN_INDICATORS');
    if (this.detectFingerprintAnomalies(fingerprintData)) flags.push('FINGERPRINT_ANOMALIES');

    // Location-based flags
    if (geoLocation) {
      if (geoLocation.isVPN) flags.push('LOCATION_VPN_PROXY');
      if (geoLocation.riskFactors) {
        flags.push(...geoLocation.riskFactors.map(factor => `LOCATION_${factor}`));
      }
      if (geoLocation.confidence < 0.3) flags.push('LOW_LOCATION_CONFIDENCE');
    }

    return flags;
  }

  /**
   * Get risk level from score
   * @param {number} score - Risk score
   * @returns {string} Risk level
   */
  getRiskLevel(score) {
    if (score >= this.riskThresholds.critical) return 'CRITICAL';
    if (score >= this.riskThresholds.high) return 'HIGH';
    if (score >= this.riskThresholds.medium) return 'MEDIUM';
    if (score >= this.riskThresholds.low) return 'LOW';
    return 'MINIMAL';
  }

  /**
   * Perform fraud detection
   * @param {Object} analysis - Fingerprint analysis
   * @param {Object} req - Express request object
   * @returns {Promise<Object>} Fraud detection results
   */
  async performFraudDetection(analysis, req) {
    const result = {
      blocked: false,
      reason: null,
      confidence: 0,
      actions: []
    };

    // Block critical risk scores
    if (analysis.riskScore >= this.riskThresholds.critical) {
      result.blocked = true;
      result.reason = 'CRITICAL_RISK_SCORE';
      result.confidence = 0.95;
      result.actions.push('BLOCK_REQUEST');
    }

    // Block known bot patterns
    if (analysis.flags.includes('BOT_DETECTED')) {
      result.blocked = true;
      result.reason = 'BOT_DETECTED';
      result.confidence = 0.9;
      result.actions.push('BLOCK_REQUEST');
    }

    // Additional checks for high risk
    if (analysis.riskScore >= this.riskThresholds.high) {
      result.actions.push('REQUIRE_ADDITIONAL_AUTH');
      result.actions.push('ENHANCED_MONITORING');
    }

    // Medium risk actions
    if (analysis.riskScore >= this.riskThresholds.medium) {
      result.actions.push('RATE_LIMIT');
      result.actions.push('LOG_ACTIVITY');
    }

    return result;
  }

  /**
   * Store fingerprint analysis in database
   * @param {Object} analysisData - Analysis data to store
   * @returns {Promise<void>}
   */
  async storeFingerprintAnalysis(analysisData) {
    try {
      // Cache the analysis
      this.fingerprintCache.set(analysisData.fingerprint, {
        ...analysisData,
        timestamp: new Date()
      });

      // Clean old cache entries (keep last 1000)
      if (this.fingerprintCache.size > 1000) {
        const oldestKey = this.fingerprintCache.keys().next().value;
        this.fingerprintCache.delete(oldestKey);
      }

    } catch (error) {
      console.error('❌ Error storing fingerprint analysis:', error);
    }
  }

  /**
   * Log security incident
   * @param {Object} fraudCheck - Fraud detection results
   * @param {Object} req - Express request object
   * @returns {Promise<void>}
   */
  async logSecurityIncident(fraudCheck, req) {
    const incident = {
      type: 'DEVICE_FINGERPRINT_VIOLATION',
      severity: 'HIGH',
      details: {
        reason: fraudCheck.reason,
        confidence: fraudCheck.confidence,
        fingerprint: req.deviceFingerprint?.fingerprint,
        riskScore: req.deviceFingerprint?.riskScore,
        flags: req.deviceFingerprint?.flags,
        ip: this.getClientIP(req),
        userAgent: req.headers['user-agent'],
        url: req.originalUrl,
        method: req.method
      },
      timestamp: new Date()
    };

    console.warn('🚨 Security incident logged:', incident);
    
    try {
      await logSecurityEvent('FINGERPRINT_VIOLATION', incident.details);
    } catch (error) {
      console.error('❌ Error logging security incident:', error);
    }
  }

  /**
   * Log fingerprint event
   * @param {Object} req - Express request object
   * @returns {Promise<void>}
   */
  async logFingerprintEvent(req) {
    try {
      const eventData = {
        fingerprint: req.deviceFingerprint?.fingerprint,
        riskScore: req.deviceFingerprint?.riskScore,
        riskLevel: req.deviceFingerprint?.riskLevel,
        flags: req.deviceFingerprint?.flags,
        ip: this.getClientIP(req),
        userAgent: req.headers['user-agent'],
        url: req.originalUrl,
        method: req.method,
        userId: req.user?.id || null
      };

      await logSecurityEvent('FINGERPRINT_ANALYSIS', eventData);
    } catch (error) {
      console.error('❌ Error logging fingerprint event:', error);
    }
  }

  /**
   * Calculate location-based risk
   * @param {Object} geoLocation - Geolocation data
   * @returns {number} Additional risk score (0-1)
   */
  calculateLocationRisk(geoLocation) {
    let locationRisk = 0;

    // VPN/Proxy risk
    if (geoLocation.isVPN) {
      locationRisk += 0.3;
    }

    // High-risk countries
    if (geoLocation.riskFactors && geoLocation.riskFactors.includes('HIGH_RISK_COUNTRY')) {
      locationRisk += 0.2;
    }

    // Hosting providers
    if (geoLocation.riskFactors && geoLocation.riskFactors.includes('HOSTING_PROVIDER')) {
      locationRisk += 0.25;
    }

    // Low confidence location
    if (geoLocation.confidence < 0.3) {
      locationRisk += 0.1;
    }

    // Unknown location
    if (!geoLocation.country || !geoLocation.city) {
      locationRisk += 0.15;
    }

    return Math.min(locationRisk, 0.5); // Cap location risk at 0.5
  }

  /**
   * Get client IP address
   * @param {Object} req - Express request object
   * @returns {string} Client IP address
   */
  getClientIP(req) {
    return req.ip || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress ||
           req.headers['x-forwarded-for']?.split(',')[0] ||
           req.headers['x-real-ip'] ||
           'unknown';
  }

  /**
   * Check if device is trusted
   * @param {string} fingerprint - Device fingerprint
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Whether device is trusted
   */
  async isDeviceTrusted(fingerprint, userId) {
    try {
      const device = await UserDevice.findOne({
        where: {
          device_fingerprint: fingerprint,
          user_id: userId,
          is_trusted: true
        }
      });

      return !!device;
    } catch (error) {
      console.error('❌ Error checking device trust:', error);
      return false;
    }
  }

  /**
   * Mark device as trusted
   * @param {string} fingerprint - Device fingerprint
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async trustDevice(fingerprint, userId) {
    try {
      await UserDevice.upsert({
        user_id: userId,
        device_fingerprint: fingerprint,
        is_trusted: true,
        last_login_at: new Date()
      });

      console.log('✅ Device marked as trusted:', fingerprint.substring(0, 8) + '...');
    } catch (error) {
      console.error('❌ Error trusting device:', error);
    }
  }
}

// Export singleton instance
const deviceFingerprintingInstance = new DeviceFingerprinting();

module.exports = {
  DeviceFingerprinting,
  deviceFingerprinting: deviceFingerprintingInstance,
  middleware: (options) => deviceFingerprintingInstance.middleware(options)
};