/**
 * Debug Content Creation - Check automation trigger
 */

const { Content, User } = require('./models');
const { AutomationOrchestrator } = require('./services/multimedia');

async function debugContentCreation() {
    console.log('🔍 Debugging Content Creation & Automation');
    console.log('═══════════════════════════════════════════════');
    
    try {
        // 1. Check recent content
        console.log('📄 Checking recently added content...');
        const recentContent = await Content.findAll({
            limit: 5,
            order: [['createdAt', 'DESC']],
            include: [{
                model: User,
                attributes: ['id', 'username', 'email']
            }]
        });
        
        if (recentContent.length === 0) {
            console.log('   ❌ No content found in database');
            return;
        }
        
        console.log(`   ✅ Found ${recentContent.length} recent content items:`);
        recentContent.forEach((content, index) => {
            console.log(`   ${index + 1}. ID: ${content.id}`);
            console.log(`      URL: ${content.url || 'No URL'}`);
            console.log(`      Comments: ${content.user_comments || 'No comments'}`);
            console.log(`      User: ${content.User?.email || 'Unknown'}`);
            console.log(`      Created: ${content.createdAt}`);
            console.log('');
        });
        
        // 2. Test URL detection function
        console.log('🔍 Testing URL detection...');
        const fs = require('fs');
        const contentRouteContent = fs.readFileSync('./routes/content.js', 'utf8');
        
        // Extract the isMultimediaURL function
        const functionMatch = contentRouteContent.match(/function isMultimediaURL\(url\)[\s\S]*?\n}/);
        if (!functionMatch) {
            console.log('   ❌ Could not find isMultimediaURL function');
            return;
        }
        
        const funcCode = functionMatch[0];
        const isMultimediaURL = eval(`(${funcCode})`);
        
        // Test each recent URL
        recentContent.forEach((content, index) => {
            if (content.url) {
                const isMultimedia = isMultimediaURL(content.url);
                console.log(`   ${index + 1}. ${content.url}`);
                console.log(`      ${isMultimedia ? '✅ MULTIMEDIA' : '❌ NOT MULTIMEDIA'}`);
            }
        });
        
        // 3. Test orchestrator
        console.log('\n🤖 Testing AutomationOrchestrator...');
        const orchestrator = AutomationOrchestrator.getInstance();
        console.log('   ✅ Orchestrator instance obtained');
        
        try {
            await orchestrator.initialize();
            console.log('   ✅ Orchestrator initialized successfully');
        } catch (error) {
            console.log(`   ❌ Orchestrator initialization failed: ${error.message}`);
            return;
        }
        
        // 4. Test multimedia analysis function
        console.log('\n🎬 Testing multimedia analysis trigger...');
        
        // Find a multimedia URL from recent content
        const multimediaContent = recentContent.find(content => {
            return content.url && isMultimediaURL(content.url);
        });
        
        if (multimediaContent) {
            console.log(`   🎯 Found multimedia content: ${multimediaContent.id}`);
            console.log(`   🔗 URL: ${multimediaContent.url}`);
            
            // Try to manually trigger the analysis
            try {
                console.log('   🚀 Manually triggering multimedia analysis...');
                
                // Import the trigger function (this might not work due to scope)
                // We'll simulate what the trigger should do
                
                if (multimediaContent.url && isMultimediaURL(multimediaContent.url)) {
                    console.log('   ✅ URL passes multimedia detection');
                    console.log('   🎬 Should trigger: triggerMultimediaAnalysis()');
                    console.log('   📋 Expected logs: "Starting orchestrated multimedia analysis..."');
                } else {
                    console.log('   ❌ URL failed multimedia detection');
                }
                
            } catch (error) {
                console.log(`   ❌ Manual trigger failed: ${error.message}`);
            }
        } else {
            console.log('   ℹ️  No multimedia URLs found in recent content');
            console.log('   💡 Try adding a YouTube, Facebook, or SoundCloud URL');
        }
        
        // 5. Check logs for errors
        console.log('\n📋 Checking for recent errors...');
        try {
            const { execSync } = require('child_process');
            const recentErrors = execSync('tail -n 100 logs/app.log | grep -i error || echo "No recent errors"', { encoding: 'utf8' });
            console.log('   Recent errors:');
            console.log(recentErrors);
        } catch (error) {
            console.log('   ⚠️  Could not check error logs');
        }
        
    } catch (error) {
        console.error('💥 Debug failed:', error);
    }
}

// Run the debug
if (require.main === module) {
    debugContentCreation()
        .then(() => {
            console.log('\n✅ Debug complete');
            process.exit(0);
        })
        .catch(error => {
            console.error('Debug error:', error);
            process.exit(1);
        });
}

module.exports = { debugContentCreation }; 