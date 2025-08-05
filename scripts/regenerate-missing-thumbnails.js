#!/usr/bin/env node

/**
 * DaySave - Regenerate Missing Thumbnails
 * 
 * Regenerates thumbnails for files and content that currently have no thumbnails.
 * Addresses the issue where migration broke thumbnail associations.
 */

const { File, Thumbnail, Content, User } = require('../models');
const fileUploadService = require('../services/fileUpload');
const fs = require('fs');
const path = require('path');

class ThumbnailRegenerator {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.batchSize = options.batchSize || 10;
    this.verbose = options.verbose || false;
    this.includeContent = options.includeContent || false;
    this.includeFiles = options.includeFiles || true;
    
    this.stats = {
      files: {
        processed: 0,
        regenerated: 0,
        skipped: 0,
        errors: 0
      },
      content: {
        processed: 0,
        regenerated: 0,
        skipped: 0,
        errors: 0
      }
    };
    
    this.errors = [];
    
    console.log('🔄 DaySave Missing Thumbnail Regeneration');
    console.log('========================================');
    console.log(`📋 Mode: ${this.dryRun ? 'DRY RUN (no changes)' : 'LIVE REGENERATION'}`);
    console.log(`📦 Batch size: ${this.batchSize}`);
    console.log(`📄 Include Files: ${this.includeFiles}`);
    console.log(`🌐 Include Content: ${this.includeContent}`);
    console.log('');
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
   * Get content without thumbnails
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
   * Check if file exists and is accessible
   */
  async checkFileExists(filePath) {
    try {
      // Handle both local and GCS paths
      if (filePath.startsWith('gs://')) {
        // For GCS files, we'll trust they exist since getFileUrl handles them
        return true;
      } else {
        // For local files, check if they exist
        const fullPath = path.resolve(filePath);
        return fs.existsSync(fullPath);
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Regenerate thumbnails for a single file
   */
  async regenerateFileThumnails(file) {
    try {
      this.stats.files.processed++;
      
      if (this.verbose) {
        console.log(`  📄 Processing file: ${file.filename} (${file.content_type})`);
      }
      
      // Check if file exists
      const fileExists = await this.checkFileExists(file.file_path);
      if (!fileExists) {
        console.warn(`  ⚠️ File not found: ${file.filename} at ${file.file_path}`);
        this.stats.files.skipped++;
        return { success: false, reason: 'file_not_found' };
      }
      
      // Only generate thumbnails for images and videos
      if (!['image', 'video'].includes(file.content_type)) {
        if (this.verbose) {
          console.log(`  ⏭️ Skipping ${file.content_type} file: ${file.filename}`);
        }
        this.stats.files.skipped++;
        return { success: false, reason: 'unsupported_type' };
      }
      
      if (!this.dryRun) {
        // Generate thumbnails using the file upload service
        try {
          const result = await fileUploadService.generateThumbnails(file.id, {
            regenerate: true,
            sizes: ['150', '300', '500', '800']
          });
          
          if (result.success) {
            this.stats.files.regenerated++;
            console.log(`  ✅ Generated ${result.thumbnailsCreated || 0} thumbnails for ${file.filename}`);
          } else {
            this.stats.files.errors++;
            console.error(`  ❌ Failed to generate thumbnails for ${file.filename}: ${result.error}`);
          }
          
          return result;
          
        } catch (thumbnailError) {
          this.stats.files.errors++;
          const errorMsg = `Failed to generate thumbnails for file ${file.id}: ${thumbnailError.message}`;
          this.errors.push(errorMsg);
          console.error(`  ❌ ${errorMsg}`);
          return { success: false, error: thumbnailError.message };
        }
        
      } else {
        console.log(`  DRY RUN: Would regenerate thumbnails for ${file.filename} (${file.content_type})`);
        this.stats.files.regenerated++;
        return { success: true, dryRun: true };
      }
      
    } catch (error) {
      this.stats.files.errors++;
      const errorMsg = `Failed to process file ${file.id}: ${error.message}`;
      this.errors.push(errorMsg);
      console.error(`❌ ${errorMsg}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Regenerate thumbnails for a single content item
   */
  async regenerateContentThumbnails(contentItem) {
    try {
      this.stats.content.processed++;
      
      const displayTitle = contentItem.metadata?.title || contentItem.url || 'Untitled';
      if (this.verbose) {
        console.log(`  🌐 Processing content: ${displayTitle} (${contentItem.content_type})`);
      }
      
      // Only generate thumbnails for certain content types
      if (!['image', 'video', 'unknown'].includes(contentItem.content_type)) {
        if (this.verbose) {
          console.log(`  ⏭️ Skipping ${contentItem.content_type} content: ${displayTitle}`);
        }
        this.stats.content.skipped++;
        return { success: false, reason: 'unsupported_type' };
      }
      
      if (!this.dryRun) {
        // Try to generate thumbnails for the content URL
        try {
          const result = await fileUploadService.generateContentThumbnails(contentItem.id, {
            regenerate: true
          });
          
          if (result.success) {
            this.stats.content.regenerated++;
            console.log(`  ✅ Generated thumbnails for content: ${displayTitle}`);
          } else {
            this.stats.content.errors++;
            console.error(`  ❌ Failed to generate thumbnails for content: ${displayTitle}: ${result.error}`);
          }
          
          return result;
          
        } catch (thumbnailError) {
          this.stats.content.errors++;
          const errorMsg = `Failed to generate thumbnails for content ${contentItem.id}: ${thumbnailError.message}`;
          this.errors.push(errorMsg);
          console.error(`  ❌ ${errorMsg}`);
          return { success: false, error: thumbnailError.message };
        }
        
      } else {
        console.log(`  DRY RUN: Would regenerate thumbnails for content: ${displayTitle} (${contentItem.content_type})`);
        this.stats.content.regenerated++;
        return { success: true, dryRun: true };
      }
      
    } catch (error) {
      this.stats.content.errors++;
      const errorMsg = `Failed to process content ${contentItem.id}: ${error.message}`;
      this.errors.push(errorMsg);
      console.error(`❌ ${errorMsg}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process files in batches
   */
  async regenerateFilesBatch() {
    if (!this.includeFiles) {
      console.log('📄 Skipping file thumbnail regeneration (not enabled)');
      return;
    }
    
    const filesToProcess = await this.getFilesWithoutThumbnails();
    
    if (filesToProcess.length === 0) {
      console.log('✅ No files need thumbnail regeneration!');
      return;
    }

    console.log(`\n🔄 Starting thumbnail regeneration for ${filesToProcess.length} files...`);
    
    // Process in batches
    for (let i = 0; i < filesToProcess.length; i += this.batchSize) {
      const batch = filesToProcess.slice(i, i + this.batchSize);
      const batchNum = Math.floor(i / this.batchSize) + 1;
      const totalBatches = Math.ceil(filesToProcess.length / this.batchSize);
      
      console.log(`\n📦 Processing file batch ${batchNum}/${totalBatches} (${batch.length} files)`);
      
      // Process batch
      const promises = batch.map(file => this.regenerateFileThumnails(file));
      const results = await Promise.allSettled(promises);
      
      // Log batch results
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.filter(r => r.status === 'rejected' || !r.value.success).length;
      
      console.log(`   ✅ Success: ${successful}, ❌ Failed: ${failed}`);
      
      // Small delay between batches
      if (i + this.batchSize < filesToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * Process content in batches
   */
  async regenerateContentBatch() {
    if (!this.includeContent) {
      console.log('🌐 Skipping content thumbnail regeneration (not enabled)');
      return;
    }
    
    const contentToProcess = await this.getContentWithoutThumbnails();
    
    if (contentToProcess.length === 0) {
      console.log('✅ No content needs thumbnail regeneration!');
      return;
    }

    console.log(`\n🔄 Starting thumbnail regeneration for ${contentToProcess.length} content items...`);
    
    // Process in batches
    for (let i = 0; i < contentToProcess.length; i += this.batchSize) {
      const batch = contentToProcess.slice(i, i + this.batchSize);
      const batchNum = Math.floor(i / this.batchSize) + 1;
      const totalBatches = Math.ceil(contentToProcess.length / this.batchSize);
      
      console.log(`\n📦 Processing content batch ${batchNum}/${totalBatches} (${batch.length} items)`);
      
      // Process batch
      const promises = batch.map(content => this.regenerateContentThumbnails(content));
      const results = await Promise.allSettled(promises);
      
      // Log batch results
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.filter(r => r.status === 'rejected' || !r.value.success).length;
      
      console.log(`   ✅ Success: ${successful}, ❌ Failed: ${failed}`);
      
      // Small delay between batches
      if (i + this.batchSize < contentToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * Run the regeneration
   */
  async regenerate() {
    try {
      console.log('🚀 Starting thumbnail regeneration...\n');
      
      await this.regenerateFilesBatch();
      await this.regenerateContentBatch();
      
      this.generateReport();
      
    } catch (error) {
      console.error('\n❌ Regeneration failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate regeneration report
   */
  generateReport() {
    console.log('\n========================================');
    console.log('📊 REGENERATION COMPLETE - SUMMARY REPORT');
    console.log('========================================');
    
    console.log('\n📄 FILES:');
    console.log(`📊 Processed: ${this.stats.files.processed}`);
    console.log(`🔄 Regenerated: ${this.stats.files.regenerated}`);
    console.log(`⏭️ Skipped: ${this.stats.files.skipped}`);
    console.log(`❌ Errors: ${this.stats.files.errors}`);
    
    console.log('\n🌐 CONTENT:');
    console.log(`📊 Processed: ${this.stats.content.processed}`);
    console.log(`🔄 Regenerated: ${this.stats.content.regenerated}`);
    console.log(`⏭️ Skipped: ${this.stats.content.skipped}`);
    console.log(`❌ Errors: ${this.stats.content.errors}`);
    
    const totalProcessed = this.stats.files.processed + this.stats.content.processed;
    const totalRegenerated = this.stats.files.regenerated + this.stats.content.regenerated;
    const totalErrors = this.stats.files.errors + this.stats.content.errors;
    
    console.log('\n📊 TOTALS:');
    console.log(`📊 Total Processed: ${totalProcessed}`);
    console.log(`🔄 Total Regenerated: ${totalRegenerated}`);
    console.log(`❌ Total Errors: ${totalErrors}`);
    
    if (totalErrors > 0) {
      console.log('\n❌ SAMPLE ERRORS:');
      this.errors.slice(0, 5).forEach(error => {
        console.log(`   • ${error}`);
      });
      if (this.errors.length > 5) {
        console.log(`   ... and ${this.errors.length - 5} more errors`);
      }
    }
    
    if (!this.dryRun && totalRegenerated > 0) {
      console.log('\n💡 NEXT STEPS:');
      console.log('   • Check thumbnail generation status in the admin panel');
      console.log('   • Verify that thumbnails are displaying correctly');
      console.log('   • Run the orphaned content check again to confirm fixes');
    }
    
    console.log('\n========================================');
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
    includeContent: args.includes('--include-content'),
    includeFiles: !args.includes('--skip-files'),
    batchSize: 10
  };
  
  // Parse batch size
  const batchSizeIndex = args.findIndex(arg => arg === '--batch-size');
  if (batchSizeIndex !== -1 && args[batchSizeIndex + 1]) {
    options.batchSize = parseInt(args[batchSizeIndex + 1]);
  }
  
  if (args.includes('--help')) {
    console.log(`
Usage: node scripts/regenerate-missing-thumbnails.js [options]

Options:
  --dry-run           Simulate regeneration without making changes
  --verbose           Show detailed processing information
  --include-content   Also regenerate thumbnails for content items (slower)
  --skip-files        Skip file thumbnail regeneration
  --batch-size <n>    Number of items to process in each batch (default: 10)
  --help              Show this help message

Examples:
  node scripts/regenerate-missing-thumbnails.js --dry-run --verbose
  node scripts/regenerate-missing-thumbnails.js --batch-size 5
  node scripts/regenerate-missing-thumbnails.js --include-content
  node scripts/regenerate-missing-thumbnails.js
`);
    return;
  }
  
  try {
    const regenerator = new ThumbnailRegenerator(options);
    await regenerator.regenerate();
    
    console.log('\n✅ Thumbnail regeneration completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Regeneration failed:', error.message);
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

module.exports = ThumbnailRegenerator;