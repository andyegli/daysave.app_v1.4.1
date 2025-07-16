# Google Services Configuration Guide for DaySave

This comprehensive guide covers the secure setup and configuration of all Google services used in the DaySave application, including OAuth, Gmail, Cloud Storage, and API services.

## Table of Contents
1. [Google Cloud Project Setup](#google-cloud-project-setup)
2. [OAuth Configuration](#oauth-configuration)
3. [Gmail Configuration](#gmail-configuration)
4. [Cloud Storage Configuration](#cloud-storage-configuration)
5. [API Key Configuration](#api-key-configuration)
6. [Security Best Practices](#security-best-practices)
7. [Environment Variables](#environment-variables)
8. [Testing and Validation](#testing-and-validation)
9. [Troubleshooting](#troubleshooting)

---

## Google Cloud Project Setup

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"NEW PROJECT"**
3. Configure project:
   - **Project name**: `DaySave Production` (or your preferred name)
   - **Project ID**: `daysave-prod-YYYYMMDD` (must be globally unique)
   - **Organization**: Select your organization or leave as "No organization"
4. Click **"CREATE"**
5. Wait for project creation (1-2 minutes)

### Step 2: Enable Billing
1. Go to **Billing** in the left sidebar
2. Link a billing account or create a new one
3. **⚠️ Security Note**: Set up billing alerts to avoid unexpected charges

### Step 3: Enable Required APIs
Navigate to **APIs & Services** → **Library** and enable these APIs:
- ✅ **Google Maps JavaScript API**
- ✅ **Google Maps Geocoding API**
- ✅ **Google Maps Places API (New)**
- ✅ **Cloud Storage JSON API**
- ✅ **Cloud Speech-to-Text API**
- ✅ **Cloud Vision API**
- ✅ **Gmail API** (for email sending)

---

## OAuth Configuration

### Step 1: Configure OAuth Consent Screen
1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** (for public apps) or **Internal** (for organization-only)
3. Fill required fields:
   - **App name**: `DaySave`
   - **User support email**: `support@yourdomain.com`
   - **App logo**: Upload your app logo (120x120px PNG)
   - **App domain**: `https://yourdomain.com`
   - **Authorized domains**: 
     - `yourdomain.com`
     - `localhost` (for development)
   - **Developer contact**: `developer@yourdomain.com`

### Step 2: Configure Scopes
1. Click **"ADD OR REMOVE SCOPES"**
2. Add these scopes:
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile`
   - `openid`
3. **⚠️ Security**: Only request necessary scopes

### Step 3: Add Test Users (for External apps in testing)
1. Add test user emails for development
2. **Production**: Submit for verification when ready

### Step 4: Create OAuth Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **"CREATE CREDENTIALS"** → **"OAuth client ID"**
3. Configure:
   - **Application type**: `Web application`
   - **Name**: `DaySave OAuth Client`
   - **Authorized JavaScript origins**:
     ```
     http://localhost:3000
     https://yourdomain.com
     ```
   - **Authorized redirect URIs**:
     ```
     http://localhost:3000/auth/google/callback
     https://yourdomain.com/auth/google/callback
     ```
4. Click **"CREATE"**
5. **🔒 SECURITY**: Download and securely store the JSON file
6. **⚠️ NEVER** commit OAuth secrets to version control

---

## Gmail Configuration

### Step 1: Enable Gmail API
1. Go to **APIs & Services** → **Library**
2. Search for **"Gmail API"**
3. Click **"Enable"**

### Step 2: Create App Password (Recommended Method)
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** if not already enabled
3. Go to **App passwords**
4. Generate app password:
   - **App**: `DaySave Application`
   - **Device**: `Server`
5. **🔒 SECURITY**: Store the generated password securely
6. Use this password as `GMAIL_PASS` in environment variables

### Step 3: Alternative: Service Account (Advanced)
1. Go to **APIs & Services** → **Credentials**
2. Click **"CREATE CREDENTIALS"** → **"Service account"**
3. Configure:
   - **Service account name**: `daysave-gmail-service`
   - **Description**: `Service account for Gmail API access`
4. Grant roles:
   - **Gmail API Service Agent**
5. Create and download JSON key
6. **🔒 SECURITY**: Store JSON key securely, never in version control

### Step 4: Configure Domain-wide Delegation (if using service account)
1. Go to [Google Admin Console](https://admin.google.com/)
2. Navigate to **Security** → **API controls** → **Domain-wide delegation**
3. Add service account with scopes:
   ```
   https://www.googleapis.com/auth/gmail.send
   ```

---

## Cloud Storage Configuration

### Step 1: Create Storage Bucket
1. Go to **Cloud Storage** → **Buckets**
2. Click **"CREATE BUCKET"**
3. Configure bucket:
   - **Name**: `daysave-uploads-prod` (globally unique)
   - **Location type**: `Region`
   - **Location**: Choose closest to your users
   - **Storage class**: `Standard`
   - **Access control**: `Fine-grained`
   - **Protection tools**: 
     - ✅ Enable versioning (recommended)
     - ✅ Enable retention policy (optional)

### Step 2: Configure Bucket Permissions
1. Click on your bucket → **Permissions** tab
2. **For Public Files** (if needed):
   - Click **"GRANT ACCESS"**
   - **New principals**: `allUsers`
   - **Role**: `Storage Object Viewer`
3. **For Private Files** (recommended):
   - Use signed URLs for access
   - Grant access only to service accounts

### Step 3: Set Lifecycle Rules (Optional but Recommended)
1. Go to **Lifecycle** tab
2. Add rule to delete old files:
   ```
   Condition: Age 365 days
   Action: Delete
   ```

### Step 4: Configure CORS (if serving files to web)
1. Use `gsutil` command or Cloud Shell:
   ```bash
   echo '[
     {
       "origin": ["https://yourdomain.com", "http://localhost:3000"],
       "method": ["GET", "HEAD"],
       "responseHeader": ["Content-Type", "Access-Control-Allow-Origin"],
       "maxAgeSeconds": 3600
     }
   ]' > cors.json
   
   gsutil cors set cors.json gs://daysave-uploads-prod
   ```

---

## API Key Configuration

### Step 1: Create API Key
1. Go to **APIs & Services** → **Credentials**
2. Click **"CREATE CREDENTIALS"** → **"API key"**
3. **🔒 SECURITY**: Immediately restrict the key

### Step 2: Configure API Key Restrictions
1. Click on the API key to edit
2. **Application restrictions**:
   - **HTTP referrers**: Add your domains:
     ```
     https://yourdomain.com/*
     http://localhost:3000/*
     ```
   - **IP addresses**: Add server IPs (for server-side usage)

3. **API restrictions** - Select specific APIs:
   - ✅ **Cloud Storage JSON API**
   - ✅ **Cloud Speech-to-Text API**
   - ✅ **Cloud Vision API**
   - ✅ **Google Maps JavaScript API**
   - ✅ **Google Maps Geocoding API**
   - ✅ **Google Maps Places API (New)**

### Step 3: Create Separate Keys for Different Environments
- **Development Key**: Restricted to localhost
- **Production Key**: Restricted to production domain
- **Mobile Key**: Restricted to mobile app bundle ID

---

## Security Best Practices

### 1. Credential Management
- **🔒 NEVER** commit secrets to version control
- Use environment variables for all credentials
- Rotate API keys regularly (every 90 days)
- Use separate credentials for dev/staging/production

### 2. Access Control
- Apply principle of least privilege
- Use IAM roles instead of keys where possible
- Enable audit logging for all services
- Regular access reviews

### 3. Network Security
- Restrict API keys to specific domains/IPs
- Use HTTPS only for all endpoints
- Implement rate limiting
- Monitor for unusual API usage

### 4. Data Protection
- Enable versioning on storage buckets
- Set up backup strategies
- Use signed URLs for sensitive files
- Implement data retention policies

### 5. Monitoring and Alerting
- Set up billing alerts
- Monitor API quotas and usage
- Enable security notifications
- Set up log-based metrics

---

## Environment Variables

Create a secure `.env` file with these variables:

```bash
# ===== GOOGLE CLOUD CONFIGURATION =====
GOOGLE_CLOUD_PROJECT_ID=daysave-prod-20240715
GOOGLE_API_KEY=AIzaSyC4ccaYR3G4TYOxItiohp_N4F2gEGiVYJo

# ===== GOOGLE OAUTH CONFIGURATION =====
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwxyz

# ===== GMAIL CONFIGURATION =====
GMAIL_USER=noreply@yourdomain.com
GMAIL_PASS=your-app-specific-password
GMAIL_FROM=noreply@yourdomain.com

# ===== GOOGLE CLOUD STORAGE =====
GOOGLE_CLOUD_STORAGE_BUCKET=daysave-uploads-prod

# ===== SECURITY =====
SESSION_SECRET=super-secure-random-string-32-characters-minimum
```

### Environment-Specific Configurations

#### Development (`.env.development`)
```bash
GOOGLE_CLOUD_PROJECT_ID=daysave-dev
GOOGLE_API_KEY=AIzaSyDEV_KEY_HERE
GOOGLE_CLOUD_STORAGE_BUCKET=daysave-uploads-dev
BASE_URL=http://localhost:3000
```

#### Production (`.env.production`)
```bash
GOOGLE_CLOUD_PROJECT_ID=daysave-prod
GOOGLE_API_KEY=AIzaSyPROD_KEY_HERE
GOOGLE_CLOUD_STORAGE_BUCKET=daysave-uploads-prod
BASE_URL=https://yourdomain.com
```

---

## Testing and Validation

### Step 1: Test OAuth Flow
1. Start your application
2. Navigate to login page
3. Click "Sign in with Google"
4. Verify successful authentication
5. Check user data is correctly stored

### Step 2: Test Email Sending
1. Trigger a password reset or welcome email
2. Check email delivery
3. Verify email formatting and links

### Step 3: Test File Upload
1. Upload a file through your application
2. Verify file appears in Cloud Storage bucket
3. Test file download/access

### Step 4: Test API Services
Run the startup validation:
```bash
npm run test:startup
```

Expected results:
- ✅ Google OAuth: Configuration valid
- ✅ Gmail: Test email sent successfully
- ✅ Cloud Storage: Bucket accessible
- ✅ Google Maps: API services verified
- ✅ Speech-to-Text: API accessible
- ✅ Vision API: API accessible

---

## Troubleshooting

### Common OAuth Issues

#### Error: "redirect_uri_mismatch"
**Solution**: Check authorized redirect URIs in OAuth configuration
- Ensure exact match including protocol (http/https)
- Include trailing slashes if your app uses them

#### Error: "access_denied"
**Solution**: Check OAuth consent screen configuration
- Verify app is not in testing mode for external users
- Add user email to test users list

### Common Gmail Issues

#### Error: "Username and Password not accepted"
**Solution**: 
- Enable 2-Step Verification
- Generate and use App Password instead of account password
- Check Gmail API is enabled

#### Error: "Mail server connection failed"
**Solution**:
- Verify GMAIL_USER and GMAIL_PASS in environment
- Check firewall settings
- Ensure "Less secure app access" is disabled (use App Password)

### Common Storage Issues

#### Error: "Anonymous caller does not have storage.buckets.list access"
**Solution**:
- Enable Cloud Storage JSON API
- Verify API key restrictions include Cloud Storage JSON API
- Check bucket permissions
- Ensure bucket exists in the correct project

#### Error: "Access denied"
**Solution**:
- Check IAM permissions
- Verify service account has Storage Admin role
- Check bucket-level permissions

### Common API Key Issues

#### Error: "API_KEY_SERVICE_BLOCKED"
**Solution**:
- Check API restrictions on the key
- Ensure required APIs are enabled in the project
- Verify API key is not exceeded quota limits

#### Error: "Requests blocked by HTTP referrer"
**Solution**:
- Check HTTP referrer restrictions
- Add your domain to authorized referrers
- Remove restrictions for testing

---

## Production Deployment Checklist

### Before Going Live:
- [ ] OAuth consent screen approved by Google
- [ ] All API keys restricted to production domains
- [ ] Separate production Google Cloud project
- [ ] Production storage bucket with appropriate permissions
- [ ] All environment variables configured for production
- [ ] SSL/TLS certificates configured
- [ ] Monitoring and alerting set up
- [ ] Backup and disaster recovery plan in place
- [ ] Security audit completed
- [ ] Rate limiting configured
- [ ] API quotas appropriate for expected usage

### Security Verification:
- [ ] No secrets in version control
- [ ] All services use least-privilege access
- [ ] Regular credential rotation schedule
- [ ] Audit logging enabled
- [ ] Incident response plan ready

---

## Additional Resources

- [Google Cloud Security Best Practices](https://cloud.google.com/security/best-practices)
- [OAuth 2.0 Security Best Practices](https://tools.ietf.org/html/draft-ietf-oauth-security-topics)
- [Google Cloud Storage Security](https://cloud.google.com/storage/docs/best-practices)
- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Google Maps API Security](https://developers.google.com/maps/api-security-best-practices)

---

## Support and Updates

This document should be reviewed and updated:
- When new Google services are added
- After security incidents
- Quarterly security reviews
- When Google updates their APIs or security requirements

For questions or issues, consult the official Google Cloud documentation or contact your system administrator. 