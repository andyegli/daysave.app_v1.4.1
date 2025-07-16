const axios = require('axios');

async function testContentCreation() {
    try {
        console.log('🧪 Testing Content Creation and Automation Trigger');
        console.log('═══════════════════════════════════════════════════');
        
        const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
        
        console.log(`🔗 Testing URL: ${testUrl}`);
        console.log('📡 Making POST request to create content...\n');
        
        const response = await axios.post('http://localhost:3000/content', {
            url: testUrl
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Cookie': 'connect.sid=your-session-cookie-here' // You'll need to get this from browser
            },
            timeout: 30000
        });
        
        console.log('✅ Content creation response:', {
            status: response.status,
            success: response.data.success,
            contentId: response.data.content?.id,
            multimediaAnalysis: response.data.multimedia_analysis
        });
        
        if (response.data.multimedia_analysis) {
            console.log(`🎬 Automation Status: ${response.data.multimedia_analysis.status}`);
            console.log(`💬 Message: ${response.data.multimedia_analysis.message}`);
            
            if (response.data.multimedia_analysis.status === 'started') {
                console.log('\n⏳ Automation was triggered successfully!');
                console.log('📋 Check the server console for automation progress...');
                console.log('🔍 Look for messages like:');
                console.log('   • 🚀 AUTOMATION TRIGGER: Starting multimedia analysis...');
                console.log('   • 🎬 TRIGGER: Starting multimedia analysis for content...');
                console.log('   • ✅ AUTOMATION TRIGGER: Analysis started successfully...');
            }
        } else {
            console.log('❌ No multimedia analysis info in response');
        }
        
    } catch (error) {
        if (error.response) {
            console.error(`❌ HTTP Error: ${error.response.status}`);
            console.error(`📝 Response: ${JSON.stringify(error.response.data, null, 2)}`);
        } else if (error.code === 'ECONNREFUSED') {
            console.error('❌ Connection refused - is the app running on http://localhost:3000?');
        } else {
            console.error(`❌ Error: ${error.message}`);
        }
    }
}

// Alternative version that doesn't require authentication
async function testWithoutAuth() {
    console.log('\n🔄 Testing without authentication (will likely fail but shows server logs)...');
    
    try {
        const response = await axios.post('http://localhost:3000/content', {
            url: 'https://www.youtube.com/watch?v=test-' + Date.now()
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 5000
        });
        
        console.log('Unexpected success:', response.data);
    } catch (error) {
        if (error.response && error.response.status === 302) {
            console.log('✅ Expected redirect to login (means server is working)');
        } else if (error.response && error.response.status === 401) {
            console.log('✅ Expected authentication error (means server is working)');
        } else {
            console.error('❌ Unexpected error:', error.message);
        }
    }
}

async function runTest() {
    console.log('📊 Content Creation & Automation Test');
    console.log('════════════════════════════════════════');
    console.log('🔍 This test will help diagnose why automation is inconsistent\n');
    
    await testWithoutAuth();
    
    console.log('\n📋 Instructions for full test:');
    console.log('1. Open browser and login to http://localhost:3000');
    console.log('2. Go to developer tools > Application > Cookies');
    console.log('3. Copy the "connect.sid" cookie value');
    console.log('4. Replace "your-session-cookie-here" in this script');
    console.log('5. Run this script again to test authenticated content creation');
    console.log('\n⚠️  High memory/CPU usage (99%/100%) may be causing automation failures!');
    console.log('💡 Consider restarting the server to free up resources.');
}

runTest().catch(console.error); 