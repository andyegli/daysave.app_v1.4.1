## ADR-20250821: Subscription plans, user subscriptions, and transactions

- Status: Accepted
- Date: 2025-08-21
- Owners: DaySave Core
- Tags: billing, subscriptions

### Context
We need to manage subscription plans, user entitlements, and transactions for DaySave features and AI usage limits. Migrations and seeders for plans and user subscriptions are present.

### Decision
- Define `SubscriptionPlan`, `UserSubscription`, and `SubscriptionTransaction` models with clear relations.
- Provide `subscriptionService` to resolve a user’s current entitlement and expose to views/routes.
- Log subscription access in analytics for support and debugging.

### Consequences
- Positive: Clear entitlement checks and billing audit trail.
- Negative: Requires coordinated migrations and seed data; integration with payment provider is separate work.

### Options considered
- Feature flags only (rejected: lacks billing semantics and auditability).

### Decision drivers
- Support tiered features and usage caps; align with AI cost tracking.

### Rollout and migration
- Seed default plans; update views to display status; enforce checks in routes/services.

### Links and references
- Code: `services/subscriptionService.js`, `migrations/*subscription*`, `seeders/*subscription*`

