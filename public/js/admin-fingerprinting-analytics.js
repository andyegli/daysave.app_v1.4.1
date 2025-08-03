/**
 * Admin Device Fingerprinting Analytics Dashboard
 * 
 * Provides comprehensive analytics and statistics for device fingerprinting
 * and geolocation data with detailed breakdowns and visualizations.
 * 
 * @version 1.0.0
 * @author DaySave Security Team
 */

class FingerprintingAnalytics {
  constructor() {
    this.charts = {};
    this.data = null;
    this.init();
  }

  /**
   * Initialize the analytics dashboard
   */
  async init() {
    console.log('📊 Initializing Fingerprinting Analytics Dashboard');
    
    try {
      await this.loadAnalyticsData();
      this.renderAllTables();
      this.initializeCharts();
      this.startAutoRefresh();
      
      console.log('✅ Analytics dashboard initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing analytics dashboard:', error);
      this.showError('Failed to load analytics data');
    }
  }

  /**
   * Load analytics data from API
   */
  async loadAnalyticsData() {
    try {
      const response = await fetch('/admin/api/fingerprinting/analytics');
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      this.data = result.data;
      
      console.log('📊 Analytics data loaded:', this.data);
    } catch (error) {
      console.error('❌ Error loading analytics data:', error);
      throw error;
    }
  }

  /**
   * Render all data tables
   */
  renderAllTables() {
    this.renderDevicesPerUserTable();
    this.renderDevicesPerCountryTable();
    this.renderSuspiciousIPsTable();
    this.renderVPNStats();
    this.renderGeographicTable();
    this.renderRiskByLocationTable();
    this.renderFingerprintCollisionsTable();
  }

  /**
   * Render devices per user table
   */
  renderDevicesPerUserTable() {
    const tbody = document.querySelector('#devicesPerUserTable tbody');
    tbody.innerHTML = '';

    this.data.devicesPerUser.forEach(item => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <strong>${item.User?.username || 'Unknown'}</strong><br>
          <small class="text-muted">${item.User?.email || 'No email'}</small>
        </td>
        <td>
          <span class="badge ${this.getDeviceCountBadge(item.deviceCount)}">
            ${item.deviceCount} devices
          </span>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  /**
   * Render devices per country table
   */
  renderDevicesPerCountryTable() {
    const tbody = document.querySelector('#devicesPerCountryTable tbody');
    tbody.innerHTML = '';

    this.data.devicesPerCountry.forEach(item => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <span class="country-flag" style="background-image: url('https://flagcdn.com/w40/${item.country.toLowerCase()}.png');"></span>
          ${item.countryName || item.country}
        </td>
        <td><strong>${item.deviceCount}</strong></td>
        <td>${item.uniqueUsers}</td>
      `;
      tbody.appendChild(row);
    });
  }

  /**
   * Render suspicious IPs table
   */
  renderSuspiciousIPsTable() {
    const tbody = document.querySelector('#suspiciousIPsTable tbody');
    tbody.innerHTML = '';

    this.data.loginsPerIP.forEach(item => {
      const failureRate = parseFloat(item.failureRate);
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <code>${item.ip_address}</code>
          ${item.is_vpn ? '<br><span class="badge bg-warning badge-sm">VPN/Proxy</span>' : ''}
        </td>
        <td>
          <small>${item.locationDisplay}</small>
        </td>
        <td>
          <strong>${item.attemptCount}</strong>
          <br><small class="text-muted">${item.uniqueUsers} users</small>
        </td>
        <td>
          <span class="badge ${this.getFailureRateBadge(failureRate)}">
            ${failureRate}%
          </span>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  /**
   * Render VPN statistics
   */
  renderVPNStats() {
    const container = document.getElementById('vpnStatsContainer');
    container.innerHTML = '';

    this.data.vpnStats.forEach(item => {
      const isVPN = item.is_vpn;
      const successRate = (parseFloat(item.successRate) * 100).toFixed(1);
      
      const statCard = document.createElement('div');
      statCard.className = 'mb-3';
      statCard.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h6 class="mb-1">
              <i class="fas fa-${isVPN ? 'shield-alt' : 'globe'} me-2"></i>
              ${isVPN ? 'VPN/Proxy' : 'Regular'} Connections
            </h6>
            <p class="mb-0 text-muted">
              ${item.count} attempts from ${item.uniqueUsers} users
            </p>
          </div>
          <div class="text-end">
            <span class="badge ${isVPN ? 'bg-warning' : 'bg-success'} fs-6">
              ${successRate}% success
            </span>
          </div>
        </div>
        <div class="progress mt-2" style="height: 8px;">
          <div class="progress-bar ${isVPN ? 'bg-warning' : 'bg-success'}" 
               style="width: ${successRate}%"></div>
        </div>
      `;
      container.appendChild(statCard);
    });
  }

  /**
   * Render geographic distribution table
   */
  renderGeographicTable() {
    const tbody = document.querySelector('#geographicTable tbody');
    tbody.innerHTML = '';

    this.data.geographicDistribution.forEach(item => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <span class="country-flag" style="background-image: url('https://flagcdn.com/w40/${item.country.toLowerCase()}.png');"></span>
          ${item.city ? `${item.city}, ` : ''}${item.countryName || item.country}
        </td>
        <td><strong>${item.loginCount}</strong></td>
        <td>${item.uniqueUsers}</td>
        <td>
          <span class="badge ${this.getVPNPercentageBadge(item.vpnPercentage)}">
            ${item.vpnPercentage}%
          </span>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  /**
   * Render risk by location table
   */
  renderRiskByLocationTable() {
    const tbody = document.querySelector('#riskByLocationTable tbody');
    tbody.innerHTML = '';

    this.data.riskByLocation.forEach(item => {
      const failureRate = parseFloat(item.failureRate);
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <span class="country-flag" style="background-image: url('https://flagcdn.com/w40/${item.country.toLowerCase()}.png');"></span>
          ${item.countryName || item.country}
        </td>
        <td>${item.totalAttempts}</td>
        <td>
          <span class="badge ${this.getFailureRateBadge(failureRate)}">
            ${failureRate}%
          </span>
        </td>
        <td>
          <span class="risk-badge ${this.getRiskLevelClass(failureRate)}">
            ${this.getRiskLevel(failureRate)}
          </span>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  /**
   * Render fingerprint collisions table
   */
  renderFingerprintCollisionsTable() {
    const tbody = document.querySelector('#fingerprintCollisionsTable tbody');
    tbody.innerHTML = '';

    if (this.data.fingerprintCollisions.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center text-muted">
            <i class="fas fa-check-circle me-2"></i>
            No fingerprint collisions detected
          </td>
        </tr>
      `;
      return;
    }

    this.data.fingerprintCollisions.forEach(item => {
      const riskLevel = this.getCollisionRiskLevel(item.userCount);
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <code class="fingerprint-hash">${item.device_fingerprint.substring(0, 16)}...</code>
        </td>
        <td>
          <span class="badge bg-danger">${item.userCount} users</span>
        </td>
        <td>
          <span class="risk-badge ${this.getCollisionRiskClass(item.userCount)}">
            ${riskLevel}
          </span>
        </td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick="investigateCollision('${item.device_fingerprint}')">
            <i class="fas fa-search"></i> Investigate
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  /**
   * Initialize charts
   */
  initializeCharts() {
    this.initializeTrendsChart();
  }

  /**
   * Initialize trends chart
   */
  initializeTrendsChart() {
    const ctx = document.getElementById('trendsChart').getContext('2d');
    
    const labels = this.data.dailyTrends.map(item => {
      const date = new Date(item.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    this.charts.trends = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Total Attempts',
            data: this.data.dailyTrends.map(item => item.totalAttempts),
            borderColor: '#667eea',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            tension: 0.4
          },
          {
            label: 'Successful Logins',
            data: this.data.dailyTrends.map(item => item.successfulLogins),
            borderColor: '#28a745',
            backgroundColor: 'rgba(40, 167, 69, 0.1)',
            tension: 0.4
          },
          {
            label: 'Unique Devices',
            data: this.data.dailyTrends.map(item => item.uniqueDevices),
            borderColor: '#ffc107',
            backgroundColor: 'rgba(255, 193, 7, 0.1)',
            tension: 0.4
          },
          {
            label: 'Unique Countries',
            data: this.data.dailyTrends.map(item => item.uniqueCountries),
            borderColor: '#fd7e14',
            backgroundColor: 'rgba(253, 126, 20, 0.1)',
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            mode: 'index',
            intersect: false,
          }
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Date'
            }
          },
          y: {
            display: true,
            title: {
              display: true,
              text: 'Count'
            },
            beginAtZero: true
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        }
      }
    });
  }

  /**
   * Helper methods for styling
   */
  getDeviceCountBadge(count) {
    if (count >= 5) return 'bg-danger';
    if (count >= 3) return 'bg-warning';
    return 'bg-success';
  }

  getFailureRateBadge(rate) {
    if (rate >= 80) return 'bg-danger';
    if (rate >= 50) return 'bg-warning';
    if (rate >= 20) return 'bg-secondary';
    return 'bg-success';
  }

  getVPNPercentageBadge(percentage) {
    const pct = parseFloat(percentage);
    if (pct >= 50) return 'bg-danger';
    if (pct >= 20) return 'bg-warning';
    return 'bg-secondary';
  }

  getRiskLevel(failureRate) {
    if (failureRate >= 80) return 'CRITICAL';
    if (failureRate >= 50) return 'HIGH';
    if (failureRate >= 20) return 'MEDIUM';
    return 'LOW';
  }

  getRiskLevelClass(failureRate) {
    if (failureRate >= 80) return 'risk-high';
    if (failureRate >= 50) return 'risk-high';
    if (failureRate >= 20) return 'risk-medium';
    return 'risk-low';
  }

  getCollisionRiskLevel(userCount) {
    if (userCount >= 10) return 'CRITICAL';
    if (userCount >= 5) return 'HIGH';
    if (userCount >= 3) return 'MEDIUM';
    return 'LOW';
  }

  getCollisionRiskClass(userCount) {
    if (userCount >= 10) return 'risk-high';
    if (userCount >= 5) return 'risk-high';
    if (userCount >= 3) return 'risk-medium';
    return 'risk-low';
  }

  /**
   * Start auto-refresh
   */
  startAutoRefresh() {
    setInterval(async () => {
      try {
        await this.loadAnalyticsData();
        this.renderAllTables();
        
        // Update charts
        if (this.charts.trends) {
          this.charts.trends.destroy();
          this.initializeTrendsChart();
        }
      } catch (error) {
        console.warn('⚠️ Auto-refresh failed:', error);
      }
    }, 5 * 60 * 1000); // Refresh every 5 minutes
  }

  /**
   * Show error message
   */
  showError(message) {
    // You can implement a toast notification here
    alert(`❌ ${message}`);
  }
}

// Global functions for button actions
window.investigateCollision = function(fingerprint) {
  // Implement collision investigation functionality
  alert(`Investigating fingerprint collision: ${fingerprint}`);
  // You could open a modal with detailed information about the collision
};

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.fingerprintingAnalytics = new FingerprintingAnalytics();
});