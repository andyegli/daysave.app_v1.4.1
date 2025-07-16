# 🔧 Google Cloud API Setup Guide

## 🎯 Overview
This guide will help you set up Google Cloud APIs for the multimedia analysis backend. The system requires both **Cloud Vision API** and **Cloud Speech-to-Text API** to be enabled.

## 📋 Prerequisites
- Google Cloud account
- A Google Cloud project
- API key or service account credentials

## 🚀 Step-by-Step Setup

### 1. Create or Select a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your **Project ID** (you'll need this later)

### 2. Enable Required APIs
You need to enable these APIs in your Google Cloud project:

#### Cloud Vision API
1. Go to [Cloud Vision API](https://console.cloud.google.com/apis/library/vision.googleapis.com)
2. Click **"Enable"**
3. Wait a few minutes for the API to be activated

#### Cloud Speech-to-Text API
1. Go to [Cloud Speech-to-Text API](https://console.cloud.google.com/apis/library/speech.googleapis.com)
2. Click **"Enable"**
3. Wait a few minutes for the API to be activated

### 3. Create API Credentials

#### Option A: API Key (Simpler)
1. Go to [APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **"Create Credentials"** → **"API Key"**
3. Copy the generated API key (starts with `AIza`)
4. **Important**: Click on the API key to configure it:
   - Set **Application restrictions** to "HTTP referrers" or "None" for testing
   - Set **API restrictions** to "Restrict key" and select:
     - Cloud Vision API
     - Cloud Speech-to-Text API
5. Add the API key to your `.env` file:
   ```env
   GOOGLE_API_KEY=AIzaSyYourApiKeyHere
   ```

#### Option B: Service Account (More Secure)
1. Go to [APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **"Create Credentials"** → **"Service Account"**
3. Fill in service account details:
   - **Name**: `multimedia-analysis`
   - **Description**: `Service account for multimedia analysis backend`
4. Click **"Create and Continue"**
5. For **Role**, select:
   - **Cloud Vision API User**
   - **Cloud Speech-to-Text API User**
6. Click **"Done"**
7. Click on the created service account
8. Go to **"Keys"** tab
9. Click **"Add Key"** → **"Create new key"**
10. Choose **JSON** format
11. Download the JSON file and save it securely
12. Add the path to your `.env` file:
    ```env
    GOOGLE_APPLICATION_CREDENTIALS=./path/to/your-service-account.json
    ```

### 4. Test Your Setup

#### Test API Connectivity
```bash
curl http://localhost:3000/test-google-api
```

**Expected Success Response:**
```json
{
  "success": true,
  "message": "Google Cloud Vision API is working correctly",
  "method": "API Key"
}
```

**Common Error Responses:**

**403 Forbidden - API Not Enabled:**
```json
{
  "success": false,
  "error": "Google Cloud Vision API test failed: 403 Forbidden",
  "details": "Cloud Vision API has not been used in project XXXX before or it is disabled"
}
```
**Solution**: Enable the Vision API in Google Cloud Console

**400 Bad Request - Invalid API Key:**
```json
{
  "success": false,
  "error": "Google Cloud Vision API test failed: 400 Bad Request"
}
```
**Solution**: Check your API key format and permissions

## 🔍 Troubleshooting

### Common Issues

#### 1. "API Not Enabled" Error
**Problem**: `Cloud Vision API has not been used in project XXXX before or it is disabled`
**Solution**: 
- Go to [Cloud Vision API](https://console.cloud.google.com/apis/library/vision.googleapis.com)
- Click **"Enable"**
- Wait 5-10 minutes for activation

#### 2. "Permission Denied" Error
**Problem**: `PERMISSION_DENIED` or `403 Forbidden`
**Solutions**:
- Check if APIs are enabled
- Verify API key has correct permissions
- Ensure API key is not restricted to wrong APIs
- Check if billing is enabled for the project

#### 3. "Invalid API Key" Error
**Problem**: `400 Bad Request` or `401 Unauthorized`
**Solutions**:
- Verify API key format (should start with `AIza`)
- Check if API key is copied correctly
- Ensure no extra spaces or characters
- Verify API key is not expired or revoked

#### 4. "Quota Exceeded" Error
**Problem**: `429 Too Many Requests`
**Solutions**:
- Check your Google Cloud quotas
- Enable billing if not already enabled
- Request quota increase if needed
- Wait for quota reset (usually daily)

### Billing Setup
1. Go to [Billing](https://console.cloud.google.com/billing)
2. Link a billing account to your project
3. Note: Google Cloud offers free tier for these APIs:
   - Vision API: 1,000 requests/month free
   - Speech-to-Text: 60 minutes/month free

### Security Best Practices
1. **Restrict API Keys**: Set application and API restrictions
2. **Use Service Accounts**: For production environments
3. **Monitor Usage**: Set up billing alerts
4. **Rotate Keys**: Regularly update API keys
5. **Environment Variables**: Never commit API keys to version control

## 📊 API Usage Limits

### Free Tier Limits
- **Vision API**: 1,000 requests/month
- **Speech-to-Text**: 60 minutes/month

### Paid Tier Pricing (as of 2024)
- **Vision API**: $1.50 per 1,000 requests
- **Speech-to-Text**: $0.006 per 15 seconds

## ✅ Verification Checklist

- [ ] Google Cloud project created
- [ ] Cloud Vision API enabled
- [ ] Cloud Speech-to-Text API enabled
- [ ] API key or service account created
- [ ] Credentials added to `.env` file
- [ ] API key permissions configured
- [ ] Billing enabled (if needed)
- [ ] Test endpoint returns success
- [ ] Object detection working
- [ ] Speech-to-text working

## 🆘 Getting Help

If you're still having issues:

1. **Check Google Cloud Console**: Verify APIs are enabled and billing is set up
2. **Review Error Messages**: The test endpoint provides detailed error information
3. **Check Logs**: Server logs show detailed error information
4. **Google Cloud Support**: Available for paid accounts
5. **Community Forums**: Stack Overflow, Google Cloud Community

## 🔗 Useful Links

- [Google Cloud Console](https://console.cloud.google.com/)
- [Cloud Vision API Documentation](https://cloud.google.com/vision/docs)
- [Cloud Speech-to-Text API Documentation](https://cloud.google.com/speech-to-text/docs)
- [API Key Best Practices](https://cloud.google.com/docs/authentication/api-keys)
- [Service Account Best Practices](https://cloud.google.com/iam/docs/service-accounts) 