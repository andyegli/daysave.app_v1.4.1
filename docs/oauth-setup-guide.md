# OAuth Provider Setup Guide for DaySave.app

This guide provides detailed step-by-step instructions for setting up OAuth authentication with Google, Microsoft, and Apple for DaySave.app.

## Prerequisites

- A Google account (for Google OAuth)
- A Microsoft account (for Microsoft OAuth)
- An Apple Developer account (for Apple OAuth) - $99/year
- Your DaySave.app domain (for production) or localhost (for development)

## 1. Google OAuth Setup

### Step 1: Access Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Create a new project or select an existing one
   - Click on the project dropdown at the top
   - Click "New Project" if creating new
   - Give it a name like "DaySave OAuth"
   - Click "Create"

### Step 2: Enable Google+ API
1. In the left sidebar, click "APIs & Services" → "Library"
2. Search for "Google+ API" or "Google Identity"
3. Click on "Google Identity" or "Google+ API"
4. Click "Enable"

### Step 3: Create OAuth 2.0 Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. If prompted, configure the OAuth consent screen first:
   - Choose "External" user type
   - Fill in required fields:
     - App name: "DaySave"
     - User support email: your email
     - Developer contact information: your email
   - Click "Save and Continue"
   - Skip scopes section, click "Save and Continue"
   - Add test users if needed, click "Save and Continue"
   - Click "Back to Dashboard"

### Step 4: Create OAuth Client ID
1. Click "Create Credentials" → "OAuth 2.0 Client IDs"
2. Choose "Web application"
3. Name: "DaySave Web Client"
4. Add Authorized redirect URIs:
   - `http://localhost:3000/auth/google/callback` (development)
   - `https://your-domain.com/auth/google/callback` (production)
5. Click "Create"
6. **Copy the Client ID and Client Secret** - you'll need these for your .env file

### Step 5: Add to .env file
```bash
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

## 2. Microsoft OAuth Setup

### Step 1: Access Azure Portal
1. Go to [Azure Portal](https://portal.azure.com/)
2. Sign in with your Microsoft account
3. If you don't have an Azure subscription, you can use the free tier

### Step 2: Register New Application
1. Search for "Azure Active Directory" in the search bar
2. Click on "Azure Active Directory"
3. In the left sidebar, click "App registrations"
4. Click "New registration"

### Step 3: Configure Application
1. Name: "DaySave"
2. Supported account types: Choose "Accounts in any organizational directory and personal Microsoft accounts"
3. Redirect URI:
   - Platform: "Web"
   - URI: `http://localhost:3000/auth/microsoft/callback` (development)
   - Click "Register"

### Step 4: Get Client ID
1. After registration, you'll be taken to the app overview
2. **Copy the Application (client) ID** - this is your Client ID

### Step 5: Create Client Secret
1. In the left sidebar, click "Certificates & secrets"
2. Click "New client secret"
3. Description: "DaySave OAuth Secret"
4. Expiration: Choose "24 months" (or your preference)
5. Click "Add"
6. **Copy the Value** (not the ID) - this is your Client Secret
   - ⚠️ **Important**: You can only see this value once!

### Step 6: Configure API Permissions
1. In the left sidebar, click "API permissions"
2. Click "Add a permission"
3. Choose "Microsoft Graph"
4. Choose "Delegated permissions"
5. Search for and select:
   - `User.Read` (to read user profile)
   - `email` (to get email address)
6. Click "Add permissions"

### Step 7: Add to .env file
```bash
MICROSOFT_CLIENT_ID=your-microsoft-client-id-here
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret-here
MICROSOFT_CALLBACK_URL=http://localhost:3000/auth/microsoft/callback
```

## 3. Apple OAuth Setup

### Step 1: Access Apple Developer Console
1. Go to [Apple Developer Console](https://developer.apple.com/)
2. Sign in with your Apple Developer account
3. Note: Apple Developer Program membership costs $99/year

### Step 2: Create App ID
1. Click "Certificates, Identifiers & Profiles"
2. In the left sidebar, click "Identifiers"
3. Click the "+" button to create a new identifier
4. Choose "App IDs" and click "Continue"
5. Choose "App" and click "Continue"
6. Fill in the form:
   - Description: "DaySave"
   - Bundle ID: `com.yourcompany.daysave` (use reverse domain notation)
   - Scroll down to "Capabilities"
   - Check "Sign In with Apple"
   - Click "Continue"
   - Click "Register"

### Step 3: Create Services ID
1. In "Identifiers", click the "+" button again
2. Choose "Services IDs" and click "Continue"
3. Fill in the form:
   - Description: "DaySave Web"
   - Identifier: `com.yourcompany.daysave.web` (must be unique)
   - Check "Sign In with Apple"
   - Click "Configure" next to "Sign In with Apple"
   - Primary App ID: Select the App ID you created in Step 2
   - Domains and Subdomains: Add your domain (e.g., `yourdomain.com`)
   - Return URLs: Add `https://yourdomain.com/auth/apple/callback`
   - Click "Save"
   - Click "Continue"
   - Click "Register"

### Step 4: Generate Private Key
1. In the left sidebar, click "Keys"
2. Click the "+" button to create a new key
3. Fill in the form:
   - Key Name: "DaySave Sign In with Apple"
   - Check "Sign In with Apple"
   - Click "Configure"
   - Primary App ID: Select your App ID
   - Click "Save"
   - Click "Continue"
   - Click "Register"
4. **Download the .p8 file** - you can only download this once!
5. **Copy the Key ID** - you'll need this

### Step 5: Get Team ID
1. In the top right, click on your name/account
2. Click "Membership"
3. **Copy the Team ID** (10-character string)

### Step 6: Prepare Private Key
1. The downloaded .p8 file contains your private key
2. For development, you can store the key content directly in .env
3. For production, store the file securely and reference the path

### Step 7: Add to .env file
```bash
APPLE_CLIENT_ID=com.yourcompany.daysave.web
APPLE_TEAM_ID=your-team-id-here
APPLE_KEY_ID=your-key-id-here
APPLE_PRIVATE_KEY_PATH=/path/to/your/AuthKey_KEYID.p8
# OR for development, you can put the key content directly:
APPLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
-----END PRIVATE KEY-----
APPLE_CALLBACK_URL=http://localhost:3000/auth/apple/callback
```

## 4. Complete .env Configuration

Here's your complete .env file with all OAuth configurations:

```bash
# Database Configuration
DB_HOST=daysave-db
DB_PORT=3306
DB_NAME=daysave
DB_USER=daysave_user
DB_USER_PASSWORD=daysave_password
DB_ROOT_PASSWORD=root_password

# Application Configuration
APP_PORT=3000
NODE_ENV=development

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-change-in-production

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Microsoft OAuth Configuration
MICROSOFT_CLIENT_ID=your-microsoft-client-id-here
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret-here
MICROSOFT_CALLBACK_URL=http://localhost:3000/auth/microsoft/callback

# Apple OAuth Configuration
APPLE_CLIENT_ID=com.yourcompany.daysave.web
APPLE_TEAM_ID=your-apple-team-id-here
APPLE_KEY_ID=your-apple-key-id-here
APPLE_PRIVATE_KEY_PATH=/path/to/your/AuthKey_KEYID.p8
APPLE_CALLBACK_URL=http://localhost:3000/auth/apple/callback

# Google Cloud Configuration (for production)
GCLOUD_PROJECT_ID=your-gcloud-project-id
GCLOUD_REGION=us-central1
GCLOUD_SQL_INSTANCE=daysave-sql-instance
GCLOUD_SQL_CONNECTION_NAME=your-project:region:instance
```

## 5. Testing Your OAuth Setup

### Development Testing
1. Start your DaySave.app with Docker:
   ```bash
   docker-compose up -d
   ```

2. Visit `http://localhost:3000/auth/login`

3. Test each OAuth provider:
   - Click "Continue with Google"
   - Click "Continue with Microsoft"
   - Click "Continue with Apple"

### Common Issues and Solutions

**Google OAuth Issues:**
- Error: "redirect_uri_mismatch"
  - Solution: Make sure the redirect URI in Google Console exactly matches your callback URL
- Error: "invalid_client"
  - Solution: Check that your Client ID and Secret are correct

**Microsoft OAuth Issues:**
- Error: "AADSTS50011"
  - Solution: Check that the redirect URI in Azure matches exactly
- Error: "AADSTS7000215"
  - Solution: Make sure you've added the correct API permissions

**Apple OAuth Issues:**
- Error: "invalid_client"
  - Solution: Verify your Client ID, Team ID, and Key ID
- Error: "invalid_grant"
  - Solution: Check that your private key is correctly formatted

## 6. Production Deployment

When deploying to production:

1. **Update all callback URLs** to use your production domain:
   - Google: `https://yourdomain.com/auth/google/callback`
   - Microsoft: `https://yourdomain.com/auth/microsoft/callback`
   - Apple: `https://yourdomain.com/auth/apple/callback`

2. **Use HTTPS** - OAuth providers require secure connections in production

3. **Store secrets securely** - Use environment variables or secret management services

4. **Update Apple Services ID** with your production domain

## 7. Security Best Practices

1. **Never commit .env files** to version control
2. **Rotate secrets regularly** - especially client secrets
3. **Use strong session secrets** in production
4. **Monitor OAuth usage** for suspicious activity
5. **Implement rate limiting** on OAuth endpoints
6. **Log OAuth events** for security auditing

## 8. Troubleshooting Checklist

- [ ] All environment variables are set correctly
- [ ] Redirect URIs match exactly (including protocol, domain, and path)
- [ ] OAuth providers are properly configured
- [ ] Application is running on the correct port
- [ ] Database is accessible
- [ ] Session configuration is working
- [ ] HTTPS is used in production
- [ ] All required API permissions are granted

## Support

If you encounter issues:
1. Check the browser console for JavaScript errors
2. Check the server logs for backend errors
3. Verify all environment variables are set
4. Test with a single OAuth provider first
5. Use the troubleshooting checklist above

For additional help, refer to the official documentation:
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Microsoft OAuth 2.0](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow)
- [Apple Sign In](https://developer.apple.com/sign-in-with-apple/) 