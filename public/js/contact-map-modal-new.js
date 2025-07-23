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
      const mapButton = e.target.closest('.show-map');
      if (mapButton) {
        e.preventDefault();
        const address = mapButton.getAttribute('data-address');
        if (address) {
          this.showAddressOnMap(address);
        }
      }
    });
  }

  setupModal() {
    const modal = document.getElementById('mapModal');
    if (modal) {
      modal.addEventListener('shown.bs.modal', () => {
        this.initializeMap();
      });
    }
  }

  async showAddressOnMap(address) {
    console.log('ModernContactMapModal: Showing address on map:', address);
    this.currentAddress = address;
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('mapModal'));
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
    
    // Create a modern map display with static map and interactive elements
    const mapHtml = `
      <div class="modern-map-container h-100 d-flex flex-column">
        <!-- Address Header -->
        <div class="map-header p-3 bg-light border-bottom">
          <h6 class="mb-1 fw-bold">📍 Location</h6>
          <p class="mb-0 text-muted small">${address}</p>
        </div>
        
        <!-- Static Map -->
        <div class="map-content flex-grow-1 position-relative">
          <img 
            src="${this.getStaticMapUrl(location, address)}" 
            alt="Map showing ${address}"
            class="w-100 h-100 object-fit-cover"
            style="min-height: 250px;"
          />
          
          <!-- Map Overlay with Actions -->
          <div class="map-overlay position-absolute bottom-0 start-0 end-0 p-3 bg-gradient" style="background: linear-gradient(transparent, rgba(0,0,0,0.7));">
            <div class="d-flex gap-2 justify-content-center">
              <a href="${this.getGoogleMapsUrl(location, address)}" 
                 target="_blank" 
                 class="btn btn-primary btn-sm">
                <i class="fas fa-external-link-alt me-1"></i>
                Open in Google Maps
              </a>
              <a href="${this.getAppleMapsUrl(location, address)}" 
                 target="_blank" 
                 class="btn btn-outline-light btn-sm">
                <i class="fas fa-map me-1"></i>
                Apple Maps
              </a>
              <button onclick="navigator.clipboard?.writeText('${address}')" 
                      class="btn btn-outline-light btn-sm">
                <i class="fas fa-copy me-1"></i>
                Copy Address
              </button>
            </div>
          </div>
        </div>
        
        <!-- Coordinates Info -->
        <div class="map-footer p-2 bg-light border-top">
          <small class="text-muted">
            <i class="fas fa-map-pin me-1"></i>
            Coordinates: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}
          </small>
        </div>
      </div>
    `;
    
    mapContainer.innerHTML = mapHtml;
  }

  getStaticMapUrl(location, address) {
    // Use Google Static Maps API for the map image
    const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';
    const params = new URLSearchParams({
      center: `${location.lat},${location.lng}`,
      zoom: '15',
      size: '600x400',
      maptype: 'roadmap',
      markers: `color:red|${location.lat},${location.lng}`,
      key: 'YOUR_API_KEY' // This would be replaced server-side
    });
    
    // For now, return a placeholder or use a different service
    // In production, this should go through your backend to hide the API key
    return `/api/places/static-map?lat=${location.lat}&lng=${location.lng}&address=${encodeURIComponent(address)}`;
  }

  getGoogleMapsUrl(location, address) {
    return `https://www.google.com/maps?q=${encodeURIComponent(address)}&ll=${location.lat},${location.lng}`;
  }

  getAppleMapsUrl(location, address) {
    return `https://maps.apple.com/?q=${encodeURIComponent(address)}&ll=${location.lat},${location.lng}`;
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
          <button onclick="navigator.clipboard?.writeText('${this.currentAddress}')" 
                  class="btn btn-outline-secondary btn-sm">
            <i class="fas fa-copy me-1"></i>
            Copy Address
          </button>
        </div>
      </div>
    `;
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('ModernContactMapModal: DOM loaded, initializing...');
  window.modernContactMapModal = new ModernContactMapModal();
}); 