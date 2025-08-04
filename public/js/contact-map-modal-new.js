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
    
    // Create a container with embedded Google Map
    const mapHtml = `
      <div class="modern-map-container h-100 d-flex flex-column">
        <!-- Address Header -->
        <div class="map-header p-3 bg-primary text-white">
          <h6 class="mb-1 fw-bold">📍 ${address}</h6>
          <p class="mb-0 small opacity-75">GPS: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}</p>
        </div>
        
        <!-- Interactive Google Map -->
        <div class="map-content flex-grow-1" style="min-height: 300px; position: relative;">
          <div id="google-map" style="width: 100%; height: 100%; min-height: 300px;"></div>
        </div>
        
        <!-- Action Buttons Footer -->
        <div class="map-footer p-3 border-top bg-white">
          <div class="d-flex gap-2 flex-wrap justify-content-center mb-2">
            <a href="${this.getGoogleMapsUrl(location, address)}" 
               target="_blank" 
               class="btn btn-sm btn-outline-primary">
              <i class="fas fa-external-link-alt me-1"></i>
              Open in Google Maps
            </a>
            <a href="${this.getAppleMapsUrl(location, address)}" 
               target="_blank" 
               class="btn btn-sm btn-outline-secondary">
              <i class="fas fa-map me-1"></i>
              Apple Maps
            </a>
            <button class="btn btn-sm btn-outline-info copy-address-btn" data-address="${address.replace(/"/g, '&quot;')}">
              <i class="fas fa-copy me-1"></i>
              Copy Address
            </button>
            <a href="https://www.google.com/maps/dir//${encodeURIComponent(address)}" 
               target="_blank" 
               class="btn btn-sm btn-outline-success">
              <i class="fas fa-directions me-1"></i>
              Get Directions
            </a>
          </div>
        </div>
      </div>
    `;
    
    mapContainer.innerHTML = mapHtml;
    
    // Initialize Google Map
    await this.initializeGoogleMap(location, address);
    
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

  async initializeGoogleMap(location, address) {
    const mapElement = document.getElementById('google-map');
    if (!mapElement) {
      console.error('ModernContactMapModal: Google map container not found');
      return;
    }

    try {
      // Check if Google Maps API is loaded
      if (typeof google === 'undefined' || !google.maps) {
        console.log('ModernContactMapModal: Loading Google Maps API...');
        await this.loadGoogleMapsAPI();
      }

      // Create the map
      const map = new google.maps.Map(mapElement, {
        center: location,
        zoom: 15,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: false,
        scrollwheel: true,
        draggable: true,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true
      });

      // Add a marker
      const marker = new google.maps.Marker({
        position: location,
        map: map,
        title: address,
        animation: google.maps.Animation.DROP
      });

      // Add an info window
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="min-width: 200px;">
            <h6 style="margin: 0 0 8px 0; color: #1976d2;">📍 Location</h6>
            <p style="margin: 0 0 4px 0; font-size: 14px;">${address}</p>
            <small style="color: #666;">
              Lat: ${location.lat.toFixed(6)}, Lng: ${location.lng.toFixed(6)}
            </small>
          </div>
        `
      });

      // Open info window initially
      infoWindow.open(map, marker);

      // Add click listener to marker
      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      console.log('ModernContactMapModal: Google Map initialized successfully');
    } catch (error) {
      console.error('ModernContactMapModal: Error initializing Google Map:', error);
      // Fallback to show an error message in the map container
      mapElement.innerHTML = `
        <div class="d-flex flex-column justify-content-center align-items-center h-100 text-center p-4">
          <i class="fas fa-exclamation-triangle text-warning fa-3x mb-3"></i>
          <h6>Map Unavailable</h6>
          <p class="text-muted mb-0">Unable to load interactive map. Please use the external links below.</p>
        </div>
      `;
    }
  }

  async loadGoogleMapsAPI() {
    return new Promise((resolve, reject) => {
      // Check if already loading
      if (window.googleMapsApiLoading) {
        // Wait for existing load
        const checkLoaded = () => {
          if (typeof google !== 'undefined' && google.maps) {
            resolve();
          } else {
            setTimeout(checkLoaded, 100);
          }
        };
        checkLoaded();
        return;
      }

      window.googleMapsApiLoading = true;

      // Create callback function name
      const callbackName = 'initGoogleMapsForModal' + Date.now();
      
      // Set up global callback
      window[callbackName] = () => {
        window.googleMapsApiLoading = false;
        delete window[callbackName];
        resolve();
      };

      // Create script element
      const script = document.createElement('script');
      script.src = `/api/places/script-url?callback=${callbackName}`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        window.googleMapsApiLoading = false;
        delete window[callbackName];
        reject(new Error('Failed to load Google Maps API'));
      };

      document.head.appendChild(script);
    });
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