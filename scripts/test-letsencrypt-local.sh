#!/bin/bash

# DaySave Let's Encrypt Testing Script for Local Development
# This script helps you test SSL certificate generation locally

set -e

echo "🔒 DaySave Let's Encrypt Local Testing"
echo "====================================="

echo ""
echo "📋 Let's Encrypt Local Testing Options:"
echo ""
echo "1. 🧪 STAGING ENVIRONMENT"
echo "   - Use Let's Encrypt staging server"
echo "   - Requires real domain pointing to your IP"
echo "   - Rate limits are much higher"
echo ""
echo "2. 🏠 LOCAL CERTIFICATE AUTHORITY"
echo "   - Use mkcert for local development"
echo "   - Creates locally trusted certificates"
echo "   - No domain requirements"
echo ""
echo "3. 🌐 REAL DOMAIN TESTING"
echo "   - Use actual domain with DNS"
echo "   - Test full production setup"
echo ""

read -p "Choose testing method (1-3): " choice

case $choice in
    1)
        echo ""
        echo "🧪 Setting up Let's Encrypt STAGING testing..."
        echo ""
        echo "Prerequisites:"
        echo "□ Domain name pointing to your public IP"
        echo "□ Port 80/443 forwarded to your machine"
        echo "□ Docker with production compose file"
        echo ""
        
        read -p "Enter your test domain: " domain
        
        echo "Creating staging configuration..."
        
        # Create staging nginx config
        cat > nginx/sites-available/daysave-staging.conf << EOF
# DaySave Staging Configuration for Let's Encrypt Testing
server {
    listen 80;
    listen [::]:80;
    server_name ${domain};
    
    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        allow all;
    }
    
    # Redirect to app for testing
    location / {
        proxy_pass http://daysave-app:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
        
        echo "✅ Staging config created"
        echo ""
        echo "📋 Next steps:"
        echo "1. Update docker-compose.production.yml with your domain"
        echo "2. Run: docker-compose -f docker-compose.production.yml up -d"
        echo "3. Run certbot with staging flag:"
        echo "   docker run -it --rm -v letsencrypt:/etc/letsencrypt \\"
        echo "     -v /var/www/html:/var/www/html \\"
        echo "     certbot/certbot certonly --webroot \\"
        echo "     --webroot-path=/var/www/html \\"
        echo "     --staging \\"
        echo "     --email your@email.com \\"
        echo "     --agree-tos --no-eff-email \\"
        echo "     -d ${domain}"
        ;;
        
    2)
        echo ""
        echo "🏠 Setting up local certificate authority (mkcert)..."
        
        # Check if mkcert is installed
        if ! command -v mkcert &> /dev/null; then
            echo "Installing mkcert..."
            case "$(uname -s)" in
                Darwin*)
                    if command -v brew &> /dev/null; then
                        brew install mkcert
                    else
                        echo "❌ Please install Homebrew first or install mkcert manually"
                        exit 1
                    fi
                    ;;
                Linux*)
                    echo "📋 Install mkcert on Linux:"
                    echo "   Ubuntu/Debian: apt install libnss3-tools && wget -O mkcert https://github.com/FiloSottile/mkcert/releases/latest/download/mkcert-v*-linux-amd64 && chmod +x mkcert && sudo mv mkcert /usr/local/bin/"
                    exit 1
                    ;;
            esac
        fi
        
        echo "✅ mkcert found"
        
        # Install local CA
        echo "Installing local certificate authority..."
        mkcert -install
        
        # Create certificates directory
        mkdir -p nginx/ssl
        
        # Generate certificates for localhost and common local domains
        echo "Generating local certificates..."
        mkcert -cert-file nginx/ssl/localhost.pem \
               -key-file nginx/ssl/localhost-key.pem \
               localhost 127.0.0.1 ::1 \
               daysave.local \
               *.daysave.local
        
        echo "✅ Local certificates generated"
        
        # Create local nginx config
        cat > nginx/sites-available/daysave-local-ssl.conf << EOF
# DaySave Local SSL Configuration
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name localhost daysave.local;

    # Local SSL certificates
    ssl_certificate /etc/nginx/ssl/localhost.pem;
    ssl_certificate_key /etc/nginx/ssl/localhost-key.pem;

    # Basic SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    location / {
        proxy_pass http://daysave-app:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name localhost daysave.local;
    return 301 https://\$server_name\$request_uri;
}
EOF

        echo "✅ Local SSL nginx config created"
        echo ""
        echo "📋 Next steps:"
        echo "1. Add to /etc/hosts: 127.0.0.1 daysave.local"
        echo "2. Update docker-compose.yml nginx volumes:"
        echo "   - ./nginx/ssl:/etc/nginx/ssl:ro"
        echo "   - ./nginx/sites-available/daysave-local-ssl.conf:/etc/nginx/conf.d/default.conf:ro"
        echo "3. Run: docker-compose up nginx"
        echo "4. Test: https://daysave.local"
        ;;
        
    3)
        echo ""
        echo "🌐 Real domain testing setup..."
        echo ""
        read -p "Enter your domain: " domain
        read -p "Enter your email: " email
        
        echo ""
        echo "📋 Prerequisites for real domain testing:"
        echo "□ Domain DNS pointing to your public IP"
        echo "□ Ports 80 and 443 accessible from internet"
        echo "□ Router/firewall configured for port forwarding"
        echo ""
        echo "🚀 Commands to run:"
        echo ""
        echo "1. Start the stack:"
        echo "   docker-compose -f docker-compose.production.yml up -d"
        echo ""
        echo "2. Generate certificate:"
        echo "   docker run --rm -v letsencrypt_certs:/etc/letsencrypt \\"
        echo "     -v /tmp/acme-challenge:/var/www/html \\"
        echo "     -p 80:80 \\"
        echo "     certbot/certbot certonly --standalone \\"
        echo "     --email ${email} \\"
        echo "     --agree-tos --no-eff-email \\"
        echo "     -d ${domain}"
        echo ""
        echo "3. Update nginx config with your domain"
        echo "4. Restart nginx: docker-compose restart nginx"
        ;;
        
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "🧪 SSL Testing Checklist:"
echo "□ HTTPS access works"
echo "□ SSL certificate is valid"
echo "□ HTTP redirects to HTTPS"
echo "□ OAuth callbacks work with HTTPS"
echo "□ File uploads work over HTTPS"
echo "□ WebSocket connections (if any)"
echo "□ Mixed content warnings resolved"