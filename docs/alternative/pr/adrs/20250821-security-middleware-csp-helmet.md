## ADR-20250821: Centralized security middleware with Helmet, CORS, and CSP rules

- Status: Accepted
- Date: 2025-08-21
- Owners: DaySave Core
- Tags: security, csp, cors

### Context
To prevent CSP violations, SSL protocol errors, and common web attacks, security needs to be consistently configured. We also must follow project rules: never force HTTPS in development, never hardcode `https://localhost`, and avoid inline scripts to satisfy CSP.

### Decision
Centralize security in `middleware/security.js`:
- Use `helmet` security headers; enable CSP in production with explicit directives; disable CSP in development to avoid local HTTPS upgrades.
- Exclude `upgrade-insecure-requests` for localhost; include `blob:` in `imgSrc` and `mediaSrc`.
- Provide CORS configuration with an allowlist covering localhost/dev domains; credentials supported.
- Provide rate limiting helpers (development bypass, production toggled later).
- Sanitize inputs and implement CSRF with an explicit exemption for `multipart/form-data` uploads.

### Consequences
- Positive: Consistent security posture; fewer CSP/SSL false positives in dev; safer defaults in prod.
- Positive: Clear extension points (CORS, rate limits) per environment.
- Negative: Misconfiguration risk if directives diverge from frontend needs; requires periodic review.

### Options considered
- Per-route ad-hoc headers (rejected: inconsistent, error-prone).
- Global permanent CSP enforcement in dev (rejected: breaks localhost workflows and violates repo rules).

### Decision drivers
- Meet CSP and SSL guidelines defined in repository rules.
- Simplify developer experience while keeping production strict.
- Support file uploads and media previews without CSP conflicts.

### Rollout and migration
- Apply `securityHeaders()` before other middleware in `app.js`.
- Keep CSP disabled in development; verify production CSP via browser dev tools.
- Review directives when adding external resources.

### Links and references
- Code: `middleware/security.js`, `app.js`
- Docs: `docs/SECURITY_GUIDELINES.md`

