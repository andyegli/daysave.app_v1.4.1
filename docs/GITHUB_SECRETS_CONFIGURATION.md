# GitHub Secrets Configuration for DaySave

## 🔐 **Complete GitHub Secrets Setup Guide**

This guide shows you exactly how to configure GitHub repository secrets and variables for secure CI/CD deployment.

## **Where to Configure Secrets**

### **Repository Secrets (Sensitive Data)**
**Location**: GitHub Repository → Settings → Secrets and variables → Actions → Repository secrets

These are encrypted and never exposed in logs.

### **Repository Variables (Non-Sensitive Configuration)**
**Location**: GitHub Repository → Settings → Secrets and variables → Actions → Variables

These are visible in workflow logs but useful for configuration.

## **1. Repository Variables (Configure First)**

Add these as **Repository Variables**:

```
GCP_PROJECT_ID=daysave
GCP_REGION=asia-southeast1
GCP_ZONE=asia-southeast1-a
DOMAIN_NAME=daysave.app
```

## **2. Repository Secrets (Sensitive Data)**

### **🔑 Core Authentication**
```
GOOGLE_APPLICATION_CREDENTIALS
```
**Value**: Base64 encoded service account JSON
```bash
# Generate this value:
cat daysave-cicd-key.json | base64 -w 0
```

### **🗄️ Database Configuration**
```
DB_USER_PASSWORD=your_strong_database_password_min_16_chars
DB_ROOT_PASSWORD=your_strong_root_password_min_16_chars  
REDIS_PASSWORD=your_redis_password_min_16_chars
```

### **🤖 API Keys & External Services**
```
OPENAI_API_KEY=sk-your-openai-api-key-here
GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
```

### **🔐 OAuth Configuration**
```
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
MICROSOFT_CLIENT_ID=your-microsoft-oauth-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-oauth-client-secret
```

### **📧 Email Configuration**
```
GMAIL_USER=your-gmail-address@gmail.com
GMAIL_PASS=your-gmail-app-password-16-chars
GMAIL_FROM=noreply@daysave.app
```

### **🔒 Application Security**
```
SESSION_SECRET=your-strong-session-secret-minimum-32-characters-long
JWT_SECRET=your-jwt-secret-key-minimum-32-characters-long
JWT_REFRESH_SECRET=your-jwt-refresh-secret-minimum-32-characters-long
```

### **🌐 Domain & CORS Configuration**
```
BASE_URL=https://daysave.app
ALLOWED_ORIGINS=https://daysave.app,https://www.daysave.app
WEBAUTHN_RP_ID=daysave.app
```

### **☁️ Google Cloud Configuration**
```
GOOGLE_CLOUD_STORAGE_BUCKET=daysave-v141-2-uploads
```

## **3. Step-by-Step Setup Instructions**

### **Step 1: Access GitHub Settings**
1. Go to your GitHub repository
2. Click **Settings** tab
3. In left sidebar, click **Secrets and variables** → **Actions**

### **Step 2: Add Repository Variables**
1. Click **Variables** tab
2. Click **New repository variable**
3. Add each variable from section 1 above

### **Step 3: Add Repository Secrets**
1. Click **Secrets** tab  
2. Click **New repository secret**
3. Add each secret from section 2 above

### **Step 4: Generate Strong Passwords**
```bash
# Generate secure passwords (run locally)
openssl rand -base64 32  # For SESSION_SECRET
openssl rand -base64 32  # For JWT_SECRET  
openssl rand -base64 32  # For JWT_REFRESH_SECRET
openssl rand -base64 16  # For database passwords
```

## **4. Migration from .env Files**

### **Current .env Structure → GitHub Secrets Mapping**

If you currently have secrets in `.env` files, here's how to migrate:

```bash
# Your current .env file
NODE_ENV=production                    → Repository Variable: NODE_ENV
DB_USER_PASSWORD=secret123             → Repository Secret: DB_USER_PASSWORD
OPENAI_API_KEY=sk-abc123               → Repository Secret: OPENAI_API_KEY
GOOGLE_CLIENT_ID=123.apps.google.com   → Repository Secret: GOOGLE_CLIENT_ID
BASE_URL=https://daysave.app           → Repository Secret: BASE_URL
```

### **⚠️ Security Migration Steps**
1. **Copy values** from your `.env` files to GitHub secrets
2. **Test the pipeline** with new secrets
3. **Delete or secure** your local `.env` files
4. **Add `.env*` to `.gitignore`** if not already there

## **5. Environment-Specific Configuration**

### **Staging Environment Secrets**
The pipeline automatically creates staging-specific values:
- Staging uses public IP instead of domain
- Staging uses HTTP instead of HTTPS (for testing)
- Staging uses separate database

### **Production Environment Secrets**
Production uses all the secrets exactly as configured above.

## **6. Verification Checklist**

### **Before Running Pipeline**
- [ ] All 20+ secrets configured in GitHub
- [ ] Service account JSON converted to base64
- [ ] Strong passwords generated (32+ characters)
- [ ] Domain name matches your actual domain
- [ ] OAuth credentials match your Google/Microsoft apps
- [ ] Gmail app password (not regular password)
- [ ] OpenAI API key has sufficient credits

### **Test Your Configuration**
```bash
# Create test branch to trigger CI
git checkout -b test-secrets-config
echo "Testing secrets configuration" >> README.md
git add README.md
git commit -m "test: verify GitHub secrets configuration"
git push origin test-secrets-config
```

Watch the GitHub Actions workflow to verify all secrets are working.

## **7. Security Best Practices**

### **✅ Do's**
- Use GitHub secrets for all sensitive data
- Generate strong, unique passwords
- Rotate secrets every 90 days
- Monitor secret usage in Actions logs
- Use repository variables for non-sensitive config

### **❌ Don'ts**
- Never commit secrets to repository
- Don't use weak passwords
- Don't share service account JSON files
- Don't put secrets in workflow files
- Don't use production secrets in staging

### **🔍 Monitoring**
- Review Actions logs for authentication failures
- Monitor GCP IAM for unusual service account activity
- Set up billing alerts for unexpected usage
- Enable audit logging for sensitive operations

## **8. Troubleshooting**

### **Common Issues**

#### **"Invalid credentials" Error**
```
Error: Failed to authenticate with Google Cloud
```
**Fix**: Verify `GOOGLE_APPLICATION_CREDENTIALS` is correctly base64 encoded
```bash
# Re-encode the JSON file
cat daysave-cicd-key.json | base64 -w 0
```

#### **"Permission denied" Error**
```
Error: The caller does not have permission
```
**Fix**: Check service account has all required IAM roles (see GCP_SERVICE_ACCOUNT_SETUP.md)

#### **"Secret not found" Error**
```
Error: Secret OPENAI_API_KEY not found
```
**Fix**: Verify secret name matches exactly (case-sensitive)

#### **Database Connection Failed**
```
Error: connect ECONNREFUSED
```
**Fix**: Check database password secrets are correct

### **Debug Commands**
```bash
# Check if secrets are accessible (run in GitHub Actions)
echo "Testing secret access..."
echo "Project ID: ${{ vars.GCP_PROJECT_ID }}"
echo "Domain: ${{ vars.DOMAIN_NAME }}"
# Note: Never echo actual secret values!
```

## **9. Complete Secrets Checklist**

Copy this checklist and verify each item:

### **Repository Variables (4 items)**
- [ ] `GCP_PROJECT_ID=daysave`
- [ ] `GCP_REGION=asia-southeast1`  
- [ ] `GCP_ZONE=asia-southeast1-a`
- [ ] `DOMAIN_NAME=daysave.app`

### **Repository Secrets (16 items)**
- [ ] `GOOGLE_APPLICATION_CREDENTIALS` (base64 encoded JSON)
- [ ] `DB_USER_PASSWORD` (16+ characters)
- [ ] `DB_ROOT_PASSWORD` (16+ characters)
- [ ] `REDIS_PASSWORD` (16+ characters)
- [ ] `OPENAI_API_KEY` (starts with sk-)
- [ ] `GOOGLE_MAPS_API_KEY`
- [ ] `GOOGLE_CLIENT_ID` (ends with .apps.googleusercontent.com)
- [ ] `GOOGLE_CLIENT_SECRET`
- [ ] `MICROSOFT_CLIENT_ID`
- [ ] `MICROSOFT_CLIENT_SECRET`
- [ ] `GMAIL_USER` (your Gmail address)
- [ ] `GMAIL_PASS` (Gmail app password)
- [ ] `GMAIL_FROM` (noreply@daysave.app)
- [ ] `SESSION_SECRET` (32+ characters)
- [ ] `JWT_SECRET` (32+ characters)
- [ ] `JWT_REFRESH_SECRET` (32+ characters)
- [ ] `BASE_URL` (https://daysave.app)
- [ ] `ALLOWED_ORIGINS` (https://daysave.app,https://www.daysave.app)
- [ ] `WEBAUTHN_RP_ID` (daysave.app)
- [ ] `GOOGLE_CLOUD_STORAGE_BUCKET` (daysave-uploads)

### **Ready to Deploy**
Once all items are checked, your GitHub Actions pipeline is ready to deploy DaySave to GCP with full security and automation! 🚀
