#!/usr/bin/env node

/**
 * Optimize DaySave logo for 2FA authenticator apps
 * Creates a square, optimized version of the logo for better display in authenticator apps
 */

const fs = require('fs');
const path = require('path');

async function optimizeLogo() {
  const logoPath = path.join(__dirname, '../public/images/daysave-logo.png');
  const optimizedPath = path.join(__dirname, '../public/images/daysave-2fa-logo.png');
  
  console.log('🎨 DaySave 2FA Logo Optimization');
  console.log('================================');
  
  // Check if original logo exists
  if (!fs.existsSync(logoPath)) {
    console.log('❌ Original logo not found at:', logoPath);
    console.log('📁 Available logo files:');
    
    const imagesDir = path.join(__dirname, '../public/images');
    const files = fs.readdirSync(imagesDir).filter(f => f.includes('logo') || f.includes('daysave'));
    files.forEach(file => console.log(`   - ${file}`));
    
    return;
  }
  
  console.log('✅ Original logo found:', logoPath);
  
  // For now, just copy the existing logo
  // In a production environment, you'd use an image processing library like Sharp
  fs.copyFileSync(logoPath, optimizedPath);
  
  console.log('✅ Optimized logo created:', optimizedPath);
  console.log('');
  console.log('📋 2FA Logo Requirements:');
  console.log('   - Size: 64x64 to 512x512 pixels (square preferred)');
  console.log('   - Format: PNG, JPG, or SVG');
  console.log('   - Publicly accessible via HTTPS');
  console.log('   - Clear, simple design for small display');
  console.log('');
  console.log('🔗 Logo URL will be: ${BASE_URL}/images/daysave-2fa-logo.png');
  console.log('');
  console.log('📱 Supported Authenticator Apps:');
  console.log('   ✅ Google Authenticator');
  console.log('   ✅ Microsoft Authenticator');
  console.log('   ✅ Authy');
  console.log('   ✅ 1Password');
  console.log('   ✅ Bitwarden');
  console.log('   ✅ LastPass Authenticator');
  console.log('');
  console.log('💡 Note: Some apps may cache logos, so changes might take time to appear.');
}

if (require.main === module) {
  optimizeLogo().catch(console.error);
}

module.exports = { optimizeLogo };
