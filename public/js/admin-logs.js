// Admin Logs JavaScript - External file to comply with CSP
console.log('📋 Admin Logs script loaded!');

let currentPage = 1;
let totalPages = 1;
let isLiveMode = true;
let eventSource = null;
let logs = [];
let filteredLogs = [];

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
  console.log('📋 Admin Logs initializing...');
  loadLogs();
  if (isLiveMode) {
    startLiveMode();
  }
  
  // Add CSP-compliant event handlers
  setupEventHandlers();
});

// Setup CSP-compliant event handlers
function setupEventHandlers() {
  // Handle filter changes
  $(document).on('change', '[data-action="apply-filters"]', function() {
    applyFilters();
  });
  
  // Handle search keyup
  $(document).on('keyup', '[data-action="apply-filters-keyup"]', function() {
    applyFilters();
  });
  
  // Handle button clicks
  $(document).on('click', '[data-action="clear-logs"]', function(e) {
    e.preventDefault();
    clearLogs();
  });
  
  $(document).on('click', '[data-action="export-logs"]', function(e) {
    e.preventDefault();
    exportLogs();
  });
  
  $(document).on('click', '[data-action="refresh-logs"]', function(e) {
    e.preventDefault();
    refreshLogs();
  });
  
  $(document).on('change', '[data-action="toggle-live-mode"]', function() {
    toggleLiveMode();
  });
}

// Load logs from API
async function loadLogs(page = 1) {
  try {
    console.log('📋 Loading logs from API...');
    const filters = getFilters();
    const params = new URLSearchParams({
      ...filters,
      page: page
    });

    const response = await fetch(`/admin/api/logs?${params}`, {
      credentials: 'include'
    });
    const data = await response.json();

    if (data.success) {
      logs = data.logs;
      filteredLogs = logs;
      currentPage = data.page;
      totalPages = data.totalPages;
      
      renderLogs();
      updateStatistics();
      updatePagination();
      console.log(`✅ Loaded ${logs.length} logs successfully`);
    } else {
      showError('Failed to load logs');
    }
  } catch (error) {
    console.error('Error loading logs:', error);
    showError('Error loading logs');
  }
}

// Get current filter values
function getFilters() {
  return {
    channel: document.getElementById('channelFilter').value,
    level: document.getElementById('levelFilter').value,
    userId: document.getElementById('userFilter').value,
    search: document.getElementById('searchFilter').value,
    limit: document.getElementById('limitFilter').value
  };
}

// Apply filters and reload logs
function applyFilters() {
  console.log('🔍 Applying filters...');
  currentPage = 1;
  loadLogs(1);
}

// Refresh logs
function refreshLogs() {
  console.log('🔄 Refreshing logs...');
  loadLogs(currentPage);
}

// Clear log display
function clearLogs() {
  console.log('🗑️ Clearing log display...');
  document.getElementById('logContainer').innerHTML = '<div class="text-center text-muted"><i class="bi bi-inbox"></i><br>Log display cleared</div>';
  logs = [];
  filteredLogs = [];
  updateStatistics();
}

// Toggle live mode
function toggleLiveMode() {
  isLiveMode = document.getElementById('liveMode').checked;
  console.log(`📡 Live mode ${isLiveMode ? 'enabled' : 'disabled'}`);
  
  if (isLiveMode) {
    startLiveMode();
  } else {
    stopLiveMode();
  }
}

// Start live mode (Server-Sent Events)
function startLiveMode() {
  console.log('📡 Starting live mode...');
  if (eventSource) {
    eventSource.close();
  }

  const filters = getFilters();
  const params = new URLSearchParams(filters);
  
  eventSource = new EventSource(`/admin/api/logs/stream?${params}`);
  
  eventSource.onopen = function() {
    updateConnectionStatus(true);
    console.log('📡 SSE connection opened');
  };
  
  eventSource.onmessage = function(event) {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'connected') {
        updateConnectionStatus(true);
      } else if (data.type === 'log') {
        addNewLogEntry(data.data);
      } else if (data.type === 'error') {
        showError(data.message);
      }
    } catch (error) {
      console.error('Error parsing SSE data:', error);
    }
  };
  
  eventSource.onerror = function() {
    console.warn('📡 SSE connection error, reconnecting in 5s...');
    updateConnectionStatus(false);
    setTimeout(() => {
      if (isLiveMode) {
        startLiveMode();
      }
    }, 5000);
  };
}

// Stop live mode
function stopLiveMode() {
  console.log('📡 Stopping live mode...');
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  updateConnectionStatus(false);
}

// Add new log entry (for live mode)
function addNewLogEntry(logEntry) {
  logs.unshift(logEntry);
  
  // Limit to prevent memory issues
  if (logs.length > 1000) {
    logs = logs.slice(0, 1000);
  }
  
  filteredLogs = logs;
  renderLogs();
  updateStatistics();
  
  // Highlight new entry
  setTimeout(() => {
    const firstEntry = document.querySelector('.log-entry');
    if (firstEntry) {
      firstEntry.classList.add('new-entry');
    }
  }, 100);
}

// Update connection status
function updateConnectionStatus(connected) {
  const statusIndicator = document.getElementById('connectionStatus');
  const statusText = document.getElementById('connectionText');
  
  if (connected) {
    statusIndicator.className = 'status-indicator connected';
    statusText.textContent = 'Connected';
  } else {
    statusIndicator.className = 'status-indicator disconnected';
    statusText.textContent = 'Disconnected';
  }
}

// Render logs in the container
function renderLogs() {
  const container = document.getElementById('logContainer');
  
  if (filteredLogs.length === 0) {
    container.innerHTML = '<div class="text-center text-muted"><i class="bi bi-inbox"></i><br>No logs found</div>';
    return;
  }

  const logsHtml = filteredLogs.map(log => {
    const timestamp = new Date(log.timestamp).toLocaleString();
    const level = log.level || 'info';
    const channel = log.channel || 'system';
    const message = log.message || '';
    
    // Extract metadata
    const metadata = { ...log };
    delete metadata.timestamp;
    delete metadata.level;
    delete metadata.message;
    delete metadata.channel;
    
    const hasMetadata = Object.keys(metadata).length > 0;
    
    return `
      <div class="log-entry level-${level} channel-${channel} p-2 mb-2 rounded">
        <div class="log-metadata d-flex justify-content-between">
          <span>
            <strong>${timestamp}</strong>
            <span class="badge bg-${getLevelColor(level)} ms-2">${level.toUpperCase()}</span>
            <span class="badge bg-secondary ms-1">${channel}</span>
            ${log.userId ? `<span class="badge bg-primary ms-1">User: ${log.userId}</span>` : ''}
          </span>
        </div>
        <div class="log-message">${escapeHtml(message)}</div>
        ${hasMetadata ? `
          <div class="log-details">
            <pre class="mb-0">${JSON.stringify(metadata, null, 2)}</pre>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  container.innerHTML = logsHtml;
  
  // Update last update time
  document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
}

// Get Bootstrap color class for log level
function getLevelColor(level) {
  switch (level) {
    case 'error': return 'danger';
    case 'warn': return 'warning';
    case 'info': return 'info';
    case 'debug': return 'secondary';
    default: return 'light';
  }
}

// Update statistics
function updateStatistics() {
  document.getElementById('totalLogs').textContent = logs.length;
  
  const errorCount = logs.filter(log => log.level === 'error').length;
  document.getElementById('errorCount').textContent = errorCount;
  
  const uniqueUsers = new Set(logs.filter(log => log.userId).map(log => log.userId)).size;
  document.getElementById('activeUsers').textContent = uniqueUsers;
}

// Update pagination
function updatePagination() {
  const paginationInfo = document.getElementById('paginationInfo');
  const pagination = document.getElementById('pagination');
  
  const start = (currentPage - 1) * parseInt(getFilters().limit) + 1;
  const end = Math.min(start + logs.length - 1, logs.length);
  
  paginationInfo.textContent = `Showing ${start}-${end} of ${logs.length} entries`;
  
  // Generate pagination HTML
  let paginationHtml = '';
  
  if (totalPages > 1) {
    // Previous button
    paginationHtml += `
      <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="changePage(${currentPage - 1})">Previous</a>
      </li>
    `;
    
    // Page numbers
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
      paginationHtml += `
        <li class="page-item ${i === currentPage ? 'active' : ''}">
          <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
        </li>
      `;
    }
    
    // Next button
    paginationHtml += `
      <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" onclick="changePage(${currentPage + 1})">Next</a>
      </li>
    `;
  }
  
  pagination.innerHTML = paginationHtml;
}

// Change page
function changePage(page) {
  if (page >= 1 && page <= totalPages && page !== currentPage) {
    loadLogs(page);
  }
}

// Export logs
function exportLogs() {
  console.log('📁 Exporting logs...');
  const filters = getFilters();
  const params = new URLSearchParams({
    ...filters,
    limit: 10000, // Export more logs
    export: 'csv'
  });
  
  window.open(`/admin/api/logs?${params}`, '_blank');
}

// Show error message
function showError(message) {
  const container = document.getElementById('logContainer');
  container.innerHTML = `<div class="alert alert-danger"><i class="bi bi-exclamation-triangle"></i> ${message}</div>`;
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Handle page unload
window.addEventListener('beforeunload', function() {
  if (eventSource) {
    eventSource.close();
  }
}); 