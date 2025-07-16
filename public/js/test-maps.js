// Global callback function for Google Maps API
window.initTestMaps = function() {
  console.log('TestMaps: Google Maps API callback triggered');
  testGoogleMapsAPI();
};

// Test Google Maps API functionality
document.addEventListener('DOMContentLoaded', function() {
  // Capture console logs
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  
  const logsDiv = document.getElementById('console-logs');
  
  function addLog(type, message) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.innerHTML = `<span style="color: #666;">[${timestamp}]</span> <span style="color: ${type === 'error' ? 'red' : type === 'warn' ? 'orange' : 'blue'};">[${type.toUpperCase()}]</span> ${message}`;
    logsDiv.appendChild(logEntry);
    logsDiv.scrollTop = logsDiv.scrollHeight;
  }
  
  console.log = function(...args) {
    originalLog.apply(console, args);
    addLog('log', args.join(' '));
  };
  
  console.error = function(...args) {
    originalError.apply(console, args);
    addLog('error', args.join(' '));
  };
  
  console.warn = function(...args) {
    originalWarn.apply(console, args);
    addLog('warn', args.join(' '));
  };
  
  // Test Google Maps API
  function testGoogleMapsAPI() {
    const apiStatus = document.getElementById('api-status');
    const apiKeyStatus = document.getElementById('api-key-status');
    
    // Check if Google Maps API is loaded
    if (typeof google !== 'undefined' && google.maps && google.maps.places) {
      apiStatus.innerHTML = '<span style="color: green;">✅ Available</span>';
      console.log('Google Maps API is available');
      
      // Test autocomplete
      const testInput = document.getElementById('test-address');
      try {
        const autocomplete = new google.maps.places.Autocomplete(testInput, {
          types: ['address']
        });
        console.log('Autocomplete created successfully');
        
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          console.log('Place selected:', place);
        });
      } catch (error) {
        console.error('Error creating autocomplete:', error);
      }
    } else {
      apiStatus.innerHTML = '<span style="color: red;">❌ Not Available</span>';
      console.error('Google Maps API is not available');
    }
    
    // Check API key
    const scriptUrl = document.getElementById('script-url').textContent;
    if (scriptUrl.includes('YOUR_GOOGLE_MAPS_API_KEY')) {
      apiKeyStatus.innerHTML = '<span style="color: red;">❌ Not Configured</span>';
      console.error('Google Maps API key not configured');
    } else if (scriptUrl.includes('key=')) {
      apiKeyStatus.innerHTML = '<span style="color: green;">✅ Configured</span>';
      console.log('Google Maps API key appears to be configured');
    } else {
      apiKeyStatus.innerHTML = '<span style="color: orange;">⚠️ Unknown</span>';
      console.warn('Could not determine API key status');
    }
  }
  
  // Run test when page loads (fallback)
  window.addEventListener('load', () => {
    setTimeout(testGoogleMapsAPI, 1000); // Wait a bit for script to load
  });
  
  // Also test immediately if already loaded
  if (document.readyState === 'complete') {
    setTimeout(testGoogleMapsAPI, 1000);
  }
}); 