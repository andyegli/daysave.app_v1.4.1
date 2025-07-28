/**
 * DaySave Passkey Client
 * Handles WebAuthn passkey registration and authentication using native browser APIs
 */

console.log('🎯 PASSKEY-CLIENT.JS LOADED - Starting initialization...');

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
    console.log('🔐 Starting passkey registration...', { deviceName, isSupported: this.isSupported });
    
    if (!this.isSupported) {
      console.error('❌ WebAuthn not supported');
      throw new Error('Passkeys are not supported on this device or browser.');
    }

    try {
      console.log('📡 Fetching registration challenge...');
      // Get registration challenge from server
      const challengeResponse = await fetch(`${this.apiBase}/register/begin`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'same-origin'
      });

      console.log('📡 Challenge response status:', challengeResponse.status);

      if (!challengeResponse.ok) {
        const errorData = await challengeResponse.json();
        console.error('❌ Challenge failed:', errorData);
        throw new Error(errorData.error || 'Failed to start registration');
      }

      const challengeData = await challengeResponse.json();
      const options = challengeData.options;
      console.log('✅ Challenge received:', { options });

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

      console.log('🔐 Creating WebAuthn credential...');
      // Create the credential
      const credential = await navigator.credentials.create({
        publicKey: options
      });

      if (!credential) {
        console.error('❌ Credential creation cancelled');
        throw new Error('Passkey creation was cancelled');
      }

      console.log('✅ Credential created:', credential.id);

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

      console.log('📡 Sending credential for verification...');
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

      console.log('📡 Verification response status:', verificationResponse.status);

      if (!verificationResponse.ok) {
        const errorData = await verificationResponse.json();
        console.error('❌ Verification failed:', errorData);
        throw new Error(errorData.error || 'Failed to verify registration');
      }

      const result = await verificationResponse.json();
      console.log('✅ Passkey registration successful:', result);
      return result;

    } catch (error) {
      console.error('❌ Passkey registration error:', error);
      console.error('❌ Error details:', { name: error.name, message: error.message, stack: error.stack });
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

// Initialize global passkey client instance
console.log('🚀 Loading passkey-client.js...');
window.passkeyClient = new PasskeyClient();
console.log('✅ PasskeyClient instantiated:', window.passkeyClient);

// Initialize passkey management modal functionality
document.addEventListener('DOMContentLoaded', function() {
  console.log('📄 DOM Content Loaded - Initializing passkey modal...');
  const modal = document.getElementById('passkeyManagementModal');
  if (!modal) {
    console.log('❌ Passkey modal not found on this page');
    return; // Exit if modal doesn't exist on this page
  }
  console.log('✅ Modal found:', modal);
  
  const addPasskeyBtn = document.getElementById('addPasskeyBtn');
  const refreshBtn = document.getElementById('refreshPasskeysBtn');
  const passkeyList = document.getElementById('passkeyList');
  const noPasskeysMessage = document.getElementById('noPasskeysMessage');
  const passkeyCount = document.getElementById('passkeyCount');
  const newPasskeyNameInput = document.getElementById('newPasskeyName');
  
  console.log('🔍 Elements found:', {
    addPasskeyBtn: !!addPasskeyBtn,
    refreshBtn: !!refreshBtn,
    passkeyList: !!passkeyList,
    noPasskeysMessage: !!noPasskeysMessage,
    passkeyCount: !!passkeyCount,
    newPasskeyNameInput: !!newPasskeyNameInput
  });
  
  // Rename modal elements
  const renameModal = document.getElementById('renamePasskeyModal');
  const renameInput = document.getElementById('renamePasskeyInput');
  const saveNameBtn = document.getElementById('savePasskeyNameBtn');
  let currentRenamePasskeyId = null;

  // Check passkey support
  if (!window.passkeyClient.isSupported) {
    document.getElementById('passkeyNotSupported').classList.remove('d-none');
    document.getElementById('addPasskeySection').style.display = 'none';
  }

  // Load passkeys when modal opens
  modal.addEventListener('shown.bs.modal', function() {
    loadPasskeys();
  });

  // Add new passkey
  if (addPasskeyBtn) {
    console.log('✅ Attaching click event listener to addPasskeyBtn');
    addPasskeyBtn.addEventListener('click', async function() {
    console.log('🔘 Add passkey button clicked!');
    try {
      console.log('🔄 Setting button loading state...');
      PasskeyUtils.setButtonLoading(this, true);
      
      const deviceName = newPasskeyNameInput.value.trim() || null;
      console.log('📝 Device name:', deviceName);
      console.log('🚀 Calling registerPasskey...');
      const result = await window.passkeyClient.registerPasskey(deviceName);
      
      if (result.success) {
        PasskeyUtils.showSuccess('Passkey added successfully!');
        newPasskeyNameInput.value = '';
        loadPasskeys();
      } else {
        PasskeyUtils.showError(result.error || 'Failed to add passkey');
      }
    } catch (error) {
      console.error('Add passkey error:', error);
      PasskeyUtils.showError(error.message || 'Failed to add passkey');
    } finally {
      PasskeyUtils.setButtonLoading(this, false);
    }
  });
  } else {
    console.log('❌ addPasskeyBtn not found!');
  }

  // Refresh passkeys
  if (refreshBtn) {
    console.log('✅ Attaching click event listener to refreshBtn');
    refreshBtn.addEventListener('click', function() {
      console.log('🔄 Refresh button clicked!');
      loadPasskeys();
    });
  } else {
    console.log('❌ refreshBtn not found!');
  }

  // Save renamed passkey
  saveNameBtn && saveNameBtn.addEventListener('click', async function() {
    if (!currentRenamePasskeyId) return;
    
    try {
      PasskeyUtils.setButtonLoading(this, true);
      
      const newName = renameInput.value.trim();
      if (!newName) {
        PasskeyUtils.showError('Please enter a device name');
        return;
      }
      
      const result = await window.passkeyClient.updatePasskey(currentRenamePasskeyId, {
        device_name: newName
      });
      
      if (result.success) {
        PasskeyUtils.showSuccess('Passkey renamed successfully!');
        bootstrap.Modal.getInstance(renameModal).hide();
        loadPasskeys();
      } else {
        PasskeyUtils.showError(result.error || 'Failed to rename passkey');
      }
    } catch (error) {
      console.error('Rename passkey error:', error);
      PasskeyUtils.showError(error.message || 'Failed to rename passkey');
    } finally {
      PasskeyUtils.setButtonLoading(this, false);
    }
  });

  // Load and display passkeys
  async function loadPasskeys() {
    try {
      const result = await window.passkeyClient.getUserPasskeys();
      
      if (result.success) {
        displayPasskeys(result.passkeys);
        passkeyCount.textContent = result.count;
      } else {
        PasskeyUtils.showError('Failed to load passkeys');
      }
    } catch (error) {
      console.error('Load passkeys error:', error);
      PasskeyUtils.showError('Failed to load passkeys');
    }
  }

  // Display passkeys in the list
  function displayPasskeys(passkeys) {
    passkeyList.innerHTML = '';
    
    if (passkeys.length === 0) {
      noPasskeysMessage.style.display = 'block';
      return;
    }
    
    noPasskeysMessage.style.display = 'none';
    
    passkeys.forEach(passkey => {
      const passkeyItem = createPasskeyItem(passkey);
      passkeyList.appendChild(passkeyItem);
    });
  }

  // Create passkey list item
  function createPasskeyItem(passkey) {
    const item = document.createElement('div');
    item.className = 'list-group-item passkey-item';
    
    const lastUsed = passkey.last_used_at 
      ? PasskeyUtils.formatDate(passkey.last_used_at)
      : 'Never used';
    
    const statusBadge = passkey.is_active 
      ? '<span class="badge bg-success device-status-badge">Active</span>'
      : '<span class="badge bg-secondary device-status-badge">Inactive</span>';
    
    item.innerHTML = `
      <div class="d-flex align-items-center justify-content-between">
        <div class="d-flex align-items-center">
          <div class="passkey-device-icon ${passkey.device_type} me-3">
            <i class="${passkey.device_icon}"></i>
          </div>
          <div>
            <h6 class="mb-1 fw-semibold">${passkey.device_name}</h6>
            <div class="d-flex align-items-center gap-2">
              ${statusBadge}
              <small class="last-used-text">Last used: ${lastUsed}</small>
            </div>
            <small class="text-muted">Added ${PasskeyUtils.formatDate(passkey.created_at)}</small>
          </div>
        </div>
        
        <div class="passkey-actions">
          <button class="btn btn-outline-primary btn-sm rename-passkey-btn" 
                  data-passkey-id="${passkey.id}" 
                  data-current-name="${passkey.device_name}"
                  title="Rename">
            <i class="fas fa-edit"></i>
          </button>
          
          <button class="btn ${passkey.is_active ? 'btn-outline-warning' : 'btn-outline-success'} btn-sm toggle-passkey-btn" 
                  data-passkey-id="${passkey.id}" 
                  data-is-active="${passkey.is_active}"
                  title="${passkey.is_active ? 'Disable' : 'Enable'}">
            <i class="fas ${passkey.is_active ? 'fa-pause' : 'fa-play'}"></i>
          </button>
          
          <button class="btn btn-outline-danger btn-sm delete-passkey-btn" 
                  data-passkey-id="${passkey.id}"
                  title="Delete">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;

    // Add event listeners
    item.querySelector('.rename-passkey-btn').addEventListener('click', function() {
      currentRenamePasskeyId = this.dataset.passkeyId;
      renameInput.value = this.dataset.currentName;
      new bootstrap.Modal(renameModal).show();
    });

    item.querySelector('.toggle-passkey-btn').addEventListener('click', async function() {
      const passkeyId = this.dataset.passkeyId;
      const isActive = this.dataset.isActive === 'true';
      
      try {
        PasskeyUtils.setButtonLoading(this, true);
        
        const result = await window.passkeyClient.updatePasskey(passkeyId, {
          is_active: !isActive
        });
        
        if (result.success) {
          PasskeyUtils.showSuccess(`Passkey ${!isActive ? 'enabled' : 'disabled'} successfully!`);
          loadPasskeys();
        } else {
          PasskeyUtils.showError(result.error || 'Failed to update passkey');
        }
      } catch (error) {
        console.error('Toggle passkey error:', error);
        PasskeyUtils.showError(error.message || 'Failed to update passkey');
      } finally {
        PasskeyUtils.setButtonLoading(this, false);
      }
    });

    item.querySelector('.delete-passkey-btn').addEventListener('click', async function() {
      const passkeyId = this.dataset.passkeyId;
      
      if (!confirm('Are you sure you want to delete this passkey? This action cannot be undone.')) {
        return;
      }
      
      try {
        PasskeyUtils.setButtonLoading(this, true);
        
        const result = await window.passkeyClient.deletePasskey(passkeyId);
        
        if (result.success) {
          PasskeyUtils.showSuccess('Passkey deleted successfully!');
          loadPasskeys();
        } else {
          PasskeyUtils.showError(result.error || 'Failed to delete passkey');
        }
      } catch (error) {
        console.error('Delete passkey error:', error);
        PasskeyUtils.showError(error.message || 'Failed to delete passkey');
      } finally {
        PasskeyUtils.setButtonLoading(this, false);
      }
    });

    return item;
  }
}); 