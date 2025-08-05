#!/bin/bash

# DaySave Remote Proxy Testing Script
# This script helps you test the app through remote proxies like ngrok

set -e

echo "🌐 DaySave Remote Proxy Testing Setup"
echo "======================================"

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok is not installed. Please install it first:"
    echo "   macOS: brew install ngrok"
    echo "   Linux: snap install ngrok"
    echo "   Or download from: https://ngrok.com/download"
    exit 1
fi

echo "✅ ngrok found"

# Function to test with different proxy services
test_proxy_service() {
    local service=$1
    local port=$2
    
    echo ""
    echo "🚀 Testing with $service on port $port"
    echo "----------------------------------------"
    
    case $service in
        "ngrok")
            echo "Starting ngrok tunnel..."
            echo "Command: ngrok http $port"
            echo ""
            echo "📋 Instructions:"
            echo "1. Run: ngrok http $port"
            echo "2. Copy the https URL (e.g., https://abc123.ngrok.io)"
            echo "3. Test OAuth callbacks by updating your OAuth app settings"
            echo "4. Test file uploads and multimedia processing"
            echo ""
            echo "🔧 OAuth Configuration:"
            echo "   - Google OAuth: Add ngrok URL to authorized origins"
            echo "   - Microsoft OAuth: Update redirect URIs"
            echo "   - Update BASE_URL in .env to ngrok URL"
            ;;
        "cloudflare")
            echo "Using Cloudflare Tunnel (cloudflared)..."
            echo "Command: cloudflared tunnel --url http://localhost:$port"
            echo ""
            echo "📋 Instructions:"
            echo "1. Install: brew install cloudflared"
            echo "2. Run: cloudflared tunnel --url http://localhost:$port"
            echo "3. Copy the provided URL"
            ;;
    esac
}

# Check what's running on different ports
echo ""
echo "🔍 Checking running services..."
echo "Port 3000 (Direct app):"
lsof -i :3000 | head -2 || echo "  No service running"

echo "Port 8080 (Nginx proxy):"
lsof -i :8080 | head -2 || echo "  No service running"

echo ""
echo "📋 Available testing options:"
echo "1. Direct app access (port 3000)"
echo "2. Through nginx proxy (port 8080)"
echo ""

# Get user choice
read -p "Which port do you want to expose? (3000/8080): " port

case $port in
    3000)
        echo "🎯 You chose direct app access (port 3000)"
        echo "Make sure the app is running with: docker-compose up app"
        ;;
    8080)
        echo "🎯 You chose nginx proxy (port 8080)"
        echo "Make sure nginx is running with: docker-compose up nginx"
        ;;
    *)
        echo "❌ Invalid choice. Using port 3000 as default."
        port=3000
        ;;
esac

echo ""
read -p "Which proxy service? (ngrok/cloudflare): " proxy_service

test_proxy_service "$proxy_service" "$port"

echo ""
echo "🧪 Testing Checklist:"
echo "□ OAuth login (Google, Microsoft)"
echo "□ File upload (PDF, images, videos)"
echo "□ URL processing (YouTube, Facebook, etc.)"
echo "□ Admin panel access"
echo "□ API endpoints"
echo "□ WebSocket connections (if any)"
echo ""
echo "⚠️  Remember to:"
echo "- Update OAuth redirect URIs in your apps"
echo "- Set BASE_URL in .env to your ngrok/cloudflare URL"
echo "- Test HTTPS-specific features"
echo "- Check CORS headers"