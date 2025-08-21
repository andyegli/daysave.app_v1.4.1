#!/usr/bin/env node

/**
 * Generate Mock Device Fingerprinting Data
 * 
 * This script generates realistic mock data for device fingerprinting
 * to populate the admin dashboard with fresh risk score distributions.
 * 
 * Usage: node scripts/generate-fingerprint-mock-data.js [count]
 */

const { UserDevice, LoginAttempt, User } = require('../models');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// Mock data pools for realistic generation
const BROWSERS = [
  { name: 'Chrome', versions: ['120.0.6099.109', '119.0.6045.199', '118.0.5993.117', '117.0.5938.149'] },
  { name: 'Firefox', versions: ['121.0', '120.0.1', '119.0', '118.0.2'] },
  { name: 'Safari', versions: ['17.2.1', '17.1.2', '16.6.1', '16.5.2'] },
  { name: 'Edge', versions: ['120.0.2210.91', '119.0.2151.97', '118.0.2088.76'] },
  { name: 'Opera', versions: ['106.0.4998.19', '105.0.4970.21', '104.0.4944.54'] }
];

const OPERATING_SYSTEMS = [
  { name: 'Windows', versions: ['10', '11', '8.1'] },
  { name: 'macOS', versions: ['14.2.1', '13.6.3', '12.7.2', '11.7.10'] },
  { name: 'Linux', versions: ['Ubuntu 22.04', 'Ubuntu 20.04', 'Fedora 39', 'Debian 12'] },
  { name: 'iOS', versions: ['17.2.1', '16.7.4', '15.8.1'] },
  { name: 'Android', versions: ['14', '13', '12', '11'] }
];

const COUNTRIES = [
  { code: 'US', name: 'United States', riskMultiplier: 0.1 },
  { code: 'CA', name: 'Canada', riskMultiplier: 0.1 },
  { code: 'GB', name: 'United Kingdom', riskMultiplier: 0.1 },
  { code: 'DE', name: 'Germany', riskMultiplier: 0.1 },
  { code: 'FR', name: 'France', riskMultiplier: 0.1 },
  { code: 'AU', name: 'Australia', riskMultiplier: 0.1 },
  { code: 'JP', name: 'Japan', riskMultiplier: 0.1 },
  { code: 'NZ', name: 'New Zealand', riskMultiplier: 0.05 },
  { code: 'CN', name: 'China', riskMultiplier: 0.3 },
  { code: 'RU', name: 'Russia', riskMultiplier: 0.4 },
  { code: 'IR', name: 'Iran', riskMultiplier: 0.5 },
  { code: 'KP', name: 'North Korea', riskMultiplier: 0.8 },
  { code: 'VE', name: 'Venezuela', riskMultiplier: 0.3 },
  { code: 'NG', name: 'Nigeria', riskMultiplier: 0.4 },
  { code: 'PK', name: 'Pakistan', riskMultiplier: 0.3 }
];

const CITIES = {
  'US': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia'],
  'CA': ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa', 'Edmonton'],
  'GB': ['London', 'Manchester', 'Birmingham', 'Glasgow', 'Liverpool', 'Bristol'],
  'DE': ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart'],
  'FR': ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes'],
  'AU': ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Canberra'],
  'JP': ['Tokyo', 'Osaka', 'Yokohama', 'Nagoya', 'Sapporo', 'Kobe'],
  'NZ': ['Auckland', 'Wellington', 'Christchurch', 'Hamilton', 'Tauranga', 'Dunedin'],
  'CN': ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Chengdu', 'Hangzhou'],
  'RU': ['Moscow', 'Saint Petersburg', 'Novosibirsk', 'Yekaterinburg', 'Kazan'],
  'IR': ['Tehran', 'Mashhad', 'Isfahan', 'Karaj', 'Shiraz', 'Tabriz'],
  'KP': ['Pyongyang', 'Hamhung', 'Chongjin', 'Nampo', 'Wonsan'],
  'VE': ['Caracas', 'Maracaibo', 'Valencia', 'Barquisimeto', 'Maracay'],
  'NG': ['Lagos', 'Kano', 'Ibadan', 'Kaduna', 'Port Harcourt', 'Benin City'],
  'PK': ['Karachi', 'Lahore', 'Faisalabad', 'Rawalpindi', 'Multan', 'Peshawar']
};

const SUSPICIOUS_USER_AGENTS = [
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
  'curl/7.68.0',
  'python-requests/2.28.1',
  'Scrapy/2.5.1',
  'HeadlessChrome/120.0.6099.109',
  'PhantomJS/2.1.1',
  'Selenium/4.15.2'
];

const ISP_PROVIDERS = [
  'Comcast Cable Communications',
  'Verizon Communications',
  'AT&T Services',
  'Charter Communications',
  'Cox Communications',
  'Spectrum',
  'Xfinity',
  'CenturyLink',
  'Frontier Communications',
  'Optimum',
  'NordVPN',
  'ExpressVPN',
  'Surfshark',
  'Private Internet Access',
  'TorGuard',
  'ProtonVPN'
];

class MockDataGenerator {
  constructor() {
    this.users = [];
    this.generatedFingerprints = new Set();
  }

  /**
   * Generate a random number within range
   */
  randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  /**
   * Pick random item from array
   */
  randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Generate realistic IP address
   */
  generateIPAddress(country) {
    // Generate different IP ranges based on country
    const ranges = {
      'US': () => `${this.randomBetween(1, 223)}.${this.randomBetween(0, 255)}.${this.randomBetween(0, 255)}.${this.randomBetween(1, 254)}`,
      'CN': () => `${this.randomChoice([1, 14, 27, 36, 42, 49, 58, 59, 60, 61])}.${this.randomBetween(0, 255)}.${this.randomBetween(0, 255)}.${this.randomBetween(1, 254)}`,
      'RU': () => `${this.randomChoice([5, 31, 37, 46, 62, 77, 78, 79, 80, 81])}.${this.randomBetween(0, 255)}.${this.randomBetween(0, 255)}.${this.randomBetween(1, 254)}`,
      'default': () => `${this.randomBetween(1, 223)}.${this.randomBetween(0, 255)}.${this.randomBetween(0, 255)}.${this.randomBetween(1, 254)}`
    };
    
    return (ranges[country] || ranges.default)();
  }

  /**
   * Generate device fingerprint hash
   */
  generateFingerprint() {
    let fingerprint;
    do {
      fingerprint = crypto.randomBytes(32).toString('hex');
    } while (this.generatedFingerprints.has(fingerprint));
    
    this.generatedFingerprints.add(fingerprint);
    return fingerprint;
  }

  /**
   * Generate realistic device details
   */
  generateDeviceDetails(browser, os, riskLevel) {
    const screenResolutions = [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 1440, height: 900 },
      { width: 1536, height: 864 },
      { width: 2560, height: 1440 },
      { width: 3840, height: 2160 }
    ];

    const screen = this.randomChoice(screenResolutions);
    const viewport = {
      width: screen.width - this.randomBetween(0, 200),
      height: screen.height - this.randomBetween(100, 300)
    };

    // Add anomalies for higher risk devices
    if (riskLevel === 'high' || riskLevel === 'critical') {
      // Sometimes make viewport larger than screen (impossible)
      if (Math.random() < 0.3) {
        viewport.width = screen.width + this.randomBetween(100, 500);
        viewport.height = screen.height + this.randomBetween(100, 300);
      }
    }

    return {
      screen,
      viewport,
      timezone: this.randomChoice([
        'America/New_York', 'America/Los_Angeles', 'Europe/London', 
        'Europe/Berlin', 'Asia/Tokyo', 'Australia/Sydney',
        'America/Toronto', 'Europe/Paris', 'Asia/Shanghai'
      ]),
      language: this.randomChoice(['en-US', 'en-GB', 'de-DE', 'fr-FR', 'ja-JP', 'zh-CN', 'es-ES']),
      platform: `${os.name} ${this.randomChoice(os.versions)}`,
      cookieEnabled: riskLevel === 'critical' ? false : true,
      doNotTrack: this.randomChoice([null, '1', '0']),
      plugins: riskLevel === 'high' || riskLevel === 'critical' ? [] : [
        'Chrome PDF Plugin', 'Chrome PDF Viewer', 'Native Client'
      ],
      canvas: riskLevel === 'critical' ? 'blocked' : crypto.randomBytes(16).toString('hex'),
      webgl: riskLevel === 'critical' ? 'blocked' : crypto.randomBytes(16).toString('hex'),
      fonts: riskLevel === 'minimal' ? 50 + Math.floor(Math.random() * 30) : Math.floor(Math.random() * 20),
      hardwareConcurrency: this.randomChoice([2, 4, 6, 8, 12, 16]),
      deviceMemory: this.randomChoice([2, 4, 8, 16, 32]),
      fallback: riskLevel === 'high' || riskLevel === 'critical' ? true : false
    };
  }

  /**
   * Calculate risk score based on various factors
   */
  calculateRiskScore(userAgent, country, deviceDetails, isVPN) {
    let score = 0;

    // Base country risk
    const countryData = COUNTRIES.find(c => c.code === country);
    if (countryData) {
      score += countryData.riskMultiplier;
    }

    // Suspicious user agent
    if (SUSPICIOUS_USER_AGENTS.some(ua => userAgent.includes(ua.split('/')[0]))) {
      score += 0.4;
    }

    // VPN/Proxy
    if (isVPN) {
      score += 0.2;
    }

    // Device anomalies
    if (deviceDetails.fallback) {
      score += 0.2;
    }

    if (deviceDetails.viewport.width > deviceDetails.screen.width) {
      score += 0.3;
    }

    if (!deviceDetails.cookieEnabled) {
      score += 0.15;
    }

    if (deviceDetails.fonts < 20) {
      score += 0.1;
    }

    if (deviceDetails.canvas === 'blocked' || deviceDetails.webgl === 'blocked') {
      score += 0.25;
    }

    // Add some randomness
    score += Math.random() * 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Get risk level from score
   */
  getRiskLevel(score) {
    if (score >= 0.9) return 'critical';
    if (score >= 0.8) return 'high';
    if (score >= 0.6) return 'medium';
    if (score >= 0.3) return 'low';
    return 'minimal';
  }

  /**
   * Generate user agent string
   */
  generateUserAgent(browser, os, riskLevel) {
    if (riskLevel === 'high' || riskLevel === 'critical') {
      if (Math.random() < 0.4) {
        return this.randomChoice(SUSPICIOUS_USER_AGENTS);
      }
    }

    const browserVersion = this.randomChoice(browser.versions);
    const osVersion = this.randomChoice(os.versions);

    const templates = {
      'Chrome': `Mozilla/5.0 (${os.name === 'Windows' ? 'Windows NT 10.0; Win64; x64' : 
                   os.name === 'macOS' ? 'Macintosh; Intel Mac OS X 10_15_7' : 
                   'X11; Linux x86_64'}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${browserVersion} Safari/537.36`,
      'Firefox': `Mozilla/5.0 (${os.name === 'Windows' ? 'Windows NT 10.0; Win64; x64' : 
                    os.name === 'macOS' ? 'Macintosh; Intel Mac OS X 10.15' : 
                    'X11; Linux x86_64'}; rv:${browserVersion}) Gecko/20100101 Firefox/${browserVersion}`,
      'Safari': `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${browserVersion} Safari/605.1.15`,
      'Edge': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${browserVersion} Safari/537.36 Edg/${browserVersion}`,
      'Opera': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/${browserVersion}`
    };

    return templates[browser.name] || templates['Chrome'];
  }

  /**
   * Generate mock login attempt
   */
  async generateLoginAttempt(userId, targetRiskLevel = null) {
    // Determine risk level distribution
    const riskDistribution = {
      'minimal': 0.45,
      'low': 0.25,
      'medium': 0.15,
      'high': 0.10,
      'critical': 0.05
    };

    let riskLevel = targetRiskLevel;
    if (!riskLevel) {
      const rand = Math.random();
      let cumulative = 0;
      for (const [level, probability] of Object.entries(riskDistribution)) {
        cumulative += probability;
        if (rand <= cumulative) {
          riskLevel = level;
          break;
        }
      }
    }

    const country = this.randomChoice(COUNTRIES);
    const browser = this.randomChoice(BROWSERS);
    const os = this.randomChoice(OPERATING_SYSTEMS);
    const isVPN = Math.random() < (riskLevel === 'high' || riskLevel === 'critical' ? 0.6 : 0.1);
    
    const deviceDetails = this.generateDeviceDetails(browser, os, riskLevel);
    const userAgent = this.generateUserAgent(browser, os, riskLevel);
    const ipAddress = this.generateIPAddress(country.code);
    const riskScore = this.calculateRiskScore(userAgent, country.code, deviceDetails, isVPN);
    
    // Adjust success rate based on risk level
    const successRates = {
      'minimal': 0.95,
      'low': 0.85,
      'medium': 0.65,
      'high': 0.30,
      'critical': 0.05
    };
    
    const success = Math.random() < successRates[riskLevel];
    const city = this.randomChoice(CITIES[country.code] || ['Unknown']);
    
    // Generate coordinates for the city (approximate)
    const coordinates = this.generateCoordinates(country.code, city);
    
    const attemptData = {
      id: uuidv4(),
      user_id: userId,
      device_fingerprint: this.generateFingerprint(),
      ip: ipAddress,
      ip_address: ipAddress,
      attempted_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Last 30 days
      success: success,
      failure_reason: success ? null : this.generateFailureReason(riskLevel),
      country: country.code,
      region: this.generateRegion(country.code),
      city: city,
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      timezone: deviceDetails.timezone,
      isp: this.randomChoice(ISP_PROVIDERS),
      is_vpn: isVPN,
      risk_score: riskScore,
      user_agent: userAgent,
      device_details: deviceDetails
    };

    return attemptData;
  }

  /**
   * Generate coordinates for a city
   */
  generateCoordinates(countryCode, city) {
    // Approximate coordinates for major cities
    const cityCoords = {
      'New York': { lat: 40.7128, lng: -74.0060 },
      'Los Angeles': { lat: 34.0522, lng: -118.2437 },
      'London': { lat: 51.5074, lng: -0.1278 },
      'Paris': { lat: 48.8566, lng: 2.3522 },
      'Tokyo': { lat: 35.6762, lng: 139.6503 },
      'Sydney': { lat: -33.8688, lng: 151.2093 },
      'Auckland': { lat: -36.8485, lng: 174.7633 },
      'Wellington': { lat: -41.2865, lng: 174.7762 },
      'Beijing': { lat: 39.9042, lng: 116.4074 },
      'Moscow': { lat: 55.7558, lng: 37.6176 }
    };

    if (cityCoords[city]) {
      // Add some random variation
      return {
        lat: cityCoords[city].lat + (Math.random() - 0.5) * 0.1,
        lng: cityCoords[city].lng + (Math.random() - 0.5) * 0.1
      };
    }

    // Default coordinates with country-based approximation
    const countryDefaults = {
      'US': { lat: 39.8283, lng: -98.5795 },
      'CA': { lat: 56.1304, lng: -106.3468 },
      'GB': { lat: 55.3781, lng: -3.4360 },
      'DE': { lat: 51.1657, lng: 10.4515 },
      'FR': { lat: 46.2276, lng: 2.2137 },
      'AU': { lat: -25.2744, lng: 133.7751 },
      'JP': { lat: 36.2048, lng: 138.2529 },
      'NZ': { lat: -40.9006, lng: 174.8860 }
    };

    const defaultCoord = countryDefaults[countryCode] || { lat: 0, lng: 0 };
    return {
      lat: defaultCoord.lat + (Math.random() - 0.5) * 10,
      lng: defaultCoord.lng + (Math.random() - 0.5) * 10
    };
  }

  /**
   * Generate region code
   */
  generateRegion(countryCode) {
    const regions = {
      'US': ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'],
      'CA': ['ON', 'QC', 'BC', 'AB', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE'],
      'GB': ['ENG', 'SCT', 'WLS', 'NIR'],
      'DE': ['BY', 'BW', 'NW', 'NI', 'HE', 'SN', 'RP', 'SH', 'SL', 'BE'],
      'AU': ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']
    };

    return this.randomChoice(regions[countryCode] || ['01', '02', '03']);
  }

  /**
   * Generate failure reason based on risk level
   */
  generateFailureReason(riskLevel) {
    const reasons = {
      'minimal': ['Invalid password', 'Account locked', 'Session expired'],
      'low': ['Invalid password', 'Account locked', 'Too many attempts'],
      'medium': ['Suspicious activity detected', 'Location verification required', 'Device not recognized'],
      'high': ['High risk score - blocked', 'VPN detected - blocked', 'Automated request blocked'],
      'critical': ['Critical risk - access denied', 'Bot detected - blocked', 'Fraud prevention triggered']
    };

    return this.randomChoice(reasons[riskLevel] || reasons['medium']);
  }

  /**
   * Generate mock user device
   */
  async generateUserDevice(userId, loginAttempt) {
    const browser = this.randomChoice(BROWSERS);
    const os = this.randomChoice(OPERATING_SYSTEMS);
    
    return {
      id: uuidv4(),
      user_id: userId,
      device_fingerprint: loginAttempt.device_fingerprint,
      is_trusted: loginAttempt.success && loginAttempt.risk_score < 0.3,
      last_login_at: loginAttempt.success ? loginAttempt.attempted_at : null,
      country: loginAttempt.country,
      region: loginAttempt.region,
      city: loginAttempt.city,
      latitude: loginAttempt.latitude,
      longitude: loginAttempt.longitude,
      timezone: loginAttempt.timezone,
      location_confidence: Math.random() * 0.3 + 0.7, // 0.7-1.0
      device_details: loginAttempt.device_details,
      browser_name: browser.name,
      browser_version: this.randomChoice(browser.versions),
      os_name: os.name,
      os_version: this.randomChoice(os.versions),
      device_type: this.randomChoice(['desktop', 'mobile', 'tablet']),
      screen_resolution: `${loginAttempt.device_details.screen.width}x${loginAttempt.device_details.screen.height}`,
      risk_score: loginAttempt.risk_score,
      risk_level: this.getRiskLevel(loginAttempt.risk_score),
      security_flags: this.generateSecurityFlags(loginAttempt),
      first_seen_at: new Date(loginAttempt.attempted_at.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      last_seen_at: loginAttempt.attempted_at
    };
  }

  /**
   * Generate security flags
   */
  generateSecurityFlags(loginAttempt) {
    const flags = [];
    
    if (loginAttempt.is_vpn) flags.push('VPN_DETECTED');
    if (loginAttempt.risk_score > 0.8) flags.push('HIGH_RISK');
    if (loginAttempt.device_details.fallback) flags.push('FINGERPRINT_ANOMALY');
    if (SUSPICIOUS_USER_AGENTS.some(ua => loginAttempt.user_agent.includes(ua.split('/')[0]))) {
      flags.push('SUSPICIOUS_USER_AGENT');
    }
    if (!loginAttempt.device_details.cookieEnabled) flags.push('COOKIES_DISABLED');
    if (loginAttempt.device_details.viewport.width > loginAttempt.device_details.screen.width) {
      flags.push('IMPOSSIBLE_SCREEN_SIZE');
    }

    return flags;
  }

  /**
   * Main generation function
   */
  async generate(count = 500) {
    console.log(`🎯 Generating ${count} mock device fingerprinting records...`);
    
    try {
      // Get existing users
      this.users = await User.findAll({
        attributes: ['id', 'username'],
        limit: 50
      });

      if (this.users.length === 0) {
        console.error('❌ No users found in database. Please create some users first.');
        return;
      }

      console.log(`👥 Found ${this.users.length} users to generate data for`);

      // Clear existing mock data (optional)
      const clearExisting = process.argv.includes('--clear');
      if (clearExisting) {
        console.log('🧹 Clearing existing fingerprinting data...');
        await LoginAttempt.destroy({ where: {} });
        await UserDevice.destroy({ where: {} });
      }

      // Generate data with specific risk distribution
      const riskTargets = {
        'minimal': Math.floor(count * 0.45),
        'low': Math.floor(count * 0.25),
        'medium': Math.floor(count * 0.15),
        'high': Math.floor(count * 0.10),
        'critical': Math.floor(count * 0.05)
      };

      let generated = 0;
      const batchSize = 50;

      for (const [riskLevel, targetCount] of Object.entries(riskTargets)) {
        console.log(`📊 Generating ${targetCount} ${riskLevel} risk records...`);
        
        for (let i = 0; i < targetCount; i += batchSize) {
          const batch = [];
          const deviceBatch = [];
          const currentBatchSize = Math.min(batchSize, targetCount - i);

          for (let j = 0; j < currentBatchSize; j++) {
            const user = this.randomChoice(this.users);
            const loginAttempt = await this.generateLoginAttempt(user.id, riskLevel);
            const userDevice = await this.generateUserDevice(user.id, loginAttempt);

            batch.push(loginAttempt);
            deviceBatch.push(userDevice);
          }

          // Insert in batches for better performance
          await LoginAttempt.bulkCreate(batch);
          await UserDevice.bulkCreate(deviceBatch);

          generated += currentBatchSize;
          console.log(`✅ Generated ${generated}/${count} records (${Math.round(generated/count*100)}%)`);
        }
      }

      console.log('🎉 Mock data generation completed!');
      console.log('\n📈 Risk Distribution Summary:');
      
      // Verify the distribution
      const distribution = await LoginAttempt.findAll({
        attributes: [
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
        ],
        group: ['risk_level'],
        raw: true
      });

      distribution.forEach(item => {
        console.log(`   ${item.risk_level}: ${item.count} records`);
      });

    } catch (error) {
      console.error('❌ Error generating mock data:', error);
      throw error;
    }
  }
}

// Run the generator
if (require.main === module) {
  const count = parseInt(process.argv[2]) || 500;
  const generator = new MockDataGenerator();
  
  generator.generate(count)
    .then(() => {
      console.log('✅ Mock data generation completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Failed to generate mock data:', error);
      process.exit(1);
    });
}

module.exports = MockDataGenerator;
