# DaySave Complete Testing Guide

This comprehensive guide covers all testing scenarios for DaySave, from local development to production deployment with SSL certificates.

## Table of Contents

1. [Prerequisites & Tool Installation](#prerequisites--tool-installation)
2. [Local HTTP Testing](#local-http-testing)
3. [Local HTTPS Testing](#local-https-testing)
4. [Remote Proxy Testing](#remote-proxy-testing)
5. [Real Domain SSL Testing](#real-domain-ssl-testing)
6. [HTTPS Enforcement](#https-enforcement)
7. [Debugging & Monitoring](#debugging--monitoring)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites & Tool Installation

### 1. Install Required Tools

```bash
# macOS installations
brew install mkcert
brew install ngrok
brew install cloudflared

# Verify installations
mkcert -version
ngrok version
cloudflared version
```

### 2. Prepare Your Environment

```bash
# Navigate to project directory
cd /path/to/daysave_v1.4.1

# Ensure Docker is running
docker --version
docker-compose --version

# Check your .env file exists
ls -la .env
```

---

## Local HTTP Testing

### Step 1: Start the Docker Stack

```bash
# Start all services
docker-compose up -d

# Verify all containers are running
docker-compose ps

# Expected output:
# NAME                  IMAGE              COMMAND                  SERVICE   STATUS                    PORTS
# daysave-app           daysave_v141-app   "docker-entrypoint.s…"   app       Up (healthy)             0.0.0.0:3000-3001->3000-3001/tcp
# daysave-db            mysql:8.0          "docker-entrypoint.s…"   db        Up (healthy)             0.0.0.0:3306->3306/tcp
# daysave-nginx-local   nginx:alpine       "/docker-entrypoint.…"   nginx     Up                       0.0.0.0:8080->80/tcp
```

### Step 2: Test Local Access Points

```bash
# Test direct app access
curl -s -o /dev/null -w "Status: %{http_code}, Time: %{time_total}s\n" http://localhost:3000/health

# Test nginx proxy access
curl -s -o /dev/null -w "Status: %{http_code}, Time: %{time_total}s\n" http://localhost:8080/health

# Test with browser
open http://localhost:3000
open http://localhost:8080
```

### Step 3: Verify Core Functionality

```bash
# Test login page
curl -s http://localhost:3000/auth/login | grep -i "login"

# Test API health
curl -s http://localhost:3000/api/health || curl -s http://localhost:3000/health

# Test through nginx proxy
curl -s http://localhost:8080/auth/login | grep -i "login"
```

### Step 4: Monitor Logs

```bash
# Watch all container logs
docker-compose logs -f

# Watch specific service logs
docker-compose logs -f app
docker-compose logs -f nginx
docker-compose logs -f db

# Filter for specific events
docker-compose logs app | grep "AUTH_EVENT"
docker-compose logs app | grep "ERROR"
```

---

## Local HTTPS Testing

### Step 1: Install Local Certificate Authority

```bash
# Install mkcert's root certificate
mkcert -install

# Expected output:
# Created a new local CA 💥
# The local CA is now installed in the system trust store! ⚡️
```

### Step 2: Generate Local SSL Certificates

```bash
# Create SSL directory
mkdir -p nginx/ssl

# Generate certificates for local domains
mkcert -cert-file nginx/ssl/localhost.pem \
       -key-file nginx/ssl/localhost-key.pem \
       localhost 127.0.0.1 ::1 \
       daysave.local \
       *.daysave.local

# Verify certificates were created
ls -la nginx/ssl/
# Should show:
# localhost.pem
# localhost-key.pem
```

### Step 3: Configure Local SSL Nginx

```bash
# Update docker-compose.yml to use SSL nginx config
# Edit docker-compose.yml and change nginx volumes to:
#   - ./nginx/ssl:/etc/nginx/ssl:ro
#   - ./nginx/sites-available/daysave-local-ssl.conf:/etc/nginx/conf.d/default.conf:ro

# Restart nginx with SSL config
docker-compose restart nginx
```

### Step 4: Add Local Domain to Hosts File

```bash
# Add local domain to /etc/hosts
echo "127.0.0.1 daysave.local" | sudo tee -a /etc/hosts

# Verify the entry
grep daysave.local /etc/hosts
```

### Step 5: Test Local HTTPS

```bash
# Test HTTPS access
curl -s -o /dev/null -w "Status: %{http_code}, Time: %{time_total}s\n" https://daysave.local

# Test HTTP to HTTPS redirect
curl -s -o /dev/null -w "Status: %{http_code}, Redirect: %{redirect_url}\n" http://daysave.local

# Test with browser
open https://daysave.local
```

---

## Remote Proxy Testing

### Option A: Using ngrok

#### Step 1: Setup ngrok

```bash
# Sign up at ngrok.com and get your auth token
ngrok config add-authtoken YOUR_NGROK_AUTH_TOKEN

# Verify ngrok is configured
ngrok config check
```

#### Step 2: Expose Local Service

```bash
# Terminal 1: Start your Docker services
docker-compose up -d

# Terminal 2: Start ngrok tunnel
# For direct app access:
ngrok http 3000

# OR for nginx proxy access:
ngrok http 8080

# Copy the HTTPS URL from ngrok output (e.g., https://abc123.ngrok.io)
```

#### Step 3: Update Environment for Remote Access

```bash
# Create a temporary .env.ngrok file
cp .env .env.ngrok

# Update BASE_URL in .env.ngrok
sed -i '' 's|BASE_URL=.*|BASE_URL=https://YOUR_NGROK_URL.ngrok.io|' .env.ngrok

# Restart app with new config
docker-compose down
docker-compose --env-file .env.ngrok up -d
```

#### Step 4: Test Remote Access

```bash
# Get your ngrok URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | python3 -c "import sys, json; print(json.load(sys.stdin)['tunnels'][0]['public_url'])")
echo "Testing: $NGROK_URL"

# Test health endpoint
curl -s -o /dev/null -w "Status: %{http_code}, Time: %{time_total}s\n" $NGROK_URL/health

# Test login page
curl -s $NGROK_URL/auth/login | grep -i "login"

# Test in browser
echo "Open in browser: $NGROK_URL"
```

### Option B: Using Cloudflare Tunnel

#### Step 1: Setup Cloudflare Tunnel

```bash
# Start cloudflare tunnel
cloudflared tunnel --url http://localhost:3000

# OR for nginx proxy:
cloudflared tunnel --url http://localhost:8080

# Copy the provided URL (e.g., https://abc-def-ghi.trycloudflare.com)
```

#### Step 2: Test Cloudflare Access

```bash
# Use the provided URL to test
CLOUDFLARE_URL="https://YOUR_CLOUDFLARE_URL.trycloudflare.com"

curl -s -o /dev/null -w "Status: %{http_code}, Time: %{time_total}s\n" $CLOUDFLARE_URL/health
```

### Step 3: OAuth Configuration for Remote Testing

```bash
# For Google OAuth - add to authorized origins:
echo "Add to Google Console: $NGROK_URL"
echo "Authorized JavaScript origins: $NGROK_URL"
echo "Authorized redirect URIs: $NGROK_URL/auth/google/callback"

# For Microsoft OAuth - add to redirect URIs:
echo "Add to Microsoft Azure: $NGROK_URL/auth/microsoft/callback"
```

---

## Real Domain SSL Testing

### Step 1: DNS Configuration

```bash
# Verify your domain points to your server
dig +short daysave.app
nslookup daysave.app

# Test if ports 80 and 443 are accessible
telnet daysave.app 80
telnet daysave.app 443
```

### Step 2: Production Docker Setup

```bash
# Update production compose file with your domain
cp docker-compose.production.yml docker-compose.production.custom.yml

# Edit the file to replace 'your-domain.com' with 'daysave.app'
sed -i '' 's/your-domain.com/daysave.app/g' docker-compose.production.custom.yml

# Verify the changes
grep -n "daysave.app" docker-compose.production.custom.yml
```

### Step 3: Initial HTTP Setup (Before SSL)

```bash
# Create initial nginx config for HTTP only
cat > nginx/sites-available/daysave-http-only.conf << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name daysave.app www.daysave.app;
    
    # Let's Encrypt challenge directory
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        allow all;
    }
    
    # Proxy to app for initial testing
    location / {
        proxy_pass http://daysave-app:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
```

### Step 4: Start Production Stack

```bash
# Create necessary directories
sudo mkdir -p /var/www/html
sudo mkdir -p /etc/letsencrypt

# Start with HTTP-only nginx
docker-compose -f docker-compose.production.custom.yml up -d db app

# Start nginx with HTTP-only config
docker run -d --name nginx-temp \
  --network daysave_v141_daysave-internal \
  -p 80:80 \
  -v $(pwd)/nginx/sites-available/daysave-http-only.conf:/etc/nginx/conf.d/default.conf:ro \
  -v /var/www/html:/var/www/html \
  nginx:alpine
```

### Step 5: Generate Let's Encrypt Certificate

```bash
# Method 1: Standalone (stop nginx first)
docker stop nginx-temp

# Generate certificate
sudo docker run --rm \
  -v letsencrypt_certs:/etc/letsencrypt \
  -v /var/www/html:/var/www/html \
  -p 80:80 \
  certbot/certbot certonly --standalone \
  --email your@email.com \
  --agree-tos --no-eff-email \
  -d daysave.app -d www.daysave.app

# Method 2: Webroot (if nginx is running)
sudo docker run --rm \
  -v letsencrypt_certs:/etc/letsencrypt \
  -v /var/www/html:/var/www/html \
  certbot/certbot certonly --webroot \
  --webroot-path=/var/www/html \
  --email your@email.com \
  --agree-tos --no-eff-email \
  -d daysave.app -d www.daysave.app
```

### Step 6: Verify Certificate

```bash
# Check certificate was created
sudo docker run --rm -v letsencrypt_certs:/etc/letsencrypt certbot/certbot certificates

# Test certificate validity
openssl s_client -connect daysave.app:443 -servername daysave.app < /dev/null 2>/dev/null | openssl x509 -noout -dates
```

### Step 7: Start Full Production Stack with SSL

```bash
# Stop temporary containers
docker stop nginx-temp
docker rm nginx-temp

# Update nginx volumes to include SSL certificates
# Edit docker-compose.production.custom.yml to add:
#   - letsencrypt_certs:/etc/letsencrypt:ro

# Start full production stack
docker-compose -f docker-compose.production.custom.yml up -d
```

---

## HTTPS Enforcement

### Step 1: Configure HTTPS Redirects

```bash
# Update nginx config to enforce HTTPS
cat > nginx/sites-available/daysave-https-enforce.conf << 'EOF'
# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name daysave.app www.daysave.app;
    
    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        allow all;
    }
    
    # Force HTTPS redirect
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name daysave.app www.daysave.app;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/daysave.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/daysave.app/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/daysave.app/fullchain.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Main application
    location / {
        proxy_pass http://daysave-app:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host $server_name;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
```

### Step 2: Test HTTPS Enforcement

```bash
# Test HTTP redirect
curl -s -o /dev/null -w "Status: %{http_code}, Location: %{redirect_url}\n" http://daysave.app

# Expected: Status: 301, Location: https://daysave.app/

# Test HTTPS access
curl -s -o /dev/null -w "Status: %{http_code}, Time: %{time_total}s\n" https://daysave.app/health

# Test security headers
curl -s -I https://daysave.app | grep -E "(Strict-Transport-Security|X-Frame-Options|X-Content-Type-Options)"
```

### Step 3: Update Environment Variables

```bash
# Update .env for HTTPS
sed -i '' 's|BASE_URL=http://|BASE_URL=https://|' .env
sed -i '' 's|BASE_URL=.*localhost.*|BASE_URL=https://daysave.app|' .env

# Restart app with HTTPS config
docker-compose restart app
```

---

## Debugging & Monitoring

### Container Health Monitoring

```bash
# Check container health
docker-compose ps
docker-compose top

# Monitor resource usage
docker stats

# Check container logs in real-time
docker-compose logs -f --tail=100

# Filter logs by service
docker-compose logs -f app | grep -E "(ERROR|WARN|AUTH_EVENT)"
docker-compose logs -f nginx | grep -E "(error|404|502|503)"
```

### Network Connectivity Testing

```bash
# Test container networking
docker network ls
docker network inspect daysave_v141_daysave-network

# Test internal connectivity
docker-compose exec nginx ping daysave-app
docker-compose exec app ping db

# Test external connectivity from container
docker-compose exec app curl -s http://httpbin.org/ip
```

### SSL Certificate Monitoring

```bash
# Check certificate expiration
echo | openssl s_client -servername daysave.app -connect daysave.app:443 2>/dev/null | openssl x509 -noout -dates

# Check certificate chain
echo | openssl s_client -servername daysave.app -connect daysave.app:443 -showcerts

# Test SSL configuration
curl -s -I https://daysave.app | head -1
```

### Performance Monitoring

```bash
# Monitor response times
for i in {1..10}; do
  curl -s -o /dev/null -w "Request $i: %{time_total}s (%{http_code})\n" https://daysave.app/health
  sleep 1
done

# Monitor file upload performance
time curl -X POST -F "file=@testfiles/images/test.jpg" https://daysave.app/upload

# Monitor memory usage
docker-compose exec app cat /proc/meminfo | grep MemAvailable
docker-compose exec app top -bn1 | grep node
```

### Application-Specific Monitoring

```bash
# Monitor authentication events
docker-compose logs app | grep "AUTH_EVENT" | tail -20

# Monitor multimedia processing
docker-compose logs app | grep -E "(MULTIMEDIA|ANALYSIS)" | tail -20

# Monitor database queries (if SQL logging enabled)
docker-compose logs app | grep "Executing" | tail -10

# Monitor API usage
docker-compose logs app | grep -E "(POST|GET|PUT|DELETE)" | grep -v "health" | tail -20
```

---

## Troubleshooting

### Common Issues & Solutions

#### 1. Port Already in Use

```bash
# Find what's using the port
lsof -i :3000
lsof -i :8080

# Kill the process
kill -9 $(lsof -ti:3000)

# Or change the port in docker-compose.yml
```

#### 2. SSL Certificate Issues

```bash
# Verify certificate files exist
docker run --rm -v letsencrypt_certs:/etc/letsencrypt certbot/certbot certificates

# Test certificate manually
openssl x509 -in /path/to/cert.pem -text -noout

# Renew certificate
docker run --rm -v letsencrypt_certs:/etc/letsencrypt certbot/certbot renew
```

#### 3. nginx Configuration Errors

```bash
# Test nginx configuration
docker-compose exec nginx nginx -t

# Reload nginx configuration
docker-compose exec nginx nginx -s reload

# Check nginx error logs
docker-compose logs nginx | grep error
```

#### 4. Database Connection Issues

```bash
# Test database connectivity
docker-compose exec app mysql -h db -u daysave -p daysave_v141

# Check database logs
docker-compose logs db | grep -E "(error|Error|ERROR)"

# Restart database
docker-compose restart db
```

#### 5. Environment Variable Issues

```bash
# Check environment variables in container
docker-compose exec app env | grep -E "(DB_|GOOGLE_|OPENAI_)"

# Verify .env file is loaded
docker-compose config | grep -A 5 environment
```

### Health Check Commands

```bash
# Complete system health check
#!/bin/bash
echo "=== DaySave Health Check ==="

echo "1. Container Status:"
docker-compose ps

echo -e "\n2. Port Accessibility:"
for port in 3000 8080 443; do
  nc -zv localhost $port 2>&1 | grep -q "succeeded" && echo "Port $port: ✅ Open" || echo "Port $port: ❌ Closed"
done

echo -e "\n3. HTTP/HTTPS Testing:"
curl -s -o /dev/null -w "HTTP Health: %{http_code}\n" http://localhost:3000/health
curl -s -o /dev/null -w "HTTPS Health: %{http_code}\n" https://daysave.app/health

echo -e "\n4. Database Connection:"
docker-compose exec -T app node -e "
const db = require('./models');
db.sequelize.authenticate()
  .then(() => console.log('Database: ✅ Connected'))
  .catch(err => console.log('Database: ❌ Error:', err.message));
"

echo -e "\n5. Certificate Status:"
if command -v openssl &> /dev/null; then
  echo | openssl s_client -servername daysave.app -connect daysave.app:443 2>/dev/null | openssl x509 -noout -dates
fi

echo -e "\n=== Health Check Complete ==="
```

Save this as `scripts/health-check.sh` and run:
```bash
chmod +x scripts/health-check.sh
./scripts/health-check.sh
```

This comprehensive guide covers all testing scenarios with detailed commands for monitoring and debugging. Each section builds upon the previous one, allowing you to progress from local development to full production deployment with SSL certificates.