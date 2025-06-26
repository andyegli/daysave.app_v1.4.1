# Prompt for Windsor: Refactored Production-Ready DaySave.app with File Uploads and Enhanced Features

## Overview
Create a production-ready web application called **DaySave.app** version 1.1.1 using **Node.js**, **Express**, **EJS** (with **Bootstrap 5** via CDN), and **MySQL** with **Sequelize ORM** locally, and later deployed on **Google Cloud** (project ID: `daysave`) using a cost-effective, small-scale setup (e.g., App Engine F1 instance, Cloud SQL db-f1-micro). The app targets international, diverse social media consumers, supporting 100 concurrent users for the MVP with scalability for future growth. It allows users to register for a trial or subscribe to plans via Apple, Google, Microsoft, or username/password authentication (with 2FA), link social media accounts from 11 platforms (Facebook, YouTube, Instagram, TikTok, WeChat, Facebook Messenger, Telegram, Snapchat, Pinterest, Twitter/X, WhatsApp), submit URLs or upload files for processing (extracting metadata, transcription, summary, sentiment, tags, objects detected), and manage processed items with user-added tags, comments, and groups. The app includes a landing page, a futter with terms of trade, privacy policy, contact us page with a form, a contacts management system mirroring Apple iPhone contacts with relationships (e.g., father, mother, child, spouse, sibling, friend, colleague, partner, work), a CRUD page for contacts, sharing of processed content with contacts or groups, filter/search functionality, and an admin page feeaturing statustics, logs, security config settings. It supports multiple languages (English, German, French, Italian, Spanish) for UI, static content, and dynamic content, with RTL compatibility for future expansion. All database tables use UUIDs (GUIDs). The app features state-of-the-art security, input sanitization, device fingerprinting (including Screensize, locales, TOR, VPN detection), IP and country whitelisting/blacklisting, and login attempt blocking, with alerts/reminders via email and SMS (future push notification option).

## Functional Requirements

### 1. Pages
- **Landing Page**:
  - Engaging design with a hero section, app features, and call-to-action (CTA) buttons for trial registration or subscription.
  - Built with EJS, styled with Bootstrap 5 via CDN, using a custom color scheme (#2596be, #a1d8c9, #fbda6a, #d8e2a8, #f0e28b, #87c0a9, #fbce3c, #309b9c, #bfcc8d).
  - Mobile friendly Responsive, SEO-optimized, accessible (WCAG 2.1 AA compliant).
  - Links to terms of trade, privacy policy, contact us, and contacts pages in footer and nafbar menu.
  - Localized content in English, German, French, Italian, Spanish using `i18n`.
- **Terms of Trade**:
  - Static EJS page with legal terms for app usage, subscription, trial policies, content sharing, file uploads, and contact relationships.
  - Styled with Bootstrap 5 via CDN, custom colors.
  - Localized in all supported languages.
  - Include sections on invoices, payment, refunds, and user responsibilities.
- **Privacy Policy**:
  - Static EJS page detailing data collection (e.g., user info, device fingerprint, social media tokens, contacts, relationships, files), usage, and GDPR/CCPA compliance.
  - Styled with Bootstrap 5 via CDN, custom colors.
  - Localized in all supported languages.
  - Explain third-party integrations (e.g., social media APIs, Google APIs, payment providers).
- **Contact Us**:
  - EJS page with a Bootstrap form to collect name, email, subject, and message.
  - Use Google reCAPTCHA to prevent spam.
  - Store submissions in MySQL and send email notifications (SendGrid) in the user’s preferred language.
  - Success/error feedback using Bootstrap alerts.
- **Contacts Management Page**:
  - EJS page with a CRUD interface to add, edit, view, and delete contacts.
  - Mirror Apple iPhone contacts schema (all fields: name, nickname, organization, job title, phones, emails, addresses, social profiles, instant messages, URLs, dates, notes) with support for multiples (e.g., multiple addresses, emails, phone numbers, notes, social accounts).
  - Validate phones as `+CountryCode(AreaCode)Number[Extension][DTMF]` with country code lookup by name (e.g., “United States” → `+1`) using `libphonenumber-js`.
  - Optional Google Maps API integration for address lookup/search.
  - Support contact groups (e.g., "Friends," "Work") and relationships (father, mother, child, spouse, sibling, friend, colleague, partner, work, custom ≤ 50 characters).
  - Display contacts in a Bootstrap tabular view with configurable fields (sortable, orderable) and a detail page for all fields, relationships graph button, and shared posts table.
  - Support vCard import/export (including relationships via custom fields).
  - Localized UI and form labels.
- **DEV Mode User Logins**
  - when started in dev mode the login page features 3 test users 2 admins to coose from on a dropdown 
    allowing to login for testing without having to enter password every time
- **Dashboard**:
  - EJS page displaying linked social accounts, submitted URLs/files, and processing status.
  - Use Bootstrap cards for social accounts, a tabular view for contacts, and a card view for URLs/files.
  - Include forms to submit URLs/files, add tags/comments, assign groups, and share content.
  - Add filter dropdowns (platform, group, tags, date), search bar, and order-by dropdown.
  - Selector and “select all” for bulk actions (add to group, archive, delete).
  - Localized UI, labels, and messages.
- **Profile Config Page**:
  - EJS page with a Bootstrap form to link/unlink social media accounts, select language, and manage subscription.
  - Display linked accounts in a Bootstrap table.
  - Localized UI.
- **Admin/Security Config Page**:
  - EJS page with Bootstrap forms to configure:
    - Login attempts limit (default: 5).
    - Lock duration (default: 24 hours).
    - Auto-unlock toggle (default: enabled).
    - Allowed file types (default: PNG, JPEG, MP4, PDF).
    - Max file size (default: 25MB).
    - IP whitelisting/blacklisting.
    - VPN detection settings.
  - Table to view/manage locked accounts (unlock, view status).
  - Admin only CRUD for user data, backup/restore, alerts for new users, trial endings, subscribers.
  - Localized UI.

### 2. Authentication
- **Registration Options**:
  - OAuth 2.0 login via Apple, Google, Microsoft.
  - Username/password registration with email verification (Nodemailer) and 2FA (TOTP via `speakeasy`) in the user’s preferred language.
- **Subscription Plans**:
  - Free trial (7 days, limited API calls).
  - Paid plans (Basic, Pro) via Stripe for Apple/Google/Microsoft in-app purchases or card payments.
  - Store subscription status in MySQL.
  - Localized subscription UI.
- **Security**:
  - Passwords hashed with bcrypt.
  - JWT-based session management with refresh tokens.
  - API payload encryption using pki AES
  - Email verification and password reset with localized emails.
  - Track login attempts, block users/devices after configurable attempts (default: 5) for configurable duration (default: 24 hours) with auto-unlock toggle.
  - Device fingerprinting with `fingerprintjs2` (including VPN detection with `maxmind`).
  - Store user’s source country (via `geoip-lite`) and fingerprint in MySQL.
  - Localized error messages.

### 3. Social Media Integration
- **Supported Platforms**: Facebook, YouTube, Instagram, TikTok, WeChat, Facebook Messenger, Telegram, Snapchat, Pinterest, Twitter/X, WhatsApp.
- **Profile Config Page**:
  - UI to link/unlink accounts via OAuth 2.0 (or bot tokens for Telegram).
  - Fetch metadata and content (title, thumbnail, link) from DMs/mentions.
  - Ignore unrelated inbound messages.
  - Securely store access tokens/refresh tokens in MySQL (encrypted with `crypto`).
  - Localized UI.
- **OAuth Flow**:
  - Redirect-based OAuth for each platform.
  - Handle token refresh with `node-cron`.
  - Use business APIs for WhatsApp/WeChat if needed.

### 4. URL and File Submission/Processing
- **CRUD API**:
  - **POST /api/urls**: Submit a URL, validate format, extract metadata (thumbnail, title, link, user tags, comments, category, AI-summary, AI-sentiment, AI-transcription, AI-tags, objects, additional metadata, location), store in MySQL.
  - **GET /api/urls**: List URLs with all metadata.
  - **PUT /api/urls/:id**: Update tags, comments, category.
  - **DELETE /api/urls/:id**: Remove URL.
  - **POST /api/files**: Upload file, validate type/size (admin-configurable), store in Google Cloud Storage, process (summary, sentiment, transcription, objects), store link/metadata in MySQL.
  - **GET /api/files**: List files with metadata.
  - **PUT /api/files/:id**: Update tags, comments, category.
  - **DELETE /api/files/:id**: Remove file and storage.
  - Secure with JWT and rate limiting (`express-rate-limit`).
- **Content Handling**:
  - **Text Posts**: Extract text, summarize, tag.
  - **Images**: Use Google Vision API for objects/text.
  - **Videos**: Transcribe with Google Speech-to-Text, extract thumbnail.
  - **Files**: Process based on type (e.g., OCR for PDFs, Vision for images).
- **Grouping/Categorization**:
  - Support hierarchical groups (e.g., fitness/upper body/shoulders).
  - Store in `url_groups`, unlimited groups (name ≤ 50 characters).
  - EJS form to manage groups.
- **Sharing**:
  - Share/unshare URLs/files with unlimited contacts/groups via email (SendGrid) or in-app.
  - Log in `share_logs`.
- **Filter/Search**:
  - Bootstrap dropdowns for platform, group, tags, date.
  - Search by date/time, location, tags, full text using MySQL full-text search.
  - Bulk actions (add to group, archive, delete).

### 5. Contacts Management
- **Schema** (Apple iPhone contacts):
  - All fields (name, nickname, organization, job title, phones, emails, addresses, social profiles, instant messages, URLs, dates, notes) with multiples.
  - Validate phones with `libphonenumber-js`, emails standard format.
- **Relationships**:
  - Table `relationships` with contact_id_1, contact_id_2, relationship_type (father, mother, child, spouse, sibling, friend, colleague, partner, work, custom ≤ 50 characters).
  - UI to manage relationships with graph view button (server-side `vis.js`).
- **CRUD API**:
  - Manage contacts, groups, relationships.
  - Localized responses.
- **UI**:
  - Bootstrap tabular view with configurable fields, detail page, graph view.

### 6. Multilingual Support
- **Languages**: English, German, French, Italian, Spanish.
- **Implementation**:
  - `i18n` with modular files (`locales/*.json`).
  - Language selection in profile, default to browser language.
  - RTL compatibility.
- **Database**: `language` field in `users`, `contact_submissions`, `share_logs`.

### 7. Database Schema
- All tables use UUIDs (CHAR(36)) with `uuid` library.
- **users**: id, username, email, password_hash, country, device_fingerprint, subscription_status, language, created_at.
- **social_accounts**: id, user_id, platform, handle, access_token, refresh_token, created_at.
- **urls**: id, user_id, social_account_id, url, metadata, transcription, summary, sentiment, auto_tags, user_tags, user_comments, category, location, created_at.
- **files**: id, user_id, filename, file_path, metadata, transcription, summary, sentiment, auto_tags, user_tags, user_comments, category, location, created_at.
- **contacts**: id, user_id, all Apple fields with JSON for multiples, created_at.
- **contact_groups**: id, user_id, name, created_at.
- **contact_group_members**: id, contact_id, group_id, created_at.
- **url_groups**: id, user_id, name, created_at.
- **share_logs**: id, user_id, url_id/file_id, contact_id/group_id, share_method, language, created_at.
- **login_attempts**: id, user_id, device_fingerprint, ip, attempt_count, last_attempt_at.
- **contact_submissions**: id, name, email, subject, message, language, created_at.
- **relationships**: id, user_id, contact_id_1, contact_id_2, relationship_type, created_at.
- **admin_settings**: id, user_id, login_attempts, lock_duration, auto_unlock, file_types, max_file_size, ip_whitelist, ip_blacklist, created_at.

### 8. Security and Input Sanitization
- **Input Sanitization**: `express-validator`, `sanitize-html`, `libphonenumber-js`.
- **Security Features**: HTTPS (Let’s Encrypt), Helmet, CSRF, AES-256 encryption, OWASP practices.
- **Login Blocking**: Configurable attempts/duration, auto-unlock, admin management.
- **IP/VPN**: Whitelisting/blacklisting, fingerprinting with `maxmind`.

### 9. Alerts/Reminders
- Email (SendGrid), SMS (Twilio), future push notifications.
- Triggered for contacts (e.g., birthdays), posts (e.g., follow-ups).

### 10. Technical Requirements
- **Backend**: Node.js, Express, MySQL (Cloud SQL).
- **Frontend**: EJS, Bootstrap 5 via CDN (`https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css`, `https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js`).
- **Database**: Sequelize ORM, indexes on key fields.
- **APIs**: Apple/Google/Microsoft OAuth, Stripe, social media APIs, Google (Speech-to-Text, Vision, Maps), OpenAI, MonkeyLearn, SendGrid, Twilio, reCAPTCHA.
- **Caching**: Redis.
- **Security**: `bcrypt`, `jsonwebtoken`, `crypto`, `helmet`, `csurf`, `fingerprintjs2`, `maxmind`, `speakeasy`.
- **Logging**: Winston (sessions, API calls, shares, alerts).

### 11. Deployment
- **Platform**: Google Cloud App Engine (F1 instance).
- **CI/CD**: GitHub Actions.
- **SSL**: Let’s Encrypt.
- **Scaling**: Auto-scaling, Redis caching.
- **Backup**: Daily MySQL backups via Cloud SQL.

### 12. Non-Functional Requirements
- **Performance**: Page load < 2s, API response < 500ms.
- **Scalability**: 100 concurrent users (MVP), scalable later.
- **Availability**: 99.9% uptime.
- **Security**: OWASP Top 10, GDPR/CCPA.
- **Accessibility**: WCAG 2.1 AA.
- **SEO**: Meta tags, sitemap, localized URLs.

### 13. Deliverables
1. **Source Code**:
   - Backend: `app.js`, `routes/*.js`, `models/*.js`.
   - Frontend: `views/*.ejs`.
   - Styles: `public/styles.css`.
   - Translations: `locales/*.json`.
2. **Documentation**:
   - Setup guide, API specs, user guide (`docs/*.md`).
   - Inline comments, modular code (≤ 500 lines/file).
3. **Deployment Scripts**: Docker Compose, `app.yaml`.
4. **Tests**: Jest (unit), Cypress (E2E).

### 14. Success Criteria
- Users can register/login with OAuth/2FA.
- Link/unlink 11 social media accounts, process DMs/mentions.
- Submit URLs/files, extract all specified metadata, manage with tags/comments/groups.
- Manage contacts (CRUD), groups, relationships (with graph view), share with contacts/groups.
- Filter/search URLs/files, bulk actions.
- Admin configures security, file types/size, manages users/locks.
- Supports English, German, French, Italian, Spanish with RTL compatibility.
- Security features (sanitization, fingerprinting, IP management) functional.
- All tables use UUIDs.
- Deployed on `daysave.app`, handles 100 users, meets performance metrics.
- Pages are accessible, SEO-optimized, styled with custom Bootstrap.

### 15. Notes
- Use Twitter/X as WhatsApp/WeChat fallback.
- Respect API rate limits with caching/retry logic.
- Submit social media apps for review early.
- Use `.env` for secrets.
- Monitor with Sentry/New Relic.
- Validate data with `validator.js`.
- Plan for mobile apps/browser extensions with “share to” functionality.
- Add alerts/reminders for contacts/posts.
