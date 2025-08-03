/**
 * Login Authentication with Device Fingerprinting
 * 
 * Enhances login forms with device fingerprint collection for security.
 * Integrates with device fingerprinting middleware for fraud detection.
 * 
 * @version 1.0.0
 * @author DaySave Security Team
 */

document.addEventListener('DOMContentLoaded', function() {
  console.log('🔍 Login fingerprinting initialized');

  // Elements
  const loginForm = document.querySelector('form[action="/auth/login"]');
  const passkeyButton = document.querySelector('.passkey-login-btn');
  const oauthLinks = document.querySelectorAll('a[href^="/auth/"]');

  let fingerprintData = null;

  /**
   * Initialize fingerprint collection
   */
  async function initializeFingerprinting() {
    try {
      console.log('🔍 Collecting device fingerprint...');
      
      // Wait for device fingerprint to be ready
      if (window.deviceFingerprint) {
        await waitForFingerprint();
        fingerprintData = {
          fingerprint: window.deviceFingerprint.getFingerprint(),
          components: window.deviceFingerprint.getComponents()
        };
        
        console.log('✅ Device fingerprint collected');
      } else {
        console.warn('⚠️ Device fingerprinting not available');
      }
    } catch (error) {
      console.error('❌ Error collecting fingerprint:', error);
    }
  }

  /**
   * Wait for fingerprint to be ready
   */
  function waitForFingerprint() {
    return new Promise((resolve) => {
      const checkReady = () => {
        if (window.deviceFingerprint.isReady()) {
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
    });
  }

  /**
   * Add fingerprint to form data
   */
  function addFingerprintToForm(form) {
    if (!fingerprintData) {
      console.warn('⚠️ No fingerprint data available');
      return;
    }

    // Remove any existing fingerprint inputs
    const existingInputs = form.querySelectorAll('input[name="deviceFingerprint"]');
    existingInputs.forEach(input => input.remove());

    // Add fingerprint as hidden input
    const fingerprintInput = document.createElement('input');
    fingerprintInput.type = 'hidden';
    fingerprintInput.name = 'deviceFingerprint';
    fingerprintInput.value = JSON.stringify(fingerprintData);
    
    form.appendChild(fingerprintInput);
    
    console.log('🔍 Added fingerprint to form submission');
  }

  /**
   * Add fingerprint to URL parameters for OAuth
   */
  function addFingerprintToUrl(url) {
    if (!fingerprintData) {
      return url;
    }

    try {
      const urlObj = new URL(url, window.location.origin);
      urlObj.searchParams.set('deviceFingerprint', JSON.stringify(fingerprintData));
      return urlObj.toString();
    } catch (error) {
      console.error('❌ Error adding fingerprint to URL:', error);
      return url;
    }
  }

  /**
   * Show security status indicator
   */
  function showSecurityStatus() {
    // Create security indicator
    const indicator = document.createElement('div');
    indicator.className = 'alert alert-info alert-dismissible fade show mt-3';
    indicator.innerHTML = `
      <i class="fas fa-shield-alt me-2"></i>
      <small>
        <strong>Security Active:</strong> Device fingerprinting enabled for enhanced security.
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </small>
    `;

    // Add to login container
    const container = document.querySelector('.login-container');
    if (container) {
      container.appendChild(indicator);
      
      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.remove();
        }
      }, 5000);
    }
  }

  /**
   * Handle form submission with fingerprinting
   */
  function handleFormSubmission(event) {
    const form = event.target;
    
    console.log('📝 Processing form submission with fingerprinting');
    
    // Add fingerprint to form
    addFingerprintToForm(form);
    
    // Show loading state
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
      const originalText = submitButton.innerHTML;
      submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Authenticating...';
      submitButton.disabled = true;
      
      // Re-enable after potential error
      setTimeout(() => {
        if (submitButton.disabled) {
          submitButton.innerHTML = originalText;
          submitButton.disabled = false;
        }
      }, 10000);
    }
  }

  /**
   * Handle OAuth link clicks
   */
  function handleOAuthClick(event) {
    // OAuth providers handle their own security, no need for additional fingerprinting
    // which can cause HTTP 431 "Request Header Fields Too Large" errors
    console.log('🔗 OAuth proceeding without fingerprint (OAuth provider handles security)');
    return;
  }

  /**
   * Handle passkey authentication
   */
  async function handlePasskeyAuth(event) {
    try {
      console.log('🔑 Starting passkey authentication with fingerprinting');
      
      // Collect fresh fingerprint for passkey
      if (window.deviceFingerprint) {
        await window.deviceFingerprint.generate();
        fingerprintData = {
          fingerprint: window.deviceFingerprint.getFingerprint(),
          components: window.deviceFingerprint.getComponents()
        };
      }

      // Add fingerprint to passkey authentication
      if (window.passkeyClient && fingerprintData) {
        // Store fingerprint for passkey flow
        sessionStorage.setItem('deviceFingerprint', JSON.stringify(fingerprintData));
        console.log('🔍 Fingerprint stored for passkey authentication');
      }

    } catch (error) {
      console.error('❌ Error in passkey fingerprinting:', error);
    }
  }

  /**
   * Setup event listeners
   */
  function setupEventListeners() {
    // Login form submission
    if (loginForm) {
      loginForm.addEventListener('submit', handleFormSubmission);
      console.log('📝 Login form fingerprinting enabled');
    }

    // OAuth links - fingerprinting disabled to prevent HTTP 431 errors
    oauthLinks.forEach(link => {
      link.addEventListener('click', handleOAuthClick);
    });
    
    if (oauthLinks.length > 0) {
      console.log('🔗 OAuth links prepared for', oauthLinks.length, 'providers (fingerprinting disabled)');
    }

    // Passkey button
    if (passkeyButton) {
      passkeyButton.addEventListener('click', handlePasskeyAuth);
      console.log('🔑 Passkey fingerprinting enabled');
    }
  }

  /**
   * Initialize everything
   */
  async function initialize() {
    try {
      // Wait a bit for other scripts to load
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Collect fingerprint
      await initializeFingerprinting();
      
      // Setup event listeners
      setupEventListeners();
      
      // Show security status if fingerprint collected
      if (fingerprintData) {
        showSecurityStatus();
      }
      
      console.log('✅ Login fingerprinting fully initialized');
      
    } catch (error) {
      console.error('❌ Login fingerprinting initialization failed:', error);
    }
  }

  // Start initialization
  initialize();

  // Global error handler for fingerprinting issues
  window.addEventListener('error', function(event) {
    if (event.error && event.error.message.includes('fingerprint')) {
      console.warn('⚠️ Fingerprinting error caught:', event.error);
      // Continue with authentication even if fingerprinting fails
    }
  });
});

/**
 * Utility function to get fingerprint data for other scripts
 */
window.getDeviceFingerprint = function() {
  if (window.deviceFingerprint && window.deviceFingerprint.isReady()) {
    return {
      fingerprint: window.deviceFingerprint.getFingerprint(),
      components: window.deviceFingerprint.getComponents()
    };
  }
  return null;
};