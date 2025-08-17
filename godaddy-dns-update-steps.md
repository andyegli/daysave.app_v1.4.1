# GoDaddy DNS Update Instructions

## 🎯 Goal: Point daysave.app to staging server IP: `34.126.109.143`

## Step-by-Step Instructions:

### 1. Log into GoDaddy
- Go to https://dcc.godaddy.com/
- Sign in with your GoDaddy account
- Navigate to "My Products" → "All Products and Services"
- Find `daysave.app` and click "DNS" or "Manage"

### 2. Update the A Record
**Find this record:**
```
Type: A
Name: @
Value: WebsiteBuilder Site
TTL: 3600
```

**Change it to:**
```
Type: A
Name: @
Value: 34.126.109.143
TTL: 3600 (or 600 for faster updates)
```

### 3. Verify www Record (should already be correct)
**This should exist:**
```
Type: CNAME
Name: www
Value: @
TTL: 3600
```

### 4. Save Changes
- Click "Save" or "Save Changes"
- Wait 5-60 minutes for DNS propagation

## 🧪 Test DNS Propagation

After making the changes, test with these commands:

```bash
# Test from your local machine
nslookup daysave.app
dig daysave.app

# Should return: 34.126.109.143
```

## ⏱️ Timeline
- **DNS Update**: 2-3 minutes in GoDaddy
- **Propagation**: 5-60 minutes globally
- **SSL Setup**: Can start once DNS propagates

## 🚨 Important Notes
- Don't delete any other records (MX, TXT, NS, etc.)
- Only change the A record for `@` (root domain)
- Keep the www CNAME record as is
- The staging server IP is: `34.126.109.143`

## ✅ Ready for Next Step
Once DNS propagates (daysave.app resolves to 34.126.109.143), we can proceed with Let's Encrypt SSL certificates.
