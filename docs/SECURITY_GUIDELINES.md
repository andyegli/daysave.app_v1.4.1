# Security Guidelines for DaySave

## Overview
This document outlines security best practices and guidelines to prevent common security issues in the DaySave application, particularly CSP violations and SSL protocol errors.

## Content Security Policy (CSP) Compliance

### What is CSP?
Content Security Policy is a security feature that helps prevent XSS attacks by controlling which resources can be loaded and executed on a web page.

### Rules for CSP Compliance

#### ❌ AVOID These Patterns:
```html
<!-- NEVER: Inline scripts -->
<script>
  console.log('This violates CSP');
</script>

<!-- NEVER: Inline event handlers -->
<button onclick="doSomething()">Click me</button>
<img onerror="handleError()" src="image.jpg">
<select onchange="this.form.submit()">

<!-- NEVER: Inline styles with JavaScript -->
<div style="display: none;" onclick="toggle()">
```

#### ✅ USE These Patterns Instead:
```html
<!-- ALWAYS: External script files -->
<script src="/js/my-script.js?v=<%= Date.now() %>"></script>

<!-- ALWAYS: Data attributes for configuration -->
<button data-action="delete" data-id="123">Delete</button>
<img data-fallback="true" src="image.jpg">

<!-- ALWAYS: External event handling -->
```

```javascript
// In external JS file
document.addEventListener('DOMContentLoaded', function() {
  // Handle button clicks
  document.querySelectorAll('button[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', function() {
      const id = this.getAttribute('data-id');
      deleteItem(id);
    });
  });
  
  // Handle image errors
  document.querySelectorAll('img[data-fallback="true"]').forEach(img => {
    img.addEventListener('error', function() {
      showFallbackIcon(this);
    });
  });
  
  // Handle form auto-submission
  document.querySelectorAll('select[data-auto-submit="true"]').forEach(select => {
    select.addEventListener('change', function() {
      this.form.submit();
    });
  });
});
```

## SSL/HTTPS Protocol Guidelines

### Development Environment Rules

#### ❌ AVOID These Patterns:
```javascript
// NEVER: Hardcoded HTTPS localhost URLs
const uploadUrl = 'https://localhost:3000/files/upload';

// NEVER: Force HTTPS in development
if (process.env.NODE_ENV === 'development') {
  app.use(redirectToHTTPS); // Don't do this
}

// NEVER: Secure cookies in development
cookie: {
  secure: true, // Don't do this in development
  httpOnly: true
}
```

#### ✅ USE These Patterns Instead:
```javascript
// ALWAYS: Use relative URLs or check hostname
const uploadUrl = window.location.hostname === 'localhost' ? 
  `http://localhost:${window.location.port || 3000}/files/upload` : 
  '/files/upload';

// ALWAYS: Disable HTTPS features in development
const helmetConfig = {
  contentSecurityPolicy: {
    directives: cspDirectives
    // NOTE: upgradeInsecureRequests omitted for development
  },
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000
  } : false
};

// ALWAYS: Conditional secure cookies
cookie: {
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true
}
```

## File Upload Security

### Best Practices for File Uploads

#### ❌ AVOID These Patterns:
```javascript
// NEVER: Redirects in upload responses (causes SSL issues)
router.post('/upload', async (req, res) => {
  // Process upload...
  res.redirect('/files'); // Don't do this
});

// NEVER: CSRF tokens with multipart/form-data
if (req.headers['content-type'].includes('multipart/form-data')) {
  return csrfProtection(req, res, next); // Skip this
}
```

#### ✅ USE These Patterns Instead:
```javascript
// ALWAYS: JSON responses for uploads
router.post('/upload', async (req, res) => {
  // Process upload...
  res.json({
    success: true,
    uploaded: uploadResults,
    errors: uploadErrors
  });
});

// ALWAYS: Skip CSRF for file uploads
const csrfProtection = (req, res, next) => {
  if (req.url.includes('/upload') && 
      req.headers['content-type']?.includes('multipart/form-data')) {
    return next(); // Skip CSRF for file uploads
  }
  // Normal CSRF validation...
};
```

## JavaScript File Organization

### File Structure
```
public/js/
├── localhost-protocol-fix.js    # Protocol handling
├── form-handlers.js             # Form event handling
├── image-error-handlers.js      # Image fallbacks
├── content-reprocess.js         # Reprocessing functionality
├── content-management.js        # Main content features
├── ai-analysis.js              # AI analysis features
└── status-buttons.js           # Status button handling
```

### Module Pattern
```javascript
// Use IIFE or proper module patterns
(function() {
  'use strict';
  
  // Private functions
  function privateFunction() {
    // Implementation
  }
  
  // Public API
  window.MyModule = {
    publicFunction: function() {
      // Implementation
    }
  };
})();
```

## Testing Security

### Manual Testing Checklist

1. **Check Browser Console**
   - ❌ No "Content Security Policy directive" errors
   - ❌ No "ERR_SSL_PROTOCOL_ERROR" messages
   - ❌ No "Refused to execute inline script" errors

2. **Network Tab Verification**
   - ✅ All requests use correct protocol (HTTP for localhost)
   - ✅ No failed SSL handshakes
   - ✅ File uploads return JSON responses

3. **Functionality Testing**
   - ✅ File uploads work for all supported types
   - ✅ Form submissions work properly
   - ✅ Image error handling shows fallbacks
   - ✅ Dynamic content loads correctly

### Automated Testing
```bash
# Security-related tests to run
npm run test:security    # Custom security tests
npm run test:uploads     # File upload functionality
npm run lint:security    # Security linting rules
```

## Emergency Fixes

### If CSP Violations Occur:
1. Check browser console for specific error
2. Identify the violating inline script/handler
3. Move to external JS file in `public/js/`
4. Replace inline handlers with `addEventListener`
5. Test thoroughly

### If SSL Protocol Errors Occur:
1. Check if HTTPS is being forced in development
2. Verify no hardcoded `https://localhost` URLs
3. Check middleware for HSTS or upgrade policies
4. Ensure upload routes return JSON, not redirects
5. Test with both HTTP and HTTPS

## References

- [Content Security Policy (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [OWASP Security Guidelines](https://owasp.org/www-community/controls/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)