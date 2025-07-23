// Google Maps callback function - must be global
window.initContactMaps = function() {
  console.log('Google Maps API loaded successfully');
  
  // Initialize the modern contact maps autocomplete
  try {
    if (typeof ModernContactMapsAutocomplete !== 'undefined') {
      window.modernContactMapsAutocomplete = new ModernContactMapsAutocomplete();
    } else {
      console.log('ModernContactMapsAutocomplete class not available yet, waiting...');
      setTimeout(() => {
        if (typeof ModernContactMapsAutocomplete !== 'undefined') {
          window.modernContactMapsAutocomplete = new ModernContactMapsAutocomplete();
        }
      }, 100);
    }
  } catch (error) {
    console.warn('Error in Google Maps callback:', error);
  }
}; 