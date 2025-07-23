const StartupValidator = require('../services/startupValidation');

async function checkAPIPermissions() {
  console.log('\n🔍 Checking Google API Permissions...\n');
  
  // Show current API keys
  console.log('=== API KEYS ===');
  console.log('GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? 
    process.env.GOOGLE_API_KEY.substring(0, 20) + '...' + process.env.GOOGLE_API_KEY.slice(-4) : 
    '❌ Not set');
  console.log('GOOGLE_MAPS_KEY:', process.env.GOOGLE_MAPS_KEY ? 
    process.env.GOOGLE_MAPS_KEY.substring(0, 20) + '...' + process.env.GOOGLE_MAPS_KEY.slice(-4) : 
    '❌ Not set');
  
  // Test Places API specifically first
  console.log('\n=== TESTING PLACES API ===');
  await testPlacesAPI();
  
  try {
    console.log('\n=== RUNNING GOOGLE SERVICES VALIDATION ===');
    const validator = new StartupValidator();
    
    // Test Google Maps
    const mapsResult = await validator.validateGoogleMaps();
    const mapsStatus = mapsResult.status === 'success' ? '✅' : '❌';
    console.log(`${mapsStatus} Google Maps API: ${mapsResult.message}`);
    
    // Test Google Cloud Services
    const cloudResult = await validator.validateGoogleCloudServices();
    console.log('\n=== GOOGLE CLOUD SERVICES ===');
    
    if (cloudResult.speechToText) {
      const status = cloudResult.speechToText.status === 'success' ? '✅' : '❌';
      console.log(`${status} Speech-to-Text: ${cloudResult.speechToText.message}`);
    }
    
    if (cloudResult.vision) {
      const status = cloudResult.vision.status === 'success' ? '✅' : '❌';
      console.log(`${status} Vision API: ${cloudResult.vision.message}`);
    }
    
    if (cloudResult.storage) {
      const status = cloudResult.storage.status === 'success' ? '✅' : '❌';
      console.log(`${status} Cloud Storage: ${cloudResult.storage.message}`);
    }
    
  } catch (error) {
    console.error('❌ Error running validation:', error.message);
  }
  
  // Show recommendations
  console.log('\n=== RECOMMENDATIONS ===');
  console.log('🔧 To fix Places API:');
  console.log('   1. Go to: https://console.cloud.google.com/apis/library');
  console.log('   2. Search: "Places API"');
  console.log('   3. Click "Places API" and then "Enable"');
  console.log('   4. Refresh your contact form');
}

async function testPlacesAPI() {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_MAPS_KEY;
  if (!apiKey) {
    console.log('❌ No API key available for Places API test');
    return;
  }
  
  try {
    // Use a simple HTTP library that should be available
    const https = require('https');
    const url = require('url');
    
    const testUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=Museum&inputtype=textquery&fields=place_id,name&key=${apiKey}`;
    console.log('Testing Places API with key:', apiKey.substring(0, 20) + '...');
    
    const data = await new Promise((resolve, reject) => {
      const urlObj = url.parse(testUrl);
      const req = https.request(urlObj, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.end();
    });
    
    if (data.status === 'OK') {
      console.log('✅ Places API: Working correctly');
      console.log('   Found places:', data.candidates?.length || 0);
    } else if (data.status === 'REQUEST_DENIED') {
      console.log('❌ Places API: REQUEST_DENIED');
      console.log('   Error:', data.error_message || 'API key not authorized for Places API');
      console.log('   🔧 SOLUTION: Enable Places API in Google Cloud Console');
    } else if (data.status === 'INVALID_REQUEST') {
      console.log('⚠️  Places API: Key works but request invalid (API is enabled)');
    } else {
      console.log('⚠️  Places API: Status:', data.status);
      console.log('   Error:', data.error_message || 'Unknown error');
    }
  } catch (error) {
    console.log('❌ Places API test failed:', error.message);
  }
}

// Run the check
checkAPIPermissions().then(() => {
  console.log('\n✅ Permission check complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Permission check failed:', error);
  process.exit(1);
}); 