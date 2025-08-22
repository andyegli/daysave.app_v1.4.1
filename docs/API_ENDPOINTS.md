# DaySave API Endpoints

This document lists the currently implemented API endpoints, grouped by domain. Each table includes route, method, description, and minimal request/response samples.

## Notes
- All endpoints (unless stated) require authentication. Admin endpoints also require admin role.
- Subscription routes are mounted under both `/subscription/*` and `/api/subscription/*`. Prefer `/api/subscription/*` for API clients.

## Health & Diagnostics

| Route | Method | Description | Request Sample | Response Sample |
|---|---|---|---|---|
| /health | GET | Application health summary | - | `{ "status": "healthy", "services": { ... } }` |
| /health/detailed | GET | Detailed health incl. env/version | - | `{ "status": "ok", "environment": "development", "version": "x.y.z" }` |
| /test-google-api | GET | Checks Google Vision availability | - | `{ "success": true, "message": "Google Vision API is accessible" }` |
| /test-openai-api | GET | Checks OpenAI key presence | - | `{ "success": true, "message": "OpenAI API key is configured and accessible" }` |
| /test-object-detection | GET | Object detection availability | - | `{ "success": true, "message": "...service available..." }` |
| /test-ocr | GET | OCR availability | - | `{ "success": true, "message": "...OCR... available" }` |
| /test-image-description | GET | Image description availability | - | `{ "success": true }` |
| /test-sentiment | GET | Sentiment availability | - | `{ "success": true }` |

## Auth

| Route | Method | Description | Request Sample | Response Sample |
|---|---|---|---|---|
| /auth/me | GET | Current user info | - | `{ "user": { "id": "...", "username": "...", "email": "..." } }` |
| /auth/status | GET | Authentication status | - | `{ "authenticated": true, "user": { ... } }` |
| /auth/refresh-session | POST | Refresh session user/role | - | `{ "success": true, "message": "Session refreshed successfully", "user": { ... } }` |
| /auth/debug-session | GET | Session/role debug | - | `{ "status": "debug_info", "data": { ... } }` |

## Passkeys (WebAuthn)

| Route | Method | Description | Request Sample | Response Sample |
|---|---|---|---|---|
| /passkeys/register/begin | GET | Begin passkey registration | - | `{ "success": true, "options": { ... } }` |
| /passkeys/register/finish | POST | Complete registration | `{ "credential": { ... }, "deviceName": "My Mac" }` | `{ "success": true, "message": "Passkey registered successfully" }` |
| /passkeys/authenticate/begin | GET | Begin authentication | - | `{ "success": true, "options": { ... } }` |
| /passkeys/authenticate/finish | POST | Complete authentication | `{ "credential": { ... } }` | `{ "success": true, "redirectUrl": "/dashboard" }` |
| /passkeys/list | GET | List user passkeys | - | `{ "success": true, "passkeys": [ ... ] }` |
| /passkeys/:id | PUT | Rename/toggle passkey | `{ "device_name": "iPhone", "is_active": true }` | `{ "success": true, "passkey": { ... } }` |
| /passkeys/:id | DELETE | Delete passkey | - | `{ "success": true, "message": "Passkey deleted successfully" }` |

## API Keys (/api/keys)

| Route | Method | Description | Request Sample | Response Sample |
|---|---|---|---|---|
| /api/keys | GET | List your API keys | `?enabled=true&includeExpired=false&limit=50&offset=0` | `{ "success": true, "data": [ ... ] }` |
| /api/keys | POST | Create API key | `{ "name": "CI Key", "rateLimitPerMinute": 60 }` | `{ "success": true, "data": { "id": "...", "name": "CI Key" } }` |
| /api/keys/:id | GET | Get key details | - | `{ "success": true, "data": { ... } }` |
| /api/keys/:id | PUT | Update API key | `{ "description": "Updated" }` | `{ "success": true, "data": { ... } }` |
| /api/keys/:id | DELETE | Delete API key | - | `{ "success": true, "message": "API key deleted successfully" }` |
| /api/keys/:id/toggle | POST | Enable/disable key | - | `{ "success": true, "data": { "enabled": true } }` |
| /api/keys/:id/usage | GET | Usage stats | `?startDate=2025-01-01&endDate=2025-02-01` | `{ "success": true, "data": { ... } }` |
| /api/keys/:id/usage/export | GET | CSV export | - | text/csv |
| /api/keys/usage/summary | GET | Summary across keys | - | `{ "success": true, "data": { ... } }` |
| /api/keys/admin/keys | GET | Admin: list all keys | - | `{ "success": true, "data": [ ... ] }` |
| /api/keys/admin/keys/:id/disable | POST | Admin: disable key | `{ "reason": "abuse" }` | `{ "success": true }` |
| /api/keys/admin/usage-stats | GET | Admin: global usage stats | - | `{ "success": true, "data": { ... } }` |

## Places (/api/places)

| Route | Method | Description | Request Sample | Response Sample |
|---|---|---|---|---|
| /api/places/status | GET | Places API availability | - | `{ "status": "available", "apiConfigured": true }` |
| /api/places/autocomplete | POST | Address autocomplete | `{ "input": "1600 Amph", "sessionToken": "..." }` | Google response passthrough |
| /api/places/details | POST | Place details | `{ "placeId": "ChIJ2eUgeAK6j4ARbn5u_wAGqWA" }` | Google response passthrough |
| /api/places/textsearch | POST | Text search | `{ "query": "pizza near me" }` | Google response passthrough |
| /api/places/geocode | POST | Geocode address | `{ "address": "New York, NY" }` | Google response passthrough |
| /api/places/health | GET | Places health probe | - | `{ "status": "healthy", ... }` |

## Contacts (/contacts)

| Route | Method | Description | Request Sample | Response Sample |
|---|---|---|---|---|
| /contacts/search | GET | Search contacts | `?q=john` | `[ { "id": 1, "name": "John" } ]` |
| /contacts/autocomplete | GET | Field autocomplete | `?field=email&q=gma` | `[ "john@gmail.com" ]` |
| /contacts/groups | GET | List groups | - | `{ "success": true, "groups": [ ... ] }` |
| /contacts/groups | POST | Create group | `{ "name": "VIP" }` | `{ "success": true, "group": { ... } }` |
| /contacts/groups/:groupId | PUT | Rename group | `{ "name": "Friends" }` | `{ "success": true, "group": { ... } }` |
| /contacts/groups/:groupId | DELETE | Delete group | - | `{ "success": true }` |
| /contacts/groups/:groupId/members | POST | Add member | `{ "contact_id": 123 }` | `{ "success": true, "membership": { ... } }` |
| /contacts/groups/:groupId/members/:contactId | DELETE | Remove member | - | `{ "success": true }` |
| /contacts/relationships | GET | List relationships | - | `{ "success": true, "relationships": [ ... ] }` |
| /contacts/:contactId/relationships | GET | Relationships for a contact | - | `{ "success": true, "relationships": [ ... ] }` |
| /contacts/relationships | POST | Create relationship | `{ "contact_id_1": 1, "contact_id_2": 2, "relation_type": "Friend" }` | `{ "success": true, "relationship": { ... } }` |
| /contacts/relationships/:relationshipId | DELETE | Delete relationship | - | `{ "success": true }` |
| /contacts/:id | DELETE | Delete contact | - | `{ "success": true }` |

## Content (/content)

| Route | Method | Description | Request Sample | Response Sample |
|---|---|---|---|---|
| /content | POST | Create from URL or bulk | `{ "url": "https://youtu.be/..." }` or `{ "content_type": "bulk_urls", "bulk_urls": "https://...\nhttps://..." }` | `{ "success": true, "content": { ... }, "ai_analysis": { "status": "started" } }` |
| /content/:id | PUT | Update content fields/tags | `{ "title": "New" }` | `{ "success": true, "content": { ... } }` |
| /content/:id | DELETE | Delete content | - | `{ "success": true }` |
| /content/:id/analysis | GET | Analysis results | - | `{ "success": true, "status": "completed", ... }` |
| /content/api/:id/status | GET | Analysis status/progress | - | `{ "success": true, "status": "processing", "progress": 60 }` |
| /content/api/:id/retry | POST | Retry analysis (multimedia only) | - | `{ "success": true, "status": "waiting" }` |
| /content/:id/reprocess | POST | Reprocess analysis | - | `{ "success": true, "status": "processing" }` |

## Files (/files)

| Route | Method | Description | Request Sample | Response Sample |
|---|---|---|---|---|
| /files/upload | POST | Upload file | multipart/form-data (file) | `{ "success": true, "file": { ... } }` |
| /files/:id | GET | File details | - | `{ "id": "...", "filename": "...", ... }` |
| /files/:id | PUT | Update file metadata | `{ "user_tags": ["tag1"] }` | `{ "success": true }` |
| /files/:id | DELETE | Delete file | - | `{ "success": true }` |
| /files/api/settings | GET | File feature flags | - | `{ "thumbsEnabled": true, ... }` |
| /files/api/stats | GET | User file/storage stats | - | `{ "count": 10, "storageMb": 123 }` |
| /files/serve/:userId/:filename | GET | Serve user file | - | binary stream |
| /files/serve/thumbnails/:filename | GET | Serve thumbnail | - | binary stream |
| /files/import-paths | POST | Import local paths (dev) | `{ "paths": ["/tmp/a.jpg"] }` | `{ "success": true }` |
| /files/:id/analysis | GET | Analysis results | - | `{ "success": true, ... }` |
| /files/:id/reprocess | POST | Re-run analysis | - | `{ "success": true }` |

## Multimedia (/multimedia)

| Route | Method | Description | Request Sample | Response Sample |
|---|---|---|---|---|
| /multimedia/analyze | POST | Full analysis of media URL | `{ "url": "https://...", "content_id": "..." }` | `{ "analysis_id": "...", "transcription": "...", ... }` |
| /multimedia/transcribe | POST | Transcribe audio/video URL | `{ "url": "https://..." }` | `{ "analysis_id": "...", "text": "..." }` |
| /multimedia/thumbnails | POST | Generate thumbnails/key moments | `{ "url": "https://...", "count": 5 }` | `{ "success": true, "thumbnails": [ ... ] }` |
| /multimedia/speakers/identify | POST | Identify speakers | `{ "url": "https://..." }` | `{ "success": true, "speakers": [ ... ] }` |
| /multimedia/analysis/:id | GET | Get analysis by ID | - | `{ ...analysis... }` |
| /multimedia/analysis | GET | List analyses (paginated) | `?limit=20&offset=0` | `{ "success": true, "analyses": [ ... ] }` |
| /multimedia/compatibility/test | GET | Dev compatibility self-test | - | `{ "success": true }` |

## Subscription (/api/subscription/*)

| Route | Method | Description | Request Sample | Response Sample |
|---|---|---|---|---|
| /api/subscription/api/plans | GET | List plans | - | `{ "success": true, "data": [ ... ] }` |
| /api/subscription/api/plans/:planId | GET | Plan details | - | `{ "success": true, "data": { ... } }` |
| /api/subscription/current | GET | Current user subscription | - | `{ "success": true, "data": { ... } }` |
| /api/subscription/subscribe | POST | Create subscription | `{ "planId": "uuid", "billingCycle": "monthly" }` | `{ "success": true, "data": { ... } }` |
| /api/subscription/change | PUT | Change plan | `{ "planId": "uuid" }` | `{ "success": true, "data": { ... } }` |
| /api/subscription/cancel | POST | Cancel subscription | `{ "reason": "...", "immediate": false }` | `{ "success": true, "data": { ... } }` |
| /api/subscription/usage/:feature | GET | Check usage allowance | `?amount=5` | `{ "success": true, "data": { "allowed": true } }` |
| /api/subscription/usage/:feature | POST | Increment usage | `{ "amount": 3 }` | `{ "success": true, "data": { ... } }` |
| /api/subscription/history | GET | Subscription history | `?limit=20&offset=0` | `{ "success": true, "data": { "transactions": [ ... ] } }` |
| /api/subscription/admin/subscriptions | GET | Admin: list subscriptions | `?status=active&limit=20&offset=0` | `{ "success": true, "data": { ... } }` |
| /api/subscription/admin/process-renewals | POST | Admin: process renewals | - | `{ "success": true, "data": { ... } }` |
| /api/subscription/admin/stats | GET | Admin: subscription stats | - | `{ "success": true, "data": { ... } }` |

## Admin APIs (/admin)

| Route | Method | Description | Request Sample | Response Sample |
|---|---|---|---|---|
| /admin/api/logs | GET | Paginated logs | `?limit=100&offset=0` | `{ "success": true, "data": [ ... ] }` |
| /admin/api/logs/stream | GET | Log stream (SSE) | - | `event-stream` |
| /admin/api/analytics/overview | GET | Analytics overview | - | `{ "success": true, ... }` |
| /admin/api/analytics/user-trends | GET | User trends | - | `{ "success": true, ... }` |
| /admin/api/analytics/content-stats | GET | Content stats | - | `{ "success": true, ... }` |
| /admin/api/analytics/performance | GET | Performance metrics | - | `{ "success": true, ... }` |
| /admin/api/stats/users | GET | User stats | - | `{ "success": true, ... }` |
| /admin/api/stats/active | GET | Active user stats | - | `{ "success": true, ... }` |
| /admin/api/stats/content | GET | Content stats | - | `{ "success": true, ... }` |
| /admin/api/stats/health | GET | System health | - | `{ "success": true, ... }` |
| /admin/api/fingerprinting/overview | GET | Fingerprinting overview | - | `{ "success": true, ... }` |
| /admin/api/fingerprinting/login-attempts | GET | Login attempts | - | `{ "success": true, ... }` |
| /admin/api/fingerprinting/devices | GET | Devices list | - | `{ "success": true, ... }` |
| /admin/api/fingerprinting/trust-device | POST | Trust a device | `{ "deviceId": "..." }` | `{ "success": true }` |
| /admin/api/fingerprinting/untrust-device | POST | Untrust a device | `{ "deviceId": "..." }` | `{ "success": true }` |
| /admin/api/fingerprinting/thresholds | POST | Update thresholds | `{ ... }` | `{ "success": true }` |
| /admin/api/fingerprinting/settings | POST | Update settings | `{ ... }` | `{ "success": true }` |
| /admin/api/fingerprinting/analytics | GET | Fingerprinting analytics | - | `{ "success": true, ... }` |
| /admin/api/fingerprinting/export-login-data | GET | Export login CSV | - | text/csv |
| /admin/api/roles/matrix | GET | Role/permission matrix | - | `{ "success": true, ... }` |
| /admin/api/roles/:roleId/permissions | POST | Set role permissions | `{ "permissions": ["content.read"] }` | `{ "success": true }` |
| /admin/api/roles | POST | Create role | `{ "name": "editor" }` | `{ "success": true, "role": { ... } }` |
| /admin/api/roles/:roleId | DELETE | Delete role | - | `{ "success": true }` |
| /admin/api/roles/:roleId/details | GET | Role details | - | `{ "success": true, "role": { ... } }` |
