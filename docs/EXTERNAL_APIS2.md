# External 3rd-Party APIs and Services (Two-Row Format)

This document mirrors `docs/EXTERNAL_APIS.md` but formats each API as two rows:
- Row 1: Provider, Base Endpoint, Env Vars, Minimal Request
- Row 2: (blank, blank, "Response:", Minimal Response)

## Notes
- Do not commit real secrets. Configure via environment variables.
- Network access to providers should respect CSP (connectSrc).
- All APIs require proper authentication via environment variables.

## OpenAI API

| Provider | Base Endpoint | Env Vars | Minimal Request |
|---|---|---|---|
| OpenAI | `https://api.openai.com` | `OPENAI_API_KEY` | `POST /v1/chat/completions` `{ "model": "gpt-4o-mini", "messages": [{"role": "user", "content": "Summarize this content..."}], "max_tokens": 150 }` |
|  |  | Response: | `{ "id": "chatcmpl-...", "object": "chat.completion", "choices": [{ "message": { "role": "assistant", "content": "This content discusses..." } }], "usage": { "total_tokens": 45 } }` |

Used in: `services/multimedia/*`, `routes/files.js`, `app.js` startup validation, content analysis pipeline.

## Google Cloud Vision API

| Provider | Base Endpoint | Env Vars | Minimal Request |
|---|---|---|---|
| Google Vision | `https://vision.googleapis.com` | `GOOGLE_APPLICATION_CREDENTIALS`, `GOOGLE_API_KEY` | `POST /v1/images:annotate` `{ "requests": [{ "image": { "content": "base64_image_data" }, "features": [{ "type": "TEXT_DETECTION", "maxResults": 10 }] }] }` |
|  |  | Response: | `{ "responses": [{ "textAnnotations": [{ "description": "Extracted text content", "score": 0.95, "boundingPoly": { "vertices": [...] } }] }] }` |

| Provider | Base Endpoint | Env Vars | Minimal Request |
|---|---|---|---|
| Google Vision (Objects) | `https://vision.googleapis.com` | `GOOGLE_APPLICATION_CREDENTIALS`, `GOOGLE_API_KEY` | `POST /v1/images:annotate` `{ "requests": [{ "image": { "content": "base64_image_data" }, "features": [{ "type": "OBJECT_LOCALIZATION", "maxResults": 10 }] }] }` |
|  |  | Response: | `{ "responses": [{ "localizedObjectAnnotations": [{ "name": "Person", "score": 0.89, "boundingPoly": { "normalizedVertices": [...] } }] }] }` |

Used in: `services/multimedia/ImageProcessor.js`, `services/multimedia/MultimediaAnalyzer.js`, OCR and object detection features.

## Google Cloud Speech-to-Text API

| Provider | Base Endpoint | Env Vars | Minimal Request |
|---|---|---|---|
| Google Speech | `https://speech.googleapis.com` | `GOOGLE_APPLICATION_CREDENTIALS`, `GOOGLE_API_KEY` | `POST /v1/speech:recognize` `{ "config": { "encoding": "LINEAR16", "sampleRateHertz": 16000, "languageCode": "en-US", "enableSpeakerDiarization": true }, "audio": { "content": "base64_audio_data" } }` |
|  |  | Response: | `{ "results": [{ "alternatives": [{ "transcript": "Hello, this is a test recording", "confidence": 0.92 }], "speakerTag": 1 }] }` |

Used in: `services/multimedia/AudioProcessor.js`, `services/multimedia/MultimediaAnalyzer.js`, audio transcription pipeline.

## Google Cloud Storage API

| Provider | Base Endpoint | Env Vars | Minimal Request |
|---|---|---|---|
| Google Storage | `https://storage.googleapis.com` | `GOOGLE_APPLICATION_CREDENTIALS`, `GOOGLE_CLOUD_STORAGE_BUCKET` | `POST /upload/storage/v1/b/{bucket}/o` with multipart upload or signed URL upload |
|  |  | Response: | `{ "name": "uploads/user123/file.jpg", "bucket": "daysave-uploads", "size": "1024576", "contentType": "image/jpeg", "mediaLink": "https://..." }` |

Used in: `services/fileUpload.js`, `services/multimedia/*`, file storage and thumbnail management.

## Google Maps/Places Platform

| Provider | Base Endpoint | Env Vars | Minimal Request |
|---|---|---|---|
| Places Autocomplete | `https://maps.googleapis.com/maps/api/place/autocomplete/json` | `GOOGLE_MAPS_API_KEY` or `GOOGLE_MAPS_KEY` | `GET ?input=1600+Amphitheatre&key={API_KEY}&sessiontoken={SESSION_TOKEN}` |
|  |  | Response: | `{ "status": "OK", "predictions": [{ "description": "1600 Amphitheatre Parkway, Mountain View, CA", "place_id": "ChIJ...", "structured_formatting": { "main_text": "1600 Amphitheatre Parkway" } }] }` |

| Provider | Base Endpoint | Env Vars | Minimal Request |
|---|---|---|---|
| Place Details | `https://maps.googleapis.com/maps/api/place/details/json` | `GOOGLE_MAPS_API_KEY` or `GOOGLE_MAPS_KEY` | `GET ?place_id=ChIJ...&fields=name,formatted_address,geometry&key={API_KEY}` |
|  |  | Response: | `{ "status": "OK", "result": { "name": "Googleplex", "formatted_address": "1600 Amphitheatre Pkwy, Mountain View, CA", "geometry": { "location": { "lat": 37.4224764, "lng": -122.0842499 } } } }` |

| Provider | Base Endpoint | Env Vars | Minimal Request |
|---|---|---|---|
| Geocoding | `https://maps.googleapis.com/maps/api/geocode/json` | `GOOGLE_MAPS_API_KEY` or `GOOGLE_MAPS_KEY` | `GET ?address=New+York,+NY&key={API_KEY}` |
|  |  | Response: | `{ "status": "OK", "results": [{ "formatted_address": "New York, NY, USA", "geometry": { "location": { "lat": 40.7127753, "lng": -74.0059728 } }, "place_id": "ChIJ..." }] }` |

Used in: `routes/places.js`, `config/maps.js`, contact address autocomplete and validation.

## OAuth Identity Providers

| Provider | Base Endpoint | Env Vars | Flow Entrypoint |
|---|---|---|---|
| Google OAuth | `https://accounts.google.com/oauth/authorize` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | `GET /auth/google` → redirects to Google → `GET /auth/google/callback` |
|  |  | Response: | User profile data: `{ "id": "123456789", "email": "user@gmail.com", "name": "John Doe", "picture": "https://..." }` |

| Provider | Base Endpoint | Env Vars | Flow Entrypoint |
|---|---|---|---|
| Microsoft OAuth | `https://login.microsoftonline.com/common/oauth2/v2.0/authorize` | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` | `GET /auth/microsoft` → redirects to Microsoft → `GET /auth/microsoft/callback` |
|  |  | Response: | User profile data: `{ "id": "abc123...", "mail": "user@outlook.com", "displayName": "Jane Smith", "userPrincipalName": "user@domain.com" }` |

| Provider | Base Endpoint | Env Vars | Flow Entrypoint |
|---|---|---|---|
| Apple OAuth | `https://appleid.apple.com/auth/authorize` | `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` | `GET /auth/apple` → redirects to Apple → `GET /auth/apple/callback` |
|  |  | Response: | User profile data: `{ "sub": "001234.abc...", "email": "user@privaterelay.appleid.com", "email_verified": true }` |

Used in: `routes/auth.js`, `config/auth.js`, social login and account linking features.

## Payments (Stripe)

| Provider | Base Endpoint | Env Vars | Minimal Request |
|---|---|---|---|
| Stripe | `https://api.stripe.com` | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` | `GET /v1/account` (startup validation) or `POST /v1/payment_intents` `{ "amount": 2000, "currency": "usd", "customer": "cus_..." }` |
|  |  | Response: | Account: `{ "id": "acct_...", "country": "US", "default_currency": "usd" }` or Payment Intent: `{ "id": "pi_...", "amount": 2000, "status": "requires_payment_method" }` |

Used in: `services/startupValidation.js`, subscription billing validation (future expansion).

## Email/Notifications

| Provider | Base Endpoint | Env Vars | Minimal Request |
|---|---|---|---|
| Gmail SMTP (Nodemailer) | `smtps://smtp.gmail.com:465` | `GMAIL_USER`, `GMAIL_PASS`, `GMAIL_FROM` | SMTP connection + `sendMail({ from: "noreply@daysave.app", to: "user@example.com", subject: "Welcome", html: "<h1>Welcome!</h1>" })` |
|  |  | Response: | `{ "messageId": "<abc123@gmail.com>", "response": "250 2.0.0 OK", "accepted": ["user@example.com"], "rejected": [] }` |

| Provider | Base Endpoint | Env Vars | Minimal Request |
|---|---|---|---|
| SendGrid | `https://api.sendgrid.com/v3` | `SENDGRID_API_KEY`, `FROM_EMAIL` | `GET /user/account` (validation) or `POST /mail/send` `{ "from": {"email": "noreply@daysave.app"}, "to": [{"email": "user@example.com"}], "subject": "Welcome", "content": [{"type": "text/html", "value": "<h1>Welcome!</h1>"}] }` |
|  |  | Response: | Account: `{ "type": "paid", "reputation": 99.7 }` or Send: `202 Accepted` with message ID headers |

| Provider | Base Endpoint | Env Vars | Minimal Request |
|---|---|---|---|
| Twilio | `https://api.twilio.com/2010-04-01` | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | `GET /Accounts/{AccountSid}.json` (validation) or `POST /Accounts/{AccountSid}/Messages.json` `{ "From": "+1234567890", "To": "+0987654321", "Body": "Your verification code is 123456" }` |
|  |  | Response: | Account: `{ "sid": "AC...", "status": "active" }` or Message: `{ "sid": "SM...", "status": "queued", "to": "+0987654321" }` |

Used in: `utils/send-mail.js`, `services/startupValidation.js`, transactional email and SMS notifications.

## Social Platforms (Content Source Detection)

| Platform | Pattern/Endpoint | Purpose | Detection Method |
|---|---|---|---|
| YouTube | `youtube.com/watch`, `youtu.be` | Identify/process media URLs | URL pattern matching: `/^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/` |
|  |  | Response: | Content type: `"video"`, platform: `"youtube"`, metadata extraction via yt-dlp or API |

| Platform | Pattern/Endpoint | Purpose | Detection Method |
|---|---|---|---|
| Instagram | `instagram.com/(p|reel)/` | Identify/process media URLs | URL pattern matching: `/^https?:\/\/(www\.)?instagram\.com\/(p|reel)\/[\w-]+/` |
|  |  | Response: | Content type: `"image"` or `"video"`, platform: `"instagram"`, requires external tools for metadata |

| Platform | Pattern/Endpoint | Purpose | Detection Method |
|---|---|---|---|
| Facebook | `facebook.com/(watch|video|posts|photos|share/)` | Identify/process media URLs | URL pattern matching: `/^https?:\/\/(www\.)?facebook\.com\/(watch|video|posts|photos|share)/` |
|  |  | Response: | Content type: varies, platform: `"facebook"`, metadata via scraping or Graph API |

| Platform | Pattern/Endpoint | Purpose | Detection Method |
|---|---|---|---|
| Twitter/X | `twitter.com/.../status`, `x.com/.../status` | Identify/process media URLs | URL pattern matching: `/^https?:\/\/(www\.)?(twitter\.com|x\.com)\/\w+\/status\/\d+/` |
|  |  | Response: | Content type: `"text"`, `"image"`, or `"video"`, platform: `"twitter"` or `"x"` |

| Platform | Pattern/Endpoint | Purpose | Detection Method |
|---|---|---|---|
| LinkedIn | `linkedin.com/posts/` | Identify/process media URLs | URL pattern matching: `/^https?:\/\/(www\.)?linkedin\.com\/posts\/[\w-]+/` |
|  |  | Response: | Content type: varies, platform: `"linkedin"`, professional content context |

| Platform | Pattern/Endpoint | Purpose | Detection Method |
|---|---|---|---|
| TikTok | `tiktok.com/@.../video/` | Identify/process media URLs | URL pattern matching: `/^https?:\/\/(www\.)?tiktok\.com\/@[\w.-]+\/video\/\d+/` |
|  |  | Response: | Content type: `"video"`, platform: `"tiktok"`, short-form video content |

Used in: `routes/content.js`, `services/multimedia/MultimediaAnalyzer.js`, `services/BackwardCompatibilityService.js`, content type detection and platform-specific processing.

## Internal Test Endpoints (Provider Readiness)

| Route | Method | Purpose | Test Request |
|---|---|---|---|
| `/test-google-api` | GET | Confirms Google Vision API access | `GET /test-google-api` |
|  |  | Response: | `{ "success": true, "message": "Google Vision API is accessible", "testResult": { "textDetection": "working", "objectDetection": "working" } }` |

| Route | Method | Purpose | Test Request |
|---|---|---|---|
| `/test-openai-api` | GET | Confirms OpenAI API key validity | `GET /test-openai-api` |
|  |  | Response: | `{ "success": true, "message": "OpenAI API is accessible", "model": "gpt-4o-mini", "testCompletion": "API test successful" }` |

| Route | Method | Purpose | Test Request |
|---|---|---|---|
| `/api/places/health` | GET | Confirms Google Maps/Places API health | `GET /api/places/health` |
|  |  | Response: | `{ "status": "healthy", "services": { "placesApi": "operational", "geocodingApi": "operational" }, "quotaRemaining": "sufficient" }` |

Used in: Development and deployment validation, startup health checks, monitoring dashboards.

## Error Handling Patterns

| Error Type | HTTP Status | Response Format | Example |
|---|---|---|---|
| Authentication Failed | 401 | `{ "error": "authentication_failed", "message": "Invalid API key" }` | OpenAI, Google Cloud APIs |
|  |  | Response: | Retry with valid credentials or check environment variables |

| Error Type | HTTP Status | Response Format | Example |
|---|---|---|---|
| Rate Limited | 429 | `{ "error": "rate_limit_exceeded", "message": "Too many requests", "retry_after": 60 }` | All external APIs |
|  |  | Response: | Implement exponential backoff, respect retry_after headers |

| Error Type | HTTP Status | Response Format | Example |
|---|---|---|---|
| Service Unavailable | 503 | `{ "error": "service_unavailable", "message": "External service temporarily unavailable" }` | Any external API |
|  |  | Response: | Implement fallback mechanisms, queue requests for retry |

| Error Type | HTTP Status | Response Format | Example |
|---|---|---|---|
| Quota Exceeded | 403 | `{ "error": "quota_exceeded", "message": "API quota limit reached" }` | Google APIs, OpenAI |
|  |  | Response: | Monitor usage, implement usage tracking, upgrade plans if needed |

## Security Considerations

- **API Keys**: Store in environment variables, never commit to source control
- **Rate Limiting**: Implement client-side rate limiting to respect provider limits  
- **Error Handling**: Don't expose internal API keys or sensitive data in error responses
- **CSP**: Ensure all external API endpoints are included in Content Security Policy `connect-src`
- **Monitoring**: Log API usage, errors, and performance metrics for debugging and optimization
- **Fallbacks**: Implement graceful degradation when external services are unavailable
