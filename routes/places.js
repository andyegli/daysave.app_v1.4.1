const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const { isAuthenticated } = require('../middleware/auth');

// Get API key from environment
const getApiKey = () => {
  return process.env.GOOGLE_MAPS_KEY || process.env.GOOGLE_API_KEY;
};

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

// Static map endpoint (serves as a proxy to hide API key)
router.get('/static-map', isAuthenticated, async (req, res) => {
  try {
    const apiKey = getApiKey();
    
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      return res.status(400).send('API key not configured');
    }

    const { lat, lng, address } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).send('Latitude and longitude required');
    }

    // Build Google Static Maps URL
    const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';
    const params = new URLSearchParams({
      center: `${lat},${lng}`,
      zoom: '15',
      size: '600x400',
      maptype: 'roadmap',
      markers: `color:red|${lat},${lng}`,
      key: apiKey
    });

    const staticMapUrl = `${baseUrl}?${params.toString()}`;
    
    console.log('Static map request:', { lat, lng, address });
    
    // Fetch the map image and send it back
    const response = await fetch(staticMapUrl);
    
    if (!response.ok) {
      console.error('Google Static Maps API error:', response.status, response.statusText);
      throw new Error(`Static Maps API returned ${response.status}: ${response.statusText}`);
    }
    
    // Get the image as buffer (node-fetch v2 compatible)
    const imageBuffer = await response.buffer();
    
    // Set appropriate headers
    res.set({
      'Content-Type': response.headers.get('content-type') || 'image/png',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'Content-Length': imageBuffer.length
    });
    
    // Send the image buffer
    res.send(imageBuffer);
    
  } catch (error) {
    console.error('Static map error:', error);
    
    // Send a placeholder image or error message
    res.status(500).send(`
      <svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f8f9fa"/>
        <text x="50%" y="50%" text-anchor="middle" fill="#6c757d" font-family="Arial" font-size="16">
          Map unavailable
        </text>
      </svg>
    `);
  }
});

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