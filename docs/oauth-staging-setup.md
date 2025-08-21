# OAuth Configuration for DaySave Staging

## Current Issues:
1. **No users in database** - Database is empty
2. **OAuth disabled** - All OAuth providers set to "staging-disabled"
3. **WebAuthn domain** - Fixed to use `daysave.app`

## 🔧 To Enable Google OAuth:

### 1. Google Cloud Console Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your `daysave` project
3. Navigate to "APIs & Services" → "Credentials"
4. Click "Create Credentials" → "OAuth 2.0 Client IDs"
5. Application type: "Web application"
6. Name: "DaySave Staging"
7. **Authorized redirect URIs**:
   ```
   https://daysave.app/auth/google/callback
   https://www.daysave.app/auth/google/callback
   ```

### 2. Update Environment Variables
Replace these in `.env`:
```bash
GOOGLE_CLIENT_ID=your-actual-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-actual-google-client-secret
```

## 🔧 To Enable Microsoft OAuth:

### 1. Azure App Registration
1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory" → "App registrations"
3. Click "New registration"
4. Name: "DaySave Staging"
5. **Redirect URI**: `https://daysave.app/auth/microsoft/callback`

### 2. Update Environment Variables
```bash
MICROSOFT_CLIENT_ID=your-azure-application-id
MICROSOFT_CLIENT_SECRET=your-azure-client-secret
```

## 🔧 Current Staging Configuration:

**Domain**: `https://daysave.app`  
**WebAuthn**: `daysave.app` (fixed)  
**Database**: Empty - no users yet  
**OAuth**: Disabled for security  

## 🎯 Next Steps:

1. **Create OAuth applications** (Google & Microsoft)
2. **Update environment variables** with real credentials
3. **Test OAuth login** with your accounts
4. **Create admin user** through the application

## 🔒 Security Notes:

- Current OAuth is disabled to prevent unauthorized access
- SSL certificates are properly configured
- Domain is correctly set up
- WebAuthn will work once users are created
