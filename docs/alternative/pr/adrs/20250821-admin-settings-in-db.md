## ADR-20250821: Admin settings and feature flags in database

- Status: Accepted
- Date: 2025-08-21
- Owners: DaySave Core
- Tags: settings, feature-flags

### Context
Operational toggles (e.g., allow dev HTTP from any IP) should be configurable at runtime without redeploys. An `AdminSetting` model exists and is already consulted by security middleware for development-only behavior.

### Decision
- Store admin-configurable settings in the database via `AdminSetting` with auditability.
- Read settings at runtime in middleware/services (e.g., development HTTP access) and cache where appropriate.
- Provide an admin UI to manage settings with permissions.

### Consequences
- Positive: Faster operations and safer rollouts; centralized source of truth.
- Negative: Requires schema governance and safe defaults.

### Options considered
- ENV-only toggles (rejected: require redeploys and are not user/admin friendly).

### Decision drivers
- Operational flexibility with audit trails.

### Rollout and migration
- Seed defaults; add permission checks to settings UI; document change management.

### Links and references
- Code: `models/adminSetting.js`, `middleware/security.js`

