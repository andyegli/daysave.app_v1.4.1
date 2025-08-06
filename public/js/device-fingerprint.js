/**
 * Device Fingerprint Collection
 * TEMPORARILY DISABLED FOR DEBUGGING REDIRECT LOOP
 */

console.log('🔍 Device fingerprinting initialized - DISABLED FOR DEBUGGING');

// All fingerprinting functionality disabled
window.deviceFingerprint = {
  isReady: () => true,
  getFingerprint: () => null,
  getComponents: () => null,
  generate: () => Promise.resolve()
};

console.log('✅ Device fingerprinting DISABLED for debugging');