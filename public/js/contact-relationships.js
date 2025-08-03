/**
 * Contact Relationships Management
 * Handles creation, editing, deletion and viewing of relationships between contacts
 */

// Global variables
let contactRelationships = [];
let allContacts = [];
let relationshipTypes = {};

// Initialize contact relationships functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeContactRelationships();
});

async function initializeContactRelationships() {
    try {
        await loadContactRelationships();
        await loadAllContacts();
        await loadRelationshipTypes();
        renderContactRelationshipsUI();
        attachEventListeners();
    } catch (error) {
        console.error('Error initializing contact relationships:', error);
        showError('Failed to initialize contact relationships');
    }
}

// Load all contact relationships
async function loadContactRelationships() {
    try {
        const response = await fetch('/contacts/relationships');
        const data = await response.json();
        
        if (data.success) {
            contactRelationships = data.relationships || [];
        } else {
            throw new Error(data.error || 'Failed to load contact relationships');
        }
    } catch (error) {
        console.error('Error loading contact relationships:', error);
        showError('Failed to load contact relationships');
    }
}

// Load all contacts for relationship creation
async function loadAllContacts() {
    try {
        const response = await fetch('/contacts/search?q=');
        allContacts = await response.json();
    } catch (error) {
        console.error('Error loading contacts:', error);
        allContacts = [];
    }
}

// Load predefined relationship types
async function loadRelationshipTypes() {
    try {
        const response = await fetch('/contacts/relationship-types');
        const data = await response.json();
        
        if (data.success) {
            relationshipTypes = data.relationshipTypes || {};
        } else {
            throw new Error(data.error || 'Failed to load relationship types');
        }
    } catch (error) {
        console.error('Error loading relationship types:', error);
        relationshipTypes = {};
    }
}

// Render the contact relationships UI
function renderContactRelationshipsUI() {
    const container = document.getElementById('contactRelationshipsContainer');
    if (!container) return;

    let html = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h3><i class="fas fa-sitemap me-2"></i>Contact Relationships</h3>
            <button type="button" class="btn btn-primary" onclick="showCreateRelationshipModal()">
                <i class="fas fa-plus me-2"></i>Add Relationship
            </button>
        </div>
    `;

    if (contactRelationships.length === 0) {
        html += `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                No relationships found. Start creating relationships to map connections between your contacts.
            </div>
        `;
    } else {
        // Group relationships by type
        const groupedRelationships = groupRelationshipsByType(contactRelationships);
        
        Object.keys(groupedRelationships).forEach(category => {
            if (groupedRelationships[category].length > 0) {
                html += `
                    <div class="card mb-4">
                        <div class="card-header">
                            <h5 class="mb-0">
                                <i class="fas fa-${getCategoryIcon(category)} me-2"></i>
                                ${category.charAt(0).toUpperCase() + category.slice(1)} Relationships
                            </h5>
                        </div>
                        <div class="card-body">
                            <div class="row g-3">
                `;
                
                groupedRelationships[category].forEach(relationship => {
                    html += `
                        <div class="col-md-6 col-lg-4">
                            <div class="card border-0 bg-light">
                                <div class="card-body p-3">
                                    <div class="d-flex justify-content-between align-items-start mb-2">
                                        <small class="text-muted">${escapeHtml(relationship.relation_type)}</small>
                                        <button class="btn btn-sm btn-outline-danger" onclick="deleteRelationship('${relationship.id}')" title="Delete Relationship">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                    <div class="relationship-connection">
                                        <div class="text-center">
                                            <strong>${escapeHtml(relationship.Contact1?.name || 'Unknown')}</strong>
                                            <div class="my-1">
                                                <i class="fas fa-arrow-down text-primary"></i>
                                            </div>
                                            <strong>${escapeHtml(relationship.Contact2?.name || 'Unknown')}</strong>
                                        </div>
                                    </div>
                                    <div class="text-center mt-2">
                                        <small class="text-muted">
                                            <i class="fas fa-clock me-1"></i>
                                            ${formatDate(relationship.createdAt)}
                                        </small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                });
                
                html += `
                            </div>
                        </div>
                    </div>
                `;
            }
        });
    }

    container.innerHTML = html;
}

// Group relationships by category based on relationship type
function groupRelationshipsByType(relationships) {
    const grouped = {
        family: [],
        professional: [],
        social: [],
        other: []
    };

    relationships.forEach(relationship => {
        const relationType = relationship.relation_type.toLowerCase();
        let category = 'other';

        // Determine category based on relationship type
        for (const [cat, types] of Object.entries(relationshipTypes)) {
            if (types.some(type => type.toLowerCase() === relationType)) {
                category = cat;
                break;
            }
        }

        grouped[category].push(relationship);
    });

    return grouped;
}

// Get category icon
function getCategoryIcon(category) {
    const icons = {
        family: 'home',
        professional: 'briefcase',
        social: 'users',
        other: 'user-friends'
    };
    return icons[category] || 'user-friends';
}

// Show create relationship modal
function showCreateRelationshipModal() {
    if (allContacts.length < 2) {
        showError('You need at least 2 contacts to create relationships');
        return;
    }

    let modalHtml = `
        <div class="modal fade" id="createRelationshipModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Create New Relationship</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="createRelationshipForm">
                            <div class="row">
                                <div class="col-md-5">
                                    <label for="contact1" class="form-label">First Contact *</label>
                                    <select class="form-select" id="contact1" required>
                                        <option value="">Select first contact...</option>
    `;

    allContacts.forEach(contact => {
        modalHtml += `<option value="${contact.id}">${escapeHtml(contact.name)}</option>`;
    });

    modalHtml += `
                                    </select>
                                </div>
                                <div class="col-md-2 d-flex align-items-end justify-content-center">
                                    <div class="text-center">
                                        <small class="text-muted">is the</small>
                                    </div>
                                </div>
                                <div class="col-md-5">
                                    <label for="contact2" class="form-label">Second Contact *</label>
                                    <select class="form-select" id="contact2" required>
                                        <option value="">Select second contact...</option>
    `;

    allContacts.forEach(contact => {
        modalHtml += `<option value="${contact.id}">${escapeHtml(contact.name)}</option>`;
    });

    modalHtml += `
                                    </select>
                                </div>
                            </div>
                            
                            <div class="row mt-3">
                                <div class="col-12">
                                    <label for="relationshipType" class="form-label">Relationship Type *</label>
                                    <div class="row">
                                        <div class="col-md-6">
                                            <select class="form-select" id="relationshipTypeSelect" onchange="updateRelationshipTypeInput()">
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
                                        </div>
                                        <div class="col-md-6">
                                            <input type="text" class="form-control" id="relationshipTypeInput" placeholder="Or type custom relationship..." required>
                                        </div>
                                    </div>
                                    <small class="form-text text-muted">
                                        Examples: Wife, Husband, Mother, Father, Colleague, Friend, Boss, etc.
                                    </small>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="createRelationship()">Create Relationship</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('createRelationshipModal');
    if (existingModal) {
        existingModal.remove();
    }

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = new bootstrap.Modal(document.getElementById('createRelationshipModal'));
    modal.show();
}

// Update relationship type input when selection changes
function updateRelationshipTypeInput() {
    const select = document.getElementById('relationshipTypeSelect');
    const input = document.getElementById('relationshipTypeInput');
    
    if (select.value) {
        input.value = select.value;
    }
}

// Create a new relationship
async function createRelationship() {
    const contact1Id = document.getElementById('contact1').value;
    const contact2Id = document.getElementById('contact2').value;
    const relationType = document.getElementById('relationshipTypeInput').value.trim();
    
    if (!contact1Id || !contact2Id || !relationType) {
        showError('All fields are required');
        return;
    }

    if (contact1Id === contact2Id) {
        showError('Cannot create relationship between the same contact');
        return;
    }

    try {
        const response = await fetch('/contacts/relationships', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contact_id_1: contact1Id,
                contact_id_2: contact2Id,
                relation_type: relationType
            })
        });

        const data = await response.json();

        if (data.success) {
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('createRelationshipModal'));
            modal.hide();
            
            // Reload relationships
            await loadContactRelationships();
            renderContactRelationshipsUI();
            
            showSuccess('Relationship created successfully');
        } else {
            showError(data.error || 'Failed to create relationship');
        }
    } catch (error) {
        console.error('Error creating relationship:', error);
        showError('Failed to create relationship');
    }
}

// Delete a relationship
async function deleteRelationship(relationshipId) {
    const relationship = contactRelationships.find(r => r.id === relationshipId);
    if (!relationship) return;

    const contact1Name = relationship.Contact1?.name || 'Unknown';
    const contact2Name = relationship.Contact2?.name || 'Unknown';
    const relationType = relationship.relation_type;

    if (!confirm(`Are you sure you want to delete the relationship "${contact1Name} is ${relationType} of ${contact2Name}"?`)) {
        return;
    }

    try {
        const response = await fetch(`/contacts/relationships/${relationshipId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            // Reload relationships
            await loadContactRelationships();
            renderContactRelationshipsUI();
            
            showSuccess('Relationship deleted successfully');
        } else {
            showError(data.error || 'Failed to delete relationship');
        }
    } catch (error) {
        console.error('Error deleting relationship:', error);
        showError('Failed to delete relationship');
    }
}

// Show relationships for a specific contact
async function showContactRelationships(contactId) {
    try {
        const response = await fetch(`/contacts/${contactId}/relationships`);
        const data = await response.json();
        
        if (data.success) {
            const relationships = data.relationships || [];
            const contact = allContacts.find(c => c.id === contactId);
            
            if (!contact) {
                showError('Contact not found');
                return;
            }

            let modalHtml = `
                <div class="modal fade" id="contactRelationshipsModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Relationships - ${escapeHtml(contact.name)}</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
            `;

            if (relationships.length === 0) {
                modalHtml += '<p class="text-muted">No relationships found for this contact.</p>';
            } else {
                relationships.forEach(relationship => {
                    const isContact1 = relationship.contact_id_1 === contactId;
                    const otherContact = isContact1 ? relationship.Contact2 : relationship.Contact1;
                    
                    modalHtml += `
                        <div class="card mb-3">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <strong>${escapeHtml(contact.name)}</strong> 
                                        is the <span class="badge bg-primary">${escapeHtml(relationship.relation_type)}</span> 
                                        of <strong>${escapeHtml(otherContact?.name || 'Unknown')}</strong>
                                    </div>
                                    <button class="btn btn-sm btn-outline-danger" onclick="deleteRelationship('${relationship.id}')" title="Delete">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                });
            }

            modalHtml += `
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Remove existing modal if any
            const existingModal = document.getElementById('contactRelationshipsModal');
            if (existingModal) {
                existingModal.remove();
            }

            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            const modal = new bootstrap.Modal(document.getElementById('contactRelationshipsModal'));
            modal.show();
        } else {
            showError(data.error || 'Failed to load contact relationships');
        }
    } catch (error) {
        console.error('Error loading contact relationships:', error);
        showError('Failed to load contact relationships');
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

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
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
    
    const container = document.getElementById('contactRelationshipsContainer');
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
    
    const container = document.getElementById('contactRelationshipsContainer');
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
window.contactRelationships = {
    showCreateRelationshipModal,
    createRelationship,
    deleteRelationship,
    showContactRelationships,
    updateRelationshipTypeInput
};