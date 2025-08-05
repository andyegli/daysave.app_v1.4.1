# Multi-Factor Authentication (MFA) Implementation Guide

## Overview

DaySave v1.4.1 includes a comprehensive Multi-Factor Authentication system using Time-based One-Time Passwords (TOTP). This document provides complete implementation details, usage instructions, and administrative controls.

## 🔐 **Core Features**

### **User Features**
- **Password Change**: Secure password change with current password verification
- **MFA Setup**: Self-service TOTP setup with QR code generation
- **MFA Management**: Enable, disable, and manage MFA settings
- **Backup Codes**: Secure backup codes for account recovery
- **Enforcement Compliance**: Automatic redirection if MFA is required by admin

### **Admin Features**
- **MFA Requirement**: Force users to enable MFA
- **MFA Management**: Reset, enable, or disable MFA for any user
- **Audit Tracking**: Complete audit trail of all MFA changes
- **User Oversight**: View MFA status and enforcement details

## 🛠 **Technical Implementation**

### **Dependencies**
```json
{
  "speakeasy": "^2.0.0",
  "qrcode": "^1.5.3",
  "bcrypt": "^5.1.0"
}
```

### **Database Schema**

#### **User Model Fields** (`models/user.js`)
```javascript
// MFA Core Fields
totp_secret: DataTypes.STRING, // TOTP secret key
totp_enabled: { type: DataTypes.BOOLEAN, defaultValue: false }, // MFA active status
totp_backup_codes: DataTypes.TEXT, // JSON array of backup codes
last_password_change: DataTypes.DATE, // Password change timestamp

// Admin Control Fields  
mfa_required: { type: DataTypes.BOOLEAN, defaultValue: false }, // Admin enforced MFA
mfa_enforced_by: DataTypes.CHAR(36), // Admin who enforced (foreign key to users)
mfa_enforced_at: DataTypes.DATE, // Enforcement timestamp

// Associations
User.belongsTo(models.User, { foreignKey: 'mfa_enforced_by', as: 'MfaEnforcedByAdmin' });
```

#### **Database Migrations**
1. **`20250804140000-add-mfa-fields-to-users.js`** - Core MFA fields
2. **`20250804150000-add-admin-mfa-controls.js`** - Admin enforcement fields

### **API Endpoints**

#### **User Profile Routes** (`/profile/`)
```javascript
POST /profile/change-password    // Change user password
POST /profile/mfa/setup         // Initiate MFA setup (generate QR code)
POST /profile/mfa/verify        // Verify TOTP and enable MFA
POST /profile/mfa/disable       // Disable MFA with password + TOTP verification
```

#### **Admin Management Routes** (`/admin/users/:id/mfa/`)
```javascript
GET  /admin/users/:id/mfa           // Get user MFA status
POST /admin/users/:id/mfa/require   // Require MFA for user
POST /admin/users/:id/mfa/unrequire // Remove MFA requirement
POST /admin/users/:id/mfa/reset     // Reset user's MFA completely
POST /admin/users/:id/mfa/force-enable  // Force enable MFA (if secret exists)
POST /admin/users/:id/mfa/force-disable // Force disable MFA completely
```

## 🎯 **User Workflow**

### **Password Change Process**
1. User accesses profile page (`/profile`)
2. Clicks "Change Password" button
3. Modal opens with current/new password fields
4. System verifies current password with bcrypt
5. New password is hashed and stored
6. `last_password_change` timestamp updated
7. Success notification displayed

### **MFA Setup Process** 
1. User clicks "Enable Two-Factor Authentication"
2. System generates TOTP secret using `speakeasy`
3. QR code generated with `qrcode` library
4. User scans QR code with authenticator app
5. User enters verification code from app
6. System verifies code with `speakeasy.totp.verify()`
7. Backup codes generated (10 single-use codes)
8. MFA enabled (`totp_enabled: true`)
9. Backup codes displayed for user to save

### **MFA Disable Process**
1. User clicks "Disable Two-Factor Authentication"
2. Modal requires current password + TOTP code
3. System verifies both credentials
4. MFA disabled and all secrets cleared
5. Audit event logged

## 🛡 **Admin Management**

### **Admin Interface Location**
```
Navigation: Admin Dashboard → User Management → [Select User] → User Details
URL: /admin/users/[USER_ID]/details
```

### **MFA Management Section**
The admin interface includes a dedicated "Multi-Factor Authentication" card showing:

#### **Real-time Status Display**
- ✅ **MFA Enabled**: YES/NO
- ⚠️ **Required by Admin**: YES/NO  
- 🔑 **Has Secret**: YES/NO (TOTP configured)
- 👤 **Enforced by**: Admin username (if applicable)
- 📅 **Enforced at**: Timestamp of enforcement

#### **Dynamic Action Buttons**
| Button | Action | When Visible |
|--------|--------|--------------|
| **🟨 Require MFA** | Force user to enable MFA | When MFA not required |
| **✅ Remove MFA Requirement** | Remove forced requirement | When MFA is required |
| **🔄 Reset MFA** | Clear all MFA settings | When user has MFA setup |
| **🟦 Force Enable MFA** | Enable MFA for user | When secret exists but disabled |
| **⚪ Force Disable MFA** | Completely remove MFA | When MFA is enabled |

### **Admin Actions Detail**

#### **1. Require MFA** 🟨
- Sets `mfa_required = true` for the user
- Records enforcing admin and timestamp
- User redirected to profile on next login to set up MFA
- User cannot access other system areas until MFA enabled

#### **2. Remove MFA Requirement** ✅
- Sets `mfa_required = false`
- Clears enforcement tracking data
- User can access system without MFA

#### **3. Reset MFA** 🔄
- Clears `totp_secret`, `totp_enabled`, `totp_backup_codes`
- User must set up MFA from scratch
- Useful for locked-out users

#### **4. Force Enable MFA** 🟦
- Enables MFA using existing secret
- Sets both `totp_enabled = true` and `mfa_required = true`
- Only works if user already has a secret configured

#### **5. Force Disable MFA** ⚪
- Nuclear option - removes all MFA settings
- Clears requirement and enforcement data
- Complete MFA reset

## 🔒 **Security Features**

### **MFA Enforcement Middleware** (`middleware/auth.js`)
```javascript
// enforceMfa middleware
// - Checks if user is authenticated
// - Verifies if mfa_required is true
// - Redirects to profile if MFA required but not enabled
// - Skips enforcement for profile/auth/api routes
// - Returns 403 for AJAX requests
```

### **Backup Code Security**
- 10 single-use backup codes generated
- Codes are 8-character alphanumeric
- Stored as JSON array in database
- Used only once for emergency access

### **Password Security**
- Current password required for password changes
- New passwords hashed with bcrypt (salt rounds: 12)
- Password change events fully logged

### **TOTP Security**
- 30-second time window
- Base32 encoded secrets
- Industry-standard RFC 6238 implementation
- QR codes generated server-side

## 📋 **Audit Logging**

All MFA activities are comprehensively logged using `logAuthEvent` and `logAuthError`:

### **User Actions Logged**
- Password change attempts (success/failure)
- MFA setup initiation and completion
- MFA verification attempts
- MFA disable operations
- Backup code generation

### **Admin Actions Logged**
- MFA requirement enforcement/removal
- MFA reset operations
- Force enable/disable operations
- User MFA status queries

### **Log Data Captured**
```javascript
{
  userId: 'user-uuid',
  adminId: 'admin-uuid', // for admin actions
  action: 'mfa_setup_completed',
  targetEmail: 'user@example.com',
  ipAddress: '192.168.1.1',
  userAgent: 'browser details',
  sessionId: 'session-id',
  details: {
    previousState: { totp_enabled: false },
    newState: { totp_enabled: true },
    backupCodesGenerated: 10,
    // ... additional context
  }
}
```

## 🎨 **Frontend Implementation**

### **Templates**
- **`views/profile.ejs`** - Main profile page with MFA controls
- **`views/admin/user-details.ejs`** - Admin MFA management interface

### **JavaScript** 
- **`public/js/profile-management.js`** - Profile page MFA functionality
- **`views/admin/user-details.ejs`** - Inline admin MFA controls

### **CSP Compliance**
All inline JavaScript has been moved to external files:
- Removed all `onclick` attributes
- Implemented `addEventListener` event handling
- Used event delegation for dynamic content
- Added proper Enter key handling

### **Bootstrap Modals**
- Change Password Modal
- Enable MFA Modal (with QR code display)
- Disable MFA Modal
- Backup Codes Display Modal

## 🧪 **Testing Procedures**

### **User Testing**
1. **Password Change Testing**
   - Test with correct current password ✅
   - Test with incorrect current password ❌
   - Verify password hash updated in database
   - Check audit logging

2. **MFA Setup Testing**
   - Generate QR code and verify with authenticator app
   - Test verification with correct/incorrect codes
   - Verify backup codes generated and displayed
   - Check database state after setup

3. **MFA Disable Testing**
   - Test with correct password + TOTP ✅
   - Test with incorrect credentials ❌
   - Verify all MFA data cleared from database

### **Admin Testing**
1. **MFA Enforcement Testing**
   - Require MFA for user
   - Verify user redirected to profile
   - Test access blocking until MFA enabled
   - Remove requirement and verify access restored

2. **MFA Management Testing**
   - Reset user MFA and verify complete cleanup
   - Force enable/disable and verify state changes
   - Check audit logging for all admin actions

## 🔄 **Migration and Rollback**

### **Database Migrations**
```bash
# Apply MFA migrations
npx sequelize-cli db:migrate

# Rollback if needed
npx sequelize-cli db:migrate:undo
npx sequelize-cli db:migrate:undo
```

### **Backup Before Changes**
```bash
# Create database backup before MFA deployment
node scripts/backup-database.js
```

## 🚀 **Deployment Checklist**

### **Pre-Deployment**
- [ ] Database backup completed
- [ ] Environment variables configured
- [ ] Dependencies installed (`speakeasy`, `qrcode`)
- [ ] Migrations ready to apply

### **Deployment Steps**
1. Run database migrations
2. Deploy application code
3. Verify MFA endpoints accessible
4. Test user MFA setup flow
5. Test admin MFA controls
6. Monitor audit logs

### **Post-Deployment Verification**
- [ ] User can change passwords
- [ ] User can set up MFA with QR codes
- [ ] Admin can manage user MFA settings
- [ ] Audit logging working correctly
- [ ] No CSP violations in browser console

## 📖 **User Documentation**

### **For End Users**
1. **Setting Up Two-Factor Authentication**
   - Go to Profile page
   - Click "Enable Two-Factor Authentication"
   - Scan QR code with authenticator app (Google Authenticator, Authy, etc.)
   - Enter verification code from app
   - Save backup codes in secure location

2. **Changing Password**
   - Go to Profile page
   - Click "Change Password"
   - Enter current password and new password
   - Confirm changes

3. **If MFA Required by Admin**
   - You'll be redirected to Profile page
   - Must set up MFA before accessing other features
   - Follow MFA setup instructions above

### **For Administrators**
1. **Requiring MFA for Users**
   - Go to Admin → User Management
   - Select user and go to details
   - Use "Require MFA" button in MFA section
   - User will be prompted to set up MFA on next login

2. **Managing User MFA**
   - Reset MFA if user is locked out
   - Force enable/disable as needed
   - Monitor enforcement status
   - Review audit logs for security

## 🔍 **Troubleshooting**

### **Common Issues**

#### **User Cannot Access QR Code**
- Check browser console for CSP violations
- Verify external JavaScript files loading
- Check network connectivity for QR generation

#### **TOTP Verification Failing**
- Verify server time synchronization
- Check time drift between server and mobile device
- Confirm authenticator app configured correctly

#### **Admin Controls Not Working**
- Verify admin role permissions
- Check browser console for JavaScript errors
- Confirm admin authentication

#### **Backup Codes Not Displaying**
- Check modal JavaScript initialization
- Verify backup code generation in database
- Review error logs for generation failures

### **Debug Commands**
```bash
# Check user MFA status in database
mysql -u root -p daysave_development -e "SELECT id, email, totp_enabled, mfa_required FROM users WHERE email='user@example.com';"

# View recent audit logs
tail -f logs/auth.log | grep mfa

# Test TOTP verification
node -e "const speakeasy = require('speakeasy'); console.log(speakeasy.totp.verify({secret:'SECRET', token:'123456', window:1}));"
```

## 📚 **Additional Resources**

- **RFC 6238**: TOTP Specification
- **Speakeasy Documentation**: https://github.com/speakeasyjs/speakeasy
- **QRCode Documentation**: https://github.com/soldair/node-qrcode
- **Google Authenticator**: Setup instructions
- **OWASP MFA Cheat Sheet**: Security best practices

---

**Implementation Status**: ✅ COMPLETE  
**Version**: v1.4.1  
**Last Updated**: 2025-01-04  
**Audit Trail**: See `docs/MFA_AUDIT_LOGGING.md` for detailed audit specifications