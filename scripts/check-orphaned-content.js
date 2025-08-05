#!/usr/bin/env node

/**
 * DaySave - Check for Orphaned Content Without Thumbnails
 * 
 * Analyzes content and files that no longer have associated thumbnails
 * after the migration process. Helps identify content that may need
 * thumbnail regeneration.
 */

const { File, Thumbnail, Content, User } = require('../models');
const { Op } = require('sequelize');

class OrphanedContentChecker {
  constructor() {
    this.stats = {
      files: {
        total: 0,
        withThumbnails: 0,
        withoutThumbnails: 0,
        images: 0,
        videos: 0,
        other: 0
      },
      content: {
        total: 0,
        withThumbnails: 0,
        withoutThumbnails: 0
      },
      thumbnails: {
        total: 0,
        orphaned: 0,
        gcs: 0,
        local: 0
      }
    };
    
    this.orphanedFiles = [];
    this.orphanedContent = [];
    this.orphanedThumbnails = [];
  }

  /**
   * Check for files without thumbnails
   */
  async checkOrphanedFiles() {
    console.log('📄 Checking files without thumbnails...');
    
    // Get all files with their thumbnail counts
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
          attributes: ['id', 'thumbnail_type', 'status', 'file_path', 'metadata']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    this.stats.files.total = files.length;

    for (const file of files) {
      const activeThumbnails = file.thumbnails ? file.thumbnails.filter(t => t.status === 'ready') : [];
      
      // Count by content type
      if (file.content_type === 'image') this.stats.files.images++;
      else if (file.content_type === 'video') this.stats.files.videos++;
      else this.stats.files.other++;

      if (activeThumbnails.length === 0) {
        this.stats.files.withoutThumbnails++;
        this.orphanedFiles.push({
          id: file.id,
          filename: file.filename,
          content_type: file.content_type,
          user_id: file.user_id,
          username: file.User?.username || 'Unknown',
          file_path: file.file_path,
          createdAt: file.createdAt,
          metadata: file.metadata,
          totalThumbnails: file.thumbnails ? file.thumbnails.length : 0,
          reason: file.thumbnails && file.thumbnails.length > 0 ? 'thumbnails_failed' : 'no_thumbnails'
        });
      } else {
        this.stats.files.withThumbnails++;
      }
    }
  }

  /**
   * Check for content without thumbnails
   */
  async checkOrphanedContent() {
    console.log('🌐 Checking content without thumbnails...');
    
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
          attributes: ['id', 'thumbnail_type', 'status', 'file_path']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    this.stats.content.total = content.length;

    for (const contentItem of content) {
      const activeThumbnails = contentItem.thumbnails ? contentItem.thumbnails.filter(t => t.status === 'ready') : [];
      
      if (activeThumbnails.length === 0) {
        this.stats.content.withoutThumbnails++;
        this.orphanedContent.push({
          id: contentItem.id,
          url: contentItem.url,
          content_type: contentItem.content_type,
          user_id: contentItem.user_id,
          username: contentItem.User?.username || 'Unknown',
          createdAt: contentItem.createdAt,
          totalThumbnails: contentItem.thumbnails ? contentItem.thumbnails.length : 0,
          metadata: contentItem.metadata
        });
      } else {
        this.stats.content.withThumbnails++;
      }
    }
  }

  /**
   * Check for orphaned thumbnails (thumbnails without content/files)
   */
  async checkOrphanedThumbnails() {
    console.log('🖼️ Checking orphaned thumbnails...');
    
    const thumbnails = await Thumbnail.findAll({
      include: [
        {
          model: File,
          as: 'file',
          required: false,
          attributes: ['id', 'filename']
        },
        {
          model: Content,
          as: 'content',
          required: false,
          attributes: ['id', 'url', 'generated_title', 'metadata']
        }
      ]
    });

    this.stats.thumbnails.total = thumbnails.length;

    for (const thumbnail of thumbnails) {
      // Count storage types
      if (thumbnail.metadata && thumbnail.metadata.storage === 'gcs') {
        this.stats.thumbnails.gcs++;
      } else {
        this.stats.thumbnails.local++;
      }

      // Check if thumbnail has no associated content or file
      if (!thumbnail.file && !thumbnail.content) {
        this.stats.thumbnails.orphaned++;
        this.orphanedThumbnails.push({
          id: thumbnail.id,
          file_name: thumbnail.file_name,
          file_path: thumbnail.file_path,
          thumbnail_type: thumbnail.thumbnail_type,
          status: thumbnail.status,
          user_id: thumbnail.user_id,
          createdAt: thumbnail.createdAt,
          storage: thumbnail.metadata?.storage || 'local'
        });
      }
    }
  }

  /**
   * Generate recommendations for fixing orphaned content
   */
  generateRecommendations() {
    const recommendations = [];

    if (this.stats.files.withoutThumbnails > 0) {
      recommendations.push(`🔄 Regenerate thumbnails for ${this.stats.files.withoutThumbnails} files without thumbnails`);
      
      const imageFiles = this.orphanedFiles.filter(f => f.content_type === 'image').length;
      const videoFiles = this.orphanedFiles.filter(f => f.content_type === 'video').length;
      
      if (imageFiles > 0) {
        recommendations.push(`📸 ${imageFiles} image files need thumbnail generation`);
      }
      if (videoFiles > 0) {
        recommendations.push(`🎥 ${videoFiles} video files need thumbnail generation`);
      }
    }

    if (this.stats.content.withoutThumbnails > 0) {
      recommendations.push(`🌐 ${this.stats.content.withoutThumbnails} content items need thumbnail generation`);
    }

    if (this.stats.thumbnails.orphaned > 0) {
      recommendations.push(`🗑️ Clean up ${this.stats.thumbnails.orphaned} orphaned thumbnails with no associated content`);
    }

    const failedThumbnails = this.orphanedFiles.filter(f => f.reason === 'thumbnails_failed').length;
    if (failedThumbnails > 0) {
      recommendations.push(`⚠️ ${failedThumbnails} files have failed thumbnail generation that needs attention`);
    }

    return recommendations;
  }

  /**
   * Run complete check
   */
  async checkAll() {
    console.log('🔍 DaySave Orphaned Content Analysis');
    console.log('===================================');
    
    await this.checkOrphanedFiles();
    await this.checkOrphanedContent();
    await this.checkOrphanedThumbnails();
    
    this.generateReport();
  }

  /**
   * Generate detailed report
   */
  generateReport() {
    console.log('\n===================================');
    console.log('📊 ORPHANED CONTENT ANALYSIS REPORT');
    console.log('===================================');
    
    console.log('\n📄 FILES:');
    console.log(`   📊 Total: ${this.stats.files.total}`);
    console.log(`   ✅ With thumbnails: ${this.stats.files.withThumbnails}`);
    console.log(`   ❌ Without thumbnails: ${this.stats.files.withoutThumbnails}`);
    console.log(`   📸 Images: ${this.stats.files.images}`);
    console.log(`   🎥 Videos: ${this.stats.files.videos}`);
    console.log(`   📋 Other: ${this.stats.files.other}`);
    
    console.log('\n🌐 CONTENT:');
    console.log(`   📊 Total: ${this.stats.content.total}`);
    console.log(`   ✅ With thumbnails: ${this.stats.content.withThumbnails}`);
    console.log(`   ❌ Without thumbnails: ${this.stats.content.withoutThumbnails}`);
    
    console.log('\n🖼️ THUMBNAILS:');
    console.log(`   📊 Total: ${this.stats.thumbnails.total}`);
    console.log(`   ☁️ In GCS: ${this.stats.thumbnails.gcs}`);
    console.log(`   📁 Local: ${this.stats.thumbnails.local}`);
    console.log(`   🚫 Orphaned: ${this.stats.thumbnails.orphaned}`);

    // Show sample orphaned files
    if (this.orphanedFiles.length > 0) {
      console.log('\n❌ SAMPLE FILES WITHOUT THUMBNAILS:');
      const samples = this.orphanedFiles.slice(0, 10);
      samples.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file.filename} (${file.content_type})`);
        console.log(`      User: ${file.username}`);
        console.log(`      Reason: ${file.reason}`);
        console.log(`      Created: ${file.createdAt}`);
        if (file.reason === 'thumbnails_failed') {
          console.log(`      Failed thumbnails: ${file.totalThumbnails}`);
        }
        console.log('');
      });
      
      if (this.orphanedFiles.length > 10) {
        console.log(`   ... and ${this.orphanedFiles.length - 10} more files`);
      }
    }

    // Show sample orphaned content
    if (this.orphanedContent.length > 0) {
      console.log('\n❌ SAMPLE CONTENT WITHOUT THUMBNAILS:');
      const samples = this.orphanedContent.slice(0, 5);
      samples.forEach((content, index) => {
        const displayTitle = content.metadata?.title || content.url || 'Untitled';
        console.log(`   ${index + 1}. ${displayTitle}`);
        console.log(`      URL: ${content.url}`);
        console.log(`      User: ${content.username}`);
        console.log(`      Type: ${content.content_type}`);
        console.log('');
      });
      
      if (this.orphanedContent.length > 5) {
        console.log(`   ... and ${this.orphanedContent.length - 5} more content items`);
      }
    }

    // Show recommendations
    const recommendations = this.generateRecommendations();
    if (recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      recommendations.forEach(rec => {
        console.log(`   ${rec}`);
      });
    }

    // Export data for further analysis
    this.exportData();
    
    console.log('\n===================================');
  }

  /**
   * Export data to JSON files for further analysis
   */
  exportData() {
    const fs = require('fs');
    const path = require('path');
    
    const exportDir = path.join(__dirname, '..', 'logs');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Export orphaned files
    if (this.orphanedFiles.length > 0) {
      const orphanedFilesPath = path.join(exportDir, `orphaned_files_${timestamp}.json`);
      fs.writeFileSync(orphanedFilesPath, JSON.stringify(this.orphanedFiles, null, 2));
      console.log(`📄 Orphaned files exported to: ${orphanedFilesPath}`);
    }
    
    // Export orphaned content
    if (this.orphanedContent.length > 0) {
      const orphanedContentPath = path.join(exportDir, `orphaned_content_${timestamp}.json`);
      fs.writeFileSync(orphanedContentPath, JSON.stringify(this.orphanedContent, null, 2));
      console.log(`🌐 Orphaned content exported to: ${orphanedContentPath}`);
    }
    
    // Export summary
    const summaryPath = path.join(exportDir, `orphaned_summary_${timestamp}.json`);
    const summary = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      recommendations: this.generateRecommendations(),
      counts: {
        orphanedFiles: this.orphanedFiles.length,
        orphanedContent: this.orphanedContent.length,
        orphanedThumbnails: this.orphanedThumbnails.length
      }
    };
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`📊 Summary exported to: ${summaryPath}`);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    const checker = new OrphanedContentChecker();
    await checker.checkAll();
    
    console.log('\n✅ Orphaned content analysis completed!');
    
  } catch (error) {
    console.error('\n❌ Analysis failed:', error.message);
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

module.exports = OrphanedContentChecker;