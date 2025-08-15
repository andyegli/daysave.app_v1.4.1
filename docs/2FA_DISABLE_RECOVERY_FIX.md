# 2FA Disable Recovery Fix

## Issue Description

Users who lost their 2FA device and used backup codes to log in were unable to disable 2FA because the system required both:
1. Password verification ✅
2. TOTP verification code ❌ (impossible if device is lost)

This created a catch-22 situation where users with lost devices couldn't disable 2FA even after successfully logging in with backup codes.

## Solution

### Backend Changes (`routes/profile.js`)

**Before:**
- Required both password AND TOTP code
- Failed if TOTP code was missing or invalid

**After:**
- Password verification is always required (security)
- TOTP code is now **optional**
- If TOTP code is provided, it must be valid
- If TOTP code is blank, password verification is sufficient

### Frontend Changes

**UI Updates (`views/profile.ejs`):**
- Changed label to "Verification Code (Optional)"
- Updated placeholder: "000000 (leave blank if you lost your device)"
- Added helpful form text explaining the option
- Removed `required` attribute from verification code input

**JavaScript Updates (`public/js/profile-management.js`):**
- Added password validation
- Made TOTP code optional in validation
- Improved error messages
- Send `undefined` for empty code instead of empty string

## Security Considerations

### Enhanced Security Logging
The system now logs different disable methods:

```javascript
// Password + TOTP verification
disableMethod: 'password_and_totp'
totpVerified: true

// Password only (for lost devices)
disableMethod: 'password_only'
totpVerified: false
```

### Audit Trail
All disable attempts are logged with:
- User identification
- Disable method used
- IP address and user agent
- Timestamp
- Success/failure status

### Security Rationale
- **Password verification proves identity** - user must know account password
- **User already authenticated** - they successfully logged in (possibly with backup codes)
- **Backup codes are single-use** - if they used backup codes, they proved device access previously
- **Admin can still force-disable** - admins retain full control via admin panel

## User Experience Flow

### Scenario 1: User Has Access to Authenticator App
1. User goes to Profile → Security → Disable 2FA
2. Enters password ✅
3. Enters TOTP code from app ✅
4. 2FA disabled with full verification

### Scenario 2: User Lost Authenticator Device
1. User logs in with backup code ✅
2. Goes to Profile → Security → Disable 2FA
3. Enters password ✅
4. **Leaves verification code blank** ✅
5. 2FA disabled with password-only verification
6. System shows: "Two-factor authentication disabled successfully using password verification"

## Error Messages

### Improved Error Handling
- **Invalid TOTP (when provided)**: "Invalid verification code. Leave blank if you cannot access your authenticator app."
- **Invalid format**: "Verification code must be exactly 6 digits, or leave blank if you cannot access your device"
- **Missing password**: "Please enter your password"

## Implementation Details

### Backend Logic Flow
```javascript
// 1. Always verify password
if (user.password_hash !== 'oauth_user') {
  // Verify password is correct
}

// 2. TOTP verification is optional
if (code) {
  // If code provided, it must be valid
  const isValid = speakeasy.totp.verify(...)
  if (!isValid) return error
  disableMethod = 'password_and_totp'
} else {
  // No code provided - password is sufficient
  disableMethod = 'password_only'
}

// 3. Disable MFA regardless of method
await user.update({
  totp_enabled: false,
  totp_secret: null,
  totp_backup_codes: null
})
```

### Frontend Validation
```javascript
// Password is always required
if (!password) {
  return showAlert('Please enter your password', 'danger')
}

// TOTP code is optional, but if provided must be valid format
if (code && (!/^\d{6}$/.test(code))) {
  return showAlert('Must be 6 digits or leave blank', 'danger')
}
```

## Testing Scenarios

### Test Case 1: Normal Disable (with TOTP)
1. Enable 2FA on test account
2. Go to disable 2FA
3. Enter password and current TOTP code
4. Verify successful disable

### Test Case 2: Lost Device Disable (password only)
1. Enable 2FA on test account  
2. Go to disable 2FA
3. Enter password, leave TOTP code blank
4. Verify successful disable with appropriate message

### Test Case 3: Invalid TOTP (when provided)
1. Enable 2FA on test account
2. Go to disable 2FA  
3. Enter password and wrong TOTP code
4. Verify error message suggests leaving blank

## Security Audit Log Examples

### Successful Password-Only Disable
```json
{
  "event": "MFA_DISABLED_SUCCESS",
  "userId": "user-123",
  "disableMethod": "password_only",
  "totpVerified": false,
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "disabledAt": "2024-01-15T10:30:00.000Z"
}
```

### Successful Password + TOTP Disable  
```json
{
  "event": "MFA_DISABLED_SUCCESS", 
  "userId": "user-123",
  "disableMethod": "password_and_totp",
  "totpVerified": true,
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "disabledAt": "2024-01-15T10:30:00.000Z"
}
```

This fix resolves the user experience issue while maintaining security through password verification and comprehensive audit logging.
