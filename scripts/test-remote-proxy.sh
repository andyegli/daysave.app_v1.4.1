#!/bin/bash

# DaySave Remote Proxy Testing Script
# This script helps you test the app through remote proxies like ngrok

set -e

echo "🌐 DaySave Remote Proxy Testing Setup"
echo "======================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check prerequisites
check_prerequisites() {
    echo "🔍 Checking prerequisites..."
    
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
    
    # Check if containers are running
    if ! docker-compose ps | grep -q "Up"; then
        print_warning "No containers appear to be running"
        echo "Run 'docker-compose up -d' first"
    else
        print_status "Docker containers are running"
    fi
}

# Check and install proxy tools
check_proxy_tools() {
    echo ""
    echo "🛠️ Checking proxy tools..."
    
    # Check ngrok
    if ! command -v ngrok &> /dev/null; then
        print_warning "ngrok is not installed"
        echo "Install with: brew install ngrok (macOS) or download from https://ngrok.com/download"
        echo "After installation, run: ngrok config add-authtoken YOUR_TOKEN"
    else
        print_status "ngrok found"
        # Check if ngrok is configured
        if ngrok config check &> /dev/null; then
            print_status "ngrok is configured"
        else
            print_warning "ngrok needs authentication token"
            echo "Run: ngrok config add-authtoken YOUR_TOKEN"
        fi
    fi
    
    # Check cloudflared
    if ! command -v cloudflared &> /dev/null; then
        print_warning "cloudflared is not installed"
        echo "Install with: brew install cloudflared (macOS)"
    else
        print_status "cloudflared found"
    fi
}

# Function to test local services
test_local_services() {
    echo ""
    echo "🔍 Testing local services..."
    
    # Test port 3000 (direct app)
    if curl -s -f http://localhost:3000/health > /dev/null 2>&1; then
        print_status "Port 3000 (direct app): Available"
    else
        print_error "Port 3000 (direct app): Not responding"
    fi
    
    # Test port 8080 (nginx proxy)
    if curl -s -f http://localhost:8080/health > /dev/null 2>&1; then
        print_status "Port 8080 (nginx proxy): Available"
    else
        print_error "Port 8080 (nginx proxy): Not responding"
    fi
    
    # Test database
    if docker-compose exec -T db mysqladmin ping -h localhost > /dev/null 2>&1; then
        print_status "Database: Connected"
    else
        print_error "Database: Connection failed"
    fi
}

# Function to start ngrok tunnel
start_ngrok() {
    local port=$1
    
    echo ""
    echo "🚀 Starting ngrok tunnel on port $port..."
    echo "Press Ctrl+C to stop the tunnel"
    echo ""
    
    # Create backup of .env
    cp .env .env.backup
    print_info "Created backup: .env.backup"
    
    # Start ngrok in background
    ngrok http $port > /tmp/ngrok.log 2>&1 &
    NGROK_PID=$!
    
    # Wait for ngrok to start
    sleep 3
    
    # Get ngrok URL
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data['tunnels']:
        print(data['tunnels'][0]['public_url'])
    else:
        print('No tunnels found')
except:
    print('Error parsing ngrok data')
" 2>/dev/null)
    
    if [[ "$NGROK_URL" == *"https://"* ]]; then
        print_status "ngrok tunnel started: $NGROK_URL"
        
        # Update .env with ngrok URL
        sed -i.bak "s|BASE_URL=.*|BASE_URL=$NGROK_URL|" .env
        print_info "Updated BASE_URL in .env to: $NGROK_URL"
        
        # Restart app to use new BASE_URL
        print_info "Restarting app with new BASE_URL..."
        docker-compose restart app
        
        # Wait for app to restart
        sleep 5
        
        # Test the ngrok URL
        echo ""
        echo "🧪 Testing ngrok tunnel..."
        if curl -s -f "$NGROK_URL/health" > /dev/null; then
            print_status "ngrok tunnel is working!"
            echo ""
            echo "🌐 Your app is now accessible at: $NGROK_URL"
            echo "🔧 OAuth Configuration needed:"
            echo "   Google: Add $NGROK_URL to authorized origins"
            echo "   Microsoft: Add $NGROK_URL/auth/microsoft/callback to redirect URIs"
            echo ""
            echo "📋 Test these URLs:"
            echo "   Health: $NGROK_URL/health"
            echo "   Login: $NGROK_URL/auth/login"
            echo "   Dashboard: $NGROK_URL/dashboard"
            
            # Cleanup function
            cleanup() {
                echo ""
                print_info "Cleaning up..."
                kill $NGROK_PID 2>/dev/null || true
                mv .env.backup .env
                print_info "Restored original .env"
                docker-compose restart app
                print_info "Restarted app with original config"
                exit 0
            }
            
            trap cleanup SIGINT SIGTERM
            
            echo ""
            echo "Press Ctrl+C to stop the tunnel and restore original configuration..."
            wait $NGROK_PID
        else
            print_error "ngrok tunnel is not responding"
            kill $NGROK_PID 2>/dev/null || true
            mv .env.backup .env
        fi
    else
        print_error "Failed to start ngrok tunnel"
        kill $NGROK_PID 2>/dev/null || true
    fi
}

# Function to start cloudflare tunnel
start_cloudflare() {
    local port=$1
    
    echo ""
    echo "🚀 Starting Cloudflare tunnel on port $port..."
    echo "This will provide a temporary URL for testing"
    echo "Press Ctrl+C to stop the tunnel"
    echo ""
    
    cloudflared tunnel --url http://localhost:$port
}

# Main menu
show_menu() {
    echo ""
    echo "📋 Select testing method:"
    echo "1. ngrok tunnel (requires account)"
    echo "2. Cloudflare tunnel (no account needed)"
    echo "3. Show current status only"
    echo "4. Exit"
    echo ""
    read -p "Enter your choice (1-4): " choice
    
    case $choice in
        1)
            echo ""
            echo "📋 Select port to expose:"
            echo "1. Port 3000 (direct app)"
            echo "2. Port 8080 (nginx proxy)"
            read -p "Enter your choice (1-2): " port_choice
            
            case $port_choice in
                1) start_ngrok 3000 ;;
                2) start_ngrok 8080 ;;
                *) print_error "Invalid choice" ;;
            esac
            ;;
        2)
            echo ""
            echo "📋 Select port to expose:"
            echo "1. Port 3000 (direct app)"
            echo "2. Port 8080 (nginx proxy)"
            read -p "Enter your choice (1-2): " port_choice
            
            case $port_choice in
                1) start_cloudflare 3000 ;;
                2) start_cloudflare 8080 ;;
                *) print_error "Invalid choice" ;;
            esac
            ;;
        3)
            echo "Current status displayed above"
            ;;
        4)
            echo "Goodbye!"
            exit 0
            ;;
        *)
            print_error "Invalid choice"
            show_menu
            ;;
    esac
}

# Run checks
check_prerequisites
check_proxy_tools
test_local_services

# Show menu
show_menu