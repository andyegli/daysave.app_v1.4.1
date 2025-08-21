## ADR-20250821: Storage and media handling strategy (uploads, thumbnails, serving)

- Status: Accepted
- Date: 2025-08-21
- Owners: DaySave Core
- Tags: storage, media, files

### Context
Media files (images, audio, video) require secure upload, processing (thumbnails, analysis), and serving. The app serves `/uploads` and static assets with caching. Thumbnails and analysis artifacts are linked to content and files.

### Decision
- Store user uploads under `uploads/` with Express static serving on `/uploads` (short cache) and general static assets under `public/` (longer cache).
- Route `/uploads/:userId/:filename` through a secure serve endpoint to apply auth/ACL as needed.
- Generate thumbnails and derived assets with metadata linking back to the original `files`/`content` records.

### Consequences
- Positive: Simple local storage in development; clear path to external storage/CDN later.
- Negative: Requires disk space management and cleanup jobs.

### Options considered
- Immediate use of external object storage (deferred: add S3/GCS integration later for production scale).

### Decision drivers
- Fast developer iteration; secure-by-default serving for user content.

### Rollout and migration
- Keep current local storage; design pluggable storage layer for future cloud storage.

### Links and references
- Code: `app.js` static/secure serve, `services/multimedia/*`, migrations for thumbnails/files

