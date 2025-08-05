#!/usr/bin/env node

/**
 * DaySave - Reconnect Existing Thumbnails
 * 
 * Checks for content items that have no thumbnails in the database but
 * may have thumbnails already stored in Google Cloud Storage.
 * Recreates the database associations for found thumbnails.
 */

const { File, Thumbnail, Content, User } = require('../models');
const { Storage } = require('@google-cloud/storage');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

class ThumbnailReconnector {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.batchSize = options.batchSize || 20;
    this.verbose = options.verbose || false;
    
    this.stats = {
      content: {
        processed: 0,
        reconnected: 0,
        skipped: 0,
        notFound: 0,
        errors: 0
      },
      files: {
        processed: 0,
        reconnected: 0,
        skipped: 0,
        notFound: 0,
        errors: 0
      },
      thumbnails: {
        created: 0,
        foundInGCS: 0
      }
    };
    
    this.errors = [];
    this.initializeGCS();
    
    console.log('🔗 DaySave Thumbnail Reconnection');
    console.log('=================================');
    console.log(`📋 Mode: ${this.dryRun ? 'DRY RUN (no changes)' : 'LIVE RECONNECTION'}`);
    console.log(`📦 Batch size: ${this.batchSize}`);
    console.log('');
  }

  /**
   * Initialize Google Cloud Storage
   */
  initializeGCS() {
    try {
      this.storage = new Storage();
      this.bucketName = process.env.GCS_BUCKET_NAME || 'daysave-v141-2-uploads';
      this.bucket = this.storage.bucket(this.bucketName);
      console.log(`☁️ Google Cloud Storage initialized with bucket: ${this.bucketName}`);
    } catch (error) {
      console.error('❌ Failed to initialize Google Cloud Storage:', error.message);
      throw error;
    }
  }

  /**
   * Get content items without thumbnails
   */
  async getContentWithoutThumbnails() {
    console.log('🌐 Finding content without thumbnails...');
    
    const content = await Content.findAll({
      include: [
        {
          model: User,
          attributes: ['id', 'username']
        },
        {
          model: Thumbnail,
          as: 'thumbnails',
          required: false,
          where: { status: 'ready' },
          attributes: ['id']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const contentWithoutThumbnails = content.filter(contentItem => 
      !contentItem.thumbnails || contentItem.thumbnails.length === 0
    );

    console.log(`📊 Total content: ${content.length}`);
    console.log(`❌ Content without thumbnails: ${contentWithoutThumbnails.length}`);
    
    return contentWithoutThumbnails;
  }

  /**
   * Get files without thumbnails
   */
  async getFilesWithoutThumbnails() {
    console.log('📄 Finding files without thumbnails...');
    
    const files = await File.findAll({
      include: [
        {
          model: User,
          attributes: ['id', 'username']
        },
        {
          model: Thumbnail,
          as: 'thumbnails',
          required: false,
          where: { status: 'ready' },
          attributes: ['id']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const filesWithoutThumbnails = files.filter(file => 
      !file.thumbnails || file.thumbnails.length === 0
    );

    console.log(`📊 Total files: ${files.length}`);
    console.log(`❌ Files without thumbnails: ${filesWithoutThumbnails.length}`);
    
    return filesWithoutThumbnails;
  }

  /**
   * Search for existing thumbnails in GCS
   */
  async searchThumbnailsInGCS(searchPattern) {
    try {
      const [files] = await this.bucket.getFiles({
        prefix: searchPattern,
        maxResults: 100
      });
      
      // Filter for thumbnail files
      const thumbnailFiles = files.filter(file => {
        const name = file.name.toLowerCase();
        return (name.includes('thumb_') || name.includes('_150') || 
                name.includes('_300') || name.includes('_500') || 
                name.includes('_800')) && 
               (name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png'));
      });
      
      return thumbnailFiles;
      
    } catch (error) {
      if (this.verbose) {
        console.warn(`  ⚠️ Error searching GCS for pattern ${searchPattern}: ${error.message}`);
      }
      return [];
    }
  }

  /**
   * Extract size from thumbnail filename
   */
  extractThumbnailSize(filename) {
    const sizeMatches = filename.match(/(?:thumb_|_)(\d+)(?:[._])/);
    if (sizeMatches) {
      return parseInt(sizeMatches[1]);
    }
    
    // Default size if can't extract
    return 300;
  }

  /**
   * Create thumbnail database record
   */
  async createThumbnailRecord(contentId, fileId, gcsFile, userId) {
    try {
      const filename = path.basename(gcsFile.name);
      const size = this.extractThumbnailSize(filename);
      
      // Determine thumbnail type based on size
      let thumbnailType = 'thumbnail';
      if (size <= 150) thumbnailType = 'small';
      else if (size <= 300) thumbnailType = 'medium';
      else if (size <= 500) thumbnailType = 'large';
      else thumbnailType = 'xlarge';
      
      const thumbnailData = {
        id: uuidv4(),
        content_id: contentId,
        file_id: fileId,
        user_id: userId,
        file_name: filename,
        file_path: `gs://${this.bucketName}/${gcsFile.name}`,
        file_size: gcsFile.metadata.size ? parseInt(gcsFile.metadata.size) : null,
        width: size,
        height: size,
        thumbnail_type: thumbnailType,
        status: 'ready',
        metadata: {
          storage: 'gcs',
          bucket: this.bucketName,
          gcsPath: gcsFile.name,
          reconnected: true,
          reconnectedAt: new Date().toISOString()
        }
      };
      
      if (!this.dryRun) {
        const thumbnail = await Thumbnail.create(thumbnailData);
        this.stats.thumbnails.created++;
        return thumbnail;
      } else {
        this.stats.thumbnails.created++;
        return { id: 'dry-run', ...thumbnailData };
      }
      
    } catch (error) {
      throw new Error(`Failed to create thumbnail record: ${error.message}`);
    }
  }

  /**
   * Reconnect thumbnails for a content item
   */
  async reconnectContentThumbnails(contentItem) {
    try {
      this.stats.content.processed++;
      
      const displayTitle = contentItem.metadata?.title || contentItem.url || 'Untitled';
      if (this.verbose) {
        console.log(`  🌐 Processing content: ${displayTitle}`);
      }
      
      // Generate search patterns based on content ID and URL
      const searchPatterns = [
        `content_${contentItem.id}`,
        `thumb_content_${contentItem.id}`,
        contentItem.id
      ];
      
      // If URL contains identifiable parts, add them as search patterns
      if (contentItem.url) {
        const urlParts = contentItem.url.split('/').pop()?.split('?')[0];
        if (urlParts && urlParts.length > 5) {
          searchPatterns.push(urlParts);
        }
      }
      
      let foundThumbnails = [];
      
      // Search for thumbnails with different patterns
      for (const pattern of searchPatterns) {
        const thumbnails = await this.searchThumbnailsInGCS(pattern);
        if (thumbnails.length > 0) {
          foundThumbnails = foundThumbnails.concat(thumbnails);
          if (this.verbose) {
            console.log(`    📸 Found ${thumbnails.length} thumbnails with pattern: ${pattern}`);
          }
          break; // Use first successful pattern
        }
      }
      
      // Remove duplicates
      foundThumbnails = foundThumbnails.filter((thumb, index, self) => 
        index === self.findIndex(t => t.name === thumb.name)
      );
      
      if (foundThumbnails.length > 0) {
        this.stats.thumbnails.foundInGCS += foundThumbnails.length;
        
        if (!this.dryRun) {
          // Create thumbnail records
          for (const gcsFile of foundThumbnails) {
            try {
              await this.createThumbnailRecord(
                contentItem.id, 
                null, // No file_id for content thumbnails
                gcsFile, 
                contentItem.user_id
              );
            } catch (createError) {
              console.warn(`    ⚠️ Failed to create thumbnail record for ${gcsFile.name}: ${createError.message}`);
            }
          }
        }
        
        this.stats.content.reconnected++;
        console.log(`  ✅ Reconnected ${foundThumbnails.length} thumbnails for: ${displayTitle}`);
        
        return { success: true, thumbnailsFound: foundThumbnails.length };
        
      } else {
        this.stats.content.notFound++;
        if (this.verbose) {
          console.log(`  🔍 No thumbnails found in GCS for: ${displayTitle}`);
        }
        return { success: false, reason: 'not_found' };
      }
      
    } catch (error) {
      this.stats.content.errors++;
      const errorMsg = `Failed to reconnect content ${contentItem.id}: ${error.message}`;
      this.errors.push(errorMsg);
      console.error(`❌ ${errorMsg}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Reconnect thumbnails for a file
   */
  async reconnectFileThumbnails(file) {
    try {
      this.stats.files.processed++;
      
      if (this.verbose) {
        console.log(`  📄 Processing file: ${file.filename}`);
      }
      
      // Generate search patterns based on file ID and filename
      const fileBaseName = path.parse(file.filename).name;
      const searchPatterns = [
        `file_${file.id}`,
        `thumb_${file.id}`,
        file.id,
        fileBaseName
      ];
      
      let foundThumbnails = [];
      
      // Search for thumbnails with different patterns
      for (const pattern of searchPatterns) {
        const thumbnails = await this.searchThumbnailsInGCS(pattern);
        if (thumbnails.length > 0) {
          foundThumbnails = foundThumbnails.concat(thumbnails);
          if (this.verbose) {
            console.log(`    📸 Found ${thumbnails.length} thumbnails with pattern: ${pattern}`);
          }
          break; // Use first successful pattern
        }
      }
      
      // Remove duplicates
      foundThumbnails = foundThumbnails.filter((thumb, index, self) => 
        index === self.findIndex(t => t.name === thumb.name)
      );
      
      if (foundThumbnails.length > 0) {
        this.stats.thumbnails.foundInGCS += foundThumbnails.length;
        
        if (!this.dryRun) {
          // Create thumbnail records
          for (const gcsFile of foundThumbnails) {
            try {
              await this.createThumbnailRecord(
                null, // No content_id for file thumbnails
                file.id,
                gcsFile, 
                file.user_id
              );
            } catch (createError) {
              console.warn(`    ⚠️ Failed to create thumbnail record for ${gcsFile.name}: ${createError.message}`);
            }
          }
        }
        
        this.stats.files.reconnected++;
        console.log(`  ✅ Reconnected ${foundThumbnails.length} thumbnails for: ${file.filename}`);
        
        return { success: true, thumbnailsFound: foundThumbnails.length };
        
      } else {
        this.stats.files.notFound++;
        if (this.verbose) {
          console.log(`  🔍 No thumbnails found in GCS for: ${file.filename}`);
        }
        return { success: false, reason: 'not_found' };
      }
      
    } catch (error) {
      this.stats.files.errors++;
      const errorMsg = `Failed to reconnect file ${file.id}: ${error.message}`;
      this.errors.push(errorMsg);
      console.error(`❌ ${errorMsg}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process content items in batches
   */
  async reconnectContentBatch() {
    const contentToProcess = await this.getContentWithoutThumbnails();
    
    if (contentToProcess.length === 0) {
      console.log('✅ No content needs thumbnail reconnection!');
      return;
    }

    console.log(`\n🔗 Starting thumbnail reconnection for ${contentToProcess.length} content items...`);
    
    // Process in batches
    for (let i = 0; i < contentToProcess.length; i += this.batchSize) {
      const batch = contentToProcess.slice(i, i + this.batchSize);
      const batchNum = Math.floor(i / this.batchSize) + 1;
      const totalBatches = Math.ceil(contentToProcess.length / this.batchSize);
      
      console.log(`\n📦 Processing content batch ${batchNum}/${totalBatches} (${batch.length} items)`);
      
      // Process batch sequentially to avoid rate limits
      for (const contentItem of batch) {
        await this.reconnectContentThumbnails(contentItem);
        
        // Small delay between items
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Larger delay between batches
      if (i + this.batchSize < contentToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * Process files in batches
   */
  async reconnectFilesBatch() {
    const filesToProcess = await this.getFilesWithoutThumbnails();
    
    if (filesToProcess.length === 0) {
      console.log('✅ No files need thumbnail reconnection!');
      return;
    }

    console.log(`\n🔗 Starting thumbnail reconnection for ${filesToProcess.length} files...`);
    
    // Process in batches
    for (let i = 0; i < filesToProcess.length; i += this.batchSize) {
      const batch = filesToProcess.slice(i, i + this.batchSize);
      const batchNum = Math.floor(i / this.batchSize) + 1;
      const totalBatches = Math.ceil(filesToProcess.length / this.batchSize);
      
      console.log(`\n📦 Processing file batch ${batchNum}/${totalBatches} (${batch.length} files)`);
      
      // Process batch sequentially to avoid rate limits
      for (const file of batch) {
        await this.reconnectFileThumbnails(file);
        
        // Small delay between items
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Larger delay between batches
      if (i + this.batchSize < filesToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * Run the reconnection
   */
  async reconnect() {
    try {
      console.log('🚀 Starting thumbnail reconnection...\n');
      
      await this.reconnectContentBatch();
      await this.reconnectFilesBatch();
      
      this.generateReport();
      
    } catch (error) {
      console.error('\n❌ Reconnection failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate reconnection report
   */
  generateReport() {
    console.log('\n=================================');
    console.log('📊 RECONNECTION COMPLETE - SUMMARY REPORT');
    console.log('=================================');
    
    console.log('\n🌐 CONTENT:');
    console.log(`📊 Processed: ${this.stats.content.processed}`);
    console.log(`🔗 Reconnected: ${this.stats.content.reconnected}`);
    console.log(`🔍 Not Found: ${this.stats.content.notFound}`);
    console.log(`❌ Errors: ${this.stats.content.errors}`);
    
    console.log('\n📄 FILES:');
    console.log(`📊 Processed: ${this.stats.files.processed}`);
    console.log(`🔗 Reconnected: ${this.stats.files.reconnected}`);
    console.log(`🔍 Not Found: ${this.stats.files.notFound}`);
    console.log(`❌ Errors: ${this.stats.files.errors}`);
    
    console.log('\n🖼️ THUMBNAILS:');
    console.log(`☁️ Found in GCS: ${this.stats.thumbnails.foundInGCS}`);
    console.log(`📝 Database records created: ${this.stats.thumbnails.created}`);
    
    const totalProcessed = this.stats.content.processed + this.stats.files.processed;
    const totalReconnected = this.stats.content.reconnected + this.stats.files.reconnected;
    const totalErrors = this.stats.content.errors + this.stats.files.errors;
    
    console.log('\n📊 TOTALS:');
    console.log(`📊 Total Processed: ${totalProcessed}`);
    console.log(`🔗 Total Reconnected: ${totalReconnected}`);
    console.log(`❌ Total Errors: ${totalErrors}`);
    
    const successRate = totalProcessed > 0 ? (totalReconnected / totalProcessed * 100).toFixed(1) : 0;
    console.log(`📈 Success Rate: ${successRate}%`);
    
    if (totalErrors > 0) {
      console.log('\n❌ SAMPLE ERRORS:');
      this.errors.slice(0, 5).forEach(error => {
        console.log(`   • ${error}`);
      });
      if (this.errors.length > 5) {
        console.log(`   ... and ${this.errors.length - 5} more errors`);
      }
    }
    
    if (!this.dryRun && totalReconnected > 0) {
      console.log('\n💡 NEXT STEPS:');
      console.log('   • Verify thumbnails are displaying correctly in the UI');
      console.log('   • Run the orphaned content check again to confirm fixes');
      console.log('   • Check thumbnail serving performance');
    }
    
    console.log('\n=================================');
  }
}

/**
 * CLI Interface
 */
async function main() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    batchSize: 20
  };
  
  // Parse batch size
  const batchSizeIndex = args.findIndex(arg => arg === '--batch-size');
  if (batchSizeIndex !== -1 && args[batchSizeIndex + 1]) {
    options.batchSize = parseInt(args[batchSizeIndex + 1]);
  }
  
  if (args.includes('--help')) {
    console.log(`
Usage: node scripts/reconnect-existing-thumbnails.js [options]

Options:
  --dry-run           Simulate reconnection without making changes
  --verbose           Show detailed processing information
  --batch-size <n>    Number of items to process in each batch (default: 20)
  --help              Show this help message

Examples:
  node scripts/reconnect-existing-thumbnails.js --dry-run --verbose
  node scripts/reconnect-existing-thumbnails.js --batch-size 10
  node scripts/reconnect-existing-thumbnails.js
`);
    return;
  }
  
  try {
    const reconnector = new ThumbnailReconnector(options);
    await reconnector.reconnect();
    
    console.log('\n✅ Thumbnail reconnection completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Reconnection failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = ThumbnailReconnector;