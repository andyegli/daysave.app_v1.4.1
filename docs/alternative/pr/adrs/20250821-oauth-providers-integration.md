## ADR-20250821: OAuth providers integration strategy (Google, Microsoft, etc.)

- Status: Accepted
- Date: 2025-08-21
- Owners: DaySave Core
- Tags: oauth, auth, security

### Context
Users can authenticate via external OAuth providers. We need a consistent approach for provider setup, account linking, error handling, and logging while protecting user privacy and security.

### Decision
- Centralize Passport strategies in `config/auth.js` and route flows in `routes/auth.js`.
- Support account linking/unlinking and provider user ID storage in `SocialAccounts` with profile metadata.
- Emit audit logs for auth events (`logAuthEvent`, `logOAuthFlow`, `logOAuthError`).
- Provide testing endpoints and documentation for provider setup.

### Consequences
- Positive: Clear, auditable sign-in flows with minimal duplicate logic.
- Negative: Provider-specific edge cases; requires key/secret management.

### Options considered
- Custom OAuth flows without Passport (rejected: more security risk and maintenance).

### Decision drivers
- Security, maintainability, and reuse across providers.

### Rollout and migration
- Keep provider configs in environment; document secrets in `docs/OAUTH_SETUP.md`, `docs/Microsoft_OAuth.md`.
- Ensure DB columns for `provider_user_id` and `profile_data` are migrated.

### Links and references
- Code: `config/auth.js`, `routes/auth.js`, `migrations/*social-accounts*`
- Docs: `docs/OAUTH_SETUP.md`, `docs/Microsoft_OAuth.md`, `docs/oauth-setup-guide.md`

