# DaySave - Save Your Social Media Moments

<div align="center">
  <img src="public/images/daysave-logo.png" alt="DaySave Logo" width="120" height="120">
  <h3>Organize, analyze, and share content from 11 social platforms</h3>
</div>

## 🎨 Brand Colors

- **Primary Blue**: `#2596be` - Main brand color
- **Light Teal**: `#a1d8c9` - Secondary brand color  
- **Bright Yellow**: `#fbda6a` - Accent color
- **Light Green**: `#d8e2a8` - Success color
- **Light Yellow**: `#f0e28b` - Warning color
- **Teal**: `#87c0a9` - Info color
- **Gold**: `#fbce3c` - Danger/highlight color
- **Dark Teal**: `#309b9c` - Dark variant
- **Sage Green**: `#bfcc8d` - Light variant

## 🚀 Features

- **11 Social Platforms**: Facebook, YouTube, Instagram, TikTok, WeChat, Messenger, Telegram, Snapchat, Pinterest, Twitter/X, WhatsApp
- **AI-Powered Multimedia Analysis**: 
  - **Audio Transcription**: Google Cloud Speech-to-Text with speaker identification
  - **Video Processing**: Automatic thumbnail generation and key moment detection
  - **Sentiment Analysis**: Real-time emotion detection and scoring
  - **OCR Text Extraction**: Text recognition from video frames and images
  - **Speaker Recognition**: Voice print identification and confidence scoring
  - **Content Summarization**: AI-generated summaries and auto-tagging
- **Smart Contacts**: Apple iPhone-compatible contact management with relationships and groups
- **Multilingual Support**: English, German, French, Italian, Spanish
- **Enterprise Security**: 2FA, encryption, device fingerprinting
- **Modern UI**: Bootstrap 5 with custom gradient styling and AI analysis visualizations

## 🛠 Setup Instructions

### Prerequisites
- Node.js 18+ 
- Docker and Docker Compose
- MySQL 8.0 (or use Docker)

### 1. Clone and Install Dependencies
```bash
git clone <repository-url>
cd daysave_v1.4.1
npm install
```

### 2. Configure Environment
```bash
# Create .env file with the following variables:
cp .env.example .env
# Edit .env with your actual values
```

**Required Environment Variables:**
```bash
# App Configuration
NODE_ENV=development
APP_PORT=3000

# Database Configuration (Docker)
DB_HOST=db
DB_PORT=3306
DB_NAME=daysave_v141
DB_USER=daysave
DB_USER_PASSWORD=your-secure-password
DB_ROOT_USER=root
DB_ROOT_PASSWORD=your-secure-password

# Google Cloud Configuration (for production)
GCLOUD_PROJECT_ID=your-project-id
GCLOUD_REGION=us-central1
GCLOUD_SQL_INSTANCE=daysave-sql-instance
GCLOUD_SQL_CONNECTION_NAME=your-project-id:us-central1:daysave-sql-instance

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production

# OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
APPLE_CLIENT_ID=your-apple-client-id
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY=your-apple-private-key
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret

# Email Configuration
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@daysave.app

# Google Cloud AI Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json
GOOGLE_CLOUD_SPEECH_LANGUAGE=en-US
GOOGLE_CLOUD_VISION_LANGUAGE=en

# Multimedia Analysis Configuration
ANALYZER_PORT=3001
MULTIMEDIA_TEMP_DIR=./temp/multimedia
THUMBNAIL_COUNT=5
SPEAKER_CONFIDENCE_THRESHOLD=0.7

# File Upload Configuration
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf,text/plain,video/mp4,audio/mpeg,audio/wav

# Security Configuration
BCRYPT_ROUNDS=12
SESSION_SECRET=your-session-secret-change-in-production
```

### 3. Google Cloud Setup

**Google Cloud Console Configuration:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - Google+ API (for OAuth)
   - Cloud Speech-to-Text API (for audio transcription)
   - Cloud Vision API (for image/video analysis)
   - Cloud Translation API (optional, for multilingual support)

**Google OAuth Setup:**
1. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
2. Set Application Type to "Web application"
3. Add authorized redirect URIs:
   - `http://localhost:3000/auth/google/callback` (development)
   - `https://your-domain.com/auth/google/callback` (production)
4. Copy Client ID and Client Secret to your .env file

**Google Cloud AI Service Account:**
1. Go to "IAM & Admin" → "Service Accounts"
2. Create a new service account with the following roles:
   - Cloud Speech Client
   - Cloud Vision API Client
   - Cloud Translation API Client (optional)
3. Download the JSON key file
4. Set `GOOGLE_APPLICATION_CREDENTIALS` in your .env file to the path of this JSON file

**Microsoft OAuth Setup:**
1. Go to [Azure Portal](https://portal.azure.com/)
2. Register a new application
3. Set redirect URI to:
   - `http://localhost:3000/auth/microsoft/callback` (development)
   - `https://your-domain.com/auth/microsoft/callback` (production)
4. Copy Application (client) ID and create a client secret
5. Add to your .env file

**Apple OAuth Setup:**
1. Go to [Apple Developer Console](https://developer.apple.com/)
2. Create an App ID with Sign In with Apple capability
3. Create a Services ID for your domain
4. Generate a private key and download the .p8 file
5. Note your Team ID, Key ID, and Client ID
6. Add all values to your .env file

### 4. Database Setup with Docker

**Option A: Using Docker (Recommended)**
```bash
# Start the application with Docker Compose
docker-compose up -d

# Wait for database to initialize (about 10-15 seconds)
sleep 15

# Run database migrations (includes multimedia analysis tables)
docker-compose exec app sh -c "DB_HOST=db DB_USER=daysave DB_USER_PASSWORD=your-password DB_NAME=daysave_v141 DB_PORT=3306 npx sequelize-cli db:migrate"

# Check migration status (should show 26 migrations including multimedia tables)
docker-compose exec app sh -c "DB_HOST=db DB_USER=daysave DB_USER_PASSWORD=your-password DB_NAME=daysave_v141 DB_PORT=3306 npx sequelize-cli db:migrate:status"
```

**Option B: Local MySQL Setup**
```bash
# Install and configure MySQL locally
# Create database: daysave_v141
# Create user: daysave with appropriate permissions

# Run migrations locally
npx sequelize-cli db:migrate

# Check migration status
npx sequelize-cli db:migrate:status
```

### 5. Verify Database Setup
```bash
# Check if all tables were created (26 tables total including multimedia analysis)
docker-compose exec db mysql -u daysave -p daysave_v141 -e "SHOW TABLES;"

# Expected output should include:
# Core tables: users, roles, permissions, role_permissions
# Content tables: content, files, contacts, contact_groups
# Multimedia analysis tables: video_analysis, speakers, thumbnails, ocr_captions
# System tables: user_devices, audit_logs, social_accounts, share_logs, login_attempts
# - and 12 more tables...
```

### 6. Sample Data (Optional)

**Add Sample New Zealand Contacts:**
The project includes realistic sample contact data for testing:

```bash
# Use the corrected sample data file
mysql -u daysave -p daysave_v141 < sample_nz_contacts_fixed.sql

# Or manually via MySQL client:
# 1. First check available users: SELECT id, username, email FROM users LIMIT 5;
# 2. Run the sample_nz_contacts_fixed.sql file
```

**Sample includes 10 New Zealand contacts with:**
- Multiple phone numbers (mobile + work)
- Multiple addresses (home, work, business)
- Email addresses and social profiles
- Realistic NZ locations (Auckland, Wellington, Christchurch, etc.)
- Professional notes and context

### 7. Start Development Server

**With Docker:**
```bash
# Application will be available at http://localhost:3000
# Multimedia analyzer will run on port 3001
docker-compose up -d
```

**Without Docker:**
```bash
# Start the main application
node app.js

# Or for development with auto-reload
npm run dev
```

## 📁 Project Structure

```
daysave_v1.4.1/
├── app.js                 # Main application file
├── package.json
├── .env                   # Environment variables
├── docker-compose.yml     # Docker configuration
├── Dockerfile            # Docker image definition
├── config/               # Configuration files
│   ├── config.js        # Sequelize database config
│   ├── auth.js          # Authentication configuration
│   ├── logger.js        # Winston logging configuration
│   └── maps.js          # Google Maps configuration
├── models/               # Sequelize models
│   ├── index.js         # Model associations
│   ├── user.js          # User model
│   ├── role.js          # Role model
│   ├── speaker.js       # Speaker voice print model
│   ├── thumbnail.js     # Video thumbnail model
│   ├── ocrCaption.js    # OCR text extraction model
│   └── ...              # 20+ other models
├── migrations/           # Database migrations
│   ├── 20250626150501-create-roles.js
│   ├── 20250626150502-create-permissions.js
│   ├── 20250626150609-create-content.js
│   ├── 20250626150610-create-files.js
│   └── ...              # 26 migration files including multimedia tables
├── views/                # EJS templates
│   ├── index.ejs        # Landing page
│   ├── login.ejs        # Login page
│   ├── register.ejs     # Registration page
│   ├── dashboard.ejs    # User dashboard
│   ├── contacts.ejs     # Contacts management
│   ├── terms.ejs        # Terms of trade
│   ├── privacy.ejs      # Privacy policy
│   └── contact.ejs      # Contact form
├── public/               # Static assets
│   ├── images/          # Logo and images
│   ├── css/             # Custom stylesheets
│   └── js/              # Client-side JavaScript
│       ├── ai-analysis.js       # AI analysis modal functionality
│       ├── contact-maps.js      # Google Maps integration
│       └── content-filters.js   # Content filtering
├── locales/             # Translation files
│   ├── en.json          # English translations
│   ├── de.json          # German translations
│   └── ...
├── routes/               # Express routes
│   ├── auth.js          # Authentication routes
│   ├── content.js       # Content management with multimedia analysis
│   ├── contacts.js      # Contact management
│   ├── files.js         # File upload and management
│   ├── multimedia.js    # Multimedia analysis API endpoints
│   └── admin.js         # Admin panel routes
├── docs/                 # Documentation
│   └── er-diagram.puml  # Database ER diagram
└── logs/                # Application logs
```

## 🗄️ Database Strategy

- **Approach**: Sequelize CLI Migrations (not automatic sync)
- **Environment Variables**: Standardized on `DB_USER_PASSWORD` (not `DB_PASSWORD`)
- **Migration Order**: 26 migrations in correct dependency order
- **Tables Created**: 26 tables with proper foreign key relationships including multimedia analysis
- **UUID Usage**: All primary keys and foreign keys use CHAR(36) UUIDs
- **Multimedia Tables**: 
  - `video_analysis` - Video metadata, processing statistics, quality assessment
  - `speakers` - Voice print identification, recognition confidence, usage statistics
  - `thumbnails` - Generated thumbnails, key moments, expiry tracking
  - `ocr_captions` - Text extraction from video frames, confidence scoring

**Database Commands:**
```bash
# Run migrations
npx sequelize-cli db:migrate

# Check migration status
npx sequelize-cli db:migrate:status

# Undo last migration
npx sequelize-cli db:migrate:undo

# Undo all migrations
npx sequelize-cli db:migrate:undo:all
```

## 🎨 Logo Usage

### Navbar Brand
```html
<a class="navbar-brand" href="/">
    <img src="/images/daysave-logo.png" alt="DaySave" width="32" height="32" class="me-2">
    DaySave
</a>
```

### Hero Section
```html
<div class="text-center">
    <img src="/images/daysave-logo.png" alt="DaySave" width="80" height="80" class="mb-3">
    <h1>DaySave</h1>
</div>
```

## 🌈 CSS Custom Properties

```css
:root {
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
}
```

## 🎬 Multimedia Analysis Features

### Automatic Content Processing
When users submit multimedia URLs (YouTube, Vimeo, TikTok, etc.), DaySave automatically:

1. **Audio Transcription**: Converts speech to text using Google Cloud Speech-to-Text
2. **Speaker Identification**: Identifies and tracks unique speakers with confidence scoring
3. **Sentiment Analysis**: Analyzes emotional tone and sentiment of content
4. **Thumbnail Generation**: Creates key moment thumbnails for video content
5. **OCR Text Extraction**: Extracts text from video frames and images
6. **Content Summarization**: Generates AI-powered summaries and tags

### Supported Platforms
- **Video**: YouTube, Vimeo, TikTok, Instagram, Facebook
- **Audio**: SoundCloud, Spotify, direct audio files
- **Social**: Twitter, direct video/audio uploads
- **File Types**: MP4, AVI, MOV, MP3, WAV, M4A

### AI Analysis UI
- **Visual Indicators**: Content cards show analysis status with icons
- **Analysis Modal**: Detailed view with transcription, sentiment, thumbnails
- **Real-time Updates**: Progressive enhancement with live status updates
- **Mobile Responsive**: Bootstrap-based UI works on all devices

### API Endpoints
- `POST /multimedia/analyze` - Complete multimedia analysis
- `POST /multimedia/transcribe` - Audio transcription with speaker ID
- `POST /multimedia/thumbnails` - Thumbnail generation
- `GET /content/:id/analysis` - Retrieve analysis results

## 🔧 Development Scripts

- `npm run dev` - Start development server with hot reload
- `npm run test` - Run test suite
- `npm run lint` - Run ESLint
- `docker-compose up -d` - Start with Docker
- `docker-compose down` - Stop Docker containers
- `docker-compose logs -f app` - View application logs

## 🚀 Deployment

### Google Cloud App Engine
```bash
gcloud app deploy
```

### Docker Production
```bash
docker build -t daysave-app .
docker run -p 3000:3000 --env-file .env daysave-app
```

## 🐳 Docker Configuration

The application uses Docker Compose for easy development setup:

**docker-compose.yml:**
- **daysave-app**: Node.js application container
- **daysave-db**: MySQL 8.0 database container
- **Ports**: App on 3000, MySQL on 3306
- **Volumes**: Persistent database storage

**Dockerfile:**
- Based on Node.js 18 Alpine
- Non-root user for security
- Production-ready configuration

## Deployment: Google App Engine & Cloud SQL

1. **Set up Cloud SQL (MySQL) instance**
   - Create a Cloud SQL instance in your Google Cloud project.
   - Note the instance connection name (e.g., `your-project:region:instance`).
   - Set root/user passwords and database name to match your .env.

2. **Configure `app.yaml`**
   - Edit `app.yaml` and set `cloud_sql_instances` to your instance connection name.
   - Ensure `env_variables` match your DB credentials.

3. **Enable Cloud SQL Admin API**
   - In Google Cloud Console, enable the Cloud SQL Admin API.

4. **Deploy to App Engine**
   ```sh
   gcloud app deploy
   ```
   - App will be available at `https://<your-project-id>.appspot.com`

5. **Cloud SQL Connection**
   - App Engine connects to Cloud SQL using the `cloud_sql_instances` setting in `app.yaml`.
   - No need to run the Cloud SQL Proxy in App Engine standard environment.

6. **Environment Variables**
   - You can override or add more variables in `app.yaml` as needed.

For more details, see [Google App Engine Node.js docs](https://cloud.google.com/appengine/docs/standard/nodejs/runtime) and [Cloud SQL docs](https://cloud.google.com/sql/docs/mysql/connect-app-engine).

## 🐛 Troubleshooting

### Database Connection Issues
- Ensure `DB_HOST=db` for Docker setup
- Verify `DB_USER_PASSWORD` is set correctly (not `DB_PASSWORD`)
- Check that MySQL container is running: `docker-compose ps`

### Migration Issues
- If migrations fail, check the migration status: `npx sequelize-cli db:migrate:status`
- Clear migration state if needed: `TRUNCATE TABLE SequelizeMeta;`
- Rebuild Docker image if migration files are outdated: `docker-compose build --no-cache`

### Docker Issues
- Rebuild containers: `docker-compose down && docker-compose build --no-cache && docker-compose up -d`
- Check logs: `docker-compose logs -f app`

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

- Email: support@daysave.app
- Documentation: [docs.daysave.app](https://docs.daysave.app)
- Issues: [GitHub Issues](https://github.com/daysave/daysave-app/issues)

---

<div align="center">
  Made with ❤️ by the DaySave Team
</div>

## 📊 Sample Data Files

The project includes sample data for testing and development:

- **`sample_nz_contacts_fixed.sql`** - 10 realistic New Zealand contacts with multiple phones/addresses
- **`fix_contacts_user_id.sql`** - Helper queries to fix foreign key constraints
- **`sample_nz_contacts.sql`** - Original sample data (requires manual user ID replacement)

## 🗺️ Google Maps Autocomplete Integration

The contact form uses Google Maps Places Autocomplete for address fields. This works for both initial and dynamically added address fields using robust selector logic.

### Setup Instructions
- **API Key:** Set your Google Maps API key in the `.env` file as `GOOGLE_MAPS_KEY=your_key_here`.
- **Required APIs:** Enable both the Maps JavaScript API and Places API in your Google Cloud Console.
- **CSP:** Ensure your Content Security Policy allows scripts from `https://maps.googleapis.com` and `https://maps.gstatic.com`.
- **Selector Logic:** The code uses multiple selector strategies to guarantee all address fields are found and initialized, regardless of naming or rendering order. If you change the address input naming convention, update the selector logic in `public/js/contact-maps-autocomplete.js`.
- **Dynamic Fields:** The autocomplete initialization is robust and will work for both initial and dynamically added address fields.

### Troubleshooting
- If autocomplete does not work, check the browser console for errors.
- Ensure the API key is valid and unrestricted for localhost during development.
- If you add new field types or change naming, update the selector logic accordingly.

### Documentation
See `docs/google_address_completion.md` for comprehensive technical implementation details, including:
- Step-by-step code flow and architecture
- File structure and integration points
- Performance considerations and security best practices
- Troubleshooting guide and optimization strategies
# 🚀 Testing Complete CI/CD Pipeline with All Secrets Configured

## Staging Deployment Test
- All GitHub secrets configured ✅
- GCP service accounts ready ✅  
- Storage bucket corrected ✅
- API keys configured ✅

This commit will trigger the staging deployment to test the complete pipeline.
