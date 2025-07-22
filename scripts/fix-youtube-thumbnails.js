const { Content, File } = require('../models');
const { Op } = require('sequelize');

async function fixYouTubeThumbnails() {
  console.log('🔧 Starting YouTube thumbnail URL fix...');
  
  try {
    // Fix Content table - check metadata JSON field
    console.log('📋 Checking Content table for maxresdefault.jpg URLs...');
    const contentItems = await Content.findAll({
      where: {
        [Op.or]: [
          {
            metadata: {
              [Op.like]: '%maxresdefault.jpg%'
            }
          },
          {
            url: {
              [Op.like]: '%maxresdefault.jpg%'
            }
          }
        ]
      }
    });

    console.log(`Found ${contentItems.length} content items with maxresdefault.jpg URLs`);

    for (const item of contentItems) {
      let updated = false;
      
      // Fix metadata field
      if (item.metadata && typeof item.metadata === 'string') {
        const metadataStr = item.metadata.replace(/maxresdefault\.jpg/g, 'hqdefault.jpg');
        if (metadataStr !== item.metadata) {
          item.metadata = metadataStr;
          updated = true;
        }
      } else if (item.metadata && typeof item.metadata === 'object') {
        if (item.metadata.thumbnail && item.metadata.thumbnail.includes('maxresdefault.jpg')) {
          item.metadata.thumbnail = item.metadata.thumbnail.replace('maxresdefault.jpg', 'hqdefault.jpg');
          updated = true;
        }
      }
      
      // Fix url field
      if (item.url && item.url.includes('maxresdefault.jpg')) {
        item.url = item.url.replace('maxresdefault.jpg', 'hqdefault.jpg');
        updated = true;
      }
      
      if (updated) {
        await item.save();
        console.log(`✅ Updated content item ${item.id}: ${item.title || 'Untitled'}`);
      }
    }

    // Fix Files table - check metadata JSON field and file_url
    console.log('📁 Checking Files table for maxresdefault.jpg URLs...');
    const fileItems = await File.findAll({
      where: {
        [Op.or]: [
          {
            metadata: {
              [Op.like]: '%maxresdefault.jpg%'
            }
          },
          {
            file_url: {
              [Op.like]: '%maxresdefault.jpg%'
            }
          },
          {
            thumbnail_url: {
              [Op.like]: '%maxresdefault.jpg%'
            }
          }
        ]
      }
    });

    console.log(`Found ${fileItems.length} file items with maxresdefault.jpg URLs`);

    for (const item of fileItems) {
      let updated = false;
      
      // Fix metadata field
      if (item.metadata && typeof item.metadata === 'string') {
        const metadataStr = item.metadata.replace(/maxresdefault\.jpg/g, 'hqdefault.jpg');
        if (metadataStr !== item.metadata) {
          item.metadata = metadataStr;
          updated = true;
        }
      } else if (item.metadata && typeof item.metadata === 'object') {
        if (item.metadata.thumbnail && item.metadata.thumbnail.includes('maxresdefault.jpg')) {
          item.metadata.thumbnail = item.metadata.thumbnail.replace('maxresdefault.jpg', 'hqdefault.jpg');
          updated = true;
        }
      }
      
      // Fix file_url field
      if (item.file_url && item.file_url.includes('maxresdefault.jpg')) {
        item.file_url = item.file_url.replace('maxresdefault.jpg', 'hqdefault.jpg');
        updated = true;
      }
      
      // Fix thumbnail_url field
      if (item.thumbnail_url && item.thumbnail_url.includes('maxresdefault.jpg')) {
        item.thumbnail_url = item.thumbnail_url.replace('maxresdefault.jpg', 'hqdefault.jpg');
        updated = true;
      }
      
      if (updated) {
        await item.save();
        console.log(`✅ Updated file item ${item.id}: ${item.filename || 'Untitled'}`);
      }
    }

    console.log('🎉 YouTube thumbnail URL fix completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Content items processed: ${contentItems.length}`);
    console.log(`   - File items processed: ${fileItems.length}`);
    
  } catch (error) {
    console.error('❌ Error fixing YouTube thumbnails:', error);
    throw error;
  }
}

// Run the fix if this script is executed directly
if (require.main === module) {
  fixYouTubeThumbnails()
    .then(() => {
      console.log('✅ Fix completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fix failed:', error);
      process.exit(1);
    });
}

module.exports = fixYouTubeThumbnails; 