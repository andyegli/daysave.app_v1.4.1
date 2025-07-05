// Google Maps Places Autocomplete integration for contact address fields
// This script robustly initializes autocomplete for both initial and dynamically added address fields.
// It uses multiple selector strategies to ensure all address inputs are found, regardless of naming or rendering order.

// Global callback for Google Maps API
window.initContactMaps = function() {
  setupContactMapsAutocomplete();
};

// Main initializer for address autocomplete
function setupContactMapsAutocomplete() {
  // Ensure Google Maps API is available
  if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
    return;
  }
  initializeAddressFields();
  // Re-initialize when a new address field is added
  const addAddressBtn = document.getElementById('add-address');
  if (addAddressBtn) {
    addAddressBtn.addEventListener('click', () => {
      setTimeout(() => {
        initializeAddressFields();
      }, 100);
    });
  }
}

// Finds all address input fields using robust selector logic and initializes autocomplete
function initializeAddressFields() {
  // Try the most specific selector first
  let addressInputs = document.querySelectorAll('input[name*="[addresses]"][name*="[value]"]');
  // If none found, try a more general selector
  if (addressInputs.length === 0) {
    addressInputs = document.querySelectorAll('input[name^="addresses"][name$="[value]"]');
  }
  // If still none found, use the most general filter
  if (addressInputs.length === 0) {
    addressInputs = Array.from(document.querySelectorAll('input')).filter(
      input => input.name && input.name.includes('addresses') && input.name.includes('[value]')
    );
  }
  // Initialize Google Maps Places Autocomplete for each address input
  addressInputs.forEach((input) => {
    if (input._placesAutocompleteInitialized) return;
    input._placesAutocompleteInitialized = true;
    setupPlacesAutocomplete(input);
  });
}

// Attaches Google Maps Places Autocomplete to a given input
function setupPlacesAutocomplete(input) {
  try {
    if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
      return;
    }
    const autocomplete = new google.maps.places.Autocomplete(input, {
      types: ['address'],
      componentRestrictions: { country: [] },
      fields: ['formatted_address', 'geometry', 'place_id', 'address_components']
    });
    // When a place is selected, update the input and store extra data
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.geometry) {
        input.value = place.formatted_address;
        input._placeId = place.place_id;
        input._latitude = place.geometry.location.lat();
        input._longitude = place.geometry.location.lng();
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    // Optionally, handle focus and keyboard navigation for UX
    input.addEventListener('focus', () => {
      if (input.value.length > 0) {
        google.maps.event.trigger(autocomplete, 'focus');
      }
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && autocomplete.getPlace()) {
        e.preventDefault();
      }
    });
  } catch (error) {
    // Fail silently in production, but could log to a remote logger if desired
  }
}

// Robust initialization: run on DOMContentLoaded, window load, and after a short delay
function robustInit() {
  setupContactMapsAutocomplete();
  setTimeout(setupContactMapsAutocomplete, 500);
}
document.addEventListener('DOMContentLoaded', function() {
  if (typeof google !== 'undefined' && google.maps && google.maps.places) {
    robustInit();
  }
});
window.addEventListener('load', function() {
  if (typeof google !== 'undefined' && google.maps && google.maps.places) {
    robustInit();
  }
});
// Expose for dynamic use
window.setupContactMapsAutocomplete = setupContactMapsAutocomplete;
window.initializeAddressFields = initializeAddressFields; 