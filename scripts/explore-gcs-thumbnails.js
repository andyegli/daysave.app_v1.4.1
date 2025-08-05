#!/usr/bin/env node

/**
 * DaySave - Explore GCS Thumbnail Storage
 * 
 * Examines what thumbnails are actually stored in Google Cloud Storage
 * to understand naming patterns and identify any existing thumbnails.
 */

const { Storage } = require('@google-cloud/storage');
const path = require('path');

class GCSExplorer {
  constructor() {
    this.initializeGCS();
    this.thumbnailPatterns = [];
    this.stats = {
      totalFiles: 0,
      thumbnailFiles: 0,
      otherFiles: 0,
      sizes: {},
      namingPatterns: {}
    };
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
   * Check if a file is a thumbnail based on name patterns
   */
  isThumbnailFile(fileName) {
    const name = fileName.toLowerCase();
    const thumbnailIndicators = [
      'thumb_',
      '_150',
      '_300', 
      '_500',
      '_800',
      'thumbnail',
      '_thumb',
      'small_',
      'medium_',
      'large_'
    ];
    
    return thumbnailIndicators.some(indicator => name.includes(indicator)) &&
           (name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.webp'));
  }

  /**
   * Extract size from thumbnail filename
   */
  extractSize(fileName) {
    const sizeMatch = fileName.match(/(?:thumb_|_)(\d+)(?:[._])/);
    if (sizeMatch) {
      return parseInt(sizeMatch[1]);
    }
    return null;
  }

  /**
   * Categorize naming pattern
   */
  categorizeNamingPattern(fileName) {
    if (fileName.includes('thumb_')) return 'thumb_prefix';
    if (fileName.match(/_\d+\./)) return 'size_suffix';
    if (fileName.includes('thumbnail')) return 'thumbnail_word';
    if (fileName.includes('_thumb')) return 'thumb_suffix';
    return 'other';
  }

  /**
   * List all files in the bucket
   */
  async exploreGCS(maxResults = 1000) {
    try {
      console.log('🔍 Exploring GCS bucket contents...');
      console.log(`📊 Fetching up to ${maxResults} files...`);
      
      const [files] = await this.bucket.getFiles({
        maxResults: maxResults
      });

      this.stats.totalFiles = files.length;
      console.log(`📁 Found ${files.length} total files in bucket`);

      const thumbnails = [];
      const others = [];

      for (const file of files) {
        if (this.isThumbnailFile(file.name)) {
          thumbnails.push(file);
          this.stats.thumbnailFiles++;
          
          // Track size distribution
          const size = this.extractSize(file.name);
          if (size) {
            this.stats.sizes[size] = (this.stats.sizes[size] || 0) + 1;
          }
          
          // Track naming patterns
          const pattern = this.categorizeNamingPattern(file.name);
          this.stats.namingPatterns[pattern] = (this.stats.namingPatterns[pattern] || 0) + 1;
          
        } else {
          others.push(file);
          this.stats.otherFiles++;
        }
      }

      return { thumbnails, others };
      
    } catch (error) {
      console.error('❌ Error exploring GCS:', error.message);
      throw error;
    }
  }

  /**
   * Show sample thumbnails
   */
  showSampleThumbnails(thumbnails, limit = 20) {
    if (thumbnails.length === 0) {
      console.log('❌ No thumbnail files found in GCS');
      return;
    }

    console.log(`\n📸 SAMPLE THUMBNAILS (showing first ${Math.min(limit, thumbnails.length)} of ${thumbnails.length}):`);
    
    for (let i = 0; i < Math.min(limit, thumbnails.length); i++) {
      const file = thumbnails[i];
      const size = this.extractSize(file.name);
      const pattern = this.categorizeNamingPattern(file.name);
      const fileSize = file.metadata.size ? `${(file.metadata.size / 1024).toFixed(1)}KB` : 'Unknown';
      
      console.log(`   ${i + 1}. ${file.name}`);
      console.log(`      Size: ${size || 'Unknown'}px | Pattern: ${pattern} | File Size: ${fileSize}`);
      if (file.metadata.timeCreated) {
        console.log(`      Created: ${new Date(file.metadata.timeCreated).toLocaleString()}`);
      }
      console.log('');
    }
  }

  /**
   * Show sample non-thumbnail files
   */
  showSampleOtherFiles(others, limit = 10) {
    if (others.length === 0) {
      console.log('✅ All files appear to be thumbnails');
      return;
    }

    console.log(`\n📁 SAMPLE OTHER FILES (showing first ${Math.min(limit, others.length)} of ${others.length}):`);
    
    for (let i = 0; i < Math.min(limit, others.length); i++) {
      const file = others[i];
      const fileSize = file.metadata.size ? `${(file.metadata.size / 1024).toFixed(1)}KB` : 'Unknown';
      const ext = path.extname(file.name).toLowerCase();
      
      console.log(`   ${i + 1}. ${file.name}`);
      console.log(`      Type: ${ext} | File Size: ${fileSize}`);
      if (file.metadata.timeCreated) {
        console.log(`      Created: ${new Date(file.metadata.timeCreated).toLocaleString()}`);
      }
      console.log('');
    }
  }

  /**
   * Search for specific patterns
   */
  async searchSpecificPatterns(patterns) {
    console.log('\n🔍 SEARCHING FOR SPECIFIC PATTERNS:');
    
    for (const pattern of patterns) {
      try {
        console.log(`\n   Searching for: "${pattern}"`);
        const [files] = await this.bucket.getFiles({
          prefix: pattern,
          maxResults: 10
        });
        
        if (files.length > 0) {
          console.log(`   ✅ Found ${files.length} files:`);
          files.forEach((file, index) => {
            console.log(`      ${index + 1}. ${file.name}`);
          });
        } else {
          console.log(`   ❌ No files found with pattern "${pattern}"`);
        }
        
      } catch (error) {
        console.log(`   ⚠️ Error searching for "${pattern}": ${error.message}`);
      }
    }
  }

  /**
   * Generate detailed report
   */
  generateReport(thumbnails, others) {
    console.log('\n=======================================');
    console.log('📊 GCS THUMBNAIL EXPLORATION REPORT');
    console.log('=======================================');
    
    console.log(`\n📁 OVERALL STATISTICS:`);
    console.log(`   📊 Total Files: ${this.stats.totalFiles}`);
    console.log(`   🖼️ Thumbnail Files: ${this.stats.thumbnailFiles}`);
    console.log(`   📄 Other Files: ${this.stats.otherFiles}`);
    
    if (this.stats.thumbnailFiles > 0) {
      console.log(`\n📏 THUMBNAIL SIZE DISTRIBUTION:`);
      Object.keys(this.stats.sizes).sort((a, b) => parseInt(a) - parseInt(b)).forEach(size => {
        console.log(`   ${size}px: ${this.stats.sizes[size]} files`);
      });
      
      console.log(`\n🏷️ NAMING PATTERN DISTRIBUTION:`);
      Object.keys(this.stats.namingPatterns).forEach(pattern => {
        console.log(`   ${pattern}: ${this.stats.namingPatterns[pattern]} files`);
      });
    }
    
    console.log('\n=======================================');
  }

  /**
   * Main exploration function
   */
  async explore() {
    try {
      console.log('🚀 Starting GCS thumbnail exploration...\n');
      
      const { thumbnails, others } = await this.exploreGCS(1000);
      
      this.showSampleThumbnails(thumbnails);
      this.showSampleOtherFiles(others);
      
      // Search for some common patterns that might exist
      const searchPatterns = [
        'thumb_',
        'content_',
        'file_',
        'thumbnail',
        'uploads/'
      ];
      
      await this.searchSpecificPatterns(searchPatterns);
      
      this.generateReport(thumbnails, others);
      
      console.log('\n💡 RECOMMENDATIONS:');
      
      if (this.stats.thumbnailFiles === 0) {
        console.log('   ❌ No thumbnails found in GCS - need to generate thumbnails from scratch');
        console.log('   🔄 Run thumbnail regeneration for content and files');
        console.log('   📝 Check thumbnail generation service configuration');
      } else {
        console.log(`   ✅ Found ${this.stats.thumbnailFiles} thumbnails in GCS`);
        console.log('   🔍 Check if thumbnail database associations need to be rebuilt');
        console.log('   🔗 Consider running reconnection script with updated search patterns');
      }
      
    } catch (error) {
      console.error('\n❌ Exploration failed:', error.message);
      throw error;
    }
  }
}

/**
 * CLI Interface
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log(`
Usage: node scripts/explore-gcs-thumbnails.js [options]

Options:
  --help              Show this help message

Examples:
  node scripts/explore-gcs-thumbnails.js
`);
    return;
  }
  
  try {
    const explorer = new GCSExplorer();
    await explorer.explore();
    
    console.log('\n✅ GCS exploration completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Exploration failed:', error.message);
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

module.exports = GCSExplorer;