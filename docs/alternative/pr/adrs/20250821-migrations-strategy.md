## ADR-20250821: Database migrations and schema change strategy

- Status: Accepted
- Date: 2025-08-21
- Owners: DaySave Core
- Tags: database, migrations, sequelize

### Context
DaySave uses Sequelize with many models and migrations. We need a disciplined approach to schema changes that supports backups, reproducibility, and safe production rollouts, aligned with the repo rules.

### Decision
- Use Sequelize CLI migrations exclusively in production; disable auto-sync in production.
- Before any model change, create a database backup using `scripts/backup-database.js` into `db_backup/`.
- Write forward and backward migrations for every change; include constraints, indexes, and validations.
- Test migrations locally and in staging before production.

### Consequences
- Positive: Predictable, reversible schema evolution with audit trail.
- Negative: Additional effort to author and test migrations.

### Options considered
- Rely on `sequelize.sync()` (rejected: unsafe for production, opaque changes).

### Decision drivers
- Safety, auditability, and alignment with repository process.

### Rollout and migration
- Run `npx sequelize-cli db:migrate` for upgrades and `db:migrate:undo` for rollback tests.
- Keep `MIGRATION_SUMMARY.md`/docs updated and ensure backups are created pre-change.

### Links and references
- Code: `migrations/`, `models/`
- Docs: `docs/MIGRATION_SUMMARY.md`, `scripts/backup-database.js`

