/**
 * Enhance Device Fingerprint Details
 * 
 * Adds comprehensive device fingerprint details to existing UserDevice records
 * including browser info, OS details, hardware specs, and advanced fingerprinting data.
 */

const { UserDevice } = require('../models');

// Realistic device configurations
const deviceConfigs = [
  {
    type: 'desktop',
    browser: { name: 'Chrome', version: '119.0.6045.105' },
    os: { name: 'Windows', version: '11' },
    screen: '1920x1080',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    details: {
      hardware: {
        cpuCores: 8,
        memory: 16384, // GB
        gpu: 'NVIDIA GeForce RTX 3070',
        architecture: 'x64'
      },
      display: {
        colorDepth: 24,
        pixelRatio: 1,
        availableScreenSize: '1920x1040',
        timezone: 'America/New_York'
      },
      browser: {
        language: 'en-US',
        languages: ['en-US', 'en'],
        cookieEnabled: true,
        doNotTrack: false,
        javaEnabled: false,
        onlineStatus: true
      },
      webgl: {
        vendor: 'Google Inc. (NVIDIA)',
        renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0, D3D11)',
        version: 'WebGL 1.0 (OpenGL ES 2.0 Chromium)'
      },
      canvas: {
        hash: 'a1b2c3d4e5f6789012345678901234567890abcd',
        fonts: ['Arial', 'Times New Roman', 'Courier New', 'Helvetica', 'Georgia']
      },
      audio: {
        hash: 'audio_fp_12345678901234567890abcdef123456',
        sampleRate: 44100,
        channels: 2
      }
    }
  },
  {
    type: 'mobile',
    browser: { name: 'Safari', version: '17.1' },
    os: { name: 'iOS', version: '17.1.1' },
    screen: '393x852',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
    details: {
      hardware: {
        cpuCores: 6,
        memory: 6144,
        gpu: 'Apple A16 Bionic GPU',
        architecture: 'arm64'
      },
      display: {
        colorDepth: 24,
        pixelRatio: 3,
        availableScreenSize: '393x852',
        timezone: 'America/Los_Angeles'
      },
      browser: {
        language: 'en-US',
        languages: ['en-US', 'en'],
        cookieEnabled: true,
        doNotTrack: false,
        javaEnabled: false,
        onlineStatus: true,
        touchSupport: true
      },
      webgl: {
        vendor: 'Apple Inc.',
        renderer: 'Apple A16 Bionic GPU',
        version: 'WebGL 1.0 (OpenGL ES 2.0)'
      },
      canvas: {
        hash: 'mobile_canvas_fp_987654321abcdef1234567890',
        fonts: ['Helvetica', 'Arial', 'Times New Roman', 'Courier']
      },
      audio: {
        hash: 'mobile_audio_fp_abcdef1234567890123456789',
        sampleRate: 48000,
        channels: 2
      }
    }
  },
  {
    type: 'laptop',
    browser: { name: 'Firefox', version: '119.0' },
    os: { name: 'macOS', version: '14.1' },
    screen: '1440x900',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.1; rv:119.0) Gecko/20100101 Firefox/119.0',
    details: {
      hardware: {
        cpuCores: 8,
        memory: 16384,
        gpu: 'Apple M2',
        architecture: 'arm64'
      },
      display: {
        colorDepth: 24,
        pixelRatio: 2,
        availableScreenSize: '1440x875',
        timezone: 'America/Vancouver'
      },
      browser: {
        language: 'en-CA',
        languages: ['en-CA', 'en', 'fr'],
        cookieEnabled: true,
        doNotTrack: true,
        javaEnabled: false,
        onlineStatus: true
      },
      webgl: {
        vendor: 'Apple Inc.',
        renderer: 'Apple M2',
        version: 'WebGL 1.0 (OpenGL ES 2.0)'
      },
      canvas: {
        hash: 'mac_canvas_fp_fedcba0987654321abcdef123456',
        fonts: ['Helvetica', 'Arial', 'Times New Roman', 'Courier New', 'Monaco']
      },
      audio: {
        hash: 'mac_audio_fp_123456789abcdef0987654321',
        sampleRate: 44100,
        channels: 2
      }
    }
  },
  {
    type: 'tablet',
    browser: { name: 'Chrome', version: '119.0.6045.66' },
    os: { name: 'Android', version: '13' },
    screen: '1024x768',
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-T970) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    details: {
      hardware: {
        cpuCores: 8,
        memory: 8192,
        gpu: 'Adreno 650',
        architecture: 'arm64-v8a'
      },
      display: {
        colorDepth: 24,
        pixelRatio: 2,
        availableScreenSize: '1024x768',
        timezone: 'Europe/London'
      },
      browser: {
        language: 'en-GB',
        languages: ['en-GB', 'en'],
        cookieEnabled: true,
        doNotTrack: false,
        javaEnabled: false,
        onlineStatus: true,
        touchSupport: true
      },
      webgl: {
        vendor: 'Qualcomm',
        renderer: 'Adreno (TM) 650',
        version: 'WebGL 1.0 (OpenGL ES 2.0)'
      },
      canvas: {
        hash: 'tablet_canvas_fp_456789012345678901234567',
        fonts: ['Roboto', 'Arial', 'Helvetica', 'sans-serif']
      },
      audio: {
        hash: 'tablet_audio_fp_789012345678901234567890',
        sampleRate: 48000,
        channels: 2
      }
    }
  },
  {
    type: 'desktop',
    browser: { name: 'Edge', version: '119.0.2151.44' },
    os: { name: 'Windows', version: '10' },
    screen: '2560x1440',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.2151.44',
    details: {
      hardware: {
        cpuCores: 12,
        memory: 32768,
        gpu: 'AMD Radeon RX 6800 XT',
        architecture: 'x64'
      },
      display: {
        colorDepth: 24,
        pixelRatio: 1.25,
        availableScreenSize: '2560x1400',
        timezone: 'Europe/Berlin'
      },
      browser: {
        language: 'de-DE',
        languages: ['de-DE', 'de', 'en-US', 'en'],
        cookieEnabled: true,
        doNotTrack: false,
        javaEnabled: false,
        onlineStatus: true
      },
      webgl: {
        vendor: 'Microsoft Corporation',
        renderer: 'ANGLE (AMD, AMD Radeon RX 6800 XT Direct3D11 vs_5_0 ps_5_0, D3D11)',
        version: 'WebGL 1.0 (OpenGL ES 2.0 Chromium)'
      },
      canvas: {
        hash: 'edge_canvas_fp_abcdef1234567890abcdef123456',
        fonts: ['Segoe UI', 'Arial', 'Times New Roman', 'Calibri', 'Verdana']
      },
      audio: {
        hash: 'edge_audio_fp_fedcba9876543210fedcba987654',
        sampleRate: 44100,
        channels: 2
      }
    }
  },
  {
    type: 'mobile',
    browser: { name: 'Chrome', version: '119.0.6045.66' },
    os: { name: 'Android', version: '14' },
    screen: '412x915',
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
    details: {
      hardware: {
        cpuCores: 8,
        memory: 8192,
        gpu: 'Mali-G715 MC7',
        architecture: 'arm64-v8a'
      },
      display: {
        colorDepth: 24,
        pixelRatio: 2.625,
        availableScreenSize: '412x915',
        timezone: 'Australia/Sydney'
      },
      browser: {
        language: 'en-AU',
        languages: ['en-AU', 'en'],
        cookieEnabled: true,
        doNotTrack: false,
        javaEnabled: false,
        onlineStatus: true,
        touchSupport: true
      },
      webgl: {
        vendor: 'ARM',
        renderer: 'Mali-G715 MC7',
        version: 'WebGL 1.0 (OpenGL ES 2.0)'
      },
      canvas: {
        hash: 'pixel_canvas_fp_1234567890abcdef1234567890',
        fonts: ['Roboto', 'sans-serif', 'serif', 'monospace']
      },
      audio: {
        hash: 'pixel_audio_fp_abcdef1234567890abcdef123',
        sampleRate: 48000,
        channels: 2
      }
    }
  }
];

// Additional timezone variations
const timezones = [
  'America/New_York', 'America/Los_Angeles', 'America/Chicago', 'America/Denver',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Rome',
  'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Singapore', 'Asia/Dubai',
  'Australia/Sydney', 'Australia/Melbourne', 'Pacific/Auckland'
];

async function enhanceDeviceFingerprints() {
  console.log('🔍 Enhancing device fingerprint details...');
  
  try {
    const devices = await UserDevice.findAll();
    console.log(`Found ${devices.length} devices to enhance`);
    
    if (devices.length === 0) {
      console.log('❌ No devices found. Please run populate-device-fingerprinting-data.js first.');
      return;
    }
    
    let enhanced = 0;
    
    for (const device of devices) {
      // Skip if already enhanced
      if (device.device_details && Object.keys(device.device_details).length > 0) {
        console.log(`⏩ Skipping device ${device.device_fingerprint.substring(0, 20)}... (already enhanced)`);
        continue;
      }
      
      // Select a random device configuration
      const config = deviceConfigs[enhanced % deviceConfigs.length];
      
      // Add some variation to the configuration
      const enhancedConfig = JSON.parse(JSON.stringify(config)); // Deep clone
      
      // Randomize some values
      enhancedConfig.details.display.timezone = timezones[Math.floor(Math.random() * timezones.length)];
      enhancedConfig.details.hardware.memory += Math.floor(Math.random() * 8192); // Add 0-8GB variation
      enhancedConfig.details.browser.doNotTrack = Math.random() > 0.7; // 30% have DNT enabled
      
      // Generate unique hashes based on device fingerprint
      const deviceHash = device.device_fingerprint.substring(device.device_fingerprint.length - 8);
      enhancedConfig.details.canvas.hash = `canvas_${deviceHash}_${Date.now().toString(36)}`;
      enhancedConfig.details.audio.hash = `audio_${deviceHash}_${Date.now().toString(36)}`;
      
      // Update device with enhanced details
      await device.update({
        browser_name: enhancedConfig.browser.name,
        browser_version: enhancedConfig.browser.version,
        os_name: enhancedConfig.os.name,
        os_version: enhancedConfig.os.version,
        device_type: enhancedConfig.type,
        screen_resolution: enhancedConfig.screen,
        user_agent: enhancedConfig.userAgent,
        device_details: enhancedConfig.details,
        timezone: enhancedConfig.details.display.timezone
      });
      
      console.log(`✅ Enhanced device: ${device.device_fingerprint.substring(0, 30)}... (${enhancedConfig.type}, ${enhancedConfig.browser.name}/${enhancedConfig.os.name})`);
      enhanced++;
    }
    
    console.log('');
    console.log('================================');
    console.log(`✅ Enhanced ${enhanced} device fingerprints successfully!`);
    console.log('📊 Device breakdown:');
    
    // Show summary
    const summary = await UserDevice.findAll({
      attributes: ['device_type', 'browser_name', 'os_name'],
      where: {
        device_details: { [require('sequelize').Op.not]: null }
      }
    });
    
    const counts = {};
    summary.forEach(device => {
      const key = `${device.device_type} - ${device.browser_name}/${device.os_name}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    
    Object.entries(counts).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} devices`);
    });
    
    console.log('🌐 Device fingerprinting dashboard now shows detailed device information!');
    console.log('================================');
    
  } catch (error) {
    console.error('❌ Error enhancing device fingerprints:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  enhanceDeviceFingerprints();
}

module.exports = { enhanceDeviceFingerprints };