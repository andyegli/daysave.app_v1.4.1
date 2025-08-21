## ADR-20250821: Centralized structured logging with Winston

- Status: Accepted
- Date: 2025-08-21
- Owners: DaySave Core
- Tags: logging, observability

### Context
We need consistent, structured, and queryable logs across the application to support troubleshooting, auditability, and analytics (security events, authentication, multimedia workflows, API requests). Ad-hoc `console.log` calls are unstructured and do not provide durability or separation by concern.

### Decision
Adopt a centralized logging subsystem based on `winston` with:
- Structured JSON logs written to files in production and colorized console output in development.
- Multiple transports: general app log, error log, and domain-specific logs (e.g., multimedia, user-activity).
- A shared logger exported from `config/logger.js` exposing domain helpers (e.g., `logger.api.request`, `logger.multimedia.success`, `logAuthEvent`).
- Backward-compatible helpers to ease migration and prevent breaking changes.

### Consequences
- Positive: Consistent log schema; easier correlation and analytics; lower MTTR.
- Positive: Domain helpers encourage correct context in every log entry.
- Negative: Disk usage for multiple log files; require rotation and retention policies.
- Negative: Slight runtime overhead; ensure log level tuning for production.

### Options considered
- Keep ad-hoc `console.log` (rejected: unstructured, hard to search).
- `pino` (rejected for now: winston already integrated, domain APIs implemented).

### Decision drivers
- Improve debuggability and security auditing.
- Maintain developer ergonomics with minimal migration cost.
- Support multimedia workflow tracing and API monitoring.

### Rollout and migration
- Use `config/logger.js` for all new logs.
- Gradually replace legacy `console.log` with domain methods.
- Configure rotation and centralized shipping in deployment (future work).

### Links and references
- Code: `config/logger.js`
- Emits DB audit logs via `logAuthEvent` when available

