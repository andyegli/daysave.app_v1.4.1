/**
 * Populate Device Fingerprinting Test Data
 * 
 * Creates sample login attempts and user devices for testing
 * the device fingerprinting admin dashboard.
 */

const { User, UserDevice, LoginAttempt } = require('../models');

const sampleIPs = [
  '192.168.1.100', '10.0.0.50', '203.0.113.45', '198.51.100.22',
  '172.16.0.75', '203.0.113.67', '198.51.100.89', '10.0.0.123'
];

const sampleCountries = ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'JP', 'NZ'];

const sampleCities = [
  'New York', 'London', 'Sydney', 'Toronto', 'Berlin', 
  'Paris', 'Tokyo', 'Auckland', 'San Francisco', 'Los Angeles'
];

const sampleFingerprints = [
  'fp_desktop_chrome_123456789abcdef',
  'fp_mobile_safari_987654321fedcba', 
  'fp_laptop_firefox_456789123abcdef',
  'fp_tablet_chrome_789123456defabc',
  'fp_desktop_edge_321654987cdefab',
  'fp_mobile_chrome_654987321fabcde',
  'fp_laptop_safari_987321654bcdeaf',
  'fp_desktop_opera_147258369acebdf'
];

const sampleReasons = [
  'Invalid password',
  'Account locked',
  'User not found',
  'MFA required',
  'Device not trusted',
  'Too many attempts',
  'Session expired',
  'IP blocked'
];

async function createSampleUserDevices() {
  console.log('📱 Creating sample user devices...');
  
  const users = await User.findAll({ limit: 5 });
  if (users.length === 0) {
    console.log('❌ No users found. Please create users first.');
    return [];
  }

  const devices = [];
  
  for (let i = 0; i < 15; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const country = sampleCountries[Math.floor(Math.random() * sampleCountries.length)];
    const city = sampleCities[Math.floor(Math.random() * sampleCities.length)];
    
    const device = await UserDevice.create({
      user_id: user.id,
      device_fingerprint: sampleFingerprints[Math.floor(Math.random() * sampleFingerprints.length)] + '_' + i,
      is_trusted: Math.random() > 0.3, // 70% trusted devices
      last_login_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random time in last 30 days
      country: country,
      city: city,
      latitude: (Math.random() - 0.5) * 180,
      longitude: (Math.random() - 0.5) * 360,
      location_confidence: Math.random() * 0.4 + 0.6 // 0.6 to 1.0
    });
    
    devices.push(device);
  }
  
  console.log(`✅ Created ${devices.length} sample user devices`);
  return devices;
}

async function createSampleLoginAttempts() {
  console.log('🔐 Creating sample login attempts...');
  
  const users = await User.findAll({ limit: 5 });
  if (users.length === 0) {
    console.log('❌ No users found. Please create users first.');
    return;
  }

  const attempts = [];
  
  for (let i = 0; i < 50; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const isSuccess = Math.random() > 0.25; // 75% success rate
    const ip = sampleIPs[Math.floor(Math.random() * sampleIPs.length)];
    const country = sampleCountries[Math.floor(Math.random() * sampleCountries.length)];
    const city = sampleCities[Math.floor(Math.random() * sampleCities.length)];
    const fingerprint = sampleFingerprints[Math.floor(Math.random() * sampleFingerprints.length)] + '_' + (i % 8);
    const attemptTime = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Random time in last 7 days
    
    const attempt = await LoginAttempt.create({
      user_id: user.id,
      device_fingerprint: fingerprint,
      ip: ip,
      ip_address: ip, // New field
      attempt_count: Math.floor(Math.random() * 5) + 1,
      last_attempt_at: attemptTime,
      attempted_at: attemptTime, // New field
      success: isSuccess, // New field
      failure_reason: isSuccess ? null : sampleReasons[Math.floor(Math.random() * sampleReasons.length)], // New field
      country: country,
      city: city,
      latitude: (Math.random() - 0.5) * 180,
      longitude: (Math.random() - 0.5) * 360,
      is_vpn: Math.random() > 0.8 // 20% VPN usage
    });
    
    attempts.push(attempt);
  }
  
  console.log(`✅ Created ${attempts.length} sample login attempts`);
  return attempts;
}

async function main() {
  try {
    console.log('🚀 Starting device fingerprinting data population...');
    console.log('================================');
    
    const devices = await createSampleUserDevices();
    const attempts = await createSampleLoginAttempts();
    
    console.log('================================');
    console.log('✅ Device fingerprinting test data created successfully!');
    console.log(`📱 User Devices: ${devices.length}`);
    console.log(`🔐 Login Attempts: ${attempts.length}`);
    console.log('🌐 You can now view the admin dashboard at: http://localhost:3000/admin/device-fingerprinting');
    console.log('================================');
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { createSampleUserDevices, createSampleLoginAttempts };