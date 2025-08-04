const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const { isAuthenticated } = require('../middleware/auth');
const { getGoogleMapsScriptUrl } = require('../config/maps');

// Get API key from environment
const getApiKey = () => {
  return process.env.GOOGLE_MAPS_KEY || process.env.GOOGLE_API_KEY;
};

// Serve Google Maps API script URL with callback
router.get('/script-url', (req, res) => {
  try {
    const { callback } = req.query;
    let scriptUrl = getGoogleMapsScriptUrl();
    
    if (callback) {
      scriptUrl += `&callback=${encodeURIComponent(callback)}`;
    }
    
    res.redirect(scriptUrl);
  } catch (error) {
    console.error('Error serving Google Maps script URL:', error);
    res.status(500).json({ error: 'Failed to generate script URL' });
  }
});

// Test the new Places API autocomplete functionality
router.post('/test-autocomplete', isAuthenticated, async (req, res) => {
  try {
    const apiKey = getApiKey();
    
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      return res.status(400).json({
        status: 'REQUEST_DENIED',
        error: 'API key not configured'
      });
    }

    const { input, sessionToken } = req.body;
    
    if (!input) {
      return res.status(400).json({
        status: 'INVALID_REQUEST',
        error: 'Input parameter required'
      });
    }

    // Use the new Places API autocomplete endpoint
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    // Return the response as-is from Google
    res.json(data);
    
  } catch (error) {
    console.error('Places API test error:', error);
    res.status(500).json({
      status: 'UNKNOWN_ERROR',
      error: 'Internal server error'
    });
  }
});

// Places API autocomplete endpoint
router.post('/autocomplete', isAuthenticated, async (req, res) => {
  try {
    const apiKey = getApiKey();
    
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      return res.status(400).json({
        status: 'REQUEST_DENIED',
        error: 'API key not configured'
      });
    }

    const { input, sessionToken } = req.body;
    
    if (!input || input.length < 2) {
      return res.status(400).json({
        status: 'INVALID_REQUEST',
        error: 'Input must be at least 2 characters'
      });
    }

    // Build the URL for the new Places API
    let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${apiKey}`;
    
    // Add session token for billing efficiency
    if (sessionToken) {
      url += `&sessiontoken=${encodeURIComponent(sessionToken)}`;
    }
    
    // Add types to focus on addresses
    url += '&types=address';
    
    // Add language preference if available
    if (req.headers['accept-language']) {
      const language = req.headers['accept-language'].split(',')[0].split('-')[0];
      url += `&language=${language}`;
    }

    console.log('Places API autocomplete request:', { input, sessionToken });
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Places API error:', data);
      return res.status(response.status).json(data);
    }
    
    console.log('Places API response status:', data.status, 'predictions:', data.predictions?.length || 0);
    
    // Return the response as-is from Google
    res.json(data);
    
  } catch (error) {
    console.error('Places API autocomplete error:', error);
    res.status(500).json({
      status: 'UNKNOWN_ERROR',
      error: 'Internal server error'
    });
  }
});

// Places API place details endpoint
router.post('/details', isAuthenticated, async (req, res) => {
  try {
    const apiKey = getApiKey();
    
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      return res.status(400).json({
        status: 'REQUEST_DENIED',
        error: 'API key not configured'
      });
    }

    const { placeId, sessionToken } = req.body;
    
    if (!placeId) {
      return res.status(400).json({
        status: 'INVALID_REQUEST',
        error: 'Place ID required'
      });
    }

    // Build the URL for the new Places API place details
    let url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&key=${apiKey}`;
    
    // Add session token for billing efficiency
    if (sessionToken) {
      url += `&sessiontoken=${encodeURIComponent(sessionToken)}`;
    }
    
    // Specify the fields we need
    url += '&fields=place_id,formatted_address,geometry,address_components,name';
    
    // Add language preference if available
    if (req.headers['accept-language']) {
      const language = req.headers['accept-language'].split(',')[0].split('-')[0];
      url += `&language=${language}`;
    }

    console.log('Places API details request:', { placeId, sessionToken });
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Places API details error:', data);
      return res.status(response.status).json(data);
    }
    
    console.log('Places API details response status:', data.status);
    
    // Return the response as-is from Google
    res.json(data);
    
  } catch (error) {
    console.error('Places API details error:', error);
    res.status(500).json({
      status: 'UNKNOWN_ERROR',
      error: 'Internal server error'
    });
  }
});

// Places API text search endpoint (for more general searches)
router.post('/textsearch', isAuthenticated, async (req, res) => {
  try {
    const apiKey = getApiKey();
    
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      return res.status(400).json({
        status: 'REQUEST_DENIED',
        error: 'API key not configured'
      });
    }

    const { query, sessionToken } = req.body;
    
    if (!query || query.length < 2) {
      return res.status(400).json({
        status: 'INVALID_REQUEST',
        error: 'Query must be at least 2 characters'
      });
    }

    // Build the URL for the new Places API text search
    let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
    
    // Add session token for billing efficiency
    if (sessionToken) {
      url += `&sessiontoken=${encodeURIComponent(sessionToken)}`;
    }
    
    // Add language preference if available
    if (req.headers['accept-language']) {
      const language = req.headers['accept-language'].split(',')[0].split('-')[0];
      url += `&language=${language}`;
    }

    console.log('Places API text search request:', { query, sessionToken });
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Places API text search error:', data);
      return res.status(response.status).json(data);
    }
    
    console.log('Places API text search response status:', data.status, 'results:', data.results?.length || 0);
    
    // Return the response as-is from Google
    res.json(data);
    
  } catch (error) {
    console.error('Places API text search error:', error);
    res.status(500).json({
      status: 'UNKNOWN_ERROR',
      error: 'Internal server error'
    });
  }
});

// Geocoding endpoint for map functionality
router.post('/geocode', isAuthenticated, async (req, res) => {
  try {
    const apiKey = getApiKey();
    
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      return res.status(400).json({
        status: 'REQUEST_DENIED',
        error: 'API key not configured'
      });
    }

    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({
        status: 'INVALID_REQUEST',
        error: 'Address parameter required'
      });
    }

    // Use Google Geocoding API
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    
    console.log('Places API geocoding request:', { address });
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Places API geocoding error:', data);
      return res.status(response.status).json(data);
    }
    
    console.log('Places API geocoding response status:', data.status, 'results:', data.results?.length || 0);
    
    // Return the response as-is from Google
    res.json(data);
    
  } catch (error) {
    console.error('Places API geocoding error:', error);
    res.status(500).json({
      status: 'UNKNOWN_ERROR',
      error: 'Internal server error'
    });
  }
});

// Note: Static map endpoint removed as we now use location verification interface instead

// Health check endpoint for Places API
router.get('/health', isAuthenticated, async (req, res) => {
  try {
    const apiKey = getApiKey();
    
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      return res.json({
        status: 'unhealthy',
        error: 'API key not configured',
        apiConfigured: false
      });
    }

    // Test with a simple geocoding request
    const testUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=New+York,NY&key=${apiKey}`;
    
    const response = await fetch(testUrl);
    const data = await response.json();
    
    const isHealthy = data.status === 'OK' && data.results && data.results.length > 0;
    
    res.json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      apiConfigured: true,
      geocodingWorking: isHealthy,
      lastChecked: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Places API health check error:', error);
    res.json({
      status: 'unhealthy',
      error: 'Health check failed',
      apiConfigured: !!getApiKey(),
      lastChecked: new Date().toISOString()
    });
  }
});

module.exports = router; 