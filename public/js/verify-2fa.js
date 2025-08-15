/**
 * 2FA Verification Form Handler
 * External JavaScript file for CSP compliance
 */

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('verify2faForm');
    const codeInput = document.getElementById('code');
    const verifyButton = document.getElementById('verifyButton');
    
    if (!form || !codeInput || !verifyButton) {
        console.warn('2FA verification form elements not found');
        return;
    }

    // Auto-format code input (numbers only, max 6 digits)
    codeInput.addEventListener('input', function() {
        let value = this.value.replace(/\D/g, ''); // Remove non-digits
        if (value.length > 6) {
            value = value.substring(0, 6);
        }
        this.value = value;
        
        // Auto-submit when 6 digits are entered
        if (value.length === 6) {
            validateAndSubmit();
        }
        
        // Update button state
        updateButtonState();
    });

    // Handle paste events
    codeInput.addEventListener('paste', function(e) {
        e.preventDefault();
        const paste = (e.clipboardData || window.clipboardData).getData('text');
        const digits = paste.replace(/\D/g, '').substring(0, 6);
        this.value = digits;
        
        if (digits.length === 6) {
            setTimeout(() => validateAndSubmit(), 100);
        }
        
        updateButtonState();
    });

    // Form submission handling
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        validateAndSubmit();
    });

    // Validate and submit form
    function validateAndSubmit() {
        const code = codeInput.value.trim();
        
        if (!code) {
            showAlert('Please enter your verification code.', 'danger');
            codeInput.focus();
            return;
        }

        if (code.length !== 6 || !/^\d{6}$/.test(code)) {
            showAlert('Please enter a valid 6-digit code.', 'danger');
            codeInput.focus();
            return;
        }

        // Show loading state
        verifyButton.disabled = true;
        verifyButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Verifying...';
        
        // Submit form
        form.submit();
    }

    // Update button state based on input
    function updateButtonState() {
        const code = codeInput.value.trim();
        const isValid = code.length === 6 && /^\d{6}$/.test(code);
        
        verifyButton.disabled = !isValid;
        
        if (isValid) {
            verifyButton.classList.remove('btn-secondary');
            verifyButton.classList.add('btn-verify');
        } else {
            verifyButton.classList.remove('btn-verify');
            verifyButton.classList.add('btn-secondary');
        }
    }

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

    // Auto-focus code input
    codeInput.focus();
    
    // Initial button state
    updateButtonState();
    
    console.log('2FA verification form initialized');
});
