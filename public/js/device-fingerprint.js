/**
 * Device Fingerprint Collection
 * Smart fingerprinting that works with both proxy and direct connections
 */

console.log('🔍 Device fingerprinting initialized');

// Wait for FingerprintJS to be available
let fpPromise = null;

// Initialize device fingerprint functionality
window.deviceFingerprint = {
  isReady: () => fpPromise !== null,
  getFingerprint: () => window.deviceFingerprint._cachedFingerprint || null,
  getComponents: () => window.deviceFingerprint._cachedComponents || null,
  generate: generateFingerprint,
  _cachedFingerprint: null,
  _cachedComponents: null
};

/**
 * Generate device fingerprint
 */
async function generateFingerprint() {
  try {
    console.log('🔍 Generating device fingerprint...');
    
    // Initialize FingerprintJS if not already done
    if (!fpPromise && window.FingerprintJS) {
      fpPromise = window.FingerprintJS.load();
    }
    
    if (!fpPromise) {
      console.warn('⚠️ FingerprintJS not available');
      return null;
    }

    const fp = await fpPromise;
    const result = await fp.get();
    
    // Cache the results
    window.deviceFingerprint._cachedFingerprint = result.visitorId;
    window.deviceFingerprint._cachedComponents = result.components;
    
    console.log('✅ Device fingerprint generated:', result.visitorId);
    return result.visitorId;
    
  } catch (error) {
    console.error('❌ Error generating fingerprint:', error);
    return null;
  }
}

// Auto-generate fingerprint when page loads
document.addEventListener('DOMContentLoaded', function() {
  // Small delay to ensure FingerprintJS is loaded
  setTimeout(() => {
    generateFingerprint();
  }, 100);
});

console.log('✅ Device fingerprinting ENABLED');