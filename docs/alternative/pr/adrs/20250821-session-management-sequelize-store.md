## ADR-20250821: Session management using Sequelize store with explicit dev/prod policies

- Status: Accepted
- Date: 2025-08-21
- Owners: DaySave Core
- Tags: sessions, security

### Context
Sessions must persist across restarts and scale to multiple instances. Cookie attributes must follow repository rules: never set `secure: true` in development, avoid strict HTTP-only during localhost debugging, and support database-backed storage.

### Decision
Use `connect-session-sequelize` as the session store with a `Session` model and explicit cookie settings in `app.js`:
- `secure: false` and `httpOnly: false` for localhost development (debugging cookies and AJAX flows), with `sameSite: 'lax'`.
- Database-backed store (Sequelize) with periodic cleanup and explicit expiration.
- Trust proxy enabled for production behind nginx; set `secure: true` only in production.

### Consequences
- Positive: Durable sessions; compatible with horizontal scaling.
- Positive: Configurable expiration and cleanup.
- Negative: Requires DB connectivity at startup and migrations for the session table.

### Options considered
- Memory store (rejected: non-durable, single-process only).
- Redis (deferred: adds infrastructure; can be introduced later if needed).

### Decision drivers
- Reliability across app restarts; compliance with repo’s localhost cookie rules.

### Rollout and migration
- Define `Session` model in `app.js`; use Sequelize store and sync.
- In production, enable `secure` cookies once HTTPS is terminated at nginx.

### Links and references
- Code: `app.js` (session configuration)

