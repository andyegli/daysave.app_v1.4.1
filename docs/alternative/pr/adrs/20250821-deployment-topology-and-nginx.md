## ADR-20250821: Deployment topology, reverse proxy, and environment configuration

- Status: Accepted
- Date: 2025-08-21
- Owners: DaySave Core
- Tags: deployment, nginx, docker

### Context
DaySave runs behind nginx with Docker-based environments for local, staging, and production. We must avoid forcing HTTPS in development and configure CSP/HSTS appropriately. Reverse proxy handles TLS termination and static serving.

### Decision
- Use nginx as the reverse proxy; Express trusts the first proxy.
- For development: no forced HTTPS, disable HSTS and `upgrade-insecure-requests`, and use `http://localhost`.
- For production: enable HSTS and CSP via Helmet; serve static assets efficiently; proxy to Node app.
- Manage environments with `docker-compose` files and environment templates.

### Consequences
- Positive: Clear separation of concerns and secure production defaults.
- Negative: Multiple config variants to maintain.

### Options considered
- Direct Node exposure on the internet (rejected: fewer controls and less flexibility).

### Decision drivers
- Security, performance, and operational clarity.

### Rollout and migration
- Maintain nginx configs under `nginx/` (sites for local, ssl, prod).
- Use `docker-compose.*.yml` for environment-specific orchestration; keep `.env` templates updated.

### Links and references
- Code/Config: `nginx/*.conf`, `docker-compose*.yml`, `Dockerfile*`, `app.js`
- Docs: `docs/production-gcp-deployment.md`, `docs/production-docker-setup.md`, `docs/MANUAL_DEPLOYMENT_GUIDE.md`

