# DaySave.app – Project Task List

## 0. Repository Setup
- [x] Create GitHub repository (e.g., daysave-app)
- [x] Push local code to GitHub repository
- [x] Add GitHub Actions secrets (DOCKERHUB_USERNAME, DOCKERHUB_TOKEN, etc.)

## 1. Project Setup
- [x] Initialize Node.js/Express app structure
- [x] Setup EJS templating and Bootstrap 5 via CDN
- [x] Configure Sequelize ORM and MySQL connection
- [x] Setup .env and environment variable management
- [x] Add Google Cloud SQL connection variables (GCLOUD_PROJECT_ID, GCLOUD_REGION, GCLOUD_SQL_INSTANCE, GCLOUD_SQL_CONNECTION_NAME)
- [x] Set MYSQL_ROOT_PASSWORD in docker-compose.yml using DB_PASSWORD from .env
- [x] Initialize Docker and Docker Compose
  - [x] Use meaningful container names: daysave-app (app), daysave-db (db)
  - [x] MySQL accessible on host port 3304
  - [x] Use APP_PORT and DB_PORT from .env for port mappings
- [x] Setup GitHub Actions for CI/CD
- [x] Prepare Google Cloud App Engine and Cloud SQL deployment scripts
  - [x] Update app.yaml to use GCLOUD_SQL_CONNECTION_NAME from .env

## 2. Database Design & Implementation
- [x] Design Sequelize models for all entities (users, user_devices, roles, permissions, role_permissions, audit_logs, social_accounts, content, files, contacts, contact_groups, contact_group_members, content_groups, content_group_members, share_logs, login_attempts, contact_submissions, relationships, contact_relations, content_relations, admin_settings)
- [x] Ensure all tables use UUIDs (CHAR(36))
- [x] Setup Sequelize CLI and config to use environment variables
- [x] Generate and run migrations for all models
- [x] **CHOSEN STRATEGY: Sequelize CLI Migrations** - Using migration files for schema management instead of automatic sync
- [x] **ENVIRONMENT VARIABLES FIXED** - Standardized on DB_USER_PASSWORD (not DB_PASSWORD)
- [x] **DOCKER REBUILD** - Rebuilt container to include updated migration files
- [x] **MIGRATION ORDER VERIFIED** - All 22 migrations run successfully in correct order
- [x] Test and verify database schema in MySQL ✅ **COMPLETED**
  - [x] All 22 tables created successfully
  - [x] All foreign key relationships established correctly
  - [x] Migration status: All migrations marked as "up"
  - [x] Database accessible and functional
- [ ] Implement seeders (optional)
- [x] Refactor all Sequelize models to use (sequelize, DataTypes) export pattern and update model initialization in models/index.js

## 3. Authentication & Security
- [x] Implement OAuth (Apple, Google, Microsoft) ✅ **COMPLETED**
  - [x] Google OAuth strategy with detailed logging
  - [x] Microsoft OAuth strategy with detailed logging  
  - [x] Apple OAuth strategy with detailed logging
  - [x] OAuth routes and callback handling
  - [x] Social account linking and user creation
  - [x] Comprehensive OAuth setup documentation
- [ ] Implement username/password registration with email verification
- [ ] Add 2FA (TOTP via speakeasy)
- [ ] Setup JWT-based session management with refresh tokens
- [ ] Hash passwords with bcrypt
- [ ] Encrypt sensitive data with AES
- [ ] Device fingerprinting (fingerprintjs2), geoip, VPN detection (maxmind), TOR detection
- [x] Implement rate limiting (express-rate-limit) ✅ **COMPLETED**
  - [x] Auth-specific rate limiting (5 attempts per 15 minutes)
  - [x] API rate limiting (100 requests per 15 minutes)
  - [x] Configurable rate limiters with detailed logging
- [ ] Admin-configurable security settings (login attempts, lock duration, file types, etc.)
- [x] Input validation and sanitization middleware (express-validator, sanitize-html, libphonenumber-js) ✅ **COMPLETED**
  - [x] User registration and login validation
  - [x] Contact and content validation
  - [x] Input sanitization middleware
  - [x] Comprehensive validation error handling
- [x] CSRF protection (csurf), Helmet, HTTPS ✅ **COMPLETED**
  - [x] CSRF token validation for non-GET requests
  - [x] Security headers with Helmet
  - [x] CORS configuration with origin validation
  - [x] Content Security Policy implementation

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
- [x] Integrate Winston for logging (sessions, API calls, shares, alerts) ✅ **COMPLETED**
  - [x] Auth-specific logging with detailed OAuth flow tracking
  - [x] Security event logging (rate limits, CORS, CSRF)
  - [x] Validation error logging
  - [x] General error logging with stack traces
  - [x] Log directory creation with fallback logic
  - [x] Log viewer utility for analysis
- [ ] Email alerts (SendGrid), SMS (Twilio), push notification (future)
- [x] Logging middleware for API and user actions ✅ **COMPLETED**
  - [x] Request logging middleware
  - [x] Authentication attempt logging
  - [x] Error logging middleware

## 11. Admin & Monitoring
- [ ] Admin dashboard (stats, logs, config, locked accounts)
- [ ] Security config UI and user management
- [ ] View/manage locked accounts, alerts for new users, trial endings, subscribers

## 12. DevOps & Deployment
- [x] Dockerize app and setup Docker Compose ✅ **COMPLETED**
- [x] Configure GitHub Actions for CI/CD pipeline ✅ **COMPLETED**
- [ ] Deploy to Google Cloud App Engine and Cloud SQL
- [ ] Setup Redis caching
- [ ] Daily MySQL backups via Cloud SQL
- [ ] SSL with Let's Encrypt

## 13. Testing & Documentation
- [x] Write unit and integration tests ✅ **COMPLETED**
  - [x] Database integration tests with comprehensive coverage
  - [x] Test data generation and cleanup
  - [x] Logging integration tests
- [ ] Setup linting and formatting (npm run lint)
- [x] Write and maintain README and API documentation ✅ **COMPLETED**
  - [x] Comprehensive README with setup instructions
  - [x] OAuth setup guide with detailed provider instructions
  - [x] Database strategy documentation
- [x] Document code and keep files <500 lines ✅ **COMPLETED**
- [x] Always use the (sequelize, DataTypes) export pattern for all new and updated Sequelize models ✅ **COMPLETED**
- [x] If the model pattern changes, update AGENT.md and DaySave.app.md accordingly ✅ **COMPLETED**

## 14. Middleware Architecture (NEW)
- [x] Refactor middleware into separate modules following best practices ✅ **COMPLETED**
  - [x] Create middleware/auth.js for authentication middleware
  - [x] Create middleware/error.js for error handling middleware
  - [x] Create middleware/security.js for security middleware (CORS, rate limiting, headers)
  - [x] Create middleware/validation.js for input validation middleware
  - [x] Create middleware/index.js for centralized exports
  - [x] Update app.js to use new middleware structure
  - [x] Update routes/auth.js to use new middleware structure
  - [x] Add missing dependencies (cors, express-rate-limit, express-validator, helmet)
  - [x] Enhanced logging with security and validation event logging
  - [x] Implement proper error handling with detailed logging
  - [x] Add input sanitization and CSRF protection
  - [x] Add rate limiting for authentication endpoints
  - [x] Add security headers with Helmet
  - [x] Add graceful shutdown handling

---

**Database Strategy Documentation:**
- **Approach**: Sequelize CLI Migrations (not automatic sync)
- **Environment Variables**: Standardized on DB_USER_PASSWORD
- **Migration Order**: 22 migrations in correct dependency order
- **Tables Created**: 22 tables with proper foreign key relationships
- **Status**: All migrations successfully applied and verified

**Progress Tracking:**
- [x] Regularly update this file as tasks are completed or added.
- [x] Mark tasks as [x] when done.
