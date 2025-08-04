/**
 * Admin Device Fingerprinting Dashboard
 * 
 * Provides administrative interface for monitoring and managing
 * device fingerprinting and security analytics.
 * 
 * @version 1.0.0
 * @author DaySave Security Team
 */

class DeviceFingerprintingAdmin {
  constructor() {
    this.chart = null;
    this.refreshInterval = null;
    this.init();
  }

  /**
   * Initialize the admin dashboard
   */
  async init() {
    console.log('🔍 Initializing Device Fingerprinting Admin Dashboard');
    
    try {
      await this.loadDashboardData();
      this.initializeChart();
      this.setupEventListeners();
      this.startAutoRefresh();
      
      console.log('✅ Admin dashboard initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing dashboard:', error);
      this.showError('Failed to initialize dashboard');
    }
  }

  /**
   * Load dashboard data from API
   */
  async loadDashboardData() {
    try {
      const [overview, loginAttempts, devices] = await Promise.all([
        this.fetchData('/admin/api/fingerprinting/overview'),
        this.fetchData('/admin/api/fingerprinting/login-attempts'),
        this.fetchData('/admin/api/fingerprinting/devices')
      ]);

      this.updateOverviewCards(overview);
      this.updateLoginAttemptsTable(loginAttempts);
      this.updateDevicesDisplay(devices);
      
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      throw error;
    }
  }

  /**
   * Fetch data from API endpoint
   */
  async fetchData(endpoint) {
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    return await response.json();
  }

  /**
   * Update overview cards with statistics
   */
  updateOverviewCards(data) {
    document.getElementById('totalDevices').textContent = data.totalDevices || 0;
    document.getElementById('trustedDevices').textContent = data.trustedDevices || 0;
    document.getElementById('highRiskDevices').textContent = data.highRiskDevices || 0;
    document.getElementById('blockedAttempts').textContent = data.blockedAttempts || 0;
  }

  /**
   * Initialize risk distribution chart
   */
  initializeChart() {
    const ctx = document.getElementById('riskChart').getContext('2d');
    
    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Minimal', 'Low', 'Medium', 'High', 'Critical'],
        datasets: [{
          label: 'Number of Devices',
          data: [0, 0, 0, 0, 0],
          backgroundColor: [
            '#d4edda',
            '#fff3cd',
            '#ffeaa7',
            '#fadbd8',
            '#f8d7da'
          ],
          borderColor: [
            '#155724',
            '#856404',
            '#d68910',
            '#a94442',
            '#721c24'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.label} Risk: ${context.parsed.y} devices`;
              }
            }
          }
        }
      }
    });
  }

  /**
   * Update chart with new data
   */
  updateChart(riskDistribution) {
    if (this.chart && riskDistribution) {
      this.chart.data.datasets[0].data = [
        riskDistribution.minimal || 0,
        riskDistribution.low || 0,
        riskDistribution.medium || 0,
        riskDistribution.high || 0,
        riskDistribution.critical || 0
      ];
      this.chart.update();
    }
  }

  /**
   * Update login attempts table
   */
  updateLoginAttemptsTable(attempts) {
    const tbody = document.querySelector('#loginAttemptsTable tbody');
    tbody.innerHTML = '';

    attempts.forEach(attempt => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${this.formatDateTime(attempt.attempted_at)}</td>
        <td>
          ${attempt.user ? `${attempt.user.username} (${attempt.user.email})` : 'Unknown'}
        </td>
        <td>
          <div>
            <code>${attempt.ip_address}</code>
            ${attempt.locationDisplay ? 
              `<br><small class="text-muted"><i class="fas fa-map-marker-alt me-1"></i>${attempt.locationDisplay}</small>` : 
              ''}
            ${attempt.is_vpn ? 
              '<br><span class="badge bg-warning badge-sm">VPN/Proxy</span>' : 
              ''}
          </div>
        </td>
        <td>
          ${attempt.device_fingerprint ? 
            `<span class="fingerprint-hash">${attempt.device_fingerprint.substring(0, 12)}...</span>` : 
            '<span class="text-muted">None</span>'}
        </td>
        <td>
          ${this.createRiskBadge(attempt.risk_score || 0)}
        </td>
        <td>
          ${attempt.success ? 
            '<span class="badge bg-success">Success</span>' : 
            `<span class="badge bg-danger" title="${attempt.failure_reason}">Failed</span>`}
        </td>
        <td>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary" onclick="viewAttemptDetails('${attempt.id}')">
              <i class="fas fa-eye"></i>
            </button>
            ${attempt.device_fingerprint ? 
              `<button class="btn btn-outline-warning" onclick="trustDevice('${attempt.device_fingerprint}')">
                <i class="fas fa-check"></i>
              </button>` : ''}
          </div>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  /**
   * Update devices display
   */
  updateDevicesDisplay(devices) {
    const container = document.getElementById('devicesContainer');
    container.innerHTML = '';

    devices.forEach(device => {
      const deviceCard = document.createElement('div');
      deviceCard.className = 'col-md-4 mb-3';
      deviceCard.innerHTML = `
        <div class="card device-card h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <h6 class="card-title mb-0">
                <i class="fas fa-mobile-alt me-2"></i>
                Device ${device.device_fingerprint.substring(0, 8)}...
              </h6>
              ${device.is_trusted ? 
                '<span class="badge bg-success">Trusted</span>' : 
                '<span class="badge bg-warning">Untrusted</span>'}
            </div>
            
            <div class="mb-2">
              <small class="text-muted">User:</small><br>
              <strong>${device.user ? device.user.username : 'Unknown'}</strong>
            </div>
            
            <div class="mb-2">
              <small class="text-muted">Last Login:</small><br>
              ${this.formatDateTime(device.last_login_at)}
            </div>
            
            <div class="mb-2">
              <small class="text-muted">Location:</small><br>
              <i class="fas fa-map-marker-alt me-1"></i>${device.locationDisplay || 'Unknown'}
              ${device.location_confidence ? 
                `<br><small class="text-muted">Confidence: ${Math.round(device.location_confidence * 100)}%</small>` : 
                ''}
            </div>
            
            <div class="mb-3">
              <small class="text-muted">Fingerprint:</small><br>
              <code class="fingerprint-hash">${device.device_fingerprint}</code>
            </div>
            
            <div class="btn-group btn-group-sm w-100">
              <button class="btn btn-outline-primary" onclick="viewDeviceDetails('${device.device_fingerprint}')">
                <i class="fas fa-eye"></i> Details
              </button>
              <button class="btn btn-outline-${device.is_trusted ? 'warning' : 'success'}" 
                      onclick="toggleDeviceTrust('${device.device_fingerprint}', ${device.is_trusted})">
                <i class="fas fa-${device.is_trusted ? 'times' : 'check'}"></i> 
                ${device.is_trusted ? 'Untrust' : 'Trust'}
              </button>
            </div>
          </div>
        </div>
      `;
      container.appendChild(deviceCard);
    });
  }

  /**
   * Create risk score badge
   */
  createRiskBadge(score) {
    const riskLevel = this.getRiskLevel(score);
    const percentage = Math.round(score * 100);
    
    return `<span class="risk-badge risk-${riskLevel.toLowerCase()}">${riskLevel} (${percentage}%)</span>`;
  }

  /**
   * Get risk level from score
   */
  getRiskLevel(score) {
    if (score >= 0.9) return 'CRITICAL';
    if (score >= 0.8) return 'HIGH';
    if (score >= 0.6) return 'MEDIUM';
    if (score >= 0.3) return 'LOW';
    return 'MINIMAL';
  }

  /**
   * Format datetime for display
   */
  formatDateTime(dateString) {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Risk threshold sliders
    const thresholds = ['low', 'medium', 'high', 'block'];
    thresholds.forEach(threshold => {
      const slider = document.getElementById(`${threshold}Threshold`);
      const display = document.getElementById(`${threshold}ThresholdValue`);
      
      slider.addEventListener('input', (e) => {
        display.textContent = e.target.value;
      });
    });

    // Risk thresholds form
    document.getElementById('riskThresholdsForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveRiskThresholds();
    });
  }

  /**
   * Start auto-refresh interval
   */
  startAutoRefresh() {
    this.refreshInterval = setInterval(() => {
      this.loadDashboardData();
    }, 30000); // Refresh every 30 seconds
  }

  /**
   * Stop auto-refresh
   */
  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Save risk thresholds
   */
  async saveRiskThresholds() {
    try {
      const thresholds = {
        low: parseFloat(document.getElementById('lowThreshold').value),
        medium: parseFloat(document.getElementById('mediumThreshold').value),
        high: parseFloat(document.getElementById('highThreshold').value),
        block: parseFloat(document.getElementById('blockThreshold').value)
      };

      const response = await fetch('/admin/api/fingerprinting/thresholds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(thresholds)
      });

      if (response.ok) {
        this.showSuccess('Risk thresholds updated successfully');
      } else {
        throw new Error('Failed to update thresholds');
      }
    } catch (error) {
      console.error('❌ Error saving thresholds:', error);
      this.showError('Failed to save risk thresholds');
    }
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    // You can implement a toast notification here
    alert(`✅ ${message}`);
  }

  /**
   * Show error message
   */
  showError(message) {
    // You can implement a toast notification here
    alert(`❌ ${message}`);
  }
}

// Global functions for button onclick handlers
window.refreshLoginAttempts = async function() {
  try {
    const attempts = await adminDashboard.fetchData('/admin/api/fingerprinting/login-attempts');
    adminDashboard.updateLoginAttemptsTable(attempts);
    adminDashboard.showSuccess('Login attempts refreshed');
  } catch (error) {
    adminDashboard.showError('Failed to refresh login attempts');
  }
};

window.refreshDevices = async function() {
  try {
    const devices = await adminDashboard.fetchData('/admin/api/fingerprinting/devices');
    adminDashboard.updateDevicesDisplay(devices);
    adminDashboard.showSuccess('Devices refreshed');
  } catch (error) {
    adminDashboard.showError('Failed to refresh devices');
  }
};

window.viewAttemptDetails = function(attemptId) {
  // Implement modal or page to show attempt details
  alert(`View details for attempt: ${attemptId}`);
};

window.trustDevice = async function(fingerprint) {
  try {
    const response = await fetch('/admin/api/fingerprinting/trust-device', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fingerprint })
    });

    if (response.ok) {
      adminDashboard.showSuccess('Device trusted successfully');
      await refreshDevices();
    } else {
      throw new Error('Failed to trust device');
    }
  } catch (error) {
    adminDashboard.showError('Failed to trust device');
  }
};

window.viewDeviceDetails = function(fingerprint) {
  // Implement modal or page to show device details
  alert(`View details for device: ${fingerprint}`);
};

window.toggleDeviceTrust = async function(fingerprint, currentTrust) {
  try {
    const action = currentTrust ? 'untrust' : 'trust';
    const response = await fetch(`/admin/api/fingerprinting/${action}-device`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fingerprint })
    });

    if (response.ok) {
      adminDashboard.showSuccess(`Device ${action}ed successfully`);
      await refreshDevices();
    } else {
      throw new Error(`Failed to ${action} device`);
    }
  } catch (error) {
    adminDashboard.showError(`Failed to ${currentTrust ? 'untrust' : 'trust'} device`);
  }
};

window.exportLoginData = function() {
  // Implement CSV export
  window.open('/admin/api/fingerprinting/export-login-data');
};

window.bulkTrustDevices = function() {
  // Implement bulk trust functionality
  alert('Bulk trust devices functionality would be implemented here');
};

window.bulkBlockDevices = function() {
  // Implement bulk block functionality
  alert('Bulk block devices functionality would be implemented here');
};

window.saveSecuritySettings = async function() {
  try {
    const settings = {
      enableFingerprinting: document.getElementById('enableFingerprinting').checked,
      enableFraudDetection: document.getElementById('enableFraudDetection').checked,
      autoTrustDevices: document.getElementById('autoTrustDevices').checked,
      logAllAttempts: document.getElementById('logAllAttempts').checked
    };

    const response = await fetch('/admin/api/fingerprinting/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settings)
    });

    if (response.ok) {
      adminDashboard.showSuccess('Security settings saved successfully');
    } else {
      throw new Error('Failed to save settings');
    }
  } catch (error) {
    adminDashboard.showError('Failed to save security settings');
  }
};

// Initialize dashboard when DOM is ready
let adminDashboard;
document.addEventListener('DOMContentLoaded', () => {
  adminDashboard = new DeviceFingerprintingAdmin();
  
  // Attach event listeners to buttons to replace inline onclick handlers
  const refreshLoginAttemptsBtn = document.getElementById('refreshLoginAttemptsBtn');
  if (refreshLoginAttemptsBtn) {
    refreshLoginAttemptsBtn.addEventListener('click', window.refreshLoginAttempts);
  }
  
  const exportLoginDataBtn = document.getElementById('exportLoginDataBtn');
  if (exportLoginDataBtn) {
    exportLoginDataBtn.addEventListener('click', window.exportLoginData);
  }
  
  const refreshDevicesBtn = document.getElementById('refreshDevicesBtn');
  if (refreshDevicesBtn) {
    refreshDevicesBtn.addEventListener('click', window.refreshDevices);
  }
  
  const bulkTrustDevicesBtn = document.getElementById('bulkTrustDevicesBtn');
  if (bulkTrustDevicesBtn) {
    bulkTrustDevicesBtn.addEventListener('click', window.bulkTrustDevices);
  }
  
  const bulkBlockDevicesBtn = document.getElementById('bulkBlockDevicesBtn');
  if (bulkBlockDevicesBtn) {
    bulkBlockDevicesBtn.addEventListener('click', window.bulkBlockDevices);
  }
  
  const saveSecuritySettingsBtn = document.getElementById('saveSecuritySettingsBtn');
  if (saveSecuritySettingsBtn) {
    saveSecuritySettingsBtn.addEventListener('click', window.saveSecuritySettings);
  }
});