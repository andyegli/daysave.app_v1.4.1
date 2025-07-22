/**
 * Populate Content Types Script
 * 
 * This script populates the new content_type field for all existing 
 * content and file records using the same detection logic used throughout
 * the application. This ensures consistency and optimal performance.
 * 
 * Usage: node scripts/populate-content-types.js
 */

require('dotenv').config();
const { Content, File, VideoAnalysis, AudioAnalysis, ImageAnalysis } = require('../models');

/**
 * Content type detection logic (matches AutomationOrchestrator logic)
 */
class ContentTypeDetector {
  /**
   * Detect content type from URL patterns
   */
  detectFromUrl(url) {
    if (!url || typeof url !== 'string') return null;
    
    // Video platforms
    const videoPatterns = [
      /youtube\.com\/watch/i,
      /youtube\.com\/shorts/i,
      /youtu\.be\//i,
      /vimeo\.com\//i,
      /tiktok\.com\//i,
      /instagram\.com\/p\//i,
      /instagram\.com\/reel\//i,
      /facebook\.com\/watch/i,
      /facebook\.com\/share\/v\//i,
      /facebook\.com\/share\/p\//i,
      /facebook\.com\/video\//i,
      /facebook\.com\/.*\/videos\//i,
      /facebook\.com\/.*\/posts\//i,
      /facebook\.com\/.*\/photos\//i,
      /m\.facebook\.com\/watch/i,
      /m\.facebook\.com\/video\//i,
      /fb\.com\//i,
      /twitter\.com\/.*\/status/i,
      /x\.com\/.*\/status/i
    ];
    
    // Audio platforms
    const audioPatterns = [
      /soundcloud\.com\//i,
      /spotify\.com\//i,
      /anchor\.fm\//i
    ];
    
    // Image platforms
    const imagePatterns = [
      /imgur\.com\//i,
      /flickr\.com\//i,
      /pinterest\.com\//i
    ];
    
    // Direct file patterns
    const videoFilePatterns = /\.(mp4|avi|mov|wmv|flv|webm|mkv|m4v)(\?|$)/i;
    const audioFilePatterns = /\.(mp3|wav|flac|aac|ogg|wma|m4a)(\?|$)/i;
    const imageFilePatterns = /\.(jpg|jpeg|png|gif|bmp|webp|svg|tiff)(\?|$)/i;
    const documentFilePatterns = /\.(pdf|txt|csv|doc|docx)(\?|$)/i;
    
    // Check patterns
    if (videoPatterns.some(pattern => pattern.test(url)) || videoFilePatterns.test(url)) {
      return 'video';
    }
    if (audioPatterns.some(pattern => pattern.test(url)) || audioFilePatterns.test(url)) {
      return 'audio';
    }
    if (imagePatterns.some(pattern => pattern.test(url)) || imageFilePatterns.test(url)) {
      return 'image';
    }
    if (documentFilePatterns.test(url)) {
      return 'document';
    }
    
    return null;
  }
  
  /**
   * Detect content type from MIME type
   */
  detectFromMimeType(mimeType) {
    if (!mimeType) return null;
    
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('application/pdf') || 
        mimeType.startsWith('text/') || 
        mimeType.includes('document') ||
        mimeType.includes('spreadsheet')) return 'document';
    
    return null;
  }
  
  /**
   * Detect content type from file extension
   */
  detectFromFilename(filename) {
    if (!filename) return null;
    
    const ext = filename.toLowerCase().split('.').pop();
    
    const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v'];
    const audioExts = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a'];
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff'];
    const documentExts = ['pdf', 'txt', 'csv', 'doc', 'docx'];
    
    if (videoExts.includes(ext)) return 'video';
    if (audioExts.includes(ext)) return 'audio';
    if (imageExts.includes(ext)) return 'image';
    if (documentExts.includes(ext)) return 'document';
    
    return null;
  }
  
  /**
   * Detect content type from analysis records
   */
  detectFromAnalysis(videoAnalysis, audioAnalysis, imageAnalysis) {
    if (videoAnalysis) return 'video';
    if (audioAnalysis) return 'audio';
    if (imageAnalysis) return 'image';
    return null;
  }
  
  /**
   * Detect content type from metadata
   */
  detectFromMetadata(metadata) {
    if (!metadata) return null;
    
    // Check explicit fileCategory
    if (metadata.fileCategory) {
      const category = metadata.fileCategory.toLowerCase();
      if (['video', 'audio', 'image', 'document'].includes(category)) {
        return category;
      }
    }
    
    // Check MIME type in metadata
    if (metadata.mimetype) {
      return this.detectFromMimeType(metadata.mimetype);
    }
    
    // Check for video/audio specific metadata
    if (metadata.video || metadata.duration) return 'video';
    if (metadata.imageAnalysis) return 'image';
    
    return null;
  }
  
  /**
   * Comprehensive content type detection
   */
  async detectContentType(record, analysisRecords = {}) {
    const { videoAnalysis, audioAnalysis, imageAnalysis } = analysisRecords;
    
    // 1. Check analysis records first (most reliable)
    const fromAnalysis = this.detectFromAnalysis(videoAnalysis, audioAnalysis, imageAnalysis);
    if (fromAnalysis) return fromAnalysis;
    
    // 2. Check URL patterns (for content records)
    if (record.url) {
      const fromUrl = this.detectFromUrl(record.url);
      if (fromUrl) return fromUrl;
    }
    
    // 3. Check filename (for file records)
    if (record.filename) {
      const fromFilename = this.detectFromFilename(record.filename);
      if (fromFilename) return fromFilename;
    }
    
    // 4. Check metadata
    if (record.metadata) {
      const fromMetadata = this.detectFromMetadata(record.metadata);
      if (fromMetadata) return fromMetadata;
    }
    
    // 5. Infer from content characteristics
    if (record.transcription && record.transcription.length > 100) {
      // Long transcription suggests audio/video
      if (record.url && record.url.includes('youtube')) return 'video';
      return 'audio';
    }
    
    // 6. Default fallback
    return 'unknown';
  }
}

/**
 * Main population function
 */
async function populateContentTypes() {
  console.log('🚀 Starting content type population for existing records...');
  
  const detector = new ContentTypeDetector();
  let contentUpdated = 0;
  let filesUpdated = 0;
  
  try {
    // Process Content records
    console.log('\n📋 Processing Content records...');
    const contentRecords = await Content.findAll({
      include: [
        { model: VideoAnalysis, as: 'videoAnalysis' },
        { model: AudioAnalysis, as: 'audioAnalysis' },
        { model: ImageAnalysis, as: 'imageAnalysis' }
      ]
    });
    
    console.log(`Found ${contentRecords.length} content records to process`);
    
    for (const content of contentRecords) {
      const analysisRecords = {
        videoAnalysis: content.videoAnalysis,
        audioAnalysis: content.audioAnalysis,
        imageAnalysis: content.imageAnalysis
      };
      
      const detectedType = await detector.detectContentType(content, analysisRecords);
      
      if (detectedType !== content.content_type) {
        await content.update({ content_type: detectedType });
        contentUpdated++;
        
        if (contentUpdated % 10 === 0) {
          console.log(`  ✅ Updated ${contentUpdated} content records...`);
        }
      }
    }
    
    // Process File records
    console.log('\n📁 Processing File records...');
    const fileRecords = await File.findAll({
      include: [
        { model: VideoAnalysis, as: 'videoAnalysis' },
        { model: AudioAnalysis, as: 'audioAnalysis' },
        { model: ImageAnalysis, as: 'imageAnalysis' }
      ]
    });
    
    console.log(`Found ${fileRecords.length} file records to process`);
    
    for (const file of fileRecords) {
      const analysisRecords = {
        videoAnalysis: file.videoAnalysis,
        audioAnalysis: file.audioAnalysis,
        imageAnalysis: file.imageAnalysis
      };
      
      const detectedType = await detector.detectContentType(file, analysisRecords);
      
      if (detectedType !== file.content_type) {
        await file.update({ content_type: detectedType });
        filesUpdated++;
        
        if (filesUpdated % 10 === 0) {
          console.log(`  ✅ Updated ${filesUpdated} file records...`);
        }
      }
    }
    
    // Generate summary
    console.log('\n📊 Population Summary:');
    console.log(`  📋 Content records updated: ${contentUpdated}/${contentRecords.length}`);
    console.log(`  📁 File records updated: ${filesUpdated}/${fileRecords.length}`);
    console.log(`  🎯 Total records updated: ${contentUpdated + filesUpdated}`);
    
    // Show content type distribution
    console.log('\n📈 Content Type Distribution:');
    
    const contentDistribution = await Content.findAll({
      attributes: [
        'content_type',
        [Content.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['content_type']
    });
    
    const fileDistribution = await File.findAll({
      attributes: [
        'content_type',
        [File.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['content_type']
    });
    
    console.log('  Content Table:');
    contentDistribution.forEach(item => {
      console.log(`    ${item.content_type}: ${item.dataValues.count}`);
    });
    
    console.log('  Files Table:');
    fileDistribution.forEach(item => {
      console.log(`    ${item.content_type}: ${item.dataValues.count}`);
    });
    
    console.log('\n✅ Content type population completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during content type population:', error);
    throw error;
  }
}

// Run the script if called directly
if (require.main === module) {
  populateContentTypes()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { populateContentTypes, ContentTypeDetector }; 