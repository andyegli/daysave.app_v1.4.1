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
            console.log('🔄 Loading current subscription...');
            const response = await fetch('/api/subscription/current');
            console.log('📡 Subscription response:', {
                status: response.status,
                ok: response.ok,
                statusText: response.statusText
            });
            
            if (response.ok) {
                const result = await response.json();
                currentSubscription = result.data;
                
                console.log('✅ Current subscription loaded:', {
                    hasSubscription: !!currentSubscription,
                    planId: currentSubscription?.subscription_plan_id,
                    planName: currentSubscription?.subscriptionPlan?.display_name,
                    status: currentSubscription?.status
                });
                
                if (currentSubscription) {
                    displayCurrentSubscription();
                }
            } else {
                console.error('❌ Failed to load subscription:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('❌ Error response:', errorText);
                
                // Handle authentication error
                if (response.status === 401) {
                    console.warn('🔑 User not authenticated, treating as new subscription');
                    currentSubscription = null; // Ensure it's null for new subscription logic
                    showAuthenticationError();
                }
            }
        } catch (error) {
            console.error('💥 Error loading current subscription:', error);
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
        const modalLabel = document.getElementById('subscriptionModalLabel');
        const confirmBtn = document.getElementById('confirmSubscription');
        
        const price = selectedBillingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
        const billingText = selectedBillingCycle === 'yearly' ? 'per year' : 'per month';
        
        // Determine subscription action type
        const isUpgrade = currentSubscription && currentSubscription.subscription_plan_id !== plan.id;
        const isNewSubscription = !currentSubscription;
        const isSamePlan = currentSubscription && currentSubscription.subscription_plan_id === plan.id;
        
        let actionText, modalTitle, alertMessage, buttonText;
        
        if (isNewSubscription) {
            actionText = 'Subscribe to';
            modalTitle = 'Confirm Subscription';
            buttonText = '<i class="fas fa-credit-card me-2"></i>Confirm Subscription';
            alertMessage = 'This is a mock subscription system for demonstration purposes.';
        } else if (isSamePlan) {
            actionText = 'You are currently subscribed to';
            modalTitle = 'Current Plan';
            buttonText = '<i class="fas fa-check me-2"></i>Current Plan';
            alertMessage = 'You are already subscribed to this plan.';
        } else if (isUpgrade) {
            const currentPlanPrice = currentSubscription.subscriptionPlan.price_monthly;
            const newPlanPrice = plan.price_monthly;
            const isUpgradeChange = newPlanPrice > currentPlanPrice;
            
            actionText = isUpgradeChange ? 'Upgrade to' : 'Change to';
            modalTitle = isUpgradeChange ? 'Confirm Upgrade' : 'Confirm Plan Change';
            buttonText = `<i class="fas fa-arrow-up me-2"></i>${isUpgradeChange ? 'Upgrade Plan' : 'Change Plan'}`;
            alertMessage = isUpgradeChange ? 
                'You will be charged a prorated amount for the plan upgrade.' :
                'Your plan will be changed and billing adjusted accordingly.';
        }
        
        // Update modal title and button text
        modalLabel.textContent = modalTitle;
        confirmBtn.innerHTML = buttonText;
        confirmBtn.disabled = isSamePlan;
        
        detailsDiv.innerHTML = `
            <div class="text-center mb-3">
                <h4>${actionText} ${plan.display_name}</h4>
                <p class="text-muted">${plan.description}</p>
            </div>
            
            ${currentSubscription && !isNewSubscription ? `
                <div class="current-plan-info mb-3">
                    <div class="card bg-light">
                        <div class="card-body p-3">
                            <h6 class="card-title mb-1">Current Plan: ${currentSubscription.subscriptionPlan.display_name}</h6>
                            <small class="text-muted">$${currentSubscription.billing_cycle === 'yearly' ? currentSubscription.subscriptionPlan.price_yearly : currentSubscription.subscriptionPlan.price_monthly} per ${currentSubscription.billing_cycle === 'yearly' ? 'year' : 'month'}</small>
                        </div>
                    </div>
                </div>
            ` : ''}
            
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
            
            <div class="alert ${isSamePlan ? 'alert-warning' : 'alert-info'}">
                <i class="fas fa-info-circle me-2"></i>
                ${alertMessage}
            </div>
        `;
        
        modal.show();
    }

    async function handleSubscription() {
        if (!selectedPlan) return;
        
        // Reload current subscription to ensure we have the latest data
        console.log('🔄 Reloading subscription data before processing...');
        await loadCurrentSubscription();
        
        // Debug: Log subscription state
        console.log('🔍 SUBSCRIPTION DEBUG:', {
            currentSubscription: currentSubscription,
            hasCurrentSubscription: !!currentSubscription,
            selectedPlanId: selectedPlan.id,
            currentPlanId: currentSubscription?.subscription_plan_id
        });
        
        // Determine if this is a new subscription or an upgrade/downgrade
        const isUpgrade = currentSubscription && currentSubscription.subscription_plan_id !== selectedPlan.id;
        const isNewSubscription = !currentSubscription;
        
        console.log('🎯 SUBSCRIPTION ACTION:', {
            isNewSubscription,
            isUpgrade,
            isSamePlan: currentSubscription && currentSubscription.subscription_plan_id === selectedPlan.id
        });
        
        try {
            const confirmBtn = document.getElementById('confirmSubscription');
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
            
            let endpoint, method, requestBody, successMessage;
            
            if (isNewSubscription) {
                // New subscription
                endpoint = '/api/subscription/subscribe';
                method = 'POST';
                requestBody = {
                    planId: selectedPlan.id,
                    billingCycle: selectedBillingCycle,
                    paymentMethod: 'mock'
                };
                successMessage = 'Subscription created successfully!';
                console.log('📝 NEW SUBSCRIPTION:', { endpoint, method, requestBody });
            } else if (isUpgrade) {
                // Upgrade/downgrade existing subscription
                endpoint = '/api/subscription/change';
                method = 'PUT';
                requestBody = {
                    planId: selectedPlan.id
                };
                const currentPlanPrice = currentSubscription.subscriptionPlan.price_monthly;
                const newPlanPrice = selectedPlan.price_monthly;
                const isUpgradeChange = newPlanPrice > currentPlanPrice;
                successMessage = isUpgradeChange ? 'Subscription upgraded successfully!' : 'Subscription changed successfully!';
                console.log('🔄 UPGRADE/CHANGE:', { endpoint, method, requestBody, isUpgradeChange });
            } else {
                // Same plan selected
                console.log('⚠️ SAME PLAN SELECTED');
                throw new Error('You are already subscribed to this plan');
            }
            
            const response = await fetch(endpoint, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });
            
            if (response.ok) {
                const result = await response.json();
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('subscriptionModal'));
                modal.hide();
                
                // Show success message
                showSuccess(successMessage);
                
                // Reload page to reflect changes
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                const error = await response.json();
                throw new Error(error.error || `Failed to ${isNewSubscription ? 'create' : 'change'} subscription`);
            }
        } catch (error) {
            console.error('Error handling subscription:', error);
            showError(error.message || 'Failed to process subscription');
        } finally {
            const confirmBtn = document.getElementById('confirmSubscription');
            confirmBtn.disabled = false;
            
            // Reset button text based on subscription type
            if (isNewSubscription) {
                confirmBtn.innerHTML = '<i class="fas fa-credit-card me-2"></i>Confirm Subscription';
            } else if (currentSubscription && currentSubscription.subscription_plan_id === selectedPlan.id) {
                confirmBtn.innerHTML = '<i class="fas fa-check me-2"></i>Current Plan';
                confirmBtn.disabled = true;
            } else {
                const currentPlanPrice = currentSubscription.subscriptionPlan.price_monthly;
                const newPlanPrice = selectedPlan.price_monthly;
                const isUpgradeChange = newPlanPrice > currentPlanPrice;
                confirmBtn.innerHTML = `<i class="fas fa-arrow-up me-2"></i>${isUpgradeChange ? 'Upgrade Plan' : 'Change Plan'}`;
            }
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
    
    function showAuthenticationError() {
        const alert = document.createElement('div');
        alert.className = 'alert alert-warning alert-dismissible fade show';
        alert.innerHTML = `
            <i class="fas fa-exclamation-triangle me-2"></i>
            You need to log in to manage your subscription. 
            <a href="/auth/login" class="alert-link">Click here to log in</a>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.querySelector('.container-fluid').insertBefore(alert, document.querySelector('.container-fluid').firstChild);
    }
    
    // Check if user is authenticated by trying to access a protected endpoint
    async function checkAuthentication() {
        try {
            const response = await fetch('/api/subscription/current');
            return response.status !== 401;
        } catch (error) {
            return false;
        }
    }
}); 