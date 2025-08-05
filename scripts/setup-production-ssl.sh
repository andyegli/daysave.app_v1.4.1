#!/bin/bash

# DaySave Production SSL Setup Script
# This script sets up SSL certificates for production deployment

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

# Configuration
DOMAIN="daysave.app"
EMAIL=""
STAGING=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--domain)
            DOMAIN="$2"
            shift 2
            ;;
        -e|--email)
            EMAIL="$2"
            shift 2
            ;;
        -s|--staging)
            STAGING=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  -d, --domain DOMAIN    Domain name (default: daysave.app)"
            echo "  -e, --email EMAIL      Email for Let's Encrypt"
            echo "  -s, --staging          Use Let's Encrypt staging server"
            echo "  -h, --help             Show this help"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "🔒 DaySave Production SSL Setup"
echo "==============================="
echo ""
echo "Domain: $DOMAIN"
echo "Staging: $STAGING"

# Get email if not provided
if [ -z "$EMAIL" ]; then
    read -p "Enter your email for Let's Encrypt: " EMAIL
fi

if [ -z "$EMAIL" ]; then
    print_error "Email is required for Let's Encrypt"
    exit 1
fi

print_info "Email: $EMAIL"

# Step 1: Verify prerequisites
echo ""
echo "1️⃣ Verifying prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed"
    exit 1
fi
print_status "Docker found"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed"
    exit 1
fi
print_status "Docker Compose found"

# Check if we're in the right directory
if [ ! -f "docker-compose.production.yml" ]; then
    print_error "docker-compose.production.yml not found"
    exit 1
fi
print_status "Production compose file found"

# Step 2: Verify DNS
echo ""
echo "2️⃣ Verifying DNS configuration..."

print_info "Checking DNS for $DOMAIN..."
if dig +short "$DOMAIN" > /dev/null 2>&1; then
    IP=$(dig +short "$DOMAIN" | tail -n1)
    print_status "DNS resolved: $DOMAIN -> $IP"
    
    # Get public IP
    PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "unknown")
    if [ "$IP" = "$PUBLIC_IP" ]; then
        print_status "DNS points to this server"
    else
        print_warning "DNS points to $IP, but this server's public IP is $PUBLIC_IP"
        echo "This might be okay if you're behind a load balancer or proxy"
    fi
else
    print_error "DNS resolution failed for $DOMAIN"
    exit 1
fi

# Check www subdomain
if dig +short "www.$DOMAIN" > /dev/null 2>&1; then
    print_status "www.$DOMAIN DNS configured"
else
    print_warning "www.$DOMAIN DNS not configured (optional)"
fi

# Step 3: Check port accessibility
echo ""
echo "3️⃣ Checking port accessibility..."

for port in 80 443; do
    if nc -z "$DOMAIN" "$port" 2>/dev/null; then
        print_status "Port $port is accessible on $DOMAIN"
    else
        print_error "Port $port is not accessible on $DOMAIN"
        echo "Make sure your firewall allows port $port"
        echo "For cloud providers, check security groups/firewall rules"
    fi
done

# Step 4: Prepare production configuration
echo ""
echo "4️⃣ Preparing production configuration..."

# Create custom production compose file
cp docker-compose.production.yml docker-compose.production.custom.yml

# Replace domain placeholders
sed -i.bak "s/your-domain.com/$DOMAIN/g" docker-compose.production.custom.yml
print_status "Updated domain in production compose file"

# Create nginx config with domain
cat > nginx/sites-available/daysave-production.conf << EOF
# DaySave Production Configuration
# This is the initial HTTP-only config for SSL setup

server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        allow all;
    }
    
    # Temporary proxy for SSL setup
    location / {
        proxy_pass http://daysave-app:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

print_status "Created initial nginx configuration"

# Step 5: Start services for certificate generation
echo ""
echo "5️⃣ Starting services for certificate generation..."

# Create webroot directory
sudo mkdir -p /var/www/html
print_status "Created webroot directory"

# Stop any running containers
docker-compose down 2>/dev/null || true

# Start database and app first
docker-compose -f docker-compose.production.custom.yml up -d db app

print_info "Waiting for services to start..."
sleep 10

# Start nginx with HTTP-only config
docker run -d --name nginx-temp \
  --network "$(basename $(pwd))_daysave-internal" \
  -p 80:80 \
  -v "$(pwd)/nginx/sites-available/daysave-production.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "/var/www/html:/var/www/html" \
  nginx:alpine

print_status "Started temporary nginx for certificate generation"

# Wait for nginx to start
sleep 5

# Test HTTP access
if curl -s -f "http://$DOMAIN/health" > /dev/null; then
    print_status "HTTP access working"
else
    print_warning "HTTP access test failed (this might be okay)"
fi

# Step 6: Generate SSL certificate
echo ""
echo "6️⃣ Generating SSL certificate..."

# Prepare certbot command
CERTBOT_CMD="certbot certonly --webroot --webroot-path=/var/www/html --email $EMAIL --agree-tos --no-eff-email"

if [ "$STAGING" = true ]; then
    CERTBOT_CMD="$CERTBOT_CMD --staging"
    print_info "Using Let's Encrypt staging server"
fi

CERTBOT_CMD="$CERTBOT_CMD -d $DOMAIN -d www.$DOMAIN"

print_info "Running certbot..."
print_info "Command: $CERTBOT_CMD"

# Create certificate volume if it doesn't exist
docker volume create letsencrypt_certs 2>/dev/null || true

# Run certbot
if docker run --rm \
  -v letsencrypt_certs:/etc/letsencrypt \
  -v /var/www/html:/var/www/html \
  certbot/certbot $CERTBOT_CMD; then
    print_status "SSL certificate generated successfully"
else
    print_error "SSL certificate generation failed"
    docker stop nginx-temp && docker rm nginx-temp
    exit 1
fi

# Step 7: Update nginx configuration for HTTPS
echo ""
echo "7️⃣ Updating nginx configuration for HTTPS..."

cat > nginx/sites-available/daysave-https.conf << EOF
# DaySave Production HTTPS Configuration

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        allow all;
    }
    
    # Redirect all HTTP to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;

    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Logging
    access_log /var/log/nginx/daysave_access.log;
    error_log /var/log/nginx/daysave_error.log;

    # Main Application
    location / {
        proxy_pass http://daysave-app:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host \$server_name;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # API Routes
    location /api/ {
        proxy_pass http://daysave-app:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        
        # Extended timeout for multimedia processing
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    # File Upload
    location /upload {
        client_max_body_size 50m;
        client_body_timeout 300s;
        
        proxy_pass http://daysave-app:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        proxy_request_buffering off;
    }

    # Health Check
    location /health {
        proxy_pass http://daysave-app:3000;
        proxy_set_header Host \$host;
        access_log off;
    }

    # Static Files
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://daysave-app:3000;
        proxy_set_header Host \$host;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

print_status "Created HTTPS nginx configuration"

# Step 8: Update production compose for HTTPS
echo ""
echo "8️⃣ Updating production compose for HTTPS..."

# Update nginx service to use HTTPS config and certificates
cat >> docker-compose.production.custom.yml << EOF

# SSL volume override
volumes:
  letsencrypt_certs:
    external: true
EOF

# Update nginx volumes in compose file
sed -i.bak2 's|./nginx/sites-available/daysave.conf:/etc/nginx/conf.d/default.conf:ro|./nginx/sites-available/daysave-https.conf:/etc/nginx/conf.d/default.conf:ro|' docker-compose.production.custom.yml

# Add certificate volume
sed -i.bak3 '/nginx:/,/networks:/ s|volumes:|volumes:\n      - letsencrypt_certs:/etc/letsencrypt:ro|' docker-compose.production.custom.yml

print_status "Updated production compose file"

# Step 9: Start full production stack
echo ""
echo "9️⃣ Starting full production stack..."

# Stop temporary nginx
docker stop nginx-temp && docker rm nginx-temp

# Start full production stack
docker-compose -f docker-compose.production.custom.yml down
docker-compose -f docker-compose.production.custom.yml up -d

print_info "Waiting for services to start..."
sleep 15

# Step 10: Test HTTPS
echo ""
echo "🔟 Testing HTTPS configuration..."

# Test HTTP redirect
print_info "Testing HTTP to HTTPS redirect..."
redirect_response=$(curl -s -o /dev/null -w "%{http_code}:%{redirect_url}" "http://$DOMAIN/health")
status_code=$(echo $redirect_response | cut -d: -f1)
redirect_url=$(echo $redirect_response | cut -d: -f2-)

if [ "$status_code" = "301" ] && [[ "$redirect_url" == https://* ]]; then
    print_status "HTTP to HTTPS redirect working"
else
    print_warning "HTTP redirect issue: $status_code -> $redirect_url"
fi

# Test HTTPS access
print_info "Testing HTTPS access..."
if curl -s -f "https://$DOMAIN/health" > /dev/null 2>&1; then
    print_status "HTTPS access working"
else
    print_error "HTTPS access failed"
fi

# Test SSL certificate
print_info "Testing SSL certificate..."
cert_info=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "ERROR")

if [[ "$cert_info" != "ERROR" ]]; then
    print_status "SSL certificate is valid"
    echo "   $cert_info"
else
    print_error "SSL certificate validation failed"
fi

# Test security headers
print_info "Testing security headers..."
headers=$(curl -s -I "https://$DOMAIN" | grep -E "(Strict-Transport-Security|X-Frame-Options|X-Content-Type-Options)")
if [ -n "$headers" ]; then
    print_status "Security headers configured"
    echo "$headers" | sed 's/^/   /'
else
    print_warning "Some security headers missing"
fi

# Step 11: Setup certificate renewal
echo ""
echo "1️⃣1️⃣ Setting up certificate renewal..."

# Create renewal script
cat > scripts/renew-ssl.sh << 'EOF'
#!/bin/bash
# SSL Certificate Renewal Script

echo "🔄 Renewing SSL certificates..."

# Renew certificates
if docker run --rm \
  -v letsencrypt_certs:/etc/letsencrypt \
  -v /var/www/html:/var/www/html \
  certbot/certbot renew --quiet; then
    echo "✅ Certificate renewal successful"
    
    # Reload nginx
    docker-compose -f docker-compose.production.custom.yml exec nginx nginx -s reload
    echo "✅ Nginx reloaded"
else
    echo "❌ Certificate renewal failed"
    exit 1
fi
EOF

chmod +x scripts/renew-ssl.sh
print_status "Created certificate renewal script"

# Add to crontab suggestion
echo ""
print_info "Add this to your crontab for automatic renewal:"
echo "0 2 * * 0 cd $(pwd) && ./scripts/renew-ssl.sh"

# Final summary
echo ""
echo "🎉 Production SSL Setup Complete!"
echo "================================="
echo ""
print_status "Your DaySave instance is now running with SSL at https://$DOMAIN"
echo ""
echo "🔍 Configuration Summary:"
echo "   Domain: $DOMAIN"
echo "   SSL Provider: Let's Encrypt"
echo "   Staging Mode: $STAGING"
echo "   Certificate Location: Docker volume 'letsencrypt_certs'"
echo ""
echo "🔧 Next Steps:"
echo "   1. Update your OAuth app configurations:"
echo "      - Google: Add https://$DOMAIN to authorized origins"
echo "      - Microsoft: Add https://$DOMAIN/auth/microsoft/callback"
echo "   2. Update BASE_URL in your .env file to https://$DOMAIN"
echo "   3. Test all functionality"
echo "   4. Set up automatic certificate renewal in crontab"
echo ""
echo "📊 Monitor with:"
echo "   docker-compose -f docker-compose.production.custom.yml logs -f"
echo "   ./scripts/health-check.sh"
echo ""
echo "🔄 Renew certificates with:"
echo "   ./scripts/renew-ssl.sh"

# Test final access
echo ""
print_info "Final test - opening https://$DOMAIN in browser..."
if command -v open &> /dev/null; then
    open "https://$DOMAIN"
elif command -v xdg-open &> /dev/null; then
    xdg-open "https://$DOMAIN"
else
    echo "Please open https://$DOMAIN in your browser"
fi