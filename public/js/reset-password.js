/**
 * Reset Password Form Handler
 * External JavaScript file for CSP compliance
 */

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('resetPasswordForm');
    const newPasswordInput = document.getElementById('new_password');
    const confirmPasswordInput = document.getElementById('confirm_password');
    const submitButton = document.getElementById('resetButton');
    const togglePassword1 = document.getElementById('togglePassword1');
    const togglePassword2 = document.getElementById('togglePassword2');
    const eyeIcon1 = document.getElementById('eyeIcon1');
    const eyeIcon2 = document.getElementById('eyeIcon2');
    const strengthBar = document.getElementById('strengthBar');
    const strengthText = document.getElementById('strengthText');
    const matchText = document.getElementById('matchText');

    if (!form || !newPasswordInput || !confirmPasswordInput) {
        console.warn('Reset password form elements not found');
        return;
    }

    // Password requirements elements
    const requirements = {
        length: document.getElementById('req-length'),
        uppercase: document.getElementById('req-uppercase'),
        lowercase: document.getElementById('req-lowercase'),
        number: document.getElementById('req-number'),
        special: document.getElementById('req-special')
    };

    // Password strength calculation
    function calculatePasswordStrength(password) {
        let score = 0;
        const checks = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };

        // Update requirement indicators
        Object.keys(checks).forEach(key => {
            if (requirements[key]) {
                if (checks[key]) {
                    requirements[key].classList.remove('text-muted');
                    requirements[key].classList.add('text-success');
                    requirements[key].innerHTML = requirements[key].innerHTML.replace(/fas fa-.*?( |$)/, 'fas fa-check ');
                } else {
                    requirements[key].classList.remove('text-success');
                    requirements[key].classList.add('text-muted');
                    requirements[key].innerHTML = requirements[key].innerHTML.replace(/fas fa-.*?( |$)/, 'fas fa-times ');
                }
            }
        });

        // Calculate score
        score = Object.values(checks).filter(Boolean).length;

        return {
            score: score,
            percentage: (score / 5) * 100,
            checks: checks
        };
    }

    // Update password strength indicator
    function updatePasswordStrength(password) {
        const strength = calculatePasswordStrength(password);
        
        strengthBar.style.width = strength.percentage + '%';
        
        if (strength.percentage === 0) {
            strengthBar.style.backgroundColor = '#e9ecef';
            strengthText.textContent = 'Password strength will appear here';
            strengthText.className = 'text-muted';
        } else if (strength.percentage <= 40) {
            strengthBar.style.backgroundColor = '#dc3545';
            strengthText.textContent = 'Weak password';
            strengthText.className = 'text-danger';
        } else if (strength.percentage <= 60) {
            strengthBar.style.backgroundColor = '#fd7e14';
            strengthText.textContent = 'Fair password';
            strengthText.className = 'text-warning';
        } else if (strength.percentage <= 80) {
            strengthBar.style.backgroundColor = '#ffc107';
            strengthText.textContent = 'Good password';
            strengthText.className = 'text-warning';
        } else {
            strengthBar.style.backgroundColor = '#198754';
            strengthText.textContent = 'Strong password';
            strengthText.className = 'text-success';
        }

        return strength;
    }

    // Check password match
    function checkPasswordMatch() {
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (confirmPassword === '') {
            matchText.textContent = '';
            confirmPasswordInput.classList.remove('is-valid', 'is-invalid');
            return false;
        }

        if (newPassword === confirmPassword) {
            matchText.textContent = 'Passwords match';
            matchText.className = 'text-success';
            confirmPasswordInput.classList.remove('is-invalid');
            confirmPasswordInput.classList.add('is-valid');
            return true;
        } else {
            matchText.textContent = 'Passwords do not match';
            matchText.className = 'text-danger';
            confirmPasswordInput.classList.remove('is-valid');
            confirmPasswordInput.classList.add('is-invalid');
            return false;
        }
    }

    // Validate form
    function validateForm() {
        const newPassword = newPasswordInput.value;
        const strength = calculatePasswordStrength(newPassword);
        const passwordsMatch = checkPasswordMatch();
        const isValidPassword = Object.values(strength.checks).every(Boolean);

        const isValid = isValidPassword && passwordsMatch;
        
        if (submitButton) {
            submitButton.disabled = !isValid;
        }

        return isValid;
    }

    // Password input event listener
    newPasswordInput.addEventListener('input', function() {
        const password = this.value;
        updatePasswordStrength(password);
        
        if (password.length >= 8) {
            this.classList.remove('is-invalid');
            this.classList.add('is-valid');
        } else {
            this.classList.remove('is-valid');
            this.classList.add('is-invalid');
        }
        
        // Recheck match if confirm password has content
        if (confirmPasswordInput.value) {
            checkPasswordMatch();
        }
        
        validateForm();
    });

    // Confirm password input event listener
    confirmPasswordInput.addEventListener('input', function() {
        checkPasswordMatch();
        validateForm();
    });

    // Password visibility toggle
    if (togglePassword1 && eyeIcon1) {
        togglePassword1.addEventListener('click', function() {
            const type = newPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            newPasswordInput.setAttribute('type', type);
            
            if (type === 'text') {
                eyeIcon1.classList.remove('fa-eye');
                eyeIcon1.classList.add('fa-eye-slash');
            } else {
                eyeIcon1.classList.remove('fa-eye-slash');
                eyeIcon1.classList.add('fa-eye');
            }
        });
    }

    if (togglePassword2 && eyeIcon2) {
        togglePassword2.addEventListener('click', function() {
            const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            confirmPasswordInput.setAttribute('type', type);
            
            if (type === 'text') {
                eyeIcon2.classList.remove('fa-eye');
                eyeIcon2.classList.add('fa-eye-slash');
            } else {
                eyeIcon2.classList.remove('fa-eye-slash');
                eyeIcon2.classList.add('fa-eye');
            }
        });
    }

    // Form submission
    form.addEventListener('submit', function(e) {
        if (!validateForm()) {
            e.preventDefault();
            showAlert('Please ensure all password requirements are met and passwords match.', 'danger');
            return;
        }

        // Show loading state
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Resetting Password...';
        }
    });

    // Helper function to show alerts
    function showAlert(message, type) {
        const existingAlerts = document.querySelectorAll('.alert:not(.alert-success)');
        existingAlerts.forEach(alert => alert.remove());

        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.setAttribute('role', 'alert');
        alertDiv.innerHTML = `
            <i class="fas fa-${type === 'danger' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        form.parentNode.insertBefore(alertDiv, form);
    }

    // Initial validation
    validateForm();
    
    // Auto-focus first password input
    newPasswordInput.focus();

    console.log('Reset password form initialized');
});