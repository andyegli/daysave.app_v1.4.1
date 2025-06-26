# DaySave.app – Project Task List

## 1. Project Setup
- [x] Initialize Node.js/Express app structure
- [x] Setup EJS templating and Bootstrap 5 via CDN
- [x] Configure Sequelize ORM and MySQL connection
- [x] Setup .env and environment variable management
- [x] Initialize Docker and Docker Compose
  - [x] Use meaningful container names: daysave-app (app), daysave-db (db)
  - [x] MySQL accessible on host port 3304
  - [x] Use APP_PORT and DB_PORT from .env for port mappings
- [x] Setup GitHub Actions for CI/CD
- [ ] Prepare Google Cloud App Engine and Cloud SQL deployment scripts

## 2. Database Design
- [ ] Design Sequelize models for all entities (users, social_accounts, urls, files, contacts, groups, relationships, admin_settings, etc.)
- [ ] Ensure all tables use UUIDs (CHAR(36))
- [ ] Implement migrations and seeders

## 3. Authentication & Security
- [ ] Implement OAuth (Apple, Google, Microsoft)
- [ ] Implement username/password registration with email verification
- [ ] Add 2FA (TOTP via speakeasy)
- [ ] Setup JWT-based session management with refresh tokens
- [ ] Hash passwords with bcrypt
- [ ] Encrypt sensitive data with AES
- [ ] Device fingerprinting (fingerprintjs2), geoip, VPN detection (maxmind)
- [ ] Implement rate limiting (express-rate-limit)
- [ ] Admin-configurable security settings (login attempts, lock duration, file types, etc.)
- [ ] Input validation and sanitization middleware (express-validator, sanitize-html, libphonenumber-js)
- [ ] CSRF protection (csurf), Helmet, HTTPS

## 4. User Management
- [ ] Registration, login, and profile config pages
- [ ] Language selection and preference storage
- [ ] Subscription plans (trial, paid, Stripe integration)
- [ ] Admin CRUD for users, backup/restore
- [ ] DEV mode: fake login dropdown for test users/admins

## 5. Social Media Integration
- [ ] OAuth flows for all 11 platforms
- [ ] Token refresh and secure storage (crypto)
- [ ] Metadata extraction from DMs/mentions
- [ ] Business APIs for WhatsApp/WeChat

## 6. File & URL Processing
- [ ] File upload (type/size validation, Google Cloud Storage integration)
- [ ] URL submission and validation
- [ ] Metadata extraction, AI summary, sentiment, transcription, tagging, object detection (OpenAI, Google APIs)
- [ ] CRUD APIs for files and URLs
- [ ] Sharing and grouping features
- [ ] Bulk actions (add to group, archive, delete)

## 7. Contacts Management
- [ ] Apple schema contacts CRUD (all fields, multiples)
- [ ] Phone/email validation (libphonenumber-js)
- [ ] Google Maps API for address lookup
- [ ] Groups and relationships management (graph view, vis.js)
- [ ] vCard import/export (with relationships)

## 8. Multilingual & Accessibility
- [ ] Setup i18n with modular locale files (locales/*.json)
- [ ] Implement language selection in profile and default to browser language
- [ ] Localize all UI, emails, and error messages
- [ ] RTL compatibility for future expansion

## 9. UI/UX
- [ ] EJS views for all pages (landing, terms, privacy, contact, dashboard, admin, etc.)
- [ ] Bootstrap 5 styling and custom color scheme
- [ ] Responsive, accessible (WCAG 2.1 AA), SEO-optimized
- [ ] Add meta tags, sitemap, and localized URLs

## 10. Logging & Alerts
- [ ] Integrate Winston for logging (sessions, API calls, shares, alerts)
- [ ] Email alerts (SendGrid), SMS (Twilio), push notification (future)
- [ ] Logging middleware for API and user actions

## 11. Admin & Monitoring
- [ ] Admin dashboard (stats, logs, config, locked accounts)
- [ ] Security config UI and user management
- [ ] View/manage locked accounts, alerts for new users, trial endings, subscribers

## 12. DevOps & Deployment
- [ ] Dockerize app and setup Docker Compose
- [ ] Configure GitHub Actions for CI/CD pipeline
- [ ] Deploy to Google Cloud App Engine and Cloud SQL
- [ ] Setup Redis caching
- [ ] Daily MySQL backups via Cloud SQL
- [ ] SSL with Let's Encrypt

## 13. Testing & Documentation
- [ ] Write unit and integration tests
- [ ] Setup linting and formatting (npm run lint)
- [ ] Write and maintain README and API documentation
- [ ] Document code and keep files <500 lines

---

**Progress Tracking:**
- [ ] Regularly update this file as tasks are completed or added.
- [ ] Mark tasks as [x] when done.
