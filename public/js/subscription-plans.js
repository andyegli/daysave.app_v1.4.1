/**
 * Subscription Plans JavaScript
 * Handles plan display, billing cycle toggle, and subscription management
 */

document.addEventListener('DOMContentLoaded', function() {
    let currentPlans = [];
    let currentSubscription = null;
    let selectedPlan = null;
    let selectedBillingCycle = 'monthly';

    // Initialize page
    init();

    async function init() {
        try {
            showLoading(true);
            
            // Load current subscription
            await loadCurrentSubscription();
            
            // Load subscription plans
            await loadSubscriptionPlans();
            
            // Setup event listeners
            setupEventListeners();
            
            showLoading(false);
        } catch (error) {
            console.error('Error initializing subscription plans:', error);
            showError('Failed to load subscription plans. Please refresh the page.');
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
                }
            }
        } catch (error) {
            console.error('Error loading current subscription:', error);
        }
    }

    async function loadSubscriptionPlans() {
        try {
            const response = await fetch('/api/subscription/api/plans');
            if (!response.ok) {
                throw new Error('Failed to load subscription plans');
            }
            
            const result = await response.json();
            currentPlans = result.data;
            
            displaySubscriptionPlans();
            buildFeatureComparison();
        } catch (error) {
            console.error('Error loading subscription plans:', error);
            throw error;
        }
    }

    function displayCurrentSubscription() {
        const alertDiv = document.getElementById('currentSubscriptionAlert');
        const textSpan = document.getElementById('currentSubscriptionText');
        
        if (currentSubscription) {
            const planName = currentSubscription.subscriptionPlan.display_name;
            const status = currentSubscription.status;
            const nextBilling = new Date(currentSubscription.next_billing_date).toLocaleDateString();
            
            textSpan.textContent = `You are currently subscribed to the ${planName} plan (${status}). Next billing: ${nextBilling}`;
            alertDiv.classList.remove('d-none');
        }
    }

    function displaySubscriptionPlans() {
        const container = document.getElementById('subscriptionPlans');
        container.innerHTML = '';
        
        currentPlans.forEach(plan => {
            const planCard = createPlanCard(plan);
            container.appendChild(planCard);
        });
    }

    function createPlanCard(plan) {
        const col = document.createElement('div');
        col.className = 'col-lg-2 col-md-4 col-sm-6';
        
        const isCurrentPlan = currentSubscription && 
                             currentSubscription.subscription_plan_id === plan.id;
        
        const isPopular = plan.name === 'medium';
        
        col.innerHTML = `
            <div class="card h-100 ${isPopular ? 'border-primary' : ''} ${isCurrentPlan ? 'border-success' : ''}">
                ${isPopular ? '<div class="card-header bg-primary text-white text-center"><small>Most Popular</small></div>' : ''}
                ${isCurrentPlan ? '<div class="card-header bg-success text-white text-center"><small>Current Plan</small></div>' : ''}
                
                <div class="card-body text-center">
                    <h5 class="card-title">${plan.display_name}</h5>
                    <p class="card-text text-muted small">${plan.description}</p>
                    
                    <div class="price-section mb-3">
                        <h3 class="text-primary monthly-price" ${selectedBillingCycle === 'yearly' ? 'style="display: none;"' : ''}>
                            $${plan.price_monthly}
                            <small class="text-muted">/month</small>
                        </h3>
                        <h3 class="text-primary yearly-price" ${selectedBillingCycle === 'monthly' ? 'style="display: none;"' : ''}>
                            $${plan.price_yearly}
                            <small class="text-muted">/year</small>
                        </h3>
                    </div>
                    
                    <div class="features mb-3">
                        <small class="text-muted">
                            <div><i class="fas fa-cloud-upload-alt me-2"></i>${plan.max_file_uploads === -1 ? 'Unlimited' : plan.max_file_uploads} file uploads</div>
                            <div><i class="fas fa-hdd me-2"></i>${plan.max_storage_gb === -1 ? 'Unlimited' : plan.max_storage_gb}GB storage</div>
                            <div><i class="fas fa-key me-2"></i>${plan.max_api_keys === -1 ? 'Unlimited' : plan.max_api_keys} API keys</div>
                            <div><i class="fas fa-users me-2"></i>${plan.max_contacts === -1 ? 'Unlimited' : plan.max_contacts} contacts</div>
                        </small>
                    </div>
                    
                    <button class="btn ${isCurrentPlan ? 'btn-success' : (isPopular ? 'btn-primary' : 'btn-outline-primary')} w-100 subscribe-btn" 
                            data-plan-id="${plan.id}" 
                            ${isCurrentPlan ? 'disabled' : ''}>
                        ${isCurrentPlan ? 'Current Plan' : (plan.price_monthly == 0 ? 'Get Started' : 'Subscribe')}
                    </button>
                </div>
            </div>
        `;
        
        return col;
    }

    function buildFeatureComparison() {
        const tbody = document.getElementById('featureComparison');
        tbody.innerHTML = '';
        
        const features = [
            { key: 'max_file_uploads', label: 'File Uploads', icon: 'fas fa-cloud-upload-alt' },
            { key: 'max_file_size_mb', label: 'Max File Size', icon: 'fas fa-file', suffix: 'MB' },
            { key: 'max_storage_gb', label: 'Storage', icon: 'fas fa-hdd', suffix: 'GB' },
            { key: 'max_api_keys', label: 'API Keys', icon: 'fas fa-key' },
            { key: 'max_contacts', label: 'Contacts', icon: 'fas fa-users' },
            { key: 'max_content_items', label: 'Content Items', icon: 'fas fa-file-alt' },
            { key: 'ai_analysis_enabled', label: 'AI Analysis', icon: 'fas fa-brain', type: 'boolean' },
            { key: 'premium_support', label: 'Premium Support', icon: 'fas fa-headset', type: 'boolean' },
            { key: 'advanced_analytics', label: 'Advanced Analytics', icon: 'fas fa-chart-line', type: 'boolean' },
            { key: 'custom_integrations', label: 'Custom Integrations', icon: 'fas fa-plug', type: 'boolean' }
        ];
        
        features.forEach(feature => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><i class="${feature.icon} me-2"></i>${feature.label}</td>
                ${currentPlans.map(plan => {
                    let value = plan[feature.key];
                    
                    if (feature.type === 'boolean') {
                        value = value ? '<i class="fas fa-check text-success"></i>' : '<i class="fas fa-times text-danger"></i>';
                    } else if (value === -1) {
                        value = '<i class="fas fa-infinity text-primary"></i>';
                    } else if (feature.suffix) {
                        value = `${value}${feature.suffix}`;
                    }
                    
                    return `<td class="text-center">${value}</td>`;
                }).join('')}
            `;
            tbody.appendChild(row);
        });
    }

    function setupEventListeners() {
        // Billing cycle toggle
        document.querySelectorAll('input[name="billingCycle"]').forEach(radio => {
            radio.addEventListener('change', function() {
                selectedBillingCycle = this.value;
                updatePricingDisplay();
            });
        });
        
        // Subscribe buttons
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('subscribe-btn')) {
                const planId = e.target.dataset.planId;
                const plan = currentPlans.find(p => p.id === planId);
                
                if (plan) {
                    showSubscriptionModal(plan);
                }
            }
        });
        
        // Confirm subscription
        document.getElementById('confirmSubscription').addEventListener('click', handleSubscription);
    }

    function updatePricingDisplay() {
        const monthlyPrices = document.querySelectorAll('.monthly-price');
        const yearlyPrices = document.querySelectorAll('.yearly-price');
        
        if (selectedBillingCycle === 'monthly') {
            monthlyPrices.forEach(el => el.style.display = 'block');
            yearlyPrices.forEach(el => el.style.display = 'none');
        } else {
            monthlyPrices.forEach(el => el.style.display = 'none');
            yearlyPrices.forEach(el => el.style.display = 'block');
        }
    }

    function showSubscriptionModal(plan) {
        selectedPlan = plan;
        
        const modal = new bootstrap.Modal(document.getElementById('subscriptionModal'));
        const detailsDiv = document.getElementById('subscriptionDetails');
        
        const price = selectedBillingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
        const billingText = selectedBillingCycle === 'yearly' ? 'per year' : 'per month';
        
        detailsDiv.innerHTML = `
            <div class="text-center mb-3">
                <h4>${plan.display_name}</h4>
                <p class="text-muted">${plan.description}</p>
            </div>
            
            <div class="pricing-summary text-center mb-4">
                <h3 class="text-primary">$${price} <small class="text-muted">${billingText}</small></h3>
                <p class="text-muted">Billed ${selectedBillingCycle}</p>
            </div>
            
            <div class="features-list">
                <h6>What's included:</h6>
                <ul class="list-unstyled">
                    <li><i class="fas fa-check text-success me-2"></i>${plan.max_file_uploads === -1 ? 'Unlimited' : plan.max_file_uploads} file uploads</li>
                    <li><i class="fas fa-check text-success me-2"></i>${plan.max_storage_gb === -1 ? 'Unlimited' : plan.max_storage_gb}GB storage</li>
                    <li><i class="fas fa-check text-success me-2"></i>${plan.max_api_keys === -1 ? 'Unlimited' : plan.max_api_keys} API keys</li>
                    <li><i class="fas fa-check text-success me-2"></i>${plan.max_contacts === -1 ? 'Unlimited' : plan.max_contacts} contacts</li>
                    <li><i class="fas fa-check text-success me-2"></i>AI Analysis: ${plan.ai_analysis_enabled ? 'Yes' : 'No'}</li>
                    <li><i class="fas fa-check text-success me-2"></i>Premium Support: ${plan.premium_support ? 'Yes' : 'No'}</li>
                </ul>
            </div>
            
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                This is a mock subscription system for demonstration purposes.
            </div>
        `;
        
        modal.show();
    }

    async function handleSubscription() {
        if (!selectedPlan) return;
        
        try {
            const confirmBtn = document.getElementById('confirmSubscription');
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
            
            const response = await fetch('/api/subscription/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    planId: selectedPlan.id,
                    billingCycle: selectedBillingCycle,
                    paymentMethod: 'mock'
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('subscriptionModal'));
                modal.hide();
                
                // Show success message
                showSuccess('Subscription created successfully!');
                
                // Reload page to reflect changes
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create subscription');
            }
        } catch (error) {
            console.error('Error creating subscription:', error);
            showError(error.message || 'Failed to create subscription');
        } finally {
            const confirmBtn = document.getElementById('confirmSubscription');
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="fas fa-credit-card me-2"></i>Confirm Subscription';
        }
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
}); 