#!/usr/bin/env node

/**
 * DaySave - Thumbnail Migration to Google Cloud Storage
 * 
 * Focused script to migrate thumbnails from local storage to GCS
 * Based on analysis showing 391 thumbnails need migration
 */

const fs = require('fs');
const path = require('path');
const { Storage } = require('@google-cloud/storage');
const { Thumbnail, User } = require('../models');

class ThumbnailMigrator {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.batchSize = options.batchSize || 20;
    this.verbose = options.verbose || false;
    
    this.stats = {
      processed: 0,
      migrated: 0,
      skipped: 0,
      errors: 0,
      totalSize: 0
    };
    
    this.errors = [];
    this.initializeGCS();
    
    console.log('🖼️ DaySave Thumbnail Migration to Google Cloud Storage');
    console.log('===================================================');
    console.log(`📋 Mode: ${this.dryRun ? 'DRY RUN (no changes)' : 'LIVE MIGRATION'}`);
    console.log(`📦 Batch size: ${this.batchSize}`);
    console.log('');
  }

  /**
   * Initialize Google Cloud Storage
   */
  initializeGCS() {
    try {
      const hasGCSConfig = process.env.GOOGLE_CLOUD_PROJECT_ID && 
                          process.env.GOOGLE_CLOUD_STORAGE_BUCKET && 
                          process.env.GOOGLE_APPLICATION_CREDENTIALS;
      
      if (!hasGCSConfig) {
        throw new Error('Google Cloud Storage not configured');
      }

      this.storage = new Storage({
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
      });
      
      this.bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET;
      this.bucket = this.storage.bucket(this.bucketName);
      
      console.log(`✅ Google Cloud Storage initialized`);
      console.log(`📦 Project: ${process.env.GOOGLE_CLOUD_PROJECT_ID}`);
      console.log(`🪣 Bucket: ${this.bucketName}`);
      console.log('');
      
    } catch (error) {
      console.error('❌ Failed to initialize Google Cloud Storage:', error.message);
      throw error;
    }
  }

  /**
   * Test GCS connectivity
   */
  async testGCSConnection() {
    try {
      const [exists] = await this.bucket.exists();
      if (!exists) {
        throw new Error(`Bucket ${this.bucketName} does not exist`);
      }
      
      // Try to list objects (permission test)
      const [files] = await this.bucket.getFiles({ maxResults: 1 });
      
      console.log('✅ GCS connection test successful');
      return true;
    } catch (error) {
      console.error('❌ GCS connection test failed:', error.message);
      return false;
    }
  }

  /**
   * Generate GCS path for thumbnail
   */
  generateGCSThumbnailPath(userId, thumbnailId, originalFilename) {
    const ext = path.extname(originalFilename);
    const cleanName = path.basename(originalFilename, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
    return `thumbnails/${userId}/${thumbnailId}_${cleanName}${ext}`;
  }

  /**
   * Upload thumbnail to GCS
   */
  async uploadThumbnailToGCS(localPath, gcsPath, metadata = {}) {
    const file = this.bucket.file(gcsPath);
    
    // Upload file
    await this.bucket.upload(localPath, {
      destination: gcsPath,
      metadata: {
        metadata: {
          ...metadata,
          uploadedAt: new Date().toISOString(),
          source: 'daysave_thumbnail_migration'
        }
      }
    });

    return {
      gcsPath,
      publicUrl: `https://storage.googleapis.com/${this.bucketName}/${gcsPath}`
    };
  }

  /**
   * Migrate a single thumbnail
   */
  async migrateThumbnail(thumbnail) {
    try {
      this.stats.processed++;
      
      if (this.verbose) {
        console.log(`🖼️ Processing: ${thumbnail.file_name} (${thumbnail.id})`);
      }

      // Check if already in GCS
      if (thumbnail.file_path.includes('storage.googleapis.com') ||
          (thumbnail.metadata && thumbnail.metadata.storage === 'gcs')) {
        this.stats.skipped++;
        return { success: true, skipped: true, reason: 'already_in_gcs' };
      }

      // Build local file path
      const localPath = path.resolve(thumbnail.file_path);
      
      // Check if local file exists
      if (!fs.existsSync(localPath)) {
        this.stats.errors++;
        this.logError(`THUMBNAIL NOT FOUND: ${thumbnail.id} - ${localPath}`);
        return { success: false, error: 'file_not_found' };
      }

      // Get file stats
      const stats = fs.statSync(localPath);
      this.stats.totalSize += stats.size;

      // Generate GCS path
      const gcsPath = this.generateGCSThumbnailPath(
        thumbnail.user_id, 
        thumbnail.id, 
        thumbnail.file_name
      );

      if (this.dryRun) {
        console.log(`  DRY RUN: Would upload ${localPath} → gs://${this.bucketName}/${gcsPath}`);
        this.stats.migrated++;
        return { success: true, dryRun: true };
      }

      // Upload to GCS
      const uploadResult = await this.uploadThumbnailToGCS(localPath, gcsPath, {
        userId: thumbnail.user_id,
        thumbnailId: thumbnail.id,
        originalFilename: thumbnail.file_name,
        size: stats.size,
        type: thumbnail.thumbnail_type
      });

      // Update database record
      await this.updateThumbnailRecord(thumbnail, gcsPath, uploadResult.publicUrl);
      
      this.stats.migrated++;
      
      if (this.verbose) {
        console.log(`  ✅ Migrated: ${thumbnail.file_name}`);
      }
      
      return { 
        success: true, 
        gcsPath, 
        publicUrl: uploadResult.publicUrl,
        size: stats.size 
      };

    } catch (error) {
      this.stats.errors++;
      this.logError(`THUMBNAIL MIGRATION ERROR: ${thumbnail.id} - ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update thumbnail record with GCS information
   */
  async updateThumbnailRecord(thumbnail, gcsPath, publicUrl) {
    const updatedMetadata = {
      ...thumbnail.metadata,
      storage: 'gcs',
      gcsPath: gcsPath,
      publicUrl: publicUrl,
      migratedAt: new Date().toISOString(),
      originalLocalPath: thumbnail.file_path
    };

    await thumbnail.update({
      file_path: gcsPath,
      metadata: updatedMetadata
    });
  }

  /**
   * Get thumbnails that need migration
   */
  async getThumbnailsToMigrate() {
    const thumbnails = await Thumbnail.findAll({
      where: {
        file_path: {
          [require('sequelize').Op.and]: [
            { [require('sequelize').Op.notLike]: '%storage.googleapis.com%' },
            { [require('sequelize').Op.notLike]: 'gs://%' }
          ]
        }
      },
      order: [['createdAt', 'ASC']]
    });

    // Filter out thumbnails that are already in GCS based on metadata
    return thumbnails.filter(thumbnail => {
      return !(thumbnail.metadata && thumbnail.metadata.storage === 'gcs');
    });
  }

  /**
   * Migrate thumbnails in batches
   */
  async migrateThumbnails() {
    console.log('🖼️ Starting thumbnail migration...');
    
    const thumbnails = await this.getThumbnailsToMigrate();
    console.log(`📊 Found ${thumbnails.length} thumbnails to migrate`);
    
    if (thumbnails.length === 0) {
      console.log('✅ No thumbnails need migration');
      return;
    }

    // Process in batches
    for (let i = 0; i < thumbnails.length; i += this.batchSize) {
      const batch = thumbnails.slice(i, i + this.batchSize);
      const batchNum = Math.floor(i / this.batchSize) + 1;
      const totalBatches = Math.ceil(thumbnails.length / this.batchSize);
      
      console.log(`\n📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} thumbnails)`);
      
      // Process batch
      const promises = batch.map(thumbnail => this.migrateThumbnail(thumbnail));
      const results = await Promise.allSettled(promises);
      
      // Log batch results
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.filter(r => r.status === 'rejected' || !r.value.success).length;
      
      console.log(`   ✅ Success: ${successful}, ❌ Failed: ${failed}`);
      
      // Small delay between batches
      if (i + this.batchSize < thumbnails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * Run the migration
   */
  async migrate() {
    try {
      console.log('🚀 Starting thumbnail migration to Google Cloud Storage...\n');
      
      // Test GCS connection
      const gcsConnected = await this.testGCSConnection();
      if (!gcsConnected && !this.dryRun) {
        throw new Error('Google Cloud Storage connection failed. Cannot proceed with migration.');
      }
      
      // Migrate thumbnails
      await this.migrateThumbnails();
      
      // Generate report
      this.generateReport();
      
    } catch (error) {
      console.error('\n❌ Migration failed:', error.message);
      this.logError(`MIGRATION FAILED: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate migration report
   */
  generateReport() {
    console.log('\n==================================================');
    console.log('📊 THUMBNAIL MIGRATION COMPLETE - SUMMARY REPORT');
    console.log('==================================================');
    console.log(`📊 Processed: ${this.stats.processed}`);
    console.log(`✅ Migrated: ${this.stats.migrated}`);
    console.log(`⏭️ Skipped: ${this.stats.skipped}`);
    console.log(`❌ Errors: ${this.stats.errors}`);
    console.log(`📏 Total size: ${this.formatBytes(this.stats.totalSize)}`);
    console.log('');
    
    if (this.errors.length > 0) {
      console.log('❌ ERRORS:');
      this.errors.slice(0, 5).forEach(error => {
        console.log(`   • ${error}`);
      });
      if (this.errors.length > 5) {
        console.log(`   ... and ${this.errors.length - 5} more errors`);
      }
      console.log('');
    }
    
    if (!this.dryRun && this.stats.migrated > 0) {
      console.log('💡 NEXT STEPS:');
      console.log('   • Test thumbnail serving from GCS');
      console.log('   • Clean up local thumbnail files if desired');
      console.log('   • Monitor GCS costs and usage');
    }
    
    console.log('==================================================');
  }

  /**
   * Format bytes for human reading
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Log errors
   */
  logError(message) {
    this.errors.push(message);
    console.error(`❌ ${message}`);
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
Usage: node scripts/migrate-thumbnails-to-gcs.js [options]

Options:
  --dry-run         Simulate migration without making changes
  --verbose         Show detailed progress information
  --batch-size <n>  Number of thumbnails to process in each batch (default: 20)
  --help            Show this help message

Examples:
  node scripts/migrate-thumbnails-to-gcs.js --dry-run
  node scripts/migrate-thumbnails-to-gcs.js --verbose --batch-size 10
  node scripts/migrate-thumbnails-to-gcs.js
`);
    return;
  }
  
  try {
    const migrator = new ThumbnailMigrator(options);
    await migrator.migrate();
    
    console.log('\n✅ Thumbnail migration completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
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

module.exports = ThumbnailMigrator;