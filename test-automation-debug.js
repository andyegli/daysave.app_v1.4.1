/**
 * Debug script to test and diagnose automation pipeline issues
 * 
 * This script helps identify why automation might not be triggering
 * when URLs are added to the system.
 */

const { Content, User } = require('./models');
const { AutomationOrchestrator } = require('./services/multimedia');

// Test URL that should trigger multimedia analysis
const TEST_URLS = [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.facebook.com/watch/?v=123456789',
    'https://soundcloud.com/artist/track-name',
    'https://example.com/video.mp4'
];

/**
 * Test the multimedia URL detection function
 */
function testUrlDetection() {
    console.log('🔍 Testing URL Detection Function');
    console.log('═══════════════════════════════════════════════');
    
    // Import the isMultimediaURL function from content routes
    const fs = require('fs');
    const contentRouteContent = fs.readFileSync('./routes/content.js', 'utf8');
    
    // Extract the isMultimediaURL function from the file
    const functionMatch = contentRouteContent.match(/function isMultimediaURL\(url\)[\s\S]*?\n}/);
    if (!functionMatch) {
        console.log('❌ Could not find isMultimediaURL function');
        return false;
    }
    
    // Create a temporary function to test
    const funcCode = functionMatch[0];
    const isMultimediaURL = eval(`(${funcCode})`);
    
    TEST_URLS.forEach(url => {
        const result = isMultimediaURL(url);
        console.log(`   ${result ? '✅' : '❌'} ${url} -> ${result ? 'MULTIMEDIA' : 'NOT MULTIMEDIA'}`);
    });
    
    return true;
}

/**
 * Test AutomationOrchestrator singleton
 */
async function testOrchestrator() {
    console.log('\n🤖 Testing AutomationOrchestrator Singleton');
    console.log('═══════════════════════════════════════════════');
    
    try {
        const orchestrator1 = AutomationOrchestrator.getInstance();
        const orchestrator2 = AutomationOrchestrator.getInstance();
        
        console.log(`   ✅ Singleton test: ${orchestrator1 === orchestrator2 ? 'PASSED' : 'FAILED'}`);
        
        // Test initialization
        await orchestrator1.initialize();
        console.log('   ✅ Orchestrator initialization: COMPLETED');
        
        return orchestrator1;
    } catch (error) {
        console.log(`   ❌ Orchestrator error: ${error.message}`);
        return null;
    }
}

/**
 * Test processing pipeline with a small buffer
 */
async function testProcessingPipeline(orchestrator) {
    console.log('\n⚙️  Testing Processing Pipeline');
    console.log('═══════════════════════════════════════════════');
    
    try {
        // Create a small test buffer (simulating a tiny image file)
        const testBuffer = Buffer.from('test-data-for-analysis');
        const metadata = {
            filename: 'test.jpg',
            mimeType: 'image/jpeg',
            source: 'test',
            userId: 'test-user-123',
            contentId: 'test-content-456'
        };
        
        console.log('   🚀 Starting test processing...');
        
        // This should trigger the enhanced logging we added
        const result = await orchestrator.processContent(testBuffer, metadata);
        
        console.log('   ✅ Processing completed successfully');
        console.log(`   📊 Result: ${JSON.stringify(result, null, 2)}`);
        
        return true;
    } catch (error) {
        console.log(`   ❌ Processing failed: ${error.message}`);
        console.log(`   📋 Stack: ${error.stack}`);
        return false;
    }
}

/**
 * Test database content creation and automation trigger
 */
async function testContentCreation() {
    console.log('\n📝 Testing Content Creation & Automation Trigger');
    console.log('═══════════════════════════════════════════════');
    
    try {
        // Find a test user
        const user = await User.findOne();
        if (!user) {
            console.log('   ❌ No users found in database for testing');
            return false;
        }
        
        console.log(`   👤 Using test user: ${user.username || user.email}`);
        
        // Create test content
        const testUrl = TEST_URLS[0];
        console.log(`   🔗 Creating content with URL: ${testUrl}`);
        
        const content = await Content.create({
            user_id: user.id,
            url: testUrl,
            user_comments: 'Test content for automation debugging',
            user_tags: ['test', 'automation', 'debug']
        });
        
        console.log(`   ✅ Content created with ID: ${content.id}`);
        
        // Test the trigger function directly
        const { triggerMultimediaAnalysis } = require('./routes/content');
        
        if (typeof triggerMultimediaAnalysis === 'function') {
            console.log('   🚀 Triggering multimedia analysis directly...');
            await triggerMultimediaAnalysis(content, user);
            console.log('   ✅ Analysis triggered successfully');
        } else {
            console.log('   ⚠️  Could not access triggerMultimediaAnalysis function');
        }
        
        return content;
    } catch (error) {
        console.log(`   ❌ Content creation failed: ${error.message}`);
        return false;
    }
}

/**
 * Main debug function
 */
async function runDebugTests() {
    console.log('🧪 DaySave Automation Pipeline Debug Tests');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`🕐 Started at: ${new Date().toISOString()}`);
    console.log();
    
    try {
        // Test 1: URL Detection
        const urlDetectionWorking = testUrlDetection();
        
        // Test 2: Orchestrator Singleton
        const orchestrator = await testOrchestrator();
        
        // Test 3: Processing Pipeline (if orchestrator works)
        let processingWorking = false;
        if (orchestrator) {
            processingWorking = await testProcessingPipeline(orchestrator);
        }
        
        // Test 4: Content Creation & Automation Trigger
        const contentResult = await testContentCreation();
        
        // Summary
        console.log('\n📊 Debug Test Summary');
        console.log('═══════════════════════════════════════════════');
        console.log(`   URL Detection: ${urlDetectionWorking ? '✅ WORKING' : '❌ FAILED'}`);
        console.log(`   Orchestrator: ${orchestrator ? '✅ WORKING' : '❌ FAILED'}`);
        console.log(`   Processing: ${processingWorking ? '✅ WORKING' : '❌ FAILED'}`);
        console.log(`   Content Creation: ${contentResult ? '✅ WORKING' : '❌ FAILED'}`);
        
        if (urlDetectionWorking && orchestrator && processingWorking && contentResult) {
            console.log('\n🎉 All tests passed! Automation should be working correctly.');
            console.log('   If you\'re still not seeing automation, check the app logs for errors.');
        } else {
            console.log('\n⚠️  Some tests failed. Check the errors above to diagnose the issue.');
        }
        
    } catch (error) {
        console.error('\n💥 Debug test failed:', error);
    }
    
    console.log(`\n🕐 Completed at: ${new Date().toISOString()}`);
    console.log('═══════════════════════════════════════════════════════════════');
}

// Run the debug tests
if (require.main === module) {
    runDebugTests()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('Debug script error:', error);
            process.exit(1);
        });
}

module.exports = { runDebugTests, testUrlDetection, testOrchestrator, testProcessingPipeline }; 