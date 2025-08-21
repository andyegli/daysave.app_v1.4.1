## ADR-20250821: Login attempt tracking and account lockout policy

- Status: Accepted
- Date: 2025-08-21
- Owners: DaySave Core
- Tags: auth, security, brute-force-protection

### Context
To limit brute-force attacks and support security analytics, we track login attempts and enforce temporary lockouts after repeated failures. The repository includes utilities for tracking attempts (`utils/loginAttemptTracker.js`) and security middleware guidance.

### Decision
- Track per-username and per-IP login attempts with timestamps and sliding window logic.
- Enforce lockout after N failed attempts (configurable), with exponential backoff or fixed lockout duration.
- Log security events for attempts and lockouts; surface audit signals and admin visibility.

### Consequences
- Positive: Reduces brute-force attack surface and provides forensic data.
- Negative: Potential UX friction; requires careful tuning and bypass for trusted flows (e.g., admins).

### Options considered
- No lockout (rejected: insufficient protection) or CAPTCHA-only (deferred: optional layered control).

### Decision drivers
- Security hardening aligned with other middleware (rate limiting, CSRF, CSP).

### Rollout and migration
- Implement server-side checks in auth routes; ensure messages avoid account enumeration.
- Provide admin tools to review attempts and clear lockouts when appropriate.

### Links and references
- Code: `utils/loginAttemptTracker.js`, `middleware/security.js`, `routes/auth.js`

