## Module Code Examples

This document provides typical code examples for each module used in DaySave, showing real implementation patterns from the codebase.

## Core Web Stack

### express
Web framework for routing, middleware, and HTTP handling.

```javascript
// app.js - Basic Express setup
const express = require('express');
const app = express();

// Middleware setup
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Route setup
app.use('/auth', require('./routes/auth'));
app.use('/content', require('./routes/content'));
app.use('/admin', require('./routes/admin'));

// Start server
const PORT = process.env.APP_PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### ejs
Server-side templating for views.

```javascript
// app.js - EJS configuration
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Route rendering EJS template
app.get('/dashboard', isAuthenticated, async (req, res) => {
  const user = req.user;
  const permissions = await getUserPermissions(user.id);
  
  res.render('dashboard', {
    user,
    permissions,
    title: 'Dashboard'
  });
});
```

### helmet
Secure HTTP headers; aligns with CSP rules.

```javascript
// middleware/security.js
const helmet = require('helmet');

const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for some Bootstrap components
        "https://maps.googleapis.com",
        "https://cdn.jsdelivr.net"
      ],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https://api.openai.com"]
    }
  },
  crossOriginEmbedderPolicy: false
});
```

### express-session
Server-side session management.

```javascript
// app.js - Session configuration
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);

app.use(session({
  secret: process.env.SESSION_SECRET,
  store: new SequelizeStore({
    db: db.sequelize,
    tableName: 'sessions',
    checkExpirationInterval: 15 * 60 * 1000, // 15 minutes
    expiration: 24 * 60 * 60 * 1000 // 24 hours
  }),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
```

## Database and ORM

### sequelize
ORM for models, migrations, and queries.

```javascript
// models/user.js - Model definition
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: { isEmail: true }
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  });

  return User;
};

// Usage in routes
const { User, Role } = require('../models');

// Find user with associations
const user = await User.findByPk(userId, {
  include: [{
    model: Role,
    through: { attributes: [] }
  }]
});
```

## Authentication and Authorization

### passport
Auth framework integrating strategies.

```javascript
// config/auth.js - Passport configuration
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({
      where: { email: profile.emails[0].value }
    });
    
    if (!user) {
      user = await User.create({
        username: profile.displayName,
        email: profile.emails[0].value,
        google_id: profile.id
      });
    }
    
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));
```

### jsonwebtoken
Token issuance/verification for stateless flows.

```javascript
// services/apiKeyService.js - JWT usage
const jwt = require('jsonwebtoken');

class ApiKeyService {
  generateApiKey(userId, permissions = []) {
    const payload = {
      userId,
      permissions,
      type: 'api_key',
      iat: Math.floor(Date.now() / 1000)
    };
    
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '1y',
      issuer: 'daysave-api'
    });
  }
  
  verifyApiKey(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid API key');
    }
  }
}
```

## Password Hashing and 2FA

### bcryptjs
JS fallback hashing for portability.

```javascript
// routes/auth.js - Password hashing
const bcrypt = require('bcryptjs');

// Hash password during registration
const saltRounds = 12;
const password_hash = await bcrypt.hash(password, saltRounds);

const user = await User.create({
  username,
  email,
  password_hash
});

// Verify password during login
const isValidPassword = await bcrypt.compare(password, user.password_hash);
if (!isValidPassword) {
  throw new Error('Invalid credentials');
}
```

### speakeasy
TOTP/HOTP for 2FA.

```javascript
// routes/profile.js - 2FA setup and verification
const speakeasy = require('speakeasy');

// Generate 2FA secret
const secret = speakeasy.generateSecret({
  name: `DaySave (${user.email})`,
  issuer: 'DaySave',
  length: 32
});

// Verify TOTP code
const isValid = speakeasy.totp.verify({
  secret: user.totp_secret,
  encoding: 'base32',
  token: code,
  window: 2 // Allow for time drift
});
```

### qrcode
Generate QR codes for TOTP enrollment.

```javascript
// routes/profile.js - QR code generation
const qrcode = require('qrcode');

const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url, {
  errorCorrectionLevel: 'M',
  type: 'image/png',
  quality: 0.92,
  margin: 1,
  color: {
    dark: '#000000',
    light: '#FFFFFF'
  }
});
```

## File Handling and Uploads

### multer
Multipart parsing and secure uploads.

```javascript
// services/fileUpload.js - Multer configuration
const multer = require('multer');

const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB
    files: 10
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'video/mp4', 
      'audio/mpeg', 'application/pdf'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

// Usage in routes
router.post('/upload', upload.array('files', 10), async (req, res) => {
  const files = req.files;
  // Process uploaded files
});
```

### mime-types
Enforce and detect MIME types.

```javascript
// services/fileUpload.js - MIME type detection
const mime = require('mime-types');

validateFileType(filename, buffer) {
  const detectedType = mime.lookup(filename);
  const extensionFromMime = mime.extension(detectedType);
  
  if (!detectedType || !this.isAllowedFileType(detectedType)) {
    throw new Error(`File type ${detectedType} not allowed`);
  }
  
  return detectedType;
}
```

## AI and External ML APIs

### openai
OpenAI API client for AI features and health checks.

```javascript
// services/startupValidation.js - OpenAI integration
const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Test chat completion
const chatResponse = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: 'Analyze this content...' }],
  max_tokens: 150
});

// Generate content summary
const summary = chatResponse.choices[0].message.content;
```

### @google-cloud/vision
OCR/vision analysis.

```javascript
// services/multimedia/ImageProcessor.js - Vision API
const vision = require('@google-cloud/vision');

class ImageProcessor {
  constructor() {
    this.visionClient = new vision.ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });
  }
  
  async extractText(imageBuffer) {
    const [result] = await this.visionClient.textDetection({
      image: { content: imageBuffer }
    });
    
    const detections = result.textAnnotations;
    return detections.length > 0 ? detections[0].description : '';
  }
}
```

### @google-cloud/speech
Speech-to-text transcription.

```javascript
// services/multimedia/AudioProcessor.js - Speech API
const speech = require('@google-cloud/speech');

class AudioProcessor {
  constructor() {
    this.speechClient = new speech.SpeechClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });
  }
  
  async transcribeAudio(audioBuffer) {
    const request = {
      audio: { content: audioBuffer.toString('base64') },
      config: {
        encoding: 'MP3',
        sampleRateHertz: 16000,
        languageCode: 'en-US',
        enableSpeakerDiarization: true,
        diarizationSpeakerCount: 2
      }
    };
    
    const [response] = await this.speechClient.recognize(request);
    return response.results.map(result => 
      result.alternatives[0].transcript
    ).join(' ');
  }
}
```

## Multimedia Processing

### fluent-ffmpeg
Audio/video processing and probing.

```javascript
// services/multimedia/VideoProcessor.js - FFmpeg usage
const ffmpeg = require('fluent-ffmpeg');

class VideoProcessor {
  async generateThumbnails(videoPath, outputDir) {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          count: 5,
          folder: outputDir,
          filename: 'thumb_%i.png',
          size: '320x240'
        })
        .on('end', () => resolve())
        .on('error', reject);
    });
  }
  
  async getVideoMetadata(videoPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata);
      });
    });
  }
}
```

### pdf-parse
Text/metadata extraction from PDF files.

```javascript
// services/multimedia/DocumentProcessor.js - PDF parsing
const pdfParse = require('pdf-parse');

async extractPdfText(buffer) {
  try {
    const data = await pdfParse(buffer);
    return {
      text: data.text,
      pages: data.numpages,
      info: data.info
    };
  } catch (error) {
    throw new Error(`PDF parsing failed: ${error.message}`);
  }
}
```

## Logging and Monitoring

### winston
Structured application logging.

```javascript
// config/logger.js - Winston configuration
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});

// Usage throughout application
const { logAuthEvent, logAuthError } = require('../config/logger');

logAuthEvent('USER_LOGIN', {
  userId: user.id,
  ip: req.ip,
  userAgent: req.get('User-Agent')
});

logAuthError('LOGIN_FAILED', error, {
  email: req.body.email,
  ip: req.ip
});
```

## Utilities

### uuid
Generate unique identifiers.

```javascript
// services/fileUpload.js - UUID generation
const { v4: uuidv4 } = require('uuid');

// Generate unique filename
const uniqueFilename = `${uuidv4()}-${originalFilename}`;

// Generate unique record ID
const recordId = uuidv4();
```

### dotenv
Load environment variables from `.env`.

```javascript
// app.js - Environment configuration
require('dotenv').config();

// Access environment variables
const dbHost = process.env.DB_HOST;
const apiKey = process.env.OPENAI_API_KEY;
const sessionSecret = process.env.SESSION_SECRET;
```

## Input Validation

### express-validator
Request validation and sanitization.

```javascript
// routes/auth.js - Input validation
const { body, validationResult } = require('express-validator');

router.post('/register', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email required'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  body('username')
    .isLength({ min: 3, max: 50 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be alphanumeric')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  // Process validated input
});
```

## External Services

### stripe
Payment processing and account checks.

```javascript
// services/startupValidation.js - Stripe integration
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Test Stripe API connection
const account = await stripe.accounts.retrieve();

// Create payment intent
const paymentIntent = await stripe.paymentIntents.create({
  amount: 2000, // $20.00
  currency: 'usd',
  customer: customerId
});
```

### nodemailer
SMTP email (Gmail in startup validation).

```javascript
// services/startupValidation.js - Email sending
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

const mailOptions = {
  from: process.env.GMAIL_FROM,
  to: user.email,
  subject: 'Welcome to DaySave',
  html: '<h1>Welcome!</h1><p>Your account has been created.</p>'
};

await transporter.sendMail(mailOptions);
```

## Testing

### supertest
HTTP integration testing.

```javascript
// tests/routes.test.js - API testing
const request = require('supertest');
const app = require('../app');

describe('Authentication Routes', () => {
  test('POST /auth/login should authenticate user', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      })
      .expect(200);
      
    expect(response.body.success).toBe(true);
    expect(response.body.user).toBeDefined();
  });
});
```

This document provides practical examples of how each major module is implemented in the DaySave codebase, showing real-world usage patterns and configurations.
