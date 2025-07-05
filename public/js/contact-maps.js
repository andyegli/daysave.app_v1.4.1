// Contact maps script loaded

let mapAddress = null;

document.addEventListener('DOMContentLoaded', function() {
  // Only setup contact list functionality if we're on a contact list page
  const contactList = document.querySelector('.contact-list');
  if (contactList) {
    // Contact list found, setting up map functionality
    contactList.addEventListener('click', function(e) {
      const btn = e.target.closest('.show-map');
      if (btn) {
        e.preventDefault();
        mapAddress = btn.getAttribute('data-address');
        var modal = new bootstrap.Modal(document.getElementById('mapModal'));
        modal.show();
        console.log('Pin clicked, address:', mapAddress);
      }
    });

    document.getElementById('mapModal').addEventListener('shown.bs.modal', function () {
      if (!mapAddress) return;
      document.getElementById('map').innerHTML = '';
      var map = new google.maps.Map(document.getElementById('map'), {
        zoom: 15,
        center: { lat: 0, lng: 0 }
      });
      var geocoder = new google.maps.Geocoder();
      console.log('[Google Maps API] Geocoding address:', mapAddress);
      geocoder.geocode({ address: mapAddress }, function(results, status) {
        if (status === 'OK') {
          console.log('[Google Maps API] Geocode result:', results[0]);
          map.setCenter(results[0].geometry.location);
          new google.maps.Marker({
            map: map,
            position: results[0].geometry.location
          });
        } else {
          console.error('[Google Maps API] Geocode failed:', status, mapAddress);
          alert('Geocode was not successful for the following reason: ' + status);
        }
      });
    });
  }
});

// Google Maps Places Autocomplete for contact address fields
class ContactMapsAutocomplete {
  constructor() {
    this.autocompleteInstances = new Map();
    this.init();
  }

  init() {
    console.log('ContactMapsAutocomplete: Initializing...');
    
    // Wait for Google Maps API to load
    if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
      console.log('ContactMapsAutocomplete: Google Maps API not loaded yet, waiting...');
      // If Google Maps API is not loaded yet, wait for it
      window.addEventListener('load', () => {
        this.setupAddressAutocomplete();
      });
    } else {
      console.log('ContactMapsAutocomplete: Google Maps API already available');
      this.setupAddressAutocomplete();
    }
  }

  setupAddressAutocomplete() {
    console.log('ContactMapsAutocomplete: Setting up address autocomplete...');
    
    // Setup existing address fields
    this.initializeAddressFields();

    // Setup dynamically added address fields
    const addAddressBtn = document.getElementById('add-address');
    if (addAddressBtn) {
      addAddressBtn.addEventListener('click', () => {
        // Wait for the new field to be added
        setTimeout(() => {
          this.initializeAddressFields();
        }, 100);
      });
    }
  }

  initializeAddressFields() {
    const addressInputs = document.querySelectorAll('input[name*="[addresses]"][name*="[value]"]');
    console.log('ContactMapsAutocomplete: Found', addressInputs.length, 'address inputs');
    
    if (addressInputs.length === 0) {
      console.warn('ContactMapsAutocomplete: No address inputs found. Selector might be wrong.');
      // Try alternative selector
      const altInputs = document.querySelectorAll('input[placeholder="Address"]');
      console.log('ContactMapsAutocomplete: Alternative selector found', altInputs.length, 'inputs');
    }
    
    addressInputs.forEach((input, index) => {
      if (input._placesAutocompleteInitialized) {
        console.log('ContactMapsAutocomplete: Input', index, 'already initialized');
        return;
      }
      input._placesAutocompleteInitialized = true;
      console.log('ContactMapsAutocomplete: Initializing input', index, 'with value:', input.value);
      
      this.setupPlacesAutocomplete(input);
    });
  }

  setupPlacesAutocomplete(input) {
    try {
      console.log('ContactMapsAutocomplete: Setting up Places autocomplete for input:', input);
      
      // Check if Google Maps API is available
      if (typeof google === 'undefined') {
        console.error('ContactMapsAutocomplete: Google Maps API not available');
        this.setupFallbackAutocomplete(input);
        return;
      }
      
      if (!google.maps || !google.maps.places) {
        console.error('ContactMapsAutocomplete: Google Maps Places API not available');
        this.setupFallbackAutocomplete(input);
        return;
      }

      // Create autocomplete instance
      const autocomplete = new google.maps.places.Autocomplete(input, {
        types: ['address'],
        componentRestrictions: { country: [] }, // Allow all countries
        fields: ['formatted_address', 'geometry', 'place_id', 'address_components']
      });

      console.log('ContactMapsAutocomplete: Autocomplete instance created successfully');

      // Store the instance for later use
      this.autocompleteInstances.set(input, autocomplete);

      // Handle place selection
      autocomplete.addListener('place_changed', () => {
        console.log('ContactMapsAutocomplete: Place selected');
        const place = autocomplete.getPlace();
        
        if (place.geometry) {
          // Update the input with the formatted address
          input.value = place.formatted_address;
          
          // Store additional place data for potential future use
          input._placeId = place.place_id;
          input._latitude = place.geometry.location.lat();
          input._longitude = place.geometry.location.lng();
          
          console.log('ContactMapsAutocomplete: Place data stored:', {
            placeId: place.place_id,
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          });
          
          // Trigger any existing change events
          input.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          console.warn('ContactMapsAutocomplete: Place has no geometry');
        }
      });

      // Handle input focus to show suggestions
      input.addEventListener('focus', () => {
        console.log('ContactMapsAutocomplete: Input focused');
        if (input.value.length > 0) {
          // Trigger autocomplete suggestions
          google.maps.event.trigger(autocomplete, 'focus');
        }
      });

      // Handle keyboard navigation
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          // Prevent form submission if autocomplete is open
          const autocompleteInstance = this.autocompleteInstances.get(input);
          if (autocompleteInstance && autocompleteInstance.getPlace()) {
            e.preventDefault();
          }
        }
      });

      console.log('ContactMapsAutocomplete: Places autocomplete initialized successfully for:', input);
    } catch (error) {
      console.error('ContactMapsAutocomplete: Error setting up Google Places autocomplete:', error);
      // Fallback to regular autocomplete if Google Places fails
      this.setupFallbackAutocomplete(input);
    }
  }

  setupFallbackAutocomplete(input) {
    console.log('ContactMapsAutocomplete: Setting up fallback autocomplete for input:', input);
    
    // Create a simple autocomplete container
    const container = document.createElement('div');
    container.className = 'address-autocomplete-suggestions';
    container.style.cssText = `
      position: absolute;
      background: white;
      border: 1px solid #ddd;
      border-top: none;
      max-height: 150px;
      overflow-y: auto;
      z-index: 1000;
      width: 100%;
      display: none;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;
    
    // Position the container
    const inputGroup = input.closest('.input-group');
    if (inputGroup) {
      inputGroup.style.position = 'relative';
      inputGroup.appendChild(container);
    }

    // Simple address suggestions (can be enhanced with a backend endpoint)
    const commonAddresses = [
      '123 Main St, New York, NY, USA',
      '456 Oak Ave, Los Angeles, CA, USA',
      '789 Pine Rd, Chicago, IL, USA',
      '321 Elm St, Houston, TX, USA',
      '654 Maple Dr, Phoenix, AZ, USA'
    ];

    input.addEventListener('input', (e) => {
      const query = e.target.value.trim().toLowerCase();
      if (query.length < 2) {
        container.style.display = 'none';
        return;
      }

      // Filter suggestions
      const suggestions = commonAddresses.filter(addr => 
        addr.toLowerCase().includes(query)
      );

      // Display suggestions
      container.innerHTML = '';
      if (suggestions.length > 0) {
        suggestions.forEach(suggestion => {
          const item = document.createElement('div');
          item.className = 'suggestion-item';
          item.textContent = suggestion;
          item.style.cssText = `
            padding: 8px 12px;
            cursor: pointer;
            border-bottom: 1px solid #eee;
          `;
          
          item.addEventListener('click', () => {
            input.value = suggestion;
            container.style.display = 'none';
          });
          
          container.appendChild(item);
        });
        container.style.display = 'block';
      } else {
        container.style.display = 'none';
      }
    });

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
      if (!container.contains(e.target) && e.target !== input) {
        container.style.display = 'none';
      }
    });
    
    console.log('ContactMapsAutocomplete: Fallback autocomplete setup complete');
  }

  // Method to get place data for a specific input
  getPlaceData(input) {
    const autocomplete = this.autocompleteInstances.get(input);
    if (autocomplete) {
      return autocomplete.getPlace();
    }
    return null;
  }

  // Method to clear autocomplete for a specific input
  clearAutocomplete(input) {
    const autocomplete = this.autocompleteInstances.get(input);
    if (autocomplete) {
      google.maps.event.clearInstanceListeners(autocomplete);
      this.autocompleteInstances.delete(input);
    }
  }
}

// Initialize when DOM is loaded (fallback)
document.addEventListener('DOMContentLoaded', function() {
  console.log('ContactMapsAutocomplete: DOM loaded, checking Google Maps API availability...');
  
  // Check if Google Maps API is already available
  if (typeof google !== 'undefined' && google.maps && google.maps.places) {
    console.log('ContactMapsAutocomplete: Google Maps API available, initializing...');
    window.contactMapsAutocomplete = new ContactMapsAutocomplete();
  } else {
    console.log('ContactMapsAutocomplete: Google Maps API not available yet, waiting for callback...');
    // The callback function will handle initialization when the API loads
  }
}); 