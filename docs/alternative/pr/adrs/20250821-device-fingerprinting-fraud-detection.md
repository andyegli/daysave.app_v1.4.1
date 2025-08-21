## ADR-20250821: Device fingerprinting and fraud detection strategy

- Status: Accepted
- Date: 2025-08-21
- Owners: DaySave Core
- Tags: security, fraud, fingerprinting

### Context
Fraudulent access and account sharing must be limited. We collect device/browser attributes to form a fingerprint for risk scoring and auditing. The middleware exists to attach and optionally log fingerprints per request.

### Decision
- Apply `deviceFingerprintMiddleware` globally with options for fraud detection and route skipping.
- Store fingerprints with user context as needed for security analytics (respect privacy and consent requirements).
- Provide an admin toggle to allow broad HTTP access in dev (without weakening production).

### Consequences
- Positive: Better detection of suspicious sessions and device anomalies.
- Negative: Additional data handling and potential privacy concerns; must document retention.

### Options considered
- IP-only tracking (rejected: unstable and insufficient).

### Decision drivers
- Improve account security while accommodating development flows.

### Rollout and migration
- Enable middleware with conservative defaults; add admin UI to view device history (future work).

### Links and references
- Code: `middleware/deviceFingerprinting.js`, `app.js` usage

