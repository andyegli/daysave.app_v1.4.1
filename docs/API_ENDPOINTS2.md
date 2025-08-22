# DaySave API Endpoints (Two-Row Format)

This document mirrors `docs/API_ENDPOINTS.md` but formats each endpoint as two rows:
- Row 1: Route, Method, Description, Request Sample
- Row 2: (blank, blank, "Response:", Response Sample)

## Notes
- Auth required unless noted; admin endpoints also require admin role.
- Subscription endpoints exist under both `/subscription/*` and `/api/subscription/*`. Prefer `/api/subscription/*` for programmatic use.

## Health & Diagnostics

| Route | Method | Description | Request Sample |
|---|---|---|---|
| /health | GET | Application health summary | - |
|  |  | Response: | `{ "status": "healthy", "services": { ... } }` |
| /health/detailed | GET | Detailed health incl. env/version | - |
|  |  | Response: | `{ "status": "ok", "environment": "development", "version": "x.y.z" }` |
| /test-google-api | GET | Checks Google Vision availability | - |
|  |  | Response: | `{ "success": true, "message": "Google Vision API is accessible" }` |
| /test-openai-api | GET | Checks OpenAI key presence | - |
|  |  | Response: | `{ "success": true, "message": "OpenAI API key is configured and accessible" }` |

## Auth

| Route | Method | Description | Request Sample |
|---|---|---|---|
| /auth/me | GET | Current user info | - |
|  |  | Response: | `{ "user": { "id": "...", "username": "...", "email": "..." } }` |
| /auth/status | GET | Authentication status | - |
|  |  | Response: | `{ "authenticated": true, "user": { ... } }` |
| /auth/refresh-session | POST | Refresh session user/role | - |
|  |  | Response: | `{ "success": true, "message": "Session refreshed successfully", "user": { ... } }` |

## Passkeys (WebAuthn)

| Route | Method | Description | Request Sample |
|---|---|---|---|
| /passkeys/register/begin | GET | Begin passkey registration | - |
|  |  | Response: | `{ "success": true, "options": { ... } }` |
| /passkeys/register/finish | POST | Complete registration | `{ "credential": { ... }, "deviceName": "My Mac" }` |
|  |  | Response: | `{ "success": true, "message": "Passkey registered successfully" }` |
| /passkeys/authenticate/begin | GET | Begin authentication | - |
|  |  | Response: | `{ "success": true, "options": { ... } }` |
| /passkeys/authenticate/finish | POST | Complete authentication | `{ "credential": { ... } }` |
|  |  | Response: | `{ "success": true, "redirectUrl": "/dashboard" }` |

## API Keys (/api/keys)

| Route | Method | Description | Request Sample |
|---|---|---|---|
| /api/keys | GET | List your API keys | `?enabled=true&includeExpired=false&limit=50&offset=0` |
|  |  | Response: | `{ "success": true, "data": [ ... ] }` |
| /api/keys | POST | Create API key | `{ "name": "CI Key", "rateLimitPerMinute": 60 }` |
|  |  | Response: | `{ "success": true, "data": { "id": "...", "name": "CI Key" } }` |
| /api/keys/:id | GET | Get key details | - |
|  |  | Response: | `{ "success": true, "data": { ... } }` |
| /api/keys/:id | PUT | Update API key | `{ "description": "Updated" }` |
|  |  | Response: | `{ "success": true, "data": { ... } }` |
| /api/keys/:id | DELETE | Delete API key | - |
|  |  | Response: | `{ "success": true, "message": "API key deleted successfully" }` |
| /api/keys/:id/toggle | POST | Enable/disable key | - |
|  |  | Response: | `{ "success": true, "data": { "enabled": true } }` |

## Places (/api/places)

| Route | Method | Description | Request Sample |
|---|---|---|---|
| /api/places/status | GET | Places API availability | - |
|  |  | Response: | `{ "status": "available", "apiConfigured": true }` |
| /api/places/autocomplete | POST | Address autocomplete | `{ "input": "1600 Amph", "sessionToken": "..." }` |
|  |  | Response: | Google JSON passthrough |
| /api/places/details | POST | Place details | `{ "placeId": "ChIJ..." }` |
|  |  | Response: | Google JSON passthrough |
| /api/places/geocode | POST | Geocode address | `{ "address": "New York, NY" }` |
|  |  | Response: | Google JSON passthrough |

## Contacts (/contacts)

| Route | Method | Description | Request Sample |
|---|---|---|---|
| /contacts/search | GET | Search contacts | `?q=john` |
|  |  | Response: | `[ { "id": 1, "name": "John" } ]` |
| /contacts/groups | GET | List groups | - |
|  |  | Response: | `{ "success": true, "groups": [ ... ] }` |
| /contacts/groups | POST | Create group | `{ "name": "VIP" }` |
|  |  | Response: | `{ "success": true, "group": { ... } }` |
| /contacts/groups/:groupId/members | POST | Add member | `{ "contact_id": 123 }` |
|  |  | Response: | `{ "success": true, "membership": { ... } }` |
| /contacts/relationships | POST | Create relationship | `{ "contact_id_1": 1, "contact_id_2": 2, "relation_type": "Friend" }` |
|  |  | Response: | `{ "success": true, "relationship": { ... } }` |

## Content (/content)

| Route | Method | Description | Request Sample |
|---|---|---|---|
| /content | POST | Create from URL or bulk | `{ "url": "https://youtu.be/..." }` or `{ "content_type": "bulk_urls", "bulk_urls": "https://...\nhttps://..." }` |
|  |  | Response: | `{ "success": true, "content": { ... }, "ai_analysis": { "status": "started" } }` |
| /content/:id | PUT | Update content fields/tags | `{ "title": "New" }` |
|  |  | Response: | `{ "success": true, "content": { ... } }` |
| /content/:id/analysis | GET | Analysis results | - |
|  |  | Response: | `{ "success": true, "status": "completed", ... }` |
| /content/api/:id/status | GET | Analysis status/progress | - |
|  |  | Response: | `{ "success": true, "status": "processing", "progress": 60 }` |

## Files (/files)

| Route | Method | Description | Request Sample |
|---|---|---|---|
| /files/upload | POST | Upload file | multipart/form-data (file) |
|  |  | Response: | `{ "success": true, "file": { ... } }` |
| /files/:id | GET | File details | - |
|  |  | Response: | `{ "id": "...", "filename": "...", ... }` |
| /files/:id | PUT | Update file metadata | `{ "user_tags": ["tag1"] }` |
|  |  | Response: | `{ "success": true }` |
| /files/:id/analysis | GET | Analysis results | - |
|  |  | Response: | `{ "success": true, ... }` |

## Multimedia (/multimedia)

| Route | Method | Description | Request Sample |
|---|---|---|---|
| /multimedia/analyze | POST | Full analysis of media URL | `{ "url": "https://...", "content_id": "..." }` |
|  |  | Response: | `{ "analysis_id": "...", "transcription": "...", ... }` |
| /multimedia/transcribe | POST | Transcribe audio/video URL | `{ "url": "https://..." }` |
|  |  | Response: | `{ "analysis_id": "...", "text": "..." }` |
| /multimedia/thumbnails | POST | Generate thumbnails/key moments | `{ "url": "https://...", "count": 5 }` |
|  |  | Response: | `{ "success": true, "thumbnails": [ ... ] }` |

## Subscription (/api/subscription/*)

| Route | Method | Description | Request Sample |
|---|---|---|---|
| /api/subscription/api/plans | GET | List plans | - |
|  |  | Response: | `{ "success": true, "data": [ ... ] }` |
| /api/subscription/current | GET | Current user subscription | - |
|  |  | Response: | `{ "success": true, "data": { ... } }` |
| /api/subscription/subscribe | POST | Create subscription | `{ "planId": "uuid", "billingCycle": "monthly" }` |
|  |  | Response: | `{ "success": true, "data": { ... } }` |
| /api/subscription/change | PUT | Change plan | `{ "planId": "uuid" }` |
|  |  | Response: | `{ "success": true, "data": { ... } }` |
| /api/subscription/cancel | POST | Cancel subscription | `{ "reason": "...", "immediate": false }` |
|  |  | Response: | `{ "success": true, "data": { ... } }` |

## Admin APIs (/admin)

| Route | Method | Description | Request Sample |
|---|---|---|---|
| /admin/api/logs | GET | Paginated logs | `?limit=100&offset=0` |
|  |  | Response: | `{ "success": true, "data": [ ... ] }` |
| /admin/api/analytics/overview | GET | Analytics overview | - |
|  |  | Response: | `{ "success": true, ... }` |
| /admin/api/fingerprinting/overview | GET | Fingerprinting overview | - |
|  |  | Response: | `{ "success": true, ... }` |
