/**
 * 2FA Reset Form Handler
 * External JavaScript file for CSP compliance
 */

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('reset2faForm');
    const emailInput = document.getElementById('email');
    const reasonInput = document.getElementById('reason');
    const resetButton = document.getElementById('resetButton');
    
    if (!form || !emailInput || !reasonInput || !resetButton) {
        console.warn('2FA reset form elements not found');
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
        
        updateButtonState();
    });

    // Real-time reason validation
    reasonInput.addEventListener('input', function() {
        const reason = this.value.trim();
        
        if (reason === '') {
            this.classList.remove('is-valid', 'is-invalid');
            return;
        }

        if (reason.length >= 10) {
            this.classList.remove('is-invalid');
            this.classList.add('is-valid');
        } else {
            this.classList.remove('is-valid');
            this.classList.add('is-invalid');
        }
        
        updateButtonState();
    });

    // Update button state based on form validity
    function updateButtonState() {
        const email = emailInput.value.trim();
        const reason = reasonInput.value.trim();
        
        const isEmailValid = validateEmail(email);
        const isReasonValid = reason.length >= 10;
        const isFormValid = isEmailValid && isReasonValid;
        
        resetButton.disabled = !isFormValid;
        
        if (isFormValid) {
            resetButton.classList.remove('btn-secondary');
            resetButton.classList.add('btn-reset');
        } else {
            resetButton.classList.remove('btn-reset');
            resetButton.classList.add('btn-secondary');
        }
    }

    // Form submission handling
    form.addEventListener('submit', function(e) {
        const email = emailInput.value.trim();
        const reason = reasonInput.value.trim();
        
        if (!email) {
            e.preventDefault();
            emailInput.classList.add('is-invalid');
            showAlert('Please enter your email address.', 'danger');
            emailInput.focus();
            return;
        }

        if (!validateEmail(email)) {
            e.preventDefault();
            emailInput.classList.add('is-invalid');
            showAlert('Please enter a valid email address.', 'danger');
            emailInput.focus();
            return;
        }

        if (!reason || reason.length < 10) {
            e.preventDefault();
            reasonInput.classList.add('is-invalid');
            showAlert('Please provide a detailed reason (minimum 10 characters).', 'danger');
            reasonInput.focus();
            return;
        }

        // Show loading state
        resetButton.disabled = true;
        resetButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Submitting Request...';
        
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

    // Character counter for reason field
    const reasonCounter = document.createElement('small');
    reasonCounter.className = 'text-muted';
    reasonCounter.style.float = 'right';
    reasonInput.parentNode.appendChild(reasonCounter);
    
    function updateReasonCounter() {
        const length = reasonInput.value.length;
        const remaining = Math.max(0, 10 - length);
        
        if (remaining > 0) {
            reasonCounter.textContent = `${remaining} more characters needed`;
            reasonCounter.className = 'text-warning';
        } else {
            reasonCounter.textContent = `${length} characters`;
            reasonCounter.className = 'text-success';
        }
    }
    
    reasonInput.addEventListener('input', updateReasonCounter);
    updateReasonCounter(); // Initial update

    // Auto-focus email input
    emailInput.focus();
    
    // Initial button state
    updateButtonState();
    
    console.log('2FA reset form initialized');
});
