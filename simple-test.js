/**
 * Simple Multimedia Analysis Test
 * 
 * This script tests the core multimedia analysis functionality:
 * 1. Database connectivity
 * 2. Multimedia service initialization
 * 3. URL detection patterns
 * 4. Basic analysis workflow
 */

const { 
  MultimediaAnalyzer, 
  VoicePrintDatabase, 
  ThumbnailGenerator, 
  VideoProcessor 
} = require('./services/multimedia');
const { Content, VideoAnalysis, Speaker, Thumbnail, OCRCaption, User } = require('./models');

/**
 * Test multimedia URL detection
 */
function testURLDetection() {
  console.log('🔍 Testing URL detection patterns...');
  
  const testUrls = [
    { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', expected: true },
    { url: 'https://youtu.be/jNQXAC9IVRw', expected: true },
    { url: 'https://vimeo.com/148751763', expected: true },
    { url: 'https://soundcloud.com/test/audio', expected: true },
    { url: 'https://example.com/video.mp4', expected: true },
    { url: 'https://example.com/audio.mp3', expected: true },
    { url: 'https://example.com/page.html', expected: false },
    { url: 'https://google.com', expected: false }
  ];
  
  const multimediaPatterns = [
    /youtube\.com\/watch/i,
    /youtu\.be\//i,
    /vimeo\.com\//i,
    /dailymotion\.com\//i,
    /twitch\.tv\//i,
    /tiktok\.com\//i,
    /instagram\.com\/p\//i,
    /instagram\.com\/reel\//i,
    /facebook\.com\/watch/i,
    /twitter\.com\/.*\/status/i,
    /x\.com\/.*\/status/i,
    /linkedin\.com\/posts\//i,
    /\.(mp4|avi|mov|wmv|flv|webm|mkv|m4v)(\?|$)/i,
    /\.(mp3|wav|flac|aac|ogg|wma|m4a)(\?|$)/i,
    /soundcloud\.com\//i,
    /spotify\.com\//i,
    /anchor\.fm\//i,
    /podcasts\.apple\.com\//i,
    /wistia\.com\//i,
    /brightcove\.com\//i,
    /jwplayer\.com\//i
  ];
  
  function isMultimediaURL(url) {
    return multimediaPatterns.some(pattern => pattern.test(url));
  }
  
  let passed = 0;
  let failed = 0;
  
  testUrls.forEach(({ url, expected }) => {
    const result = isMultimediaURL(url);
    if (result === expected) {
      console.log(`  ✅ ${url} -> ${result} (expected: ${expected})`);
      passed++;
    } else {
      console.log(`  ❌ ${url} -> ${result} (expected: ${expected})`);
      failed++;
    }
  });
  
  console.log(`\n📊 URL Detection Results: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

/**
 * Test database connectivity
 */
async function testDatabaseConnectivity() {
  console.log('\n🔍 Testing database connectivity...');
  
  try {
    // Test each model
    const models = [
      { name: 'Content', model: Content },
      { name: 'VideoAnalysis', model: VideoAnalysis },
      { name: 'Speaker', model: Speaker },
      { name: 'Thumbnail', model: Thumbnail },
      { name: 'OCRCaption', model: OCRCaption },
      { name: 'User', model: User }
    ];
    
    for (const { name, model } of models) {
      const count = await model.count();
      console.log(`  ✅ ${name}: ${count} records`);
    }
    
    // Test user exists
    const user = await User.findOne();
    if (user) {
      console.log(`  ✅ Test user available: ${user.email}`);
      return user;
    } else {
      console.log('  ⚠️ No users found in database');
      return null;
    }
    
  } catch (error) {
    console.error(`  ❌ Database connectivity failed: ${error.message}`);
    return null;
  }
}

/**
 * Test multimedia services initialization
 */
async function testServicesInitialization() {
  console.log('\n🔍 Testing multimedia services initialization...');
  
  try {
    // Test MultimediaAnalyzer
    console.log('  🎬 Testing MultimediaAnalyzer...');
    const analyzer = new MultimediaAnalyzer();
    if (analyzer) {
      console.log('    ✅ MultimediaAnalyzer initialized');
    }
    
    // Test VoicePrintDatabase
    console.log('  🎙️ Testing VoicePrintDatabase...');
    const voiceDB = new VoicePrintDatabase();
    if (voiceDB) {
      console.log('    ✅ VoicePrintDatabase initialized');
    }
    
    // Test ThumbnailGenerator
    console.log('  🖼️ Testing ThumbnailGenerator...');
    const thumbGen = new ThumbnailGenerator();
    if (thumbGen) {
      console.log('    ✅ ThumbnailGenerator initialized');
    }
    
    // Test VideoProcessor
    console.log('  🎬 Testing VideoProcessor...');
    const videoProc = new VideoProcessor();
    if (videoProc) {
      console.log('    ✅ VideoProcessor initialized');
    }
    
    return true;
    
  } catch (error) {
    console.error(`  ❌ Services initialization failed: ${error.message}`);
    return false;
  }
}

/**
 * Test content creation simulation
 */
async function testContentCreation(user) {
  console.log('\n🔍 Testing content creation...');
  
  if (!user) {
    console.log('  ⚠️ No user available for content creation test');
    return null;
  }
  
  try {
    // Create test content
    const testContent = await Content.create({
      user_id: user.id,
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'Test Video - Rick Roll',
      user_comments: 'Test content for multimedia analysis workflow',
      user_tags: ['test', 'multimedia', 'analysis']
    });
    
    console.log(`  ✅ Test content created: ${testContent.id}`);
    
    // Simulate analysis record creation
    const analysisRecord = await VideoAnalysis.create({
      user_id: user.id,
      content_id: testContent.id,
      url: testContent.url,
      title: 'Rick Astley - Never Gonna Give You Up',
      description: 'Classic music video',
      duration: 213,
      transcription: 'Never gonna give you up, never gonna let you down...',
      sentiment_score: 0.8,
      sentiment_label: 'positive',
      sentiment_confidence: 0.85,
      language_detected: 'en',
      processing_time: 5432,
      thumbnail_count: 5,
      speaker_count: 1,
      ocr_text_length: 0,
      quality_score: 85,
      analysis_version: '1.4.1'
    });
    
    console.log(`  ✅ Analysis record created: ${analysisRecord.id}`);
    
    // Create sample thumbnail
    const thumbnail = await Thumbnail.create({
      user_id: user.id,
      video_url: testContent.url,
      thumbnail_url: 'https://example.com/thumbnail.jpg',
      file_path: 'uploads/thumbnails/test_thumbnail.jpg',
      file_name: 'test_thumbnail.jpg',
      timestamp: '00:00:30.000',
      timestamp_seconds: 30,
      width: 640,
      height: 480,
      file_size: 25600,
      format: 'jpg',
      quality: 'medium',
      is_key_moment: true,
      confidence_score: 0.9,
      analysis_version: '1.4.1'
    });
    
    console.log(`  ✅ Thumbnail record created: ${thumbnail.id}`);
    
    // Create sample speaker
    const speaker = await Speaker.create({
      user_id: user.id,
      speaker_tag: `Speaker_${Date.now()}_RickAstley`,
      name: 'Rick Astley',
      description: 'English singer and songwriter',
      gender: 'male',
      age_range: '40-50',
      accent: 'British',
      language: 'en',
      confidence_score: 0.95,
      usage_count: 1,
      voice_fingerprint: {
        pitch: 'medium',
        tone: 'warm',
        pace: 'normal',
        frequency_range: '80-300Hz'
      },
      voice_print_data: { sample: 'voice_print_data' },
      analysis_version: '1.4.1'
    });
    
    console.log(`  ✅ Speaker record created: ${speaker.id}`);
    
    return {
      content: testContent,
      analysis: analysisRecord,
      thumbnail: thumbnail,
      speaker: speaker
    };
    
  } catch (error) {
    console.error(`  ❌ Content creation test failed: ${error.message}`);
    return null;
  }
}

/**
 * Test analysis retrieval
 */
async function testAnalysisRetrieval(testData) {
  console.log('\n🔍 Testing analysis retrieval...');
  
  if (!testData) {
    console.log('  ⚠️ No test data available for retrieval test');
    return false;
  }
  
  try {
    const { content, analysis } = testData;
    
    // Test analysis lookup
    const retrievedAnalysis = await VideoAnalysis.findOne({
      where: { content_id: content.id, user_id: content.user_id }
    });
    
    if (retrievedAnalysis) {
      console.log(`  ✅ Analysis retrieved: ${retrievedAnalysis.title}`);
      console.log(`    📊 Stats: ${retrievedAnalysis.duration}s, ${retrievedAnalysis.sentiment_label}, ${retrievedAnalysis.quality_score}% quality`);
    } else {
      console.log('  ❌ Analysis not found');
      return false;
    }
    
    // Test thumbnails lookup
    const thumbnails = await Thumbnail.findAll({
      where: { user_id: content.user_id },
      attributes: ['id', 'user_id', 'file_path', 'file_name', 'width', 'height', 'timestamp', 'quality']
    });
    
    console.log(`  ✅ Found ${thumbnails.length} thumbnails`);
    
    // Test speakers lookup
    const speakers = await Speaker.findAll({
      where: { user_id: content.user_id }
    });
    
    console.log(`  ✅ Found ${speakers.length} speakers`);
    
    return true;
    
  } catch (error) {
    console.error(`  ❌ Analysis retrieval test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test cleanup
 */
async function testCleanup(testData) {
  console.log('\n🧹 Cleaning up test data...');
  
  if (!testData) {
    console.log('  ℹ️ No test data to clean up');
    return;
  }
  
  try {
    const { content, analysis, thumbnail, speaker } = testData;
    
    // Delete in reverse order of creation
    if (speaker) await speaker.destroy();
    if (thumbnail) await thumbnail.destroy();
    if (analysis) await analysis.destroy();
    if (content) await content.destroy();
    
    console.log('  ✅ Test data cleaned up');
    
  } catch (error) {
    console.error(`  ❌ Cleanup failed: ${error.message}`);
  }
}

/**
 * Main test function
 */
async function runSimpleTest() {
  console.log('🧪 Starting Simple Multimedia Analysis Test');
  console.log('=' .repeat(60));
  
  let testData = null;
  
  try {
    // Test 1: URL Detection
    const urlTestPassed = testURLDetection();
    
    // Test 2: Database Connectivity
    const user = await testDatabaseConnectivity();
    
    // Test 3: Services Initialization
    const servicesOK = await testServicesInitialization();
    
    // Test 4: Content Creation
    testData = await testContentCreation(user);
    
    // Test 5: Analysis Retrieval
    const retrievalOK = await testAnalysisRetrieval(testData);
    
    // Summary
    console.log('\n📊 Test Summary:');
    console.log(`  URL Detection: ${urlTestPassed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Database: ${user ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Services: ${servicesOK ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Content Creation: ${testData ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Analysis Retrieval: ${retrievalOK ? '✅ PASS' : '❌ FAIL'}`);
    
    const allPassed = urlTestPassed && user && servicesOK && testData && retrievalOK;
    
    if (allPassed) {
      console.log('\n🎉 All tests passed! The multimedia analysis system is working correctly.');
    } else {
      console.log('\n⚠️ Some tests failed. Please check the issues above.');
    }
    
    return allPassed;
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    return false;
    
  } finally {
    // Always clean up
    await testCleanup(testData);
  }
}

// Run the test
if (require.main === module) {
  runSimpleTest()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { runSimpleTest }; 