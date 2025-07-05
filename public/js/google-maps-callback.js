// Google Maps callback function - must be global
window.initContactMaps = function() {
  console.log('Google Maps API loaded successfully');
  
  // Wait for ContactMapsAutocomplete class to be available
  const waitForClass = () => {
    try {
      if (typeof ContactMapsAutocomplete !== 'undefined') {
        if (window.contactMapsAutocomplete) {
          window.contactMapsAutocomplete.setupAddressAutocomplete();
        } else {
          console.log('ContactMapsAutocomplete not initialized yet, creating new instance');
          window.contactMapsAutocomplete = new ContactMapsAutocomplete();
        }
      } else {
        console.log('ContactMapsAutocomplete class not available yet, waiting...');
        setTimeout(waitForClass, 100);
      }
    } catch (error) {
      console.warn('Error in Google Maps callback:', error);
      // Try again after a short delay
      setTimeout(waitForClass, 100);
    }
  };
  
  // Start waiting for the class
  setTimeout(waitForClass, 100);
}; 