# External 3rd-Party APIs and Services

This document lists external APIs/services used by DaySave, grouped by domain. Tables include base endpoint, purpose, auth/env vars, and minimal request/response samples.

## Notes
- Do not commit real secrets. Configure via environment variables.
- Network access to providers should respect CSP (connectSrc).

## OpenAI API

| Provider | Base Endpoint | Purpose | Env Vars | Minimal Request | Minimal Response |
|---|---|---|---|---|---|
| OpenAI | `https://api.openai.com` | Text analysis, title/tag generation, transcription | `OPENAI_API_KEY` | `POST /v1/chat/completions` `{ model: "gpt-4o-mini", messages:[{role:"user", content:"Summarize ..."}] }` | `{ id:"...", choices:[{ message:{ role:"assistant", content:"..." } }] }` |

Used in: `services/multimedia/*`, `routes/files.js`, `app.js` tests.

## Google Cloud (Vision, Speech, Storage)

| Service | Base Endpoint | Purpose | Env/Auth | Minimal Request | Minimal Response |
|---|---|---|---|---|---|
| Vision API | gRPC/`vision.googleapis.com` | OCR, object/label detection | Service Account via `GOOGLE_APPLICATION_CREDENTIALS` | ImageAnnotatorClient `textDetection(imagePath)` | `{ textAnnotations:[ ... ] }` |
| Speech-to-Text | gRPC/`speech.googleapis.com` | Audio transcription (fallback) | Service Account | `speechClient.recognize({ audio, config })` | `{ results:[ { alternatives:[{ transcript:"..." }] } ] }` |
| Cloud Storage | `https://storage.googleapis.com` | Store/serve uploads & thumbnails | Service Account; `GOOGLE_CLOUD_STORAGE_BUCKET` | Signed/public URLs; SDK upload | `200 OK` with object metadata |

Used in: `services/multimedia/*`, `services/fileUpload.js`, migration scripts.

## Google Maps/Places Platform

| Provider | Base Endpoint | Purpose | Env Vars | Minimal Request | Minimal Response |
|---|---|---|---|---|---|
| Places Autocomplete | `https://maps.googleapis.com/maps/api/place/autocomplete/json` | Address autocomplete | `GOOGLE_MAPS_API_KEY` or `GOOGLE_MAPS_KEY` | `POST` `{ input:"1600 Amph", sessionToken:"..." }` | Google passthrough JSON `{ status:"OK", predictions:[...] }` |
| Place Details | `https://maps.googleapis.com/maps/api/place/details/json` | Fetch place details | same | `POST` `{ placeId:"..." }` | Google passthrough JSON |
| Geocoding | `https://maps.googleapis.com/maps/api/geocode/json` | Address → geo | same | `POST` `{ address:"New York, NY" }` | Google passthrough JSON |

Used in: `routes/places.js`, `config/maps.js`.

## OAuth Identity Providers

| Provider | Base Endpoint | Purpose | Env Vars | Flow Entrypoint | Callback |
|---|---|---|---|---|---|
| Google | OAuth 2.0 | Social login/linking | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | GET `/auth/google` | GET `/auth/google/callback` |
| Microsoft | OAuth 2.0 | Social login/linking | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` | GET `/auth/microsoft` | GET `/auth/microsoft/callback` |
| Apple | OAuth 2.0 | Social login/linking | `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET` | GET `/auth/apple` | GET `/auth/apple/callback` |

Used in: `routes/auth.js`.

## Payments (Stripe)

| Provider | Base Endpoint | Purpose | Env Vars | Minimal Request | Minimal Response |
|---|---|---|---|---|---|
| Stripe | `https://api.stripe.com` | Subscription billing (validation, future use) | `STRIPE_SECRET_KEY` | SDK `stripe.accounts.retrieve()` (startup validation) | `{ id:"acct_...", ... }` |

Used in: `services/startupValidation.js`.

## Email/Notifications

| Provider | Base Endpoint | Purpose | Env Vars | Minimal Request | Minimal Response |
|---|---|---|---|---|---|
| Gmail SMTP (Nodemailer) | `smtps://smtp.gmail.com:465` | Transactional email (dev/simple) | `GMAIL_USER`, `GMAIL_PASS`, `GMAIL_FROM` | SMTP login and `sendMail({ to, subject, html })` | `250 OK` |
| SendGrid | `https://api.sendgrid.com/v3` | Transactional email (optional) | `SENDGRID_API_KEY`, `FROM_EMAIL` | `GET /v3/user/account` (validation) or send API | JSON `{ ... }`/`202 Accepted` |

Used in: `utils/send-mail.js`, `services/startupValidation.js`.

## Social Platforms (Content Source Detection)

| Platform | Pattern/Endpoint | Purpose | Notes |
|---|---|---|---|
| YouTube | `youtube.com/watch`, `youtu.be` | Identify/process media URLs | Used for content-type detection and metadata.
| Instagram | `instagram.com/(p|reel)/` | Identify/process media URLs | Same as above.
| Facebook | `facebook.com/(watch|video|posts|photos|share/)` | Identify/process media URLs | Same as above.
| Twitter/X | `twitter.com/.../status`, `x.com/.../status` | Identify/process media URLs | Same as above.
| LinkedIn | `linkedin.com/posts/` | Identify/process media URLs | Same as above.

Used in: `routes/content.js`, `services/multimedia/MultimediaAnalyzer.js`, `services/BackwardCompatibilityService.js`.

## Internal Test Endpoints (for provider readiness)

| Route | Purpose |
|---|---|
| `/test-google-api` | Confirms Google Vision access.
| `/test-openai-api` | Confirms OpenAI API key presence.
| `/api/places/health` | Confirms Places/Maps health.
