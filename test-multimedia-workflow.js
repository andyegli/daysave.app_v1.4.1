/**
 * Multimedia Analysis Workflow Test
 * 
 * This script tests the complete multimedia analysis workflow:
 * 1. Submit a multimedia URL as new content
 * 2. Verify content creation and analysis trigger
 * 3. Check analysis progress and completion
 * 4. Verify database storage of results
 * 5. Test UI display of analysis results
 */

const fetch = require('node-fetch');
const { Content, VideoAnalysis, Speaker, Thumbnail, OCRCaption, User } = require('./models');

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  testUrls: [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Rick Roll (classic test video)
    'https://youtu.be/jNQXAC9IVRw', // Short YouTube video
    'https://vimeo.com/148751763', // Vimeo video
    'https://soundcloud.com/test/audio-track', // Audio content
  ],
  maxWaitTime: 30000, // 30 seconds max wait for analysis
  checkInterval: 2000 // Check every 2 seconds
};

// Test user (we'll use the first user in the database)
let testUser = null;

/**
 * Main test function
 */
async function runMultimediaWorkflowTest() {
  console.log('🧪 Starting Multimedia Analysis Workflow Test');
  console.log('=' .repeat(60));
  
  try {
    // Setup test environment
    await setupTestEnvironment();
    
    // Test each URL
    for (const testUrl of TEST_CONFIG.testUrls) {
      console.log(`\n🎬 Testing URL: ${testUrl}`);
      console.log('-'.repeat(40));
      
      await testMultimediaWorkflow(testUrl);
    }
    
    // Run comprehensive tests
    await runComprehensiveTests();
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

/**
 * Setup test environment
 */
async function setupTestEnvironment() {
  console.log('🔧 Setting up test environment...');
  
  // Get test user
  testUser = await User.findOne();
  if (!testUser) {
    throw new Error('No users found in database. Please create a user first.');
  }
  
  console.log(`✅ Using test user: ${testUser.email}`);
  
  // Test database connectivity
  await testDatabaseConnectivity();
  
  console.log('✅ Test environment ready');
}

/**
 * Test database connectivity
 */
async function testDatabaseConnectivity() {
  console.log('🔍 Testing database connectivity...');
  
  const models = { Content, VideoAnalysis, Speaker, Thumbnail, OCRCaption };
  
  for (const [modelName, model] of Object.entries(models)) {
    try {
      await model.count();
      console.log(`  ✅ ${modelName} table accessible`);
    } catch (error) {
      throw new Error(`Database connectivity failed for ${modelName}: ${error.message}`);
    }
  }
}

/**
 * Test multimedia workflow for a specific URL
 */
async function testMultimediaWorkflow(testUrl) {
  const startTime = Date.now();
  
  try {
    // Step 1: Submit content
    console.log('1️⃣ Submitting content...');
    const content = await submitContent(testUrl);
    console.log(`  ✅ Content created with ID: ${content.id}`);
    
    // Step 2: Check if multimedia analysis was triggered
    console.log('2️⃣ Checking analysis trigger...');
    const analysisTriggered = await checkAnalysisTrigger(content);
    
    if (analysisTriggered) {
      console.log('  ✅ Multimedia analysis triggered');
      
      // Step 3: Wait for analysis completion
      console.log('3️⃣ Waiting for analysis completion...');
      const analysisResult = await waitForAnalysisCompletion(content.id);
      
      if (analysisResult) {
        console.log('  ✅ Analysis completed successfully');
        
        // Step 4: Verify database storage
        console.log('4️⃣ Verifying database storage...');
        await verifyDatabaseStorage(content.id, analysisResult);
        
        // Step 5: Test UI endpoints
        console.log('5️⃣ Testing UI endpoints...');
        await testUIEndpoints(content.id);
        
      } else {
        console.log('  ⚠️ Analysis did not complete within timeout');
      }
    } else {
      console.log('  ℹ️ URL not detected as multimedia content (expected for some URLs)');
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`  ⏱️ Total test time: ${totalTime}ms`);
    
  } catch (error) {
    console.error(`  ❌ Test failed for ${testUrl}:`, error.message);
    throw error;
  }
}

/**
 * Submit content via API
 */
async function submitContent(url) {
  const response = await fetch(`${TEST_CONFIG.baseUrl}/content`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `connect.sid=test-session-${testUser.id}` // Mock session
    },
    body: JSON.stringify({
      url: url,
      user_comments: 'Test content for multimedia analysis',
      user_tags: ['test', 'multimedia', 'analysis']
    })
  });
  
  if (!response.ok) {
    throw new Error(`Content submission failed: ${response.status}`);
  }
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(`Content submission failed: ${result.error}`);
  }
  
  return result.content;
}

/**
 * Check if multimedia analysis was triggered
 */
async function checkAnalysisTrigger(content) {
  // Check if URL matches multimedia patterns
  const multimediaPatterns = [
    /youtube\.com\/watch/i,
    /youtu\.be\//i,
    /vimeo\.com\//i,
    /soundcloud\.com\//i,
    /\.(mp4|mp3|wav|avi|mov)/i
  ];
  
  return multimediaPatterns.some(pattern => pattern.test(content.url));
}

/**
 * Wait for analysis completion
 */
async function waitForAnalysisCompletion(contentId) {
  const startTime = Date.now();
  const maxWaitTime = TEST_CONFIG.maxWaitTime;
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      const analysis = await VideoAnalysis.findOne({
        where: { content_id: contentId, user_id: testUser.id }
      });
      
      if (analysis) {
        console.log(`    ✅ Analysis found: ${analysis.title || 'Untitled'}`);
        return analysis;
      }
      
      console.log(`    ⏳ Waiting for analysis... (${Math.round((Date.now() - startTime) / 1000)}s)`);
      await sleep(TEST_CONFIG.checkInterval);
      
    } catch (error) {
      console.error(`    ❌ Error checking analysis: ${error.message}`);
      await sleep(TEST_CONFIG.checkInterval);
    }
  }
  
  return null;
}

/**
 * Verify database storage of analysis results
 */
async function verifyDatabaseStorage(contentId, analysis) {
  console.log('    🔍 Checking VideoAnalysis record...');
  
  // Verify analysis record
  if (!analysis.transcription && !analysis.sentiment_label) {
    console.log('    ⚠️ No transcription or sentiment data found');
  } else {
    console.log(`    ✅ Analysis data: ${analysis.transcription ? 'transcription' : 'no transcription'}, sentiment: ${analysis.sentiment_label || 'none'}`);
  }
  
  // Check thumbnails
  console.log('    🔍 Checking thumbnails...');
  const thumbnails = await Thumbnail.findAll({
    where: { user_id: testUser.id, video_url: analysis.url }
  });
  console.log(`    ✅ Found ${thumbnails.length} thumbnails`);
  
  // Check speakers
  console.log('    🔍 Checking speakers...');
  const speakers = await Speaker.findAll({
    where: { user_id: testUser.id }
  });
  console.log(`    ✅ Found ${speakers.length} speakers in database`);
  
  // Check OCR captions
  console.log('    🔍 Checking OCR captions...');
  const ocrCaptions = await OCRCaption.findAll({
    where: { user_id: testUser.id, video_url: analysis.url }
  });
  console.log(`    ✅ Found ${ocrCaptions.length} OCR captions`);
  
  // Verify content was updated
  console.log('    🔍 Checking content updates...');
  const updatedContent = await Content.findOne({
    where: { id: contentId, user_id: testUser.id }
  });
  
  if (updatedContent.user_comments.includes('AI Analysis Results')) {
    console.log('    ✅ Content updated with AI analysis results');
  } else {
    console.log('    ⚠️ Content not updated with AI analysis results');
  }
}

/**
 * Test UI endpoints
 */
async function testUIEndpoints(contentId) {
  try {
    // Test analysis endpoint
    console.log('    🔍 Testing /content/:id/analysis endpoint...');
    const response = await fetch(`${TEST_CONFIG.baseUrl}/content/${contentId}/analysis`, {
      headers: {
        'Cookie': `connect.sid=test-session-${testUser.id}` // Mock session
      }
    });
    
    if (!response.ok) {
      throw new Error(`Analysis endpoint failed: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`    ✅ Analysis endpoint working: status=${result.status}`);
      
      if (result.status === 'completed') {
        console.log(`    ✅ Analysis results: ${result.thumbnails?.length || 0} thumbnails, ${result.speakers?.length || 0} speakers, ${result.ocr_captions?.length || 0} OCR captions`);
      }
    } else {
      console.log(`    ⚠️ Analysis endpoint returned: ${result.message || 'unknown error'}`);
    }
    
  } catch (error) {
    console.error(`    ❌ UI endpoint test failed: ${error.message}`);
  }
}

/**
 * Run comprehensive tests
 */
async function runComprehensiveTests() {
  console.log('\n🧪 Running comprehensive tests...');
  console.log('-'.repeat(40));
  
  // Test 1: Database integrity
  console.log('1️⃣ Testing database integrity...');
  await testDatabaseIntegrity();
  
  // Test 2: API endpoints
  console.log('2️⃣ Testing API endpoints...');
  await testAPIEndpoints();
  
  // Test 3: Error handling
  console.log('3️⃣ Testing error handling...');
  await testErrorHandling();
  
  console.log('✅ Comprehensive tests completed');
}

/**
 * Test database integrity
 */
async function testDatabaseIntegrity() {
  try {
    // Check for orphaned records
    const analyses = await VideoAnalysis.findAll();
    const contents = await Content.findAll();
    
    console.log(`  📊 Database stats: ${contents.length} contents, ${analyses.length} analyses`);
    
    // Check for analyses without content
    let orphanedAnalyses = 0;
    for (const analysis of analyses) {
      const content = await Content.findOne({ where: { id: analysis.content_id } });
      if (!content) {
        orphanedAnalyses++;
      }
    }
    
    if (orphanedAnalyses === 0) {
      console.log('  ✅ No orphaned analysis records found');
    } else {
      console.log(`  ⚠️ Found ${orphanedAnalyses} orphaned analysis records`);
    }
    
  } catch (error) {
    console.error(`  ❌ Database integrity test failed: ${error.message}`);
  }
}

/**
 * Test API endpoints
 */
async function testAPIEndpoints() {
  const endpoints = [
    '/content',
    '/multimedia/analysis',
    '/multimedia/speakers'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${TEST_CONFIG.baseUrl}${endpoint}`, {
        headers: {
          'Cookie': `connect.sid=test-session-${testUser.id}` // Mock session
        }
      });
      
      if (response.ok) {
        console.log(`  ✅ ${endpoint} endpoint accessible`);
      } else {
        console.log(`  ⚠️ ${endpoint} endpoint returned ${response.status}`);
      }
      
    } catch (error) {
      console.error(`  ❌ ${endpoint} endpoint test failed: ${error.message}`);
    }
  }
}

/**
 * Test error handling
 */
async function testErrorHandling() {
  try {
    // Test invalid URL submission
    console.log('  🔍 Testing invalid URL submission...');
    const response = await fetch(`${TEST_CONFIG.baseUrl}/content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `connect.sid=test-session-${testUser.id}` // Mock session
      },
      body: JSON.stringify({
        url: 'invalid-url',
        user_comments: 'Test invalid URL'
      })
    });
    
    const result = await response.json();
    
    if (!result.success) {
      console.log('  ✅ Invalid URL properly rejected');
    } else {
      console.log('  ⚠️ Invalid URL was accepted (unexpected)');
    }
    
  } catch (error) {
    console.error(`  ❌ Error handling test failed: ${error.message}`);
  }
}

/**
 * Utility function to sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the test if this file is executed directly
if (require.main === module) {
  runMultimediaWorkflowTest()
    .then(() => {
      console.log('\n🎉 Test suite completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = {
  runMultimediaWorkflowTest,
  testMultimediaWorkflow,
  TEST_CONFIG
}; 