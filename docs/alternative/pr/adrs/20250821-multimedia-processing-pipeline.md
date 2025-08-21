## ADR-20250821: Multimedia processing pipeline orchestration

- Status: Accepted
- Date: 2025-08-21
- Owners: DaySave Core
- Tags: multimedia, pipeline, ai

### Context
DaySave analyzes audio, video, and images using internal processors and external AI services. We need a robust pipeline with clear stages, logging, and idempotency.

### Decision
- Use a modular pipeline architecture under `services/multimedia/` with a base processor class and specific processors for audio, video, and images.
- Emit structured progress logs via `config/logger.js` domain helpers.
- Record AI usage via `AiUsageTracker` where applicable.

### Consequences
- Positive: Composable processing with better tracing and error handling.
- Negative: More components to maintain; requires test coverage.

### Options considered
- Monolithic single-function processing (rejected: hard to extend and monitor).

### Decision drivers
- Scalability, observability, and integration with external AI providers.

### Rollout and migration
- Implement processors incrementally; ensure idempotent writes; add retries and backoff for external calls.

### Links and references
- Code: `services/multimedia/*`, `services/aiUsageTracker.js`, tests under `tests/`

