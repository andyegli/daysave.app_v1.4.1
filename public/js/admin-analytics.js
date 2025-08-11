// Analytics Dashboard JavaScript - External file to comply with CSP
console.log('📊 Analytics Dashboard script loaded!');

// Protocol fix helper function
function getCorrectUrl(path) {
  if (window.location.hostname === 'localhost') {
    return path.replace('https://localhost', 'http://localhost');
  }
  return path;
}

// Chart instances
let userActivityChart = null;
let roleDistributionChart = null;
let contentTypesChart = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
  console.log('📊 Analytics Dashboard initializing...');
  loadAllData();
  
  // Auto-refresh every 5 minutes
  setInterval(loadAllData, 5 * 60 * 1000);
  console.log('⏰ Set up 5-minute refresh interval for analytics');
});

// Load all analytics data
async function loadAllData() {
  try {
    console.log('🔄 Loading all analytics data...');
    await Promise.all([
      loadOverviewData(),
      loadUserTrends(),
      loadContentStats(),
      loadPerformanceData()
    ]);
    console.log('✅ All analytics data loaded successfully');
  } catch (error) {
    console.error('❌ Error loading analytics data:', error);
    showError('Failed to load analytics data. Please check your connection and try again.');
  }
}

// Load overview statistics
async function loadOverviewData() {
  try {
    console.log('📊 Fetching overview data...');
    const response = await fetch(getCorrectUrl('/admin/api/analytics/overview'), {
      credentials: 'include'
    });
    const data = await response.json();
    
    if (data.success) {
      const overview = data.data;
      
      // Update overview stats
      document.getElementById('totalUsers').textContent = overview.users.total;
      document.getElementById('activeUsers').textContent = `${overview.users.active24h} active today`;
      document.getElementById('totalContent').textContent = overview.content.totalContent;
      document.getElementById('newContent').textContent = `${overview.content.newThisWeek} this week`;
      document.getElementById('totalActivity').textContent = overview.activity.totalEvents;
      document.getElementById('recentActivity').textContent = `${overview.activity.recent24h} in 24h`;
      
      // System health calculation
      const memoryPercentage = Math.round((overview.system.memoryUsage.heapUsed / overview.system.memoryUsage.heapTotal) * 100);
      const healthScore = Math.max(0, 100 - memoryPercentage);
      document.getElementById('systemHealth').textContent = `${healthScore}%`;
      document.getElementById('uptime').textContent = `${Math.round(overview.system.uptime / 3600)}h uptime`;
    }
  } catch (error) {
    console.error('Error loading overview:', error);
  }
}

// Load user trends data
async function loadUserTrends() {
  try {
    console.log('📊 Fetching user trends...');
    const response = await fetch(getCorrectUrl('/admin/api/analytics/user-trends?days=30'), {
      credentials: 'include'
    });
    const data = await response.json();
    
    if (data.success) {
      updateUserActivityChart(data.data);
      updateRoleDistributionChart(data.data.roleDistribution);
    }
  } catch (error) {
    console.error('Error loading user trends:', error);
  }
}

// Load content statistics
async function loadContentStats() {
  try {
    console.log('📊 Fetching content stats...');
    const response = await fetch(getCorrectUrl('/admin/api/analytics/content-stats'), {
      credentials: 'include'
    });
    const data = await response.json();
    
    if (data.success) {
      updateContentTypesChart(data.data.contentTypes);
      updateTopUsersTable(data.data.topUsers);
    }
  } catch (error) {
    console.error('Error loading content stats:', error);
  }
}

// Load performance data
async function loadPerformanceData() {
  try {
    console.log('📊 Fetching performance data...');
    const response = await fetch(getCorrectUrl('/admin/api/analytics/performance?hours=24'), {
      credentials: 'include'
    });
    const data = await response.json();
    
    if (data.success) {
      updatePerformanceMetrics(data.data);
      updateSystemInfo(data.data.system);
      updateActivitySummary(data.data);
    }
  } catch (error) {
    console.error('Error loading performance data:', error);
  }
}

// Update user activity chart
function updateUserActivityChart(data) {
  const ctx = document.getElementById('userActivityChart').getContext('2d');
  
  if (userActivityChart) {
    userActivityChart.destroy();
  }
  
  userActivityChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.registrations.map(r => new Date(r.date).toLocaleDateString()),
      datasets: [
        {
          label: 'New Registrations',
          data: data.registrations.map(r => r.count),
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          tension: 0.4
        },
        {
          label: 'Login Activity',
          data: data.loginActivity.map(a => a.count),
          borderColor: '#764ba2',
          backgroundColor: 'rgba(118, 75, 162, 0.1)',
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

// Update role distribution chart
function updateRoleDistributionChart(data) {
  const ctx = document.getElementById('roleDistributionChart').getContext('2d');
  
  if (roleDistributionChart) {
    roleDistributionChart.destroy();
  }
  
  roleDistributionChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.map(r => r.role),
      datasets: [{
        data: data.map(r => r.count),
        backgroundColor: [
          '#667eea',
          '#764ba2',
          '#ff6b6b',
          '#4ecdc4',
          '#45b7d1',
          '#f9ca24'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

// Update content types chart
function updateContentTypesChart(data) {
  const ctx = document.getElementById('contentTypesChart').getContext('2d');
  
  if (contentTypesChart) {
    contentTypesChart.destroy();
  }
  
  contentTypesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(c => c.type),
      datasets: [{
        label: 'Content Items',
        data: data.map(c => c.count),
        backgroundColor: '#667eea',
        borderColor: '#667eea',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

// Update overview statistics
function updateOverviewStats(data) {
  document.getElementById('totalUsers').textContent = data.totalUsers || '0';
  document.getElementById('newUsersToday').textContent = data.newUsersToday || '0';
  document.getElementById('totalContent').textContent = data.totalContent || '0';
  document.getElementById('activeToday').textContent = data.activeToday || '0';
}

// Update activity summary
function updateActivitySummary(data) {
  const summaryElement = document.getElementById('activitySummary');
  
  if (!data) {
    summaryElement.innerHTML = `
      <div class="text-center py-4">
        <i class="bi bi-clock-history text-muted fs-2"></i>
        <p class="text-muted mt-2">No recent activity data</p>
      </div>
    `;
    return;
  }
  
  // Use data from the performance endpoint or overview data
  const activityData = {
    jobsProcessed: data.jobStatus ? data.jobStatus.reduce((sum, js) => sum + js.count, 0) : 0,
    performanceJobs: data.performance ? data.performance.length : 0,
    systemUptime: data.system ? data.system.uptime : 0,
    memoryUsage: data.system ? data.system.memory?.percentage : 0
  };
  
  summaryElement.innerHTML = `
    <div class="row g-3">
      <div class="col-md-6">
        <div class="d-flex align-items-center p-2 bg-light rounded">
          <div class="me-3">
            <i class="bi bi-gear-fill text-primary fs-4"></i>
          </div>
          <div>
            <div class="fw-bold">${activityData.jobsProcessed}</div>
            <small class="text-muted">Processing Jobs</small>
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="d-flex align-items-center p-2 bg-light rounded">
          <div class="me-3">
            <i class="bi bi-speedometer2 text-success fs-4"></i>
          </div>
          <div>
            <div class="fw-bold">${activityData.performanceJobs}</div>
            <small class="text-muted">Performance Metrics</small>
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="d-flex align-items-center p-2 bg-light rounded">
          <div class="me-3">
            <i class="bi bi-clock text-info fs-4"></i>
          </div>
          <div>
            <div class="fw-bold">${activityData.systemUptime}h</div>
            <small class="text-muted">System Uptime</small>
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="d-flex align-items-center p-2 bg-light rounded">
          <div class="me-3">
            <i class="bi bi-memory text-warning fs-4"></i>
          </div>
          <div>
            <div class="fw-bold">${activityData.memoryUsage}%</div>
            <small class="text-muted">Memory Usage</small>
          </div>
        </div>
      </div>
    </div>
    <div class="mt-3 text-center">
      <small class="text-muted">
        <i class="bi bi-info-circle me-1"></i>
        Last updated: ${new Date().toLocaleTimeString()}
      </small>
    </div>
  `;
}

// Update top users table
function updateTopUsersTable(data) {
  const tableBody = document.getElementById('topUsersTable');
  
  if (!data || data.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="4" class="text-center">No data available</td></tr>';
    return;
  }
  
  tableBody.innerHTML = data.map(user => `
    <tr>
      <td>${user.username}</td>
      <td>${user.fileCount}</td>
      <td>${formatBytes(user.storageUsed)}</td>
      <td>
        <div class="progress">
          <div class="progress-bar" role="progressbar" style="width: ${user.percentage}%"></div>
        </div>
        ${user.percentage}%
      </td>
    </tr>
  `).join('');
}

// Update performance metrics
function updatePerformanceMetrics(data) {
  const performanceElement = document.getElementById('performanceMetrics');
  
  if (!data || (!data.performance && !data.jobStatus && !data.system)) {
    performanceElement.innerHTML = `
      <div class="text-center py-4">
        <i class="bi bi-info-circle text-muted fs-1"></i>
        <p class="text-muted mt-2">No performance data available</p>
        <small class="text-muted">Performance metrics will appear when there is processing activity</small>
      </div>
    `;
    return;
  }

  let performanceHTML = '<div class="row">';
  
  // Performance metrics
  if (data.performance && data.performance.length > 0) {
    performanceHTML += `
      <div class="col-12 mb-3">
        <h6><i class="bi bi-speedometer me-2"></i>Processing Performance</h6>
        <div class="table-responsive">
          <table class="table table-sm">
            <thead>
              <tr>
                <th>AI Job</th>
                <th>Avg Time</th>
                <th>Min Time</th>
                <th>Max Time</th>
                <th>Jobs</th>
              </tr>
            </thead>
            <tbody>
              ${data.performance.map(p => `
                <tr>
                  <td><span class="badge bg-primary">${p.aiJob}</span></td>
                  <td>${p.avgTime}s</td>
                  <td>${p.minTime}s</td>
                  <td>${p.maxTime}s</td>
                  <td>${p.jobCount}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
  
  // Job status distribution
  if (data.jobStatus && data.jobStatus.length > 0) {
    performanceHTML += `
      <div class="col-md-6 mb-3">
        <h6><i class="bi bi-list-check me-2"></i>Job Status</h6>
        ${data.jobStatus.map(js => `
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="badge ${getStatusBadgeClass(js.status)}">${js.status}</span>
            <span class="fw-bold">${js.count}</span>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  // System metrics preview
  if (data.system) {
    performanceHTML += `
      <div class="col-md-6">
        <h6><i class="bi bi-memory me-2"></i>System Resources</h6>
        <div class="mb-2">
          <small class="text-muted">Memory Usage</small>
          <div class="progress">
            <div class="progress-bar" style="width: ${data.system.memory.percentage}%">
              ${data.system.memory.used}MB / ${data.system.memory.total}MB
            </div>
          </div>
        </div>
        <div class="row text-center">
          <div class="col-6">
            <div class="metric-badge badge bg-info">
              ${data.system.uptime}h uptime
            </div>
          </div>
          <div class="col-6">
            <div class="metric-badge badge bg-secondary">
              ${data.system.platform}
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  performanceHTML += '</div>';
  
  // If no data at all, show empty state
  if (!data.performance?.length && !data.jobStatus?.length && !data.system) {
    performanceHTML = `
      <div class="text-center py-4">
        <i class="bi bi-info-circle text-muted fs-1"></i>
        <p class="text-muted mt-2">No performance data available</p>
        <small class="text-muted">Performance metrics will appear when there is processing activity</small>
      </div>
    `;
  }
  
  performanceElement.innerHTML = performanceHTML;
}

// Helper function for job status badges
function getStatusBadgeClass(status) {
  switch (status.toLowerCase()) {
    case 'completed': return 'bg-success';
    case 'failed': return 'bg-danger';
    case 'pending': return 'bg-warning';
    case 'processing': return 'bg-info';
    default: return 'bg-secondary';
  }
}

// Update system info
function updateSystemInfo(data) {
  const systemInfoElement = document.getElementById('systemInfo');
  
  if (!data) {
    systemInfoElement.innerHTML = `
      <div class="text-center py-4">
        <i class="bi bi-info-circle text-muted fs-2"></i>
        <p class="text-muted mt-2">No system information available</p>
      </div>
    `;
    return;
  }
  
  systemInfoElement.innerHTML = `
    <div class="row">
      <div class="col-md-6 mb-3">
        <div class="border-start border-primary border-3 ps-3">
          <h6 class="mb-2"><i class="bi bi-memory me-2"></i>Memory Usage</h6>
          <div class="progress mb-2">
            <div class="progress-bar" style="width: ${data.memory?.percentage || 0}%">
              ${data.memory?.percentage || 0}%
            </div>
          </div>
          <small class="text-muted">
            ${data.memory?.used || 0}MB / ${data.memory?.total || 0}MB used
          </small>
        </div>
      </div>
      <div class="col-md-6 mb-3">
        <div class="border-start border-success border-3 ps-3">
          <h6 class="mb-2"><i class="bi bi-clock me-2"></i>System Uptime</h6>
          <div class="fs-4 text-success fw-bold">${data.uptime || 0}h</div>
          <small class="text-muted">Hours running</small>
        </div>
      </div>
      <div class="col-md-6">
        <div class="border-start border-info border-3 ps-3">
          <h6 class="mb-2"><i class="bi bi-gear me-2"></i>Environment</h6>
          <div><strong>Platform:</strong> ${data.platform || 'Unknown'}</div>
          <div><strong>Node.js:</strong> ${data.nodeVersion || 'Unknown'}</div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="border-start border-warning border-3 ps-3">
          <h6 class="mb-2"><i class="bi bi-cpu me-2"></i>Performance</h6>
          <div class="text-warning fw-bold">
            ${data.memory?.percentage ? (data.memory.percentage < 80 ? 'Good' : 'High Usage') : 'Monitoring'}
          </div>
          <small class="text-muted">Memory status</small>
        </div>
      </div>
    </div>
  `;
}

// Refresh all data
function refreshAllData() {
  // Show refresh indicators
  document.querySelectorAll('.refresh-indicator').forEach(indicator => {
    indicator.style.animation = 'pulse 0.5s infinite';
  });
  
  loadAllData().then(() => {
    // Reset indicators
    setTimeout(() => {
      document.querySelectorAll('.refresh-indicator').forEach(indicator => {
        indicator.style.animation = 'pulse 2s infinite';
      });
    }, 1000);
  });
}

// Helper functions
function getOrdinalSuffix(num) {
  const j = num % 10;
  const k = num % 100;
  if (j == 1 && k != 11) return "st";
  if (j == 2 && k != 12) return "nd";
  if (j == 3 && k != 13) return "rd";
  return "th";
}

function showError(message) {
  // Simple error notification
  const toast = document.createElement('div');
  toast.className = 'toast position-fixed top-0 end-0 m-3';
  toast.innerHTML = `
    <div class="toast-body bg-danger text-white">
      ${message}
    </div>
  `;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    document.body.removeChild(toast);
  }, 5000);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
} 