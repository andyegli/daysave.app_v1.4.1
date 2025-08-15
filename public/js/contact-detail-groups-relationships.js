/**
 * Contact Detail Groups and Relationships
 * Handles displaying groups and relationships for individual contacts on the detail page
 */

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Get contact ID from URL
    const contactId = getContactIdFromUrl();
    if (contactId) {
        loadContactGroups(contactId);
        loadContactRelationships(contactId);
    }
});

// Extract contact ID from current URL
function getContactIdFromUrl() {
    const path = window.location.pathname;
    const match = path.match(/\/contacts\/([a-f0-9-]+)$/);
    return match ? match[1] : null;
}

// Load and display contact groups
async function loadContactGroups(contactId) {
    try {
        // Load all groups to find which ones contain this contact
        const groupsResponse = await fetch('/contacts/groups');
        const groupsData = await groupsResponse.json();
        
        if (groupsData.success) {
            const contactGroups = [];
            
            // Find groups that contain this contact
            groupsData.groups.forEach(group => {
                if (group.ContactGroupMembers) {
                    const isMember = group.ContactGroupMembers.some(member => 
                        member.Contact && member.Contact.id === contactId
                    );
                    if (isMember) {
                        contactGroups.push(group);
                    }
                }
            });
            
            displayContactGroups(contactGroups, contactId);
        } else {
            throw new Error(groupsData.error || 'Failed to load groups');
        }
    } catch (error) {
        console.error('Error loading contact groups:', error);
        displayContactGroupsError('Failed to load groups');
    }
}

// Display contact groups
function displayContactGroups(groups, contactId) {
    const container = document.getElementById('contactGroupsList');
    if (!container) return;

    let html = '';

    if (groups.length === 0) {
        html = `
            <div class="text-center py-3">
                <i class="fas fa-users-slash text-muted fa-2x mb-2"></i>
                <p class="text-muted mb-2">Not in any groups</p>
                <button class="btn btn-sm btn-outline-primary" onclick="showQuickAddToGroup('${contactId}')">
                    <i class="fas fa-plus me-1"></i>Add to Group
                </button>
            </div>
        `;
    } else {
        groups.forEach(group => {
            html += `
                <div class="d-flex justify-content-between align-items-center mb-2 p-2 bg-light rounded">
                    <div>
                        <i class="fas fa-users text-primary me-2"></i>
                        <strong>${escapeHtml(group.name)}</strong>
                        <small class="text-muted d-block">
                            ${group.ContactGroupMembers ? group.ContactGroupMembers.length : 0} members
                        </small>
                    </div>
                    <button class="btn btn-sm btn-outline-danger" onclick="quickRemoveFromGroup('${group.id}', '${contactId}')" title="Remove from group">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        });
        
        html += `
            <div class="text-center mt-3">
                <button class="btn btn-sm btn-outline-primary" onclick="showQuickAddToGroup('${contactId}')">
                    <i class="fas fa-plus me-1"></i>Add to Another Group
                </button>
            </div>
        `;
    }

    container.innerHTML = html;
}

// Display contact groups error
function displayContactGroupsError(message) {
    const container = document.getElementById('contactGroupsList');
    if (!container) return;

    container.innerHTML = `
        <div class="text-center py-3">
            <i class="fas fa-exclamation-triangle text-warning fa-2x mb-2"></i>
            <p class="text-muted mb-0">${message}</p>
        </div>
    `;
}

// Load and display contact relationships
async function loadContactRelationships(contactId) {
    try {
        const response = await fetch(`/contacts/${contactId}/relationships`);
        const data = await response.json();
        
        if (data.success) {
            displayContactRelationships(data.relationships, contactId);
        } else {
            throw new Error(data.error || 'Failed to load relationships');
        }
    } catch (error) {
        console.error('Error loading contact relationships:', error);
        displayContactRelationshipsError('Failed to load relationships');
    }
}

// Display contact relationships
function displayContactRelationships(relationships, contactId) {
    const container = document.getElementById('contactRelationshipsList');
    if (!container) return;

    let html = '';

    if (relationships.length === 0) {
        html = `
            <div class="text-center py-3">
                <i class="fas fa-user-slash text-muted fa-2x mb-2"></i>
                <p class="text-muted mb-2">No relationships defined</p>
                <button class="btn btn-sm btn-outline-success" onclick="showQuickAddRelationship('${contactId}')">
                    <i class="fas fa-plus me-1"></i>Add Relationship
                </button>
            </div>
        `;
    } else {
        // Show only first 3 relationships, with option to view all
        const displayedRelationships = relationships.slice(0, 3);
        
        displayedRelationships.forEach(relationship => {
            const isContact1 = relationship.contact_id_1 === contactId;
            const otherContact = isContact1 ? relationship.Contact2 : relationship.Contact1;
            
            html += `
                <div class="d-flex justify-content-between align-items-center mb-2 p-2 bg-light rounded">
                    <div>
                        <small class="text-muted">${escapeHtml(relationship.relation_type)}</small>
                        <div>
                            <strong><a href="/contacts/${otherContact?.id}" class="text-decoration-none contact-link" title="View ${escapeHtml(otherContact?.name || 'Unknown')} details">${escapeHtml(otherContact?.name || 'Unknown')}</a></strong>
                        </div>
                    </div>
                    <button class="btn btn-sm btn-outline-danger" onclick="quickDeleteRelationship('${relationship.id}')" title="Delete relationship">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        });
        
        if (relationships.length > 3) {
            html += `
                <div class="text-center mt-2">
                    <small class="text-muted">${relationships.length - 3} more relationship${relationships.length - 3 !== 1 ? 's' : ''}...</small>
                </div>
            `;
        }
        
        html += `
            <div class="text-center mt-3">
                <button class="btn btn-sm btn-outline-success" onclick="showQuickAddRelationship('${contactId}')">
                    <i class="fas fa-plus me-1"></i>Add Relationship
                </button>
            </div>
        `;
    }

    container.innerHTML = html;
}

// Display contact relationships error
function displayContactRelationshipsError(message) {
    const container = document.getElementById('contactRelationshipsList');
    if (!container) return;

    container.innerHTML = `
        <div class="text-center py-3">
            <i class="fas fa-exclamation-triangle text-warning fa-2x mb-2"></i>
            <p class="text-muted mb-0">${message}</p>
        </div>
    `;
}

// Show manage contact groups (redirect to main groups page)
function showManageContactGroups(contactId) {
    window.location.href = '/contacts/groups-relationships?tab=groups';
}

// Show quick add to group modal
async function showQuickAddToGroup(contactId) {
    try {
        // Load all groups
        const response = await fetch('/contacts/groups');
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to load groups');
        }
        
        const allGroups = data.groups || [];
        
        // Find groups this contact is NOT in
        const availableGroups = [];
        allGroups.forEach(group => {
            const isMember = group.ContactGroupMembers && group.ContactGroupMembers.some(member => 
                member.Contact && member.Contact.id === contactId
            );
            if (!isMember) {
                availableGroups.push(group);
            }
        });
        
        if (availableGroups.length === 0) {
            alert('This contact is already in all available groups. Create a new group first.');
            return;
        }
        
        let modalHtml = `
            <div class="modal fade" id="quickAddToGroupModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Add to Group</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="quickAddToGroupForm">
                                <div class="mb-3">
                                    <label for="quickGroupSelect" class="form-label">Select Group:</label>
                                    <select class="form-select" id="quickGroupSelect" required>
                                        <option value="">Choose a group...</option>
        `;
        
        availableGroups.forEach(group => {
            modalHtml += `<option value="${group.id}">${escapeHtml(group.name)}</option>`;
        });
        
        modalHtml += `
                                    </select>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="executeQuickAddToGroup('${contactId}')">Add to Group</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('quickAddToGroupModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const modal = new bootstrap.Modal(document.getElementById('quickAddToGroupModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error showing add to group modal:', error);
        alert('Failed to load groups');
    }
}

// Execute quick add to group
async function executeQuickAddToGroup(contactId) {
    const groupId = document.getElementById('quickGroupSelect').value;
    
    if (!groupId) {
        alert('Please select a group');
        return;
    }
    
    try {
        const response = await fetch(`/contacts/groups/${groupId}/members`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ contact_id: contactId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('quickAddToGroupModal'));
            modal.hide();
            
            // Reload groups
            loadContactGroups(contactId);
            
            showSuccessMessage('Contact added to group successfully');
        } else {
            alert(data.error || 'Failed to add contact to group');
        }
    } catch (error) {
        console.error('Error adding contact to group:', error);
        alert('Failed to add contact to group');
    }
}

// Quick remove from group
async function quickRemoveFromGroup(groupId, contactId) {
    if (!confirm('Remove this contact from the group?')) {
        return;
    }
    
    try {
        const response = await fetch(`/contacts/groups/${groupId}/members/${contactId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Reload groups
            loadContactGroups(contactId);
            showSuccessMessage('Contact removed from group successfully');
        } else {
            alert(data.error || 'Failed to remove contact from group');
        }
    } catch (error) {
        console.error('Error removing contact from group:', error);
        alert('Failed to remove contact from group');
    }
}

// Show quick add relationship modal
async function showQuickAddRelationship(contactId) {
    try {
        // Load all contacts and relationship types
        const [contactsResponse, typesResponse] = await Promise.all([
            fetch('/contacts/search?q='),
            fetch('/contacts/relationship-types')
        ]);
        
        const allContactsFromAPI = await contactsResponse.json();
        const typesData = await typesResponse.json();
        
        if (!typesData.success) {
            throw new Error('Failed to load relationship types');
        }
        
        const relationshipTypes = typesData.relationshipTypes || {};
        const availableContacts = allContactsFromAPI.filter(contact => contact.id !== contactId);
        
        if (availableContacts.length === 0) {
            alert('No other contacts available for creating relationships.');
            return;
        }
        
        let modalHtml = `
            <div class="modal fade" id="quickAddRelationshipModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Add Relationship</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="quickAddRelationshipForm">
                                <div class="mb-3">
                                    <label for="quickContactSelect" class="form-label">Related Contact:</label>
                                    <select class="form-select" id="quickContactSelect" required>
                                        <option value="">Choose a contact...</option>
        `;
        
        availableContacts.forEach(contact => {
            modalHtml += `<option value="${contact.id}">${escapeHtml(contact.name)}</option>`;
        });
        
        modalHtml += `
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label for="quickRelationshipType" class="form-label">Relationship Type:</label>
                                    <select class="form-select" id="quickRelationshipTypeSelect" onchange="updateQuickRelationshipInput()">
                                        <option value="">Choose from categories...</option>
        `;
        
        Object.keys(relationshipTypes).forEach(category => {
            modalHtml += `<optgroup label="${category.charAt(0).toUpperCase() + category.slice(1)}">`;
            relationshipTypes[category].forEach(type => {
                modalHtml += `<option value="${type}">${type}</option>`;
            });
            modalHtml += `</optgroup>`;
        });
        
        modalHtml += `
                                    </select>
                                    <input type="text" class="form-control mt-2" id="quickRelationshipTypeInput" placeholder="Or type custom relationship..." required>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-success" onclick="executeQuickAddRelationship('${contactId}')">Add Relationship</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('quickAddRelationshipModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const modal = new bootstrap.Modal(document.getElementById('quickAddRelationshipModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error showing add relationship modal:', error);
        alert('Failed to load relationship data');
    }
}

// Update quick relationship type input
function updateQuickRelationshipInput() {
    const select = document.getElementById('quickRelationshipTypeSelect');
    const input = document.getElementById('quickRelationshipTypeInput');
    
    if (select.value) {
        input.value = select.value;
    }
}

// Execute quick add relationship
async function executeQuickAddRelationship(contactId) {
    const relatedContactId = document.getElementById('quickContactSelect').value;
    const relationType = document.getElementById('quickRelationshipTypeInput').value.trim();
    
    if (!relatedContactId || !relationType) {
        alert('Please fill in all fields');
        return;
    }
    
    try {
        const response = await fetch('/contacts/relationships', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contact_id_1: contactId,
                contact_id_2: relatedContactId,
                relation_type: relationType
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('quickAddRelationshipModal'));
            modal.hide();
            
            // Reload relationships
            loadContactRelationships(contactId);
            
            showSuccessMessage('Relationship created successfully');
        } else {
            alert(data.error || 'Failed to create relationship');
        }
    } catch (error) {
        console.error('Error creating relationship:', error);
        alert('Failed to create relationship');
    }
}

// Quick delete relationship
async function quickDeleteRelationship(relationshipId) {
    if (!confirm('Delete this relationship?')) {
        return;
    }
    
    try {
        const response = await fetch(`/contacts/relationships/${relationshipId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Reload relationships
            const contactId = getContactIdFromUrl();
            if (contactId) {
                loadContactRelationships(contactId);
            }
            showSuccessMessage('Relationship deleted successfully');
        } else {
            alert(data.error || 'Failed to delete relationship');
        }
    } catch (error) {
        console.error('Error deleting relationship:', error);
        alert('Failed to delete relationship');
    }
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

function showSuccessMessage(message) {
    // Create a temporary alert
    const alertHtml = `
        <div class="alert alert-success alert-dismissible fade show position-fixed" style="top: 20px; right: 20px; z-index: 9999; min-width: 300px;" role="alert">
            <i class="fas fa-check-circle me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', alertHtml);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        const alert = document.querySelector('.alert-success');
        if (alert) {
            alert.remove();
        }
    }, 3000);
}

// Export functions for global access
window.contactDetailGroupsRelationships = {
    showManageContactGroups,
    showQuickAddToGroup,
    executeQuickAddToGroup,
    quickRemoveFromGroup,
    showQuickAddRelationship,
    executeQuickAddRelationship,
    updateQuickRelationshipInput,
    quickDeleteRelationship
};