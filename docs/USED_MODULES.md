## Used Modules and Rationale

This document lists the key modules used in DaySave and why we include them. It reflects declared dependencies in `package.json` and verified usage across the codebase.

### Core web stack
- **express**: Web framework for routing, middleware, HTTP handling.
- **ejs**: Server-side templating for views.
- **compression**: Gzip responses to improve performance.
- **morgan**: Request logging in development/ops.
- **cors**: Control cross-origin access to APIs.
- **helmet**: Secure HTTP headers; aligns with CSP rules.
- **express-session**: Server-side session management.
- **connect-session-sequelize**: Stores sessions in DB via Sequelize.

### Database and ORM
- **sequelize**: ORM for models, migrations, queries.
- **mysql2**: MySQL driver used by Sequelize.

### Authentication and authorization
- **passport**: Auth framework integrating strategies.
- **passport-google-oauth20**: Google OAuth login.
- **passport-microsoft**: Microsoft OAuth login.
- **passport-apple**: Apple OAuth login.
- **passport-fido2-webauthn**: Passkeys/WebAuthn authentication.
- **jsonwebtoken**: Token issuance/verification for stateless flows.

### Password hashing and 2FA
- **bcrypt**: Native password hashing for credentials.
- **bcryptjs**: JS fallback hashing for portability.
- **speakeasy**: TOTP/HOTP for 2FA.
- **qrcode**: Generate QR codes for TOTP enrollment.

### Input validation
- **express-validator**: Request validation/sanitization.

### File handling and uploads
- **multer**: Multipart parsing and secure uploads.
- **mime-types**: Enforce and detect MIME types.

### Multimedia processing and extraction
- **fluent-ffmpeg**: Audio/video processing and probing.
- **pdf-parse**: Text/metadata extraction from PDF files.
- **mammoth**: Text extraction from .docx.
- **textract**: Fallback extraction for various document types.
- **ytdl-core**: Programmatic YouTube media access (complements scripts using yt-dlp).

### AI and external ML APIs
- **openai**: OpenAI API client for AI features and health checks.
- **@google-cloud/vision**: OCR/vision analysis.
- **@google-cloud/speech**: Speech-to-text transcription.
- **@google-cloud/storage**: Google Cloud Storage access.
- **@google/generative-ai**: Google Gen-AI client (declared; limited direct usage in repo).

### Networking and HTTP utilities
- **axios**: HTTP client with interceptors/timeouts used in scripts.
- **node-fetch**: Lightweight fetch for services/tests.
- **form-data**: Build multipart requests in tests/integrations.
- **geoip-lite**: IP geolocation for analytics/security context.

### Email, SMS, and notifications
- **nodemailer**: SMTP email (Gmail in startup validation).
- **@sendgrid/mail**: SendGrid API-based email.
- **twilio**: SMS/voice notifications and verifications.

### Payments and subscriptions
- **stripe**: Payment processing and account checks.

### Logging and monitoring
- **winston**: Structured application logging.
- **rotating-file-stream**: Log rotation for access/app logs.
- **tail**: Live log tailing utilities.

### Sessions, storage, and misc
- **connect-mysql-session**: MySQL session store (declared; Sequelize store is primary).
- **uuid**: Generate unique identifiers.
- **ws**: WebSocket support (declared; reserved for realtime features).
- **dotenv**: Load environment variables from `.env`.

### Front-end/browser-side
- **@fingerprintjs/fingerprintjs**: Browser fingerprinting (declared; used client-side, not via Node require).

### Developer tooling and testing (devDependencies)
- **nodemon**: Auto-reload during development.
- **sequelize-cli**: Migrations/seeders management.
- **mocha**, **chai**, **sinon**: Test runner, assertions, and test doubles.
- **jest**: Alternative test runner (declared alongside mocha).
- **supertest**: HTTP integration testing.

Notes
- Some packages are declared but not referenced directly in server files; they are used in scripts, client-side, or planned features. Keeping them documented avoids confusion and aids audits.

