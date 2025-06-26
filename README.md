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
- **AI-Powered Analysis**: Content summarization, sentiment analysis, auto-tagging
- **Smart Contacts**: Apple iPhone-compatible contact management with relationships and groups
- **Multilingual Support**: English, German, French, Italian, Spanish
- **Enterprise Security**: 2FA, encryption, device fingerprinting
- **Modern UI**: Bootstrap 5 with custom gradient styling

## 🛠 Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your actual values
```

### 3. Setup Database
```bash
npm run db:setup
```

### 4. Add Logo Files
Save your logo as `public/images/daysave-logo.png` (recommended: 512x512px)

### 5. Start Development Server
```bash
npm run dev
```

## 📁 Project Structure

```
daysave-app/
├── app.js                 # Main application file
├── package.json
├── .env.example
├── views/                 # EJS templates
│   ├── index.ejs         # Landing page
│   ├── login.ejs         # Login page
│   ├── register.ejs      # Registration page
│   ├── dashboard.ejs     # User dashboard
│   ├── contacts.ejs      # Contacts management
│   ├── terms.ejs         # Terms of trade
│   ├── privacy.ejs       # Privacy policy
│   └── contact.ejs       # Contact form
├── public/               # Static assets
│   ├── images/          # Logo and images
│   ├── css/             # Custom stylesheets
│   └── js/              # Client-side JavaScript
├── locales/             # Translation files
│   ├── en.json          # English translations
│   ├── de.json          # German translations
│   └── ...
├── config/              # Configuration files
├── scripts/             # Utility scripts
└── logs/                # Application logs
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

## 🔧 Development Scripts

- `npm run dev` - Start development server with hot reload
- `npm run test` - Run test suite
- `npm run lint` - Run ESLint
- `npm run db:setup` - Initialize database
- `npm run deploy` - Deploy to Google Cloud

## 🚀 Deployment

### Google Cloud App Engine
```bash
gcloud app deploy
```

### Docker
```bash
docker build -t daysave-app .
docker run -p 3000:3000 daysave-app
```

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
