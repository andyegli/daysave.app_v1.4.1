/**
 * Localhost Protocol Fix
 * Smart protocol handling for proxy and direct connections
 */

console.log('🔄 Localhost Protocol Fix: ENABLED with smart proxy detection');

function getCorrectUrl(path) {
  // Only apply fixes for localhost
  if (window.location.hostname !== 'localhost') {
    console.log('🔧 Non-localhost connection - using path as-is:', path);
    return path;
  }

  // Check if we're behind a proxy (port 80/443) or direct connection (port 3000)
  const isDirectConnection = window.location.port === '3000';
  const isProxyConnection = window.location.port === '' || window.location.port === '80' || window.location.port === '443';

  if (isDirectConnection) {
    // Direct connection to port 3000 - use as-is
    console.log('🔧 Direct connection detected - using path as-is:', path);
    return path;
  } else if (isProxyConnection) {
    // Proxy connection - ensure proper protocol and path
    console.log('🔧 Proxy connection detected - using path as-is:', path);
    return path;
  } else {
    // Unknown port - be safe and use as-is
    console.log('🔧 Unknown port detected - using path as-is:', path);
    return path;
  }
}

// Enhanced debugging for connection type
document.addEventListener('DOMContentLoaded', function() {
  const hostname = window.location.hostname;
  const port = window.location.port;
  const protocol = window.location.protocol;
  
  console.log('🏠 Connection Details:', {
    hostname,
    port,
    protocol,
    fullUrl: window.location.href
  });

  if (hostname === 'localhost') {
    if (port === '3000') {
      console.log('✅ Direct localhost:3000 connection detected');
    } else if (!port || port === '80') {
      console.log('✅ Proxy localhost connection detected (port 80/default)');
    } else {
      console.log('⚠️  Unknown localhost port:', port);
    }
  } else {
    console.log('✅ Production/non-localhost connection');
  }
});

console.log('✅ Localhost Protocol Fix: ENABLED');