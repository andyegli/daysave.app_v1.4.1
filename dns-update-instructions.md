# DNS Configuration Updates for daysave.app

## Current Staging Server IP: `34.126.109.143`

## Required GoDaddy DNS Changes:

### 1. Update the A Record
**Current:**
```
@	3600	 IN 	A	WebsiteBuilder Site
```

**Change to:**
```
@	3600	 IN 	A	34.126.109.143
```

### 2. Update the www CNAME Record (Optional)
**Current:**
```
www	3600	 IN 	CNAME	@
```

**Keep as is** (this will automatically point www.daysave.app to the same IP)

## Steps in GoDaddy DNS Management:

1. **Log into GoDaddy Account**
   - Go to https://dcc.godaddy.com/
   - Navigate to your domain `daysave.app`

2. **Edit DNS Records**
   - Click on "DNS" or "Manage DNS"
   - Find the A record for `@` (root domain)
   - Change the value from "WebsiteBuilder Site" to `34.126.109.143`
   - Save the changes

3. **DNS Propagation**
   - Changes may take 5-60 minutes to propagate
   - You can test with: `nslookup daysave.app`

## Testing After DNS Update:

Once DNS propagates, these should work:
- http://daysave.app (will redirect to staging)
- https://daysave.app (will need SSL certificate)
- http://www.daysave.app
- https://www.daysave.app

## Production Considerations:

For production deployment, you'll want:
- A separate production VM with a different IP
- SSL certificates (Let's Encrypt)
- Proper firewall rules
- Database backups
