#!/usr/bin/env node

/**
 * Trigger Analysis for Waiting Content
 * 
 * Finds content items stuck at 0% waiting status and manually triggers
 * their multimedia analysis to get them processed.
 */

const { Content, User } = require('../models');

async function triggerWaitingAnalysis() {
  console.log('🔄 Finding content items waiting for analysis...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // Find content items that are waiting (no transcription, summary, or analysis)
    const waitingContent = await Content.findAll({
      where: {
        transcription: null,
        summary: null,
        auto_tags: null
      },
      include: [{
        model: User,
        attributes: ['id', 'username', 'email']
      }],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    if (waitingContent.length === 0) {
      console.log('✅ No content items found waiting for analysis');
      return;
    }

    console.log(`🔍 Found ${waitingContent.length} content items waiting for analysis:`);
    
    for (const content of waitingContent) {
      console.log(`\n📄 Content: ${content.id}`);
      console.log(`   URL: ${content.url}`);
      console.log(`   User: ${content.User.username || content.User.email}`);
      console.log(`   Created: ${content.createdAt}`);
      console.log(`   Type: ${content.content_type || 'unknown'}`);
      
      // Check if it's a multimedia URL that should be analyzed
      if (content.url) {
        const isMultimediaURL = require('../routes/content').isMultimediaURL || function(url) {
          // Simple fallback check
          const multimediaPatterns = [
            /youtube\.com\/watch/i,
            /youtu\.be\//i,
            /vimeo\.com\//i,
            /facebook\.com/i,
            /instagram\.com/i,
            /tiktok\.com/i
          ];
          return multimediaPatterns.some(pattern => pattern.test(url));
        };
        
        if (typeof isMultimediaURL === 'function' && isMultimediaURL(content.url)) {
          console.log('   🎬 Multimedia URL detected - should trigger analysis');
          
          try {
            // Import and trigger analysis
            const triggerAnalysis = require('../routes/content').triggerMultimediaAnalysis;
            if (typeof triggerAnalysis === 'function') {
              console.log('   🚀 Triggering background analysis...');
              
              // Trigger in background
              setImmediate(async () => {
                try {
                  await triggerAnalysis(content, content.User);
                  console.log(`   ✅ Analysis triggered for ${content.id}`);
                } catch (error) {
                  console.log(`   ❌ Analysis failed for ${content.id}: ${error.message}`);
                }
              });
            } else {
              console.log('   ⚠️ triggerMultimediaAnalysis function not available');
            }
          } catch (error) {
            console.log(`   ❌ Error triggering analysis: ${error.message}`);
          }
        } else {
          console.log('   📄 Non-multimedia URL - manual processing may be needed');
        }
      } else {
        console.log('   ⚠️ No URL found for this content item');
      }
    }
    
    console.log(`\n🎯 Analysis triggered for multimedia content items`);
    console.log('📊 Check the app logs to monitor processing progress');
    
  } catch (error) {
    console.error('❌ Error finding waiting content:', error);
  }
}

// Execute if run directly
if (require.main === module) {
  triggerWaitingAnalysis()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { triggerWaitingAnalysis }; 