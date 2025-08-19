/**
 * Admin Roles Management JavaScript
 * 
 * Handles role and permission management interface functionality
 */

class AdminRolesManager {
  constructor() {
    this.currentMatrix = null;
    this.roles = [];
    this.permissions = [];
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadPermissionMatrix();
  }

  setupEventListeners() {
    // Create role form
    const createRoleForm = document.getElementById('createRoleForm');
    if (createRoleForm) {
      createRoleForm.addEventListener('submit', (e) => this.handleCreateRole(e));
    }

    // Tab change events
    const matrixTab = document.getElementById('matrix-tab');
    if (matrixTab) {
      matrixTab.addEventListener('shown.bs.tab', () => this.loadPermissionMatrix());
    }
  }

  /**
   * Load and display the permission matrix
   */
  async loadPermissionMatrix() {
    try {
      const response = await fetch('/admin/api/roles/matrix');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load matrix');
      }

      this.currentMatrix = data.matrix;
      this.roles = data.roles;
      this.permissions = data.permissions;

      this.renderPermissionMatrix();

    } catch (error) {
      console.error('Error loading permission matrix:', error);
      this.showError('Failed to load permission matrix: ' + error.message);
    }
  }

  /**
   * Render the permission matrix table
   */
  renderPermissionMatrix() {
    const container = document.getElementById('permissionMatrix');
    if (!container || !this.currentMatrix) return;

    // Group permissions by category
    const permissionsByCategory = {};
    this.permissions.forEach(perm => {
      const category = perm.name.split('.')[0];
      if (!permissionsByCategory[category]) {
        permissionsByCategory[category] = [];
      }
      permissionsByCategory[category].push(perm);
    });

    let html = `
      <table class="table table-sm permission-matrix">
        <thead class="sticky-header">
          <tr>
            <th style="min-width: 200px;">Permission</th>
            ${this.roles.map(role => `
              <th class="text-center" style="min-width: 80px;">
                <div class="role-header">
                  <strong>${role.name}</strong>
                  <br><small class="text-muted">${role.description || ''}</small>
                </div>
              </th>
            `).join('')}
          </tr>
        </thead>
        <tbody>
    `;

    // Render by category
    Object.keys(permissionsByCategory).forEach(category => {
      html += `
        <tr class="table-secondary">
          <td colspan="${this.roles.length + 1}">
            <strong><i class="fas fa-folder me-2"></i>${category.toUpperCase()}</strong>
          </td>
        </tr>
      `;

      permissionsByCategory[category].forEach(permission => {
        html += `
          <tr>
            <td>
              <div>
                <strong>${permission.name}</strong>
                <br><small class="text-muted">${permission.description || 'No description'}</small>
              </div>
            </td>
            ${this.roles.map(role => {
              const hasPermission = this.currentMatrix[role.name][permission.name];
              return `
                <td class="text-center p-1">
                  <div class="matrix-cell ${hasPermission ? 'has-permission' : 'no-permission'}" 
                       onclick="adminRoles.togglePermission('${role.id}', '${permission.id}', '${role.name}', '${permission.name}')"
                       title="${role.name} ${hasPermission ? 'has' : 'does not have'} ${permission.name}"
                       data-role-id="${role.id}" 
                       data-permission-id="${permission.id}">
                    <i class="fas ${hasPermission ? 'fa-check' : 'fa-times'}"></i>
                  </div>
                </td>
              `;
            }).join('')}
          </tr>
        `;
      });
    });

    html += `
        </tbody>
      </table>
    `;

    container.innerHTML = html;
  }

  /**
   * Toggle a permission for a role
   */
  async togglePermission(roleId, permissionId, roleName, permissionName) {
    try {
      const currentHasPermission = this.currentMatrix[roleName][permissionName];
      
      // Get current permissions for this role
      const role = this.roles.find(r => r.id === roleId);
      if (!role) throw new Error('Role not found');

      // Get all current permission IDs for this role
      const currentPermissionIds = this.permissions
        .filter(p => this.currentMatrix[roleName][p.name])
        .map(p => p.id);

      let newPermissionIds;
      if (currentHasPermission) {
        // Remove permission
        newPermissionIds = currentPermissionIds.filter(id => id !== permissionId);
      } else {
        // Add permission
        newPermissionIds = [...currentPermissionIds, permissionId];
      }

      // Update via API
      const response = await fetch(`/admin/api/roles/${roleId}/permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ permissionIds: newPermissionIds })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to update permissions');
      }

      // Update local matrix
      this.currentMatrix[roleName][permissionName] = !currentHasPermission;

      // Update the UI cell
      const cell = document.querySelector(`[data-role-id="${roleId}"][data-permission-id="${permissionId}"]`);
      if (cell) {
        const newHasPermission = !currentHasPermission;
        cell.className = `matrix-cell ${newHasPermission ? 'has-permission' : 'no-permission'}`;
        cell.innerHTML = `<i class="fas ${newHasPermission ? 'fa-check' : 'fa-times'}"></i>`;
        cell.title = `${roleName} ${newHasPermission ? 'has' : 'does not have'} ${permissionName}`;
      }

      this.showSuccess(`${currentHasPermission ? 'Removed' : 'Added'} ${permissionName} ${currentHasPermission ? 'from' : 'to'} ${roleName}`);

    } catch (error) {
      console.error('Error toggling permission:', error);
      this.showError('Failed to update permission: ' + error.message);
    }
  }

  /**
   * Handle create role form submission
   */
  async handleCreateRole(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const roleData = {
      name: formData.get('name'),
      description: formData.get('description')
    };

    try {
      const response = await fetch('/admin/api/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(roleData)
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to create role');
      }

      this.showSuccess(`Role '${roleData.name}' created successfully`);
      
      // Close modal and refresh page
      const modal = bootstrap.Modal.getInstance(document.getElementById('createRoleModal'));
      modal.hide();
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error('Error creating role:', error);
      this.showError('Failed to create role: ' + error.message);
    }
  }

  /**
   * View role details
   */
  async viewRoleDetails(roleId) {
    try {
      const response = await fetch(`/admin/api/roles/${roleId}/details`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load role details');
      }

      this.showRoleDetailsModal(data.role);

    } catch (error) {
      console.error('Error loading role details:', error);
      this.showError('Failed to load role details: ' + error.message);
    }
  }

  /**
   * Show role details in modal
   */
  showRoleDetailsModal(role) {
    const modal = document.getElementById('roleDetailsModal');
    const content = document.getElementById('roleDetailsContent');

    // Group permissions by category
    const permissionsByCategory = {};
    role.permissions.forEach(perm => {
      const category = perm.name.split('.')[0];
      if (!permissionsByCategory[category]) {
        permissionsByCategory[category] = [];
      }
      permissionsByCategory[category].push(perm);
    });

    let html = `
      <div class="row">
        <div class="col-md-6">
          <h6><i class="fas fa-info-circle me-2"></i>Role Information</h6>
          <table class="table table-sm">
            <tr><td><strong>Name:</strong></td><td><span class="badge bg-primary">${role.name}</span></td></tr>
            <tr><td><strong>Description:</strong></td><td>${role.description || 'No description'}</td></tr>
            <tr><td><strong>Total Users:</strong></td><td><span class="badge bg-success">${role.totalUsers}</span></td></tr>
            <tr><td><strong>Permissions:</strong></td><td><span class="badge bg-info">${role.permissions.length}</span></td></tr>
          </table>
        </div>
        <div class="col-md-6">
          <h6><i class="fas fa-users me-2"></i>Recent Users (${Math.min(role.users.length, 10)} of ${role.totalUsers})</h6>
          <div class="list-group list-group-flush">
    `;

    if (role.users.length > 0) {
      role.users.forEach(user => {
        html += `
          <div class="list-group-item p-2">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <strong>${user.username}</strong>
                <br><small class="text-muted">${user.email}</small>
              </div>
              <small class="text-muted">${new Date(user.createdAt).toLocaleDateString()}</small>
            </div>
          </div>
        `;
      });
    } else {
      html += '<div class="list-group-item text-muted">No users assigned to this role</div>';
    }

    html += `
          </div>
        </div>
      </div>
      <hr>
      <h6><i class="fas fa-key me-2"></i>Permissions (${role.permissions.length})</h6>
    `;

    if (Object.keys(permissionsByCategory).length > 0) {
      html += '<div class="row">';
      Object.keys(permissionsByCategory).forEach(category => {
        html += `
          <div class="col-md-6 mb-3">
            <div class="card">
              <div class="card-header py-2">
                <h6 class="mb-0 text-uppercase">${category}</h6>
              </div>
              <div class="card-body p-2">
        `;
        
        permissionsByCategory[category].forEach(perm => {
          html += `
            <div class="d-flex justify-content-between align-items-center mb-1">
              <span class="text-primary small">${perm.name}</span>
              <i class="fas fa-check text-success"></i>
            </div>
          `;
        });
        
        html += `
              </div>
            </div>
          </div>
        `;
      });
      html += '</div>';
    } else {
      html += '<p class="text-muted">No permissions assigned to this role.</p>';
    }

    content.innerHTML = html;

    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
  }

  /**
   * Edit role permissions
   */
  editRolePermissions(roleId) {
    // Switch to matrix tab and highlight the role
    const matrixTab = document.getElementById('matrix-tab');
    if (matrixTab) {
      matrixTab.click();
      
      setTimeout(() => {
        // Highlight the role column
        const roleHeaders = document.querySelectorAll(`[data-role-id="${roleId}"]`);
        roleHeaders.forEach(header => {
          header.style.backgroundColor = '#fff3cd';
          setTimeout(() => {
            header.style.backgroundColor = '';
          }, 3000);
        });
      }, 500);
    }
  }

  /**
   * Delete role
   */
  async deleteRole(roleId, roleName) {
    if (!confirm(`Are you sure you want to delete the role "${roleName}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/admin/api/roles/${roleId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete role');
      }

      this.showSuccess(`Role '${roleName}' deleted successfully`);
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error('Error deleting role:', error);
      this.showError('Failed to delete role: ' + error.message);
    }
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    this.showToast(message, 'success');
  }

  /**
   * Show error message
   */
  showError(message) {
    this.showToast(message, 'danger');
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.admin-roles-toast');
    existingToasts.forEach(toast => toast.remove());

    const toastHtml = `
      <div class="toast-container position-fixed top-0 end-0 p-3">
        <div class="toast admin-roles-toast align-items-center text-white bg-${type} border-0" role="alert">
          <div class="d-flex">
            <div class="toast-body">
              <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'danger' ? 'fa-exclamation-circle' : 'fa-info-circle'} me-2"></i>
              ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', toastHtml);

    const toastElement = document.querySelector('.admin-roles-toast');
    const toast = new bootstrap.Toast(toastElement, { delay: 5000 });
    toast.show();
  }
}

// Global functions for onclick handlers
window.viewRoleDetails = (roleId) => window.adminRoles.viewRoleDetails(roleId);
window.editRolePermissions = (roleId) => window.adminRoles.editRolePermissions(roleId);
window.deleteRole = (roleId, roleName) => window.adminRoles.deleteRole(roleId, roleName);

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.adminRoles = new AdminRolesManager();
});
