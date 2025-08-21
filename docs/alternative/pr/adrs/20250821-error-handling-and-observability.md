## ADR-20250821: Error handling, health checks, and observability

- Status: Accepted
- Date: 2025-08-21
- Owners: DaySave Core
- Tags: errors, observability, health

### Context
Consistent error handling and health visibility are essential for reliability. The app includes error middleware and health endpoints with startup validation and structured logging.

### Decision
- Use centralized error handling middleware to render friendly error pages and JSON for APIs.
- Provide `/health` and `/health/detailed` endpoints reflecting startup validation and service status.
- Emit structured logs for requests and errors via the shared logger.

### Consequences
- Positive: Faster incident diagnosis and safer error responses.
- Negative: Requires maintaining validation checks and dashboards.

### Options considered
- Decentralized try/catch and ad-hoc health checks (rejected: inconsistent and hard to monitor).

### Decision drivers
- Reliability and operational readiness.

### Rollout and migration
- Keep adding health probes for new dependencies; ensure error views and JSON API errors are tested.

### Links and references
- Code: `middleware/error.js`, `app.js` health endpoints, `config/logger.js`

