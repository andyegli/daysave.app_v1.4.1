#!/usr/bin/env node

/**
 * Test authentication status and session handling
 */

const fetch = require('node-fetch');

async function testAuthStatus() {
  console.log('🔍 Testing Authentication Status...\n');
  
  try {
    // Test 1: Check if we can access protected content without auth
    console.log('1️⃣ Testing unauthenticated access to /content...');
    const response1 = await fetch('http://localhost:3000/content', {
      method: 'GET',
      redirect: 'manual'
    });
    
    console.log(`   Status: ${response1.status}`);
    console.log(`   Redirect: ${response1.headers.get('location') || 'none'}`);
    
    // Test 2: Check login page access
    console.log('\n2️⃣ Testing login page access...');
    const response2 = await fetch('http://localhost:3000/auth/login', {
      method: 'GET'
    });
    
    console.log(`   Status: ${response2.status}`);
    console.log(`   Content-Type: ${response2.headers.get('content-type')}`);
    
    // Test 3: Try to login and get session cookie
    console.log('\n3️⃣ Testing login with credentials...');
    const loginResponse = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'username=dstestuser&password=5Z0SU/S89aIaYNWLpcUUAJp',
      redirect: 'manual'
    });
    
    console.log(`   Login Status: ${loginResponse.status}`);
    console.log(`   Redirect: ${loginResponse.headers.get('location') || 'none'}`);
    
    const setCookie = loginResponse.headers.get('set-cookie');
    if (setCookie) {
      console.log(`   ✅ Session cookie received: ${setCookie.substring(0, 50)}...`);
      
      // Test 4: Use session cookie to access protected content
      console.log('\n4️⃣ Testing authenticated access with session cookie...');
      const sessionCookie = setCookie.split(';')[0];
      
      const response4 = await fetch('http://localhost:3000/content', {
        method: 'GET',
        headers: {
          'Cookie': sessionCookie
        }
      });
      
      console.log(`   Authenticated Status: ${response4.status}`);
      if (response4.status === 200) {
        console.log('   ✅ Authentication working correctly!');
      } else {
        console.log('   ❌ Authentication failed even with session cookie');
      }
      
    } else {
      console.log('   ❌ No session cookie received from login');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAuthStatus();
