# Google Maps API Setup for Contact Address Autocomplete

## Overview
The DaySave.app contact management system includes Google Maps Places API autocomplete for address fields, providing real-time address suggestions as users type.

## Features
- **Google Maps Places Autocomplete**: Real-time address suggestions
- **Fallback Support**: Custom autocomplete if Google Maps API is unavailable
- **Dynamic Fields**: Works with dynamically added address fields
- **CSP Compliant**: Properly configured Content Security Policy

## Setup Instructions

### 1. Get Google Maps API Key
1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - **Maps JavaScript API**
   - **Places API**
4. Create credentials (API Key)
5. Restrict the API key to:
   - HTTP referrers (your domain)
   - Specific APIs (Maps JavaScript API, Places API)

### 2. Configure Environment Variables
Add your Google Maps API key to your `.env` file:

```env
GOOGLE_MAPS_KEY=your_actual_api_key_here
```

### 3. API Key Restrictions (Recommended)
For security, restrict your API key to:
- **Application restrictions**: HTTP referrers
- **Website restrictions**: Add your domain (e.g., `https://yourdomain.com/*`)
- **API restrictions**: Limit to Maps JavaScript API and Places API

### 4. Usage Limits
- **Free tier**: $200 monthly credit
- **Places API**: 28,500 requests/month free
- **Maps JavaScript API**: 28,500 requests/month free

## Implementation Details

### Frontend Integration
- **Script Loading**: Dynamic script URL based on environment configuration
- **Autocomplete**: Google Maps Places Autocomplete widget
- **Fallback**: Custom autocomplete if Google Maps API fails
- **CSP**: Properly configured Content Security Policy

### Backend Configuration
- **Environment Variables**: Secure API key storage
- **Dynamic Script URLs**: Generated based on configuration
- **Error Handling**: Graceful fallback if API is unavailable

## Files Modified
- `config/maps.js` - Google Maps configuration
- `public/js/contact-maps.js` - Frontend autocomplete implementation
- `routes/contacts.js` - Backend route updates
- `views/contacts/form.ejs` - Template updates
- `middleware/security.js` - CSP configuration

## Testing
1. **With API Key**: Address fields should show Google Places suggestions
2. **Without API Key**: Fallback to custom autocomplete
3. **Network Issues**: Graceful degradation to basic input

## Troubleshooting

### Common Issues
1. **"Google Maps API not available"**: Check API key and billing
2. **CSP Errors**: Verify CSP configuration in security middleware
3. **No Suggestions**: Check API quotas and restrictions

### Debug Steps
1. Check browser console for errors
2. Verify API key is correctly set in environment
3. Test API key in Google Cloud Console
4. Check network tab for failed requests

## Security Considerations
- **API Key Protection**: Never expose API key in client-side code
- **Domain Restrictions**: Restrict API key to your domain
- **Usage Monitoring**: Monitor API usage in Google Cloud Console
- **CSP Configuration**: Proper Content Security Policy setup

## Cost Optimization
- **Request Caching**: Implement client-side caching for repeated addresses
- **Debouncing**: Reduce API calls with input debouncing
- **Usage Monitoring**: Set up billing alerts
- **Fallback Strategy**: Use custom autocomplete as backup 