// Modern Map Modal for Contact Views
// Uses new Google Places API REST endpoints instead of deprecated Maps SDK

class ModernContactMapModal {
  constructor() {
    this.currentAddress = null;
    this.init();
  }

  init() {
    console.log('ModernContactMapModal: Initializing...');
    this.setupMapButtons();
    this.setupModal();
  }

  setupMapButtons() {
    // Handle map buttons in both contact list and detail views
    document.addEventListener('click', (e) => {
      // Only handle elements with show-map class, not just any map icon
      const mapButton = e.target.closest('.show-map');
      if (mapButton) {
        e.preventDefault();
        const address = mapButton.getAttribute('data-address');
        
        console.log('Map button clicked. Address data:', address);
        
        if (address && address !== 'undefined' && address !== 'null' && address.trim() !== '') {
          this.showAddressOnMap(address);
        } else {
          console.warn('ModernContactMapModal: Invalid address data:', address);
          this.showAddressError('Address information is not available for this contact.');
        }
        return;
      }
      
      // Prevent accidental clicks on decorative map icons
      const mapIcon = e.target.closest('.fa-map-marker-alt, .fa-map, .bi-geo-alt-fill');
      if (mapIcon && !mapIcon.closest('.show-map')) {
        console.log('Decorative map icon clicked - ignoring');
        e.preventDefault();
      }
    });
  }

  setupModal() {
    const modal = document.getElementById('mapModal');
    if (modal) {
      modal.addEventListener('shown.bs.modal', () => {
        this.initializeMap();
      });
      
      // Fix accessibility issue by managing focus properly
      modal.addEventListener('hide.bs.modal', (event) => {
        // Prevent the modal from hiding if there are focused elements
        const focusedElement = modal.querySelector(':focus');
        if (focusedElement) {
          // Use setTimeout to handle focus after the current event loop
          setTimeout(() => {
            focusedElement.blur();
            // Remove aria-hidden temporarily to prevent conflict
            modal.removeAttribute('aria-hidden');
          }, 0);
        }
      });
      
      // Ensure modal is properly cleaned up when hidden
      modal.addEventListener('hidden.bs.modal', () => {
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
          mapContainer.innerHTML = '';
        }
        this.currentAddress = null;
        // Ensure aria-hidden is properly set after cleanup
        setTimeout(() => {
          modal.setAttribute('aria-hidden', 'true');
        }, 100);
      });
      
      // Additional accessibility fix for button clicks inside modal
      modal.addEventListener('click', (e) => {
        if (e.target.matches('[data-bs-dismiss="modal"]')) {
          // Force blur on close buttons before hiding
          e.target.blur();
        }
      });
    }
  }

  async showAddressOnMap(address) {
    console.log('ModernContactMapModal: Showing address on map:', address);
    this.currentAddress = address;
    
    // Get the modal element
    const modalElement = document.getElementById('mapModal');
    if (!modalElement) {
      console.error('ModernContactMapModal: Modal element not found');
      return;
    }
    
    // Clear any existing content before showing
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
      mapContainer.innerHTML = '';
    }
    
    // Show the modal with proper focus management
    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
    modal.show();
  }

  async initializeMap() {
    if (!this.currentAddress) {
      console.warn('ModernContactMapModal: No address to display');
      return;
    }

    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
      console.error('ModernContactMapModal: Map container not found');
      return;
    }

    // Show loading message
    mapContainer.innerHTML = '<div class="d-flex justify-content-center align-items-center h-100"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading map...</span></div></div>';

    try {
      // Use our backend API to geocode the address
      const geocodeData = await this.geocodeAddress(this.currentAddress);
      
      if (geocodeData && geocodeData.location) {
        await this.renderStaticMap(geocodeData.location, this.currentAddress);
      } else {
        throw new Error('Could not geocode address');
      }
    } catch (error) {
      console.error('ModernContactMapModal: Error loading map:', error);
      this.showMapError('Unable to load map for this address. Please try again later.');
    }
  }

  async geocodeAddress(address) {
    try {
      const response = await fetch('/api/places/geocode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ address })
      });

      if (!response.ok) {
        throw new Error('Geocoding failed');
      }

      const data = await response.json();
      
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results[0];
        return {
          location: result.geometry.location,
          formatted_address: result.formatted_address
        };
      } else {
        throw new Error('No geocoding results found');
      }
    } catch (error) {
      console.error('ModernContactMapModal: Geocoding error:', error);
      return null;
    }
  }

  async renderStaticMap(location, address) {
    const mapContainer = document.getElementById('map');
    
    // Create a modern location display without static map dependency
    const mapHtml = `
      <div class="modern-map-container h-100 d-flex flex-column">
        <!-- Address Header -->
        <div class="map-header p-3 bg-primary text-white">
          <h6 class="mb-1 fw-bold">📍 Location Found</h6>
          <p class="mb-0 small opacity-75">${address}</p>
        </div>
        
        <!-- Location Info -->
        <div class="map-content flex-grow-1 d-flex flex-column justify-content-center align-items-center p-4 bg-light">
          <div class="text-center mb-4">
            <i class="fas fa-map-marker-alt text-primary fa-4x mb-3"></i>
            <h5 class="mb-2">Location Verified</h5>
            <p class="text-muted mb-3">This address has been found and verified by Google Maps.</p>
            
            <!-- Coordinates -->
            <div class="bg-white p-3 rounded border mb-4">
              <small class="text-muted d-block">GPS Coordinates:</small>
              <strong>${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}</strong>
            </div>
          </div>
          
          <!-- Action Buttons -->
          <div class="d-flex gap-2 flex-wrap justify-content-center">
            <a href="${this.getGoogleMapsUrl(location, address)}" 
               target="_blank" 
               class="btn btn-primary">
              <i class="fas fa-external-link-alt me-2"></i>
              Open in Google Maps
            </a>
            <a href="${this.getAppleMapsUrl(location, address)}" 
               target="_blank" 
               class="btn btn-outline-secondary">
              <i class="fas fa-map me-2"></i>
              Apple Maps
            </a>
            <button class="btn btn-outline-info copy-address-btn" data-address="${address.replace(/"/g, '&quot;')}">
              <i class="fas fa-copy me-2"></i>
              Copy Address
            </button>
          </div>
        </div>
        
        <!-- Directions Options -->
        <div class="map-footer p-3 border-top bg-white">
          <small class="text-muted d-block mb-2">
            <i class="fas fa-route me-1"></i>
            Get directions from:
          </small>
          <div class="d-flex gap-2 flex-wrap">
            <a href="https://www.google.com/maps/dir//${encodeURIComponent(address)}" 
               target="_blank" 
               class="btn btn-sm btn-outline-primary">
              <i class="fas fa-directions me-1"></i>
              Google Directions
            </a>
            <a href="https://maps.apple.com/?daddr=${encodeURIComponent(address)}" 
               target="_blank" 
               class="btn btn-sm btn-outline-secondary">
              <i class="fas fa-route me-1"></i>
              Apple Directions
            </a>
          </div>
        </div>
      </div>
    `;
    
    mapContainer.innerHTML = mapHtml;
    
    // Add copy functionality
    const copyBtn = mapContainer.querySelector('.copy-address-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const address = copyBtn.getAttribute('data-address');
        
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(address);
            
            // Show success feedback
            const originalContent = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fas fa-check text-success me-2"></i>Copied!';
            copyBtn.disabled = true;
            
            setTimeout(() => {
              copyBtn.innerHTML = originalContent;
              copyBtn.disabled = false;
            }, 2000);
            
            console.log('Address copied to clipboard:', address);
          } else {
            // Fallback for older browsers
            this.fallbackCopyToClipboard(address);
          }
        } catch (error) {
          console.error('Failed to copy address:', error);
          
          // Show error feedback
          const originalContent = copyBtn.innerHTML;
          copyBtn.innerHTML = '<i class="fas fa-times text-danger me-2"></i>Failed';
          
          setTimeout(() => {
            copyBtn.innerHTML = originalContent;
          }, 2000);
        }
      });
    }
  }



  getGoogleMapsUrl(location, address) {
    return `https://www.google.com/maps?q=${encodeURIComponent(address)}&ll=${location.lat},${location.lng}`;
  }

  getAppleMapsUrl(location, address) {
    return `https://maps.apple.com/?q=${encodeURIComponent(address)}&ll=${location.lat},${location.lng}`;
  }

  showAddressError(message) {
    // Get the modal element
    const modalElement = document.getElementById('mapModal');
    if (!modalElement) {
      console.error('ModernContactMapModal: Modal element not found');
      return;
    }
    
    // Show error modal for address issues
    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
    modal.show();
    
    const mapContainer = document.getElementById('map');
    mapContainer.innerHTML = `
      <div class="d-flex flex-column justify-content-center align-items-center h-100 text-center p-4">
        <i class="fas fa-exclamation-circle text-danger fa-4x mb-3"></i>
        <h5 class="mb-2">Address Not Available</h5>
        <p class="text-muted mb-3">${message}</p>
        <div class="alert alert-info small">
          <i class="fas fa-info-circle me-1"></i>
          This contact may not have a complete address or the address data could not be found.
        </div>
        <button class="btn btn-primary" data-bs-dismiss="modal">
          <i class="fas fa-times me-2"></i>Close
        </button>
      </div>
    `;
  }

  showMapError(message) {
    const mapContainer = document.getElementById('map');
    mapContainer.innerHTML = `
      <div class="d-flex flex-column justify-content-center align-items-center h-100 text-center p-4">
        <i class="fas fa-exclamation-triangle text-warning fa-3x mb-3"></i>
        <h6 class="mb-2">Map Unavailable</h6>
        <p class="text-muted mb-3">${message}</p>
        <div class="d-flex gap-2 flex-wrap justify-content-center">
          <a href="https://www.google.com/maps/search/${encodeURIComponent(this.currentAddress)}" 
             target="_blank" 
             class="btn btn-outline-primary btn-sm">
            <i class="fas fa-external-link-alt me-1"></i>
            Search on Google Maps
          </a>
          <button class="btn btn-outline-secondary btn-sm copy-error-address-btn" data-address="${this.currentAddress}">
            <i class="fas fa-copy me-1"></i>
            Copy Address
          </button>
        </div>
      </div>
    `;
    
    // Add copy functionality to error view
    const copyBtn = mapContainer.querySelector('.copy-error-address-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const address = copyBtn.getAttribute('data-address');
        this.fallbackCopyToClipboard(address);
      });
    }
  }

  fallbackCopyToClipboard(text) {
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
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('ModernContactMapModal: DOM loaded, initializing...');
  window.modernContactMapModal = new ModernContactMapModal();
}); 