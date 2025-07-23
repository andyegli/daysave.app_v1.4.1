// Google Maps API Configuration
const getGoogleMapsConfig = () => {
  return {
    apiKey: process.env.GOOGLE_MAPS_KEY || process.env.GOOGLE_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY',
    libraries: ['places'],
    version: 'weekly'
  };
};

// Helper function to get the Google Maps script URL
const getGoogleMapsScriptUrl = () => {
  const config = getGoogleMapsConfig();
  return `https://maps.googleapis.com/maps/api/js?key=${config.apiKey}&libraries=${config.libraries.join(',')}&v=${config.version}`;
};

// Helper function to check if Google Maps API is configured
const isGoogleMapsConfigured = () => {
  const config = getGoogleMapsConfig();
  return config.apiKey && config.apiKey !== 'YOUR_GOOGLE_MAPS_API_KEY';
};

module.exports = {
  getGoogleMapsConfig,
  getGoogleMapsScriptUrl,
  isGoogleMapsConfigured
}; 