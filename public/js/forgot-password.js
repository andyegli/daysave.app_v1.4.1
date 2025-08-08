/**
 * Forgot Password Form Handler
 * External JavaScript file for CSP compliance
 */

document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('form[action="/auth/forgot-password"]');
    const emailInput = document.getElementById('email');
    const submitButton = form.querySelector('button[type="submit"]');
    
    if (!form || !emailInput || !submitButton) {
        console.warn('Forgot password form elements not found');
        return;
    }

    // Email validation
    function validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Real-time email validation
    emailInput.addEventListener('input', function() {
        const email = this.value.trim();
        
        if (email === '') {
            this.classList.remove('is-valid', 'is-invalid');
            return;
        }

        if (validateEmail(email)) {
            this.classList.remove('is-invalid');
            this.classList.add('is-valid');
        } else {
            this.classList.remove('is-valid');
            this.classList.add('is-invalid');
        }
    });

    // Form submission handling
    form.addEventListener('submit', function(e) {
        const email = emailInput.value.trim();
        
        if (!email) {
            e.preventDefault();
            emailInput.classList.add('is-invalid');
            showAlert('Please enter your email address.', 'danger');
            return;
        }

        if (!validateEmail(email)) {
            e.preventDefault();
            emailInput.classList.add('is-invalid');
            showAlert('Please enter a valid email address.', 'danger');
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

    // Auto-focus email input
    emailInput.focus();
    
    console.log('Forgot password form initialized');
});