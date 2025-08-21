## ADR-20250821: File uploads return JSON responses with CSRF exemption for multipart

- Status: Accepted
- Date: 2025-08-21
- Owners: DaySave Core
- Tags: uploads, security

### Context
Uploads commonly failed under strict redirects and CSRF checks due to multipart/form-data handling and localhost HTTPS quirks. The repository rules mandate JSON responses and skipping CSRF for multipart uploads.

### Decision
- All upload endpoints must return JSON (success/errors) rather than redirects.
- CSRF middleware skips validation for routes that include `/upload` and `multipart/form-data` content type.
- CSP directives include `blob:` for `imgSrc` and `mediaSrc` to allow previews and client-side processing.

### Consequences
- Positive: Fewer protocol issues; improved UX via async status.
- Positive: Clear error semantics for clients.
- Negative: Requires frontend to handle JSON and navigation after upload.

### Options considered
- Redirect-based flows (rejected: brittle with SSL/CSP and iframe contexts).

### Decision drivers
- Reliability across browsers and environments; adherence to repo’s security checklist.

### Rollout and migration
- Ensure upload routes respond with JSON.
- Keep CSRF exemption logic in security middleware as implemented.

### Links and references
- Code: `middleware/security.js` (CSRF exemption), upload route handlers
- Docs: `docs/SECURITY_GUIDELINES.md`

