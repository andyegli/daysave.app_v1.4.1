#!/usr/bin/env node

/**
 * Enhanced Mock Device Fingerprinting Data Generator
 * 
 * This script generates fresh, non-duplicate mock data for device fingerprinting
 * with options to clean up old data and ensure fresh analytics.
 * 
 * Features:
 * - Prevents duplicate fingerprints
 * - Option to clean old data
 * - Ensures fresh data for analytics
 * - Comprehensive risk level distribution
 * - Geographic diversity
 * 
 * Usage: 
 *   node scripts/enhanced-fingerprint-mock-data.js [options]
 *   
 * Options:
 *   --count=N         Number of records to generate (default: 500)
 *   --clean-old       Remove data older than 7 days before generating
 *   --force-fresh     Remove ALL existing mock data before generating
 *   --dry-run         Show what would be done without making changes
 */

const { UserDevice, LoginAttempt, User } = require('../models');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  count: 500,
  cleanOld: false,
  forceFresh: false,
  dryRun: false
};

args.forEach(arg => {
  if (arg.startsWith('--count=')) {
    options.count = parseInt(arg.split('=')[1]) || 500;
  } else if (arg === '--clean-old') {
    options.cleanOld = true;
  } else if (arg === '--force-fresh') {
    options.forceFresh = true;
  } else if (arg === '--dry-run') {
    options.dryRun = true;
  }
});

// Enhanced data pools for realistic generation
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
  { code: 'GB', name: 'United Kingdom', riskMultiplier: 0.15 },
  { code: 'AU', name: 'Australia', riskMultiplier: 0.1 },
  { code: 'DE', name: 'Germany', riskMultiplier: 0.1 },
  { code: 'FR', name: 'France', riskMultiplier: 0.15 },
  { code: 'JP', name: 'Japan', riskMultiplier: 0.1 },
  { code: 'NZ', name: 'New Zealand', riskMultiplier: 0.05 },
  { code: 'CN', name: 'China', riskMultiplier: 0.4 },
  { code: 'RU', name: 'Russia', riskMultiplier: 0.6 },
  { code: 'BR', name: 'Brazil', riskMultiplier: 0.3 },
  { code: 'IN', name: 'India', riskMultiplier: 0.25 }
];

const FAILURE_REASONS = [
  'Invalid password',
  'Account locked',
  'User not found',
  'MFA required',
  'Device not trusted',
  'Too many attempts',
  'Session expired',
  'IP blocked',
  'Suspicious activity detected',
  'Geographic anomaly',
  'Device fingerprint mismatch',
  'Rate limit exceeded'
];

class EnhancedMockDataGenerator {
  constructor() {
    this.users = [];
    this.existingFingerprints = new Set();
    this.generatedFingerprints = new Set();
  }

  /**
   * Initialize the generator
   */
  async initialize() {
    console.log('🚀 Initializing Enhanced Mock Data Generator...');
    
    // Load existing users
    this.users = await User.findAll();
    console.log(`📋 Found ${this.users.length} users`);

    // Load existing fingerprints to prevent duplicates
    const existingDevices = await UserDevice.findAll({
      attributes: ['device_fingerprint'],
      raw: true
    });
    
    existingDevices.forEach(device => {
      if (device.device_fingerprint) {
        this.existingFingerprints.add(device.device_fingerprint);
      }
    });
    
    console.log(`🔍 Found ${this.existingFingerprints.size} existing fingerprints`);
  }

  /**
   * Clean up old data
   */
  async cleanupOldData() {
    if (options.dryRun) {
      console.log('🧪 DRY RUN: Would clean up old data');
      return;
    }

    if (options.forceFresh) {
      console.log('🧹 Removing ALL existing mock data...');
      
      // Remove all login attempts and user devices
      const deletedAttempts = await LoginAttempt.destroy({ where: {} });
      const deletedDevices = await UserDevice.destroy({ where: {} });
      
      console.log(`   Deleted ${deletedAttempts} login attempts`);
      console.log(`   Deleted ${deletedDevices} user devices`);
      
      // Clear the existing fingerprints set
      this.existingFingerprints.clear();
      
    } else if (options.cleanOld) {
      console.log('🧹 Cleaning up data older than 7 days...');
      
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const deletedAttempts = await LoginAttempt.destroy({
        where: {
          createdAt: { [require('sequelize').Op.lt]: oneWeekAgo }
        }
      });
      
      const deletedDevices = await UserDevice.destroy({
        where: {
          createdAt: { [require('sequelize').Op.lt]: oneWeekAgo }
        }
      });
      
      console.log(`   Deleted ${deletedAttempts} old login attempts`);
      console.log(`   Deleted ${deletedDevices} old user devices`);
      
      // Reload existing fingerprints after cleanup
      const remainingDevices = await UserDevice.findAll({
        attributes: ['device_fingerprint'],
        raw: true
      });
      
      this.existingFingerprints.clear();
      remainingDevices.forEach(device => {
        if (device.device_fingerprint) {
          this.existingFingerprints.add(device.device_fingerprint);
        }
      });
    }
  }

  /**
   * Generate unique device fingerprint
   */
  generateUniqueFingerprint() {
    let fingerprint;
    let attempts = 0;
    const maxAttempts = 1000;
    
    do {
      fingerprint = crypto.randomBytes(32).toString('hex');
      attempts++;
      
      if (attempts > maxAttempts) {
        throw new Error('Unable to generate unique fingerprint after maximum attempts');
      }
    } while (
      this.existingFingerprints.has(fingerprint) || 
      this.generatedFingerprints.has(fingerprint)
    );
    
    this.generatedFingerprints.add(fingerprint);
    return fingerprint;
  }

  /**
   * Utility functions
   */
  randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  generateIPAddress(country) {
    // Generate realistic IP ranges by country
    const ranges = {
      US: () => `${this.randomBetween(1, 223)}.${this.randomBetween(1, 254)}.${this.randomBetween(1, 254)}.${this.randomBetween(1, 254)}`,
      CA: () => `${this.randomBetween(142, 144)}.${this.randomBetween(1, 254)}.${this.randomBetween(1, 254)}.${this.randomBetween(1, 254)}`,
      GB: () => `${this.randomBetween(80, 90)}.${this.randomBetween(1, 254)}.${this.randomBetween(1, 254)}.${this.randomBetween(1, 254)}`,
      AU: () => `${this.randomBetween(1, 14)}.${this.randomBetween(1, 254)}.${this.randomBetween(1, 254)}.${this.randomBetween(1, 254)}`,
      DE: () => `${this.randomBetween(46, 47)}.${this.randomBetween(1, 254)}.${this.randomBetween(1, 254)}.${this.randomBetween(1, 254)}`,
      default: () => `${this.randomBetween(1, 223)}.${this.randomBetween(1, 254)}.${this.randomBetween(1, 254)}.${this.randomBetween(1, 254)}`
    };

    return (ranges[country] || ranges.default)();
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
        'America/Toronto', 'Pacific/Auckland'
      ]),
      language: this.randomChoice(['en-US', 'en-GB', 'de-DE', 'fr-FR', 'ja-JP', 'zh-CN']),
      platform: `${os.name} ${os.version}`,
      cookieEnabled: Math.random() > 0.05,
      doNotTrack: Math.random() > 0.7,
      plugins: this.generatePlugins(browser, riskLevel),
      fonts: this.generateFonts(os, riskLevel),
      canvas: crypto.randomBytes(16).toString('hex'),
      webgl: this.generateWebGLInfo(riskLevel),
      audio: crypto.randomBytes(8).toString('hex')
    };
  }

  generatePlugins(browser, riskLevel) {
    const commonPlugins = ['Chrome PDF Plugin', 'Native Client', 'Widevine Content Decryption Module'];
    const suspiciousPlugins = ['Unknown Plugin', 'Automation Extension', 'Debug Tools'];
    
    let plugins = [...commonPlugins];
    if (riskLevel === 'high' || riskLevel === 'critical') {
      plugins.push(...suspiciousPlugins.slice(0, this.randomBetween(1, 2)));
    }
    
    return plugins;
  }

  generateFonts(os, riskLevel) {
    const windowsFonts = ['Arial', 'Times New Roman', 'Calibri', 'Segoe UI'];
    const macFonts = ['Helvetica', 'Times', 'Menlo', 'San Francisco'];
    const linuxFonts = ['DejaVu Sans', 'Liberation Sans', 'Ubuntu'];
    
    let baseFonts = os.name === 'Windows' ? windowsFonts : 
                   os.name === 'macOS' ? macFonts : linuxFonts;
    
    // Add suspicious fonts for high-risk devices
    if (riskLevel === 'high' || riskLevel === 'critical') {
      baseFonts.push('Suspicious Font', 'Bot Font');
    }
    
    return baseFonts;
  }

  generateWebGLInfo(riskLevel) {
    const vendors = ['Google Inc.', 'Mozilla', 'Apple Inc.', 'Microsoft Corporation'];
    const renderers = [
      'ANGLE (Intel HD Graphics 630 Direct3D11 vs_5_0 ps_5_0)',
      'WebKit WebGL',
      'Mozilla -- ANGLE (AMD Radeon Graphics Direct3D11 vs_5_0 ps_5_0)'
    ];
    
    let vendor = this.randomChoice(vendors);
    let renderer = this.randomChoice(renderers);
    
    // Add suspicious WebGL info for high-risk devices
    if (riskLevel === 'critical' && Math.random() < 0.5) {
      vendor = 'Suspicious Vendor';
      renderer = 'Headless Chrome';
    }
    
    return { vendor, renderer };
  }

  /**
   * Generate user device record
   */
  async generateUserDevice(userId, loginAttempt) {
    const browser = this.randomChoice(BROWSERS);
    const os = this.randomChoice(OPERATING_SYSTEMS);
    const country = this.randomChoice(COUNTRIES);
    const riskLevel = this.determineRiskLevel(country);
    
    const deviceDetails = this.generateDeviceDetails(browser, os, riskLevel);
    const fingerprint = this.generateUniqueFingerprint();
    
    // Generate realistic coordinates for the country
    const coordinates = this.generateCoordinates(country.code);
    
    return {
      id: uuidv4(),
      user_id: userId,
      device_fingerprint: fingerprint,
      is_trusted: Math.random() > 0.3,
      last_login_at: new Date(Date.now() - this.randomBetween(0, 30 * 24 * 60 * 60 * 1000)),
      country: country.code,
      region: this.generateRegion(country.code),
      city: this.generateCity(country.code),
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      timezone: deviceDetails.timezone,
      location_confidence: Math.random() * 0.3 + 0.7, // 0.7-1.0
      device_details: deviceDetails,
      browser_name: browser.name,
      browser_version: this.randomChoice(browser.versions),
      os_name: os.name,
      os_version: this.randomChoice(os.versions),
      device_type: this.determineDeviceType(os.name),
      screen_resolution: `${deviceDetails.screen.width}x${deviceDetails.screen.height}`,
      user_agent: this.generateUserAgent(browser, os)
    };
  }

  /**
   * Generate login attempt record
   */
  async generateLoginAttempt(userId, riskLevel) {
    const country = this.randomChoice(COUNTRIES);
    const isSuccess = this.determineSuccess(riskLevel);
    const coordinates = this.generateCoordinates(country.code);
    
    return {
      id: uuidv4(),
      user_id: userId,
      device_fingerprint: this.generateUniqueFingerprint(),
      ip_address: this.generateIPAddress(country.code),
      attempt_count: this.randomBetween(1, 5),
      last_attempt_at: new Date(),
      attempted_at: new Date(Date.now() - this.randomBetween(0, 24 * 60 * 60 * 1000)),
      success: isSuccess,
      failure_reason: isSuccess ? null : this.randomChoice(FAILURE_REASONS),
      country: country.code,
      region: this.generateRegion(country.code),
      city: this.generateCity(country.code),
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      timezone: this.randomChoice(['America/New_York', 'Europe/London', 'Asia/Tokyo']),
      isp: this.generateISP(country.code),
      is_vpn: Math.random() < (riskLevel === 'critical' ? 0.8 : riskLevel === 'high' ? 0.4 : 0.1)
    };
  }

  // Helper methods for data generation
  determineRiskLevel(country) {
    const risk = Math.random();
    const multiplier = country.riskMultiplier;
    
    if (risk < 0.1 * multiplier) return 'critical';
    if (risk < 0.25 * multiplier) return 'high';
    if (risk < 0.5 * multiplier) return 'medium';
    if (risk < 0.8 * multiplier) return 'low';
    return 'minimal';
  }

  determineSuccess(riskLevel) {
    const successRates = {
      minimal: 0.95,
      low: 0.85,
      medium: 0.7,
      high: 0.4,
      critical: 0.1
    };
    return Math.random() < (successRates[riskLevel] || 0.8);
  }

  determineDeviceType(osName) {
    if (osName === 'iOS' || osName === 'Android') return 'mobile';
    if (osName === 'Windows' || osName === 'macOS' || osName === 'Linux') return 'desktop';
    return 'unknown';
  }

  generateCoordinates(countryCode) {
    // Simplified coordinate generation for major countries
    const coords = {
      US: { lat: 39.8283, lng: -98.5795 },
      CA: { lat: 56.1304, lng: -106.3468 },
      GB: { lat: 55.3781, lng: -3.4360 },
      AU: { lat: -25.2744, lng: 133.7751 },
      DE: { lat: 51.1657, lng: 10.4515 },
      FR: { lat: 46.2276, lng: 2.2137 },
      JP: { lat: 36.2048, lng: 138.2529 },
      NZ: { lat: -40.9006, lng: 174.8860 }
    };
    
    const base = coords[countryCode] || coords.US;
    return {
      lat: base.lat + (Math.random() - 0.5) * 10,
      lng: base.lng + (Math.random() - 0.5) * 10
    };
  }

  generateRegion(countryCode) {
    const regions = {
      US: ['CA', 'NY', 'TX', 'FL', 'WA'],
      CA: ['ON', 'BC', 'AB', 'QC'],
      GB: ['ENG', 'SCT', 'WLS', 'NIR'],
      AU: ['NSW', 'VIC', 'QLD', 'WA'],
      DE: ['BY', 'NW', 'BW', 'NI'],
      NZ: ['AUK', 'WGN', 'CAN', 'OTA']
    };
    
    const regionList = regions[countryCode] || ['UNK'];
    return this.randomChoice(regionList);
  }

  generateCity(countryCode) {
    const cities = {
      US: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'],
      CA: ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa'],
      GB: ['London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow'],
      AU: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide'],
      DE: ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt'],
      NZ: ['Auckland', 'Wellington', 'Christchurch', 'Hamilton', 'Tauranga']
    };
    
    const cityList = cities[countryCode] || ['Unknown'];
    return this.randomChoice(cityList);
  }

  generateISP(countryCode) {
    const isps = {
      US: ['Comcast', 'Verizon', 'AT&T', 'Charter', 'Cox'],
      CA: ['Rogers', 'Bell', 'Telus', 'Shaw', 'Videotron'],
      GB: ['BT', 'Virgin Media', 'Sky', 'TalkTalk', 'Plusnet'],
      AU: ['Telstra', 'Optus', 'TPG', 'Vodafone', 'iiNet'],
      DE: ['Deutsche Telekom', 'Vodafone', 'O2', '1&1', 'Unitymedia'],
      NZ: ['Spark', 'Vodafone', '2degrees', 'Orcon', 'Slingshot']
    };
    
    const ispList = isps[countryCode] || ['Unknown ISP'];
    return this.randomChoice(ispList);
  }

  generateUserAgent(browser, os) {
    const templates = {
      Chrome: `Mozilla/5.0 (${os.name === 'Windows' ? 'Windows NT 10.0; Win64; x64' : os.name === 'macOS' ? 'Macintosh; Intel Mac OS X 10_15_7' : 'X11; Linux x86_64'}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${browser.versions[0]} Safari/537.36`,
      Firefox: `Mozilla/5.0 (${os.name === 'Windows' ? 'Windows NT 10.0; Win64; x64' : os.name === 'macOS' ? 'Macintosh; Intel Mac OS X 10.15' : 'X11; Linux x86_64'}; rv:${browser.versions[0]}) Gecko/20100101 Firefox/${browser.versions[0]}`,
      Safari: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${browser.versions[0]} Safari/605.1.15`
    };
    
    return templates[browser.name] || templates.Chrome;
  }

  /**
   * Main generation function
   */
  async generate() {
    if (options.dryRun) {
      console.log(`🧪 DRY RUN: Would generate ${options.count} records`);
      console.log(`   Clean old: ${options.cleanOld}`);
      console.log(`   Force fresh: ${options.forceFresh}`);
      return;
    }

    console.log(`🎯 Generating ${options.count} fresh mock device fingerprinting records...`);

    try {
      // Define risk distribution targets
      const riskTargets = {
        minimal: Math.floor(options.count * 0.4),  // 40%
        low: Math.floor(options.count * 0.3),      // 30%
        medium: Math.floor(options.count * 0.2),   // 20%
        high: Math.floor(options.count * 0.08),    // 8%
        critical: Math.floor(options.count * 0.02) // 2%
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
          console.log(`✅ Generated ${generated}/${options.count} records (${Math.round(generated/options.count*100)}%)`);
        }
      }

      console.log('🎉 Fresh mock data generation completed!');
      console.log('\n📈 Target Risk Distribution:');
      
      Object.entries(riskTargets).forEach(([level, count]) => {
        console.log(`   ${level}: ${count} records`);
      });

      // Verify uniqueness
      const totalFingerprints = await UserDevice.count({
        distinct: true,
        col: 'device_fingerprint'
      });
      
      const totalDevices = await UserDevice.count();
      
      console.log(`\n🔍 Uniqueness Check:`);
      console.log(`   Total devices: ${totalDevices}`);
      console.log(`   Unique fingerprints: ${totalFingerprints}`);
      console.log(`   Duplicate rate: ${((totalDevices - totalFingerprints) / totalDevices * 100).toFixed(2)}%`);

    } catch (error) {
      console.error('❌ Error generating mock data:', error);
      throw error;
    }
  }
}

// Main execution
async function main() {
  console.log('🚀 Enhanced Device Fingerprinting Mock Data Generator');
  console.log('==================================================');
  
  if (options.dryRun) {
    console.log('🧪 DRY RUN MODE - No changes will be made');
  }
  
  console.log(`📋 Configuration:`);
  console.log(`   Records to generate: ${options.count}`);
  console.log(`   Clean old data: ${options.cleanOld}`);
  console.log(`   Force fresh: ${options.forceFresh}`);
  console.log(`   Dry run: ${options.dryRun}\n`);

  try {
    const generator = new EnhancedMockDataGenerator();
    await generator.initialize();
    await generator.cleanupOldData();
    await generator.generate();
    
    console.log('\n✅ All operations completed successfully!');
    console.log('🌐 Fresh data is now available for analytics dashboard');
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the generator
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { EnhancedMockDataGenerator };
