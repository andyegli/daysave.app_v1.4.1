# 🚀 **UPDATED GitHub Secrets Configuration for DaySave CI/CD**

## ✅ **Service Account Status - VERIFIED**
- **Service Account**: `daysave-cicd@daysave.iam.gserviceaccount.com` ✅ EXISTS
- **Project ID**: `daysave` ✅ CORRECT
- **Required Roles**: ✅ ALL ASSIGNED
  - `roles/compute.admin`
  - `roles/containerregistry.ServiceAgent` 
  - `roles/iam.serviceAccountUser`
  - `roles/storage.admin`

## 🔐 **Step-by-Step GitHub Secrets Setup**

### **Step 1: Access GitHub Repository Settings**
1. Go to: https://github.com/andyegli/daysave/settings/secrets/actions
2. Click **"Secrets and variables"** → **"Actions"**

### **Step 2: Repository Variables (Non-sensitive)**
Click **"Variables"** tab and add these 4 variables:

```
GCP_PROJECT_ID=daysave
GCP_REGION=asia-southeast1
GCP_ZONE=asia-southeast1-a
DOMAIN_NAME=daysave.app
```

### **Step 3: Repository Secrets (Sensitive)**
Click **"Secrets"** tab and add these secrets:

#### **🔑 Core Authentication**
```
GOOGLE_APPLICATION_CREDENTIALS
```
**Value**: Copy the entire content from `daysave-cicd-key-base64-NEW.txt`

#### **🗄️ Database Configuration**
```
DB_USER_PASSWORD=your_strong_database_password_min_16_chars
DB_ROOT_PASSWORD=your_strong_root_password_min_16_chars
REDIS_PASSWORD=your_redis_password_min_16_chars
```

#### **🤖 API Keys**
```
OPENAI_API_KEY=sk-your-openai-api-key-here
GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
```

#### **🔐 OAuth Configuration**
```
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
MICROSOFT_CLIENT_ID=your-microsoft-oauth-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-oauth-client-secret
```

#### **📧 Email Configuration**
```
GMAIL_USER=your-gmail-address@gmail.com
GMAIL_PASS=your-gmail-app-password-16-chars
GMAIL_FROM=noreply@daysave.app
```

#### **🔒 Application Security**
```
SESSION_SECRET=your-strong-session-secret-minimum-32-characters-long
JWT_SECRET=your-jwt-secret-key-minimum-32-characters-long
JWT_REFRESH_SECRET=your-jwt-refresh-secret-minimum-32-characters-long
```

#### **🌐 Domain & CORS Configuration**
```
BASE_URL=https://daysave.app
ALLOWED_ORIGINS=https://daysave.app,https://www.daysave.app
WEBAUTHN_RP_ID=daysave.app
```

#### **☁️ Google Cloud Storage**
```
GOOGLE_CLOUD_STORAGE_BUCKET=daysave-v141-2-uploads
```

## 🧪 **Step 4: Test Base64 Encoding**

Run this command to verify your base64 encoding:
```bash
# Test decoding to verify it's correct
cat daysave-cicd-key-base64-NEW.txt | base64 -D | jq .
```

**Expected output**: Should show your service account JSON with `"project_id": "daysave"`

## 🔍 **Step 5: Verification Checklist**

### **Repository Variables (4 items)**
- [ ] `GCP_PROJECT_ID=daysave`
- [ ] `GCP_REGION=asia-southeast1`
- [ ] `GCP_ZONE=asia-southeast1-a`
- [ ] `DOMAIN_NAME=daysave.app`

### **Repository Secrets (19 items)**
- [ ] `GOOGLE_APPLICATION_CREDENTIALS` (from daysave-cicd-key-base64-NEW.txt)
- [ ] `DB_USER_PASSWORD` (16+ characters)
- [ ] `DB_ROOT_PASSWORD` (16+ characters)
- [ ] `REDIS_PASSWORD` (16+ characters)
- [ ] `OPENAI_API_KEY` (starts with sk-)
- [ ] `GOOGLE_MAPS_API_KEY`
- [ ] `GOOGLE_CLIENT_ID` (ends with .apps.googleusercontent.com)
- [ ] `GOOGLE_CLIENT_SECRET`
- [ ] `MICROSOFT_CLIENT_ID`
- [ ] `MICROSOFT_CLIENT_SECRET`
- [ ] `GMAIL_USER`
- [ ] `GMAIL_PASS` (Gmail app password, not regular password)
- [ ] `GMAIL_FROM=noreply@daysave.app`
- [ ] `SESSION_SECRET` (32+ characters)
- [ ] `JWT_SECRET` (32+ characters)
- [ ] `JWT_REFRESH_SECRET` (32+ characters)
- [ ] `BASE_URL=https://daysave.app`
- [ ] `ALLOWED_ORIGINS=https://daysave.app,https://www.daysave.app`
- [ ] `WEBAUTHN_RP_ID=daysave.app`
- [ ] `GOOGLE_CLOUD_STORAGE_BUCKET=daysave-v141-2-uploads`
- [ ] `TEST_ADMIN=your-test-admin-username`
- [ ] `TEST_USER=dstestuser`
- [ ] `TEST_SECRET=your-test-user-password`

## 🔧 **Step 6: Generate Strong Passwords**

Use these commands to generate secure passwords:
```bash
# Generate 32-character passwords for secrets
openssl rand -base64 32  # For SESSION_SECRET
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For JWT_REFRESH_SECRET

# Generate 16-character passwords for database
openssl rand -base64 16  # For DB_USER_PASSWORD
openssl rand -base64 16  # For DB_ROOT_PASSWORD
openssl rand -base64 16  # For REDIS_PASSWORD
```

## 🎯 **Step 7: OAuth Callback URLs**

Ensure your OAuth applications have these callback URLs:

### **Google OAuth**
- `https://daysave.app/auth/google/callback`
- `https://www.daysave.app/auth/google/callback`

### **Microsoft OAuth**
- `https://daysave.app/auth/microsoft/callback`
- `https://www.daysave.app/auth/microsoft/callback`

## 🚨 **Critical Notes**

1. **Never commit secrets to repository**
2. **Use the NEW base64 file**: `daysave-cicd-key-base64-NEW.txt`
3. **Project ID is**: `daysave` (not daysaave)
4. **Service Account**: `daysave-cicd@daysave.iam.gserviceaccount.com`
5. **All typos fixed**: No more "daysaave" references

## ✅ **Ready to Deploy**

Once all secrets are configured, test with:
```bash
git checkout develop
git add .
git commit -m "fix: Update GitHub secrets configuration for CI/CD"
git push origin develop
```

This will trigger the staging deployment pipeline! 🚀
