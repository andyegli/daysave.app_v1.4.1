#!/usr/bin/env node

/**
 * Create an optimized 2FA logo for authenticator apps
 * This creates a simple, small logo that meets authenticator app requirements
 */

const fs = require('fs');
const path = require('path');

function createOptimizedLogo() {
  console.log('🎨 Creating Optimized 2FA Logo');
  console.log('===============================');
  
  const originalPath = path.join(__dirname, '../public/images/daysave-logo.png');
  const optimizedPath = path.join(__dirname, '../public/images/daysave-2fa-optimized.png');
  
  // Check original file
  if (fs.existsSync(originalPath)) {
    const stats = fs.statSync(originalPath);
    console.log(`📁 Original logo: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
  }
  
  // For now, create a simple SVG-based logo that's much smaller
  // In production, you'd use an image processing library like Sharp
  const svgLogo = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <!-- Background circle -->
  <circle cx="64" cy="64" r="60" fill="#667eea" stroke="#764ba2" stroke-width="4"/>
  
  <!-- DaySave text -->
  <text x="64" y="45" font-family="Arial, sans-serif" font-size="16" font-weight="bold" 
        text-anchor="middle" fill="white">DaySave</text>
  
  <!-- Simple icon representation -->
  <rect x="44" y="55" width="40" height="30" rx="4" fill="white" opacity="0.9"/>
  <rect x="48" y="59" width="32" height="2" fill="#667eea"/>
  <rect x="48" y="63" width="24" height="2" fill="#667eea"/>
  <rect x="48" y="67" width="28" height="2" fill="#667eea"/>
  <rect x="48" y="71" width="20" height="2" fill="#667eea"/>
  
  <!-- Security shield -->
  <path d="M64 90 L58 85 L58 78 L64 75 L70 78 L70 85 Z" fill="white" opacity="0.9"/>
  <circle cx="64" cy="81" r="2" fill="#667eea"/>
</svg>`;
  
  // Save as SVG (much smaller)
  const svgPath = path.join(__dirname, '../public/images/daysave-2fa-logo.svg');
  fs.writeFileSync(svgPath, svgLogo);
  
  console.log(`✅ Created optimized SVG logo: ${svgPath}`);
  console.log(`📏 Size: ${(svgLogo.length / 1024).toFixed(2)}KB`);
  
  // Also create a simple PNG fallback using a basic approach
  // Copy the original but we'll recommend using the SVG
  if (fs.existsSync(originalPath)) {
    fs.copyFileSync(originalPath, optimizedPath);
    console.log(`📋 Created PNG fallback: ${optimizedPath}`);
  }
  
  console.log('');
  console.log('📋 Recommendations:');
  console.log('   1. Use SVG version for smallest size and best quality');
  console.log('   2. For PNG, resize to 128x128 or 256x256 pixels');
  console.log('   3. Compress PNG to <64KB using tools like TinyPNG');
  console.log('   4. Test with public HTTPS URL, not localhost');
  console.log('');
  console.log('🔗 Logo URLs:');
  console.log(`   SVG: \${BASE_URL}/images/daysave-2fa-logo.svg`);
  console.log(`   PNG: \${BASE_URL}/images/daysave-2fa-optimized.png`);
  console.log('');
  console.log('⚠️  Note: Localhost URLs won\'t work with external authenticator apps');
  console.log('   Consider using a public domain or removing logo for development');
}

if (require.main === module) {
  createOptimizedLogo();
}

module.exports = { createOptimizedLogo };
