#!/usr/bin/env node

/**
 * Fix Thumbnail Status
 * 
 * This script fixes thumbnails that are stuck in "generating" status
 * by checking if the actual thumbnail files exist and updating status to "ready"
 */

require('dotenv').config();
const { Thumbnail } = require('../models');
const fs = require('fs');
const path = require('path');

async function fixThumbnailStatus() {
  try {
    console.log('🔧 Fixing thumbnail statuses...');
    
    // Find thumbnails with "generating" status
    const generatingThumbnails = await Thumbnail.findAll({
      where: {
        status: 'generating'
      },
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`\n📊 Found ${generatingThumbnails.length} thumbnails with "generating" status`);
    
    let fixed = 0;
    let notFound = 0;
    
    for (const thumbnail of generatingThumbnails) {
      console.log(`\n🖼️ Checking thumbnail: ${thumbnail.file_name}`);
      console.log(`   Path: ${thumbnail.file_path}`);
      
      // Check if file exists
      const fullPath = path.isAbsolute(thumbnail.file_path) 
        ? thumbnail.file_path 
        : path.join(process.cwd(), thumbnail.file_path);
      
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        console.log(`   ✅ File exists (${(stats.size / 1024).toFixed(1)} KB)`);
        
        // Update status to ready and add file size if missing
        await thumbnail.update({
          status: 'ready',
          file_size: thumbnail.file_size || stats.size,
          metadata: {
            ...thumbnail.metadata,
            statusUpdated: new Date().toISOString(),
            actualFileSize: stats.size
          }
        });
        
        console.log(`   ✅ Status updated to "ready"`);
        fixed++;
      } else {
        console.log(`   ❌ File not found`);
        
        // Update status to failed
        await thumbnail.update({
          status: 'failed',
          metadata: {
            ...thumbnail.metadata,
            statusUpdated: new Date().toISOString(),
            error: 'File not found on filesystem'
          }
        });
        
        console.log(`   ⚠️ Status updated to "failed"`);
        notFound++;
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Fixed: ${fixed} thumbnails`);
    console.log(`   ❌ Not found: ${notFound} thumbnails`);
    console.log(`   📈 Total processed: ${generatingThumbnails.length} thumbnails`);
    
  } catch (error) {
    console.error('❌ Error fixing thumbnail statuses:', error);
    console.error(error.stack);
  }
}

if (require.main === module) {
  fixThumbnailStatus().then(() => {
    console.log('\n✅ Thumbnail status fix completed');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { fixThumbnailStatus };
