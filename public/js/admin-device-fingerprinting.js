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
    
    // Update risk distribution chart
    if (data.riskDistribution) {
      this.updateChart(data.riskDistribution);
    }
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
            <button class="btn btn-outline-primary view-attempt-btn" data-attempt-id="${attempt.id}">
              <i class="fas fa-eye"></i>
            </button>
            ${attempt.device_fingerprint ? 
              `<button class="btn btn-outline-warning trust-device-btn" data-fingerprint="${attempt.device_fingerprint}">
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

    // Handle case where devices is undefined or not an array
    if (!devices || !Array.isArray(devices)) {
      console.warn('⚠️ Devices data is not available or not an array:', devices);
      container.innerHTML = '<div class="col-12"><div class="alert alert-warning">No device data available</div></div>';
      return;
    }

    devices.forEach(device => {
      const deviceCard = document.createElement('div');
      deviceCard.className = 'col-lg-4 col-md-6 mb-4';
      
      // Get device icon based on type
      const deviceIcon = this.getDeviceIcon(device.device_type);
      const deviceTypeDisplay = device.device_type ? device.device_type.charAt(0).toUpperCase() + device.device_type.slice(1) : 'Unknown';
      
      // Format hardware info
      const hardwareInfo = device.device_details?.hardware ? `
        <div class="mb-2">
          <small class="text-muted">Hardware:</small><br>
          <small>
            <i class="fas fa-microchip me-1"></i>${device.device_details.hardware.cpuCores} cores, 
            ${Math.round(device.device_details.hardware.memory / 1024)}GB RAM<br>
            <i class="fas fa-desktop me-1"></i>${device.device_details.hardware.gpu || 'Unknown GPU'}
          </small>
        </div>
      ` : '';
      
      // Format display info
      const displayInfo = device.screen_resolution || device.device_details?.display?.availableScreenSize ? `
        <div class="mb-2">
          <small class="text-muted">Display:</small><br>
          <small>
            <i class="fas fa-tv me-1"></i>${device.screen_resolution || device.device_details.display.availableScreenSize}
            ${device.device_details?.display?.pixelRatio ? ` @${device.device_details.display.pixelRatio}x` : ''}
          </small>
        </div>
      ` : '';
      
      // Format browser fingerprint info
      const fingerprintInfo = device.device_details?.canvas || device.device_details?.audio ? `
        <div class="mb-2">
          <small class="text-muted">Fingerprint Hashes:</small><br>
          <small class="font-monospace">
            ${device.device_details.canvas ? `<i class="fas fa-paint-brush me-1"></i>Canvas: ...${device.device_details.canvas.slice(-8)}<br>` : ''}
            ${device.device_details.audio ? `<i class="fas fa-volume-up me-1"></i>Audio: ...${device.device_details.audio.slice(-8)}` : ''}
          </small>
        </div>
      ` : '';
      
      deviceCard.innerHTML = `
        <div class="card device-card h-100 shadow-sm">
          <div class="card-header bg-light d-flex justify-content-between align-items-center py-2">
            <h6 class="mb-0">
              <i class="${deviceIcon} me-2 text-primary"></i>
              ${deviceTypeDisplay} Device
            </h6>
            ${device.is_trusted ? 
              '<span class="badge bg-success">Trusted</span>' : 
              '<span class="badge bg-warning">Untrusted</span>'}
          </div>
          <div class="card-body">
            <div class="mb-2">
              <small class="text-muted">User:</small><br>
              <strong>${device.user ? device.user.username : 'Unknown'}</strong>
            </div>
            
            ${device.browser_name || device.os_name ? `
              <div class="mb-2">
                <small class="text-muted">Platform:</small><br>
                <small>
                  ${device.browser_name ? `<i class="fab fa-${this.getBrowserIcon(device.browser_name)} me-1"></i>${device.browser_name} ${device.browser_version || ''}` : 'Unknown Browser'}<br>
                  ${device.os_name ? `<i class="fas fa-${this.getOSIcon(device.os_name)} me-1"></i>${device.os_name} ${device.os_version || ''}` : 'Unknown OS'}
                </small>
              </div>
            ` : ''}
            
            ${displayInfo}
            ${hardwareInfo}
            
            <div class="mb-2">
              <small class="text-muted">Location:</small><br>
              <small>
                <i class="fas fa-map-marker-alt me-1"></i>${device.locationDisplay || 'Unknown'}
                ${device.timezone ? `<br><i class="fas fa-clock me-1"></i>${device.timezone}` : ''}
                ${device.location_confidence ? 
                  `<br><span class="text-muted">Confidence: ${Math.round(device.location_confidence * 100)}%</span>` : 
                  ''}
              </small>
            </div>
            
            <div class="mb-2">
              <small class="text-muted">Last Login:</small><br>
              <small>${this.formatDateTime(device.last_login_at)}</small>
            </div>
            
            ${fingerprintInfo}
            
            <div class="mb-3">
              <small class="text-muted">Device ID:</small><br>
              <code class="fingerprint-hash small">${device.device_fingerprint}</code>
            </div>
          </div>
          <div class="card-footer bg-white">
            <div class="btn-group btn-group-sm w-100">
              <button class="btn btn-outline-primary view-device-btn" data-fingerprint="${device.device_fingerprint}" data-device='${JSON.stringify(device).replace(/'/g, "&#39;")}'>
                <i class="fas fa-eye"></i> Details
              </button>
              <button class="btn btn-outline-${device.is_trusted ? 'warning' : 'success'} toggle-trust-btn" 
                      data-fingerprint="${device.device_fingerprint}" data-trusted="${device.is_trusted}">
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
   * Get device icon based on type
   */
  getDeviceIcon(deviceType) {
    switch (deviceType?.toLowerCase()) {
      case 'mobile':
        return 'fas fa-mobile-alt';
      case 'tablet':
        return 'fas fa-tablet-alt';
      case 'laptop':
        return 'fas fa-laptop';
      case 'desktop':
        return 'fas fa-desktop';
      default:
        return 'fas fa-question-circle';
    }
  }

  /**
   * Get browser icon
   */
  getBrowserIcon(browserName) {
    switch (browserName?.toLowerCase()) {
      case 'chrome':
        return 'chrome';
      case 'firefox':
        return 'firefox-browser';
      case 'safari':
        return 'safari';
      case 'edge':
        return 'edge';
      case 'opera':
        return 'opera';
      case 'internet explorer':
      case 'ie':
        return 'internet-explorer';
      default:
        return 'globe';
    }
  }

  /**
   * Get OS icon
   */
  getOSIcon(osName) {
    switch (osName?.toLowerCase()) {
      case 'windows':
        return 'windows';
      case 'macos':
      case 'mac os':
        return 'apple';
      case 'ios':
        return 'apple';
      case 'android':
        return 'android';
      case 'linux':
        return 'linux';
      default:
        return 'question-circle';
    }
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

    // Event delegation for dynamically created buttons
    document.addEventListener('click', (e) => {
      // View attempt details
      if (e.target.closest('.view-attempt-btn')) {
        const attemptId = e.target.closest('.view-attempt-btn').dataset.attemptId;
        this.viewAttemptDetails(attemptId);
      }
      
      // Trust device from attempt
      if (e.target.closest('.trust-device-btn')) {
        const fingerprint = e.target.closest('.trust-device-btn').dataset.fingerprint;
        this.trustDevice(fingerprint);
      }
      
      // View device details
      if (e.target.closest('.view-device-btn')) {
        const fingerprint = e.target.closest('.view-device-btn').dataset.fingerprint;
        this.viewDeviceDetails(fingerprint);
      }
      
      // Toggle device trust
      if (e.target.closest('.toggle-trust-btn')) {
        const btn = e.target.closest('.toggle-trust-btn');
        const fingerprint = btn.dataset.fingerprint;
        const isTrusted = btn.dataset.trusted === 'true';
        this.toggleDeviceTrust(fingerprint, isTrusted);
      }
      
      // Copy fingerprint to clipboard
      if (e.target.closest('.copy-fingerprint-btn')) {
        const fingerprint = e.target.closest('.copy-fingerprint-btn').dataset.fingerprint;
        this.copyToClipboard(fingerprint);
      }
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

  /**
   * Copy text to clipboard
   */
  async copyToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        this.showSuccess('Fingerprint copied to clipboard');
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
        this.showSuccess('Fingerprint copied to clipboard');
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      this.showError('Failed to copy fingerprint');
    }
  }

  /**
   * View attempt details
   */
  viewAttemptDetails(attemptId) {
    // Implement modal or page to show attempt details
    alert(`View details for attempt: ${attemptId}`);
  }

  /**
   * Trust device
   */
  async trustDevice(fingerprint) {
    try {
      const response = await fetch('/admin/api/fingerprinting/trust-device', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fingerprint })
      });

      if (response.ok) {
        this.showSuccess('Device trusted successfully');
        await this.refreshDevices();
      } else {
        throw new Error('Failed to trust device');
      }
    } catch (error) {
      this.showError('Failed to trust device');
    }
  }

  /**
   * View device details
   */
  viewDeviceDetails(fingerprint, deviceData = null) {
    // If device data is passed, use it; otherwise fetch from the current devices list
    let device = deviceData;
    if (!device) {
      // Find device in current devices list
      const deviceElements = document.querySelectorAll('.view-device-btn');
      for (const element of deviceElements) {
        if (element.dataset.fingerprint === fingerprint) {
          try {
            device = JSON.parse(element.dataset.device);
            break;
          } catch (e) {
            console.warn('Could not parse device data:', e);
          }
        }
      }
    }

    if (!device) {
      this.showError('Device details not found');
      return;
    }

    // Create and show device details modal
    this.showDeviceDetailsModal(device);
  }

  /**
   * Show device details modal
   */
  showDeviceDetailsModal(device) {
    // Create modal HTML
    const modalHtml = `
      <div class="modal fade" id="deviceDetailsModal" tabindex="-1" aria-labelledby="deviceDetailsModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="deviceDetailsModalLabel">
                <i class="${this.getDeviceIcon(device.device_type)} me-2"></i>
                Device Fingerprint Details
              </h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              ${this.generateDeviceDetailsHTML(device)}
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
              <button type="button" class="btn btn-primary copy-fingerprint-btn" data-bs-dismiss="modal" data-fingerprint="${device.device_fingerprint}">
                <i class="fas fa-copy me-1"></i>Copy Fingerprint
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('deviceDetailsModal');
    if (existingModal) {
      existingModal.remove();
    }

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('deviceDetailsModal'));
    modal.show();
  }

  /**
   * Generate comprehensive device details HTML
   */
  generateDeviceDetailsHTML(device) {
    const details = device.device_details || {};
    
    return `
      <div class="row">
        <!-- Basic Information -->
        <div class="col-md-6">
          <h6 class="text-primary"><i class="fas fa-info-circle me-2"></i>Basic Information</h6>
          <table class="table table-sm">
            <tr><td><strong>Device Type:</strong></td><td>${device.device_type || 'Unknown'}</td></tr>
            <tr><td><strong>User:</strong></td><td>${device.user?.username || 'Unknown'}</td></tr>
            <tr><td><strong>Trusted:</strong></td><td>${device.is_trusted ? '<span class="badge bg-success">Yes</span>' : '<span class="badge bg-warning">No</span>'}</td></tr>
            <tr><td><strong>Last Login:</strong></td><td>${this.formatDateTime(device.last_login_at)}</td></tr>
            <tr><td><strong>Created:</strong></td><td>${this.formatDateTime(device.createdAt)}</td></tr>
          </table>
        </div>

        <!-- Location Information -->
        <div class="col-md-6">
          <h6 class="text-primary"><i class="fas fa-map-marker-alt me-2"></i>Location Information</h6>
          <table class="table table-sm">
            <tr><td><strong>Location:</strong></td><td>${device.city || 'Unknown'}, ${device.country || 'Unknown'}</td></tr>
            <tr><td><strong>Timezone:</strong></td><td>${device.timezone || 'Unknown'}</td></tr>
            <tr><td><strong>Coordinates:</strong></td><td>${device.latitude && device.longitude ? `${device.latitude}, ${device.longitude}` : 'Unknown'}</td></tr>
            <tr><td><strong>Confidence:</strong></td><td>${device.location_confidence ? Math.round(device.location_confidence * 100) + '%' : 'Unknown'}</td></tr>
          </table>
        </div>
      </div>

      <div class="row mt-3">
        <!-- Platform Information -->
        <div class="col-md-6">
          <h6 class="text-primary"><i class="fab fa-${this.getBrowserIcon(device.browser_name)} me-2"></i>Platform Information</h6>
          <table class="table table-sm">
            <tr><td><strong>Browser:</strong></td><td>${device.browser_name || 'Unknown'} ${device.browser_version || ''}</td></tr>
            <tr><td><strong>Operating System:</strong></td><td>${device.os_name || 'Unknown'} ${device.os_version || ''}</td></tr>
            <tr><td><strong>Architecture:</strong></td><td>${details.hardware?.architecture || 'Unknown'}</td></tr>
            <tr><td><strong>Language:</strong></td><td>${details.browser?.language || 'Unknown'}</td></tr>
          </table>
        </div>

        <!-- Hardware Information -->
        <div class="col-md-6">
          <h6 class="text-primary"><i class="fas fa-microchip me-2"></i>Hardware Information</h6>
          <table class="table table-sm">
            <tr><td><strong>CPU Cores:</strong></td><td>${details.hardware?.cpuCores || 'Unknown'}</td></tr>
            <tr><td><strong>Memory:</strong></td><td>${details.hardware?.memory ? Math.round(details.hardware.memory / 1024) + ' GB' : 'Unknown'}</td></tr>
            <tr><td><strong>GPU:</strong></td><td class="small">${details.hardware?.gpu || 'Unknown'}</td></tr>
            <tr><td><strong>Screen:</strong></td><td>${device.screen_resolution || 'Unknown'}</td></tr>
          </table>
        </div>
      </div>

      <div class="row mt-3">
        <!-- Browser Fingerprinting -->
        <div class="col-12">
          <h6 class="text-primary"><i class="fas fa-fingerprint me-2"></i>Browser Fingerprinting</h6>
          <div class="row">
            <div class="col-md-6">
              <table class="table table-sm">
                <tr><td><strong>Canvas Hash:</strong></td><td class="font-monospace small">${details.canvas?.hash?.substring(0, 20) + '...' || 'Unknown'}</td></tr>
                <tr><td><strong>Audio Hash:</strong></td><td class="font-monospace small">${details.audio?.hash?.substring(0, 20) + '...' || 'Unknown'}</td></tr>
                <tr><td><strong>WebGL Vendor:</strong></td><td class="small">${details.webgl?.vendor || 'Unknown'}</td></tr>
                <tr><td><strong>WebGL Renderer:</strong></td><td class="small">${details.webgl?.renderer?.substring(0, 30) + '...' || 'Unknown'}</td></tr>
              </table>
            </div>
            <div class="col-md-6">
              <table class="table table-sm">
                <tr><td><strong>Pixel Ratio:</strong></td><td>${details.display?.pixelRatio || 'Unknown'}</td></tr>
                <tr><td><strong>Color Depth:</strong></td><td>${details.display?.colorDepth || 'Unknown'} bit</td></tr>
                <tr><td><strong>Touch Support:</strong></td><td>${details.browser?.touchSupport ? 'Yes' : 'No'}</td></tr>
                <tr><td><strong>Do Not Track:</strong></td><td>${details.browser?.doNotTrack ? 'Enabled' : 'Disabled'}</td></tr>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div class="row mt-3">
        <!-- Fonts and Audio -->
        <div class="col-md-6">
          <h6 class="text-primary"><i class="fas fa-font me-2"></i>Detected Fonts</h6>
          <div class="small">
            ${details.canvas?.fonts ? details.canvas.fonts.map(font => `<span class="badge bg-light text-dark me-1">${font}</span>`).join('') : 'Unknown'}
          </div>
        </div>
        <div class="col-md-6">
          <h6 class="text-primary"><i class="fas fa-volume-up me-2"></i>Audio Capabilities</h6>
          <table class="table table-sm">
            <tr><td><strong>Sample Rate:</strong></td><td>${details.audio?.sampleRate || 'Unknown'} Hz</td></tr>
            <tr><td><strong>Channels:</strong></td><td>${details.audio?.channels || 'Unknown'}</td></tr>
          </table>
        </div>
      </div>

      <div class="row mt-3">
        <div class="col-12">
          <h6 class="text-primary"><i class="fas fa-code me-2"></i>User Agent</h6>
          <div class="bg-light p-2 rounded">
            <code class="small">${device.user_agent || 'Unknown'}</code>
          </div>
        </div>
      </div>

      <div class="row mt-3">
        <div class="col-12">
          <h6 class="text-primary"><i class="fas fa-key me-2"></i>Device Fingerprint</h6>
          <div class="bg-light p-2 rounded">
            <code>${device.device_fingerprint}</code>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Toggle device trust
   */
  async toggleDeviceTrust(fingerprint, currentTrust) {
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
        this.showSuccess(`Device ${action}ed successfully`);
        await this.refreshDevices();
      } else {
        throw new Error(`Failed to ${action} device`);
      }
    } catch (error) {
      this.showError(`Failed to ${currentTrust ? 'untrust' : 'trust'} device`);
    }
  }

  /**
   * Refresh login attempts
   */
  async refreshLoginAttempts() {
    try {
      const attempts = await this.fetchData('/admin/api/fingerprinting/login-attempts');
      this.updateLoginAttemptsTable(attempts);
      this.showSuccess('Login attempts refreshed');
    } catch (error) {
      this.showError('Failed to refresh login attempts');
    }
  }

  /**
   * Refresh devices
   */
  async refreshDevices() {
    try {
      const devices = await this.fetchData('/admin/api/fingerprinting/devices');
      this.updateDevicesDisplay(devices);
      this.showSuccess('Devices refreshed');
    } catch (error) {
      this.showError('Failed to refresh devices');
    }
  }

  /**
   * Export login data
   */
  exportLoginData() {
    // Implement CSV export
    window.open('/admin/api/fingerprinting/export-login-data');
  }

  /**
   * Bulk trust devices
   */
  bulkTrustDevices() {
    // Implement bulk trust functionality
    alert('Bulk trust devices functionality would be implemented here');
  }

  /**
   * Bulk block devices
   */
  bulkBlockDevices() {
    // Implement bulk block functionality
    alert('Bulk block devices functionality would be implemented here');
  }

  /**
   * Save security settings
   */
  async saveSecuritySettings() {
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
        this.showSuccess('Security settings saved successfully');
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      this.showError('Failed to save security settings');
    }
  }
}

// Initialize dashboard when DOM is ready
let adminDashboard;
document.addEventListener('DOMContentLoaded', () => {
  adminDashboard = new DeviceFingerprintingAdmin();
  
  // Attach event listeners to buttons to replace inline onclick handlers
  const refreshLoginAttemptsBtn = document.getElementById('refreshLoginAttemptsBtn');
  if (refreshLoginAttemptsBtn) {
    refreshLoginAttemptsBtn.addEventListener('click', () => adminDashboard.refreshLoginAttempts());
  }
  
  const exportLoginDataBtn = document.getElementById('exportLoginDataBtn');
  if (exportLoginDataBtn) {
    exportLoginDataBtn.addEventListener('click', () => adminDashboard.exportLoginData());
  }
  
  const refreshDevicesBtn = document.getElementById('refreshDevicesBtn');
  if (refreshDevicesBtn) {
    refreshDevicesBtn.addEventListener('click', () => adminDashboard.refreshDevices());
  }
  
  const bulkTrustDevicesBtn = document.getElementById('bulkTrustDevicesBtn');
  if (bulkTrustDevicesBtn) {
    bulkTrustDevicesBtn.addEventListener('click', () => adminDashboard.bulkTrustDevices());
  }
  
  const bulkBlockDevicesBtn = document.getElementById('bulkBlockDevicesBtn');
  if (bulkBlockDevicesBtn) {
    bulkBlockDevicesBtn.addEventListener('click', () => adminDashboard.bulkBlockDevices());
  }
  
  const saveSecuritySettingsBtn = document.getElementById('saveSecuritySettingsBtn');
  if (saveSecuritySettingsBtn) {
    saveSecuritySettingsBtn.addEventListener('click', () => adminDashboard.saveSecuritySettings());
  }
});