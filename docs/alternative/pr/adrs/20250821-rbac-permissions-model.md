## ADR-20250821: Role-based access control (RBAC) and permissions model

- Status: Accepted
- Date: 2025-08-21
- Owners: DaySave Core
- Tags: rbac, security, authorization

### Context
The platform requires fine-grained authorization for admin features, API access, and content operations. We have `Roles`, `Permissions`, and join tables with migrations and seeders present. Templates and routes perform admin checks and conditional rendering.

### Decision
- Implement RBAC with `Role` and `Permission` models and a many-to-many association.
- Load user role on session and ensure `ensureRoleLoaded` middleware is applied globally; eagerly reload role on admin routes if missing.
- Use permission checks in controllers/routes for sensitive operations; render UI conditionally based on permissions array.

### Consequences
- Positive: Clear separation of duties; safer admin surface.
- Negative: Requires consistent middleware usage and additional queries to hydrate roles/permissions.

### Options considered
- Attribute-based access control (ABAC) (deferred: complexity not needed now).
- Hardcoded role checks (rejected: brittle, non-extensible).

### Decision drivers
- Simplicity, clarity, and alignment with existing migrations and views.

### Rollout and migration
- Maintain seeders for default roles/permissions; migrate legacy checks to middleware-based approach.
- Centralize permission names to reduce drift; add tests for critical routes.

### Links and references
- Code: `migrations/*roles*`, `migrations/*permissions*`, `models/*`, `app.js` role loading

