/**
 * Contact Groups Management
 * Handles creation, editing, deletion and membership of contact groups
 */

// Use the global getCorrectUrl function from localhost-protocol-fix.js
// or define it here if not available
if (typeof window.getCorrectUrl === 'undefined') {
    window.getCorrectUrl = function(path) {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return `http://${window.location.hostname}:${window.location.port}${path}`;
        }
        return path; // Use relative URL for non-localhost
    };
}

// Scoped variables to avoid conflicts
const ContactGroupsManager = {
  contactGroups: [],
  allContacts: []
};

// Initialize contact groups functionality only if container exists
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 ContactGroups: DOM loaded, checking for container...');
    const container = document.getElementById('contactGroupsContainer');
    if (container) {
        console.log('✅ ContactGroups: Container found, initializing...');
        initializeContactGroups();
    } else {
        console.log('❌ ContactGroups: Container not found (contactGroupsContainer)');
    }
});

async function initializeContactGroups() {
    console.log('🚀 ContactGroups: Starting initialization...');
    try {
        console.log('📝 ContactGroups: Loading contact groups...');
        await loadContactGroups();
        
        console.log('👥 ContactGroups: Loading all contacts...');
        console.log('🧪 SIMPLE TEST: typeof loadAllContacts =', typeof loadAllContacts);
        console.log('🧪 SIMPLE TEST: loadAllContacts function exists?', typeof loadAllContacts === 'function');
        
        try {
            console.log('🧪 SIMPLE TEST: About to call loadAllContacts...');
            await loadAllContacts();
            console.log('🧪 SIMPLE TEST: loadAllContacts completed successfully');
            console.log('👥 ContactGroups: All contacts loaded, count:', ContactGroupsManager.allContacts.length);
        } catch (error) {
            console.error('🚨 CRITICAL ERROR in loadAllContacts:', error);
            console.error('🚨 ERROR STACK:', error.stack);
            console.log('👥 ContactGroups: All contacts loaded, count:', ContactGroupsManager.allContacts.length);
        }
        
        console.log('🎨 ContactGroups: Rendering UI...');
        renderContactGroupsUI();
        console.log('🔗 ContactGroups: Attaching event listeners...');
        attachEventListeners();
        console.log('✅ ContactGroups: Initialization complete!');
    } catch (error) {
        console.error('❌ ContactGroups: Error during initialization:', error);
        showError('Failed to initialize contact groups');
    }
}

// Load all contact groups
async function loadContactGroups() {
    try {
        const url = window.getCorrectUrl('/contacts/groups');
        console.log('🔍 AJAX DEBUG: Loading groups from:', url);
        console.log('🔍 AJAX DEBUG: Document cookies:', document.cookie);
        
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        console.log('🔍 AJAX DEBUG: Response status:', response.status);
        console.log('🔍 AJAX DEBUG: Response headers:', [...response.headers.entries()]);
        console.log('🔍 AJAX DEBUG: Response URL:', response.url);
        
        const responseText = await response.text();
        console.log('🔍 AJAX DEBUG: Raw response:', responseText.substring(0, 200));
        
        const data = JSON.parse(responseText);
        
        if (data.success) {
            ContactGroupsManager.contactGroups = data.groups || [];
        } else {
            throw new Error(data.error || 'Failed to load contact groups');
        }
    } catch (error) {
        console.error('Error loading contact groups:', error);
        showError('Failed to load contact groups');
    }
}

// Load all contacts for group assignment
async function loadAllContacts() {
    console.log('🚨 FUNCTION TEST: loadAllContacts function called!');
    try {
        console.log('🔍 GROUP DEBUG: Starting loadAllContacts...');
        const url = window.getCorrectUrl('/contacts/search?q=');
        console.log('🔍 GROUP DEBUG: Fetching from URL:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        console.log('🔍 GROUP DEBUG: Response status:', response.status);
        console.log('🔍 GROUP DEBUG: Response ok:', response.ok);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('🔍 GROUP DEBUG: Raw response data:', data);
        
        ContactGroupsManager.allContacts = data;
        console.log('🔍 GROUP DEBUG: Stored in allContacts:', ContactGroupsManager.allContacts.length, ContactGroupsManager.allContacts);
    } catch (error) {
        console.error('🚨 GROUP ERROR: Failed to load contacts:', error);
        ContactGroupsManager.allContacts = [];
    }
}

// Render the contact groups UI
function renderContactGroupsUI() {
    const container = document.getElementById('contactGroupsContainer');
    if (!container) return;

    let html = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h3><i class="fas fa-users me-2"></i>Contact Groups</h3>
            <button type="button" class="btn btn-primary" onclick="showCreateGroupModal()">
                <i class="fas fa-plus me-2"></i>Create Group
            </button>
        </div>
    `;

    if (ContactGroupsManager.contactGroups.length === 0) {
        html += `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                No contact groups found. Create your first group to organize your contacts.
            </div>
        `;
    } else {
        html += '<div class="row g-3">';
        
        ContactGroupsManager.contactGroups.forEach(group => {
            const memberCount = group.ContactGroupMembers ? group.ContactGroupMembers.length : 0;
            
            html += `
                <div class="col-md-6 col-lg-4">
                    <div class="card h-100">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-3">
                                <h5 class="card-title">${escapeHtml(group.name)}</h5>
                                <div class="dropdown">
                                    <button class="btn btn-sm btn-outline-secondary" data-bs-toggle="dropdown">
                                        <i class="fas fa-ellipsis-v"></i>
                                    </button>
                                    <ul class="dropdown-menu">
                                        <li><button class="dropdown-item" onclick="editGroup('${group.id}')">
                                            <i class="fas fa-edit me-2"></i>Edit
                                        </button></li>
                                        <li><button class="dropdown-item" onclick="manageGroupMembers('${group.id}')">
                                            <i class="fas fa-users me-2"></i>Manage Members
                                        </button></li>
                                        <li><hr class="dropdown-divider"></li>
                                        <li><button class="dropdown-item text-danger" onclick="deleteGroup('${group.id}')">
                                            <i class="fas fa-trash me-2"></i>Delete
                                        </button></li>
                                    </ul>
                                </div>
                            </div>
                            <p class="text-muted mb-2">
                                <i class="fas fa-user me-1"></i>
                                ${memberCount} member${memberCount !== 1 ? 's' : ''}
                            </p>
                            <div class="d-grid">
                                <button class="btn btn-outline-primary btn-sm" onclick="manageGroupMembers('${group.id}')">
                                    View Members
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
    }

    container.innerHTML = html;
}

// Show create group modal
function showCreateGroupModal() {
    const modalHtml = `
        <div class="modal fade" id="createGroupModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Create New Contact Group</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="createGroupForm">
                            <div class="mb-3">
                                <label for="groupName" class="form-label">Group Name *</label>
                                <input type="text" class="form-control" id="groupName" required>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="createGroup()">Create Group</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('createGroupModal');
    if (existingModal) {
        existingModal.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = new bootstrap.Modal(document.getElementById('createGroupModal'));
    modal.show();
}

// Create a new group
async function createGroup() {
    const groupName = document.getElementById('groupName').value.trim();
    
    if (!groupName) {
        showError('Group name is required');
        return;
    }

    try {
        const url = window.getCorrectUrl('/contacts/groups');
        console.log('🔍 AJAX DEBUG: Creating group at:', url);
        console.log('🔍 AJAX DEBUG: Group data:', { name: groupName });
        console.log('🔍 AJAX DEBUG: Document cookies:', document.cookie);
        
        const response = await fetch(url, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({ name: groupName })
        });

        console.log('🔍 AJAX DEBUG: POST Response status:', response.status);
        console.log('🔍 AJAX DEBUG: POST Response URL:', response.url);
        
        const responseText = await response.text();
        console.log('🔍 AJAX DEBUG: POST Raw response:', responseText.substring(0, 200));
        
        const data = JSON.parse(responseText);

        if (data.success) {
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('createGroupModal'));
            modal.hide();
            
            // Reload groups
            await loadContactGroups();
            renderContactGroupsUI();
            
            showSuccess('Contact group created successfully');
        } else {
            showError(data.error || 'Failed to create contact group');
        }
    } catch (error) {
        console.error('Error creating group:', error);
        showError('Failed to create contact group');
    }
}

// Edit a group
function editGroup(groupId) {
    const group = ContactGroupsManager.contactGroups.find(g => g.id === groupId);
    if (!group) return;

    const modalHtml = `
        <div class="modal fade" id="editGroupModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Edit Contact Group</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="editGroupForm">
                            <div class="mb-3">
                                <label for="editGroupName" class="form-label">Group Name *</label>
                                <input type="text" class="form-control" id="editGroupName" value="${escapeHtml(group.name)}" required>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="updateGroup('${groupId}')">Update Group</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('editGroupModal');
    if (existingModal) {
        existingModal.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = new bootstrap.Modal(document.getElementById('editGroupModal'));
    modal.show();
}

// Update a group
async function updateGroup(groupId) {
    const groupName = document.getElementById('editGroupName').value.trim();
    
    if (!groupName) {
        showError('Group name is required');
        return;
    }

    try {
        const response = await fetch(window.getCorrectUrl(`/contacts/groups/${groupId}`), {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({ name: groupName })
        });

        const data = await response.json();

        if (data.success) {
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editGroupModal'));
            modal.hide();
            
            // Reload groups
            await loadContactGroups();
            renderContactGroupsUI();
            
            showSuccess('Contact group updated successfully');
        } else {
            showError(data.error || 'Failed to update contact group');
        }
    } catch (error) {
        console.error('Error updating group:', error);
        showError('Failed to update contact group');
    }
}

// Delete a group
async function deleteGroup(groupId) {
    const group = ContactGroupsManager.contactGroups.find(g => g.id === groupId);
    if (!group) return;

    if (!confirm(`Are you sure you want to delete the group "${group.name}"? This action cannot be undone.`)) {
        return;
    }

    try {
        const response = await fetch(window.getCorrectUrl(`/contacts/groups/${groupId}`), {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        const data = await response.json();

        if (data.success) {
            // Reload groups
            await loadContactGroups();
            renderContactGroupsUI();
            
            showSuccess('Contact group deleted successfully');
        } else {
            showError(data.error || 'Failed to delete contact group');
        }
    } catch (error) {
        console.error('Error deleting group:', error);
        showError('Failed to delete contact group');
    }
}

// Manage group members
function manageGroupMembers(groupId) {
    console.log('🔍 GROUP DEBUG: manageGroupMembers called for group:', groupId);
    console.log('🔍 GROUP DEBUG: allContacts at modal open:', ContactGroupsManager.allContacts.length, ContactGroupsManager.allContacts);
    
    const group = ContactGroupsManager.contactGroups.find(g => g.id === groupId);
    if (!group) return;

    const members = group.ContactGroupMembers || [];
    const memberIds = members.map(m => m.Contact ? m.Contact.id : null).filter(id => id);
    
    let modalHtml = `
        <div class="modal fade" id="manageGroupMembersModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Manage Members - ${escapeHtml(group.name)}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <h6>Current Members</h6>
                                <div id="currentMembers" class="border rounded p-3" style="min-height: 200px; max-height: 300px; overflow-y: auto;">
    `;
    
    if (members.length === 0) {
        modalHtml += '<p class="text-muted">No members in this group</p>';
    } else {
        members.forEach(member => {
            if (member.Contact) {
                modalHtml += `
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span>${escapeHtml(member.Contact.name)}</span>
                        <button class="btn btn-sm btn-outline-danger" onclick="removeFromGroup('${groupId}', '${member.Contact.id}')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
            }
        });
    }
    
    modalHtml += `
                                </div>
                            </div>
                            <div class="col-md-6">
                                <h6>Add Members</h6>
                                <div class="border rounded p-3" style="min-height: 200px; max-height: 300px; overflow-y: auto;">
    `;
    
    const availableContacts = ContactGroupsManager.allContacts.filter(contact => !memberIds.includes(contact.id));
    
    console.log('🔍 GROUP DEBUG: Total contacts:', ContactGroupsManager.allContacts.length);
    console.log('🔍 GROUP DEBUG: Member IDs:', memberIds);
    console.log('🔍 GROUP DEBUG: Available contacts:', availableContacts.length, availableContacts);
    
    if (availableContacts.length === 0) {
        modalHtml += '<p class="text-muted">All contacts are already in this group</p>';
    } else {
        availableContacts.forEach(contact => {
            modalHtml += `
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span>${escapeHtml(contact.name)}</span>
                    <button class="btn btn-sm btn-outline-primary" onclick="addToGroup('${groupId}', '${contact.id}')">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            `;
        });
    }
    
    modalHtml += `
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('manageGroupMembersModal');
    if (existingModal) {
        existingModal.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = new bootstrap.Modal(document.getElementById('manageGroupMembersModal'));
    modal.show();
}

// Add contact to group
async function addToGroup(groupId, contactId) {
    try {
        const response = await fetch(window.getCorrectUrl(`/contacts/groups/${groupId}/members`), {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({ contact_id: contactId })
        });

        const data = await response.json();

        if (data.success) {
            // Reload groups and refresh the modal
            await loadContactGroups();
            renderContactGroupsUI();
            
            // Close and reopen the modal with updated data
            const modal = bootstrap.Modal.getInstance(document.getElementById('manageGroupMembersModal'));
            modal.hide();
            
            setTimeout(() => {
                manageGroupMembers(groupId);
            }, 300);
            
            showSuccess('Contact added to group successfully');
        } else {
            showError(data.error || 'Failed to add contact to group');
        }
    } catch (error) {
        console.error('Error adding contact to group:', error);
        showError('Failed to add contact to group');
    }
}

// Remove contact from group
async function removeFromGroup(groupId, contactId) {
    try {
        const response = await fetch(window.getCorrectUrl(`/contacts/groups/${groupId}/members/${contactId}`), {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        const data = await response.json();

        if (data.success) {
            // Reload groups and refresh the modal
            await loadContactGroups();
            renderContactGroupsUI();
            
            // Close and reopen the modal with updated data
            const modal = bootstrap.Modal.getInstance(document.getElementById('manageGroupMembersModal'));
            modal.hide();
            
            setTimeout(() => {
                manageGroupMembers(groupId);
            }, 300);
            
            showSuccess('Contact removed from group successfully');
        } else {
            showError(data.error || 'Failed to remove contact from group');
        }
    } catch (error) {
        console.error('Error removing contact from group:', error);
        showError('Failed to remove contact from group');
    }
}

// Attach event listeners
function attachEventListeners() {
    // Add any global event listeners here if needed
}

// Utility functions
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showSuccess(message) {
    // Create and show success alert
    const alertHtml = `
        <div class="alert alert-success alert-dismissible fade show" role="alert">
            <i class="fas fa-check-circle me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    const container = document.getElementById('contactGroupsContainer');
    if (container) {
        container.insertAdjacentHTML('afterbegin', alertHtml);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            const alert = container.querySelector('.alert-success');
            if (alert) {
                alert.remove();
            }
        }, 5000);
    }
}

function showError(message) {
    // Create and show error alert
    const alertHtml = `
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
            <i class="fas fa-exclamation-circle me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    const container = document.getElementById('contactGroupsContainer');
    if (container) {
        container.insertAdjacentHTML('afterbegin', alertHtml);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            const alert = container.querySelector('.alert-danger');
            if (alert) {
                alert.remove();
            }
        }, 5000);
    }
}

// Export functions for global access
window.contactGroups = {
    showCreateGroupModal,
    createGroup,
    editGroup,
    updateGroup,
    deleteGroup,
    manageGroupMembers,
    addToGroup,
    removeFromGroup
};