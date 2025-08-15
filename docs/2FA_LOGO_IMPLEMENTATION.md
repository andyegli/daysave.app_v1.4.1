# 2FA Logo Implementation for Authenticator Apps

## Overview

DaySave now displays its logo in authenticator apps when users set up Two-Factor Authentication (2FA). This provides better brand recognition and user experience.

## How It Works

### Technical Implementation

1. **TOTP URL Enhancement**: The TOTP (Time-based One-Time Password) URL includes an `image` parameter pointing to the DaySave logo
2. **Logo Hosting**: The logo is hosted at `${BASE_URL}/images/daysave-2fa-logo.png`
3. **QR Code Generation**: The enhanced TOTP URL is embedded in the QR code that users scan

### Code Changes

#### Backend (`routes/profile.js`)
```javascript
// Generate secret and QR code with logo
const baseUrl = process.env.BASE_URL || 'https://localhost';
const logoUrl = `${baseUrl}/images/daysave-2fa-logo.png`;

const secret = speakeasy.generateSecret({
  name: `DaySave (${userEmail})`,
  issuer: 'DaySave',
  length: 32
});

// Enhance TOTP URL with logo parameter
const enhancedOtpAuthUrl = `${secret.otpauth_url}&image=${encodeURIComponent(logoUrl)}`;

// Generate QR code using enhanced URL
const qrCodeDataURL = await qrcode.toDataURL(enhancedOtpAuthUrl);
```

#### Frontend (`public/js/profile-management.js`)
- Enhanced UI to inform users about the logo
- Added technical details section for debugging
- Improved user guidance during setup

## Logo Requirements

### Technical Specifications
- **Size**: 64x64 to 512x512 pixels (square aspect ratio preferred)
- **Format**: PNG, JPG, or SVG
- **Accessibility**: Must be publicly accessible via HTTPS
- **Design**: Clear, simple design that works at small sizes

### Current Implementation
- **File**: `public/images/daysave-2fa-logo.png`
- **URL**: `${BASE_URL}/images/daysave-2fa-logo.png`
- **Optimization**: Created via `scripts/optimize-2fa-logo.js`

## Supported Authenticator Apps

The logo feature is supported by major authenticator applications:

✅ **Fully Supported:**
- Google Authenticator
- Microsoft Authenticator
- Authy
- 1Password
- Bitwarden
- LastPass Authenticator

⚠️ **Partial Support:**
- Some older versions may not display logos
- Apps may cache logos (changes take time to appear)

## Testing

### How to Test
1. Enable 2FA in DaySave profile settings
2. Scan the QR code with a supported authenticator app
3. Verify that the DaySave logo appears next to the entry

### Expected Behavior
- **With Logo**: App shows "DaySave" with the DaySave logo icon
- **Without Logo**: App shows "DaySave" with a generic or no icon

## Troubleshooting

### Logo Not Appearing
1. **Check Logo Accessibility**: Ensure `${BASE_URL}/images/daysave-2fa-logo.png` is accessible
2. **Verify HTTPS**: Logo URL must use HTTPS in production
3. **App Support**: Confirm the authenticator app supports logos
4. **Cache Issues**: Try with a different authenticator app or wait for cache refresh

### Debug Information
The MFA setup response includes debug information:
```json
{
  "success": true,
  "qrCode": "data:image/png;base64,...",
  "secret": "JBSWY3DPEHPK3PXP",
  "otpAuthUrl": "otpauth://totp/DaySave%20(user@example.com)?secret=...&image=...",
  "logoUrl": "https://localhost/images/daysave-2fa-logo.png"
}
```

## Security Considerations

### Logo URL Security
- Logo URL is included in QR codes and TOTP URLs
- URL should not contain sensitive information
- Logo file should be optimized and safe

### Privacy
- Authenticator apps may fetch the logo from our servers
- This creates a connection between the user's device and our servers
- Consider this in privacy policies and logging

## Future Enhancements

### Potential Improvements
1. **Dynamic Logo Selection**: Different logos for different environments
2. **Logo Optimization**: Automatic image optimization and multiple formats
3. **Fallback Handling**: Graceful degradation when logo is unavailable
4. **Analytics**: Track logo fetch requests for usage insights

### Configuration Options
Consider adding environment variables:
- `MFA_LOGO_ENABLED`: Enable/disable logo feature
- `MFA_LOGO_URL`: Override default logo URL
- `MFA_LOGO_FALLBACK`: Fallback logo for different environments

## Implementation Notes

### Environment Variables
- Uses `BASE_URL` environment variable for logo URL construction
- Falls back to `https://localhost` in development

### File Management
- Logo files are stored in `public/images/`
- Optimization script: `scripts/optimize-2fa-logo.js`
- Original logo: `daysave-logo.png`
- Optimized logo: `daysave-2fa-logo.png`

### User Experience
- Users are informed about the logo feature during setup
- Technical details are available in a collapsible section
- Clear instructions guide users through the process

## References

- [RFC 6238 - TOTP](https://tools.ietf.org/html/rfc6238)
- [Google Authenticator URI Format](https://github.com/google/google-authenticator/wiki/Key-Uri-Format)
- [Speakeasy Library Documentation](https://github.com/speakeasyjs/speakeasy)
