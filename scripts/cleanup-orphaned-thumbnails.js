#!/usr/bin/env node

/**
 * DaySave - Cleanup Orphaned Thumbnails
 * 
 * Removes thumbnails that have no associated content or files.
 * This helps clean up the database after migration issues.
 */

const { File, Thumbnail, Content, User } = require('../models');
const fs = require('fs');
const path = require('path');

class ThumbnailCleanup {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.batchSize = options.batchSize || 50;
    
    this.stats = {
      processed: 0,
      deleted: 0,
      errors: 0,
      filesDeleted: 0,
      gcsFilesSkipped: 0
    };
    
    this.errors = [];
    
    console.log('🗑️ DaySave Orphaned Thumbnail Cleanup');
    console.log('=====================================');
    console.log(`📋 Mode: ${this.dryRun ? 'DRY RUN (no changes)' : 'LIVE CLEANUP'}`);
    console.log(`📦 Batch size: ${this.batchSize}`);
    console.log('');
  }

  /**
   * Find orphaned thumbnails
   */
  async findOrphanedThumbnails() {
    console.log('🔍 Finding orphaned thumbnails...');
    
    const thumbnails = await Thumbnail.findAll({
      include: [
        {
          model: File,
          as: 'file',
          required: false,
          attributes: ['id']
        },
        {
          model: Content,
          as: 'content',
          required: false,
          attributes: ['id']
        }
      ]
    });

    const orphaned = thumbnails.filter(thumbnail => 
      !thumbnail.file && !thumbnail.content
    );

    console.log(`📊 Total thumbnails: ${thumbnails.length}`);
    console.log(`🚫 Orphaned thumbnails: ${orphaned.length}`);
    
    return orphaned;
  }

  /**
   * Delete a single orphaned thumbnail
   */
  async deleteOrphanedThumbnail(thumbnail) {
    try {
      this.stats.processed++;
      
      // Check if it's a local file (not GCS)
      const isGCS = thumbnail.metadata && thumbnail.metadata.storage === 'gcs';
      
      if (!this.dryRun) {
        // Delete physical file if it's local
        if (!isGCS && thumbnail.file_path) {
          try {
            const fullPath = path.resolve(thumbnail.file_path);
            if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath);
              this.stats.filesDeleted++;
              console.log(`  🗂️ Deleted local file: ${thumbnail.file_name}`);
            }
          } catch (fileError) {
            console.warn(`  ⚠️ Could not delete local file ${thumbnail.file_path}: ${fileError.message}`);
          }
        } else if (isGCS) {
          this.stats.gcsFilesSkipped++;
          console.log(`  ☁️ Skipped GCS file: ${thumbnail.file_name}`);
        }
        
        // Delete database record
        await thumbnail.destroy();
        this.stats.deleted++;
        
      } else {
        console.log(`  DRY RUN: Would delete thumbnail ${thumbnail.id} - ${thumbnail.file_name}`);
        if (isGCS) {
          console.log(`    (GCS file would be skipped)`);
        }
        this.stats.deleted++;
      }
      
      return { success: true };
      
    } catch (error) {
      this.stats.errors++;
      const errorMsg = `Failed to delete thumbnail ${thumbnail.id}: ${error.message}`;
      this.errors.push(errorMsg);
      console.error(`❌ ${errorMsg}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clean up orphaned thumbnails in batches
   */
  async cleanupOrphaned() {
    const orphanedThumbnails = await this.findOrphanedThumbnails();
    
    if (orphanedThumbnails.length === 0) {
      console.log('✅ No orphaned thumbnails found!');
      return;
    }

    console.log(`\n🗑️ Starting cleanup of ${orphanedThumbnails.length} orphaned thumbnails...`);
    
    // Process in batches
    for (let i = 0; i < orphanedThumbnails.length; i += this.batchSize) {
      const batch = orphanedThumbnails.slice(i, i + this.batchSize);
      const batchNum = Math.floor(i / this.batchSize) + 1;
      const totalBatches = Math.ceil(orphanedThumbnails.length / this.batchSize);
      
      console.log(`\n📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} thumbnails)`);
      
      // Process batch
      const promises = batch.map(thumbnail => this.deleteOrphanedThumbnail(thumbnail));
      const results = await Promise.allSettled(promises);
      
      // Log batch results
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.filter(r => r.status === 'rejected' || !r.value.success).length;
      
      console.log(`   ✅ Success: ${successful}, ❌ Failed: ${failed}`);
      
      // Small delay between batches
      if (i + this.batchSize < orphanedThumbnails.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  /**
   * Run the cleanup
   */
  async cleanup() {
    try {
      console.log('🚀 Starting orphaned thumbnail cleanup...\n');
      
      await this.cleanupOrphaned();
      
      this.generateReport();
      
    } catch (error) {
      console.error('\n❌ Cleanup failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate cleanup report
   */
  generateReport() {
    console.log('\n=====================================');
    console.log('📊 CLEANUP COMPLETE - SUMMARY REPORT');
    console.log('=====================================');
    console.log(`📊 Processed: ${this.stats.processed}`);
    console.log(`🗑️ Deleted: ${this.stats.deleted}`);
    console.log(`❌ Errors: ${this.stats.errors}`);
    console.log(`🗂️ Local files deleted: ${this.stats.filesDeleted}`);
    console.log(`☁️ GCS files skipped: ${this.stats.gcsFilesSkipped}`);
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
    
    if (!this.dryRun && this.stats.deleted > 0) {
      console.log('💡 NEXT STEPS:');
      console.log('   • Run thumbnail regeneration for content without thumbnails');
      console.log('   • Check that thumbnail serving is working correctly');
    }
    
    console.log('=====================================');
  }
}

/**
 * CLI Interface
 */
async function main() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    batchSize: 50
  };
  
  // Parse batch size
  const batchSizeIndex = args.findIndex(arg => arg === '--batch-size');
  if (batchSizeIndex !== -1 && args[batchSizeIndex + 1]) {
    options.batchSize = parseInt(args[batchSizeIndex + 1]);
  }
  
  if (args.includes('--help')) {
    console.log(`
Usage: node scripts/cleanup-orphaned-thumbnails.js [options]

Options:
  --dry-run         Simulate cleanup without making changes
  --batch-size <n>  Number of thumbnails to process in each batch (default: 50)
  --help            Show this help message

Examples:
  node scripts/cleanup-orphaned-thumbnails.js --dry-run
  node scripts/cleanup-orphaned-thumbnails.js --batch-size 25
  node scripts/cleanup-orphaned-thumbnails.js
`);
    return;
  }
  
  try {
    const cleanup = new ThumbnailCleanup(options);
    await cleanup.cleanup();
    
    console.log('\n✅ Cleanup completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
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

module.exports = ThumbnailCleanup;