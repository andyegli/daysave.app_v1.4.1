## ADR-20250821: API keys issuance, usage tracking, and audit logging

- Status: Accepted
- Date: 2025-08-21
- Owners: DaySave Core
- Tags: security, api-keys, auditing

### Context
External integrations require API keys with usage limits and auditability. We have routes, models, and migrations for keys, usage, and audit logs.

### Decision
- Manage API key lifecycle (create, rotate, revoke) via admin UI and RESTful routes.
- Track usage per key and persist audit logs for sensitive operations.
- Enforce per-route authentication via key middleware with rate limiting.

### Consequences
- Positive: Clear external access model with accountability.
- Negative: Storage and monitoring overhead; key leakage risk mitigated via rotation.

### Options considered
- OAuth-only access (rejected: not suitable for server-to-server use cases).

### Decision drivers
- Support partners and automation while preserving security and observability.

### Rollout and migration
- Provide seed/test keys for development; document rotation procedures; add dashboards (future work).

### Links and references
- Code: `routes/apiKeys.js`, `models/apiKey.js`, `models/apiKeyAuditLog.js`, migrations for api key tables

