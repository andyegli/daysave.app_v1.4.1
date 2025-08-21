AGENT.md – Codex AI Agent Definition

# AGENT.md

## Agent Role
You are a AI Agent assigned to assist in the development of the `DaySave.app` project — a multilingual, secure, metadata-processing web application for managing social content, files, and contacts.

## Responsibilities
- Ensure security best practices (JWT, 2FA, encryption, input sanitization).
- Handle OAuth flows and token refresh for platforms.
- Assist with extracting metadata, summaries, and AI tagging (via OpenAI, Google APIs).
- Maintain multilingual consistency in all interfaces and outputs.
- Respect UUID usage and database integrity via Sequelize ORM.
- Support advanced AI-powered multimedia analysis including intelligent tag generation, face recognition, and content-based categorization.

## Project Tech Stack
- **Backend**: Node.js, Express
- **Database**: MySQL + Sequelize (UUIDs)
- **Frontend**: EJS + Bootstrap 5 (CDN)
- **Security**: bcrypt, CSRF, Helmet, AES encryption, fingerprintjs2
- **AI APIs**: Google Vision, Speech-to-Text, OpenAI, MonkeyLearn
- **Deployment**: Google Cloud (App Engine, Cloud SQL)
- **DevOps**: GitHub Actions, Docker

## Database Strategy
- **Approach**: Sequelize CLI Migrations (not automatic sync)
- **Environment Variables**: Standardized on DB_USER_PASSWORD (not DB_PASSWORD)
- **Migration Order**: 22 migrations in correct dependency order
- **Tables Created**: 22 tables with proper foreign key relationships
- **Status**: All migrations successfully applied and verified
- **UUID Usage**: All primary keys and foreign keys use CHAR(36) UUIDs

## Environment Variables (in `.env`)
- `DB_HOST` – Database host (db for Docker, localhost for local)
- `DB_USER` – Database username (daysave)
- `DB_USER_PASSWORD` – Database password (not DB_PASSWORD)
- `DB_NAME` – Database name (daysave_v141)
- `DB_PORT` – Database port (3306)
- `SESSION_SECRET` – secret for session cookies
- `JWT_SECRET` – secret for JWT encryption
- `STRIPE_SECRET` – for payments
- `SENDGRID_API_KEY`, `TWILIO_KEY`, etc.
- `GOOGLE_API_KEY`, `OPENAI_API_KEY`, etc.

## Rules
- Localize all user-facing output (via `i18n`)
- Log events using Winston (login attempts, shares, uploads)
- All POST routes must validate & sanitize input
- Limit API rate per user using `express-rate-limit`
- Enforce max upload size and allowed file types from admin config
- Use UUIDs in all models and foreign keys
- Respect and handle async token refresh for APIs
- Create clean well documented modular code
- No file more than 500 lines
- Always create tasks in TASK.md and keep track of what is done and what needs doing
- **Database**: Use Sequelize CLI migrations for schema changes, never automatic sync

## Command Examples
- `npm run dev` – start dev server with test logins
- `npm run lint` – check formatting
- `npm run test` – run unit tests
- `npm run deploy` – deploy to Google Cloud
- `npx sequelize-cli db:migrate` – run database migrations
- `npx sequelize-cli db:migrate:status` – check migration status

## Dev Mode
Enable fake login via dropdown for 3 test users and 2 admins in dev mode.

## Notes
- Process social messages selectively (ignore spam/unrelated)
- Use Redis to cache token refresh & API limits
- Implement full-text search for content filtering

## Sequelize Model Specification

- All Sequelize models must export a function that takes (sequelize, DataTypes) and returns the model.
- Models must NOT import or instantiate sequelize or DataTypes directly; these are provided by models/index.js.
- This pattern prevents circular dependencies and ensures proper model initialization.
- **Migration Strategy**: Use Sequelize CLI migrations for all schema changes, not automatic sync.

## Project Specifications (as of 2024-06-26)

### 1. Authentication & Security
- Support Apple, Google, and Microsoft OAuth in the first iteration.
- Support both social login and email/password registration from the start.
- 2FA (TOTP) required for admin, optional for users (user can select and toggle strategy).
- Use a cost-effective email service for verification (recommend SendGrid by default).

### 2. User Management
- Username is non-editable after registration.
- Users are never deleted, only disabled if no longer needed.
- Users can close their own account.
- Subscription plans: Free, Small, Medium, Large, Unlimited.
- Stripe and PayPal support (Stripe setup required).
- Admin UI: design to be determined, should support user CRUD and backup/restore.

### 3. Social Media Integration
- Prioritize YouTube, Facebook, Instagram for OAuth/API integration.
- Store tokens and parameters in .env (preferably), but DB fallback if needed.
- Metadata extraction (DMs, mentions, etc.) should be automatic.

### 4. File & URL Processing
- File types and size limits are admin-configurable.
- Store files locally per user in dev, Google Cloud Storage in production.
- AI features (summary, sentiment, transcription, tagging) run automatically, including AI-generated tags.

### 5. Contacts & Relationships
- Users can import contacts from CSV at launch (provide sample CSV in docs/README).
- Support custom fields in addition to Apple contacts schema.
- Visualize relationships as a graph and show number of relationships per contact.

### 6. Multilingual & Accessibility
- Support English, German, Italian, French, and Spanish at launch (auto-translate for now).
- Generate necessary locales/*.json files.
- All pages must be mobile and tablet friendly (WCAG 2.1 AA compliance).

### 7. UI/UX
- Use the following color scheme:
  --primary-color: #2596be;
  --secondary-color: #a1d8c9;
  --accent-color: #fbda6a;
  --success-color: #d8e2a8;
  --warning-color: #f0e28b;
  --info-color: #87c0a9;
  --danger-color: #fbce3c;
  --dark-color: #309b9c;
  --light-color: #bfcc8d;
  --gradient-hero: linear-gradient(135deg, #fbda6a, #a1d8c9, #2596be);
  --gradient-primary: linear-gradient(135deg, #2596be, #309b9c);
- Landing page is public.

### 8. DevOps & Deployment
- Staging and production environments: request best practice guidance and implementation.
- Automated DB backups: ready from the start, but initially triggered manually.
- Monitoring/alerting: recommend cost-effective solutions (suggestions to be provided).

### 9. Testing & Documentation
- Testing priority: 1. Unit tests, 2. Integration tests, 3. E2E tests.
- API documentation: auto-generate with OpenAPI/Swagger.
- Style/linting: follow best practice recommendations.

## Autocomplete & Dynamic Field Troubleshooting

- The contact form uses robust selector logic to ensure all address fields are found and initialized for Google Maps Places Autocomplete.
- If autocomplete fails, check the selector logic in `public/js/contact-maps-autocomplete.js` and ensure the input naming convention matches.
- Always load the Google Maps API script before `contact-maps-autocomplete.js`.
- For dynamic fields, ensure initialization is triggered after new fields are added.
- All code is thoroughly commented; maintain this standard for future changes.