/**
 * Subscription Management JavaScript
 * Handles subscription display, usage tracking, and management actions
 */

document.addEventListener('DOMContentLoaded', function() {
    let currentSubscription = null;
    let allPlans = [];
    let billingHistory = [];
    let currentPage = 1;
    const itemsPerPage = 10;

    // Initialize page
    init();

    async function init() {
        try {
            showLoading(true);
            
            // Load current subscription
            await loadCurrentSubscription();
            
            // Load all plans for comparison
            await loadAllPlans();
            
            // Load billing history
            await loadBillingHistory();
            
            // Setup event listeners
            setupEventListeners();
            
            showLoading(false);
        } catch (error) {
            console.error('Error initializing subscription management:', error);
            showError('Failed to load subscription data. Please refresh the page.');
            showLoading(false);
        }
    }

    async function loadCurrentSubscription() {
        try {
            const response = await fetch('/api/subscription/current');
            if (response.ok) {
                const result = await response.json();
                currentSubscription = result.data;
                
                if (currentSubscription) {
                    displayCurrentSubscription();
                    displayUsageOverview();
                } else {
                    showNoSubscriptionMessage();
                }
            }
        } catch (error) {
            console.error('Error loading current subscription:', error);
            throw error;
        }
    }

    async function loadAllPlans() {
        try {
            const response = await fetch('/api/subscription/api/plans');
            if (response.ok) {
                const result = await response.json();
                allPlans = result.data;
            }
        } catch (error) {
            console.error('Error loading subscription plans:', error);
        }
    }

    async function loadBillingHistory() {
        try {
            const offset = (currentPage - 1) * itemsPerPage;
            const response = await fetch(`/api/subscription/history?limit=${itemsPerPage}&offset=${offset}`);
            
            if (response.ok) {
                const result = await response.json();
                billingHistory = result.data.transactions;
                displayBillingHistory();
                displayPagination(result.data.total);
            }
        } catch (error) {
            console.error('Error loading billing history:', error);
        }
    }

    function displayCurrentSubscription() {
        const container = document.getElementById('currentSubscription');
        const plan = currentSubscription.subscriptionPlan;
        
        const nextBillingDate = new Date(currentSubscription.next_billing_date);
        const periodEndDate = new Date(currentSubscription.current_period_end);
        
        container.innerHTML = `
            <div class="subscription-details">
                <h4 class="text-primary mb-3">${plan.display_name}</h4>
                <p class="text-muted mb-3">${plan.description}</p>
                
                <div class="row mb-3">
                    <div class="col-6">
                        <small class="text-muted">Status</small>
                        <div class="fw-bold">
                            <span class="badge bg-${getStatusColor(currentSubscription.status)}">${currentSubscription.status.toUpperCase()}</span>
                        </div>
                    </div>
                    <div class="col-6">
                        <small class="text-muted">Billing Cycle</small>
                        <div class="fw-bold">${currentSubscription.billing_cycle}</div>
                    </div>
                </div>
                
                <div class="row mb-3">
                    <div class="col-6">
                        <small class="text-muted">Next Billing</small>
                        <div class="fw-bold">${nextBillingDate.toLocaleDateString()}</div>
                    </div>
                    <div class="col-6">
                        <small class="text-muted">Period Ends</small>
                        <div class="fw-bold">${periodEndDate.toLocaleDateString()}</div>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-6">
                        <small class="text-muted">Auto Renew</small>
                        <div class="fw-bold">
                            <span class="badge bg-${currentSubscription.auto_renew ? 'success' : 'warning'}">
                                ${currentSubscription.auto_renew ? 'ON' : 'OFF'}
                            </span>
                        </div>
                    </div>
                    <div class="col-6">
                        <small class="text-muted">Last Payment</small>
                        <div class="fw-bold">$${currentSubscription.last_payment_amount || '0.00'}</div>
                    </div>
                </div>
            </div>
        `;
    }

    function displayUsageOverview() {
        const container = document.getElementById('usageOverview');
        const plan = currentSubscription.subscriptionPlan;
        
        const usageItems = [
            { 
                key: 'file_uploads', 
                label: 'File Uploads', 
                icon: 'fas fa-cloud-upload-alt',
                current: currentSubscription.usage_file_uploads,
                limit: plan.max_file_uploads
            },
            { 
                key: 'storage_mb', 
                label: 'Storage', 
                icon: 'fas fa-hdd',
                current: currentSubscription.usage_storage_mb,
                limit: plan.max_storage_gb * 1024,
                suffix: 'MB'
            },
            { 
                key: 'api_requests', 
                label: 'API Requests', 
                icon: 'fas fa-code',
                current: currentSubscription.usage_api_requests,
                limit: plan.max_api_requests_per_hour
            },
            { 
                key: 'content_items', 
                label: 'Content Items', 
                icon: 'fas fa-file-alt',
                current: currentSubscription.usage_content_items,
                limit: plan.max_content_items
            },
            { 
                key: 'contacts', 
                label: 'Contacts', 
                icon: 'fas fa-users',
                current: currentSubscription.usage_contacts,
                limit: plan.max_contacts
            }
        ];
        
        container.innerHTML = usageItems.map(item => {
            const percentage = item.limit === -1 ? 0 : (item.current / item.limit) * 100;
            const isUnlimited = item.limit === -1;
            
            return `
                <div class="usage-item mb-3">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="small">
                            <i class="${item.icon} me-2"></i>
                            ${item.label}
                        </span>
                        <span class="small text-muted">
                            ${item.current}${item.suffix || ''} / ${isUnlimited ? '∞' : item.limit + (item.suffix || '')}
                        </span>
                    </div>
                    <div class="progress" style="height: 6px;">
                        <div class="progress-bar ${percentage > 80 ? 'bg-danger' : percentage > 60 ? 'bg-warning' : 'bg-success'}" 
                             role="progressbar" 
                             style="width: ${isUnlimited ? 100 : Math.min(percentage, 100)}%"
                             aria-valuenow="${percentage}" 
                             aria-valuemin="0" 
                             aria-valuemax="100">
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function displayBillingHistory() {
        const tbody = document.getElementById('billingHistory');
        
        if (billingHistory.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">No billing history available</td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = billingHistory.map(transaction => {
            const date = new Date(transaction.created_at).toLocaleDateString();
            const type = transaction.transaction_type;
            const planName = transaction.subscriptionPlan.display_name;
            const amount = `$${transaction.amount}`;
            const status = transaction.status;
            
            return `
                <tr>
                    <td>${date}</td>
                    <td><span class="badge bg-${getTransactionTypeColor(type)}">${type.toUpperCase()}</span></td>
                    <td>${planName}</td>
                    <td>${amount}</td>
                    <td><span class="badge bg-${getStatusColor(status)}">${status.toUpperCase()}</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="showTransactionDetails('${transaction.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function displayPagination(totalItems) {
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const pagination = document.getElementById('historyPagination');
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }
        
        let paginationHTML = '';
        
        // Previous button
        if (currentPage > 1) {
            paginationHTML += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="changePage(${currentPage - 1})">Previous</a>
                </li>
            `;
        }
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === currentPage) {
                paginationHTML += `<li class="page-item active"><a class="page-link" href="#">${i}</a></li>`;
            } else {
                paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="changePage(${i})">${i}</a></li>`;
            }
        }
        
        // Next button
        if (currentPage < totalPages) {
            paginationHTML += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="changePage(${currentPage + 1})">Next</a>
                </li>
            `;
        }
        
        pagination.innerHTML = paginationHTML;
    }

    function showNoSubscriptionMessage() {
        const container = document.getElementById('currentSubscription');
        container.innerHTML = `
            <div class="text-center">
                <i class="fas fa-exclamation-triangle text-warning mb-3" style="font-size: 3rem;"></i>
                <h5>No Active Subscription</h5>
                <p class="text-muted">You don't have an active subscription. Choose a plan to get started.</p>
                <a href="/subscription/plans" class="btn btn-primary">
                    <i class="fas fa-plus me-2"></i>
                    Choose a Plan
                </a>
            </div>
        `;
        
        // Hide action buttons if no subscription
        document.querySelectorAll('.btn[id$="Btn"]').forEach(btn => {
            btn.style.display = 'none';
        });
    }

    function setupEventListeners() {
        // Upgrade button
        document.getElementById('upgradeBtn').addEventListener('click', function() {
            window.location.href = '/subscription/plans';
        });
        
        // Change billing cycle button
        document.getElementById('changeCycleBtn').addEventListener('click', function() {
            // For now, redirect to plans page
            window.location.href = '/subscription/plans';
        });
        
        // Cancel button
        document.getElementById('cancelBtn').addEventListener('click', function() {
            showCancelModal();
        });
        
        // Confirm cancel button
        document.getElementById('confirmCancel').addEventListener('click', handleCancellation);
    }

    function showCancelModal() {
        const modal = new bootstrap.Modal(document.getElementById('cancelModal'));
        modal.show();
    }

    async function handleCancellation() {
        try {
            const reason = document.getElementById('cancelReason').value;
            const immediate = document.getElementById('cancelImmediate').checked;
            
            const confirmBtn = document.getElementById('confirmCancel');
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Cancelling...';
            
            const response = await fetch('/api/subscription/cancel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reason: reason,
                    immediate: immediate
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('cancelModal'));
                modal.hide();
                
                // Show success message
                showSuccess(result.message);
                
                // Reload page to reflect changes
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to cancel subscription');
            }
        } catch (error) {
            console.error('Error cancelling subscription:', error);
            showError(error.message || 'Failed to cancel subscription');
        } finally {
            const confirmBtn = document.getElementById('confirmCancel');
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="fas fa-times me-2"></i>Cancel Subscription';
        }
    }

    // Helper functions
    function getStatusColor(status) {
        const colors = {
            'active': 'success',
            'cancelled': 'danger',
            'expired': 'danger',
            'pending': 'warning',
            'suspended': 'danger',
            'completed': 'success',
            'failed': 'danger'
        };
        return colors[status] || 'secondary';
    }

    function getTransactionTypeColor(type) {
        const colors = {
            'purchase': 'success',
            'renewal': 'info',
            'upgrade': 'primary',
            'downgrade': 'warning',
            'cancellation': 'danger',
            'refund': 'warning'
        };
        return colors[type] || 'secondary';
    }

    function showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        if (show) {
            spinner.classList.remove('d-none');
        } else {
            spinner.classList.add('d-none');
        }
    }

    function showSuccess(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-success alert-dismissible fade show';
        alert.innerHTML = `
            <i class="fas fa-check-circle me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.querySelector('.container-fluid').insertBefore(alert, document.querySelector('.container-fluid').firstChild);
        
        setTimeout(() => {
            alert.remove();
        }, 5000);
    }

    function showError(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-danger alert-dismissible fade show';
        alert.innerHTML = `
            <i class="fas fa-exclamation-circle me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.querySelector('.container-fluid').insertBefore(alert, document.querySelector('.container-fluid').firstChild);
        
        setTimeout(() => {
            alert.remove();
        }, 8000);
    }

    // Global functions for pagination
    window.changePage = function(page) {
        currentPage = page;
        loadBillingHistory();
    };

    window.showTransactionDetails = function(transactionId) {
        const transaction = billingHistory.find(t => t.id === transactionId);
        if (transaction) {
            alert(`Transaction Details:\n\nID: ${transaction.id}\nType: ${transaction.transaction_type}\nAmount: $${transaction.amount}\nStatus: ${transaction.status}\nDate: ${new Date(transaction.created_at).toLocaleString()}`);
        }
    };
}); 