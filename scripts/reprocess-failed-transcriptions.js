const { Content, User } = require('../models');
const MultimediaAnalyzer = require('../services/multimedia/MultimediaAnalyzer');
const { Op } = require('sequelize');

/**
 * Script to reprocess content items that failed transcription due to YouTube video ID extraction issues
 * This script will:
 * 1. Find content items with empty/failed transcriptions
 * 2. Filter for YouTube URLs (including Shorts)
 * 3. Reprocess them with the updated YouTube Shorts regex
 */

async function reprocessFailedTranscriptions() {
  console.log('🔍 Starting reprocessing of failed YouTube transcriptions...\n');
  
  try {
    // Initialize multimedia analyzer
    const multimediaAnalyzer = new MultimediaAnalyzer({
      enableLogging: true
    });
    
    // Find content items that likely failed transcription
    const failedContent = await Content.findAll({
      where: {
        url: {
          [Op.or]: [
            { [Op.like]: '%youtube.com%' },
            { [Op.like]: '%youtu.be%' }
          ]
        },
        [Op.or]: [
          { transcription: null },
          { transcription: '' },
          { transcription: 'Transcription extraction failed for this YouTube video. Error: Could not extract video ID from URL' },
          { transcription: 'Transcription could not be processed for this content.' },
          { transcription: 'Transcription processing failed for this content.' },
          { transcription: { [Op.like]: '%Could not extract video ID from URL%' } },
          { transcription: { [Op.like]: '%Transcription extraction failed%' } }
        ]
      },
      include: [{
        model: User,
        attributes: ['id', 'username', 'email']
      }],
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`📊 Found ${failedContent.length} content items with failed/missing transcriptions\n`);
    
    if (failedContent.length === 0) {
      console.log('✅ No content items need reprocessing!');
      return;
    }
    
    // Process each failed content item
    let processedCount = 0;
    let successCount = 0;
    let failureCount = 0;
    
    for (const content of failedContent) {
      processedCount++;
      
      console.log(`\n🔄 Processing ${processedCount}/${failedContent.length}: ${content.url}`);
      console.log(`   User: ${content.User.username} (${content.User.email})`);
      console.log(`   Created: ${content.createdAt.toISOString()}`);
      console.log(`   Current transcription: ${content.transcription ? content.transcription.substring(0, 100) + '...' : 'NULL'}`);
      
      try {
        // Test video ID extraction first
        const videoId = multimediaAnalyzer.extractYouTubeVideoId(content.url);
        console.log(`   Video ID: ${videoId || 'FAILED TO EXTRACT'}`);
        
        if (!videoId) {
          console.log(`   ⚠️ Still cannot extract video ID from: ${content.url}`);
          failureCount++;
          continue;
        }
        
        // Reprocess the content
        console.log(`   🎬 Reprocessing with updated analyzer...`);
        const analysisResults = await multimediaAnalyzer.analyzeContent(content.url, {
          user_id: content.User.id,
          content_id: content.id,
          transcription: true,
          sentiment: true,
          thumbnails: true,
          ocr: true,
          speaker_identification: true,
          enableSummarization: true
        });
        
        // Update the content record
        const updateData = {};
        
        if (analysisResults.transcription && analysisResults.transcription.length > 0) {
          updateData.transcription = analysisResults.transcription;
        }
        
        if (analysisResults.summary && analysisResults.summary.length > 0) {
          updateData.summary = analysisResults.summary;
        }
        
        if (analysisResults.sentiment) {
          updateData.sentiment = analysisResults.sentiment;
        }
        
        if (analysisResults.auto_tags && analysisResults.auto_tags.length > 0) {
          updateData.auto_tags = analysisResults.auto_tags;
        }
        
        if (analysisResults.category) {
          updateData.category = analysisResults.category;
        }
        
        if (analysisResults.metadata) {
          updateData.metadata = {
            ...(content.metadata || {}),
            ...analysisResults.metadata
          };
        }
        
        // Update the content record
        if (Object.keys(updateData).length > 0) {
          await Content.update(updateData, {
            where: { id: content.id }
          });
          
          console.log(`   ✅ Updated content with:`, Object.keys(updateData));
          console.log(`   📝 Transcription: ${updateData.transcription ? updateData.transcription.length + ' characters' : 'no transcription'}`);
          console.log(`   🎯 Sentiment: ${updateData.sentiment ? updateData.sentiment.label : 'no sentiment'}`);
          console.log(`   🏷️ Tags: ${updateData.auto_tags ? updateData.auto_tags.length + ' tags' : 'no tags'}`);
          
          successCount++;
        } else {
          console.log(`   ⚠️ No updates needed or analysis failed`);
          failureCount++;
        }
        
      } catch (error) {
        console.error(`   ❌ Error processing ${content.url}:`, error.message);
        failureCount++;
      }
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`\n📊 Reprocessing Summary:`);
    console.log(`   Total processed: ${processedCount}`);
    console.log(`   Successful: ${successCount}`);
    console.log(`   Failed: ${failureCount}`);
    console.log(`   Success rate: ${Math.round((successCount / processedCount) * 100)}%`);
    
  } catch (error) {
    console.error('❌ Error in reprocessing script:', error);
  }
}

// Run the script if called directly
if (require.main === module) {
  reprocessFailedTranscriptions()
    .then(() => {
      console.log('\n🎉 Reprocessing completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = reprocessFailedTranscriptions; 