#!/usr/bin/env node

/**
 * DaySave - File Storage Analysis Script
 * 
 * Analyzes the current state of file storage to understand:
 * - Which files are in local storage vs GCS
 * - Which files are missing
 * - Which files have invalid paths
 * - Storage distribution and cleanup recommendations
 */

const fs = require('fs');
const path = require('path');
const { File, Thumbnail, User } = require('../models');

class FileStorageAnalyzer {
  constructor() {
    this.stats = {
      files: {
        total: 0,
        local: 0,
        gcs: 0,
        missing: 0,
        invalid: 0,
        existing: 0
      },
      thumbnails: {
        total: 0,
        local: 0,
        gcs: 0,
        missing: 0,
        invalid: 0,
        existing: 0
      },
      storage: {
        uploadsSize: 0,
        thumbnailsSize: 0
      }
    };
    
    this.issues = [];
    this.recommendations = [];
  }

  /**
   * Analyze a file record
   */
  analyzeFile(file) {
    this.stats.files.total++;
    
    const filePath = file.file_path;
    
    // Check if it's a GCS path
    if (filePath.startsWith('gs://') || filePath.includes('storage.googleapis.com') || 
        (file.metadata && file.metadata.storage === 'gcs')) {
      this.stats.files.gcs++;
      return { type: 'gcs', path: filePath, exists: null };
    }
    
    // Check if it's an invalid path
    if (filePath.startsWith('/Users/') || filePath.includes('gs:/')) {
      this.stats.files.invalid++;
      this.issues.push({
        type: 'file',
        id: file.id,
        issue: 'invalid_path',
        path: filePath,
        filename: file.filename
      });
      return { type: 'invalid', path: filePath, exists: false };
    }
    
    // Check if local file exists
    let localPath;
    if (filePath.startsWith('/')) {
      localPath = filePath;
    } else {
      localPath = path.resolve(filePath);
    }
    
    const exists = fs.existsSync(localPath);
    
    if (exists) {
      this.stats.files.existing++;
      this.stats.files.local++;
      
      // Get file size
      try {
        const stats = fs.statSync(localPath);
        this.stats.storage.uploadsSize += stats.size;
      } catch (error) {
        // Ignore stat errors
      }
    } else {
      this.stats.files.missing++;
      this.issues.push({
        type: 'file',
        id: file.id,
        issue: 'missing',
        path: localPath,
        filename: file.filename
      });
    }
    
    return { type: 'local', path: localPath, exists };
  }

  /**
   * Analyze a thumbnail record
   */
  analyzeThumbnail(thumbnail) {
    this.stats.thumbnails.total++;
    
    const filePath = thumbnail.file_path;
    
    // Check if it's a GCS path
    if (filePath.startsWith('gs://') || filePath.includes('storage.googleapis.com') ||
        (thumbnail.metadata && thumbnail.metadata.storage === 'gcs')) {
      this.stats.thumbnails.gcs++;
      return { type: 'gcs', path: filePath, exists: null };
    }
    
    // Check if it's an invalid path
    if (filePath.startsWith('/Users/') || filePath.includes('gs:/')) {
      this.stats.thumbnails.invalid++;
      this.issues.push({
        type: 'thumbnail',
        id: thumbnail.id,
        issue: 'invalid_path',
        path: filePath,
        filename: thumbnail.file_name
      });
      return { type: 'invalid', path: filePath, exists: false };
    }
    
    // Check if local file exists
    let localPath;
    if (filePath.startsWith('/')) {
      localPath = filePath;
    } else {
      localPath = path.resolve(filePath);
    }
    
    const exists = fs.existsSync(localPath);
    
    if (exists) {
      this.stats.thumbnails.existing++;
      this.stats.thumbnails.local++;
      
      // Get file size
      try {
        const stats = fs.statSync(localPath);
        this.stats.storage.thumbnailsSize += stats.size;
      } catch (error) {
        // Ignore stat errors
      }
    } else {
      this.stats.thumbnails.missing++;
      this.issues.push({
        type: 'thumbnail',
        id: thumbnail.id,
        issue: 'missing',
        path: localPath,
        filename: thumbnail.file_name
      });
    }
    
    return { type: 'local', path: localPath, exists };
  }

  /**
   * Get local storage directory sizes
   */
  analyzeLocalStorage() {
    const uploadsDir = path.resolve('uploads');
    
    if (fs.existsSync(uploadsDir)) {
      try {
        const thumbnailsDir = path.join(uploadsDir, 'thumbnails');
        const tempDir = path.join(uploadsDir, 'temp');
        
        console.log('\n📁 Local Storage Analysis:');
        console.log(`   📂 Uploads directory: ${uploadsDir}`);
        
        if (fs.existsSync(thumbnailsDir)) {
          const thumbnailFiles = fs.readdirSync(thumbnailsDir);
          console.log(`   🖼️ Thumbnails: ${thumbnailFiles.length} files`);
        }
        
        if (fs.existsSync(tempDir)) {
          const tempFiles = fs.readdirSync(tempDir);
          console.log(`   📄 Temp files: ${tempFiles.length} files`);
        }
        
        // List user directories
        const items = fs.readdirSync(uploadsDir);
        const userDirs = items.filter(item => {
          const itemPath = path.join(uploadsDir, item);
          return fs.statSync(itemPath).isDirectory() && 
                 item !== 'thumbnails' && 
                 item !== 'temp' &&
                 !item.startsWith('.');
        });
        
        console.log(`   👥 User directories: ${userDirs.length}`);
        userDirs.forEach(dir => {
          try {
            const userDir = path.join(uploadsDir, dir);
            const userFiles = fs.readdirSync(userDir);
            console.log(`      • ${dir}: ${userFiles.length} files`);
          } catch (error) {
            console.log(`      • ${dir}: Error reading directory`);
          }
        });
        
      } catch (error) {
        console.error('Error analyzing local storage:', error);
      }
    } else {
      console.log('\n📁 No uploads directory found');
    }
  }

  /**
   * Generate recommendations
   */
  generateRecommendations() {
    this.recommendations = [];
    
    if (this.stats.files.missing > 0) {
      this.recommendations.push(
        `🗑️ Clean up ${this.stats.files.missing} missing file references from database`
      );
    }
    
    if (this.stats.thumbnails.missing > 0) {
      this.recommendations.push(
        `🗑️ Clean up ${this.stats.thumbnails.missing} missing thumbnail references from database`
      );
    }
    
    if (this.stats.files.invalid > 0) {
      this.recommendations.push(
        `🔧 Fix ${this.stats.files.invalid} invalid file paths in database`
      );
    }
    
    if (this.stats.thumbnails.invalid > 0) {
      this.recommendations.push(
        `🔧 Fix ${this.stats.thumbnails.invalid} invalid thumbnail paths in database`
      );
    }
    
    if (this.stats.files.local > 0) {
      this.recommendations.push(
        `☁️ Migrate ${this.stats.files.local} local files to Google Cloud Storage`
      );
    }
    
    if (this.stats.thumbnails.local > 0) {
      this.recommendations.push(
        `☁️ Migrate ${this.stats.thumbnails.local} local thumbnails to Google Cloud Storage`
      );
    }
    
    const totalLocalSize = this.stats.storage.uploadsSize + this.stats.storage.thumbnailsSize;
    if (totalLocalSize > 0) {
      this.recommendations.push(
        `💾 Free up ${this.formatBytes(totalLocalSize)} of local storage after migration`
      );
    }
  }

  /**
   * Run complete analysis
   */
  async analyze() {
    console.log('🔍 DaySave File Storage Analysis');
    console.log('================================');
    
    // Analyze files
    console.log('\n📄 Analyzing files...');
    const files = await File.findAll();
    
    for (const file of files) {
      this.analyzeFile(file);
    }
    
    // Analyze thumbnails
    console.log('🖼️ Analyzing thumbnails...');
    const thumbnails = await Thumbnail.findAll();
    
    for (const thumbnail of thumbnails) {
      this.analyzeThumbnail(thumbnail);
    }
    
    // Analyze local storage
    this.analyzeLocalStorage();
    
    // Generate recommendations
    this.generateRecommendations();
    
    // Generate report
    this.generateReport();
  }

  /**
   * Generate final report
   */
  generateReport() {
    console.log('\n================================');
    console.log('📊 STORAGE ANALYSIS REPORT');
    console.log('================================');
    
    console.log('\n📄 FILES:');
    console.log(`   📊 Total: ${this.stats.files.total}`);
    console.log(`   ☁️ In GCS: ${this.stats.files.gcs}`);
    console.log(`   📁 Local (existing): ${this.stats.files.existing}`);
    console.log(`   ❌ Missing: ${this.stats.files.missing}`);
    console.log(`   🔧 Invalid paths: ${this.stats.files.invalid}`);
    
    console.log('\n🖼️ THUMBNAILS:');
    console.log(`   📊 Total: ${this.stats.thumbnails.total}`);
    console.log(`   ☁️ In GCS: ${this.stats.thumbnails.gcs}`);
    console.log(`   📁 Local (existing): ${this.stats.thumbnails.existing}`);
    console.log(`   ❌ Missing: ${this.stats.thumbnails.missing}`);
    console.log(`   🔧 Invalid paths: ${this.stats.thumbnails.invalid}`);
    
    console.log('\n💾 STORAGE:');
    console.log(`   📄 Files: ${this.formatBytes(this.stats.storage.uploadsSize)}`);
    console.log(`   🖼️ Thumbnails: ${this.formatBytes(this.stats.storage.thumbnailsSize)}`);
    console.log(`   📊 Total: ${this.formatBytes(this.stats.storage.uploadsSize + this.stats.storage.thumbnailsSize)}`);
    
    if (this.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      this.recommendations.forEach(rec => {
        console.log(`   ${rec}`);
      });
    }
    
    // Show sample issues
    if (this.issues.length > 0) {
      console.log('\n⚠️ SAMPLE ISSUES:');
      const sampleIssues = this.issues.slice(0, 10);
      sampleIssues.forEach(issue => {
        console.log(`   ${issue.type.toUpperCase()}: ${issue.issue} - ${issue.filename} (${issue.id})`);
        console.log(`      Path: ${issue.path}`);
      });
      
      if (this.issues.length > 10) {
        console.log(`   ... and ${this.issues.length - 10} more issues`);
      }
    }
    
    console.log('\n================================');
  }

  /**
   * Format bytes for display
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

/**
 * Main function
 */
async function main() {
  try {
    const analyzer = new FileStorageAnalyzer();
    await analyzer.analyze();
    
    console.log('\n✅ Analysis completed!');
    console.log('💡 Use this information to plan your migration strategy.');
    
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

module.exports = FileStorageAnalyzer;