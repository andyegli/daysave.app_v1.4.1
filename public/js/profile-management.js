// Profile Management JavaScript
// Handles change password and MFA functionality

// Utility function to show alerts
function showAlert(message, type = 'info') {
  const alertContainer = document.querySelector('.alert-container');
  if (!alertContainer) return;

  const alertId = 'alert-' + Date.now();
  const alert = document.createElement('div');
  alert.id = alertId;
  alert.className = `alert alert-${type} alert-dismissible fade show`;
  alert.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  alertContainer.appendChild(alert);
  
  // Auto dismiss after 5 seconds
  setTimeout(() => {
    const alertElement = document.getElementById(alertId);
    if (alertElement) {
      alertElement.remove();
    }
  }, 5000);
}

// Utility function for API calls
async function apiCall(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    return { success: response.ok, data, status: response.status };
  } catch (error) {
    console.error('API call failed:', error);
    return { success: false, error: error.message };
  }
}

// Change Password Modal Functions
function openChangePasswordModal() {
  const modal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
  modal.show();
}

async function submitChangePasswordHandler() {
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  
  if (!currentPassword || !newPassword || !confirmPassword) {
    showAlert('All fields are required', 'danger');
    return;
  }
  
  if (newPassword !== confirmPassword) {
    showAlert('New passwords do not match', 'danger');
    return;
  }
  
  if (newPassword.length < 8) {
    showAlert('Password must be at least 8 characters long', 'danger');
    return;
  }
  
  const submitBtn = document.getElementById('submitChangePassword');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Changing...';
  submitBtn.disabled = true;
  
  try {
    const result = await apiCall('/profile/change-password', {
      method: 'POST',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword
      })
    });
    
    if (result.success) {
      showAlert(result.data.message, 'success');
      bootstrap.Modal.getInstance(document.getElementById('changePasswordModal')).hide();
      document.getElementById('changePasswordForm').reset();
    } else {
      showAlert(result.data.message || 'Password change failed', 'danger');
    }
  } catch (error) {
    showAlert('An error occurred while changing password', 'danger');
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}

// MFA Management Functions
let mfaEnabled = false;

async function checkMfaStatus() {
  const result = await apiCall('/profile/mfa/status');
  if (result.success) {
    mfaEnabled = result.data.enabled;
    updateMfaUI();
  }
}

function updateMfaUI() {
  const mfaButton = document.getElementById('mfaToggleBtn');
  const mfaStatus = document.getElementById('mfaStatus');
  
  if (mfaEnabled) {
    mfaButton.textContent = 'Disable Two-Factor Authentication';
    mfaButton.className = 'btn btn-outline-warning';
    mfaStatus.innerHTML = '<span class="badge bg-success">Enabled</span>';
  } else {
    mfaButton.textContent = 'Enable Two-Factor Authentication';
    mfaButton.className = 'btn btn-outline-success';
    mfaStatus.innerHTML = '<span class="badge bg-secondary">Disabled</span>';
  }
}

function toggleMfa() {
  if (mfaEnabled) {
    openDisableMfaModal();
  } else {
    openEnableMfaModal();
  }
}

// Enable MFA Flow
async function openEnableMfaModal() {
  const modal = new bootstrap.Modal(document.getElementById('enableMfaModal'));
  
  // Show loading state
  document.getElementById('mfaSetupContent').innerHTML = `
    <div class="text-center">
      <div class="spinner-border" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-2">Generating QR code...</p>
    </div>
  `;
  
  modal.show();
  
  try {
    const result = await apiCall('/profile/mfa/setup', { method: 'POST' });
    
    if (result.success) {
      document.getElementById('mfaSetupContent').innerHTML = `
        <div class="text-center mb-3">
          <h6><i class="fas fa-qrcode me-2"></i>Scan QR Code with your authenticator app</h6>
          <div class="qr-code-container mb-3">
            <img src="${result.data.qrCode}" alt="QR Code" class="img-fluid" style="max-width: 200px;">
          </div>
          <div class="alert alert-info small">
            <i class="fas fa-info-circle me-2"></i>
            <strong>Look for the DaySave logo!</strong> Your authenticator app should display the DaySave logo next to this entry.
          </div>
          <p class="small text-muted">
            Or enter this key manually: <br>
            <code class="user-select-all">${result.data.secret}</code>
          </p>
          ${result.data.logoUrl ? `
            <details class="small text-muted mt-2">
              <summary>Technical Details</summary>
              <div class="mt-2">
                <strong>Logo URL:</strong> <code>${result.data.logoUrl}</code><br>
                <strong>TOTP URL:</strong> <code class="text-break">${result.data.otpAuthUrl}</code>
              </div>
            </details>
          ` : ''}
        </div>
        <div class="mb-3">
          <label for="mfaVerificationCode" class="form-label">Enter verification code</label>
          <input type="text" class="form-control" id="mfaVerificationCode" 
                 placeholder="000000" maxlength="6" pattern="[0-9]{6}">
          <div class="form-text">
            <i class="fas fa-mobile-alt me-1"></i>
            Enter the 6-digit code from your authenticator app
          </div>
        </div>
      `;
      
      // Focus on input
      setTimeout(() => {
        document.getElementById('mfaVerificationCode').focus();
      }, 100);
    } else {
      showAlert(result.data.message || 'Failed to setup MFA', 'danger');
      modal.hide();
    }
  } catch (error) {
    showAlert('An error occurred while setting up MFA', 'danger');
    modal.hide();
  }
}

async function verifyAndEnableMfa() {
  const code = document.getElementById('mfaVerificationCode').value;
  
  if (!code || code.length !== 6) {
    showAlert('Please enter a 6-digit verification code', 'danger');
    return;
  }
  
  const submitBtn = document.getElementById('submitEnableMfa');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Enabling...';
  submitBtn.disabled = true;
  
  try {
    const result = await apiCall('/profile/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ code })
    });
    
    if (result.success) {
      showAlert(result.data.message, 'success');
      
      // Show backup codes
      if (result.data.backupCodes) {
        document.getElementById('mfaSetupContent').innerHTML = `
          <div class="alert alert-warning">
            <h6>⚠️ Save these backup codes</h6>
            <p class="small mb-2">Store these codes in a safe place. You can use them to access your account if you lose your authenticator device.</p>
            <div class="backup-codes p-2 bg-light rounded">
              ${result.data.backupCodes.map(code => `<code class="d-block">${code}</code>`).join('')}
            </div>
          </div>
          <p class="text-center">
            <button type="button" class="btn btn-primary" data-action="completeMfaSetup">
              I've saved my backup codes
            </button>
          </p>
        `;
        return;
      }
      
      completeMfaSetup();
    } else {
      showAlert(result.data.message || 'Verification failed', 'danger');
    }
  } catch (error) {
    showAlert('An error occurred while verifying code', 'danger');
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}

function completeMfaSetup() {
  bootstrap.Modal.getInstance(document.getElementById('enableMfaModal')).hide();
  mfaEnabled = true;
  updateMfaUI();
  showAlert('Two-factor authentication has been enabled successfully!', 'success');
}

// Disable MFA Flow
function openDisableMfaModal() {
  const modal = new bootstrap.Modal(document.getElementById('disableMfaModal'));
  modal.show();
}

async function submitDisableMfa() {
  const password = document.getElementById('disableMfaPassword').value;
  const code = document.getElementById('disableMfaCode').value.trim();
  
  if (!password) {
    showAlert('Please enter your password', 'danger');
    return;
  }
  
  // Verification code is optional - if provided, must be 6 digits
  if (code && (!/^\d{6}$/.test(code))) {
    showAlert('Verification code must be exactly 6 digits, or leave blank if you cannot access your device', 'danger');
    return;
  }
  
  const submitBtn = document.getElementById('submitDisableMfa');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Disabling...';
  submitBtn.disabled = true;
  
  try {
    const result = await apiCall('/profile/mfa/disable', {
      method: 'POST',
      body: JSON.stringify({ password, code: code || undefined })
    });
    
    if (result.success) {
      showAlert(result.data.message, 'success');
      bootstrap.Modal.getInstance(document.getElementById('disableMfaModal')).hide();
      document.getElementById('disableMfaForm').reset();
      mfaEnabled = false;
      updateMfaUI();
    } else {
      showAlert(result.data.message || 'Failed to disable MFA', 'danger');
    }
  } catch (error) {
    showAlert('An error occurred while disabling MFA', 'danger');
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
  checkMfaStatus();
  
  // Add event listeners for buttons
  const changePasswordBtn = document.getElementById('changePasswordBtn');
  if (changePasswordBtn) {
    // No need to add listener - using Bootstrap data-bs-toggle
  }
  
  const mfaToggleBtn = document.getElementById('mfaToggleBtn');
  if (mfaToggleBtn) {
    mfaToggleBtn.addEventListener('click', toggleMfa);
  }
  
  const submitChangePassword = document.getElementById('submitChangePassword');
  if (submitChangePassword) {
    submitChangePassword.addEventListener('click', submitChangePasswordHandler);
  }
  
  const submitEnableMfa = document.getElementById('submitEnableMfa');
  if (submitEnableMfa) {
    submitEnableMfa.addEventListener('click', verifyAndEnableMfa);
  }
  
  const submitDisableMfaBtn = document.getElementById('submitDisableMfa');
  if (submitDisableMfaBtn) {
    submitDisableMfaBtn.addEventListener('click', submitDisableMfa);
  }
  
  // Add event delegation for dynamically created buttons
  document.addEventListener('click', function(e) {
    const target = e.target;
    const action = target.getAttribute('data-action');
    
    if (action === 'completeMfaSetup') {
      completeMfaSetup();
      e.preventDefault();
    }
  });
  
  // Add event listeners for Enter key in input fields
  document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      const target = e.target;
      
      // Handle Enter key in MFA verification code field
      if (target.id === 'mfaVerificationCode') {
        verifyAndEnableMfa();
        e.preventDefault();
      }
      
      // Handle Enter key in disable MFA code field
      if (target.id === 'disableMfaCode') {
        submitDisableMfa();
        e.preventDefault();
      }
      
      // Handle Enter key in password change form
      if (target.closest('#changePasswordForm')) {
        submitChangePasswordHandler();
        e.preventDefault();
      }
    }
  });
});