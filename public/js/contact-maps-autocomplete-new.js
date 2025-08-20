// Modern Google Places API (New) implementation for contact address autocomplete
// Uses the new Places API REST endpoints instead of the deprecated JavaScript SDK
// Implements robust fallback for when API is unavailable or unauthorized

class NewGooglePlacesAutocomplete {
  constructor() {
    this.autocompleteInstances = new Map();
    this.apiAvailable = false;
    this.apiAuthorized = false;
    this.sessionToken = null;
    this.init();
  }

  init() {
    console.log('NewGooglePlacesAutocomplete: Initializing modern Places API...');
    
    // Generate session token for API efficiency
    this.generateSessionToken();
    
    // Test API availability
    this.testNewPlacesAPI().then((result) => {
      this.apiAvailable = result.available;
      this.apiAuthorized = result.authorized;
      
      if (this.apiAvailable && this.apiAuthorized) {
        console.log('NewGooglePlacesAutocomplete: New Places API available and authorized');
      } else {
        console.warn('NewGooglePlacesAutocomplete: New Places API not available, using fallback');
      }
      
      this.setupAddressAutocomplete();
    }).catch((error) => {
      console.warn('NewGooglePlacesAutocomplete: API test failed, using fallback:', error);
      this.apiAvailable = false;
      this.apiAuthorized = false;
      this.setupAddressAutocomplete();
    });
  }

  generateSessionToken() {
    // Generate a random session token for API efficiency
    this.sessionToken = 'session_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  async testNewPlacesAPI() {
    try {
      // First check if API is configured (public endpoint)
      const statusResponse = await fetch('/api/places/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!statusResponse.ok) {
        console.warn('NewGooglePlacesAutocomplete: Status check failed:', statusResponse.status);
        return { available: false, authorized: false };
      }

      const statusData = await statusResponse.json();
      
      if (statusData.status !== 'available') {
        console.warn('NewGooglePlacesAutocomplete: API not available:', statusData.error);
        return { available: false, authorized: false };
      }

      // API is configured, now test if we're authenticated
      const response = await fetch('/api/places/test-autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          input: 'New York',
          sessionToken: this.sessionToken
        })
      });

      if (response.ok) {
        const data = await response.json();
        return {
          available: true,
          authorized: data.status === 'OK' && data.predictions && data.predictions.length > 0
        };
      } else if (response.status === 401) {
        console.warn('NewGooglePlacesAutocomplete: Authentication required');
        return { available: true, authorized: false };
      } else {
        console.warn('NewGooglePlacesAutocomplete: API test failed:', response.status);
        return { available: false, authorized: false };
      }
    } catch (error) {
      console.warn('NewGooglePlacesAutocomplete: API test error:', error);
      return { available: false, authorized: false };
    }
  }

  setupAddressAutocomplete() {
    console.log('NewGooglePlacesAutocomplete: Setting up address autocomplete...');
    this.initializeAddressFields();
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

    console.log('NewGooglePlacesAutocomplete: Found', addressInputs.length, 'address inputs');
    
    addressInputs.forEach((input, index) => {
      if (input._newPlacesAutocompleteInitialized) {
        console.log('NewGooglePlacesAutocomplete: Input', index, 'already initialized');
        return;
      }
      input._newPlacesAutocompleteInitialized = true;
      console.log('NewGooglePlacesAutocomplete: Initializing input', index);
      
      if (this.apiAvailable && this.apiAuthorized) {
        this.setupNewPlacesAutocomplete(input);
      } else {
        console.log('NewGooglePlacesAutocomplete: Using fallback for input', index);
        this.setupFallbackForInput(input);
      }
    });
  }

  setupNewPlacesAutocomplete(input) {
    console.log('NewGooglePlacesAutocomplete: Setting up new Places API autocomplete');
    
    let debounceTimer;
    let currentSuggestionContainer;

    // Create suggestions container
    const container = this.createSuggestionsContainer(input);
    currentSuggestionContainer = container;

    input.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        const query = e.target.value.trim();
        if (query.length < 2) {
          container.style.display = 'none';
          return;
        }

        try {
          await this.fetchAndDisplaySuggestions(query, input, container);
        } catch (error) {
          console.warn('NewGooglePlacesAutocomplete: Error fetching suggestions:', error);
          // Fall back to local suggestions on error
          this.displayFallbackSuggestions(query, container, input);
        }
      }, 300); // 300ms debounce to avoid excessive API calls
    });

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
      if (!container.contains(e.target) && e.target !== input) {
        container.style.display = 'none';
      }
    });

    // Handle keyboard navigation
    this.setupKeyboardNavigation(input, container);
  }

  async fetchAndDisplaySuggestions(query, input, container) {
    try {
      const response = await fetch('/api/places/autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          input: query,
          sessionToken: this.sessionToken
        })
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      
      if (data.status === 'OK' && data.predictions && data.predictions.length > 0) {
        this.displayGoogleSuggestions(data.predictions, container, input);
      } else {
        // No Google suggestions, use fallback
        this.displayFallbackSuggestions(query, container, input);
      }
    } catch (error) {
      console.warn('NewGooglePlacesAutocomplete: Error fetching Google suggestions:', error);
      this.displayFallbackSuggestions(query, container, input);
    }
  }

  displayGoogleSuggestions(predictions, container, input) {
    container.innerHTML = '';
    
    predictions.slice(0, 5).forEach(prediction => {
      const item = document.createElement('div');
      item.className = 'suggestion-item google-suggestion';
      item.innerHTML = `
        <div class="suggestion-main">${prediction.structured_formatting.main_text}</div>
        <div class="suggestion-secondary">${prediction.structured_formatting.secondary_text || ''}</div>
      `;
      item.style.cssText = `
        padding: 10px 12px;
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
      
      item.addEventListener('click', async () => {
        await this.handleGooglePlaceSelection(prediction, input, container);
      });
      
      container.appendChild(item);
    });
    
    container.style.display = 'block';
  }

  async handleGooglePlaceSelection(prediction, input, container) {
    try {
      // Fetch place details using the new Place Details API
      const response = await fetch('/api/places/details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          placeId: prediction.place_id,
          sessionToken: this.sessionToken
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'OK' && data.result) {
          const place = data.result;
          
          // Set the formatted address
          input.value = place.formatted_address;
          
          // Store additional place data
          input._placeId = place.place_id;
          if (place.geometry && place.geometry.location) {
            input._latitude = place.geometry.location.lat;
            input._longitude = place.geometry.location.lng;
          }
          
          console.log('NewGooglePlacesAutocomplete: Place details loaded:', place.formatted_address);
          
          // Generate new session token for next search
          this.generateSessionToken();
        } else {
          // Fallback to prediction description
          input.value = prediction.description;
        }
      } else {
        // Fallback to prediction description
        input.value = prediction.description;
      }
      
      container.style.display = 'none';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      
    } catch (error) {
      console.warn('NewGooglePlacesAutocomplete: Error fetching place details:', error);
      // Fallback to prediction description
      input.value = prediction.description;
      container.style.display = 'none';
    }
  }

  displayFallbackSuggestions(query, container, input) {
    const commonAddresses = [
      '123 Main St, New York, NY, USA',
      '456 Queen St, Auckland, New Zealand',
      '789 Collins St, Melbourne, VIC, Australia',
      '321 Oxford St, London, UK',
      'Lambton Quay, Wellington, New Zealand',
      'George St, Sydney, NSW, Australia',
      'Bay St, Toronto, ON, Canada',
      'High St, Birmingham, UK',
      'Broadway, New York, NY, USA',
      'Church St, Christchurch, New Zealand',
      'Spring St, Melbourne, VIC, Australia',
      'King St, Sydney, NSW, Australia',
      'Queen St, Brisbane, QLD, Australia',
      'Smith St, Collingwood, VIC, Australia',
      'Park St, Sydney, NSW, Australia'
    ];

    const suggestions = commonAddresses.filter(addr => 
      addr.toLowerCase().includes(query.toLowerCase())
    );

    container.innerHTML = '';
    
    if (suggestions.length > 0) {
      // Add a header to indicate fallback mode
      const header = document.createElement('div');
      header.style.cssText = `
        padding: 8px 12px;
        background: #f8f9fa;
        border-bottom: 1px solid #dee2e6;
        font-size: 0.85rem;
        color: #6c757d;
        font-style: italic;
      `;
      header.textContent = '📍 Local address suggestions:';
      container.appendChild(header);
      
      suggestions.slice(0, 5).forEach(suggestion => {
        const item = document.createElement('div');
        item.className = 'suggestion-item fallback-suggestion';
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
  }

  createSuggestionsContainer(input) {
    const container = document.createElement('div');
    container.className = 'new-places-autocomplete-suggestions';
    container.style.cssText = `
      position: absolute;
      background: white;
      border: 1px solid #ddd;
      border-top: none;
      max-height: 250px;
      overflow-y: auto;
      z-index: 1000;
      width: 100%;
      display: none;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      border-radius: 0 0 4px 4px;
    `;
    
    // Position the container
    const inputGroup = input.closest('.input-group') || input.parentElement;
    if (inputGroup) {
      inputGroup.style.position = 'relative';
      inputGroup.appendChild(container);
    }

    return container;
  }

  setupKeyboardNavigation(input, container) {
    let selectedIndex = -1;
    
    input.addEventListener('keydown', (e) => {
      const items = container.querySelectorAll('.suggestion-item');
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
          this.updateSelection(items, selectedIndex);
          break;
          
        case 'ArrowUp':
          e.preventDefault();
          selectedIndex = Math.max(selectedIndex - 1, -1);
          this.updateSelection(items, selectedIndex);
          break;
          
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && items[selectedIndex]) {
            items[selectedIndex].click();
          }
          break;
          
        case 'Escape':
          container.style.display = 'none';
          selectedIndex = -1;
          break;
      }
    });
  }

  updateSelection(items, selectedIndex) {
    items.forEach((item, index) => {
      if (index === selectedIndex) {
        item.style.backgroundColor = '#007bff';
        item.style.color = 'white';
      } else {
        item.style.backgroundColor = 'white';
        item.style.color = 'black';
      }
    });
  }

  setupFallbackForInput(input) {
    console.log('NewGooglePlacesAutocomplete: Setting up fallback autocomplete for input');
    
    const container = this.createSuggestionsContainer(input);
    let debounceTimer;
    
    input.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const query = e.target.value.trim();
        if (query.length < 2) {
          container.style.display = 'none';
          return;
        }

        this.displayFallbackSuggestions(query, container, input);
      }, 200);
    });

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
      if (!container.contains(e.target) && e.target !== input) {
        container.style.display = 'none';
      }
    });

    this.setupKeyboardNavigation(input, container);
  }
}

// Initialize the new Places API autocomplete
window.initNewContactMaps = function() {
  console.log('New Google Places API initializing...');
  setTimeout(() => {
    try {
      window.newGooglePlacesAutocomplete = new NewGooglePlacesAutocomplete();
      console.log('New Google Places API autocomplete initialized successfully');
    } catch (error) {
      console.warn('Error initializing new Places API autocomplete:', error);
    }
  }, 100);
};

// Initialize when DOM is loaded (fallback)
document.addEventListener('DOMContentLoaded', function() {
  console.log('NewGooglePlacesAutocomplete: DOM loaded');
  
  // Initialize immediately since we don't need to wait for Google Maps SDK
  setTimeout(() => {
    if (!window.newGooglePlacesAutocomplete) {
      console.log('NewGooglePlacesAutocomplete: Initializing fallback mode');
      window.newGooglePlacesAutocomplete = new NewGooglePlacesAutocomplete();
    }
  }, 500);
}); 