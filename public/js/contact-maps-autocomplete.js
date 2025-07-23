// Modern Google Maps Places Autocomplete integration for contact address fields
// Uses PlaceAutocompleteElement (recommended) instead of deprecated Autocomplete
// Implements robust fallback for when Google Maps API is unavailable

class ModernContactMapsAutocomplete {
  constructor() {
    this.autocompleteInstances = new Map();
    this.fallbackEnabled = true;
    this.init();
  }

  init() {
    console.log('ModernContactMapsAutocomplete: Initializing...');
    
    // Check if Google Maps API is available
    if (typeof google !== 'undefined' && google.maps && google.maps.places) {
      console.log('ModernContactMapsAutocomplete: Google Maps API available');
      this.setupAddressAutocomplete();
    } else {
      console.log('ModernContactMapsAutocomplete: Google Maps API not available, setting up fallback');
      this.setupFallbackAutocomplete();
    }
  }

  setupAddressAutocomplete() {
    console.log('ModernContactMapsAutocomplete: Setting up address autocomplete...');
    
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
    // Multiple selector strategies to find address inputs
    let addressInputs = document.querySelectorAll('input[name*="[addresses]"][name*="[value]"]');
    
    if (addressInputs.length === 0) {
      addressInputs = document.querySelectorAll('input[name^="addresses"][name$="[value]"]');
    }
    
    if (addressInputs.length === 0) {
      addressInputs = Array.from(document.querySelectorAll('input')).filter(
        input => input.name && input.name.includes('addresses') && input.name.includes('[value]')
      );
    }

    console.log('ModernContactMapsAutocomplete: Found', addressInputs.length, 'address inputs');
    
    addressInputs.forEach((input, index) => {
      if (input._placesAutocompleteInitialized) {
        console.log('ModernContactMapsAutocomplete: Input', index, 'already initialized');
        return;
      }
      input._placesAutocompleteInitialized = true;
      console.log('ModernContactMapsAutocomplete: Initializing input', index);
      
      if (typeof google !== 'undefined' && google.maps && google.maps.places) {
        this.setupModernPlacesAutocomplete(input);
      } else {
        this.setupFallbackForInput(input);
      }
    });
  }

  setupModernPlacesAutocomplete(input) {
    try {
      console.log('ModernContactMapsAutocomplete: Setting up modern Places autocomplete');
      
      // Check if PlaceAutocompleteElement is available (recommended new approach)
      if (google.maps.places.PlaceAutocompleteElement) {
        this.setupPlaceAutocompleteElement(input);
      } else {
        // Fallback to traditional Autocomplete with deprecation handling
        this.setupTraditionalAutocomplete(input);
      }
    } catch (error) {
      console.warn('ModernContactMapsAutocomplete: Error setting up Google Places, using fallback:', error);
      this.setupFallbackForInput(input);
    }
  }

  setupPlaceAutocompleteElement(input) {
    try {
      // Modern approach using PlaceAutocompleteElement
      const autocompleteElement = new google.maps.places.PlaceAutocompleteElement({
        componentRestrictions: { country: [] }, // Allow all countries
        fields: ['formatted_address', 'geometry', 'place_id', 'address_components'],
        types: ['address']
      });

      // Style the autocomplete element to match our input
      autocompleteElement.style.width = '100%';
      autocompleteElement.style.height = input.offsetHeight + 'px';
      autocompleteElement.style.border = 'none';
      autocompleteElement.style.outline = 'none';
      
      // Replace the input with the autocomplete element
      input.parentNode.insertBefore(autocompleteElement, input);
      input.style.display = 'none';
      
      // Set initial value
      if (input.value) {
        autocompleteElement.value = input.value;
      }

      // Handle place selection
      autocompleteElement.addEventListener('place_changed', () => {
        const place = autocompleteElement.place;
        if (place && place.geometry) {
          // Update the hidden input
          input.value = place.formatted_address;
          
          // Store additional place data
          input._placeId = place.place_id;
          input._latitude = place.geometry.location.lat();
          input._longitude = place.geometry.location.lng();
          
          console.log('ModernContactMapsAutocomplete: Place selected:', place.formatted_address);
          
          // Trigger change events
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      // Store the instance
      this.autocompleteInstances.set(input, autocompleteElement);
      
      console.log('ModernContactMapsAutocomplete: PlaceAutocompleteElement initialized successfully');
      
    } catch (error) {
      console.warn('ModernContactMapsAutocomplete: Error with PlaceAutocompleteElement, trying traditional:', error);
      this.setupTraditionalAutocomplete(input);
    }
  }

  setupTraditionalAutocomplete(input) {
    try {
      console.log('ModernContactMapsAutocomplete: Setting up traditional autocomplete (deprecated)');
      
      const autocomplete = new google.maps.places.Autocomplete(input, {
        types: ['address'],
        componentRestrictions: { country: [] },
        fields: ['formatted_address', 'geometry', 'place_id', 'address_components']
      });

      // Handle place selection
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry) {
          input.value = place.formatted_address;
          input._placeId = place.place_id;
          input._latitude = place.geometry.location.lat();
          input._longitude = place.geometry.location.lng();
          
          console.log('ModernContactMapsAutocomplete: Traditional place selected:', place.formatted_address);
          
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      // Store the instance
      this.autocompleteInstances.set(input, autocomplete);
      
      console.log('ModernContactMapsAutocomplete: Traditional autocomplete initialized successfully');
      
    } catch (error) {
      console.warn('ModernContactMapsAutocomplete: Error with traditional autocomplete, using fallback:', error);
      this.setupFallbackForInput(input);
    }
  }

  setupFallbackAutocomplete() {
    console.log('ModernContactMapsAutocomplete: Setting up fallback autocomplete for all inputs');
    
    // Setup existing address fields
    this.initializeFallbackFields();

    // Setup dynamically added address fields
    const addAddressBtn = document.getElementById('add-address');
    if (addAddressBtn) {
      addAddressBtn.addEventListener('click', () => {
        setTimeout(() => {
          this.initializeFallbackFields();
        }, 100);
      });
    }
  }

  initializeFallbackFields() {
    const addressInputs = document.querySelectorAll('input[name*="[addresses]"][name*="[value]"]');
    
    addressInputs.forEach((input) => {
      if (!input._fallbackAutocompleteInitialized) {
        input._fallbackAutocompleteInitialized = true;
        this.setupFallbackForInput(input);
      }
    });
  }

  setupFallbackForInput(input) {
    console.log('ModernContactMapsAutocomplete: Setting up fallback autocomplete for input');
    
    // Create suggestion container
    const container = document.createElement('div');
    container.className = 'address-autocomplete-suggestions';
    container.style.cssText = `
      position: absolute;
      background: white;
      border: 1px solid #ddd;
      border-top: none;
      max-height: 200px;
      overflow-y: auto;
      z-index: 1000;
      width: 100%;
      display: none;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      border-radius: 0 0 4px 4px;
    `;
    
    // Position the container
    const inputGroup = input.closest('.input-group');
    if (inputGroup) {
      inputGroup.style.position = 'relative';
      inputGroup.appendChild(container);
    } else {
      input.parentElement.style.position = 'relative';
      input.parentElement.appendChild(container);
    }

    // Common address suggestions for fallback
    const commonAddresses = [
      '123 Main Street, New York, NY 10001, USA',
      '456 Oak Avenue, Los Angeles, CA 90210, USA',
      '789 Pine Road, Chicago, IL 60601, USA',
      '321 Elm Street, Houston, TX 77001, USA',
      '654 Maple Drive, Phoenix, AZ 85001, USA',
      '987 Cedar Lane, Philadelphia, PA 19101, USA',
      '147 Birch Boulevard, San Antonio, TX 78201, USA',
      '258 Walnut Way, San Diego, CA 92101, USA',
      '369 Cherry Court, Dallas, TX 75201, USA',
      '741 Spruce Street, San Jose, CA 95101, USA'
    ];

    let debounceTimer;
    
    input.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
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
              transition: background-color 0.2s;
            `;
            
            item.addEventListener('mouseenter', () => {
              item.style.backgroundColor = '#f8f9fa';
            });
            
            item.addEventListener('mouseleave', () => {
              item.style.backgroundColor = 'white';
            });
            
            item.addEventListener('click', () => {
              input.value = suggestion;
              container.style.display = 'none';
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
            });
            
            container.appendChild(item);
          });
          container.style.display = 'block';
        } else {
          container.style.display = 'none';
        }
      }, 300);
    });

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
      if (!container.contains(e.target) && e.target !== input) {
        container.style.display = 'none';
      }
    });
    
    console.log('ModernContactMapsAutocomplete: Fallback autocomplete setup complete');
  }

  // Cleanup method
  destroy() {
    this.autocompleteInstances.forEach((instance, input) => {
      try {
        if (instance.removeListener) {
          // Traditional autocomplete cleanup
          google.maps.event.clearInstanceListeners(instance);
        } else if (instance.remove) {
          // PlaceAutocompleteElement cleanup
          instance.remove();
          // Show the original input
          input.style.display = '';
        }
      } catch (error) {
        console.warn('Error cleaning up autocomplete instance:', error);
      }
    });
    this.autocompleteInstances.clear();
  }
}

// Global callback for Google Maps API
window.initContactMaps = function() {
  console.log('Google Maps API loaded, initializing contact autocomplete...');
  
  // Wait for the class to be available
  setTimeout(() => {
    try {
      window.modernContactMapsAutocomplete = new ModernContactMapsAutocomplete();
    } catch (error) {
      console.warn('Error initializing contact maps autocomplete:', error);
    }
  }, 100);
};

// Initialize when DOM is loaded (fallback if Google Maps fails)
document.addEventListener('DOMContentLoaded', function() {
  console.log('ModernContactMapsAutocomplete: DOM loaded');
  
  // If Google Maps API is not available, setup fallback
  setTimeout(() => {
    if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
      console.log('ModernContactMapsAutocomplete: Google Maps API not available, using fallback');
      window.modernContactMapsAutocomplete = new ModernContactMapsAutocomplete();
    }
  }, 2000); // Wait 2 seconds for Google Maps to load
}); 