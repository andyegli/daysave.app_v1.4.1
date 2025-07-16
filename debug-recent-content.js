const { Content, VideoAnalysis, AudioAnalysis, ImageAnalysis } = require('./models');
const { MultimediaAnalyzer } = require('./services/multimedia');

async function checkRecentContent() {
    try {
        console.log('🔍 Checking recent content entries...\n');
        
        // Get the 5 most recent content entries
        const recentContent = await Content.findAll({
            order: [['createdAt', 'DESC']],
            limit: 5,
            include: [
                { model: VideoAnalysis, as: 'videoAnalysis', required: false },
                { model: AudioAnalysis, as: 'audioAnalysis', required: false },
                { model: ImageAnalysis, as: 'imageAnalysis', required: false }
            ]
        });
        
        console.log(`📄 Found ${recentContent.length} recent content entries:\n`);
        
        for (let i = 0; i < recentContent.length; i++) {
            const content = recentContent[i];
            console.log(`${i + 1}. Content ID: ${content.id}`);
            console.log(`   📅 Created: ${content.createdAt}`);
            console.log(`   🔗 URL: ${content.url || 'N/A'}`);
            console.log(`   📝 Transcription: ${content.transcription ? `${content.transcription.length} chars` : 'None'}`);
            console.log(`   📋 Summary: ${content.summary ? `${content.summary.length} chars` : 'None'}`);
            console.log(`   🎭 Sentiment: ${content.sentiment || 'None'}`);
            console.log(`   🏷️  Auto Tags: ${content.auto_tags || 'None'}`);
            console.log(`   📊 Metadata: ${content.metadata ? JSON.stringify(content.metadata).substring(0, 100) + '...' : 'None'}`);
            
            // Check analysis tables
            const hasVideoAnalysis = content.videoAnalysis;
            const hasAudioAnalysis = content.audioAnalysis;
            const hasImageAnalysis = content.imageAnalysis;
            
            console.log(`   🎬 Video Analysis: ${hasVideoAnalysis ? '✅ Present' : '❌ None'}`);
            console.log(`   🎵 Audio Analysis: ${hasAudioAnalysis ? '✅ Present' : '❌ None'}`);
            console.log(`   🖼️  Image Analysis: ${hasImageAnalysis ? '✅ Present' : '❌ None'}`);
            
            if (hasVideoAnalysis) {
                console.log(`      - Status: ${hasVideoAnalysis.status}`);
                console.log(`      - Progress: ${hasVideoAnalysis.progress}%`);
                console.log(`      - Error: ${hasVideoAnalysis.error_message || 'None'}`);
            }
            
            console.log('');
        }
        
        // Test if the most recent URL is a multimedia URL
        if (recentContent.length > 0) {
            const mostRecent = recentContent[0];
            if (mostRecent.url) {
                console.log('🧪 Testing most recent URL for multimedia detection...\n');
                
                try {
                    const analyzer = new MultimediaAnalyzer({ enableLogging: true });
                    const isMultimedia = analyzer.isMultimediaUrl(mostRecent.url);
                    const urlMetadata = await analyzer.extractUrlMetadata(mostRecent.url);
                    
                    console.log(`📊 URL Analysis for: ${mostRecent.url}`);
                    console.log(`   🎬 Is Multimedia: ${isMultimedia ? '✅ Yes' : '❌ No'}`);
                    console.log(`   🏷️  Platform: ${urlMetadata.platform || 'Unknown'}`);
                    console.log(`   📝 Type: ${urlMetadata.contentType || 'Unknown'}`);
                    
                    if (isMultimedia) {
                        console.log('\n🎯 This should trigger automation! Checking if analyzeContent works...');
                        
                        const testResult = await analyzer.analyzeContent(mostRecent.url, {
                            user_id: mostRecent.user_id,
                            content_id: mostRecent.id,
                            transcription: true,
                            enableSummarization: true,
                            enableSentimentAnalysis: true
                        });
                        
                        console.log('\n📋 Test Analysis Results:');
                        console.log(`   📝 Transcription: ${testResult.transcription ? `${testResult.transcription.length} chars` : 'None'}`);
                        console.log(`   📋 Summary: ${testResult.summary ? `${testResult.summary.length} chars` : 'None'}`);
                        console.log(`   🎭 Sentiment: ${testResult.sentiment || 'None'}`);
                        console.log(`   ⏱️  Processing Time: ${testResult.processing_time}ms`);
                        console.log(`   🎯 Status: ${testResult.status}`);
                        
                        if (testResult.transcription && testResult.transcription.length > 50) {
                            console.log('\n✅ Manual analysis WORKS! The issue is likely that automation is not being triggered in the routes.');
                        } else {
                            console.log('\n❌ Manual analysis also failed. The issue is in the analyzer itself.');
                        }
                    } else {
                        console.log('\n❌ URL is not detected as multimedia, so automation should not trigger.');
                    }
                    
                } catch (testError) {
                    console.error('❌ Test analysis failed:', testError.message);
                    console.error(testError.stack);
                }
            } else {
                console.log('❌ Most recent content has no URL to test.');
            }
        } else {
            console.log('❌ No recent content found.');
        }
        
    } catch (error) {
        console.error('❌ Error checking recent content:', error);
        console.error(error.stack);
    }
}

// Run the check
checkRecentContent().then(() => {
    console.log('\n✅ Content check completed');
    process.exit(0);
}).catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
}); 