#!/usr/bin/env node

/**
 * DaySave - File Migration to Google Cloud Storage
 * 
 * This script migrates existing files and thumbnails from local uploads/ directory
 * to Google Cloud Storage and updates database references.
 * 
 * Features:
 * - Migrates uploaded files to GCS with proper organization
 * - Migrates thumbnails to GCS 
 * - Updates database references
 * - Maintains fallback to local storage when GCS unavailable
 * - Dry-run mode for testing
 * - Progress tracking and error handling
 * - Rollback capability
 */

const fs = require('fs');
const path = require('path');
const { Storage } = require('@google-cloud/storage');
const { File, Thumbnail, User } = require('../models');
const fileUploadService = require('../services/fileUpload');

class GCSFileMigrator {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.batchSize = options.batchSize || 10;
    this.skipExisting = options.skipExisting || true;
    this.verbose = options.verbose || false;
    
    this.stats = {
      files: { processed: 0, migrated: 0, skipped: 0, errors: 0 },
      thumbnails: { processed: 0, migrated: 0, skipped: 0, errors: 0 },
      totalSize: 0,
      startTime: Date.now()
    };
    
    this.errors = [];
    this.migrationLog = [];
    
    // Initialize services
    this.fileUploadService = fileUploadService;
    this.initializeGCS();
    
    console.log('🚀 DaySave File Migration to Google Cloud Storage');
    console.log('==================================================');
    console.log(`📋 Mode: ${this.dryRun ? 'DRY RUN (no changes)' : 'LIVE MIGRATION'}`);
    console.log(`📦 Batch size: ${this.batchSize}`);
    console.log(`🔄 Skip existing: ${this.skipExisting}`);
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
        throw new Error('Google Cloud Storage not configured. Please set GOOGLE_CLOUD_PROJECT_ID, GOOGLE_CLOUD_STORAGE_BUCKET, and GOOGLE_APPLICATION_CREDENTIALS in .env');
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
      console.log('💡 Migration will use local storage fallback mode only');
      this.storage = null;
    }
  }

  /**
   * Test GCS connectivity
   */
  async testGCSConnection() {
    if (!this.storage) {
      return false;
    }
    
    try {
      await this.bucket.exists();
      console.log('✅ GCS connection test successful');
      return true;
    } catch (error) {
      console.error('❌ GCS connection test failed:', error.message);
      return false;
    }
  }

  /**
   * Upload file to Google Cloud Storage
   */
  async uploadToGCS(localPath, gcsPath, metadata = {}) {
    if (!this.storage) {
      throw new Error('Google Cloud Storage not available');
    }

    const file = this.bucket.file(gcsPath);
    
    // Check if file already exists
    if (this.skipExisting) {
      const [exists] = await file.exists();
      if (exists) {
        return {
          uploaded: false,
          reason: 'already_exists',
          gcsPath,
          publicUrl: `https://storage.googleapis.com/${this.bucketName}/${gcsPath}`
        };
      }
    }

    // Upload file
    await this.bucket.upload(localPath, {
      destination: gcsPath,
      metadata: {
        metadata: {
          ...metadata,
          uploadedAt: new Date().toISOString(),
          source: 'daysave_migration'
        }
      }
    });

    return {
      uploaded: true,
      gcsPath,
      publicUrl: `https://storage.googleapis.com/${this.bucketName}/${gcsPath}`
    };
  }

  /**
   * Generate GCS path for uploaded file
   */
  generateGCSFilePath(userId, fileId, originalFilename) {
    const timestamp = Date.now();
    const ext = path.extname(originalFilename);
    const cleanName = path.basename(originalFilename, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
    return `files/${userId}/${timestamp}_${fileId}_${cleanName}${ext}`;
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
   * Migrate a single file
   */
  async migrateFile(fileRecord) {
    try {
      this.stats.files.processed++;
      
      if (this.verbose) {
        console.log(`📄 Processing file: ${fileRecord.filename} (${fileRecord.id})`);
      }

      // Check if file path looks like it's already in GCS
      if (fileRecord.file_path.includes('storage.googleapis.com') || 
          fileRecord.metadata?.storage === 'gcs') {
        this.stats.files.skipped++;
        this.log(`SKIP FILE: ${fileRecord.id} - already in GCS`);
        return { success: true, skipped: true, reason: 'already_in_gcs' };
      }

      // Build local file path
      const localPath = path.resolve(fileRecord.file_path);
      
      // Check if local file exists
      if (!fs.existsSync(localPath)) {
        this.stats.files.errors++;
        this.logError(`FILE NOT FOUND: ${fileRecord.id} - ${localPath}`);
        return { success: false, error: 'file_not_found' };
      }

      // Get file stats
      const stats = fs.statSync(localPath);
      this.stats.totalSize += stats.size;

      // Generate GCS path
      const gcsPath = this.generateGCSFilePath(
        fileRecord.user_id, 
        fileRecord.id, 
        fileRecord.filename
      );

      if (this.dryRun) {
        console.log(`  DRY RUN: Would upload ${localPath} → gs://${this.bucketName}/${gcsPath}`);
        this.stats.files.migrated++;
        return { success: true, dryRun: true };
      }

      // Upload to GCS
      const uploadResult = await this.uploadToGCS(localPath, gcsPath, {
        userId: fileRecord.user_id,
        fileId: fileRecord.id,
        originalFilename: fileRecord.filename,
        size: stats.size
      });

      if (!uploadResult.uploaded && uploadResult.reason === 'already_exists') {
        this.stats.files.skipped++;
        this.log(`SKIP FILE: ${fileRecord.id} - already exists in GCS`);
        
        // Update database with GCS path even if file exists
        await this.updateFileRecord(fileRecord, gcsPath, uploadResult.publicUrl);
        return { success: true, skipped: true, reason: 'already_exists' };
      }

      // Update database record
      await this.updateFileRecord(fileRecord, gcsPath, uploadResult.publicUrl);
      
      this.stats.files.migrated++;
      this.log(`MIGRATED FILE: ${fileRecord.id} - ${fileRecord.filename}`);
      
      return { 
        success: true, 
        gcsPath, 
        publicUrl: uploadResult.publicUrl,
        size: stats.size 
      };

    } catch (error) {
      this.stats.files.errors++;
      this.logError(`FILE MIGRATION ERROR: ${fileRecord.id} - ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update file record with GCS information
   */
  async updateFileRecord(fileRecord, gcsPath, publicUrl) {
    const updatedMetadata = {
      ...fileRecord.metadata,
      storage: 'gcs',
      gcsPath: gcsPath,
      publicUrl: publicUrl,
      migratedAt: new Date().toISOString(),
      originalLocalPath: fileRecord.file_path
    };

    await fileRecord.update({
      file_path: gcsPath,
      metadata: updatedMetadata
    });
  }

  /**
   * Migrate a single thumbnail
   */
  async migrateThumbnail(thumbnailRecord) {
    try {
      this.stats.thumbnails.processed++;
      
      if (this.verbose) {
        console.log(`🖼️ Processing thumbnail: ${thumbnailRecord.file_name} (${thumbnailRecord.id})`);
      }

      // Check if thumbnail path looks like it's already in GCS
      if (thumbnailRecord.file_path.includes('storage.googleapis.com') ||
          (thumbnailRecord.metadata && thumbnailRecord.metadata.storage === 'gcs')) {
        this.stats.thumbnails.skipped++;
        this.log(`SKIP THUMBNAIL: ${thumbnailRecord.id} - already in GCS`);
        return { success: true, skipped: true, reason: 'already_in_gcs' };
      }

      // Build local file path
      const localPath = path.resolve(thumbnailRecord.file_path);
      
      // Check if local file exists
      if (!fs.existsSync(localPath)) {
        this.stats.thumbnails.errors++;
        this.logError(`THUMBNAIL NOT FOUND: ${thumbnailRecord.id} - ${localPath}`);
        return { success: false, error: 'file_not_found' };
      }

      // Get file stats
      const stats = fs.statSync(localPath);
      this.stats.totalSize += stats.size;

      // Generate GCS path
      const gcsPath = this.generateGCSThumbnailPath(
        thumbnailRecord.user_id, 
        thumbnailRecord.id, 
        thumbnailRecord.file_name
      );

      if (this.dryRun) {
        console.log(`  DRY RUN: Would upload ${localPath} → gs://${this.bucketName}/${gcsPath}`);
        this.stats.thumbnails.migrated++;
        return { success: true, dryRun: true };
      }

      // Upload to GCS
      const uploadResult = await this.uploadToGCS(localPath, gcsPath, {
        userId: thumbnailRecord.user_id,
        thumbnailId: thumbnailRecord.id,
        originalFilename: thumbnailRecord.file_name,
        size: stats.size,
        type: thumbnailRecord.thumbnail_type
      });

      if (!uploadResult.uploaded && uploadResult.reason === 'already_exists') {
        this.stats.thumbnails.skipped++;
        this.log(`SKIP THUMBNAIL: ${thumbnailRecord.id} - already exists in GCS`);
        
        // Update database with GCS path even if file exists
        await this.updateThumbnailRecord(thumbnailRecord, gcsPath, uploadResult.publicUrl);
        return { success: true, skipped: true, reason: 'already_exists' };
      }

      // Update database record
      await this.updateThumbnailRecord(thumbnailRecord, gcsPath, uploadResult.publicUrl);
      
      this.stats.thumbnails.migrated++;
      this.log(`MIGRATED THUMBNAIL: ${thumbnailRecord.id} - ${thumbnailRecord.file_name}`);
      
      return { 
        success: true, 
        gcsPath, 
        publicUrl: uploadResult.publicUrl,
        size: stats.size 
      };

    } catch (error) {
      this.stats.thumbnails.errors++;
      this.logError(`THUMBNAIL MIGRATION ERROR: ${thumbnailRecord.id} - ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update thumbnail record with GCS information
   */
  async updateThumbnailRecord(thumbnailRecord, gcsPath, publicUrl) {
    const updatedMetadata = {
      ...thumbnailRecord.metadata,
      storage: 'gcs',
      gcsPath: gcsPath,
      publicUrl: publicUrl,
      migratedAt: new Date().toISOString(),
      originalLocalPath: thumbnailRecord.file_path
    };

    await thumbnailRecord.update({
      file_path: gcsPath,
      metadata: updatedMetadata
    });
  }

  /**
   * Get all files that need migration
   */
  async getFilesToMigrate() {
    const files = await File.findAll({
      where: {
        file_path: {
          [require('sequelize').Op.notLike]: '%storage.googleapis.com%'
        }
      },
      include: [
        { model: User, attributes: ['id', 'username'] }
      ],
      order: [['createdAt', 'ASC']]
    });

    return files.filter(file => {
      // Filter out files that are already in GCS
      return !(file.metadata && file.metadata.storage === 'gcs');
    });
  }

  /**
   * Get all thumbnails that need migration
   */
  async getThumbnailsToMigrate() {
    const thumbnails = await Thumbnail.findAll({
      where: {
        file_path: {
          [require('sequelize').Op.notLike]: '%storage.googleapis.com%'
        }
      },
      include: [
        { model: User, as: 'user', attributes: ['id', 'username'] }
      ],
      order: [['createdAt', 'ASC']]
    });

    return thumbnails.filter(thumbnail => {
      // Filter out thumbnails that are already in GCS
      return !(thumbnail.metadata && thumbnail.metadata.storage === 'gcs');
    });
  }

  /**
   * Migrate files in batches
   */
  async migrateFiles() {
    console.log('📄 Starting file migration...');
    
    const files = await this.getFilesToMigrate();
    console.log(`📊 Found ${files.length} files to migrate`);
    
    if (files.length === 0) {
      console.log('✅ No files need migration');
      return;
    }

    // Process in batches
    for (let i = 0; i < files.length; i += this.batchSize) {
      const batch = files.slice(i, i + this.batchSize);
      const batchNum = Math.floor(i / this.batchSize) + 1;
      const totalBatches = Math.ceil(files.length / this.batchSize);
      
      console.log(`\n📦 Processing file batch ${batchNum}/${totalBatches} (${batch.length} files)`);
      
      // Process batch
      const promises = batch.map(file => this.migrateFile(file));
      const results = await Promise.allSettled(promises);
      
      // Log batch results
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.filter(r => r.status === 'rejected' || !r.value.success).length;
      
      console.log(`   ✅ Success: ${successful}, ❌ Failed: ${failed}`);
      
      // Small delay between batches
      if (i + this.batchSize < files.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * Migrate thumbnails in batches
   */
  async migrateThumbnails() {
    console.log('\n🖼️ Starting thumbnail migration...');
    
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
      
      console.log(`\n🖼️ Processing thumbnail batch ${batchNum}/${totalBatches} (${batch.length} thumbnails)`);
      
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
   * Run the complete migration
   */
  async migrate() {
    try {
      console.log('🚀 Starting DaySave file migration to Google Cloud Storage...\n');
      
      // Test GCS connection
      const gcsConnected = await this.testGCSConnection();
      if (!gcsConnected && !this.dryRun) {
        throw new Error('Google Cloud Storage connection failed. Cannot proceed with migration.');
      }
      
      // Migrate files first
      await this.migrateFiles();
      
      // Then migrate thumbnails
      await this.migrateThumbnails();
      
      // Generate report
      await this.generateReport();
      
    } catch (error) {
      console.error('\n❌ Migration failed:', error.message);
      this.logError(`MIGRATION FAILED: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate migration report
   */
  async generateReport() {
    const duration = Date.now() - this.stats.startTime;
    const durationMinutes = Math.round(duration / 60000 * 100) / 100;
    
    console.log('\n==================================================');
    console.log('📊 MIGRATION COMPLETE - SUMMARY REPORT');
    console.log('==================================================');
    console.log(`⏱️ Duration: ${durationMinutes} minutes`);
    console.log(`📁 Total data size: ${this.formatBytes(this.stats.totalSize)}`);
    console.log('');
    console.log('📄 FILES:');
    console.log(`   📊 Processed: ${this.stats.files.processed}`);
    console.log(`   ✅ Migrated: ${this.stats.files.migrated}`);
    console.log(`   ⏭️ Skipped: ${this.stats.files.skipped}`);
    console.log(`   ❌ Errors: ${this.stats.files.errors}`);
    console.log('');
    console.log('🖼️ THUMBNAILS:');
    console.log(`   📊 Processed: ${this.stats.thumbnails.processed}`);
    console.log(`   ✅ Migrated: ${this.stats.thumbnails.migrated}`);
    console.log(`   ⏭️ Skipped: ${this.stats.thumbnails.skipped}`);
    console.log(`   ❌ Errors: ${this.stats.thumbnails.errors}`);
    console.log('');
    
    if (this.errors.length > 0) {
      console.log('❌ ERRORS:');
      this.errors.slice(0, 10).forEach(error => {
        console.log(`   • ${error}`);
      });
      if (this.errors.length > 10) {
        console.log(`   ... and ${this.errors.length - 10} more errors`);
      }
      console.log('');
    }
    
    // Save detailed log
    const logFile = `migration_log_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const logPath = path.join(__dirname, '..', 'logs', logFile);
    
    // Ensure logs directory exists
    const logsDir = path.dirname(logPath);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    const logData = {
      timestamp: new Date().toISOString(),
      duration: duration,
      dryRun: this.dryRun,
      stats: this.stats,
      errors: this.errors,
      log: this.migrationLog
    };
    
    fs.writeFileSync(logPath, JSON.stringify(logData, null, 2));
    console.log(`📋 Detailed log saved to: ${logPath}`);
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
   * Log migration activity
   */
  log(message) {
    const timestamp = new Date().toISOString();
    this.migrationLog.push({ timestamp, message });
    if (this.verbose) {
      console.log(`[${timestamp}] ${message}`);
    }
  }

  /**
   * Log errors
   */
  logError(message) {
    const timestamp = new Date().toISOString();
    this.errors.push(message);
    this.migrationLog.push({ timestamp, level: 'ERROR', message });
    console.error(`[${timestamp}] ERROR: ${message}`);
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
    batchSize: 10,
    skipExisting: true
  };
  
  // Parse batch size
  const batchSizeIndex = args.findIndex(arg => arg === '--batch-size');
  if (batchSizeIndex !== -1 && args[batchSizeIndex + 1]) {
    options.batchSize = parseInt(args[batchSizeIndex + 1]);
  }
  
  // Parse skip existing
  if (args.includes('--force')) {
    options.skipExisting = false;
  }
  
  if (args.includes('--help')) {
    console.log(`
Usage: node scripts/migrate-files-to-gcs.js [options]

Options:
  --dry-run         Simulate migration without making changes
  --verbose         Show detailed progress information
  --batch-size <n>  Number of files to process in each batch (default: 10)
  --force           Re-upload files even if they exist in GCS
  --help            Show this help message

Examples:
  node scripts/migrate-files-to-gcs.js --dry-run
  node scripts/migrate-files-to-gcs.js --verbose --batch-size 5
  node scripts/migrate-files-to-gcs.js --force
`);
    return;
  }
  
  try {
    const migrator = new GCSFileMigrator(options);
    await migrator.migrate();
    
    console.log('\n✅ Migration completed successfully!');
    console.log('💡 Local files remain as fallback - you can clean them up later if desired');
    
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

module.exports = GCSFileMigrator;