// Analytics Dashboard JavaScript - External file to comply with CSP
console.log('📊 Analytics Dashboard script loaded!');

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
    showError('Failed to load analytics data');
  }
}

// Load overview statistics
async function loadOverviewData() {
  try {
    console.log('📊 Fetching overview data...');
    const response = await fetch('/admin/api/analytics/overview', {
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
    const response = await fetch('/admin/api/analytics/user-trends?days=30', {
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
    const response = await fetch('/admin/api/analytics/content-stats', {
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
    const response = await fetch('/admin/api/analytics/performance?hours=24', {
      credentials: 'include'
    });
    const data = await response.json();
    
    if (data.success) {
      updatePerformanceMetrics(data.data);
      updateSystemInfo(data.data.system);
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
  summaryElement.innerHTML = `
    <div class="activity-item">
      <strong>Recent Logins:</strong> ${data.recentLogins || 0}
    </div>
    <div class="activity-item">
      <strong>Files Uploaded Today:</strong> ${data.filesUploadedToday || 0}
    </div>
    <div class="activity-item">
      <strong>Content Processed:</strong> ${data.contentProcessed || 0}
    </div>
    <div class="activity-item">
      <strong>API Calls Today:</strong> ${data.apiCallsToday || 0}
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
  // Update performance indicators
  if (data.memory) {
    const memoryElement = document.getElementById('memoryUsage');
    if (memoryElement) {
      memoryElement.innerHTML = `
        <div class="metric-value">${Math.round(data.memory.used / 1024 / 1024)}MB</div>
        <div class="metric-label">Memory Used</div>
      `;
    }
  }
  
  if (data.cpu) {
    const cpuElement = document.getElementById('cpuUsage');
    if (cpuElement) {
      cpuElement.innerHTML = `
        <div class="metric-value">${data.cpu.percentage}%</div>
        <div class="metric-label">CPU Usage</div>
      `;
    }
  }
}

// Update system info
function updateSystemInfo(data) {
  const systemInfoElement = document.getElementById('systemInfo');
  systemInfoElement.innerHTML = `
    <div class="row">
      <div class="col-6">
        <strong>Memory:</strong> ${formatBytes(data.memory)}<br>
        <strong>CPU Load:</strong> ${data.cpuLoad}%<br>
        <strong>Free Space:</strong> ${formatBytes(data.freeSpace)}
      </div>
      <div class="col-6">
        <strong>Platform:</strong> ${data.platform}<br>
        <strong>Node.js:</strong> ${data.nodeVersion}<br>
        <strong>Uptime:</strong> ${data.uptime}h
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