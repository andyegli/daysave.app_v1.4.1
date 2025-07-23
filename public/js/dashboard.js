// Dashboard specific JavaScript for DaySave app
// CSP-compliant external script

document.addEventListener('DOMContentLoaded', function() {
    // Check for admin session issues on page load
    if (typeof window.checkAdminSession === 'function') {
        window.checkAdminSession().then(result => {
            if (result && result.data && result.data.sessionUser && result.data.sessionUser.templateCondition) {
                // User should be admin but link might not be showing
                if (!document.querySelector('a[href="/admin/users"]')) {
                    console.log('Admin user detected but link not showing - refreshing session...');
                    window.refreshAdminSession();
                }
            }
        }).catch(e => console.log('Admin check failed:', e));
    }
    
    // Bind refresh session button if it exists
    const refreshBtn = document.getElementById('refresh-session-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', window.refreshAdminSession);
    }
    
    // Bind navbar refresh button if it exists
    const navbarRefreshBtn = document.getElementById('navbar-refresh-btn');
    if (navbarRefreshBtn) {
        navbarRefreshBtn.addEventListener('click', function() {
            window.location.reload();
        });
    }
});

// Global refresh function for admin session
window.refreshAdminSession = async function() {
    try {
        const response = await fetch('/auth/refresh-session', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                alert('Session refreshed! Page will reload to show updated navigation.');
                window.location.reload();
            }
        } else {
            alert('Session refresh failed. Try logging out and back in.');
        }
    } catch (error) {
        alert('Error refreshing session. Try logging out and back in.');
    }
};

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