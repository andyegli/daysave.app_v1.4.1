#!/bin/bash

# DaySave ngrok Configuration Setup Script
# This script helps configure your DaySave app for external testing via ngrok

echo "🌐 DaySave ngrok Configuration Setup"
echo "======================================"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Please copy env.example to .env first:"
    echo "   cp env.example .env"
    exit 1
fi

echo ""
echo "📋 Current Configuration Check:"
echo "------------------------------"

# Check current BASE_URL
current_base_url=$(grep "^BASE_URL=" .env | cut -d'=' -f2)
echo "Current BASE_URL: $current_base_url"

# Check current ALLOWED_ORIGINS
current_origins=$(grep "^ALLOWED_ORIGINS=" .env | cut -d'=' -f2)
echo "Current ALLOWED_ORIGINS: $current_origins"

echo ""
echo "🔧 To configure for ngrok:"
echo "1. Start your app: npm start"
echo "2. In another terminal, run: ngrok http 3000"
echo "3. Copy the ngrok HTTPS URL (e.g., https://abc123.ngrok.io)"
echo "4. Run this script again with the ngrok URL"
echo ""

# Ask for ngrok URL
read -p "Enter your ngrok HTTPS URL (or press Enter to skip): " ngrok_url

if [ ! -z "$ngrok_url" ]; then
    echo ""
    echo "🔄 Updating configuration for ngrok..."
    
    # Backup current .env
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ Backed up current .env file"
    
    # Update BASE_URL
    sed -i.tmp "s|^BASE_URL=.*|BASE_URL=$ngrok_url|" .env
    echo "✅ Updated BASE_URL to: $ngrok_url"
    
    # Update ALLOWED_ORIGINS to include ngrok URL
    new_origins="http://localhost:3000,https://localhost:3000,$ngrok_url"
    sed -i.tmp "s|^ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=$new_origins|" .env
    echo "✅ Updated ALLOWED_ORIGINS to include ngrok URL"
    
    # Clean up temp files
    rm .env.tmp
    
    echo ""
    echo "🎉 Configuration updated successfully!"
    echo ""
    echo "📝 Next Steps:"
    echo "1. Restart your DaySave app: npm start"
    echo "2. Share the ngrok URL with testers: $ngrok_url"
    echo "3. Monitor requests at: http://localhost:4040"
    echo ""
    echo "⚠️  Security Notes:"
    echo "- Only share the URL with trusted testers"
    echo "- The tunnel will close when you stop ngrok"
    echo "- Consider using ngrok auth for additional security"
    echo ""
    echo "🔄 To revert changes, restore from backup:"
    echo "   cp .env.backup.* .env"
    
else
    echo ""
    echo "📖 Manual Configuration Steps:"
    echo "1. Update BASE_URL in .env to your ngrok URL"
    echo "2. Add ngrok URL to ALLOWED_ORIGINS in .env"
    echo "3. Restart your app"
fi

echo ""
echo "🔍 For OAuth testing, you'll also need to:"
echo "- Update Google OAuth redirect URLs"
echo "- Update Microsoft OAuth redirect URLs"
echo "- Update Apple OAuth redirect URLs"
echo ""
echo "See the full guide for OAuth configuration details."
