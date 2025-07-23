# Prompt for AI: Refactored Production-Ready DaySave.app with File Uploads and Enhanced Features

## Overview
Create a production-ready web application called **DaySave.app** version 1.4.1 using **Node.js**, **Express**, **EJS** (with **Bootstrap 5** via CDN), and **MySQL** with **Sequelize ORM** locally, and later deployed on **Google Cloud** (project ID: `daysave`) using a cost-effective, small-scale setup (e.g., App Engine F1 instance, Cloud SQL db-f1-micro). The app targets international, diverse social media consumers, supporting 100 concurrent users for the MVP with scalability for future growth. It allows users to register for a trial or subscribe to plans via Apple, Google, Microsoft, or username/password authentication (with 2FA), link social media accounts from 11 platforms (Facebook, YouTube, Instagram, TikTok, WeChat, Facebook Messenger, Telegram, Snapchat, Pinterest, Twitter/X, WhatsApp), submit URLs or upload files for processing (extracting metadata, transcription, summary, sentiment, tags, objects detected), and manage processed items with user-added tags, comments, and groups. The app includes a landing page, a footer with terms of trade, privacy policy, contact us page with a form, a contacts management system mirroring Apple iPhone contacts with relationships (e.g., father, mother, child, spouse, sibling, friend, colleague, partner, work), a CRUD page for contacts with advanced features (dynamic forms, autocomplete, Google Maps integration, custom labels), sharing of processed content with contacts or groups of contacts, filter/search functionality with live search and autocomplete, and an admin page featuring statistics, logs, security config settings. The app must carefully log all changes in an audit log. The app also keeps track of the device the user typically logs in from. The app supports roles permissions such as guest, trial, subscriber, monitor, admin. It supports multiple languages (English, German, French, Italian, Spanish) for UI, static content, and dynamic content, with RTL compatibility for future expansion. All database tables use UUIDs (GUIDs). The app features state-of-the-art security, input sanitization, device fingerprinting (including Screensize, locales, TOR, VPN detection), IP and country whitelisting/blacklisting, login attempt blocking, and Content Security Policy (CSP), with alerts/reminders via email and SMS (future push notification option).

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
  - Store submissions in MySQL and send email notifications (SendGrid) in the user's preferred language.
  - Success/error feedback using Bootstrap alerts.
- **Contacts Management Page**:
  - EJS card style with toggle to list page with a CRUD interface to add, edit, view, and delete contacts.
  - Mirror Apple iPhone contacts schema (all fields: name, nickname, organization, job title, phones, emails, addresses, social profiles, instant messages, URLs, dates, notes) with support for multiples (e.g., multiple addresses, emails, phone numbers, notes, social accounts).
  - Contacts can organised in groups and have relationships (e.g., father, mother, child, spouse, sibling, friend, colleague, partner, work)
  - Validate phones as `+CountryCode(AreaCode)Number[Extension][DTMF]` with country code lookup by name (e.g., "United States" → `+1`) using `libphonenumber-js`.
  - Optional Google Maps API integration for address lookup/search.
  - Support contact groups (e.g., "Friends," "Work") and relationships (father, mother, child, spouse, sibling, friend, colleague, partner, work, custom ≤ 50 characters).
  - Display contacts in a Bootstrap tabular view with configurable fields (sortable, orderable) and a detail page for all fields, relationships graph button, and shared posts table.
  - Support vCard import/export (including relationships via custom fields).
  - Localized UI and form labels.
- **Content Management Page**:
  - EJS card style with toggle to list page with a CRUD interface to add, edit, view, and delete contacts.
  - Cards have a Thumbnail on the left a tile on the top with comment unde rtitle and to the right of the thumnail. there are clickable tag associated with the centent item, the source and date added is also on the content card as wll as buttons.
  - dooubble clicking the content card opens the edit content detail page
  - Content can organised groups 
  - content can be filered by date range, tags from tags, category from categories
  - content can via a drop down by category, source,  date added asc, date added desc, 
  - Display contacts in a Bootstrap tabular view with configurable fields (sortable, orderable) and a detail page for all fields, relationships graph button, and shared posts table.
  - Support vCard import/export (including relationships via custom fields).
  - Localized UI and form labels.
  **Content Item Detail Page**
  - has all content dails allow edit, delete, archive 
  - has graph button to show related conent items
- **DEV Mode User Logins**
  - when started in dev mode the login page features 3 test users 2 admins to coose from on a dropdown 
    allowing to login for testing without having to enter password every time
- **Dashboard**:
  - EJS page displaying linked social accounts, submitted URLs/files, and processing status.
  - Use Bootstrap cards for content, a tabular view for contacts, and a card view for URLs/files.
  - Include forms to submit URLs/files, add tags/comments, assign groups, and share content.
  - Add filter dropdowns (platform, group, tags, date), search bar, and order-by dropdown.
  - Selector and "select all" for bulk actions (add to group, archive, delete).
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
  - Username/password registration with email verification (Nodemailer) and 2FA (TOTP via `speakeasy`) in the user's preferred language.
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
  - Store user's source country (via `geoip-lite`) and fingerprint in MySQL.
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

### 4. URL and File Submission/Processing with Multimedia Analysis
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
- **API Key Management for 3rd Party Access**:
  - **User API Key Generation**: Users can generate, download, enable/disable API keys
  - **Granular Permissions**: Route-specific access control with read/write privileges
  - **Usage Analytics**: Comprehensive statistics, cost tracking, and performance metrics
  - **Admin Oversight**: Administrator dashboard for key management and monitoring
  - **Security Features**: Expiry dates, failed attempt monitoring, audit logging
  - **Rate Limiting**: Per-key rate limits and IP restrictions
- **Multimedia Analysis Integration**:
  - **Automatic Processing**: When multimedia URLs are submitted, automatic AI analysis runs in background
  - **Supported Platforms**: YouTube, Vimeo, TikTok, Instagram, Facebook, Twitter, SoundCloud, Spotify, direct video/audio files
  - **Analysis Features**:
    - **Audio Transcription**: Google Cloud Speech-to-Text with speaker identification
    - **Speaker Recognition**: Voice print identification with confidence scoring
    - **Sentiment Analysis**: Emotional tone detection and scoring
    - **Thumbnail Generation**: Key moment thumbnails for video content
    - **OCR Text Extraction**: Text recognition from video frames and images
    - **Content Summarization**: AI-generated summaries and auto-tagging
  - **Non-blocking Workflow**: Users get immediate response while analysis runs in background
  - **Progressive Enhancement**: Real-time updates with live status indicators
- **Content Handling**:
  - **Text Posts**: Extract text, summarize, tag.
  - **Images**: Use Google Vision API for objects/text.
  - **Videos**: Transcribe with Google Speech-to-Text, extract thumbnail, identify speakers, generate key moments.
  - **Audio**: Full transcription with speaker identification, sentiment analysis, voice print recognition.
  - **Files**: Process based on type (e.g., OCR for PDFs, Vision for images, Speech-to-Text for audio).
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
  - Advanced search with field-specific queries and autocomplete suggestions.

### 5. Contacts Management
- **Schema** (Apple iPhone contacts):
  - All fields (name, nickname, organization, job title, phones, emails, addresses, social profiles, instant messages, URLs, dates, notes) with multiples.
  - Validate phones with `libphonenumber-js`, emails standard format.
  - Support for custom labels for all field types (emails, phones, addresses, social profiles, notes).
- **Relationships**:
  - Table `relationships` with contact_id_1, contact_id_2, relationship_type (father, mother, child, spouse, sibling, friend, colleague, partner, work, custom ≤ 50 characters).
  - UI to manage relationships with graph view button (server-side `vis.js`).
- **CRUD API**:
  - Manage contacts, groups, relationships.
  - Localized responses.
  - Advanced search endpoint with field-specific queries (e.g., `email:john@example.com`, `phone:+1234567890`).
  - Autocomplete endpoint for all contact fields.
- **UI**:
  - Bootstrap tabular view with configurable fields, detail page, graph view.
  - Dynamic form fields with "+" buttons to add multiple emails, phones, addresses, social profiles, and notes.
  - Google Maps integration for address fields with location pin and modal map display.
  - Live search functionality with highlighting, advanced queries, and no-results message.
  - Autocomplete for all input fields (name, email, phone, address, social, note, custom labels).
  - Admin features: view contact owners, filter by owner, edit/delete any contact.
  - Content Security Policy (CSP) compliant with external JavaScript files.

### 6. Multilingual Support
- **Languages**: English, German, French, Italian, Spanish.
- **Implementation**:
  - `i18n` with modular files (`locales/*.json`).
  - Language selection in profile, default to browser language.
  - RTL compatibility.
- **Database**: `language` field in `users`, `contact_submissions`, `share_logs`.

### 7. Database Schema with Multimedia Analysis
- All tables use UUIDs (CHAR(36)) with `uuid` library.
- **Database Strategy**: Sequelize CLI Migrations (not automatic sync)
- **Environment Variables**: Standardized on DB_USER_PASSWORD (not DB_PASSWORD)
- **Migration Order**: 26 migrations in correct dependency order
- **Tables Created**: 26 tables with proper foreign key relationships including multimedia analysis
- **Status**: All migrations successfully applied and verified

**Core Database Tables:**
- **users**: id, username, email, password_hash, role_id, country, device_fingerprint, subscription_status, language, created_at.
- **user_devices**: id, user_id, device_fingerprint, is_trusted, last_login_at.
- **roles**: id, name, description.
- **permissions**: id, name, description.
- **role_permissions**: id, role_id, permission_id.
- **audit_logs**: id, user_id, action, target_type, target_id, details, created_at.
- **social_accounts**: id, user_id, platform, handle, access_token, refresh_token, created_at.
- **content**: id, user_id, social_account_id, url, metadata, transcription, summary, sentiment, auto_tags, user_tags, user_comments, category, location, created_at.
- **files**: id, user_id, filename, file_path, metadata, transcription, summary, sentiment, auto_tags, user_tags, user_comments, category, location, created_at. (Supports images, videos, audio, and documents with AI analysis)
- **contacts**: id, user_id, all Apple fields with JSON for multiples, created_at.
- **contact_groups**: id, user_id, name, created_at.
- **contact_group_members**: id, contact_id, group_id, created_at.
- **content_groups**: id, user_id, name, created_at.
- **content_group_members**: id, content_id, group_id, created_at.
- **share_logs**: id, user_id, content_id/file_id, contact_id/group_id, share_method, language, created_at.
- **login_attempts**: id, user_id, device_fingerprint, ip, attempt_count, last_attempt_at.
- **contact_submissions**: id, name, email, subject, message, language, created_at.
- **relationships**: id, user_id, contact_id_1, contact_id_2, relationship_type, created_at.
- **contact_relations**: id, user_id, contact_id_1, contact_id_2, relation_type, created_at.
- **content_relations**: id, user_id, content_id_1, content_id_2, relation_type, created_at.
- **admin_settings**: id, user_id, login_attempts, lock_duration, auto_unlock, file_types, max_file_size, ip_whitelist, ip_blacklist, created_at.

**Multimedia Analysis Tables:**
- **video_analysis**: id, content_id, user_id, title, description, duration, language, quality_score, processing_status, sentiment_score, sentiment_label, word_count, speaker_count, thumbnail_count, ocr_text_count, analysis_started_at, analysis_completed_at, error_message, metadata, created_at, updated_at.
- **speakers**: id, content_id, user_id, speaker_name, voice_print_hash, confidence_score, first_appearance_time, last_appearance_time, total_speaking_time, word_count, recognition_status, voice_characteristics, training_data_quality, usage_count, last_used_at, is_verified, verification_method, notes, metadata, created_at, updated_at.
- **thumbnails**: id, content_id, user_id, thumbnail_url, thumbnail_path, key_moment_time, confidence_score, description, width, height, file_size, format, generation_method, is_primary, view_count, last_viewed_at, expires_at, storage_location, processing_status, error_message, metadata, created_at, updated_at.
- **ocr_captions**: id, content_id, user_id, text_content, confidence_score, start_time, end_time, bounding_box, language, font_info, text_type, processing_method, is_verified, verification_method, correction_count, last_corrected_at, usage_count, metadata, created_at, updated_at.

**Migration Commands:**
- `npx sequelize-cli db:migrate` – run database migrations
- `npx sequelize-cli db:migrate:status` – check migration status
- `npx sequelize-cli db:migrate:undo` – undo last migration

### 8. Security and Input Sanitization
- **Input Sanitization**: `express-validator`, `sanitize-html`, `libphonenumber-js`.
- **Security Features**: HTTPS (Let's Encrypt), Helmet, CSRF, AES-256 encryption, OWASP practices.
- **Content Security Policy (CSP)**: Configured to allow Google Maps, Google Fonts, and external scripts while blocking inline scripts for security.
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
- **Multimedia Processing**: 
  - **Google Cloud Speech-to-Text**: Audio transcription with speaker identification
  - **Google Cloud Vision**: OCR text extraction from video frames and images
  - **FFmpeg**: Video processing, thumbnail generation, audio extraction
  - **Node-fetch**: URL content fetching and metadata extraction
  - **Cheerio**: HTML parsing for social media content
  - **Document Processing**: PDF, Word, and text file analysis with AI-powered summaries
    - **PDF Analysis**: Text extraction using pdf-parse library with AI title/summary generation
    - **Word Document Processing**: .doc/.docx text extraction using mammoth library
    - **Text File Processing**: Plain text and RTF file analysis with intelligent content summarization
    - **AI-Powered Analysis**: Google Gemini AI generates meaningful titles, summaries, and relevant tags
    - **Unified Content Display**: Documents display with same 4-line format as videos (title → comment → summary → tags)
- **Caching**: Redis.
- **Security**: `bcrypt`, `jsonwebtoken`, `crypto`, `helmet`, `csurf`, `fingerprintjs2`, `maxmind`, `speakeasy`.
- **Logging**: Winston (sessions, API calls, shares, alerts, multimedia analysis).
- **JavaScript**: External JS files for CSP compliance, autocomplete functionality, dynamic form handling, AI analysis modals.

### 11. Deployment
- **Platform**: Google Cloud App Engine (F1 instance).
- **CI/CD**: GitHub Actions.
- **SSL**: Let's Encrypt.
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
- Advanced contact search with autocomplete, field-specific queries, and highlighting.
- Dynamic contact forms with custom labels, Google Maps integration, and autocomplete for all fields.
- Admin features: view contact owners, filter by owner, edit/delete any contact.
- Filter/search URLs/files, bulk actions.
- Admin configures security, file types/size, manages users/locks.
- Supports English, German, French, Italian, Spanish with RTL compatibility.
- Security features (sanitization, fingerprinting, IP management, CSP) functional.
- All tables use UUIDs.
- Deployed on `daysave.app`, handles 100 users, meets performance metrics.
- Pages are accessible, SEO-optimized, styled with custom Bootstrap.

### 15. Latest Implemented Features (v1.4.1)
- **Multimedia Analysis Integration**:
  - **Automatic AI Analysis**: When multimedia URLs are submitted, comprehensive analysis runs in background
  - **Audio Transcription**: Google Cloud Speech-to-Text with speaker identification and voice print recognition
  - **Video Processing**: Thumbnail generation, key moment detection, OCR text extraction
  - **Sentiment Analysis**: Real-time emotion detection and scoring with visual indicators
  - **Speaker Management**: Voice print database with confidence scoring and usage statistics
  - **AI Analysis UI**: Enhanced content cards with visual analysis indicators and detailed modal views
    - **Scrollable Modal**: AI Analysis Results Modal supports scrollable content for large analysis results
    - **Summary Editing**: Inline edit functionality for AI-generated summaries with save/cancel options
    - **Copy to Clipboard**: One-click copy functionality for summaries with visual feedback
    - **Content Card Copy**: Copy buttons in transcription summaries on content cards with smart validation
    - **Smart Placeholders**: Informative placeholders when AI summaries are not available
    - **Enhanced UX**: Success notifications, error handling, and responsive design
  - **Advanced AI Tag Generation System V2 (Latest)**:
    - **Intelligent Content Analysis**: Completely replaced generic platform tags with AI-powered content understanding
    - **Enhanced AI Prompting**: GPT-4 powered tag generation with specific examples and anti-generic term filtering
    - **Quality-First Approach**: Strict filtering rejects generic terms like "video", "audio", "youtube", "social", "media"
    - **Content-Based Tags**: Generates specific, meaningful tags like "recognition-challenges", "rowan-atkinson", "british-humor", "celebrity-lookalike" instead of generic "youtube", "video"
    - **Smart Priority System**: AI-generated content tags take priority over platform-detection tags
    - **15+ Category Support**: Enhanced fallback system for cooking, technology, sports, news, education, entertainment
    - **Context-Aware Platform Tags**: Platform identifiers only added when they provide actual context value
  - **Face Recognition Infrastructure (Latest)**:
    - **Comprehensive Face Database**: UUID-based faces table with full audit trail and relationship tracking
    - **AI-Powered Name Suggestions**: OpenAI integration for intelligent face identification and naming
    - **Privacy-First Design**: Built-in privacy controls and user confirmation systems for face identification
    - **Face Grouping**: Advanced face grouping system for organizing related detections across content
    - **Quality Assessment**: Face quality scoring and primary face detection for content thumbnails
    - **Learning System**: Machine learning data storage for improving recognition accuracy over time
    - **Processing Integration**: Seamless integration with existing multimedia analysis workflow
  - **Automated Image Analysis**: Complete pipeline for image content analysis and description generation
    - **Image URL Detection**: Automatic detection of image URLs from major hosting platforms (Imgur, Flickr, Pinterest, etc.)
    - **AI Image Description**: Google Vision AI object detection combined with OpenAI GPT-4 natural language descriptions
    - **Summary Generation**: Automatic summarization of image descriptions using the same pipeline as video transcriptions
    - **Sentiment Analysis**: Mood and emotional context detection from image descriptions
    - **Unified Display**: Images descriptions displayed in content cards and AI Analysis Modal like video transcriptions
    - **Smart Indicators**: Different icons and labels for image descriptions vs video transcriptions
    - **Copy Support**: Full copy functionality for image descriptions with appropriate user feedback
  - **Real-time Updates**: Progressive enhancement with live status updates every 10 seconds
      - **Platform Support**: YouTube, Vimeo, TikTok, Instagram, Facebook, Twitter, SoundCloud, Spotify, Imgur, Flickr, Pinterest, direct files (video/audio/image)
  - **Database Integration**: 4 new multimedia analysis tables with UUID architecture
  - **RESTful API**: Comprehensive multimedia analysis endpoints with proper error handling
- **Contact Management Enhancements**:
  - Dynamic form fields with "+" buttons for adding multiple emails, phones, addresses, social profiles, and notes.
  - Custom label support for all field types with "Other..." option and prompt for custom labels.
  - Google Maps integration with location pins and modal map display for addresses.
  - Advanced search functionality with server-side processing, highlighting, and field-specific queries.
  - Live search with AJAX, highlighting matches, and no-results message.
  - Autocomplete for all contact form fields (name, email, phone, address, social, note, custom labels).
  - Admin features: view contact owners in list, filter contacts by owner, edit/delete any contact.
- **Security Improvements**:
  - Content Security Policy (CSP) implementation blocking inline scripts.
  - External JavaScript files for CSP compliance.
  - Google Maps and Google Fonts domains whitelisted in CSP.
- **User Experience**:
  - Responsive design with Bootstrap 5 styling.
  - Keyboard navigation support for autocomplete (arrow keys, enter, escape).
  - Debounced search to reduce server load.
  - Mobile-friendly interface with proper touch targets.

### 16. Notes
- Use Twitter/X as WhatsApp/WeChat fallback.
- Respect API rate limits with caching/retry logic.
- Submit social media apps for review early.
- Use `.env` for secrets.
- Monitor with Sentry/New Relic.
- Validate data with `validator.js`.
- Plan for mobile apps/browser extensions with "share to" functionality.
- Add alerts/reminders for contacts/posts.

### Sequelize Model Pattern
- All models must export a function (sequelize, DataTypes) => Model.
- Do not import sequelize or DataTypes directly in model files; use the arguments provided by models/index.js.
- See AGENT.md for the full specification and rationale.

## Requirements & Features (2024-06-26)

- Authentication: Apple, Google, Microsoft OAuth; email/password; 2FA for admin (optional for users, user-selectable); cost-effective email verification (SendGrid recommended).
- User Management: Username non-editable; users disabled not deleted; self-service account closure; Free/Small/Medium/Large/Unlimited plans; Stripe & PayPal (Stripe setup needed); admin UI for CRUD/backup/restore.
- Social Media: YouTube, Facebook, Instagram prioritized; tokens in .env preferred; automatic metadata extraction.
- File/URL: Admin-configurable file types/size; local storage per user in dev, Google Cloud in prod; AI features (summary, sentiment, transcription, tagging) run automatically.
- Contacts: CSV import at launch (sample in docs/README); custom fields; graph and count visualization of relationships.
- Multilingual: English, German, Italian, French, Spanish (auto-translate for now); generate locales/*.json; mobile/tablet friendly.
- UI/UX: Use provided color scheme; public landing page.
- DevOps: Staging/prod best practices; manual DB backup at start; cost-effective monitoring/alerting (suggestions pending).
- Testing: Unit > Integration > E2E; OpenAPI/Swagger docs; best practice linting/style.

See AGENT.md for full specification and rationale.

## Contact Form Dynamic Features & Google Maps Autocomplete

- The contact form supports dynamic addition/removal of emails, phones, addresses, socials, and notes.
- Each address field is automatically initialized with Google Maps Places Autocomplete, using robust selector logic to ensure all fields are found, regardless of naming or rendering order.
- The autocomplete initialization is triggered on page load, window load, and after a short delay to ensure all fields are handled, even if rendered late.
- If you change the address input naming convention, update the selector logic in `public/js/contact-maps-autocomplete.js`.
- All code is thoroughly commented for maintainability.

### Script Order & Initialization
- Ensure that `contact-maps-autocomplete.js` is loaded after the Google Maps API script and before any dynamic field scripts.
- The global callback `initContactMaps` is used for Google Maps API loading.

### Troubleshooting
- If address autocomplete does not work, check the browser console for selector logs and errors.
- Ensure the API key is valid and the required APIs are enabled.
- For new field types, update the selector logic as needed.

## Database Backup System (v1.4.1)

### Enterprise-Grade Data Protection
DaySave implements a comprehensive database backup system with three independent backup methods for complete data protection and disaster recovery:

#### MySQLDump Backup Method
- **Traditional SQL Backup**: Industry-standard backup using MySQL client tools
- **File Format**: Standard SQL files (1.65 MB average) with complete schema and data
- **Compatibility**: Cross-platform compatible, widely supported by database tools
- **Restore Process**: Simple MySQL import with standard restoration procedures
- **Use Case**: Traditional database backups, migration between environments, industry compliance

#### Raw SQL Backup Method  
- **Complete Database Dump**: Comprehensive backup using direct SQL queries
- **Coverage**: All 41 database tables including system tables (SequelizeMeta, Sessions)
- **File Format**: Structured JSON export (2.1 MB) with complete metadata
- **Data Scope**: 634+ total records including system state and legacy data
- **Use Case**: Complete disaster recovery, full system snapshots, forensic analysis

#### Sequelize Model-Based Backup
- **Application-Focused**: Clean backup using defined Sequelize models
- **Coverage**: 38 application tables with 580+ application records  
- **File Format**: Structured JSON with auto-generated restore scripts
- **Data Quality**: Only includes tables with defined models (cleaner, application-focused)
- **Use Case**: Application data backups, structured data exports, development snapshots

### Administrative Features
- **Automated Scheduling**: Configurable backup intervals and retention policies
- **Backup Management**: Organized storage with timestamps and comprehensive metadata
- **Restore Capabilities**: Multiple restore options with validation and rollback support
- **Security**: Encrypted backups with access control and audit logging
- **Monitoring**: Backup health monitoring with notification alerts
- **Storage Options**: Local storage and cloud storage integration support

### Technical Implementation
- **Schema Validation**: Automatic detection and resolution of database schema issues
- **Error Handling**: Robust error handling with graceful degradation and retry mechanisms
- **Performance**: Optimized for minimal impact on production operations
- **Documentation**: Complete setup guides, troubleshooting, and recovery procedures
- **Integration**: Seamless integration with existing admin panel and monitoring systems

## Recent Updates & Fixes (January 2025)

### Content Management System Improvements
- **Fixed Logger Errors**: Resolved critical logger method errors that were preventing content updates and tag management. Changed non-existent `logger.user.contentUpdate` and `logger.user.contentGroupUpdate` calls to use the correct `logger.user.contentEdit` method.
- **Enhanced Summary Display**: Improved content card summary display from 1 line to 4+ lines (100px height) with better readability (line-height: 1.6, font-size: 0.85rem) and scrollable overflow for longer summaries.
- **Removed UI Clutter**: Eliminated redundant "Transcription Summary" label to optimize space usage and improve visual hierarchy.

### File Analysis & Image Description Integration  
- **New File Analysis Endpoint**: Created `/files/:id/analysis` endpoint to retrieve analysis data for uploaded files, handling image descriptions and summaries with proper content type detection.
- **Frontend Analysis Detection**: Updated JavaScript to automatically detect file vs content pages and use appropriate analysis endpoints (`/files/:id/analysis` vs `/content/:id/analysis`).
- **Copy to Clipboard**: Added copy buttons for both summary and description in detail modal with proper styling and user feedback.
- **Fixed Image Analysis Display**: Resolved missing image descriptions and summaries in both content cards and detail modals for uploaded files.

### User Experience Enhancements
- **Seamless File/Content Integration**: Frontend now handles both uploaded files and URL-based content uniformly with intelligent content type detection.
- **Improved Modal Interactions**: Enhanced detail modals with copy functionality and better data presentation.
- **Enhanced Error Handling**: Added proper error logging, improved user feedback, and better debugging capabilities.
- **Consistent Behavior**: Ensured consistent analysis display behavior between file and content management systems.

## Content Management UX

### Advanced Filter Bar Features
- Filter bar above content cards with:
  - **Category filter:** Dropdown with all unique categories, clear button, and auto-submit on change.
  - **Tag filter:** Text input with autocomplete (all unique tags), supports multiple tags (comma/space separated, OR logic, partial/case-insensitive match), clear button, and auto-submit on Enter or clear.
  - **Date range filter:** From/To date pickers, clear buttons, and auto-submit on change.
- All filters update the view instantly when changed (no need to click Filter button, but button is still available).
- Each filter has a small clear/reset button to clear only that field and immediately update the view.
- Filtering is robust, user-friendly, and works with large tag/category sets.
