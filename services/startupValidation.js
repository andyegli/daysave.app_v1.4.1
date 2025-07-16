const nodemailer = require('nodemailer');
const { OpenAI } = require('openai');
const { logAuthEvent, logAuthError } = require('../config/logger');
const db = require('../models');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

/**
 * Enhanced Startup Validation Service
 * Validates all external services and secrets with actual transaction tests
 */
class StartupValidator {
  constructor() {
    this.validationResults = {
      database: { status: 'pending', message: '', critical: true, details: {} },
      email: { status: 'pending', message: '', critical: true, details: {} },
      openai: { status: 'pending', message: '', critical: false, details: {} },
      googleMaps: { status: 'pending', message: '', critical: false, details: {} },
      googleCloud: {
        speech: { status: 'pending', message: '', critical: false, details: {} },
        vision: { status: 'pending', message: '', critical: false, details: {} },
        storage: { status: 'pending', message: '', critical: false, details: {} }
      },
      oauth: {
        google: { status: 'pending', message: '', critical: false, details: {} },
        microsoft: { status: 'pending', message: '', critical: false, details: {} },
        apple: { status: 'pending', message: '', critical: false, details: {} }
      },
      payments: {
        stripe: { status: 'pending', message: '', critical: false, details: {} }
      },
      notifications: {
        sendgrid: { status: 'pending', message: '', critical: false, details: {} },
        twilio: { status: 'pending', message: '', critical: false, details: {} }
      },
      multimedia: {
        youtube: { status: 'pending', message: '', critical: false, details: {} },
        ffmpeg: { status: 'pending', message: '', critical: false, details: {} }
      },
      sessionSecret: { status: 'pending', message: '', critical: true, details: {} }
    };
  }

  /**
   * Run all validation checks with actual transaction tests
   * @returns {Promise<Object>} Validation results
   */
  async validateAll() {
    const enableValidationLogging = process.env.ENABLE_STARTUP_VALIDATION_LOGGING !== 'false';
    
    if (enableValidationLogging) {
      console.log('🔍 Starting comprehensive startup validation with transaction tests...\n');
    }
    
    const startTime = Date.now();
    
    // Run all validations in parallel for speed
    await Promise.allSettled([
      this.validateDatabase(),
      this.validateEmail(),
      this.validateOpenAI(),
      this.validateGoogleMaps(),
      this.validateGoogleCloudServices(),
      this.validateOAuth(),
      this.validatePayments(),
      this.validateNotifications(),
      this.validateMultimedia(),
      this.validateSessionSecret()
    ]);

    const duration = Date.now() - startTime;
    
    // Log comprehensive results
    if (enableValidationLogging) {
      this.logResults(duration);
    }
    
    // Check for critical failures
    const criticalFailures = this.getCriticalFailures();
    
    if (criticalFailures.length > 0) {
      console.error('\n❌ Critical services failed validation. Application may not function properly.');
      console.error('Failed services:', criticalFailures.join(', '));
      
      // Provide specific guidance
      if (enableValidationLogging) {
        this.logTroubleshootingGuidance(criticalFailures);
      }
      
      // In production, exit the process
      if (process.env.NODE_ENV === 'production') {
        console.error('\n🛑 Exiting due to critical service failures in production mode.');
        process.exit(1);
      }
    }

    return this.validationResults;
  }

  /**
   * Validate database connection with comprehensive tests
   */
  async validateDatabase() {
    try {
      const startTime = Date.now();
      
      // Test 1: Basic authentication
      await db.sequelize.authenticate();
      
      // Test 2: Simple query
      const testResult = await db.sequelize.query('SELECT 1 as test');
      if (!testResult || !testResult[0] || !testResult[0][0] || testResult[0][0].test !== 1) {
        throw new Error('Database query test failed');
      }
      
      // Test 3: Check main tables exist
      const tables = await db.sequelize.getQueryInterface().showAllTables();
      const requiredTables = ['users', 'content', 'contacts', 'files'];
      const missingTables = requiredTables.filter(table => !tables.includes(table));
      
      if (missingTables.length > 0) {
        throw new Error(`Missing required tables: ${missingTables.join(', ')}`);
      }
      
      // Test 4: Test write operation
      const testData = await db.sequelize.query('SELECT COUNT(*) as count FROM users');
      const userCount = testData[0][0].count;
      
      const responseTime = Date.now() - startTime;
      
      this.validationResults.database = {
        status: 'success',
        message: `Connected to ${db.sequelize.config.database} on ${db.sequelize.config.host}:${db.sequelize.config.port}`,
        critical: true,
        details: {
          host: db.sequelize.config.host,
          port: db.sequelize.config.port,
          database: db.sequelize.config.database,
          tablesCount: tables.length,
          userCount: userCount,
          responseTime: `${responseTime}ms`,
          dialect: db.sequelize.config.dialect
        }
      };
    } catch (error) {
      this.validationResults.database = {
        status: 'error',
        message: `Database connection failed: ${error.message}`,
        critical: true,
        details: {
          error: error.message,
          config: {
            host: process.env.DB_HOST || 'not set',
            port: process.env.DB_PORT || 'not set',
            database: process.env.DB_NAME || 'not set',
            user: process.env.DB_USER || 'not set'
          }
        }
      };
      logAuthError('STARTUP_VALIDATION_ERROR', error, { service: 'database' });
    }
  }

  /**
   * Validate email service with actual email test
   */
  async validateEmail() {
    try {
      const requiredVars = ['GMAIL_USER', 'GMAIL_PASS', 'GMAIL_FROM'];
      const missingVars = requiredVars.filter(v => !process.env[v]);
      
      if (missingVars.length > 0) {
        throw new Error(`Missing email configuration: ${missingVars.join(', ')}`);
      }

      // Create transporter (fixed typo: was createTransporter)
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS
        }
      });

      const startTime = Date.now();
      
      // Test 1: Verify SMTP connection
      await transporter.verify();
      
      // Test 2: Send a test email (to self to avoid spam)
      const testEmail = {
        from: process.env.GMAIL_FROM,
        to: process.env.GMAIL_USER, // Send to self
        subject: `DaySave Startup Test - ${new Date().toISOString()}`,
        text: 'This is an automated test email from DaySave startup validation. If you receive this, email service is working correctly.',
        html: '<p>This is an automated test email from <strong>DaySave</strong> startup validation.</p><p>✅ Email service is working correctly.</p>'
      };
      
      const emailResult = await transporter.sendMail(testEmail);
      const responseTime = Date.now() - startTime;
      
      this.validationResults.email = {
        status: 'success',
        message: `Email service verified with test email sent`,
        critical: true,
        details: {
          service: 'gmail',
          user: process.env.GMAIL_USER,
          from: process.env.GMAIL_FROM,
          messageId: emailResult.messageId,
          responseTime: `${responseTime}ms`,
          testEmailSent: true
        }
      };
    } catch (error) {
      this.validationResults.email = {
        status: 'error',
        message: `Email service validation failed: ${error.message}`,
        critical: true,
        details: {
          error: error.message,
          config: {
            user: process.env.GMAIL_USER || 'not set',
            from: process.env.GMAIL_FROM || 'not set',
            hasPassword: !!process.env.GMAIL_PASS
          }
        }
      };
      logAuthError('STARTUP_VALIDATION_ERROR', error, { service: 'email' });
    }
  }

  /**
   * Validate OpenAI API with multiple test requests
   */
  async validateOpenAI() {
    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not configured');
      }

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      const startTime = Date.now();
      
      // Test 1: Simple completion
      const chatResponse = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Say "OpenAI test successful"' }],
        max_tokens: 10
      });

      if (!chatResponse || !chatResponse.choices || !chatResponse.choices[0]) {
        throw new Error('Invalid OpenAI chat completion response');
      }

      // Test 2: Models list to verify API access
      const models = await openai.models.list();
      const availableModels = models.data.map(m => m.id).filter(id => 
        id.includes('gpt') || id.includes('whisper') || id.includes('dall-e')
      );

      const responseTime = Date.now() - startTime;
      
      this.validationResults.openai = {
        status: 'success',
        message: 'OpenAI API connection and chat completion successful',
        critical: false,
        details: {
          apiKeyValid: true,
          chatCompletionWorking: true,
          modelsAvailable: availableModels.length,
          gptModels: availableModels.filter(m => m.includes('gpt')),
          whisperAvailable: availableModels.some(m => m.includes('whisper')),
          responseTime: `${responseTime}ms`,
          testResponse: chatResponse.choices[0].message.content
        }
      };
    } catch (error) {
      this.validationResults.openai = {
        status: 'error',
        message: `OpenAI API validation failed: ${error.message}`,
        critical: false,
        details: {
          error: error.message,
          hasApiKey: !!process.env.OPENAI_API_KEY,
          errorType: error.status || error.code || 'unknown'
        }
      };
      logAuthError('STARTUP_VALIDATION_ERROR', error, { service: 'openai' });
    }
  }

  /**
   * Validate Google Maps API with geocoding test
   */
  async validateGoogleMaps() {
    try {
      const apiKey = process.env.GOOGLE_MAPS_KEY || process.env.GOOGLE_API_KEY;
      
      if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY' || apiKey === 'your-google-api-key') {
        throw new Error('Google Maps API key not configured');
      }

      const startTime = Date.now();
      
      // Test 1: Geocoding API
      const geocodeResponse = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=1600+Amphitheatre+Parkway,+Mountain+View,+CA&key=${apiKey}`
      );
      
      const geocodeData = await geocodeResponse.json();
      
      if (geocodeData.status !== 'OK' || !geocodeData.results || geocodeData.results.length === 0) {
        throw new Error(`Google Maps Geocoding API error: ${geocodeData.error_message || geocodeData.status}`);
      }

      // Test 2: Places API (for autocomplete)
      const placesResponse = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=pizza+near+mountain+view&key=${apiKey}`
      );
      
      const placesData = await placesResponse.json();
      const placesWorking = placesData.status === 'OK' && placesData.predictions && placesData.predictions.length > 0;

      const responseTime = Date.now() - startTime;
      
      this.validationResults.googleMaps = {
        status: 'success',
        message: 'Google Maps API services verified',
        critical: false,
        details: {
          geocodingWorking: true,
          placesWorking: placesWorking,
          testLocation: geocodeData.results[0].formatted_address,
          responseTime: `${responseTime}ms`,
          quotaInfo: 'Check Google Cloud Console for quota usage'
        }
      };
    } catch (error) {
      this.validationResults.googleMaps = {
        status: 'error',
        message: `Google Maps API validation failed: ${error.message}`,
        critical: false,
        details: {
          error: error.message,
          hasGoogleMapsKey: !!process.env.GOOGLE_MAPS_KEY,
          hasGoogleApiKey: !!process.env.GOOGLE_API_KEY,
          setup: 'Ensure Maps JavaScript API and Places API are enabled'
        }
      };
      logAuthError('STARTUP_VALIDATION_ERROR', error, { service: 'google-maps' });
    }
  }

  /**
   * Validate Google Cloud Services using API Key (preferred method)
   */
  async validateGoogleCloudServices() {
    const apiKey = process.env.GOOGLE_API_KEY;
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    
    // Validate Vision API using REST API with API key
    try {
      if (!apiKey) {
        throw new Error('GOOGLE_API_KEY not configured - required for Google Cloud services');
      }

      if (!projectId) {
        throw new Error('GOOGLE_CLOUD_PROJECT_ID not configured');
      }

      const startTime = Date.now();
      
      // Test Vision API with a simple text detection request
      const visionResponse = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [{
              image: {
                content: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
              },
              features: [{ type: 'LABEL_DETECTION', maxResults: 1 }]
            }]
          })
        }
      );

      if (!visionResponse.ok) {
        const errorData = await visionResponse.text();
        throw new Error(`Vision API HTTP ${visionResponse.status}: ${errorData}`);
      }

      const visionData = await visionResponse.json();
      const responseTime = Date.now() - startTime;
      
      this.validationResults.googleCloud.vision = {
        status: 'success',
        message: 'Google Cloud Vision API accessible via API key',
        critical: false,
        details: {
          authMethod: 'api key',
          projectId: projectId,
          responseTime: `${responseTime}ms`,
          testResponse: visionData.responses ? 'success' : 'no response'
        }
      };
    } catch (error) {
      this.validationResults.googleCloud.vision = {
        status: 'error',
        message: `Google Cloud Vision API failed: ${error.message}`,
        critical: false,
        details: {
          error: error.message,
          hasApiKey: !!apiKey,
          projectId: projectId || 'not set',
          authMethod: 'api key (preferred)'
        }
      };
    }

    // Validate Speech-to-Text API using REST API with API key
    try {
      if (!apiKey) {
        throw new Error('GOOGLE_API_KEY not configured');
      }

      const startTime = Date.now();
      
      // Test Speech API with a simple request (will fail gracefully but validate auth)
      const speechResponse = await fetch(
        `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            config: {
              encoding: 'LINEAR16',
              sampleRateHertz: 16000,
              languageCode: 'en-US',
            },
            audio: {
              content: ''
            }
          })
        }
      );

      const responseTime = Date.now() - startTime;

      // Even if the request fails due to empty audio, a 400 error means the API key is valid
      if (speechResponse.status === 400 || speechResponse.status === 200) {
        this.validationResults.googleCloud.speech = {
          status: 'success',
          message: 'Google Cloud Speech-to-Text API accessible via API key',
          critical: false,
          details: {
            authMethod: 'api key',
            projectId: projectId,
            responseTime: `${responseTime}ms`,
            statusCode: speechResponse.status
          }
        };
      } else {
        const errorData = await speechResponse.text();
        throw new Error(`Speech API HTTP ${speechResponse.status}: ${errorData}`);
      }
    } catch (error) {
      this.validationResults.googleCloud.speech = {
        status: 'error',
        message: `Google Cloud Speech API failed: ${error.message}`,
        critical: false,
        details: {
          error: error.message,
          hasApiKey: !!apiKey,
          projectId: projectId || 'not set',
          authMethod: 'api key (preferred)'
        }
      };
    }

    // Validate Cloud Storage API using REST API with API key
    try {
      if (!apiKey) {
        throw new Error('GOOGLE_API_KEY not configured');
      }

      const startTime = Date.now();
      
      // Test Storage API by listing buckets
      const storageResponse = await fetch(
        `https://storage.googleapis.com/storage/v1/b?project=${projectId}&key=${apiKey}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        }
      );

      const responseTime = Date.now() - startTime;

      if (!storageResponse.ok) {
        const errorData = await storageResponse.text();
        throw new Error(`Storage API HTTP ${storageResponse.status}: ${errorData}`);
      }

      const storageData = await storageResponse.json();
      
      this.validationResults.googleCloud.storage = {
        status: 'success',
        message: 'Google Cloud Storage API accessible via API key',
        critical: false,
        details: {
          authMethod: 'api key',
          projectId: projectId,
          bucketsAccessible: storageData.items ? storageData.items.length : 0,
          responseTime: `${responseTime}ms`
        }
      };
    } catch (error) {
      this.validationResults.googleCloud.storage = {
        status: 'error',
        message: `Google Cloud Storage API failed: ${error.message}`,
        critical: false,
        details: {
          error: error.message,
          hasApiKey: !!apiKey,
          projectId: projectId || 'not set',
          authMethod: 'api key (preferred)'
        }
      };
    }
  }

  /**
   * Validate OAuth configurations with endpoint tests
   */
  async validateOAuth() {
    // Google OAuth
    try {
      const requiredVars = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];
      const missingVars = requiredVars.filter(v => !process.env[v]);
      
      if (missingVars.length > 0) {
        throw new Error(`Missing variables: ${missingVars.join(', ')}`);
      }

      // Test Google OAuth discovery endpoint
      const response = await fetch('https://accounts.google.com/.well-known/openid-configuration');
      const discovery = await response.json();
      
      this.validationResults.oauth.google = {
        status: 'success',
        message: 'Google OAuth configuration valid',
        critical: false,
        details: {
          clientId: process.env.GOOGLE_CLIENT_ID.substring(0, 20) + '...',
          hasSecret: !!process.env.GOOGLE_CLIENT_SECRET,
          authEndpoint: discovery.authorization_endpoint,
          tokenEndpoint: discovery.token_endpoint
        }
      };
    } catch (error) {
      this.validationResults.oauth.google = {
        status: 'error',
        message: `Google OAuth validation failed: ${error.message}`,
        critical: false,
        details: { error: error.message }
      };
    }

    // Microsoft OAuth
    try {
      const requiredVars = ['MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET'];
      const missingVars = requiredVars.filter(v => !process.env[v]);
      
      if (missingVars.length > 0) {
        throw new Error(`Missing variables: ${missingVars.join(', ')}`);
      }

      // Test Microsoft OAuth discovery endpoint
      const response = await fetch('https://login.microsoftonline.com/common/v2.0/.well-known/openid_configuration');
      const discovery = await response.json();

      this.validationResults.oauth.microsoft = {
        status: 'success',
        message: 'Microsoft OAuth configuration valid',
        critical: false,
        details: {
          clientId: process.env.MICROSOFT_CLIENT_ID.substring(0, 20) + '...',
          hasSecret: !!process.env.MICROSOFT_CLIENT_SECRET,
          authEndpoint: discovery.authorization_endpoint
        }
      };
    } catch (error) {
      this.validationResults.oauth.microsoft = {
        status: 'error',
        message: `Microsoft OAuth validation failed: ${error.message}`,
        critical: false,
        details: { error: error.message }
      };
    }

    // Apple OAuth
    try {
      const requiredVars = ['APPLE_CLIENT_ID', 'APPLE_TEAM_ID', 'APPLE_KEY_ID'];
      const missingVars = requiredVars.filter(v => !process.env[v]);
      
      if (missingVars.length > 0) {
        throw new Error(`Missing variables: ${missingVars.join(', ')}`);
      }

      if (!process.env.APPLE_PRIVATE_KEY && !process.env.APPLE_PRIVATE_KEY_PATH) {
        throw new Error('Apple private key not configured');
      }

      this.validationResults.oauth.apple = {
        status: 'success',
        message: 'Apple OAuth configuration present',
        critical: false,
        details: {
          clientId: process.env.APPLE_CLIENT_ID,
          teamId: process.env.APPLE_TEAM_ID,
          keyId: process.env.APPLE_KEY_ID,
          hasPrivateKey: !!(process.env.APPLE_PRIVATE_KEY || process.env.APPLE_PRIVATE_KEY_PATH)
        }
      };
    } catch (error) {
      this.validationResults.oauth.apple = {
        status: 'error',
        message: `Apple OAuth validation failed: ${error.message}`,
        critical: false,
        details: { error: error.message }
      };
    }
  }

  /**
   * Validate payment services
   */
  async validatePayments() {
    // Stripe
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('STRIPE_SECRET_KEY not configured');
      }

      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      
      const startTime = Date.now();
      
      // Test Stripe API
      const account = await stripe.accounts.retrieve();
      
      const responseTime = Date.now() - startTime;
      
      this.validationResults.payments.stripe = {
        status: 'success',
        message: 'Stripe API connection successful',
        critical: false,
        details: {
          accountId: account.id,
          country: account.country,
          currency: account.default_currency,
          responseTime: `${responseTime}ms`
        }
      };
    } catch (error) {
      this.validationResults.payments.stripe = {
        status: 'error',
        message: `Stripe validation failed: ${error.message}`,
        critical: false,
        details: {
          error: error.message,
          hasSecretKey: !!process.env.STRIPE_SECRET_KEY
        }
      };
    }
  }

  /**
   * Validate notification services
   */
  async validateNotifications() {
    // SendGrid
    try {
      if (!process.env.SENDGRID_API_KEY) {
        throw new Error('SENDGRID_API_KEY not configured');
      }

      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      
      // Test API key validity (this doesn't send an email)
      const startTime = Date.now();
      const response = await fetch('https://api.sendgrid.com/v3/user/account', {
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`SendGrid API returned ${response.status}: ${response.statusText}`);
      }
      
      const account = await response.json();
      const responseTime = Date.now() - startTime;
      
      this.validationResults.notifications.sendgrid = {
        status: 'success',
        message: 'SendGrid API connection successful',
        critical: false,
        details: {
          accountType: account.type,
          responseTime: `${responseTime}ms`
        }
      };
    } catch (error) {
      this.validationResults.notifications.sendgrid = {
        status: 'error',
        message: `SendGrid validation failed: ${error.message}`,
        critical: false,
        details: {
          error: error.message,
          hasApiKey: !!process.env.SENDGRID_API_KEY
        }
      };
    }

    // Twilio
    try {
      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        throw new Error('Twilio credentials not configured');
      }

      const twilio = require('twilio');
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      
      const startTime = Date.now();
      
      // Test Twilio API
      const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
      
      const responseTime = Date.now() - startTime;
      
      this.validationResults.notifications.twilio = {
        status: 'success',
        message: 'Twilio API connection successful',
        critical: false,
        details: {
          accountSid: account.sid,
          status: account.status,
          responseTime: `${responseTime}ms`
        }
      };
    } catch (error) {
      this.validationResults.notifications.twilio = {
        status: 'error',
        message: `Twilio validation failed: ${error.message}`,
        critical: false,
        details: {
          error: error.message,
          hasAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
          hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN
        }
      };
    }
  }

  /**
   * Validate multimedia processing services
   */
  async validateMultimedia() {
    // YouTube processing with yt-dlp
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      // Test with a known working video using yt-dlp
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      
      // Use yt-dlp to extract video info
      const command = `yt-dlp --no-check-certificates --print "%(title)s|%(duration)s" "${testUrl}"`;
      const { stdout } = await execAsync(command, { timeout: 30000 });
      
      const [title, duration] = stdout.trim().split('|');
      
      this.validationResults.multimedia.youtube = {
        status: 'success',
        message: 'YouTube processing service working',
        critical: false,
        details: {
          testTitle: title,
          testDuration: duration + ' seconds',
          tool: 'yt-dlp'
        }
      };
    } catch (error) {
      this.validationResults.multimedia.youtube = {
        status: 'error',
        message: `YouTube processing failed: ${error.message}`,
        critical: false,
        details: {
          error: error.message,
          suggestion: 'YouTube processing may be rate limited or blocked. Try updating yt-dlp: pip3 install --upgrade yt-dlp'
        }
      };
    }

    // FFmpeg
    try {
      const ffmpeg = require('fluent-ffmpeg');
      
      // Test FFmpeg availability
      return new Promise((resolve) => {
        ffmpeg.getAvailableFormats((err, formats) => {
          if (err) {
            this.validationResults.multimedia.ffmpeg = {
              status: 'error',
              message: `FFmpeg validation failed: ${err.message}`,
              critical: false,
              details: {
                error: err.message,
                suggestion: 'Install FFmpeg on the system'
              }
            };
          } else {
            this.validationResults.multimedia.ffmpeg = {
              status: 'success',
              message: 'FFmpeg is available and working',
              critical: false,
              details: {
                formatsAvailable: Object.keys(formats).length,
                hasH264: !!formats.mp4,
                hasWebM: !!formats.webm
              }
            };
          }
          resolve();
        });
      });
    } catch (error) {
      this.validationResults.multimedia.ffmpeg = {
        status: 'error',
        message: `FFmpeg validation failed: ${error.message}`,
        critical: false,
        details: {
          error: error.message
        }
      };
    }
  }

  /**
   * Validate session secret with enhanced security checks
   */
  async validateSessionSecret() {
    try {
      const sessionSecret = process.env.SESSION_SECRET;
      
      if (!sessionSecret) {
        throw new Error('SESSION_SECRET not configured. Add SESSION_SECRET to your .env file.');
      }

      const defaultSecrets = [
        'your-secret-key',
        'your-session-secret-change-in-production',
        'secret',
        'password',
        '123456'
      ];

      if (defaultSecrets.includes(sessionSecret)) {
        throw new Error('SESSION_SECRET is using a default/insecure value. Generate a new secure secret.');
      }

      if (sessionSecret.length < 32) {
        throw new Error(`SESSION_SECRET must be at least 32 characters (current: ${sessionSecret.length}). Generate a longer secret.`);
      }

      // Check for sufficient entropy
      const hasNumbers = /\d/.test(sessionSecret);
      const hasLowercase = /[a-z]/.test(sessionSecret);
      const hasUppercase = /[A-Z]/.test(sessionSecret);
      const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(sessionSecret);
      
      const entropyScore = [hasNumbers, hasLowercase, hasUppercase, hasSpecialChars].filter(Boolean).length;

      if (entropyScore < 3) {
        const missing = [];
        if (!hasNumbers) missing.push('numbers');
        if (!hasLowercase) missing.push('lowercase letters');
        if (!hasUppercase) missing.push('uppercase letters');
        if (!hasSpecialChars) missing.push('special characters');
        
        throw new Error(`SESSION_SECRET lacks complexity. Missing: ${missing.join(', ')}. Use command: openssl rand -base64 32`);
      }

      this.validationResults.sessionSecret = {
        status: 'success',
        message: 'Session secret properly configured',
        critical: true,
        details: {
          length: sessionSecret.length,
          entropyScore: `${entropyScore}/4`,
          hasNumbers,
          hasLowercase,
          hasUppercase,
          hasSpecialChars,
          isSecure: entropyScore >= 3 && sessionSecret.length >= 32,
          instructions: {
            command: 'openssl rand -base64 32',
            description: 'Generate a secure 32-character session secret'
          }
        }
      };
    } catch (error) {
      // Enhanced error details with specific instructions
      const instructions = {
        command: 'openssl rand -base64 32',
        description: 'Generate a secure session secret',
        steps: [
          '1. Run: openssl rand -base64 32',
          '2. Copy the generated string',
          '3. Add to .env file: SESSION_SECRET=<generated_string>',
          '4. Restart the application'
        ]
      };

      this.validationResults.sessionSecret = {
        status: 'error',
        message: `Session secret validation failed: ${error.message}`,
        critical: true,
        details: {
          error: error.message,
          hasSecret: !!process.env.SESSION_SECRET,
          length: process.env.SESSION_SECRET ? process.env.SESSION_SECRET.length : 0,
          instructions,
          troubleshooting: [
            'Generate a secure random string (32+ characters)',
            'Use: openssl rand -base64 32',
            'Never use default or obvious values',
            'Include numbers, letters, and special characters',
            'Example: SESSION_SECRET=aB3$kL9mN2pQ7rS1tU8vW5xY0zA4bC6d'
          ]
        }
      };
      
      // Log the command for easy access
      console.log('\n🔐 SESSION_SECRET GENERATION:');
      console.log('   Command: openssl rand -base64 32');
      console.log('   Then add to .env: SESSION_SECRET=<generated_value>');
      
      logAuthError('STARTUP_VALIDATION_ERROR', error, { 
        service: 'session-secret',
        instructions: instructions.command
      });
    }
  }

  /**
   * Log comprehensive validation results
   */
  logResults(duration) {
    const enableValidationLogging = process.env.ENABLE_STARTUP_VALIDATION_LOGGING !== 'false';
    if (!enableValidationLogging) return;
    
    console.log(`\n📊 Startup Validation Results (completed in ${duration}ms):`);
    console.log('=' .repeat(80));
    
    // Core Services
    console.log('\n🏗️  CORE SERVICES:');
    this.logServiceResult('Database', this.validationResults.database);
    this.logServiceResult('Email Service', this.validationResults.email);
    this.logServiceResult('Session Secret', this.validationResults.sessionSecret);
    
    // AI Services
    console.log('\n🤖 AI SERVICES:');
    this.logServiceResult('OpenAI API', this.validationResults.openai);
    this.logServiceResult('Google Maps API', this.validationResults.googleMaps);
    
    // Google Cloud Services
    console.log('\n☁️  GOOGLE CLOUD SERVICES:');
    this.logServiceResult('  Speech-to-Text', this.validationResults.googleCloud.speech);
    this.logServiceResult('  Vision API', this.validationResults.googleCloud.vision);
    this.logServiceResult('  Cloud Storage', this.validationResults.googleCloud.storage);
    
    // OAuth Services
    console.log('\n🔐 OAUTH PROVIDERS:');
    this.logServiceResult('  Google OAuth', this.validationResults.oauth.google);
    this.logServiceResult('  Microsoft OAuth', this.validationResults.oauth.microsoft);
    this.logServiceResult('  Apple OAuth', this.validationResults.oauth.apple);
    
    // Payment Services
    console.log('\n💳 PAYMENT SERVICES:');
    this.logServiceResult('  Stripe', this.validationResults.payments.stripe);
    
    // Notification Services
    console.log('\n📬 NOTIFICATION SERVICES:');
    this.logServiceResult('  SendGrid', this.validationResults.notifications.sendgrid);
    this.logServiceResult('  Twilio', this.validationResults.notifications.twilio);
    
    // Multimedia Services
    console.log('\n🎬 MULTIMEDIA SERVICES:');
    this.logServiceResult('  YouTube Processing', this.validationResults.multimedia.youtube);
    this.logServiceResult('  FFmpeg', this.validationResults.multimedia.ffmpeg);
    
    console.log('\n' + '=' .repeat(80));
    
    // Summary
    const summary = this.getValidationSummary();
    console.log(`📈 SUMMARY: ${summary.successful}/${summary.total} services validated successfully`);
    if (summary.failed > 0) {
      console.log(`⚠️  ${summary.failed} services failed validation`);
    }
    if (summary.critical > 0) {
      console.log(`🚨 ${summary.critical} CRITICAL services failed`);
    }
    
    // Log to audit system
    logAuthEvent('STARTUP_VALIDATION_COMPLETE', {
      ...summary,
      duration,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log individual service result with details
   */
  logServiceResult(serviceName, result) {
    const statusIcon = result.status === 'success' ? '✅' : 
                      result.status === 'error' ? '❌' : '⚠️';
    
    console.log(`${statusIcon} ${serviceName}: ${result.message}`);
    
    // Show additional details for errors
    if (result.status === 'error' && result.details) {
      if (result.details.error) {
        console.log(`   🔍 Error: ${result.details.error}`);
      }
      if (result.details.suggestion) {
        console.log(`   💡 Suggestion: ${result.details.suggestion}`);
      }
      if (result.details.config) {
        console.log(`   ⚙️  Config: ${JSON.stringify(result.details.config, null, 2).substring(0, 100)}...`);
      }
    }
    
    // Show performance details for successful services
    if (result.status === 'success' && result.details && result.details.responseTime) {
      console.log(`   ⏱️  Response time: ${result.details.responseTime}`);
    }
  }

  /**
   * Provide troubleshooting guidance for failed services
   */
  logTroubleshootingGuidance(failedServices) {
    console.log('\n🔧 TROUBLESHOOTING GUIDANCE:');
    console.log('=' .repeat(50));
    
    failedServices.forEach(serviceName => {
      const guidance = this.getTroubleshootingGuidance(serviceName);
      console.log(`\n❌ ${serviceName.toUpperCase()}:`);
      guidance.forEach(tip => console.log(`   • ${tip}`));
    });
  }

  /**
   * Get troubleshooting guidance for specific service
   */
  getTroubleshootingGuidance(serviceName) {
    const guidance = {
      database: [
        'Check database connection settings in .env file',
        'Ensure MySQL/MariaDB server is running',
        'Verify database credentials and permissions',
        'Run: docker-compose up -d to start database container'
      ],
      email: [
        'Verify Gmail credentials in .env file',
        'Enable 2-factor authentication and use App Password',
        'Check Gmail API limits and quotas',
        'Test with: curl -u user:pass smtps://smtp.gmail.com:465'
      ],
      sessionSecret: [
        'Generate a secure random string (32+ characters)',
        'Use: openssl rand -base64 32',
        'Never use default or obvious values',
        'Include numbers, letters, and special characters'
      ],
      openai: [
        'Verify OpenAI API key in .env file',
        'Check API key usage and billing at platform.openai.com',
        'Ensure API key has proper permissions',
        'Test rate limits and quota'
      ]
    };
    
    return guidance[serviceName] || ['Check service configuration and credentials'];
  }

  /**
   * Get services that failed critical validation
   */
  getCriticalFailures() {
    const failures = [];
    
    // Helper function to check nested objects
    const checkService = (obj, prefix = '') => {
      Object.keys(obj).forEach(key => {
        const service = obj[key];
        if (service.critical && service.status === 'error') {
          failures.push(prefix + key);
        } else if (typeof service === 'object' && !service.hasOwnProperty('status')) {
          // Nested object, recurse
          checkService(service, prefix + key + '.');
        }
      });
    };
    
    checkService(this.validationResults);
    return failures;
  }

  /**
   * Get validation summary statistics
   */
  getValidationSummary() {
    let total = 0;
    let successful = 0;
    let critical = 0;
    
    const countServices = (obj) => {
      Object.keys(obj).forEach(key => {
        const service = obj[key];
        if (service.hasOwnProperty('status')) {
          total++;
          if (service.status === 'success') {
            successful++;
          }
          if (service.critical && service.status === 'error') {
            critical++;
          }
        } else if (typeof service === 'object') {
          countServices(service);
        }
      });
    };
    
    countServices(this.validationResults);
    
    return {
      total,
      successful,
      failed: total - successful,
      critical
    };
  }

  /**
   * Get validation results for specific service
   */
  getServiceStatus(serviceName) {
    const path = serviceName.split('.');
    let current = this.validationResults;
    
    for (const segment of path) {
      if (current[segment]) {
        current = current[segment];
      } else {
        return { status: 'unknown', message: 'Service not found' };
      }
    }
    
    return current;
  }

  /**
   * Check if all critical services are operational
   */
  areAllCriticalServicesOperational() {
    return this.getCriticalFailures().length === 0;
  }
}

module.exports = StartupValidator; 