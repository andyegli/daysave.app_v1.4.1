#!/usr/bin/env node

/**
 * Security Headers Test Script
 * 
 * PURPOSE:
 * Tests HTTP response headers to ensure no duplicates or conflicts
 * and verifies proper security header configuration.
 * 
 * USAGE:
 * node scripts/test-security-headers.js [url]
 * 
 * EXAMPLE:
 * node scripts/test-security-headers.js http://localhost:3000
 * node scripts/test-security-headers.js https://localhost:443
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// Test configuration
const testUrls = [
  'http://localhost:3000',
  'http://localhost:3000/dashboard',
  'http://localhost:3000/js/form-handlers.js',
  'http://localhost:3000/api/places/autocomplete'
];

// Security headers to check
const securityHeaders = [
  'x-frame-options',
  'x-content-type-options', 
  'x-xss-protection',
  'referrer-policy',
  'content-security-policy',
  'strict-transport-security'
];

// Function to make HTTP/HTTPS request
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'DaySave-SecurityHeaderTest/1.0'
      },
      // For HTTPS, disable certificate validation for localhost testing
      rejectUnauthorized: false
    };

    const req = client.request(options, (res) => {
      resolve({
        url,
        statusCode: res.statusCode,
        headers: res.headers
      });
    });

    req.on('error', (err) => {
      reject({ url, error: err.message });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject({ url, error: 'Request timeout' });
    });

    req.end();
  });
}

// Function to check for header duplicates
function checkDuplicates(headers) {
  const duplicates = [];
  const processed = new Set();
  
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    
    if (processed.has(lowerKey)) {
      duplicates.push({
        header: lowerKey,
        values: Array.isArray(value) ? value : [value]
      });
    } else if (Array.isArray(value) && value.length > 1) {
      duplicates.push({
        header: lowerKey,
        values: value
      });
    }
    
    processed.add(lowerKey);
  }
  
  return duplicates;
}

// Function to check header conflicts
function checkConflicts(headers) {
  const conflicts = [];
  
  // Check for conflicting referrer-policy values
  const referrerPolicy = headers['referrer-policy'];
  if (referrerPolicy && Array.isArray(referrerPolicy)) {
    const unique = [...new Set(referrerPolicy)];
    if (unique.length > 1) {
      conflicts.push({
        header: 'referrer-policy',
        issue: 'conflicting values',
        values: unique
      });
    }
  }
  
  // Check for conflicting x-xss-protection values
  const xssProtection = headers['x-xss-protection'];
  if (xssProtection && Array.isArray(xssProtection)) {
    const unique = [...new Set(xssProtection)];
    if (unique.length > 1) {
      conflicts.push({
        header: 'x-xss-protection',
        issue: 'conflicting values',
        values: unique
      });
    }
  }
  
  return conflicts;
}

// Function to generate security report
function generateSecurityReport(response) {
  const { url, statusCode, headers } = response;
  const duplicates = checkDuplicates(headers);
  const conflicts = checkConflicts(headers);
  
  const report = {
    url,
    statusCode,
    timestamp: new Date().toISOString(),
    issues: {
      duplicates: duplicates.length > 0,
      conflicts: conflicts.length > 0
    },
    duplicateHeaders: duplicates,
    conflictingHeaders: conflicts,
    securityHeaders: {}
  };
  
  // Check presence of security headers
  securityHeaders.forEach(header => {
    const value = headers[header];
    report.securityHeaders[header] = {
      present: !!value,
      value: value || null,
      multiple: Array.isArray(value) && value.length > 1
    };
  });
  
  return report;
}

// Main test function
async function testSecurityHeaders(urls = testUrls) {
  console.log('🔒 DaySave Security Headers Test');
  console.log('================================');
  console.log(`Testing ${urls.length} URL(s)...\n`);
  
  const results = [];
  
  for (const url of urls) {
    try {
      console.log(`Testing: ${url}`);
      const response = await makeRequest(url);
      const report = generateSecurityReport(response);
      results.push(report);
      
      // Print immediate results
      console.log(`  Status: ${response.statusCode}`);
      console.log(`  Duplicates: ${report.issues.duplicates ? '❌ Found' : '✅ None'}`);
      console.log(`  Conflicts: ${report.issues.conflicts ? '❌ Found' : '✅ None'}`);
      
      if (report.duplicateHeaders.length > 0) {
        console.log('  📋 Duplicate Headers:');
        report.duplicateHeaders.forEach(dup => {
          console.log(`    - ${dup.header}: ${dup.values.join(', ')}`);
        });
      }
      
      if (report.conflictingHeaders.length > 0) {
        console.log('  ⚠️  Conflicting Headers:');
        report.conflictingHeaders.forEach(conflict => {
          console.log(`    - ${conflict.header}: ${conflict.values.join(' vs ')}`);
        });
      }
      
      console.log('');
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.error}`);
      console.log('');
      results.push({
        url: error.url,
        error: error.error,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  // Summary
  console.log('📊 Test Summary');
  console.log('===============');
  
  const successfulTests = results.filter(r => !r.error);
  const failedTests = results.filter(r => r.error);
  const testsWithIssues = successfulTests.filter(r => r.issues?.duplicates || r.issues?.conflicts);
  
  console.log(`Total URLs tested: ${urls.length}`);
  console.log(`Successful: ${successfulTests.length}`);
  console.log(`Failed: ${failedTests.length}`);
  console.log(`With header issues: ${testsWithIssues.length}`);
  
  if (testsWithIssues.length === 0 && failedTests.length === 0) {
    console.log('✅ All tests passed! No duplicate or conflicting headers detected.');
  } else {
    console.log('❌ Issues detected. Review the results above.');
  }
  
  // Generate detailed report if requested
  if (process.argv.includes('--detailed')) {
    const reportFile = `test-results/security-headers-${Date.now()}.json`;
    require('fs').writeFileSync(reportFile, JSON.stringify(results, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportFile}`);
  }
  
  return results;
}

// CLI usage
if (require.main === module) {
  const customUrl = process.argv[2];
  const urls = customUrl ? [customUrl] : testUrls;
  
  testSecurityHeaders(urls).catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
  });
}

module.exports = { testSecurityHeaders, generateSecurityReport };
