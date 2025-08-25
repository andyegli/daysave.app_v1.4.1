## Module Code Examples

This document provides typical code examples for each module used in DaySave, showing real implementation patterns from the codebase.

## Core Web Stack

### express
Web framework for routing, middleware, and HTTP handling.

```javascript
// File: app.js, Lines: 62-67, 95-98, 782-786
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
// File: app.js, Lines: 89-90, 150-160 (dashboard route pattern)
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
// File: middleware/security.js, Lines: 49-80
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
// File: app.js, Lines: 64-65, 100-118
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
// File: models/user.js, Lines: 1-25 (model definition)
// Usage example from routes/admin.js, Lines: 200-210
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
// File: config/auth.js, Lines: 1-2, 15-45
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
// File: services/apiKeyService.js, Lines: 1, 25-45, 60-70
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
// File: routes/admin.js, Lines: 391-393 (hashing)
// File: routes/auth.js, Lines: 666-670 (verification pattern)
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
// File: routes/profile.js, Lines: 3, 50-65 (secret generation)
// File: routes/auth.js, Lines: 1135-1141 (verification)
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
// File: routes/profile.js, Lines: 4, 70-85
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
// File: services/fileUpload.js, Lines: 2, 50-80
// File: routes/files.js, Lines: 3, 25-35 (usage pattern)
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
// File: services/fileUpload.js, Lines: 116, 200-215
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
// File: services/startupValidation.js, Lines: 2, 243-254
// File: app.js, Lines: 370 (OpenAI require pattern)
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
// File: services/multimedia/ImageProcessor.js, Lines: 20, 35-50
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

#### Advanced Google Vision Examples

**Object Detection with Confidence Filtering:**
```javascript
// File: services/multimedia/ImageProcessor.js, Lines: 500-520
// File: services/multimedia/MultimediaAnalyzer.js, Lines: 1750-1760
async detectObjects(imagePath, options = {}) {
  try {
    if (this.enableLogging) {
      this.log('Detecting objects using Google Vision API');
    }

    const [result] = await this.visionClient.objectLocalization(imagePath);
    const objects = result.localizedObjectAnnotations || [];

    const filteredObjects = objects
      .filter(object => object.score >= (options.confidenceThreshold || 0.5))
      .slice(0, options.maxObjects || 10)
      .map(object => ({
        name: object.name,
        confidence: object.score,
        boundingBox: object.boundingPoly.normalizedVertices,
        provider: 'google'
      }));

    return filteredObjects;
  } catch (error) {
    console.error('Object detection failed:', error);
    return [];
  }
}
```

**Enhanced OCR with Multiple Detection Types:**
```javascript
// File: services/multimedia/MultimediaAnalyzer.js, Lines: 4494-4506
async performEnhancedDetection(imagePath, objectConfidenceThreshold = 0.3, labelConfidenceThreshold = 0.6) {
  if (this.enableLogging) {
    console.log(`🔍 Running enhanced detection with thresholds: objects=${objectConfidenceThreshold}, labels=${labelConfidenceThreshold}`);
  }

  const [objectResult, labelResult, textResult] = await Promise.all([
    this.visionClient.objectLocalization(imagePath),
    this.visionClient.labelDetection(imagePath),
    this.visionClient.textDetection(imagePath)
  ]);

  const rawObjects = objectResult[0].localizedObjectAnnotations || [];
  const rawLabels = labelResult[0].labelAnnotations || [];
  const textAnnotations = textResult[0].textAnnotations || [];

  // Filter and map objects with confidence thresholds
  const objects = rawObjects
    .filter(obj => obj.score >= objectConfidenceThreshold)
    .map(obj => ({
      name: obj.name,
      confidence: obj.score,
      boundingBox: obj.boundingPoly.normalizedVertices
    }));

  const labels = rawLabels
    .filter(label => label.score >= labelConfidenceThreshold)
    .map(label => ({
      description: label.description,
      confidence: label.score
    }));

  const extractedText = textAnnotations.length > 0 ? textAnnotations[0].description : '';

  return { objects, labels, extractedText };
}
```

**OpenAI Vision API Integration:**
```javascript
// File: services/multimedia/MultimediaAnalyzer.js, Lines: 1818-1840
async analyzeImageWithOpenAI(imagePath) {
  const fs = require('fs');
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const mimeType = this.getMimeTypeFromPath(imagePath);
  
  const response = await this.openai.chat.completions.create({
    model: "gpt-4o-mini", // Vision-enabled model
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyze this image and identify all objects, people, animals, and things you can see. 
            
For each object, provide:
- Name/description
- Confidence level (0-1)
- Location description
- Any relevant details

Return as JSON array with objects containing: name, confidence, location, details`
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`
            }
          }
        ]
      }
    ],
    max_tokens: 1000
  });

  return JSON.parse(response.choices[0].message.content);
}
```

### @google-cloud/speech
Speech-to-text transcription.

```javascript
// File: services/multimedia/AudioProcessor.js, Lines: 20, 40-70
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

#### Advanced Google Speech-to-Text Examples

**Enhanced Transcription with Speaker Diarization:**
```javascript
// File: services/multimedia/AudioProcessor.js, Lines: 533-553
// File: services/multimedia/MultimediaAnalyzer.js, Lines: 1635-1650
async transcribeWithSpeakerDetection(audioPath, options = {}) {
  const fs = require('fs');
  const audioBuffer = fs.readFileSync(audioPath);
  
  const request = {
    audio: { content: audioBuffer.toString('base64') },
    config: {
      encoding: 'LINEAR16',
      sampleRateHertz: options.sampleRate || 16000,
      languageCode: options.language || 'en-US',
      enableSpeakerDiarization: true,
      diarizationSpeakerCount: options.speakerCount || 2,
      enableAutomaticPunctuation: true,
      enableWordTimeOffsets: true,
      model: 'latest_long',
      useEnhanced: true,
      ...options
    },
  };

  // Perform transcription
  const [response] = await this.speechClient.recognize(request);
  
  if (!response.results || response.results.length === 0) {
    if (this.enableLogging) {
      console.log('⚠️ No transcription results found');
    }
    return '';
  }

  // Extract transcription with speaker information
  const transcription = response.results
    .map(result => {
      const alternative = result.alternatives[0];
      const speakerTag = result.speakerTag || 0;
      return `Speaker ${speakerTag}: ${alternative.transcript}`;
    })
    .join('\n');

  if (this.enableLogging) {
    console.log('✅ Audio transcription completed:', {
      totalResults: response.results.length,
      transcriptionLength: transcription.length,
      wordCount: transcription.split(' ').length
    });
  }

  return transcription;
}
```

**Long Audio Processing with Chunking:**
```javascript
// File: services/multimedia/MultimediaAnalyzer.js, Lines: 3987-4002
async transcribeLongAudio(audioPath) {
  if (this.speechClient) {
    try {
      const fs = require('fs');
      const audioBuffer = fs.readFileSync(audioPath);
      
      const [response] = await this.speechClient.recognize({
        audio: { content: audioBuffer.toString('base64') },
        config: {
          encoding: 'LINEAR16',
          sampleRateHertz: 16000,
          languageCode: 'en-US',
          enableSpeakerDiarization: true,
          diarizationSpeakerCount: 3,
          enableAutomaticPunctuation: true,
          model: 'latest_long'
        },
      });
      
      const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');
      
      return {
        text: transcription || '',
        confidence: 0.8,
        wordCount: transcription.split(' ').length,
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      console.error('Speech transcription failed:', error);
      return { text: '', confidence: 0, error: error.message };
    }
  }
}
```

## Multimedia Processing

### fluent-ffmpeg
Audio/video processing and probing.

```javascript
// File: services/multimedia/VideoProcessor.js, Lines: 21, 80-110
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
// File: services/multimedia/DocumentProcessor.js, Lines: 157, 160-175
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
// File: config/logger.js, Lines: 54, 90-110, 420-450 (usage functions)
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
// File: services/fileUpload.js, Lines: 4, 150-160 (filename generation)
const { v4: uuidv4 } = require('uuid');

// Generate unique filename
const uniqueFilename = `${uuidv4()}-${originalFilename}`;

// Generate unique record ID
const recordId = uuidv4();
```

### dotenv
Load environment variables from `.env`.

```javascript
// File: app.js, Line: 61 (dotenv config)
// Environment variables used throughout codebase
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
// File: routes/files.js, Lines: 7 (import)
// File: routes/auth.js, Lines: 200-230 (validation pattern)
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
// File: services/startupValidation.js, Lines: 659, 664-670
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
// File: services/startupValidation.js, Lines: 1, 178-200
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
// File: tests/routes.test.js, Lines: 1-25 (example pattern)
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

## Advanced AI Integration Examples

### AI-Powered Tag Generation
Intelligent content analysis and tag generation using OpenAI.

```javascript
// File: services/multimedia/MultimediaAnalyzer.js, Lines: 2356-2380
async generateTags(results) {
  console.log('🏷️ Starting AI-powered tag generation with results:', {
    hasSummary: !!results.summary,
    hasTranscription: !!results.transcription,
    summaryLength: results.summary ? results.summary.length : 0,
    transcriptionLength: results.transcription ? results.transcription.length : 0,
    platform: results.platform
  });

  // Start with AI-powered tags first (prioritize intelligent content analysis)
  let aiTags = [];
  let fallbackTags = [];
  
  // Try AI-powered tag generation first - this should be the primary source
  if (this.openai && (results.summary || results.transcription)) {
    try {
      aiTags = await this.generateAITags(results);
      if (aiTags && aiTags.length > 0) {
        console.log(`🤖 Generated ${aiTags.length} AI tags:`, aiTags);
      }
    } catch (error) {
      console.error('❌ AI tag generation failed, falling back to basic tags:', error);
    }
  }
  
  // Only add basic fallback tags if AI failed or no meaningful content available
  if (aiTags.length === 0) {
    console.log('⚠️ No AI tags generated, using fallback content analysis');
    
    // Enhanced content analysis fallback
    if (results.transcription && results.transcription.length > 50) {
      const text = results.transcription.toLowerCase();
      // Extract keywords using natural language processing
      fallbackTags = this.extractKeywordsFromText(text);
    }
  }

  return [...aiTags, ...fallbackTags].slice(0, 20); // Limit to 20 tags
}
```

### Content Summarization API
Generate intelligent summaries using OpenAI's chat completion API.

```javascript
// File: services/multimedia/MultimediaAnalyzer.js, Lines: 2222-2240
async generateContentSummary(results) {
  const prompt = `Analyze this multimedia content and create a comprehensive summary:

${results.transcription ? `Transcription: ${results.transcription.substring(0, 2000)}` : ''}
${results.ocrText ? `Text from images: ${results.ocrText.substring(0, 500)}` : ''}
${results.objects ? `Detected objects: ${results.objects.map(o => o.name).join(', ')}` : ''}

Instructions:
• Focus on main topics, key points, and important information
• Be specific about activities, settings, objects, and context
• Keep summary concise but informative (max 250 words)

Create a summary that accurately describes what this content contains:`;

  const response = await this.openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are an expert at analyzing multimedia content using both visual and audio information. Create accurate, descriptive summaries that capture the essence of what the content is about by combining all available data sources.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: 300,
    temperature: 0.3
  });

  return response.choices[0].message.content.trim();
}
```

### Sentiment Analysis API
Analyze emotional tone and sentiment using AI.

```javascript
// File: services/multimedia/MultimediaAnalyzer.js, Lines: 2327-2340
async analyzeSentiment(text) {
  try {
    if (!this.openai || !text) return null;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a sentiment analysis expert. Analyze the sentiment and return a JSON object with sentiment (positive/negative/neutral), confidence (0-1), and emotions array.'
        },
        {
          role: 'user',
          content: `Analyze the sentiment of this content:\n\n${text}`
        }
      ],
      max_tokens: 200,
      temperature: 0.1
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('Sentiment analysis failed:', error);
    return { sentiment: 'neutral', confidence: 0.5, emotions: [] };
  }
}
```

### Intelligent Title Generation
Generate descriptive titles for uploaded content.

```javascript
// File: routes/files.js, Lines: 228-240
async generateIntelligentTitle(content, analysisResults) {
  const prompt = `Based on this content analysis, generate a professional, descriptive title:

Content Summary: ${analysisResults.summary || 'No summary available'}
Detected Objects: ${analysisResults.objects?.map(o => o.name).join(', ') || 'None'}
Platform: ${content.platform || 'Unknown'}
Content Type: ${content.content_type || 'Mixed media'}

Requirements:
- Create a compelling, descriptive title (not a list of keywords)
- Use proper grammar and sentence structure
- Focus on the main subject or theme
- Maximum 80 characters
- Professional tone suitable for business content

Example format: "Company name, product type, equipment list" (tag structure)

Respond with only the title, no quotes or additional text.`;

  const startTime = Date.now();
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are an expert content creator who specializes in writing professional, descriptive titles for visual content that match the quality and structure of video titles. Create compelling titles that follow proper narrative structure with complete sentences, not keyword lists or bullet points.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: 100,
    temperature: 0.7
  });

  const generatedTitle = response.choices[0].message.content.trim();
  const processingTime = Date.now() - startTime;
  
  console.log(`🏷️ Generated title in ${processingTime}ms: "${generatedTitle}"`);
  return generatedTitle;
}
```

### Multi-Modal Content Analysis
Combine multiple AI services for comprehensive content understanding.

```javascript
// File: services/multimedia/MultimediaAnalyzer.js, Lines: 1483-1493
async analyzeImageContent(imagePath) {
  try {
    // Parallel processing of multiple AI services
    const [objects, ocrText, aiDescription] = await Promise.all([
      this.detectObjects(imagePath),
      this.extractTextFromImage(imagePath),
      this.analyzeImageWithOpenAI(imagePath)
    ]);

    // Generate tags based on all available information
    if (this.openai) {
      const tags = await this.generateTags({
        objects: objects,
        description: aiDescription,
        ocrText: ocrText,
        type: 'image'
      });
      
      if (this.enableLogging) {
        console.log(`🏷️ Generated ${tags?.length || 0} tags from multi-modal analysis`);
      }

      return {
        objects,
        ocrText,
        description: aiDescription,
        tags,
        processingTime: Date.now() - startTime
      };
    }
  } catch (error) {
    console.error('Multi-modal analysis failed:', error);
    return { error: error.message };
  }
}
```

This document provides practical examples of how each major module is implemented in the DaySave codebase, showing real-world usage patterns and configurations with advanced AI integration capabilities.
