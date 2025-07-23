#!/usr/bin/env node

/**
 * Fix Thumbnails Script
 * 
 * This script fixes thumbnail display issues by:
 * 1. Checking existing thumbnail records and file paths
 * 2. Regenerating missing thumbnails for multimedia content
 * 3. Fixing incorrect file paths in the database
 * 4. Cleaning up orphaned thumbnail records
 * 
 * Usage: node scripts/fix-thumbnails.js [--dry-run] [--content-id=ID]
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import models and services
const { Content, Thumbnail, File } = require('../models');
const ThumbnailGenerator = require('../services/multimedia/ThumbnailGenerator');
const BackwardCompatibilityService = require('../services/BackwardCompatibilityService');

class ThumbnailFixer {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.contentId = options.contentId || null;
    this.fixed = 0;
    this.errors = 0;
    this.thumbnailGenerator = new ThumbnailGenerator({
      enableLogging: true
    });
    this.compatibilityService = new BackwardCompatibilityService();
  }

  /**
   * Main execution function
   */
  async run() {
    console.log('🔧 Starting Thumbnail Fix Process...');
    console.log(`   Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE EXECUTION'}`);
    console.log(`   Target: ${this.contentId ? `Content ID ${this.contentId}` : 'All content items'}`);
    console.log('');

    try {
      // Step 1: Analyze current thumbnail situation
      await this.analyzeThumbnailSituation();

      // Step 2: Fix file path issues
      await this.fixThumbnailPaths();

      // Step 3: Regenerate missing thumbnails
      await this.regenerateMissingThumbnails();

      // Step 4: Clean up orphaned records
      await this.cleanupOrphanedThumbnails();

      // Summary
      console.log('\n📊 SUMMARY');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`✅ Fixed items: ${this.fixed}`);
      console.log(`❌ Errors: ${this.errors}`);
      console.log(`🔧 Mode: ${this.dryRun ? 'DRY RUN (no changes made)' : 'LIVE EXECUTION'}`);

    } catch (error) {
      console.error('❌ Fatal error during thumbnail fix:', error);
      process.exit(1);
    }
  }

  /**
   * Analyze current thumbnail situation
   */
  async analyzeThumbnailSituation() {
    console.log('📊 Analyzing current thumbnail situation...');

    // Get content items and their thumbnails
    const whereClause = this.contentId ? { id: this.contentId } : {};
    
    const contentItems = await Content.findAll({
      where: whereClause,
      include: [{
        model: Thumbnail,
        as: 'thumbnails',
        required: false
      }],
      order: [['createdAt', 'DESC']],
      limit: this.contentId ? 1 : 50
    });

    console.log(`   📄 Found ${contentItems.length} content items`);

    let itemsWithThumbnails = 0;
    let itemsWithoutThumbnails = 0;
    let itemsWithBrokenPaths = 0;

    for (const item of contentItems) {
      const thumbnailCount = item.thumbnails ? item.thumbnails.length : 0;
      
      if (thumbnailCount > 0) {
        itemsWithThumbnails++;
        
        // Check if thumbnail files actually exist
        for (const thumb of item.thumbnails) {
          const fullPath = path.join(process.cwd(), thumb.file_path);
          if (!fs.existsSync(fullPath)) {
            itemsWithBrokenPaths++;
            console.log(`   ⚠️  Missing file: ${thumb.file_path} (for content ${item.id})`);
          }
        }
      } else {
        itemsWithoutThumbnails++;
        console.log(`   📄 No thumbnails: ${item.url || item.id}`);
      }
    }

    console.log(`   ✅ Items with thumbnails: ${itemsWithThumbnails}`);
    console.log(`   ❌ Items without thumbnails: ${itemsWithoutThumbnails}`);
    console.log(`   🔗 Items with broken paths: ${itemsWithBrokenPaths}`);
    console.log('');

    return {
      total: contentItems.length,
      withThumbnails: itemsWithThumbnails,
      withoutThumbnails: itemsWithoutThumbnails,
      brokenPaths: itemsWithBrokenPaths
    };
  }

  /**
   * Fix thumbnail file paths in database
   */
  async fixThumbnailPaths() {
    console.log('🔧 Fixing thumbnail file paths...');

    const thumbnails = await Thumbnail.findAll({
      where: this.contentId ? { content_id: this.contentId } : {}
    });

    for (const thumb of thumbnails) {
      let needsUpdate = false;
      let newPath = thumb.file_path;

      // Fix common path issues
      if (thumb.file_path.startsWith('/files/serve/')) {
        // Remove problematic /files/serve/ prefix
        newPath = thumb.file_path.replace('/files/serve/', 'uploads/thumbnails/');
        needsUpdate = true;
      } else if (!thumb.file_path.startsWith('uploads/') && !thumb.file_path.startsWith('/uploads/')) {
        // Ensure thumbnails are in uploads/thumbnails/ directory
        const filename = path.basename(thumb.file_path);
        newPath = `uploads/thumbnails/${filename}`;
        needsUpdate = true;
      } else if (thumb.file_path.startsWith('/uploads/')) {
        // Remove leading slash for consistency
        newPath = thumb.file_path.substring(1);
        needsUpdate = true;
      }

      if (needsUpdate) {
        console.log(`   🔄 Updating path: ${thumb.file_path} → ${newPath}`);
        
        if (!this.dryRun) {
          await thumb.update({ file_path: newPath });
        }
        this.fixed++;
      }
    }

    console.log(`   ✅ Fixed ${this.fixed} thumbnail paths`);
    console.log('');
  }

  /**
   * Regenerate missing thumbnails for multimedia content
   */
  async regenerateMissingThumbnails() {
    console.log('🖼️  Regenerating missing thumbnails...');

    const whereClause = this.contentId ? { id: this.contentId } : {};
    
    const contentWithoutThumbnails = await Content.findAll({
      where: whereClause,
      include: [{
        model: Thumbnail,
        as: 'thumbnails',
        required: false
      }]
    });

    for (const content of contentWithoutThumbnails) {
      // Skip if already has thumbnails
      if (content.thumbnails && content.thumbnails.length > 0) {
        continue;
      }

      // Check if this is multimedia content that should have thumbnails
      if (!this.isMultimediaContent(content.url)) {
        continue;
      }

      console.log(`   🎬 Regenerating thumbnails for: ${content.url}`);

      try {
        if (!this.dryRun) {
          // Use the backward compatibility service to analyze and generate thumbnails
          await this.compatibilityService.analyzeContent(content.url, {
            transcription: false, // Don't re-transcribe
            sentiment: false,
            thumbnails: true, // Only generate thumbnails
            user_id: content.user_id,
            content_id: content.id
          });
        }

        this.fixed++;
        console.log(`   ✅ Generated thumbnails for content ${content.id}`);

      } catch (error) {
        console.error(`   ❌ Failed to generate thumbnails for ${content.id}:`, error.message);
        this.errors++;
      }
    }

    console.log('');
  }

  /**
   * Clean up orphaned thumbnail records
   */
  async cleanupOrphanedThumbnails() {
    console.log('🧹 Cleaning up orphaned thumbnails...');

    const orphanedThumbnails = await Thumbnail.findAll({
      where: {
        status: 'failed'
      }
    });

    for (const thumb of orphanedThumbnails) {
      console.log(`   🗑️  Removing failed thumbnail: ${thumb.id}`);
      
      if (!this.dryRun) {
        // Remove the file if it exists
        const fullPath = path.join(process.cwd(), thumb.file_path);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
        
        // Remove the database record
        await thumb.destroy();
      }
      
      this.fixed++;
    }

    console.log(`   ✅ Cleaned up ${orphanedThumbnails.length} orphaned thumbnails`);
    console.log('');
  }

  /**
   * Check if content is multimedia that should have thumbnails
   */
  isMultimediaContent(url) {
    if (!url) return false;
    
    return url.includes('youtube.com') ||
           url.includes('facebook.com') ||
           url.includes('instagram.com') ||
           url.includes('tiktok.com') ||
           url.match(/\.(jpg|jpeg|png|gif|mp4|mov|avi)$/i);
  }

  /**
   * Create missing directories
   */
  async ensureDirectories() {
    const dirs = [
      'uploads',
      'uploads/thumbnails',
      'uploads/temp'
    ];

    for (const dir of dirs) {
      const fullPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(fullPath)) {
        console.log(`   📁 Creating directory: ${dir}`);
        fs.mkdirSync(fullPath, { recursive: true });
      }
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const contentIdArg = args.find(arg => arg.startsWith('--content-id='));
  const contentId = contentIdArg ? contentIdArg.split('=')[1] : null;

  const fixer = new ThumbnailFixer({ dryRun, contentId });
  await fixer.run();
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = ThumbnailFixer; 