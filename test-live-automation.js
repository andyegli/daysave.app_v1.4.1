/**
 * Test Live Automation - Add URL to trigger automation pipeline
 * 
 * This script adds a multimedia URL to the live app to test
 * the enhanced automation logging we just implemented.
 */

const axios = require('axios');

async function testLiveAutomation() {
    console.log('🧪 Testing Live Automation Pipeline');
    console.log('═══════════════════════════════════════════════');
    
    try {
        // Test URLs that should trigger multimedia analysis
        const testUrls = [
            'https://www.youtube.com/watch?v=dQw4w9WgXcQ',  // YouTube video
            'https://soundcloud.com/artist/test-track',      // SoundCloud audio
            'https://example.com/sample-video.mp4'           // Direct video file
        ];
        
        console.log(`🌐 Testing against: http://localhost:3000`);
        console.log(`📝 Adding ${testUrls.length} multimedia URLs to trigger automation...\n`);
        
        for (let i = 0; i < testUrls.length; i++) {
            const url = testUrls[i];
            console.log(`${i + 1}. 🔗 Adding URL: ${url}`);
            
            try {
                // Make a POST request to add content
                const response = await axios.post('http://localhost:3000/content', {
                    url: url,
                    user_comments: `Test automation URL ${i + 1} - ${new Date().toISOString()}`,
                    user_tags: ['test', 'automation', 'live-test']
                }, {
                    timeout: 5000,
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'DaySave-Automation-Test'
                    }
                });
                
                if (response.status === 200 && response.data.success) {
                    console.log(`   ✅ Content created successfully`);
                    console.log(`   📄 Content ID: ${response.data.content.id}`);
                    
                    if (response.data.multimedia_analysis) {
                        console.log(`   🎬 Multimedia analysis: ${response.data.multimedia_analysis.status}`);
                        console.log(`   💡 ${response.data.multimedia_analysis.message}`);
                    } else {
                        console.log(`   ℹ️  No multimedia analysis triggered (might not be multimedia URL)`);
                    }
                } else {
                    console.log(`   ❌ Failed to create content: ${response.status}`);
                }
                
            } catch (error) {
                if (error.response) {
                    console.log(`   ❌ HTTP Error: ${error.response.status} - ${error.response.data?.error || error.message}`);
                } else if (error.code === 'ECONNREFUSED') {
                    console.log(`   ❌ Connection refused - is the app running on http://localhost:3000?`);
                    break;
                } else {
                    console.log(`   ❌ Error: ${error.message}`);
                }
            }
            
            // Wait between requests
            if (i < testUrls.length - 1) {
                console.log(`   ⏳ Waiting 2 seconds before next URL...\n`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        console.log('\n🎯 Live Automation Test Complete!');
        console.log('═══════════════════════════════════════════════');
        console.log('📋 Check the app console logs to see the enhanced automation logging in action.');
        console.log('🔍 Look for messages like:');
        console.log('   • 🎬 Starting orchestrated multimedia analysis...');
        console.log('   • 🚀 [JOB-xxxxx] Started processing pipeline...');
        console.log('   • 📊 Progress updates with percentages');
        console.log('   • ✅ Completion messages with results');
        
    } catch (error) {
        console.error('💥 Test failed:', error.message);
    }
}

// Run the test
if (require.main === module) {
    testLiveAutomation()
        .then(() => {
            console.log('\n✅ Test script completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('Test script error:', error);
            process.exit(1);
        });
}

module.exports = { testLiveAutomation }; 