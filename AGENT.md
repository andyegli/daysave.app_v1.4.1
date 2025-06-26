AGENT.md – Codex AI Agent Definition

# AGENT.md

## Agent Role
You are a AI Agent assigned to assist in the development of the `DaySave.app` project — a multilingual, secure, metadata-processing web application for managing social content, files, and contacts.

## Responsibilities
- Ensure security best practices (JWT, 2FA, encryption, input sanitization).
- Handle OAuth flows and token refresh for 11 platforms.
- Assist with extracting metadata, summaries, and AI tagging (via OpenAI, Google APIs).
- Maintain multilingual consistency in all interfaces and outputs.
- Respect UUID usage and database integrity via Sequelize ORM.

## Project Tech Stack
- **Backend**: Node.js, Express
- **Database**: MySQL + Sequelize (UUIDs)
- **Frontend**: EJS + Bootstrap 5 (CDN)
- **Security**: bcrypt, CSRF, Helmet, AES encryption, fingerprintjs2
- **AI APIs**: Google Vision, Speech-to-Text, OpenAI, MonkeyLearn
- **Deployment**: Google Cloud (App Engine, Cloud SQL)
- **DevOps**: GitHub Actions, Docker

## Environment Variables (in `.env`)
- `DB_URL` – MySQL connection string
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

## Command Examples
- `npm run dev` – start dev server with test logins
- `npm run lint` – check formatting
- `npm run test` – run unit tests
- `npm run deploy` – deploy to Google Cloud

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