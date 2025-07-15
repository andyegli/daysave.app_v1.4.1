# Google Cloud Storage Setup Guide

This guide will help you configure Google Cloud Storage for file uploads in the DaySave application.

## Prerequisites

- Google Cloud Project with billing enabled
- Google Cloud Console access
- Terminal/Command Line access

## Step 1: Create Google Cloud Project (if not already done)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your **Project ID** (you'll need this later)

## Step 2: Enable Required APIs

1. In Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for and enable these APIs:
   - **Cloud Storage API**
   - **Cloud Vision API** (for image analysis)
   - **Cloud Speech-to-Text API** (for audio transcription)

## Step 3: Create a Service Account

1. Go to **IAM & Admin** > **Service Accounts**
2. Click **Create Service Account**
3. Fill in the details:
   - **Service account name**: `daysave-storage-service`
   - **Service account ID**: `daysave-storage-service`
   - **Description**: `Service account for DaySave file storage operations`
4. Click **Create and Continue**

## Step 4: Assign Permissions

Add these roles to your service account:
- **Storage Admin** (for managing files and buckets)
- **Storage Object Creator** (for uploading files)
- **Storage Object Viewer** (for reading files)
- **Vision API User** (for image analysis)
- **Speech-to-Text Service Agent** (for audio transcription)

## Step 5: Generate Service Account Key

1. In the **Service Accounts** list, click on your newly created service account
2. Go to the **Keys** tab
3. Click **Add Key** > **Create New Key**
4. Select **JSON** format
5. Download the JSON file
6. **Important**: Keep this file secure and never commit it to version control

## Step 6: Create Storage Bucket

1. Go to **Cloud Storage** > **Buckets**
2. Click **Create Bucket**
3. Configure your bucket:
   - **Bucket name**: `daysave-uploads-[your-project-id]` (must be globally unique)
   - **Location**: Choose a region close to your users
   - **Storage class**: Standard
   - **Access control**: Uniform (recommended)
4. Click **Create**

## Step 7: Configure Environment Variables

1. Move your downloaded JSON key file to a secure location in your project:
   ```bash
   mkdir -p config/credentials
   mv ~/Downloads/your-service-account-key.json config/credentials/google-service-account.json
   ```

2. Edit your `.env` file and update these values:
   ```bash
   # ===== GOOGLE CLOUD CONFIGURATION =====
   GOOGLE_CLOUD_PROJECT_ID=your-actual-project-id
   GOOGLE_APPLICATION_CREDENTIALS=config/credentials/google-service-account.json
   GOOGLE_CLOUD_STORAGE_BUCKET=daysave-uploads-your-project-id
   
   # Optional: Google API Key (alternative to service account for some services)
   GOOGLE_API_KEY=your-google-api-key
   
   # Speech-to-Text Configuration
   GOOGLE_CLOUD_SPEECH_LANGUAGE=en-US
   
   # Vision API Configuration
   GOOGLE_CLOUD_VISION_LANGUAGE=en
   ```

## Step 8: Set Up Bucket Permissions (Optional)

If you want to serve files directly from the bucket:

1. Go to your bucket in Google Cloud Console
2. Click **Permissions** tab
3. Click **Grant Access**
4. Add principal: `allUsers`
5. Select role: **Storage Object Viewer**

## Step 9: Test the Configuration

1. Restart your application:
   ```bash
   npm start
   ```

2. Check the logs for successful initialization:
   ```
   ✅ Google Cloud Storage initialized with project: your-project-id
   ```

3. Try uploading a file through the application to verify it works

## Security Best Practices

1. **Never commit credentials**: Add your credentials file to `.gitignore`
2. **Use environment variables**: Store sensitive data in `.env` file
3. **Limit permissions**: Only grant necessary permissions to your service account
4. **Rotate keys**: Regularly rotate your service account keys
5. **Monitor usage**: Set up billing alerts and monitoring

## Troubleshooting

### Common Issues

1. **"Could not load the default credentials"**
   - Ensure `GOOGLE_APPLICATION_CREDENTIALS` points to correct file path
   - Verify the JSON file exists and is readable
   - Check file permissions

2. **"Access denied"**
   - Verify service account has correct permissions
   - Check if APIs are enabled
   - Ensure billing is enabled on your project

3. **"Bucket not found"**
   - Verify bucket name is correct in environment variables
   - Check if bucket exists in the correct project
   - Ensure bucket name is globally unique

### Verify Environment Variables

Add this to your application startup to verify configuration:

```javascript
console.log('Google Cloud Config:', {
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  bucketName: process.env.GOOGLE_CLOUD_STORAGE_BUCKET,
  credentialsFileExists: require('fs').existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)
});
```

## Alternative: Using Google Cloud SDK

If you prefer to use the Google Cloud SDK instead of a service account file:

1. Install Google Cloud SDK
2. Run: `gcloud auth application-default login`
3. Remove the `GOOGLE_APPLICATION_CREDENTIALS` from your `.env` file
4. The application will use your default credentials

## Cost Considerations

- **Storage**: ~$0.020/GB per month
- **Operations**: ~$0.0004 per 1,000 operations
- **Network**: Egress charges may apply
- **API calls**: Vision and Speech APIs have usage-based pricing

Monitor your usage in the Google Cloud Console to avoid unexpected charges. 