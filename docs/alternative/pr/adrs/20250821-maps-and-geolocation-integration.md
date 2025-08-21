## ADR-20250821: Maps and geolocation integration strategy

- Status: Accepted
- Date: 2025-08-21
- Owners: DaySave Core
- Tags: maps, geolocation, frontend

### Context
The app uses Google Maps/Places for address completion and mapping in forms and contact management. CSP and CORS considerations apply; localhost protocols must be handled safely.

### Decision
- Use external JS includes from allowed origins for Maps APIs and keep all app logic in `public/js/` files.
- Configure CORS/allowed origins to include `localhost` and dev domains; avoid forcing HTTPS in development.
- Handle failures gracefully and provide fallbacks when keys are missing.

### Consequences
- Positive: Reliable maps features within CSP and dev constraints.
- Negative: External dependency availability and quota limits.

### Options considered
- Self-hosted map tiles (rejected: complexity and scope).

### Decision drivers
- Simplicity and alignment with security rules.

### Rollout and migration
- Verify CSP directives and allowed origins when enabling new Google features; ensure no inline handlers.

### Links and references
- Code/Docs: `docs/google-maps-setup.md`, `config/maps.js`, views and `public/js` autocomplete handlers

