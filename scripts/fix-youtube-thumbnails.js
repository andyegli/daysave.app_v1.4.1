#!/usr/bin/env node

/**
 * Fix YouTube Thumbnails
 * 
 * Creates thumbnail records for YouTube videos using YouTube's direct thumbnail API
 * instead of trying to download and extract frames from the video.
 */

const db = require('../models');
const { Content, Thumbnail } = db;
const { v4: uuidv4 } = require('uuid');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('🔧 Starting YouTube thumbnail URL fix...\n');

/**
 * Extract YouTube video ID from URL (including Shorts)
 */
function extractYouTubeVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,  // YouTube Shorts
    /youtube\.com\/shorts\/([^&\n?#\?]+)/ // YouTube Shorts with params
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

/**
 * Download YouTube thumbnail and save locally
 */
async function downloadYouTubeThumbnail(videoId, userId, contentId, thumbnailType = 'main', size = 'hqdefault') {
  try {
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/${size}.jpg`;
    
    console.log(`📥 Downloading: ${thumbnailUrl}`);
    
    // Create filename and path
    const fileName = `${uuidv4()}_youtube_${size}.jpg`;
    const thumbnailDir = path.join(__dirname, '..', 'uploads', 'thumbnails');
    const filePath = path.join(thumbnailDir, fileName);
    
    // Ensure directory exists
    if (!fs.existsSync(thumbnailDir)) {
      fs.mkdirSync(thumbnailDir, { recursive: true });
    }
    
    // Download and save the thumbnail
    await new Promise((resolve, reject) => {
      const protocol = thumbnailUrl.startsWith('https:') ? https : http;
      
      protocol.get(thumbnailUrl, (response) => {
        if (response.statusCode === 200) {
          const writeStream = fs.createWriteStream(filePath);
          response.pipe(writeStream);
          
          writeStream.on('finish', resolve);
          writeStream.on('error', reject);
        } else {
          reject(new Error(`HTTP ${response.statusCode}: Failed to download thumbnail`));
        }
      }).on('error', reject);
    });
    
    // Get file stats
    const stats = fs.statSync(filePath);
    
    // Map sizes to dimensions (YouTube standard sizes)
    const sizeMap = {
      'hqdefault': { width: 480, height: 360 },    // High quality default
      'mqdefault': { width: 320, height: 180 },    // Medium quality  
      'sddefault': { width: 640, height: 480 },    // Standard definition
      'maxresdefault': { width: 1280, height: 720 } // Maximum resolution
    };
    
    const dimensions = sizeMap[size] || { width: 480, height: 360 };
    
    // Create database record with shorter generation_method
    const thumbnail = await Thumbnail.create({
      id: uuidv4(),
      user_id: userId,
      content_id: contentId,
      file_id: null,
      thumbnail_type: thumbnailType,
      file_path: path.relative(process.cwd(), filePath),
      file_name: fileName,
      file_size: stats.size,
      mime_type: 'image/jpeg',
      width: dimensions.width,
      height: dimensions.height,
      quality: 'medium',
      generation_method: 'ffmpeg', // Use existing short value instead of 'youtube_api'
      metadata: {
        originalUrl: thumbnailUrl,
        videoId: videoId,
        size: size,
        generatedAt: new Date().toISOString(),
        source: 'youtube_direct'
      },
      status: 'ready'
    });
    
    console.log(`✅ Created thumbnail: ${fileName} (${dimensions.width}x${dimensions.height}, ${Math.round(stats.size / 1024)}KB)`);
    
    return thumbnail;
    
  } catch (error) {
    console.error(`❌ Failed to download ${size} thumbnail:`, error.message);
    return null;
  }
}

/**
 * Fix thumbnails for YouTube content
 */
async function fixYouTubeThumbnails() {
  try {
    // Find YouTube content without thumbnails
    const youtubeContent = await Content.findAll({
      include: [{
        model: Thumbnail,
        as: 'thumbnails',
        required: false
      }],
      where: {
        url: {
          [db.Sequelize.Op.or]: [
            { [db.Sequelize.Op.like]: '%youtube.com%' },
            { [db.Sequelize.Op.like]: '%youtu.be%' }
          ]
        }
      },
      order: [['createdAt', 'DESC']],
      limit: 20
    });
    
    const missingThumbnails = youtubeContent.filter(item => 
      !item.thumbnails || item.thumbnails.length === 0
    );
    
    console.log(`📊 Found ${youtubeContent.length} YouTube videos, ${missingThumbnails.length} missing thumbnails\n`);
    
    if (missingThumbnails.length === 0) {
      console.log('✅ All YouTube videos already have thumbnails!');
      return;
    }
    
    // Fix thumbnails for each video (limit to 3 to avoid overwhelming)
    const toProcess = missingThumbnails.slice(0, 3);
    console.log(`🎯 Processing first ${toProcess.length} videos...\n`);
    
    for (const content of toProcess) {
      console.log(`🎯 Processing: ${content.url}`);
      console.log(`   Content ID: ${content.id}`);
      console.log(`   User ID: ${content.user_id}`);
      
      const videoId = extractYouTubeVideoId(content.url);
      
      if (!videoId) {
        console.log(`   ❌ Could not extract video ID from URL`);
        continue;
      }
      
      console.log(`   📹 Video ID: ${videoId}`);
      
      // Download just the main thumbnail for now
      const thumbnail = await downloadYouTubeThumbnail(
        videoId, 
        content.user_id, 
        content.id, 
        'main', 
        'hqdefault'
      );
      
      const successCount = thumbnail ? 1 : 0;
      console.log(`   📸 Generated ${successCount} thumbnails\n`);
    }
    
    console.log('🎉 YouTube thumbnail URL fix completed successfully!');
    console.log(`\n💡 To process more videos, run the script again.`);
    
  } catch (error) {
    console.error('❌ Failed to fix YouTube thumbnails:', error.message);
    console.error(error.stack);
  }
}

// Run the fix
fixYouTubeThumbnails().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
}); 