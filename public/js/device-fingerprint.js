/**
 * Device Fingerprint Collection for DaySave
 * 
 * Collects device fingerprint data for security and fraud detection.
 * Uses FingerprintJS Pro for comprehensive device identification.
 * 
 * @version 1.2.0
 * @author DaySave Security Team
 */

console.log('🔍 Device fingerprinting initialized');

class DeviceFingerprint {
  constructor() {
    this.fingerprint = null;
    this.components = null;
    this.ready = false;
    this.fpInstance = null;
    
    this.init();
  }

  async init() {
    try {
      console.log('🔍 Initializing FingerprintJS...');
      
      // Wait for FingerprintJS to be available
      if (typeof FingerprintJS === 'undefined') {
        console.warn('⚠️ FingerprintJS not loaded, using fallback fingerprinting');
        this.initFallback();
        return;
      }

      // Initialize FingerprintJS
      this.fpInstance = await FingerprintJS.load();
      
      // Generate initial fingerprint
      await this.generate();
      
      console.log('✅ Device fingerprinting ready');
    } catch (error) {
      console.error('❌ Error initializing fingerprinting:', error);
      this.initFallback();
    }
  }

  initFallback() {
    console.log('🔧 Using fallback fingerprinting');
    
    // Basic fallback fingerprinting
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('DaySave fingerprint', 2, 2);
    
    const basicFingerprint = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screen: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      canvas: canvas.toDataURL()
    };

    this.fingerprint = this.hashString(JSON.stringify(basicFingerprint));
    this.components = basicFingerprint;
    this.ready = true;
  }

  async generate() {
    if (!this.fpInstance) {
      console.warn('⚠️ FingerprintJS not available, using cached data');
      return;
    }

    try {
      console.log('🔍 Generating device fingerprint...');
      
      const result = await this.fpInstance.get();
      
      this.fingerprint = result.visitorId;
      this.components = result.components;
      this.ready = true;
      
      console.log('✅ Device fingerprint generated:', this.fingerprint.substring(0, 8) + '...');
    } catch (error) {
      console.error('❌ Error generating fingerprint:', error);
      this.initFallback();
    }
  }

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  isReady() {
    return this.ready;
  }

  getFingerprint() {
    return this.fingerprint;
  }

  getComponents() {
    return this.components;
  }

  // Additional device information
  getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
      hardwareConcurrency: navigator.hardwareConcurrency,
      maxTouchPoints: navigator.maxTouchPoints,
      screen: {
        width: screen.width,
        height: screen.height,
        availWidth: screen.availWidth,
        availHeight: screen.availHeight,
        colorDepth: screen.colorDepth,
        pixelDepth: screen.pixelDepth
      },
      timezone: {
        name: Intl.DateTimeFormat().resolvedOptions().timeZone,
        offset: new Date().getTimezoneOffset()
      }
    };
  }
}

// Initialize global device fingerprint instance
window.deviceFingerprint = new DeviceFingerprint();

console.log('✅ Device fingerprinting loaded');