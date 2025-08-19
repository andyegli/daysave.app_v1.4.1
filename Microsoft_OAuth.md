# Complete Guide: Creating Microsoft Azure App Registration for DaySave OAuth

## **Step 1: Access Azure Portal**

1. **Open your web browser** and go to: [https://portal.azure.com](https://portal.azure.com)

2. **Sign in** with your Microsoft account
   - Use any Microsoft account (personal @outlook.com, @hotmail.com, or work/school account)
   - If you don't have one, you can create a free Microsoft account

3. **Accept Azure terms** if this is your first time
   - You might see a welcome screen - click through it
   - No credit card required for this setup

## **Step 2: Navigate to Azure Active Directory**

1. **Find Azure Active Directory**:
   - **Option A**: In the search bar at the top, type "Azure Active Directory" and click on it
   - **Option B**: Look for "Azure Active Directory" in the main dashboard
   - **Option C**: Click "All services" in the left menu, then find "Azure Active Directory" under "Identity"

2. **You should see the Azure AD Overview page** with:
   - Tenant information
   - Recent activity
   - Quick actions menu

## **Step 3: Access App Registrations**

1. **In the left sidebar menu**, look for and click **"App registrations"**
   - It's usually under the "Manage" section
   - You'll see a list of any existing app registrations (might be empty if this is your first)

2. **Click the "+ New registration" button** at the top of the page
   - This is a blue button that says "New registration"

## **Step 4: Fill Out the Registration Form**

You'll see a form titled **"Register an application"**. Fill it out as follows:

### **Name Field**
- **Enter**: `DaySave OAuth App`
- This is the display name users will see during OAuth consent

### **Supported Account Types** (Very Important!)
Choose the **third option**: 
- ✅ **"Accounts in any organizational directory (Any Azure AD directory - Multitenant) and personal Microsoft accounts (e.g. Skype, Xbox)"**

**Why this option?**
- Allows both personal Microsoft accounts (@outlook.com, @hotmail.com, @live.com)
- Allows work/school accounts from any organization
- Maximum compatibility for your users

### **Redirect URI (Optional)**
- **Platform**: Select "Web" from the dropdown
- **URI**: Enter `http://localhost:3000/auth/microsoft/callback`
- This tells Microsoft where to send users after they authenticate

### **Final Check**
Your form should look like this:
```
Name: DaySave OAuth App
Supported account types: [Third option selected - multitenant + personal]
Redirect URI: Web | http://localhost:3000/auth/microsoft/callback
```

## **Step 5: Register the Application**

1. **Click the "Register" button** at the bottom of the form
2. **Wait a few seconds** - Azure will create your app registration
3. **You'll be redirected** to your new app's overview page

## **Step 6: Copy Your Application (Client) ID**

On the **Overview page**, you'll see important information:

1. **Find "Application (client) ID"**
   - It looks like: `12345678-1234-1234-1234-123456789abc`
   - This is a UUID/GUID format

2. **Copy this ID** - you'll need it for your `.env` file
   - Click the copy icon next to it, or select and copy the text
   - **Save it somewhere safe** - this is your `MICROSOFT_CLIENT_ID`

## **Step 7: Create a Client Secret**

1. **In the left sidebar**, click **"Certificates & secrets"**

2. **Click "+ New client secret"**

3. **Fill out the secret form**:
   - **Description**: `DaySave OAuth Secret`
   - **Expires**: Choose "24 months" (recommended) or "Custom" for longer
   - **Click "Add"**

4. **IMMEDIATELY copy the secret value**:
   - You'll see a new secret appear with a "Value" column
   - **Copy the Value** (not the Secret ID)
   - ⚠️ **CRITICAL**: You can only see this value once! If you miss it, you'll need to create a new secret
   - **Save it somewhere safe** - this is your `MICROSOFT_CLIENT_SECRET`

## **Step 8: Configure API Permissions**

1. **In the left sidebar**, click **"API permissions"**

2. **You should see "Microsoft Graph" with "User.Read" already added**
   - This is added by default and is perfect for basic user info

3. **Add required permissions**:
   - Click **"+ Add a permission"**
   - Click **"Microsoft Graph"**
   - Click **"Delegated permissions"**
   - **Search for and select these permissions**:
     - **"email"** - to get email address
     - **"openid"** - required for OpenID Connect
     - **"profile"** - to get profile information
   - Click **"Add permissions"**

4. **Your permissions should now show**:
   - Microsoft Graph: User.Read
   - Microsoft Graph: email
   - Microsoft Graph: openid
   - Microsoft Graph: profile

## **Step 9: Add Production Redirect URI (Optional)**

If you plan to deploy to production:

1. **Go back to "Authentication"** in the left sidebar
2. **Click "+ Add a platform"**
3. **Choose "Web"**
4. **Add your production URL**: `https://yourdomain.com/auth/microsoft/callback`
5. **Click "Configure"**

## **Step 10: Update Your .env File**

Now add these to your DaySave `.env` file:

```bash
# Microsoft OAuth Configuration
MICROSOFT_CLIENT_ID=your-copied-client-id-here
MICROSOFT_CLIENT_SECRET=your-copied-client-secret-here
MICROSOFT_CALLBACK_URL=http://localhost:3000/auth/microsoft/callback
```

## **Verification Checklist**

✅ **App Registration created** with name "DaySave OAuth App"  
✅ **Account types**: Multitenant + personal accounts  
✅ **Client ID copied** and added to .env  
✅ **Client Secret created** and copied to .env  
✅ **Redirect URI configured**: `http://localhost:3000/auth/microsoft/callback`  
✅ **API Permissions set**: User.Read + email  

## **Common Issues & Solutions**

### **"Application not found" error**
- Make sure your Client ID is correct in the .env file
- Check for extra spaces or characters

### **"Redirect URI mismatch" error**
- Ensure the callback URL in Azure exactly matches your app's callback
- Check for http vs https
- Verify the port number (3000)

### **"Invalid client secret" error**
- The secret might have expired
- Create a new client secret and update your .env file

### **Users can't sign in with personal accounts**
- Make sure you selected the third account type option (multitenant + personal)

## **Testing Your Setup**

Once you've completed these steps:

1. **Restart your DaySave application** to load the new environment variables
2. **Go to your login page**: `http://localhost:3000/auth/login`
3. **Click "Continue with Microsoft"**
4. **You should be redirected to Microsoft's login page**
5. **After signing in, you should be redirected back to your app**

## **Security Notes**

- **Never commit your client secret** to version control
- **Use different app registrations** for development and production
- **Regularly rotate client secrets** (every 12-24 months)
- **Monitor your app's usage** in the Azure portal

## **What Happens After Setup**

Once configured, your DaySave application will:

1. **Display the Microsoft OAuth button** on the login page
2. **Allow users to sign in** with their Microsoft accounts
3. **Create user accounts automatically** for new Microsoft users
4. **Link Microsoft accounts** to existing DaySave accounts
5. **Support account linking** from the user profile page

## **Technical Implementation Details**

Your DaySave app already includes:

- **Passport.js Microsoft Strategy** configured in `config/auth.js`
- **OAuth routes** in `routes/auth.js` (`/auth/microsoft` and `/auth/microsoft/callback`)
- **Database integration** with the `SocialAccount` model
- **UI components** with Microsoft branding in the login page
- **Error handling and logging** for OAuth flows
- **Session management** and security features

The Microsoft OAuth integration follows the same robust pattern as your existing Google and Apple OAuth implementations, ensuring consistency and reliability across all authentication providers.

Your Microsoft OAuth integration should now be fully functional! The Microsoft login button on your DaySave login page will work seamlessly with this configuration.
