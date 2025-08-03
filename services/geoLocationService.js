/**
 * GeoLocation Service
 * 
 * Provides IP geolocation functionality for device fingerprinting and security.
 * Uses geoip-lite for local database lookups with additional enrichment.
 * 
 * @version 1.0.0
 * @author DaySave Security Team
 */

const geoip = require('geoip-lite');

class GeoLocationService {
  constructor() {
    this.enableLogging = process.env.NODE_ENV === 'development';
    
    // VPN/Proxy detection patterns
    this.vpnIndicators = [
      // Common VPN/proxy hosting providers
      /amazon/i, /google cloud/i, /microsoft/i, /digitalocean/i,
      /linode/i, /vultr/i, /ovh/i, /hetzner/i,
      
      // Known VPN/proxy services
      /vpn/i, /proxy/i, /tunnel/i, /anonymizer/i,
      /tor/i, /onion/i, /private internet access/i,
      /nordvpn/i, /expressvpn/i, /surfshark/i,
      /cyberghost/i, /purevpn/i, /hotspot shield/i,
      
      // Hosting/datacenter keywords
      /hosting/i, /datacenter/i, /cloud/i, /server/i,
      /colocation/i, /dedicated/i, /virtual/i
    ];

    if (this.enableLogging) {
      console.log('🌍 GeoLocationService initialized');
    }
  }

  /**
   * Get comprehensive location information from IP address
   * @param {string} ip - IP address to lookup
   * @returns {Object} Location information object
   */
  getLocationInfo(ip) {
    try {
      // Handle localhost and private IPs
      if (this.isLocalOrPrivateIP(ip)) {
        return this.getLocalLocationInfo(ip);
      }

      // Lookup using geoip-lite
      const geoData = geoip.lookup(ip);
      
      if (!geoData) {
        return this.getUnknownLocationInfo(ip);
      }

      // Enrich with additional analysis
      const locationInfo = {
        ip: ip,
        country: geoData.country || null,
        region: geoData.region || null,
        city: geoData.city || null,
        latitude: geoData.ll ? geoData.ll[0] : null,
        longitude: geoData.ll ? geoData.ll[1] : null,
        timezone: geoData.timezone || null,
        
        // Additional metadata
        metro: geoData.metro || null,
        area: geoData.area || null,
        eu: geoData.eu || '0',
        
        // VPN/Proxy analysis
        isVPN: this.detectVPN(ip, geoData),
        isp: this.extractISP(geoData),
        
        // Confidence scoring
        confidence: this.calculateConfidence(geoData),
        
        // Human-readable location
        locationString: this.formatLocationString(geoData),
        
        // Risk indicators
        riskFactors: this.analyzeRiskFactors(ip, geoData)
      };

      if (this.enableLogging) {
        console.log(`🌍 Location lookup: ${ip} → ${locationInfo.locationString}`);
      }

      return locationInfo;

    } catch (error) {
      console.error('❌ Error in geolocation lookup:', error);
      return this.getErrorLocationInfo(ip, error);
    }
  }

  /**
   * Check if IP is localhost or private
   * @param {string} ip - IP address
   * @returns {boolean} Whether IP is local/private
   */
  isLocalOrPrivateIP(ip) {
    if (!ip || ip === 'unknown') return true;
    
    const privateRanges = [
      /^127\./,           // Loopback
      /^192\.168\./,      // Private Class C
      /^10\./,            // Private Class A
      /^172\.(1[6-9]|2[0-9]|3[01])\./,  // Private Class B
      /^::1$/,            // IPv6 loopback
      /^fe80:/,           // IPv6 link-local
      /^fc00:/,           // IPv6 unique local
      /^localhost$/i
    ];
    
    return privateRanges.some(range => range.test(ip));
  }

  /**
   * Get location info for local/private IPs
   * @param {string} ip - IP address
   * @returns {Object} Local location info
   */
  getLocalLocationInfo(ip) {
    return {
      ip: ip,
      country: 'XX', // Unknown country code
      region: null,
      city: 'Local/Private Network',
      latitude: null,
      longitude: null,
      timezone: null,
      metro: null,
      area: null,
      eu: '0',
      isVPN: false,
      isp: 'Local Network',
      confidence: 0.0,
      locationString: 'Local/Private Network',
      riskFactors: []
    };
  }

  /**
   * Get location info for unknown IPs
   * @param {string} ip - IP address
   * @returns {Object} Unknown location info
   */
  getUnknownLocationInfo(ip) {
    return {
      ip: ip,
      country: null,
      region: null,
      city: null,
      latitude: null,
      longitude: null,
      timezone: null,
      metro: null,
      area: null,
      eu: '0',
      isVPN: false,
      isp: null,
      confidence: 0.0,
      locationString: 'Unknown Location',
      riskFactors: ['UNKNOWN_LOCATION']
    };
  }

  /**
   * Get location info for lookup errors
   * @param {string} ip - IP address
   * @param {Error} error - Error object
   * @returns {Object} Error location info
   */
  getErrorLocationInfo(ip, error) {
    return {
      ip: ip,
      country: null,
      region: null,
      city: null,
      latitude: null,
      longitude: null,
      timezone: null,
      metro: null,
      area: null,
      eu: '0',
      isVPN: false,
      isp: null,
      confidence: 0.0,
      locationString: 'Lookup Error',
      riskFactors: ['LOOKUP_ERROR'],
      error: error.message
    };
  }

  /**
   * Detect VPN/Proxy usage
   * @param {string} ip - IP address
   * @param {Object} geoData - Geolocation data
   * @returns {boolean} Whether IP appears to be VPN/proxy
   */
  detectVPN(ip, geoData) {
    // Check if organization/ISP contains VPN indicators
    const org = geoData.org || '';
    const isVPNByOrg = this.vpnIndicators.some(indicator => indicator.test(org));
    
    // Additional heuristics could be added here:
    // - Check against known VPN IP ranges
    // - Analyze location vs expected user location
    // - Check for hosting/datacenter IPs
    
    return isVPNByOrg;
  }

  /**
   * Extract ISP information
   * @param {Object} geoData - Geolocation data
   * @returns {string} ISP name
   */
  extractISP(geoData) {
    if (!geoData.org) return null;
    
    // Clean up organization name
    let isp = geoData.org;
    
    // Remove common prefixes/suffixes
    isp = isp.replace(/^AS\d+\s+/i, ''); // Remove AS number prefix
    isp = isp.replace(/\s+(Inc|LLC|Ltd|Corp|Corporation)\.?$/i, ''); // Remove corporate suffixes
    
    return isp.trim();
  }

  /**
   * Calculate confidence score for location accuracy
   * @param {Object} geoData - Geolocation data
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(geoData) {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence if we have city-level data
    if (geoData.city) confidence += 0.3;
    
    // Increase confidence if we have coordinates
    if (geoData.ll && geoData.ll.length === 2) confidence += 0.2;
    
    // Decrease confidence for hosting providers
    if (geoData.org && this.vpnIndicators.some(indicator => indicator.test(geoData.org))) {
      confidence -= 0.3;
    }
    
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Format location as human-readable string
   * @param {Object} geoData - Geolocation data
   * @returns {string} Formatted location string
   */
  formatLocationString(geoData) {
    const parts = [];
    
    if (geoData.city) parts.push(geoData.city);
    if (geoData.region) parts.push(geoData.region);
    if (geoData.country) parts.push(geoData.country);
    
    return parts.length > 0 ? parts.join(', ') : 'Unknown Location';
  }

  /**
   * Analyze risk factors based on location
   * @param {string} ip - IP address
   * @param {Object} geoData - Geolocation data
   * @returns {Array} Array of risk factor strings
   */
  analyzeRiskFactors(ip, geoData) {
    const riskFactors = [];
    
    // VPN/Proxy detection
    if (this.detectVPN(ip, geoData)) {
      riskFactors.push('VPN_OR_PROXY');
    }
    
    // Hosting/datacenter detection
    const org = geoData.org || '';
    if (/hosting|datacenter|cloud|server/i.test(org)) {
      riskFactors.push('HOSTING_PROVIDER');
    }
    
    // High-risk countries (customize based on your threat model)
    const highRiskCountries = ['CN', 'RU', 'KP', 'IR'];
    if (geoData.country && highRiskCountries.includes(geoData.country)) {
      riskFactors.push('HIGH_RISK_COUNTRY');
    }
    
    // Missing geolocation data
    if (!geoData.city && !geoData.region) {
      riskFactors.push('INCOMPLETE_LOCATION');
    }
    
    return riskFactors;
  }

  /**
   * Compare two locations for significant changes
   * @param {Object} location1 - First location object
   * @param {Object} location2 - Second location object
   * @returns {Object} Comparison result with distance and change indicators
   */
  compareLocations(location1, location2) {
    if (!location1 || !location2) {
      return { distance: null, significantChange: false, reason: 'Missing location data' };
    }

    // Country-level change
    const countryChanged = location1.country !== location2.country;
    
    // City-level change
    const cityChanged = location1.city !== location2.city;
    
    // Calculate distance if coordinates are available
    let distance = null;
    if (location1.latitude && location1.longitude && 
        location2.latitude && location2.longitude) {
      distance = this.calculateDistance(
        location1.latitude, location1.longitude,
        location2.latitude, location2.longitude
      );
    }

    // Determine if change is significant
    let significantChange = false;
    let reason = '';

    if (countryChanged) {
      significantChange = true;
      reason = 'Country changed';
    } else if (distance && distance > 100) { // More than 100km
      significantChange = true;
      reason = `Distance > 100km (${Math.round(distance)}km)`;
    } else if (cityChanged) {
      significantChange = true;
      reason = 'City changed';
    }

    return {
      distance,
      significantChange,
      reason,
      countryChanged,
      cityChanged
    };
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * @param {number} lat1 - First latitude
   * @param {number} lon1 - First longitude  
   * @param {number} lat2 - Second latitude
   * @param {number} lon2 - Second longitude
   * @returns {number} Distance in kilometers
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  /**
   * Convert degrees to radians
   * @param {number} degrees - Degrees to convert
   * @returns {number} Radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get country name from country code
   * @param {string} countryCode - Two-letter country code
   * @returns {string} Country name
   */
  getCountryName(countryCode) {
    const countries = {
      'US': 'United States', 'GB': 'United Kingdom', 'CA': 'Canada',
      'AU': 'Australia', 'DE': 'Germany', 'FR': 'France', 'IT': 'Italy',
      'ES': 'Spain', 'NL': 'Netherlands', 'BE': 'Belgium', 'CH': 'Switzerland',
      'AT': 'Austria', 'SE': 'Sweden', 'NO': 'Norway', 'DK': 'Denmark',
      'FI': 'Finland', 'JP': 'Japan', 'KR': 'South Korea', 'CN': 'China',
      'IN': 'India', 'BR': 'Brazil', 'MX': 'Mexico', 'AR': 'Argentina',
      'RU': 'Russia', 'TR': 'Turkey', 'SA': 'Saudi Arabia', 'AE': 'UAE',
      'SG': 'Singapore', 'HK': 'Hong Kong', 'TW': 'Taiwan', 'TH': 'Thailand',
      'VN': 'Vietnam', 'ID': 'Indonesia', 'MY': 'Malaysia', 'PH': 'Philippines',
      'ZA': 'South Africa', 'EG': 'Egypt', 'NG': 'Nigeria', 'KE': 'Kenya',
      'XX': 'Unknown'
    };
    
    return countries[countryCode] || countryCode || 'Unknown';
  }

  /**
   * Format location for display in admin interface
   * @param {Object} locationInfo - Location information object
   * @returns {string} Formatted display string
   */
  formatLocationForDisplay(locationInfo) {
    if (!locationInfo) return 'Unknown';
    
    const parts = [];
    
    if (locationInfo.city) parts.push(locationInfo.city);
    if (locationInfo.region) parts.push(locationInfo.region);
    if (locationInfo.country) {
      const countryName = this.getCountryName(locationInfo.country);
      parts.push(countryName);
    }
    
    let display = parts.length > 0 ? parts.join(', ') : 'Unknown Location';
    
    // Add VPN indicator
    if (locationInfo.isVPN) {
      display += ' (VPN/Proxy)';
    }
    
    // Add confidence indicator for low confidence
    if (locationInfo.confidence < 0.5) {
      display += ' (Low Confidence)';
    }
    
    return display;
  }
}

// Export singleton instance
module.exports = new GeoLocationService();