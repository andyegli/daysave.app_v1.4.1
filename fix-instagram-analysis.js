const { Content, VideoAnalysis } = require('./models');
const { MultimediaAnalyzer } = require('./services/multimedia');

async function fixStuckInstagramAnalysis() {
  try {
    console.log('🔧 Starting Instagram analysis fix...');
    
    // Find Instagram content that's stuck in processing
    const stuckInstagramContent = await VideoAnalysis.findAll({
      include: [{
        model: Content,
        where: {
          url: { [require('sequelize').Op.like]: '%instagram.com%' }
        }
      }],
      where: {
        status: 'processing'
      }
    });
    
    console.log(`📊 Found ${stuckInstagramContent.length} stuck Instagram analyses`);
    
    if (stuckInstagramContent.length === 0) {
      console.log('✅ No stuck Instagram analyses found');
      return;
    }
    
    // Initialize multimedia analyzer with new Instagram support
    const analyzer = new MultimediaAnalyzer({
      enableLogging: true
    });
    
    for (const analysis of stuckInstagramContent) {
      const content = analysis.Content;
      console.log(`\n🔄 Retrying analysis for: ${content.url}`);
      console.log(`   Content ID: ${content.id}`);
      console.log(`   Analysis ID: ${analysis.id}`);
      
      try {
        // Update analysis status to retrying
        await analysis.update({
          status: 'retrying',
          progress: 0
        });
        
        // Retry analysis with new Instagram support
        const result = await analyzer.analyzeContent(content.url, {
          user_id: content.user_id,
          content_id: content.id,
          transcription: true,
          sentiment: true,
          enableSummarization: true,
          thumbnails: true,
          speaker_identification: true
        });
        
        if (result.success && result.transcription && result.transcription.length > 50) {
          // Update content with results
          await content.update({
            summary: result.summary || result.transcription.substring(0, 500),
            generated_title: result.generatedTitle || result.metadata?.title || 'Instagram Content Analysis',
            auto_tags: result.auto_tags || ['instagram', 'social', 'visual'],
            sentiment: result.sentiment,
            transcription: result.transcription
          });
          
          // Update analysis status to completed
          await analysis.update({
            status: 'completed',
            progress: 100,
            completed_at: new Date(),
            transcription_results: {
              fullText: result.transcription,
              wordCount: result.transcription.split(' ').length,
              provider: 'instagram_yt-dlp'
            }
          });
          
          console.log(`✅ Successfully fixed: ${content.url}`);
          console.log(`   Summary length: ${result.summary?.length || 0}`);
          console.log(`   Transcription length: ${result.transcription?.length || 0}`);
          console.log(`   Tags: ${result.auto_tags?.join(', ')}`);
        } else {
          // Mark as failed with informative message
          await analysis.update({
            status: 'failed',
            progress: 0,
            error_message: 'Instagram content could not be accessed. Content may be private or protected.'
          });
          
          await content.update({
            summary: 'Instagram content analysis failed. This content may be private or have restricted access.',
            generated_title: 'Instagram Content (Access Restricted)',
            auto_tags: ['instagram', 'social', 'private', 'access_restricted']
          });
          
          console.log(`⚠️ Could not access: ${content.url} (likely private/restricted)`);
        }
        
      } catch (error) {
        console.error(`❌ Failed to retry ${content.url}:`, error.message);
        
        // Mark as failed
        await analysis.update({
          status: 'failed',
          progress: 0,
          error_message: error.message
        });
        
        await content.update({
          summary: 'Instagram content analysis encountered an error.',
          generated_title: 'Instagram Content (Analysis Error)',
          auto_tags: ['instagram', 'social', 'analysis_error']
        });
      }
    }
    
    console.log('\n🎉 Instagram analysis fix completed!');
    
  } catch (error) {
    console.error('❌ Instagram fix script failed:', error);
  }
}

// Run the fix
fixStuckInstagramAnalysis().then(() => {
  console.log('✅ Script completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
}); 