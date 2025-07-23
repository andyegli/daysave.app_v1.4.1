#!/usr/bin/env node

// Non-interactive version of live pipeline test - Browser Login
const { exec } = require('child_process');
const fetch = require('node-fetch');

class BrowserLoginTest {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.testUrls = [
      { url: 'https://www.youtube.com/watch?v=9bZkp7q19f0', platform: 'YouTube', type: 'video' },
      { url: 'https://www.instagram.com/reel/C5dPZWVI_r9/', platform: 'Instagram', type: 'video' },
      { url: 'https://vimeo.com/169599296', platform: 'Vimeo', type: 'video' },
      { url: 'https://soundcloud.com/marshmellomusic/alone', platform: 'SoundCloud', type: 'audio' }
    ];
  }

  async run() {
    console.log('🚀 Live Pipeline Test - Browser Login Mode\n');
    
    // Check server status
    await this.checkServer();
    
    // Open browser for login
    await this.openBrowserForLogin();
    
    // Wait for user confirmation
    console.log('\n⏳ Waiting for you to complete login...');
    console.log('🔄 Please:');
    console.log('   1. Login to DaySave in the browser window');
    console.log('   2. Once logged in, press Ctrl+C here to continue');
    console.log('   3. Then run: node tests/live-pipeline-test.js and choose option 2');
    console.log('\nOR');
    console.log('✅ Just test a single URL manually in the DaySave interface to verify everything works!');
    
    // Keep process alive for user
    console.log('\n🎯 Test URLs to try in DaySave:');
    this.testUrls.forEach((testUrl, index) => {
      console.log(`   ${index + 1}. ${testUrl.platform}: ${testUrl.url}`);
    });
    
    console.log('\nPress Ctrl+C when done...');
    
    // Keep alive until user stops
    setInterval(() => {
      // Just keep alive
    }, 10000);
  }

  async checkServer() {
    try {
      console.log('🔍 Checking DaySave server status...');
      const response = await fetch(`${this.baseUrl}/health`);
      if (response.ok) {
        console.log('✅ DaySave server is running');
      } else {
        throw new Error('Server not responding properly');
      }
    } catch (error) {
      console.error('❌ DaySave server is not running. Please start it first:');
      console.error('   npm run dev\n');
      process.exit(1);
    }
  }

  async openBrowserForLogin() {
    const loginUrl = `${this.baseUrl}/auth/login`;
    
    console.log('🌐 Opening DaySave login page in your browser...');
    console.log(`📱 URL: ${loginUrl}`);
    
    try {
      // Try to open browser (works on macOS, Linux, Windows)
      const openCommand = process.platform === 'win32' ? 'start' : 
                         process.platform === 'darwin' ? 'open' : 'xdg-open';
      
      exec(`${openCommand} "${loginUrl}"`, (error) => {
        if (error) {
          console.log(`⚠️  Could not auto-open browser. Please manually open: ${loginUrl}`);
        } else {
          console.log('✅ Browser opened successfully');
        }
      });
    } catch (error) {
      console.log(`⚠️  Please manually open: ${loginUrl}`);
    }
  }
}

// Run the test
const test = new BrowserLoginTest();
test.run().catch(error => {
  console.error('💥 Test failed:', error.message);
  process.exit(1);
}); 