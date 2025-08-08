/**
 * Localhost Protocol Fix
 * Smart protocol handling for proxy and direct connections
 * ENHANCED VERSION - Prevents redirect loops and ensures proper protocol handling
 */

console.log('🔄 Localhost Protocol Fix: ENHANCED VERSION with redirect loop prevention');

// Flag to prevent redirect loops
let protocolFixApplied = false;

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
    // Direct connection to port 3000 - use as-is but ensure http
    const correctedPath = path.replace('https://localhost', 'http://localhost');
    if (correctedPath !== path) {
      console.log('🔧 Direct connection - corrected HTTPS to HTTP:', correctedPath);
    }
    return correctedPath;
  } else if (isProxyConnection) {
    // Proxy connection - keep HTTPS for proxy
    console.log('🔧 Proxy connection detected - using path as-is:', path);
    return path;
  } else {
    // Unknown port - be safe and use as-is
    console.log('🔧 Unknown port detected - using path as-is:', path);
    return path;
  }
}

// Enhanced protocol enforcement for localhost
function enforceCorrectProtocol() {
  if (protocolFixApplied || window.location.hostname !== 'localhost') {
    return;
  }

  const currentProtocol = window.location.protocol;
  const currentPort = window.location.port;
  
  // Direct connection to port 3000 should use HTTP
  if (currentPort === '3000' && currentProtocol === 'https:') {
    protocolFixApplied = true;
    console.log('🔄 Redirecting from HTTPS to HTTP for direct localhost:3000 connection');
    const newUrl = `http://localhost:3000${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.replace(newUrl);
    return;
  }
  
  // Proxy connection (port 80/443 or no port) should use HTTPS
  if ((currentPort === '' || currentPort === '80' || currentPort === '443') && currentProtocol === 'http:') {
    protocolFixApplied = true;
    console.log('🔄 Redirecting from HTTP to HTTPS for proxy localhost connection');
    const newUrl = `https://localhost${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.replace(newUrl);
    return;
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
    // Apply protocol enforcement before anything else
    enforceCorrectProtocol();
    
    if (port === '3000') {
      console.log('✅ Direct localhost:3000 connection detected');
    } else if (!port || port === '80') {
      console.log('✅ Proxy localhost connection detected (port 80/default)');
    } else {
      console.log('⚠️  Unknown localhost port:', port);
    }
    
    // Fix any forms that might have wrong protocol
    fixFormsAndLinks();
  } else {
    console.log('✅ Production/non-localhost connection');
  }
});

// Apply protocol fix immediately if document is already loaded
if (document.readyState !== 'loading') {
  const hostname = window.location.hostname;
  if (hostname === 'localhost') {
    enforceCorrectProtocol();
  }
}

// Fix forms and links to use correct protocol
function fixFormsAndLinks() {
  const hostname = window.location.hostname;
  const port = window.location.port;
  
  if (hostname !== 'localhost') return;
  
  // Determine correct protocol based on port
  const shouldUseHttps = port === '' || port === '80' || port === '443';
  const correctProtocol = shouldUseHttps ? 'https:' : 'http:';
  const incorrectProtocol = shouldUseHttps ? 'http:' : 'https:';
  
  console.log(`🔧 Fixing forms and links - using ${correctProtocol}`);
  
  // Fix forms
  document.querySelectorAll('form').forEach(form => {
    const action = form.getAttribute('action');
    if (action && action.includes(`${incorrectProtocol}//localhost`)) {
      const newAction = action.replace(`${incorrectProtocol}//localhost`, `${correctProtocol}//localhost`);
      form.setAttribute('action', newAction);
      console.log(`🔧 Fixed form action: ${action} → ${newAction}`);
    }
  });
  
  // Fix links
  document.querySelectorAll('a').forEach(link => {
    const href = link.getAttribute('href');
    if (href && href.includes(`${incorrectProtocol}//localhost`)) {
      const newHref = href.replace(`${incorrectProtocol}//localhost`, `${correctProtocol}//localhost`);
      link.setAttribute('href', newHref);
      console.log(`🔧 Fixed link href: ${href} → ${newHref}`);
    }
  });
}

console.log('✅ Localhost Protocol Fix: ENHANCED VERSION ENABLED');