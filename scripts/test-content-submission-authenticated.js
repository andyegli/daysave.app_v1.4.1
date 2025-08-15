#!/usr/bin/env node

/**
 * Test content submission with proper authentication
 * Uses the test user credentials from .env
 */

require('dotenv').config();
const fetch = require('node-fetch');
const { Content, User } = require('../models');

const TEST_USER = process.env.TEST_USER || 'dstestuser';
const TEST_SECRET = process.env.TEST_SECRET;

async function authenticateAndTestContent() {
  try {
    console.log('🔐 Testing Content Submission with Authentication');
    console.log('=' .repeat(50));
    
    // Get test user from database
    const testUser = await User.findOne({
      where: { username: TEST_USER }
    });
    
    if (!testUser) {
      console.error(`❌ Test user '${TEST_USER}' not found in database`);
      return;
    }
    
    console.log(`✅ Found test user: ${testUser.username} (${testUser.email})`);
    
    // Step 1: Login to get session cookie
    console.log('\n🚪 Step 1: Logging in...');
    const loginResponse = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `username=${TEST_USER}&password=${TEST_SECRET}`,
      redirect: 'manual' // Don't follow redirects
    });
    
    console.log(`Login response status: ${loginResponse.status}`);
    
    // Extract session cookie
    const setCookieHeader = loginResponse.headers.get('set-cookie');
    if (!setCookieHeader) {
      console.error('❌ No session cookie received from login');
      return;
    }
    
    const sessionCookie = setCookieHeader.split(';')[0]; // Get just the session part
    console.log(`✅ Session cookie obtained: ${sessionCookie.substring(0, 30)}...`);
    
    // Step 2: Test content submission
    console.log('\n📝 Step 2: Testing content submission...');
    const testUrl = 'https://youtu.be/8pRc_s2VQIo?si=Qc9SPrqHKJig1KWk';
    
    const contentResponse = await fetch('http://localhost:3000/content', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        url: testUrl,
        user_comments: 'Test submission with authentication',
        user_tags: ['test', 'authentication', 'youtube']
      })
    });
    
    console.log(`Content submission status: ${contentResponse.status}`);
    
    if (contentResponse.ok) {
      const result = await contentResponse.json();
      console.log('✅ Content submission successful!');
      console.log('Response:', result);
      
      // Check if content was created in database
      if (result.content && result.content.id) {
        const dbContent = await Content.findByPk(result.content.id);
        if (dbContent) {
          console.log('✅ Content verified in database');
          console.log(`   - ID: ${dbContent.id}`);
          console.log(`   - URL: ${dbContent.url}`);
          console.log(`   - User ID: ${dbContent.user_id}`);
          console.log(`   - Created: ${dbContent.created_at}`);
        }
      }
    } else {
      const errorText = await contentResponse.text();
      console.log('❌ Content submission failed');
      console.log('Error response:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
authenticateAndTestContent()
  .then(() => {
    console.log('\n🏁 Test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Test crashed:', error);
    process.exit(1);
  });
