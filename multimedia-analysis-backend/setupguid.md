# 🔑 API Key Setup Guide

This guide shows you how to get API keys for the multimedia analysis backend using **simple API keys** instead of JSON credential files.

## 🚀 Quick Setup Overview

You need **2 API keys**:
1. **OpenAI API Key** - for transcription and summarization
2. **Google Cloud API Key** - for object detection and speech-to-text

---

## 1️⃣ OpenAI API Key Setup

### Step 1: Create OpenAI Account
- Go to [platform.openai.com](https://platform.openai.com)
- Sign up or log in to your account

### Step 2: Generate API Key
- Navigate to **API Keys** section
- Click **"Create new secret key"**
- Copy the key (starts with `sk-`)
- **Important**: Save this key immediately - you won't see it again!

### Step 3: Add to .env
```env
OPENAI_API_KEY=sk-your-actual-key-here
```

**💰 Cost**: ~$0.006 per minute of audio transcription, ~$0.03 per 1K tokens for summarization

---

## 2️⃣ Google Cloud API Key Setup

### Step 1: Create Google Cloud Project
- Go to [console.cloud.google.com](https://console.cloud.google.com)
- Click **"Select a project"** → **"New Project"**
- Enter project name (e.g., "multimedia-analysis")
- Click **"Create"**

### Step 2: Enable Required APIs
- In your project, go to **APIs & Services** → **Library**
- Search for and **Enable** these APIs:
  - **Cloud Vision API**
  - **Cloud Speech-to-Text API**

### Step 3: Create API Key
- Go to **APIs & Services** → **Credentials**
- Click **"Create Credentials"** → **"API Key"**
- Copy the generated key (starts with `AIza`)
- **Optional**: Click on the key to restrict it to specific APIs for security

### Step 4: Add to .env
```env
GOOGLE_API_KEY=AIzaSy-your-actual-key-here
```

**💰 Cost**: 1,000 Vision API requests free/month, 60 minutes Speech-to-Text free/month

---

## 🔧 Complete .env File Example

```env
# Your actual API keys
OPENAI_API_KEY=sk-1234567890abcdef1234567890abcdef1234567890abcdef12
GOOGLE_API_KEY=AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz1234567

# Server configuration
PORT=3000
NODE_ENV=development
```

---

## ✅ Verify Setup

### Test your configuration:
```bash
# Start the server
npm run dev

# Check health endpoint
curl http://localhost:3000/health
```

### Expected response:
```json
{
  "status": "OK",
  "services": {
    "openai": true,
    "google": true
  }
}
```

---

## 🔒 Security Best Practices

### ✅ DO:
- Keep API keys in `.env` file only
- Add `.env` to your `.gitignore`
- Use environment variables in production
- Restrict Google API key to specific APIs
- Monitor API usage and costs

### ❌ DON'T:
- Commit API keys to version control
- Share API keys in public repositories
- Use API keys in client-side code
- Leave API keys unrestricted

---

## 🆘 Troubleshooting

### "Google API key not configured"
- Check that `GOOGLE_API_KEY` is set in `.env`
- Verify the APIs are enabled in Google Cloud Console
- Make sure your API key isn't restricted from these APIs

### "OpenAI API key not found"
- Check that `OPENAI_API_KEY` is set in `.env`
- Verify the key format starts with `sk-`
- Check your OpenAI account has billing enabled

### "API quota exceeded"
- Check your Google Cloud billing and quotas
- Monitor usage in Google Cloud Console
- Consider upgrading your plan if needed

---

## 💡 Why API Keys vs JSON Credentials?

**API Keys are simpler because:**
- ✅ Just one string to manage
- ✅ Easy to set in environment variables
- ✅ No file paths to worry about
- ✅ Works perfectly in containers/cloud deployments
- ✅ Easier to rotate and manage

**Perfect for this use case** since we're making server-to-server API calls without user-specific authentication.

---

## 🎯 You're Ready!

Once you have both API keys in your `.env` file:

```bash
npm run dev
```

Your multimedia analysis API is ready to analyze images, audio, and video files! 🚀s