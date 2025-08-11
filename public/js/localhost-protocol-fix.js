/**
 * Multi-Domain Protocol Fix
 * Smart protocol handling for localhost (any port), daysave.local, and daysave.app
 * Prevents redirect loops while ensuring proper protocol usage and port consistency
 */

console.log('🔄 Multi-Domain Protocol Fix: Supporting localhost (all ports), daysave.local, daysave.app');

// Flag to prevent redirect loops
let protocolFixApplied = false;

/**
 * Normalize localhost URLs to maintain port consistency
 * 
 * PROBLEM SOLVED: OAuth callbacks and internal redirects were causing port inconsistencies
 * where users would start on localhost but end up on localhost:3000 or vice versa.
 * 
 * SOLUTION: This function ensures that all localhost URLs maintain the same port
 * as the current page, preventing jarring URL changes during navigation.
 * 
 * EXAMPLES:
 * - Current page: localhost:3000 → All URLs get port 3000
 * - Current page: localhost → All URLs have no port
 * - Current page: localhost:80 → All URLs have no port (80 is default)
 * 
 * @param {string} url - URL to normalize
 * @returns {string} - Normalized URL with consistent port
 */
function normalizeLocalhostUrl(url) {
  if (!url || typeof url !== 'string') return url;
  
  const currentPort = window.location.port;
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost') {
    // If we're on localhost with a specific port, ensure consistency
    if (currentPort && currentPort !== '80' && currentPort !== '443') {
      // We have a specific port (like 3000), ensure it's maintained in all URLs
      const portInUrl = url.match(/localhost:(\d+)/);
      if (!portInUrl && url.includes('localhost')) {
        // URL has localhost but no port, add current port
        const correctedUrl = url.replace('localhost', `localhost:${currentPort}`);
        console.log('🔧 Added missing port to localhost URL:', url, '→', correctedUrl);
        return correctedUrl;
      } else if (portInUrl && portInUrl[1] !== currentPort) {
        // URL has different port, correct it to current port
        const correctedUrl = url.replace(`localhost:${portInUrl[1]}`, `localhost:${currentPort}`);
        console.log('🔧 Corrected port in localhost URL:', url, '→', correctedUrl);
        return correctedUrl;
      }
    } else if (!currentPort || currentPort === '80') {
      // We're on port 80 or no port, remove any port from URLs
      const correctedUrl = url.replace(/localhost:\d+/g, 'localhost');
      if (correctedUrl !== url) {
        console.log('🔧 Removed port from localhost URL:', url, '→', correctedUrl);
      }
      return correctedUrl;
    }
  }
  
  return url;
}

function getCorrectUrl(path) {
  const hostname = window.location.hostname;
  
  // Handle different domains appropriately
  if (hostname === 'localhost') {
    // First normalize the port
    let normalizedPath = normalizeLocalhostUrl(path);
    
    // Then handle protocol
    const currentPort = window.location.port;
    const isHttpsPort = currentPort === '443';
    
    if (isHttpsPort) {
      // Port 443 should use HTTPS
      normalizedPath = normalizedPath.replace('http://localhost', 'https://localhost');
    } else {
      // All other ports (including 3000, 80, or no port) should use HTTP
      const correctedPath = normalizedPath.replace('https://localhost', 'http://localhost');
      if (correctedPath !== normalizedPath) {
        console.log('🔧 Localhost - corrected HTTPS to HTTP:', normalizedPath, '→', correctedPath);
      }
      normalizedPath = correctedPath;
    }
    
    return normalizedPath;
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

/**
 * Global safe redirect function with port consistency
 * 
 * PURPOSE: Provides a centralized way to redirect that maintains URL consistency
 * and prevents the localhost/localhost:3000 switching problem.
 * 
 * USAGE: Replace direct window.location.href assignments with window.safeRedirect(url)
 * 
 * FEATURES:
 * - Maintains current port for localhost URLs
 * - Applies protocol fixes (HTTP/HTTPS)
 * - Prevents redirect loops
 * - Logs all redirects for debugging
 * 
 * @param {string} url - URL to redirect to
 */
window.safeRedirect = function(url) {
  if (window.location.hostname === 'localhost') {
    const currentPort = window.location.port;
    if (currentPort && currentPort !== '80' && currentPort !== '443') {
      // Ensure port is maintained in localhost URLs
      if (url.includes('localhost') && !url.includes(':')) {
        url = url.replace('localhost', `localhost:${currentPort}`);
        console.log('🔧 Added port to redirect URL:', url);
      }
    }
  }
  
  const correctedUrl = getCorrectUrl(url);
  console.log('🔄 Safe redirect to:', correctedUrl);
  window.location.href = correctedUrl;
};

console.log('✅ Multi-Domain Protocol Fix: ENABLED for localhost (all ports), daysave.local, daysave.app');