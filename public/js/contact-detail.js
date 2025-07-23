// Contact Detail Page JavaScript
// Handles delete confirmation and other contact detail page interactions

document.addEventListener('DOMContentLoaded', function() {
  console.log('Contact detail page: JavaScript loaded');
  
  // Handle delete confirmation
  setupDeleteConfirmation();
  
  // Handle copy address functionality
  setupCopyAddressButtons();
});

function setupDeleteConfirmation() {
  const deleteBtn = document.querySelector('.delete-contact-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', function(e) {
      e.preventDefault();
      
      const contactName = this.getAttribute('data-contact-name');
      
      const confirmMessage = `Are you sure you want to delete ${contactName}?\n\nThis action cannot be undone.`;
      
      if (confirm(confirmMessage)) {
        // Submit the form
        this.closest('form').submit();
      }
    });
    
    console.log('Contact detail: Delete confirmation handler attached');
  }
}

function setupCopyAddressButtons() {
  // Add copy functionality to address fields
  const addressElements = document.querySelectorAll('.info-value');
  
  addressElements.forEach(element => {
    // Check if this is an address field (contains a map link)
    const mapLink = element.querySelector('.show-map');
    if (mapLink) {
      // Add a copy button
      const copyBtn = document.createElement('button');
      copyBtn.className = 'btn btn-outline-secondary btn-sm ms-2';
      copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
      copyBtn.title = 'Copy address to clipboard';
      copyBtn.style.fontSize = '0.75rem';
      copyBtn.style.padding = '0.25rem 0.5rem';
      
      const addressText = mapLink.getAttribute('data-address');
      
      copyBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(addressText);
            
            // Show success feedback
            const originalContent = this.innerHTML;
            this.innerHTML = '<i class="fas fa-check text-success"></i>';
            this.disabled = true;
            
            setTimeout(() => {
              this.innerHTML = originalContent;
              this.disabled = false;
            }, 2000);
            
            console.log('Address copied to clipboard:', addressText);
          } else {
            // Fallback for older browsers
            fallbackCopyToClipboard(addressText);
          }
        } catch (error) {
          console.error('Failed to copy address:', error);
          
          // Show error feedback
          const originalContent = this.innerHTML;
          this.innerHTML = '<i class="fas fa-times text-danger"></i>';
          
          setTimeout(() => {
            this.innerHTML = originalContent;
          }, 2000);
        }
      });
      
      element.appendChild(copyBtn);
    }
  });
}

function fallbackCopyToClipboard(text) {
  // Fallback method for older browsers
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  try {
    const successful = document.execCommand('copy');
    if (successful) {
      console.log('Address copied to clipboard (fallback method):', text);
    } else {
      throw new Error('Copy command failed');
    }
  } catch (error) {
    console.error('Fallback copy failed:', error);
    // As a last resort, show the text in a prompt
    prompt('Copy this address:', text);
  } finally {
    document.body.removeChild(textArea);
  }
} 