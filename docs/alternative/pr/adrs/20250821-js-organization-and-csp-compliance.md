## ADR-20250821: JavaScript organization for CSP compliance (no inline scripts)

- Status: Accepted
- Date: 2025-08-21
- Owners: DaySave Core
- Tags: csp, frontend, javascript

### Context
Inline scripts and inline event handlers cause CSP violations and increase XSS risk. The repository mandates all JavaScript in external files under `public/js/`, with event binding via `addEventListener` and cache-busting query strings.

### Decision
- Place all client-side code in `public/js/` modules (e.g., `localhost-protocol-fix.js`, `form-handlers.js`, `image-error-handlers.js`, `content-reprocess.js`).
- Bind UI behavior using data attributes plus `addEventListener`; no `on*` HTML attributes.
- Include scripts with cache-busting, e.g., `?v=<%= Date.now() %>` in EJS.

### Consequences
- Positive: CSP-compliant by default; easier auditing and reuse.
- Positive: Separation of concerns; improved maintainability.
- Negative: Slightly more boilerplate for DOM bindings.

### Options considered
- Allow limited inline scripts with nonces (rejected: more complex and against repo rules).

### Decision drivers
- Strict CSP compliance; consistent frontend architecture.

### Rollout and migration
- Remove inline handlers from templates; add data attributes and external handlers.
- Verify via browser dev tools that no inline script violations occur.

### Links and references
- Structure: `public/js/`
- Docs: `docs/SECURITY_GUIDELINES.md`

