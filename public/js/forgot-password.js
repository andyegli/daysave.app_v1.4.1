/**
 * Forgot Password Form Handler
 * External JavaScript file for CSP compliance
 */

document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('form[action="/auth/forgot-password"]');
    const identifierInput = document.getElementById('identifier');
    const submitButton = form.querySelector('button[type="submit"]');
    
    if (!form || !identifierInput || !submitButton) {
        console.warn('Forgot password form elements not found');
        return;
    }

    // Email validation
    function validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Username validation (basic)
    function validateUsername(username) {
        return username.length >= 3 && /^[a-zA-Z0-9_.-]+$/.test(username);
    }

    // Real-time identifier validation
    identifierInput.addEventListener('input', function() {
        const identifier = this.value.trim();
        
        if (identifier === '') {
            this.classList.remove('is-valid', 'is-invalid');
            return;
        }

        // Check if it's an email or username
        if (validateEmail(identifier) || validateUsername(identifier)) {
            this.classList.remove('is-invalid');
            this.classList.add('is-valid');
        } else {
            this.classList.remove('is-valid');
            this.classList.add('is-invalid');
        }
    });

    // Form submission handling
    form.addEventListener('submit', function(e) {
        const identifier = identifierInput.value.trim();
        
        if (!identifier) {
            e.preventDefault();
            identifierInput.classList.add('is-invalid');
            showAlert('Please enter your email address or username.', 'danger');
            return;
        }

        if (!validateEmail(identifier) && !validateUsername(identifier)) {
            e.preventDefault();
            identifierInput.classList.add('is-invalid');
            showAlert('Please enter a valid email address or username.', 'danger');
            return;
        }

        // Show loading state
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Sending...';
        
        // Form will submit normally if validation passes
    });

    // Helper function to show alerts
    function showAlert(message, type) {
        // Remove existing alerts
        const existingAlerts = document.querySelectorAll('.alert:not(.alert-success)');
        existingAlerts.forEach(alert => alert.remove());

        // Create new alert
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.setAttribute('role', 'alert');
        alertDiv.innerHTML = `
            <i class="fas fa-${type === 'danger' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        // Insert before the form
        form.parentNode.insertBefore(alertDiv, form);
    }

    // Auto-focus identifier input
    identifierInput.focus();
    
    console.log('Forgot password form initialized');
});