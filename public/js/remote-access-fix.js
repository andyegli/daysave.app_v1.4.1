/**
 * Remote Access SSL Fix
 * Prevents SSL errors when accessing DaySave from remote machines via IP address
 */

(function() {
  'use strict';

  console.log('🌐 Remote Access SSL Fix: Initializing...');

  // Check if accessing via IP address (not localhost) or development HTTP access is enabled
  function isRemoteAccess() {
    const hostname = window.location.hostname;
    const isIP = hostname.match(/^\d+\.\d+\.\d+\.\d+$/);
    const isDevMode = document.querySelector('meta[name="x-dev-mode"]') || 
                     (typeof window.location !== 'undefined' && 
                      (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'));
    
    return isIP || (isDevMode && hostname !== 'localhost' && hostname !== '127.0.0.1');
  }

  // Force HTTP protocol for remote IP access in development
  function forceHttpForRemoteAccess() {
    if (window.location.protocol === 'https:' && isRemoteAccess()) {
      console.log('🔄 Remote Access: Redirecting from HTTPS to HTTP for IP access...');
      const httpUrl = window.location.href.replace('https://', 'http://');
      window.location.replace(httpUrl);
      return true;
    }
    return false;
  }

  // Fix any HTTPS URLs in the DOM for remote access
  function fixHttpsUrlsInDom() {
    if (!isRemoteAccess()) return;

    const hostname = window.location.hostname;
    const port = window.location.port || '3000';

    // Fix all HTTPS links and forms for current IP
    document.querySelectorAll(`a[href^="https://${hostname}"], form[action^="https://${hostname}"]`).forEach(element => {
      const isLink = element.tagName === 'A';
      const attr = isLink ? 'href' : 'action';
      const url = element.getAttribute(attr);
      
      if (url && url.includes('https://')) {
        const newUrl = url.replace('https://', 'http://');
        element.setAttribute(attr, newUrl);
        console.log(`🔄 Fixed ${isLink ? 'link' : 'form'}: ${url} → ${newUrl}`);
      }
    });

    // Fix image sources
    document.querySelectorAll(`img[src^="https://${hostname}"]`).forEach(img => {
      const src = img.getAttribute('src');
      if (src) {
        const newSrc = src.replace('https://', 'http://');
        img.setAttribute('src', newSrc);
        console.log(`🔄 Fixed image: ${src} → ${newSrc}`);
      }
    });
  }

  // Initialize on DOM load
  document.addEventListener('DOMContentLoaded', function() {
    if (isRemoteAccess()) {
      console.log(`🌐 Remote Access detected: ${window.location.hostname}`);
      
      // First, redirect if we're on HTTPS
      if (!forceHttpForRemoteAccess()) {
        // If we didn't redirect, fix any HTTPS URLs in the page
        fixHttpsUrlsInDom();
      }
    } else {
      console.log('🏠 Local access detected, SSL fixes not needed');
    }
  });

  // Also run immediately in case DOM is already loaded
  if (document.readyState === 'loading') {
    // DOM not ready, event listener will handle it
  } else {
    // DOM is ready
    if (isRemoteAccess() && !forceHttpForRemoteAccess()) {
      fixHttpsUrlsInDom();
    }
  }

})();