# DaySave Security Headers Strategy

## Overview

This document outlines the security headers strategy for DaySave to prevent duplicate and conflicting headers between Express middleware and Nginx proxy.

## Problem Solved

Previously, security headers were being set by both:
1. **Express middleware** (via Helmet.js)  
2. **Nginx proxy** (via `add_header` directives)

This caused:
- Duplicate headers (appearing multiple times)
- Conflicting values for the same header
- Inconsistent security policies across environments

## Solution: Clear Separation of Concerns

### Express/Helmet Responsibilities ✅
Express middleware handles **application-level security headers**:

- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy: [environment-specific]`

### Nginx Responsibilities ✅
Nginx handles **transport and infrastructure-level headers**:

- `Strict-Transport-Security` (HTTPS only)
- Caching headers (`Cache-Control`, `Expires`)
- Compression headers (`Content-Encoding`)

## Implementation Details

### Express Security Middleware
**File:** `middleware/security.js`

```javascript
const helmetConfig = {
  frameguard: { action: 'sameorigin' },
  noSniff: true,
  xssFilter: { setOnOldIE: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // ... other configs
};
```

### Nginx Configuration Changes
**Files:** 
- `nginx/nginx.conf`
- `nginx/sites-available/*.conf`

**Removed headers:**
- ❌ `X-Frame-Options`
- ❌ `X-Content-Type-Options`
- ❌ `X-XSS-Protection`
- ❌ `Referrer-Policy`

**Kept headers:**
- ✅ `Strict-Transport-Security` (HTTPS environments only)

## Header Values Standardized

| Header | Value | Source |
|--------|-------|--------|
| `X-Frame-Options` | `SAMEORIGIN` | Express |
| `X-Content-Type-Options` | `nosniff` | Express |
| `X-XSS-Protection` | `1; mode=block` | Express |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Express |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Nginx (HTTPS only) |

## Environment-Specific Behavior

### Development
- CSP disabled to prevent `upgrade-insecure-requests` issues
- HSTS disabled to prevent localhost SSL issues
- All security headers still applied for testing

### Production
- Full CSP policy enabled
- HSTS enabled with preload
- All security headers applied

## Testing

Use the security headers test script:

```bash
# Test default URLs
node scripts/test-security-headers.js

# Test specific URL
node scripts/test-security-headers.js http://localhost:3000

# Generate detailed report
node scripts/test-security-headers.js --detailed
```

The test script checks for:
- Duplicate headers
- Conflicting header values
- Missing security headers
- Proper configuration per environment

## Verification Commands

### Check for Duplicates
```bash
curl -I http://localhost:3000 | grep -i "x-content-type-options"
# Should show exactly one occurrence
```

### Check Header Sources
```bash
# Express headers (most security headers)
curl -I http://localhost:3000 | grep -E "(x-frame-options|x-xss-protection|referrer-policy)"

# Nginx headers (HSTS on HTTPS only)
curl -I https://localhost:443 | grep -i "strict-transport-security"
```

## Benefits

1. **No Duplicates:** Each header set by exactly one component
2. **Consistent Values:** Same security policy across all requests
3. **Environment Aware:** Proper behavior for dev vs production
4. **Maintainable:** Clear responsibility boundaries
5. **Testable:** Automated verification of header configuration

## Maintenance

- **Express changes:** Update `middleware/security.js`
- **Nginx changes:** Update only caching/transport headers
- **Testing:** Run `test-security-headers.js` after any changes
- **Monitoring:** Include header checks in CI/CD pipeline

## References

- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [Nginx Security Headers Guide](https://nginx.org/en/docs/http/ngx_http_headers_module.html)
