/**
 * API Key Management JavaScript
 * Handles all frontend interactions for API key management
 */

let apiKeys = [];
let selectedKeyId = null;

/**
 * Initialize the page
 */
document.addEventListener('DOMContentLoaded', function() {
    loadApiKeys();
    loadUsageOverview();
    setupEventListeners();
});

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Form submission
    document.getElementById('createKeyForm').addEventListener('submit', function(e) {
        e.preventDefault();
        createApiKey();
    });
    
    // Button event listeners
    document.getElementById('createApiKeyBtn').addEventListener('click', function() {
        createApiKey();
    });
    
    document.getElementById('copyApiKeyBtn').addEventListener('click', function() {
        copyApiKey();
    });
    
    // Event delegation for API key action buttons
    document.addEventListener('click', function(e) {
        const target = e.target.closest('[data-action]');
        if (!target) return;
        
        const action = target.getAttribute('data-action');
        const keyId = target.getAttribute('data-key-id');
        
        switch(action) {
            case 'details':
                showKeyDetails(keyId);
                break;
            case 'usage':
                showUsageStats(keyId);
                break;
            case 'edit':
                editApiKey(keyId);
                break;
            case 'toggle':
                toggleApiKey(keyId);
                break;
            case 'delete':
                deleteApiKey(keyId);
                break;
        }
    });
    
    // Modal events
    document.getElementById('createKeyModal').addEventListener('hidden.bs.modal', function() {
        resetCreateForm();
    });
    
    document.getElementById('newKeyModal').addEventListener('hidden.bs.modal', function() {
        // Reload the API keys list after the new key modal is closed
        loadApiKeys();
    });
}

/**
 * Load API keys from server
 */
async function loadApiKeys() {
    try {
        const response = await fetch('/api/keys');
        
        if (!response.ok) {
            throw new Error('Failed to load API keys');
        }
        
        const result = await response.json();
        apiKeys = result.data;
        
        renderApiKeys();
    } catch (error) {
        console.error('Error loading API keys:', error);
        showError('Failed to load API keys. Please try again.');
    }
}

/**
 * Load usage overview statistics
 */
async function loadUsageOverview() {
    try {
        // This would be a summary endpoint
        const response = await fetch('/api/keys/usage/summary');
        
        if (response.ok) {
            const result = await response.json();
            updateUsageOverview(result.data);
        }
    } catch (error) {
        console.error('Error loading usage overview:', error);
    }
}

/**
 * Render API keys list
 */
function renderApiKeys() {
    const container = document.getElementById('apiKeysList');
    const noKeysMessage = document.getElementById('noApiKeys');
    
    container.classList.remove('loading');
    
    if (apiKeys.length === 0) {
        container.style.display = 'none';
        noKeysMessage.style.display = 'block';
        return;
    }
    
    container.style.display = 'block';
    noKeysMessage.style.display = 'none';
    
    container.innerHTML = apiKeys.map(key => renderApiKeyCard(key)).join('');
}

/**
 * Create a better visual representation of API key for display
 * Shows more characters while maintaining security
 */
function formatApiKeyDisplay(keyPrefix, keyId) {
    // Extract base from prefix (should be 'daysave_')
    const base = keyPrefix || 'daysave_';
    
    // Generate consistent fake characters based on key ID for better UX
    // This creates a deterministic but fake representation
    const hash = keyId.replace(/-/g, '');
    const startChars = hash.substring(0, 6); // First 6 chars from ID
    const endChars = hash.substring(hash.length - 4); // Last 4 chars from ID
    
    // Create a realistic looking key display
    return `${base}${startChars}••••••••••••${endChars}`;
}

/**
 * Render individual API key card
 */
function renderApiKeyCard(key) {
    const isExpired = key.expires_at && new Date(key.expires_at) < new Date();
    const status = isExpired ? 'expired' : (key.enabled ? 'enabled' : 'disabled');
    const statusIcon = isExpired ? 'fas fa-clock' : (key.enabled ? 'fas fa-check-circle' : 'fas fa-times-circle');
    
    const createdDate = new Date(key.createdAt).toLocaleDateString();
    const lastUsed = key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never';
    const expiresAt = key.expires_at ? new Date(key.expires_at).toLocaleDateString() : 'Never';
    
    // Use improved key display
    const keyDisplay = formatApiKeyDisplay(key.key_prefix, key.id);
    
    return `
        <div class="api-key-card">
            <div class="api-key-header">
                <div>
                    <h5 class="mb-1">${escapeHtml(key.key_name)}</h5>
                    <div class="api-key-prefix">${escapeHtml(keyDisplay)}</div>
                </div>
                <div class="key-status ${status}">
                    <i class="${statusIcon}"></i>
                    ${status.charAt(0).toUpperCase() + status.slice(1)}
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-6">
                    <p class="mb-1"><strong>Description:</strong> ${escapeHtml(key.description || 'No description')}</p>
                    <p class="mb-1"><strong>Created:</strong> ${createdDate}</p>
                    <p class="mb-1"><strong>Last Used:</strong> ${lastUsed}</p>
                    <p class="mb-1"><strong>Expires:</strong> ${expiresAt}</p>
                </div>
                <div class="col-md-6">
                    <p class="mb-1"><strong>Usage Count:</strong> ${key.usage_count.toLocaleString()}</p>
                    <p class="mb-1"><strong>Rate Limits:</strong> ${key.rate_limit_per_minute}/min, ${key.rate_limit_per_hour}/hr, ${key.rate_limit_per_day}/day</p>
                    <div class="permissions-list">
                        <strong>Permissions:</strong>
                        <div class="mt-1">
                            ${renderPermissions(key.permissions)}
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="key-actions mt-3">
                <button class="btn btn-sm btn-outline-primary" data-action="details" data-key-id="${key.id}">
                    <i class="fas fa-info-circle me-1"></i>Details
                </button>
                <button class="btn btn-sm btn-outline-success" data-action="usage" data-key-id="${key.id}">
                    <i class="fas fa-chart-bar me-1"></i>Usage Stats
                </button>
                <button class="btn btn-sm btn-outline-warning" data-action="edit" data-key-id="${key.id}">
                    <i class="fas fa-edit me-1"></i>Edit
                </button>
                <button class="btn btn-sm ${key.enabled ? 'btn-outline-secondary' : 'btn-outline-success'}" data-action="toggle" data-key-id="${key.id}">
                    <i class="fas fa-${key.enabled ? 'pause' : 'play'} me-1"></i>
                    ${key.enabled ? 'Disable' : 'Enable'}
                </button>
                <button class="btn btn-sm btn-outline-danger" data-action="delete" data-key-id="${key.id}">
                    <i class="fas fa-trash me-1"></i>Delete
                </button>
            </div>
        </div>
    `;
}

/**
 * Render permissions
 */
function renderPermissions(permissions) {
    if (!permissions || Object.keys(permissions).length === 0) {
        return '<span class="text-muted">No permissions set</span>';
    }
    
    const permissionList = Object.entries(permissions)
        .map(([endpoint, methods]) => `${endpoint}: ${Array.isArray(methods) ? methods.join(', ') : methods}`)
        .join('<br>');
    
    return permissionList;
}

/**
 * Create new API key
 */
async function createApiKey() {
    const form = document.getElementById('createKeyForm');
    const formData = new FormData(form);
    
    // Build permissions object
    const permissions = {};
    const permissionCheckboxes = form.querySelectorAll('input[type="checkbox"]:checked');
    
    permissionCheckboxes.forEach(checkbox => {
        const [endpoint, methods] = checkbox.value.split(':');
        permissions[endpoint] = methods.split(',');
    });
    
    // Build request data
    const requestData = {
        name: formData.get('name'),
        description: formData.get('description') || undefined,
        expiresAt: formData.get('expiresAt') || undefined,
        rateLimitPerMinute: formData.get('rateLimitPerMinute') ? parseInt(formData.get('rateLimitPerMinute')) : undefined,
        rateLimitPerHour: formData.get('rateLimitPerHour') ? parseInt(formData.get('rateLimitPerHour')) : undefined,
        rateLimitPerDay: formData.get('rateLimitPerDay') ? parseInt(formData.get('rateLimitPerDay')) : undefined,
        allowedOrigins: formData.get('allowedOrigins') ? formData.get('allowedOrigins').split(',').map(s => s.trim()).filter(s => s.length > 0) : undefined,
        allowedIps: formData.get('allowedIps') ? formData.get('allowedIps').split(',').map(s => s.trim()).filter(s => s.length > 0) : undefined,
        permissions: permissions
    };
    
    // Remove undefined values to avoid sending null/undefined
    Object.keys(requestData).forEach(key => {
        if (requestData[key] === undefined || requestData[key] === null || requestData[key] === '') {
            delete requestData[key];
        }
    });
    
    try {
        const response = await fetch('/api/keys', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            // Log detailed validation errors for debugging
            if (result.details) {
                console.error('Validation errors:', result.details);
                const errorMessages = result.details.map(err => `${err.param}: ${err.msg}`).join(', ');
                throw new Error(`Validation failed: ${errorMessages}`);
            }
            throw new Error(result.message || result.error || 'Failed to create API key');
        }
        
        // Hide create modal
        const createModal = bootstrap.Modal.getInstance(document.getElementById('createKeyModal'));
        createModal.hide();
        
        // Show the new key
        document.getElementById('newKeyDisplay').textContent = result.data.key;
        
        const newKeyModal = new bootstrap.Modal(document.getElementById('newKeyModal'));
        newKeyModal.show();
        
        showSuccess('API key created successfully!');
    } catch (error) {
        console.error('Error creating API key:', error);
        showError('Failed to create API key: ' + error.message);
    }
}

/**
 * Show API key details
 */
async function showKeyDetails(keyId) {
    try {
        const response = await fetch(`/api/keys/${keyId}`);
        
        if (!response.ok) {
            throw new Error('Failed to load API key details');
        }
        
        const result = await response.json();
        const key = result.data;
        
        // Use improved key display
        const keyDisplay = formatApiKeyDisplay(key.key_prefix, key.id);
        const statusIcon = key.enabled ? 'fas fa-check-circle text-success' : 'fas fa-times-circle text-danger';
        const statusText = key.enabled ? 'Enabled' : 'Disabled';
        
        const content = `
            <!-- Key Identification Section -->
            <div class="card mb-3">
                <div class="card-header bg-primary text-white">
                    <i class="fas fa-key me-2"></i>API Key Identification
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-8">
                            <h5 class="mb-2">${escapeHtml(key.key_name)}</h5>
                            <p class="text-muted mb-2">${escapeHtml(key.description || 'No description provided')}</p>
                            <div class="key-preview">
                                <label class="form-label fw-bold">API Key Preview:</label>
                                <div class="api-key-display p-2 bg-light border rounded">
                                    <code class="fs-6">${escapeHtml(keyDisplay)}</code>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4 text-end">
                            <div class="status-badge">
                                <span class="badge bg-${key.enabled ? 'success' : 'danger'} fs-6 p-2">
                                    <i class="${statusIcon} me-1"></i>${statusText}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Usage & Activity Section -->
            <div class="card mb-3">
                <div class="card-header bg-info text-white">
                    <i class="fas fa-chart-line me-2"></i>Usage & Activity
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="metric-card border-end">
                                <h6 class="text-primary">Total Usage</h6>
                                <p class="fs-4 fw-bold mb-1">${key.usage_count.toLocaleString()}</p>
                                <small class="text-muted">API calls made</small>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="metric-card">
                                <h6 class="text-success">Last Used</h6>
                                <p class="mb-1">${key.last_used_at ? new Date(key.last_used_at).toLocaleString() : 'Never used'}</p>
                                <small class="text-muted">Most recent activity</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Configuration Section -->
            <div class="card mb-3">
                <div class="card-header bg-warning text-dark">
                    <i class="fas fa-cogs me-2"></i>Configuration & Limits
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <h6 class="text-primary">Rate Limits</h6>
                            <div class="rate-limits">
                                <div class="d-flex justify-content-between py-1">
                                    <span>Per minute:</span>
                                    <strong>${key.rate_limit_per_minute.toLocaleString()}</strong>
                                </div>
                                <div class="d-flex justify-content-between py-1">
                                    <span>Per hour:</span>
                                    <strong>${key.rate_limit_per_hour.toLocaleString()}</strong>
                                </div>
                                <div class="d-flex justify-content-between py-1">
                                    <span>Per day:</span>
                                    <strong>${key.rate_limit_per_day.toLocaleString()}</strong>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <h6 class="text-success">Dates & Expiry</h6>
                            <div class="dates-info">
                                <div class="d-flex justify-content-between py-1">
                                    <span>Created:</span>
                                    <strong>${new Date(key.createdAt).toLocaleDateString()}</strong>
                                </div>
                                <div class="d-flex justify-content-between py-1">
                                    <span>Expires:</span>
                                    <strong class="${key.expires_at ? 'text-warning' : 'text-success'}">${key.expires_at ? new Date(key.expires_at).toLocaleDateString() : 'Never'}</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    ${key.allowed_origins && key.allowed_origins.length > 0 ? `
                        <hr>
                        <h6 class="text-info">Security Restrictions</h6>
                        <div class="row">
                            <div class="col-md-6">
                                <strong>Allowed Origins:</strong>
                                <div class="mt-1">
                                    ${key.allowed_origins.map(origin => `<span class="badge bg-secondary me-1">${escapeHtml(origin)}</span>`).join('')}
                                </div>
                            </div>
                            ${key.allowed_ips && key.allowed_ips.length > 0 ? `
                                <div class="col-md-6">
                                    <strong>Allowed IPs:</strong>
                                    <div class="mt-1">
                                        ${key.allowed_ips.map(ip => `<span class="badge bg-dark me-1">${escapeHtml(ip)}</span>`).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <!-- Permissions Section -->
            <div class="card">
                <div class="card-header bg-success text-white">
                    <i class="fas fa-shield-alt me-2"></i>API Permissions
                </div>
                <div class="card-body">
                    <div class="permissions-detail">
                        ${renderPermissions(key.permissions)}
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('keyDetailsContent').innerHTML = content;
        
        const modal = new bootstrap.Modal(document.getElementById('keyDetailsModal'));
        modal.show();
    } catch (error) {
        console.error('Error loading key details:', error);
        showError('Failed to load key details: ' + error.message);
    }
}

/**
 * Show usage statistics
 */
async function showUsageStats(keyId) {
    try {
        const response = await fetch(`/api/keys/${keyId}/usage`);
        
        if (!response.ok) {
            throw new Error('Failed to load usage statistics');
        }
        
        const result = await response.json();
        // This would show a detailed usage statistics modal
        // For now, just show a simple alert
        alert('Usage statistics feature coming soon!');
    } catch (error) {
        console.error('Error loading usage stats:', error);
        showError('Failed to load usage statistics: ' + error.message);
    }
}

/**
 * Toggle API key enabled/disabled
 */
async function toggleApiKey(keyId) {
    try {
        const response = await fetch(`/api/keys/${keyId}/toggle`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('Failed to toggle API key');
        }
        
        const result = await response.json();
        showSuccess(result.message);
        loadApiKeys(); // Reload the list
    } catch (error) {
        console.error('Error toggling API key:', error);
        showError('Failed to toggle API key: ' + error.message);
    }
}

/**
 * Delete API key
 */
async function deleteApiKey(keyId) {
    const key = apiKeys.find(k => k.id === keyId);
    
    if (!confirm(`Are you sure you want to delete the API key "${key.key_name}"? This action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/keys/${keyId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete API key');
        }
        
        const result = await response.json();
        showSuccess(result.message);
        loadApiKeys(); // Reload the list
    } catch (error) {
        console.error('Error deleting API key:', error);
        showError('Failed to delete API key: ' + error.message);
    }
}

/**
 * Edit API key (placeholder)
 */
function editApiKey(keyId) {
    // This would open an edit modal similar to create
    alert('Edit API key feature coming soon!');
}

/**
 * Copy API key to clipboard
 */
async function copyApiKey() {
    const keyText = document.getElementById('newKeyDisplay').textContent;
    
    try {
        await navigator.clipboard.writeText(keyText);
        
        // Show success indicator
        const successIcon = document.querySelector('.copy-success');
        successIcon.style.display = 'inline';
        
        setTimeout(() => {
            successIcon.style.display = 'none';
        }, 2000);
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = keyText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        showSuccess('API key copied to clipboard!');
    }
}

/**
 * Reset create form
 */
function resetCreateForm() {
    document.getElementById('createKeyForm').reset();
    
    // Reset checkboxes
    document.querySelectorAll('#createKeyForm input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Reset rate limits to defaults
    document.getElementById('rateLimitPerMinute').value = 60;
    document.getElementById('rateLimitPerHour').value = 1000;
    document.getElementById('rateLimitPerDay').value = 10000;
}

/**
 * Update usage overview
 */
function updateUsageOverview(data) {
    if (!data) return;
    
    document.getElementById('totalKeys').textContent = data.totalKeys || 0;
    document.getElementById('activeKeys').textContent = data.activeKeys || 0;
    document.getElementById('totalRequests').textContent = (data.totalRequests || 0).toLocaleString();
    document.getElementById('totalCost').textContent = `$${(data.totalCost || 0).toFixed(2)}`;
}

/**
 * Show success message
 */
function showSuccess(message) {
    // Create a toast or alert
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible fade show position-fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.innerHTML = `
        <i class="fas fa-check-circle me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
    }, 5000);
}

/**
 * Show error message
 */
function showError(message) {
    // Create a toast or alert
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show position-fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.innerHTML = `
        <i class="fas fa-exclamation-circle me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto-dismiss after 8 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
    }, 8000);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
} 