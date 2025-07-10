#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🌍 Google Maps API Setup for DaySave.app');
console.log('==========================================\n');

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupGoogleMaps() {
  console.log('This script will help you configure Google Maps API for address autocomplete.\n');
  
  // Check if .env file exists
  const envPath = path.join(process.cwd(), '.env');
  const envExists = fs.existsSync(envPath);
  
  if (!envExists) {
    console.log('❌ No .env file found. Creating one...');
    fs.writeFileSync(envPath, '# DaySave.app Environment Variables\n\n');
  }
  
  // Read current .env content
  let envContent = envExists ? fs.readFileSync(envPath, 'utf8') : '# DaySave.app Environment Variables\n\n';
  
  // Check if GOOGLE_MAPS_KEY already exists
  if (envContent.includes('GOOGLE_MAPS_KEY=')) {
    const currentKey = envContent.match(/GOOGLE_MAPS_KEY=(.+)/)?.[1];
    if (currentKey && currentKey !== 'YOUR_GOOGLE_MAPS_API_KEY') {
      console.log('✅ Google Maps API key already configured');
      const update = await question('Do you want to update it? (y/N): ');
      if (update.toLowerCase() !== 'y') {
        console.log('Setup cancelled.');
        rl.close();
        return;
      }
      // Remove existing key
      envContent = envContent.replace(/GOOGLE_MAPS_KEY=.+\n?/g, '');
    }
  }
  
  console.log('\n📋 To get a Google Maps API key:');
  console.log('1. Go to https://console.cloud.google.com/');
  console.log('2. Create a new project or select existing one');
  console.log('3. Enable these APIs:');
  console.log('   - Maps JavaScript API');
  console.log('   - Places API');
  console.log('4. Create credentials (API Key)');
  console.log('5. Copy the API key\n');
  
  const apiKey = await question('Enter your Google Maps API key: ');
  
  if (!apiKey || apiKey.trim() === '') {
    console.log('❌ No API key provided. Setup cancelled.');
    rl.close();
    return;
  }
  
  // Add the API key to .env
  if (!envContent.endsWith('\n')) {
    envContent += '\n';
  }
  envContent += `GOOGLE_MAPS_KEY=${apiKey.trim()}\n`;
  
  // Write back to .env
  fs.writeFileSync(envPath, envContent);
  
  console.log('\n✅ Google Maps API key configured successfully!');
  console.log('\n📝 Next steps:');
  console.log('1. Restart your application to load the new environment variable');
  console.log(`2. Visit http://localhost:${process.env.APP_PORT || process.env.PORT || 3000}/contacts/test-maps to test the setup`);
  console.log('3. Try adding a contact with an address to see autocomplete in action');
  
  console.log('\n🔒 Security reminder:');
  console.log('- Restrict your API key to your domain in Google Cloud Console');
  console.log('- Set up billing alerts to avoid unexpected charges');
  console.log('- The free tier includes $200 monthly credit');
  
  rl.close();
}

setupGoogleMaps().catch(console.error); 