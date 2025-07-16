# Email Confirmation Testing Guide

## Overview
This guide provides step-by-step instructions for testing the email confirmation functionality in DaySave v1.4.1.

## Prerequisites

### 1. Environment Configuration
Ensure the following environment variables are configured in your `.env` file:

```bash
# Gmail Configuration (required for email sending)
GMAIL_USER=your-gmail-username@gmail.com
GMAIL_PASS=your-gmail-app-password
GMAIL_FROM=noreply@daysave.app

# Base URL for email links
BASE_URL=http://localhost:3000

# Application Port
APP_PORT=3000
```

### 2. Gmail App Password Setup
1. Go to your Google Account settings
2. Navigate to Security → 2-Step Verification
3. Generate an App Password for "Mail"
4. Use this app password in `GMAIL_PASS` (not your regular Gmail password)

## Testing Procedure

### Step 1: Register a New User
1. Navigate to `http://localhost:3000/auth/register`
2. Fill out the registration form with:
   - **Username**: Choose a unique username (min 3 characters)
   - **Email**: Use a real email address you can access
   - **Password**: Choose a strong password (min 8 characters)
   - **Confirm Password**: Re-enter the same password
3. Click "Register"
4. You should see: "Registration successful! Please check your email to confirm your account."

### Step 2: Check Application Logs
Monitor the application logs for the following events:

#### Expected Log Events:
```
EMAIL_SEND_ATTEMPT - Indicates email sending was initiated
EMAIL_SEND_SUCCESS - Confirms email was sent successfully
REGISTRATION_USER_CREATED - User was created in database
REGISTRATION_EMAIL_SENT - Email sending completed
```

#### How to Check Logs:
- **Console**: Check the terminal running the application
- **Log Files**: Check `logs/app.log` for structured logs
- **Admin Dashboard**: Visit `/admin/logs` (if you're an admin user)

### Step 3: Verify Email Receipt
1. Check your email inbox for a message from `noreply@daysave.app`
2. **Subject**: "Confirm your DaySave account"
3. **Content**: Should contain a verification link
4. **If not in inbox**: Check spam/junk folder

#### Expected Email Content:
```
Hello [USERNAME],

Thank you for registering at DaySave. Please confirm your email by clicking the link below:

[Verify Email]

If you did not register, you can ignore this email.
```

### Step 4: Click Verification Link
1. Click the "Verify Email" link in the email
2. You should be redirected to the login page
3. Expected message: "Your email has been verified! You can now log in."

### Step 5: Test Login
1. Try logging in with your credentials
2. Login should be successful
3. You should be redirected to the dashboard

## Troubleshooting

### Email Not Received

#### Check 1: Application Logs
Look for these error patterns in logs:
- `EMAIL_SEND_ERROR` - Email sending failed
- `SMTP connection failed` - Gmail authentication issues
- `Invalid app password` - Incorrect Gmail credentials

#### Check 2: Gmail Configuration
```bash
# Verify environment variables are set
echo $GMAIL_USER
echo $GMAIL_PASS
echo $GMAIL_FROM
```

#### Check 3: Gmail Settings
- Ensure 2FA is enabled on your Google account
- Generate a new App Password if current one isn't working
- Check that "Less secure app access" is disabled (we use App Passwords instead)

### Common Error Messages

#### "An error occurred. Please try again."
- **Cause**: Database connection issue or email sending failure
- **Solution**: Check database connection and Gmail credentials

#### "Invalid or expired verification token"
- **Cause**: Link was clicked multiple times or token was corrupted
- **Solution**: Register again with a new email or different username

#### "Please verify your email before logging in"
- **Cause**: User trying to log in before email verification
- **Solution**: Complete email verification first

### Network Issues
If running locally with restrictive network settings:
- Ensure ports 587 (SMTP) and 465 (SMTPS) are not blocked
- Check firewall settings for outbound email connections

## Advanced Testing

### Testing Email Content
1. **HTML Rendering**: Check email displays correctly in different clients
2. **Link Functionality**: Verify the verification link works properly
3. **Token Security**: Ensure tokens are unique and properly randomized

### Testing Edge Cases
1. **Multiple Registrations**: Try registering with the same email twice
2. **Expired Tokens**: Test behavior after extended time periods
3. **Invalid Tokens**: Try manually modifying the verification URL

### Database Verification
Check user table for proper email verification status:

```sql
SELECT id, username, email, email_verified, email_verification_token 
FROM users 
WHERE email = 'your-test-email@example.com';
```

## Success Criteria

✅ **Email Confirmation System Working Correctly When:**
- Registration creates user with `email_verified: false`
- Email is sent successfully (check logs for `EMAIL_SEND_SUCCESS`)
- Verification email is received in inbox
- Clicking verification link sets `email_verified: true`
- User can log in after email verification
- Unverified users cannot log in (get verification prompt)

## Log Event Reference

### Registration Events
- `REGISTRATION_ATTEMPT` - User started registration
- `REGISTRATION_USER_CREATED` - User record created
- `REGISTRATION_EMAIL_SENT` - Confirmation email sent
- `REGISTRATION_ERROR` - Registration failed

### Email Events
- `EMAIL_SEND_ATTEMPT` - Started sending email
- `EMAIL_SEND_SUCCESS` - Email sent successfully
- `EMAIL_SEND_ERROR` - Email sending failed

### Verification Events
- `EMAIL_VERIFICATION_SUCCESS` - User verified email
- `EMAIL_VERIFICATION_FAILED` - Verification failed

## Performance Considerations

- Email sending is synchronous during registration
- Large volumes may require queue-based email processing
- Consider implementing email rate limiting for production

## Security Notes

- Verification tokens are cryptographically secure (32 random bytes)
- Tokens are single-use (cleared after verification)
- No password reset functionality implemented yet
- Email verification required for login (security best practice) 