// Dashboard specific JavaScript for DaySave app
// CSP-compliant external script

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 Dashboard.js loaded - all session refresh functionality disabled');
});

// Handle URL parameter success messages
(function() {
    const urlParams = new URLSearchParams(window.location.search);
    const successType = urlParams.get('success');
    
    if (successType === 'account_linked') {
        // Show success alert
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-success alert-dismissible fade show';
        alertDiv.innerHTML = `
            <i class="fas fa-check-circle me-2"></i>
            <strong>Account Linked Successfully!</strong> You can now use your social account to login.
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        const main = document.querySelector('main');
        const h1 = document.querySelector('h1');
        if (main && h1) {
            main.insertBefore(alertDiv, h1.nextSibling);
        }
        
        // Clean up URL
        const newUrl = window.location.pathname;
        history.replaceState({}, document.title, newUrl);
    }
})(); 