/**
 * Multi-Domain Protocol Fix
 * Smart protocol handling for localhost:3000, daysave.local, and daysave.app
 * Prevents redirect loops while ensuring proper protocol usage
 */

console.log('🔄 Multi-Domain Protocol Fix: Supporting localhost:3000, daysave.local, daysave.app');

// Flag to prevent redirect loops
let protocolFixApplied = false;

function getCorrectUrl(path) {
  const hostname = window.location.hostname;
  
  // Handle different domains appropriately
  if (hostname === 'localhost') {
    // For localhost, only fix if it's trying to use wrong protocol
    const isDirectConnection = window.location.port === '3000';
    if (isDirectConnection) {
      // Direct connection to port 3000 - ensure HTTP
      const correctedPath = path.replace('https://localhost', 'http://localhost');
      if (correctedPath !== path) {
        console.log('🔧 Direct localhost:3000 - corrected HTTPS to HTTP:', correctedPath);
      }
      return correctedPath;
    }
    // Proxy connection - leave as-is
    return path;
  } else if (hostname === 'daysave.local' || hostname === 'daysave.app') {
    // For production domains, ensure HTTPS
    if (path.includes(`http://${hostname}`)) {
      const correctedPath = path.replace(`http://${hostname}`, `https://${hostname}`);
      console.log(`🔧 ${hostname} - corrected HTTP to HTTPS:`, correctedPath);
      return correctedPath;
    }
    return path;
  } else {
    // Unknown domain - use as-is
    console.log('🔧 Unknown domain - using path as-is:', path);
    return path;
  }
}

// Smart protocol enforcement based on domain
function enforceCorrectProtocol() {
  if (protocolFixApplied) {
    return;
  }

  const hostname = window.location.hostname;
  const currentProtocol = window.location.protocol;
  const currentPort = window.location.port;
  
  // Handle localhost - allow both HTTP and HTTPS for testing
  if (hostname === 'localhost') {
    // Allow both HTTP and HTTPS on localhost:3000 for development flexibility
    // This supports both direct development (HTTP) and SSL testing (HTTPS)
    if (currentPort === '3000') {
      console.log(`✅ Localhost:3000 ${currentProtocol} connection - allowing current protocol for development`);
      return; // Don't redirect - allow both HTTP and HTTPS
    }
    // For localhost proxy connections (no port or port 80/443), allow both HTTP and HTTPS
    // Don't auto-redirect to prevent loops
    console.log('✅ Localhost proxy connection - allowing current protocol');
    return;
  }
  
  // Handle daysave.local - redirect HTTP to HTTPS
  if (hostname === 'daysave.local' && currentProtocol === 'http:') {
    protocolFixApplied = true;
    console.log('🔄 Redirecting HTTP→HTTPS for daysave.local');
    const newUrl = `https://daysave.local${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.replace(newUrl);
    return;
  }
  
  // Handle daysave.app - redirect HTTP to HTTPS
  if (hostname === 'daysave.app' && currentProtocol === 'http:') {
    protocolFixApplied = true;
    console.log('🔄 Redirecting HTTP→HTTPS for daysave.app');
    const newUrl = `https://daysave.app${window.location.pathname}${window.location.search}${window.location.hash}`;
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

  // Apply protocol enforcement for all domains
  enforceCorrectProtocol();
  
  if (hostname === 'localhost') {
    if (port === '3000') {
      console.log('✅ Direct localhost:3000 connection detected');
    } else if (!port || port === '80' || port === '443') {
      console.log('✅ Proxy localhost connection detected');
    } else {
      console.log('⚠️  Unknown localhost port:', port);
    }
  } else if (hostname === 'daysave.local') {
    console.log('✅ daysave.local domain detected');
  } else if (hostname === 'daysave.app') {
    console.log('✅ daysave.app production domain detected');
  } else {
    console.log('⚠️  Unknown hostname:', hostname);
  }
  
  // Fix any forms and links that might have wrong protocol
  fixFormsAndLinks();
});

// Apply protocol fix immediately if document is already loaded
if (document.readyState !== 'loading') {
  enforceCorrectProtocol();
}

// Fix forms and links to use correct protocol based on domain
function fixFormsAndLinks() {
  const hostname = window.location.hostname;
  const port = window.location.port;
  const protocol = window.location.protocol;
  
  console.log(`🔧 Fixing forms and links for ${hostname}`);
  
  // Determine what needs fixing based on domain
  if (hostname === 'localhost' && port === '3000') {
    // Direct localhost:3000 - fix any HTTPS references to HTTP
    fixProtocolInElements('https://localhost', 'http://localhost');
  } else if (hostname === 'daysave.local' || hostname === 'daysave.app') {
    // Production domains - fix any HTTP references to HTTPS
    fixProtocolInElements(`http://${hostname}`, `https://${hostname}`);
  }
  // For localhost proxy, don't fix anything to prevent loops
}

function fixProtocolInElements(fromProtocol, toProtocol) {
  // Fix forms
  document.querySelectorAll('form').forEach(form => {
    const action = form.getAttribute('action');
    if (action && action.includes(fromProtocol)) {
      const newAction = action.replace(fromProtocol, toProtocol);
      form.setAttribute('action', newAction);
      console.log(`🔧 Fixed form action: ${action} → ${newAction}`);
    }
  });
  
  // Fix links
  document.querySelectorAll('a').forEach(link => {
    const href = link.getAttribute('href');
    if (href && href.includes(fromProtocol)) {
      const newHref = href.replace(fromProtocol, toProtocol);
      link.setAttribute('href', newHref);
      console.log(`🔧 Fixed link href: ${href} → ${newHref}`);
    }
  });
}

console.log('✅ Multi-Domain Protocol Fix: ENABLED for localhost:3000, daysave.local, daysave.app');