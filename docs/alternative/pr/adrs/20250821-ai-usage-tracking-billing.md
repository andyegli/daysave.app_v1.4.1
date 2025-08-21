## ADR-20250821: Track external AI usage and costs in database

- Status: Accepted
- Date: 2025-08-21
- Owners: DaySave Core
- Tags: ai, billing, analytics

### Context
The platform integrates multiple AI providers (OpenAI, Google AI, GCP Vision/STT). We need reliable accounting of token usage and estimated costs for users and system-wide reporting.

### Decision
Implement a service `services/aiUsageTracker.js` that:
- Extracts token usage from provider responses (OpenAI and Google AI).
- Calculates estimated costs using provider/model pricing tables.
- Persists usage in `ExternalAiUsage` with metadata (content/file/job, session, region, cache, rate limits).
- Provides summaries by user and provider for billing periods.

### Consequences
- Positive: Transparent cost visibility; enables quotas and billing.
- Positive: Uniform abstraction across providers.
- Negative: Pricing drift risk; requires periodic pricing updates.

### Options considered
- Only log to files (rejected: hard to aggregate, lacks billing semantics).
- Push-based billing from providers (not universally available; still need internal tracking).

### Decision drivers
- Accurate, auditable usage data.
- Support cost controls and admin analytics.

### Rollout and migration
- Use tracker from AI integration points; record usage after successful calls.
- Schedule periodic review of pricing tables and add admin UI for updates (future work).

### Links and references
- Code: `services/aiUsageTracker.js`, `models/externalAiUsage.js` (model)

