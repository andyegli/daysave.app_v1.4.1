/**
 * Device Fingerprinting Client Library
 * 
 * Generates comprehensive device fingerprints for fraud detection and security.
 * Uses FingerprintJS along with additional browser characteristics.
 * 
 * @version 1.0.0
 * @author DaySave Security Team
 */

class DeviceFingerprint {
  constructor() {
    this.fingerprint = null;
    this.components = {};
    this.isLoaded = false;
  }

  /**
   * Initialize and generate device fingerprint
   * @returns {Promise<Object>} Fingerprint data
   */
  async generate() {
    try {
      // Load FingerprintJS
      const fp = await FingerprintJS.load();
      const result = await fp.get();

      // Get additional browser characteristics
      const additionalData = await this.getAdditionalCharacteristics();

      // Combine all fingerprint components
      this.components = {
        // Core fingerprint from FingerprintJS
        visitorId: result.visitorId,
        components: result.components,
        
        // Additional characteristics
        ...additionalData,
        
        // Timestamp and session info
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        language: navigator.language,
        languages: navigator.languages,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack
      };

      // Generate composite hash
      this.fingerprint = await this.generateHash(this.components);
      this.isLoaded = true;

      console.log('🔍 Device fingerprint generated:', {
        id: this.fingerprint.substring(0, 8) + '...',
        components: Object.keys(this.components).length
      });

      return {
        fingerprint: this.fingerprint,
        components: this.components
      };

    } catch (error) {
      console.error('❌ Error generating device fingerprint:', error);
      
      // Fallback fingerprint using basic characteristics
      const fallbackData = await this.generateFallbackFingerprint();
      this.fingerprint = fallbackData.fingerprint;
      this.components = fallbackData.components;
      this.isLoaded = true;

      return fallbackData;
    }
  }

  /**
   * Get additional browser and device characteristics
   * @returns {Promise<Object>} Additional characteristics
   */
  async getAdditionalCharacteristics() {
    const characteristics = {};

    try {
      // Screen information
      characteristics.screen = {
        width: screen.width,
        height: screen.height,
        availWidth: screen.availWidth,
        availHeight: screen.availHeight,
        colorDepth: screen.colorDepth,
        pixelDepth: screen.pixelDepth,
        orientation: screen.orientation?.type || 'unknown'
      };

      // Viewport information
      characteristics.viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio
      };

      // Timezone information
      characteristics.timezone = {
        offset: new Date().getTimezoneOffset(),
        resolved: Intl.DateTimeFormat().resolvedOptions().timeZone
      };

      // Canvas fingerprinting
      characteristics.canvas = await this.generateCanvasFingerprint();

      // WebGL fingerprinting
      characteristics.webgl = this.generateWebGLFingerprint();

      // Audio context fingerprinting
      characteristics.audio = await this.generateAudioFingerprint();

      // Font detection
      characteristics.fonts = this.detectFonts();

      // Hardware information
      characteristics.hardware = {
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: navigator.deviceMemory,
        maxTouchPoints: navigator.maxTouchPoints
      };

      // Network information (if available)
      if (navigator.connection) {
        characteristics.network = {
          effectiveType: navigator.connection.effectiveType,
          downlink: navigator.connection.downlink,
          rtt: navigator.connection.rtt
        };
      }

    } catch (error) {
      console.warn('⚠️ Some characteristics could not be collected:', error);
    }

    return characteristics;
  }

  /**
   * Generate canvas fingerprint
   * @returns {Promise<string>} Canvas fingerprint
   */
  async generateCanvasFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = 200;
      canvas.height = 50;

      // Draw text with different fonts and styles
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      
      ctx.fillStyle = '#069';
      ctx.fillText('🔍 DaySave Security Test 123', 2, 15);
      
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('🔒 Device Fingerprint', 4, 35);

      // Get canvas data
      const dataURL = canvas.toDataURL();
      
      // Generate hash of canvas data
      return await this.simpleHash(dataURL);
    } catch (error) {
      console.warn('Canvas fingerprinting failed:', error);
      return 'canvas_unavailable';
    }
  }

  /**
   * Generate WebGL fingerprint
   * @returns {string} WebGL fingerprint
   */
  generateWebGLFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (!gl) {
        return 'webgl_unavailable';
      }

      const renderer = gl.getParameter(gl.RENDERER);
      const vendor = gl.getParameter(gl.VENDOR);
      const version = gl.getParameter(gl.VERSION);
      const shadingLanguageVersion = gl.getParameter(gl.SHADING_LANGUAGE_VERSION);

      const extensions = gl.getSupportedExtensions() || [];

      return JSON.stringify({
        renderer,
        vendor,
        version,
        shadingLanguageVersion,
        extensions: extensions.sort()
      });

    } catch (error) {
      console.warn('WebGL fingerprinting failed:', error);
      return 'webgl_error';
    }
  }

  /**
   * Generate audio context fingerprint
   * @returns {Promise<string>} Audio fingerprint
   */
  async generateAudioFingerprint() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      const oscillator = audioContext.createOscillator();
      const analyser = audioContext.createAnalyser();
      const gainNode = audioContext.createGain();
      const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);

      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(10000, audioContext.currentTime);

      gainNode.gain.setValueAtTime(0, audioContext.currentTime);

      oscillator.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start(0);

      const audioData = new Float32Array(analyser.frequencyBinCount);
      analyser.getFloatFrequencyData(audioData);

      oscillator.stop();
      audioContext.close();

      // Convert audio data to fingerprint
      let sum = 0;
      for (let i = 0; i < audioData.length; i++) {
        sum += Math.abs(audioData[i]);
      }

      return sum.toString();

    } catch (error) {
      console.warn('Audio fingerprinting failed:', error);
      return 'audio_unavailable';
    }
  }

  /**
   * Detect available fonts
   * @returns {Array<string>} List of available fonts
   */
  detectFonts() {
    const baseFonts = ['monospace', 'sans-serif', 'serif'];
    const testFonts = [
      'Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Verdana',
      'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS',
      'Trebuchet MS', 'Arial Black', 'Impact', 'Lucida Sans Unicode',
      'Tahoma', 'Lucida Console', 'Monaco', 'Courier', 'Times'
    ];

    const availableFonts = [];
    const testString = 'mmmmmmmmmmlli';
    const testSize = '72px';

    // Create test elements
    const testElement = document.createElement('span');
    testElement.style.fontSize = testSize;
    testElement.style.position = 'absolute';
    testElement.style.left = '-9999px';
    testElement.innerHTML = testString;
    document.body.appendChild(testElement);

    // Test each font
    for (const font of testFonts) {
      const baseMeasurements = [];
      
      // Measure with base fonts
      for (const baseFont of baseFonts) {
        testElement.style.fontFamily = baseFont;
        baseMeasurements.push({
          width: testElement.offsetWidth,
          height: testElement.offsetHeight
        });
      }

      // Test with target font + base font fallback
      let fontAvailable = false;
      for (let i = 0; i < baseFonts.length; i++) {
        testElement.style.fontFamily = `${font}, ${baseFonts[i]}`;
        const measurement = {
          width: testElement.offsetWidth,
          height: testElement.offsetHeight
        };

        if (measurement.width !== baseMeasurements[i].width || 
            measurement.height !== baseMeasurements[i].height) {
          fontAvailable = true;
          break;
        }
      }

      if (fontAvailable) {
        availableFonts.push(font);
      }
    }

    document.body.removeChild(testElement);
    return availableFonts.sort();
  }

  /**
   * Generate fallback fingerprint when main method fails
   * @returns {Promise<Object>} Fallback fingerprint data
   */
  async generateFallbackFingerprint() {
    const components = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
      timezone: new Date().getTimezoneOffset(),
      timestamp: Date.now(),
      cookieEnabled: navigator.cookieEnabled,
      fallback: true
    };

    const fingerprint = await this.simpleHash(JSON.stringify(components));

    console.warn('⚠️ Using fallback fingerprint method');

    return { fingerprint, components };
  }

  /**
   * Generate hash from fingerprint components
   * @param {Object} data - Data to hash
   * @returns {Promise<string>} Hash string
   */
  async generateHash(data) {
    const jsonString = JSON.stringify(data, Object.keys(data).sort());
    return await this.simpleHash(jsonString);
  }

  /**
   * Simple hash function using crypto API
   * @param {string} str - String to hash
   * @returns {Promise<string>} Hash string
   */
  async simpleHash(str) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      // Fallback to simple hash if crypto API not available
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash).toString(16);
    }
  }

  /**
   * Get current fingerprint
   * @returns {string} Current fingerprint
   */
  getFingerprint() {
    return this.fingerprint;
  }

  /**
   * Get fingerprint components
   * @returns {Object} Fingerprint components
   */
  getComponents() {
    return this.components;
  }

  /**
   * Check if fingerprint is loaded
   * @returns {boolean} Whether fingerprint is ready
   */
  isReady() {
    return this.isLoaded;
  }
}

// Global instance
window.deviceFingerprint = new DeviceFingerprint();

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.deviceFingerprint.generate();
  });
} else {
  window.deviceFingerprint.generate();
}