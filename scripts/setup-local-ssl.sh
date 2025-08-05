#!/bin/bash

# DaySave Local SSL Setup Script
# This script sets up local HTTPS testing with mkcert

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

echo "🔒 DaySave Local SSL Setup"
echo "=========================="

# Step 1: Check if mkcert is installed
echo ""
echo "1️⃣ Checking mkcert installation..."

if ! command -v mkcert &> /dev/null; then
    print_warning "mkcert is not installed"
    
    # Detect OS and provide installation instructions
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            echo "Installing mkcert with Homebrew..."
            brew install mkcert
            print_status "mkcert installed"
        else
            print_error "Homebrew not found. Please install Homebrew first or install mkcert manually"
            echo "Visit: https://github.com/FiloSottile/mkcert#installation"
            exit 1
        fi
    else
        print_error "Please install mkcert manually for your OS"
        echo "Visit: https://github.com/FiloSottile/mkcert#installation"
        exit 1
    fi
else
    print_status "mkcert is already installed"
fi

# Step 2: Install local CA
echo ""
echo "2️⃣ Installing local certificate authority..."

mkcert -install
print_status "Local CA installed in system trust store"

# Step 3: Create SSL directory
echo ""
echo "3️⃣ Creating SSL directory..."

mkdir -p nginx/ssl
print_status "SSL directory created: nginx/ssl"

# Step 4: Generate certificates
echo ""
echo "4️⃣ Generating SSL certificates..."

mkcert -cert-file nginx/ssl/localhost.pem \
       -key-file nginx/ssl/localhost-key.pem \
       localhost 127.0.0.1 ::1 \
       daysave.local \
       *.daysave.local

print_status "SSL certificates generated:"
ls -la nginx/ssl/

# Step 5: Add local domain to hosts file
echo ""
echo "5️⃣ Adding local domain to hosts file..."

if ! grep -q "daysave.local" /etc/hosts; then
    echo "127.0.0.1 daysave.local" | sudo tee -a /etc/hosts
    print_status "Added daysave.local to /etc/hosts"
else
    print_info "daysave.local already in /etc/hosts"
fi

# Step 6: Create SSL docker-compose override
echo ""
echo "6️⃣ Creating SSL docker-compose configuration..."

cat > docker-compose.ssl.yml << 'EOF'
# SSL override for local development
version: '3.8'

services:
  nginx:
    ports:
      - "443:443"
    volumes:
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./nginx/sites-available/daysave-local-ssl.conf:/etc/nginx/conf.d/default.conf:ro
EOF

print_status "Created docker-compose.ssl.yml"

# Step 7: Update .env for HTTPS
echo ""
echo "7️⃣ Updating environment for HTTPS..."

# Create backup
cp .env .env.http.backup
print_info "Created backup: .env.http.backup"

# Update BASE_URL for HTTPS
if grep -q "BASE_URL=http://localhost" .env; then
    sed -i.bak 's|BASE_URL=http://localhost:3000|BASE_URL=https://daysave.local|' .env
    print_status "Updated BASE_URL to https://daysave.local"
else
    print_warning "BASE_URL not found or already HTTPS"
fi

# Step 8: Start services with SSL
echo ""
echo "8️⃣ Starting services with SSL..."

# Stop existing services
docker-compose down

# Start with SSL configuration
docker-compose -f docker-compose.yml -f docker-compose.ssl.yml up -d

print_info "Waiting for services to start..."
sleep 10

# Step 9: Test SSL setup
echo ""
echo "9️⃣ Testing SSL setup..."

# Test HTTP redirect
print_info "Testing HTTP to HTTPS redirect..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://daysave.local || echo "000")
if [[ "$HTTP_STATUS" == "301" ]]; then
    print_status "HTTP to HTTPS redirect working"
else
    print_warning "HTTP redirect status: $HTTP_STATUS (expected 301)"
fi

# Test HTTPS access
print_info "Testing HTTPS access..."
if curl -s -f https://daysave.local/health > /dev/null 2>&1; then
    print_status "HTTPS access working"
else
    print_error "HTTPS access failed"
fi

# Test certificate validity
print_info "Testing certificate validity..."
if echo | openssl s_client -servername daysave.local -connect daysave.local:443 -verify_return_error > /dev/null 2>&1; then
    print_status "SSL certificate is valid"
else
    print_warning "SSL certificate validation failed (this is normal for self-signed certificates)"
fi

# Step 10: Display results
echo ""
echo "🎉 Local SSL Setup Complete!"
echo "=========================="
echo ""
echo "🌐 Your app is now available at:"
echo "   https://daysave.local"
echo "   https://localhost"
echo ""
echo "🔧 Browser Testing:"
echo "   1. Open https://daysave.local in your browser"
echo "   2. You should see a valid SSL certificate (green lock)"
echo "   3. HTTP requests should redirect to HTTPS"
echo ""
echo "📋 Test these URLs:"
echo "   Health: https://daysave.local/health"
echo "   Login: https://daysave.local/auth/login"
echo "   Dashboard: https://daysave.local/dashboard"
echo ""
echo "🔄 To revert to HTTP-only:"
echo "   1. Run: docker-compose down"
echo "   2. Run: mv .env.http.backup .env"
echo "   3. Run: docker-compose up -d"
echo ""
echo "📊 Monitor with:"
echo "   docker-compose logs -f nginx"
echo "   docker-compose logs -f app"

# Optional: Open browser
read -p "Would you like to open https://daysave.local in your browser? (y/n): " open_browser
if [[ "$open_browser" == "y" || "$open_browser" == "Y" ]]; then
    if command -v open &> /dev/null; then
        open https://daysave.local
    elif command -v xdg-open &> /dev/null; then
        xdg-open https://daysave.local
    else
        echo "Please open https://daysave.local in your browser manually"
    fi
fi