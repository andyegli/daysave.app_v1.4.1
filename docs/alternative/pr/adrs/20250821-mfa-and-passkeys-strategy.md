## ADR-20250821: MFA enforcement and Passkeys strategy

- Status: Accepted
- Date: 2025-08-21
- Owners: DaySave Core
- Tags: auth, mfa, passkeys

### Context
The platform supports MFA and passkeys to improve account security. Enforcement is applied on sensitive routes, and flows exist for passkey registration and recovery.

### Decision
- Use middleware `enforceMfa` on sensitive routes such as `/dashboard` and `/admin`.
- Provide passkey routes under `/passkeys` for registration and authentication.
- Keep backup/recovery flows per security documentation and audit critical events.

### Consequences
- Positive: Stronger account protection and phishing resistance.
- Negative: Additional user onboarding steps; requires UX and support guidance.

### Options considered
- Password-only authentication (rejected: insufficient security for admin and API operations).

### Decision drivers
- Security posture requirements and existing implementation hooks.

### Rollout and migration
- Gradually enforce MFA per role; provide opt-in prompts and clear recovery.

### Links and references
- Code: `app.js` route protections, `routes/passkeys.js`
- Docs: `docs/MFA_IMPLEMENTATION_GUIDE.md`, `docs/PASSKEY_IMPLEMENTATION.md`

