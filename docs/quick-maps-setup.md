# Quick Google Maps API Setup Guide

## Step 1: Get a Google Maps API Key

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create a new project** or select an existing one
3. **Enable APIs**:
   - Go to "APIs & Services" → "Library"
   - Search for and enable:
     - **Maps JavaScript API**
     - **Places API**
4. **Create credentials**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy the API key

## Step 2: Configure Your Environment

Add this line to your `.env` file:

```env
GOOGLE_MAPS_KEY=your_actual_api_key_here
```

Replace `your_actual_api_key_here` with the API key you copied.

## Step 3: Test the Setup

1. **Restart your application** to load the new environment variable
2. **Visit the test page**: `http://localhost:3000/contacts/test-maps`
3. **Check the debug information** on the page
4. **Try typing in the address field** to see if autocomplete works

## Step 4: Troubleshooting

### If you see "API Key Not Configured":
- Check that your `.env` file has the correct variable name (`GOOGLE_MAPS_KEY`)
- Restart your application after adding the environment variable
- Verify the API key is not empty

### If you see "Google Maps API Not Available":
- Check the browser console (F12) for errors
- Verify both Maps JavaScript API and Places API are enabled
- Check if your API key has proper restrictions

### If autocomplete doesn't work:
- Try typing a real address (e.g., "1600 Pennsylvania")
- Check the browser console for JavaScript errors
- Verify the script URL is loading correctly

## Common Issues

### API Key Restrictions
If you get "This API project is not authorized" errors:
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Click on your API key
3. Under "Application restrictions", select "HTTP referrers"
4. Add your domain (e.g., `http://localhost:3000/*` for development)
5. Under "API restrictions", select "Restrict key"
6. Select both "Maps JavaScript API" and "Places API"

### Billing Issues
Google Maps API requires billing to be enabled:
1. Go to Google Cloud Console → Billing
2. Link a billing account to your project
3. The free tier includes $200 monthly credit

### CORS Issues
If you see CORS errors:
- The CSP is already configured in the application
- Check that your domain is in the allowed origins

## Next Steps

Once the test page works:
1. Go to `/contacts/new` to test the contact form
2. Try adding a new contact with an address
3. The address field should show Google Places suggestions

## Support

If you're still having issues:
1. Check the browser console for specific error messages
2. Verify your API key works in the Google Cloud Console
3. Test with a simple address like "New York" or "London" 