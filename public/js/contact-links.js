/**
 * Contact Links Enhancement
 * Provides styling and behavior for clickable contact links in modals and relationship displays
 */

// Add CSS for contact links
document.addEventListener('DOMContentLoaded', function() {
    // Add custom styles for contact links
    const style = document.createElement('style');
    style.textContent = `
        .contact-link {
            color: #0066cc !important;
            transition: all 0.2s ease;
            border-bottom: 1px solid transparent;
        }
        
        .contact-link:hover {
            color: #004499 !important;
            border-bottom-color: #004499;
            text-decoration: none !important;
        }
        
        .contact-link:focus {
            outline: 2px solid #0066cc;
            outline-offset: 2px;
            border-radius: 2px;
        }
        
        /* Ensure links are visible in modals */
        .modal .contact-link {
            font-weight: 600;
        }
        
        /* Hover effect for relationship cards with clickable contacts */
        .relationship-connection:has(.contact-link:hover) {
            background-color: rgba(0, 102, 204, 0.05);
            transition: background-color 0.2s ease;
        }
    `;
    document.head.appendChild(style);
});

// Add click event tracking for analytics (optional)
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('contact-link')) {
        console.log('Contact link clicked:', e.target.href);
        // You can add analytics tracking here if needed
    }
});

// Handle keyboard navigation for accessibility
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && e.target.classList.contains('contact-link')) {
        e.target.click();
    }
});
