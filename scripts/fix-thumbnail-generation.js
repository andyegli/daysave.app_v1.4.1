#!/usr/bin/env node

/**
 * Fix Missing Thumbnail Generation
 * 
 * Specifically addresses content items stuck at 86% completion due to missing thumbnails.
 * Attempts to trigger thumbnail generation for these items.
 */

const { Content, Thumbnail, VideoAnalysis } = require('../models');

async function main() {
  console.log('🖼️  Starting thumbnail generation fix...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // Find content items that have analysis but no thumbnails
    const contentWithoutThumbnails = await Content.findAll({
      where: {
        // Has core analysis features
        transcription: { [require('sequelize').Op.ne]: null },
        summary: { [require('sequelize').Op.ne]: null },
        auto_tags: { [require('sequelize').Op.ne]: null }
      },
      include: [
        {
          model: Thumbnail,
          as: 'thumbnails',
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 20
    });

    console.log(`📊 Found ${contentWithoutThumbnails.length} items with analysis but potentially missing thumbnails`);

    let fixedCount = 0;
    let skippedCount = 0;

    for (const content of contentWithoutThumbnails) {
      const hasThumbnails = content.thumbnails && content.thumbnails.length > 0;
      
      console.log(`\n🔍 Checking: ${content.id}`);
      console.log(`   📄 URL: ${content.url?.substring(0, 60)}...`);
      console.log(`   📅 Created: ${content.createdAt}`);
      console.log(`   🖼️  Thumbnails: ${hasThumbnails ? content.thumbnails.length : 0}`);

      if (!hasThumbnails) {
        console.log(`   🔧 Action: NEEDS THUMBNAILS - Marking for thumbnail generation`);
        
        try {
          // Update metadata to indicate thumbnail generation needed
          await Content.update({
            metadata: {
              ...content.metadata,
              needsThumbnails: true,
              thumbnailRetryAt: new Date().toISOString(),
              thumbnailRetryReason: 'Missing thumbnails after analysis completion'
            }
          }, {
            where: { id: content.id }
          });

          console.log(`   ✅ Marked ${content.id} for thumbnail generation`);
          fixedCount++;
          
        } catch (error) {
          console.error(`   ❌ Failed to mark ${content.id}:`, error.message);
        }
      } else {
        console.log(`   ✅ Action: SKIP - Already has ${content.thumbnails.length} thumbnails`);
        skippedCount++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   🔧 Marked for thumbnail generation: ${fixedCount}`);
    console.log(`   ✅ Already had thumbnails: ${skippedCount}`);
    console.log(`   📋 Total processed: ${fixedCount + skippedCount}`);

    if (fixedCount > 0) {
      console.log(`\n💡 Next Steps:`);
      console.log(`   1. The marked items will show 'incomplete' status in the UI`);
      console.log(`   2. Click the 'Retry' button on these items to regenerate thumbnails`);
      console.log(`   3. Or wait for background processing to pick them up automatically`);
    }

  } catch (error) {
    console.error('❌ Error fixing thumbnails:', error);
    process.exit(1);
  }
}

// Run the script
main().then(() => {
  console.log('\n🎉 Thumbnail fix completed!');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 Script failed:', error);
  process.exit(1);
}); 