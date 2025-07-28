/**
 * DaySave Passkey Client
 * Handles WebAuthn passkey registration and authentication using native browser APIs
 */

class PasskeyClient {
  constructor() {
    this.isSupported = this.checkSupport();
    this.apiBase = '/passkeys';
  }

  /**
   * Check if WebAuthn is supported by the browser
   */
  checkSupport() {
    return !!(window.PublicKeyCredential && 
              navigator.credentials && 
              navigator.credentials.create && 
              navigator.credentials.get);
  }

  /**
   * Show user-friendly error messages
   */
  getErrorMessage(error) {
    const errorMessages = {
      'NotSupportedError': 'Passkeys are not supported on this device or browser.',
      'SecurityError': 'Passkey operation was blocked for security reasons. Please try again.',
      'NotAllowedError': 'Passkey operation was cancelled or timed out. Please try again.',
      'InvalidStateError': 'This passkey is already registered on this device.',
      'ConstraintError': 'Passkey requirements could not be satisfied.',
      'UnknownError': 'An unknown error occurred. Please try again.',
      'AbortError': 'Passkey operation was cancelled.'
    };

    return errorMessages[error.name] || errorMessages['UnknownError'];
  }

  /**
   * Convert ArrayBuffer to Base64URL
   */
  arrayBufferToBase64url(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach(byte => binary += String.fromCharCode(byte));
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  /**
   * Convert Base64URL to ArrayBuffer
   */
  base64urlToArrayBuffer(base64url) {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Register a new passkey
   */
  async registerPasskey(deviceName = null) {
    if (!this.isSupported) {
      throw new Error('Passkeys are not supported on this device or browser.');
    }

    try {
      // Get registration challenge from server
      const challengeResponse = await fetch(`${this.apiBase}/register/begin`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'same-origin'
      });

      if (!challengeResponse.ok) {
        const errorData = await challengeResponse.json();
        throw new Error(errorData.error || 'Failed to start registration');
      }

      const challengeData = await challengeResponse.json();
      const options = challengeData.options;

      // Convert challenge and user ID from base64url to ArrayBuffer
      options.challenge = this.base64urlToArrayBuffer(options.challenge);
      options.user.id = this.base64urlToArrayBuffer(options.user.id);

      // Convert excluded credentials
      if (options.excludeCredentials) {
        options.excludeCredentials = options.excludeCredentials.map(cred => ({
          ...cred,
          id: this.base64urlToArrayBuffer(cred.id)
        }));
      }

      // Create the credential
      const credential = await navigator.credentials.create({
        publicKey: options
      });

      if (!credential) {
        throw new Error('Passkey creation was cancelled');
      }

      // Prepare the credential for server verification
      const credentialData = {
        id: credential.id,
        rawId: this.arrayBufferToBase64url(credential.rawId),
        type: credential.type,
        response: {
          attestationObject: this.arrayBufferToBase64url(credential.response.attestationObject),
          clientDataJSON: this.arrayBufferToBase64url(credential.response.clientDataJSON)
        }
      };

      // Send to server for verification
      const verificationResponse = await fetch(`${this.apiBase}/register/finish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          credential: credentialData,
          deviceName: deviceName
        })
      });

      if (!verificationResponse.ok) {
        const errorData = await verificationResponse.json();
        throw new Error(errorData.error || 'Failed to verify registration');
      }

      const result = await verificationResponse.json();
      return result;

    } catch (error) {
      console.error('Passkey registration error:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Authenticate with an existing passkey
   */
  async authenticateWithPasskey() {
    if (!this.isSupported) {
      throw new Error('Passkeys are not supported on this device or browser.');
    }

    try {
      // Get authentication challenge from server
      const challengeResponse = await fetch(`${this.apiBase}/authenticate/begin`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'same-origin'
      });

      if (!challengeResponse.ok) {
        const errorData = await challengeResponse.json();
        throw new Error(errorData.error || 'Failed to start authentication');
      }

      const challengeData = await challengeResponse.json();
      const options = challengeData.options;

      // Convert challenge from base64url to ArrayBuffer
      options.challenge = this.base64urlToArrayBuffer(options.challenge);

      // Get the credential
      const credential = await navigator.credentials.get({
        publicKey: options
      });

      if (!credential) {
        throw new Error('Passkey authentication was cancelled');
      }

      // Prepare the credential for server verification
      const credentialData = {
        id: credential.id,
        rawId: this.arrayBufferToBase64url(credential.rawId),
        type: credential.type,
        response: {
          authenticatorData: this.arrayBufferToBase64url(credential.response.authenticatorData),
          clientDataJSON: this.arrayBufferToBase64url(credential.response.clientDataJSON),
          signature: this.arrayBufferToBase64url(credential.response.signature),
          userHandle: credential.response.userHandle ? this.arrayBufferToBase64url(credential.response.userHandle) : null
        }
      };

      // Send to server for verification
      const verificationResponse = await fetch(`${this.apiBase}/authenticate/finish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          credential: credentialData
        })
      });

      if (!verificationResponse.ok) {
        const errorData = await verificationResponse.json();
        throw new Error(errorData.error || 'Failed to verify authentication');
      }

      const result = await verificationResponse.json();
      return result;

    } catch (error) {
      console.error('Passkey authentication error:', error);
      throw new Error(this.getErrorMessage(error));
    }
  }

  /**
   * Get user's passkeys
   */
  async getUserPasskeys() {
    try {
      const response = await fetch(`${this.apiBase}/list`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'same-origin'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch passkeys');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching passkeys:', error);
      throw error;
    }
  }

  /**
   * Update passkey (rename or toggle active status)
   */
  async updatePasskey(passkeyId, updates) {
    try {
      const response = await fetch(`${this.apiBase}/${passkeyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'same-origin',
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update passkey');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating passkey:', error);
      throw error;
    }
  }

  /**
   * Delete passkey
   */
  async deletePasskey(passkeyId) {
    try {
      const response = await fetch(`${this.apiBase}/${passkeyId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'same-origin'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete passkey');
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting passkey:', error);
      throw error;
    }
  }
}

// Initialize global passkey client
window.passkeyClient = new PasskeyClient();

// Utility functions for UI integration
window.PasskeyUtils = {
  /**
   * Show loading state on button
   */
  setButtonLoading(button, loading) {
    if (loading) {
      button.disabled = true;
      button.dataset.originalText = button.innerHTML;
      button.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Loading...';
    } else {
      button.disabled = false;
      if (button.dataset.originalText) {
        button.innerHTML = button.dataset.originalText;
        delete button.dataset.originalText;
      }
    }
  },

  /**
   * Show success message
   */
  showSuccess(message) {
    this.showAlert(message, 'success');
  },

  /**
   * Show error message
   */
  showError(message) {
    this.showAlert(message, 'danger');
  },

  /**
   * Show alert message
   */
  showAlert(message, type = 'info') {
    // Create Bootstrap alert
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    // Find container or use body
    const container = document.querySelector('.alert-container') || document.body;
    container.insertBefore(alert, container.firstChild);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      if (alert.parentNode) {
        alert.remove();
      }
    }, 5000);
  },

  /**
   * Format date for display
   */
  formatDate(dateString) {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  },

  /**
   * Get device type display name
   */
  getDeviceTypeName(deviceType) {
    const types = {
      phone: 'Mobile Device',
      laptop: 'Laptop',
      desktop: 'Desktop Computer',
      tablet: 'Tablet',
      security_key: 'Security Key',
      unknown: 'Unknown Device'
    };
    return types[deviceType] || types.unknown;
  }
}; 