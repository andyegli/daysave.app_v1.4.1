#!/usr/bin/env node

/**
 * Regenerate Thumbnails for Content Missing Them
 * 
 * This script identifies content items that have analysis but are missing thumbnails
 * and triggers thumbnail regeneration for them.
 */

const db = require('../models');
const { Content, Thumbnail } = db;

async function regenerateMissingThumbnails() {
  try {
    console.log('🖼️ Starting thumbnail regeneration for incomplete content...\n');
    
    // Find content items with analysis but no thumbnails
    const contentWithoutThumbnails = await Content.findAll({
      include: [{
        model: Thumbnail,
        as: 'thumbnails',
        required: false
      }],
      where: {
        // Content that has been analyzed but missing thumbnails
        summary: { [db.Sequelize.Op.ne]: null },
        transcription: { [db.Sequelize.Op.ne]: null }
      },
      order: [['createdAt', 'DESC']],
      limit: 20
    });
    
    const missingThumbnails = contentWithoutThumbnails.filter(item => 
      !item.thumbnails || item.thumbnails.length === 0
    );
    
    console.log(`📊 Found ${missingThumbnails.length} content items missing thumbnails\n`);
    
    if (missingThumbnails.length === 0) {
      console.log('✅ All recent content items have thumbnails!');
      process.exit(0);
    }
    
    // Focus on the most recent one for now
    const targetContent = missingThumbnails[0];
    console.log(`🎯 Targeting most recent item: ${targetContent.url}`);
    console.log(`   Content ID: ${targetContent.id}`);
    console.log(`   Created: ${targetContent.createdAt}`);
    
    // Try to trigger thumbnail generation
    console.log('\n🔄 Attempting to regenerate thumbnails...');
    
    // Use the multimedia analysis service to regenerate thumbnails
    const MultimediaAnalyzer = require('../services/multimedia/MultimediaAnalyzer');
    const analyzer = new MultimediaAnalyzer({
      enableLogging: true
    });
    
    try {
      console.log('🎬 Starting thumbnail generation...');
      
      const result = await analyzer.analyzeContent(targetContent.url, {
        user_id: targetContent.user_id,
        content_id: targetContent.id,
        thumbnails: true,
        thumbnail_count: 3,
        key_moments: true,
        // Skip other analysis since it's already done
        transcription: false,
        sentiment: false,
        speaker_identification: false,
        enableSummarization: false,
        enableSentimentAnalysis: false
      });
      
      console.log('✅ Thumbnail generation completed!');
      console.log(`   Generated: ${result.thumbnails ? result.thumbnails.length : 0} thumbnails`);
      
      if (result.thumbnails && result.thumbnails.length > 0) {
        console.log('\n📸 Generated thumbnails:');
        result.thumbnails.forEach((thumb, i) => {
          console.log(`   ${i + 1}. ${thumb.file_path} (${thumb.width}x${thumb.height})`);
        });
      }
      
    } catch (analysisError) {
      console.error('❌ Thumbnail generation failed:', analysisError.message);
      console.log('\n💡 Troubleshooting suggestions:');
      console.log('   • Check if the URL is still accessible');
      console.log('   • Verify Google Cloud credentials are working');
      console.log('   • Check multimedia analysis service logs');
      console.log('   • Try manually retrying from the web interface');
    }
    
    console.log('\n🎉 Thumbnail regeneration process completed!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Failed to regenerate thumbnails:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

regenerateMissingThumbnails(); 