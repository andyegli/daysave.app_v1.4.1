#!/usr/bin/env node

/**
 * Google Cloud Storage Bucket Migration Script
 * 
 * Migrates files from old bucket (daysave-uploads) to new bucket (daysave-v141-2-uploads)
 * and updates database references
 */

require('dotenv').config();
const { Storage } = require('@google-cloud/storage');
const { File, Content, Thumbnail, User } = require('../models');

// Configuration
const OLD_BUCKET = 'daysave-uploads';
const NEW_BUCKET = process.env.GOOGLE_CLOUD_STORAGE_BUCKET || 'daysave-v141-2-uploads';
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID || 'daysave-v1412';

console.log('🔧 Google Cloud Storage Bucket Migration');
console.log('=' .repeat(60));
console.log(`📦 Old Bucket: ${OLD_BUCKET}`);
console.log(`📦 New Bucket: ${NEW_BUCKET}`);
console.log(`🏗️  Project ID: ${PROJECT_ID}`);
console.log('');

class BucketMigrator {
  constructor() {
    this.storage = new Storage({
      projectId: PROJECT_ID,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });
    
    this.oldBucket = this.storage.bucket(OLD_BUCKET);
    this.newBucket = this.storage.bucket(NEW_BUCKET);
    
    this.stats = {
      filesChecked: 0,
      filesFound: 0,
      filesMigrated: 0,
      filesSkipped: 0,
      dbRecordsUpdated: 0,
      errors: []
    };
  }

  /**
   * Check if both buckets exist and are accessible
   */
  async validateBuckets() {
    console.log('🔍 Validating bucket access...');
    
    try {
      const [oldExists] = await this.oldBucket.exists();
      if (!oldExists) {
        throw new Error(`Old bucket '${OLD_BUCKET}' does not exist or is not accessible`);
      }
      console.log(`✅ Old bucket '${OLD_BUCKET}' is accessible`);
      
      const [newExists] = await this.newBucket.exists();
      if (!newExists) {
        throw new Error(`New bucket '${NEW_BUCKET}' does not exist or is not accessible`);
      }
      console.log(`✅ New bucket '${NEW_BUCKET}' is accessible`);
      
      return true;
    } catch (error) {
      console.error('❌ Bucket validation failed:', error.message);
      return false;
    }
  }

  /**
   * Get all file paths from database that reference the old bucket
   */
  async getFilesToMigrate() {
    console.log('📋 Scanning database for files to migrate...');
    
    const filesToMigrate = [];
    
    // Check Files table
    const files = await File.findAll({
      where: {
        file_path: {
          [require('sequelize').Op.like]: `%${OLD_BUCKET}%`
        }
      }
    });
    
    for (const file of files) {
      filesToMigrate.push({
        type: 'file',
        id: file.id,
        path: file.file_path,
        filename: file.filename,
        user_id: file.user_id
      });
    }
    
    // Check Content table for any GCS references
    const contents = await Content.findAll({
      where: {
        url: {
          [require('sequelize').Op.like]: `%${OLD_BUCKET}%`
        }
      }
    });
    
    for (const content of contents) {
      filesToMigrate.push({
        type: 'content',
        id: content.id,
        path: content.url,
        user_id: content.user_id
      });
    }
    
    // Check Thumbnails table
    const thumbnails = await Thumbnail.findAll({
      where: {
        file_path: {
          [require('sequelize').Op.like]: `%${OLD_BUCKET}%`
        }
      }
    });
    
    for (const thumbnail of thumbnails) {
      filesToMigrate.push({
        type: 'thumbnail',
        id: thumbnail.id,
        path: thumbnail.file_path,
        file_id: thumbnail.file_id
      });
    }
    
    console.log(`📊 Found ${filesToMigrate.length} database records referencing old bucket:`);
    console.log(`   - Files: ${files.length}`);
    console.log(`   - Content: ${contents.length}`);
    console.log(`   - Thumbnails: ${thumbnails.length}`);
    
    return filesToMigrate;
  }

  /**
   * Extract GCS path from full URL or path
   */
  extractGcsPath(fullPath) {
    // Handle different formats:
    // gs://daysave-uploads/path/file.ext
    // https://storage.googleapis.com/daysave-uploads/path/file.ext
    // /uploads/path/file.ext
    
    if (fullPath.startsWith('gs://')) {
      return fullPath.replace(`gs://${OLD_BUCKET}/`, '');
    }
    
    if (fullPath.includes('storage.googleapis.com')) {
      const match = fullPath.match(new RegExp(`storage\\.googleapis\\.com\\/${OLD_BUCKET}\\/(.+)$`));
      return match ? match[1] : null;
    }
    
    if (fullPath.includes(OLD_BUCKET)) {
      const match = fullPath.match(new RegExp(`${OLD_BUCKET}\\/(.+)$`));
      return match ? match[1] : null;
    }
    
    return null;
  }

  /**
   * Copy a file from old bucket to new bucket
   */
  async migrateFile(gcsPath) {
    try {
      const sourceFile = this.oldBucket.file(gcsPath);
      const destinationFile = this.newBucket.file(gcsPath);
      
      // Check if source file exists
      const [sourceExists] = await sourceFile.exists();
      if (!sourceExists) {
        console.log(`⚠️  Source file not found: gs://${OLD_BUCKET}/${gcsPath}`);
        return false;
      }
      
      // Check if destination already exists
      const [destExists] = await destinationFile.exists();
      if (destExists) {
        console.log(`ℹ️  File already exists in destination: gs://${NEW_BUCKET}/${gcsPath}`);
        return true;
      }
      
      // Copy the file
      console.log(`📤 Copying: gs://${OLD_BUCKET}/${gcsPath} → gs://${NEW_BUCKET}/${gcsPath}`);
      await sourceFile.copy(destinationFile);
      
      // Verify the copy
      const [copyExists] = await destinationFile.exists();
      if (copyExists) {
        console.log(`✅ Successfully copied: ${gcsPath}`);
        return true;
      } else {
        console.log(`❌ Copy verification failed: ${gcsPath}`);
        return false;
      }
      
    } catch (error) {
      console.error(`❌ Error copying ${gcsPath}:`, error.message);
      this.stats.errors.push(`Copy failed for ${gcsPath}: ${error.message}`);
      return false;
    }
  }

  /**
   * Update database record with new bucket path
   */
  async updateDatabaseRecord(record) {
    try {
      const newPath = record.path.replace(new RegExp(OLD_BUCKET, 'g'), NEW_BUCKET);
      
      switch (record.type) {
        case 'file':
          await File.update(
            { file_path: newPath },
            { where: { id: record.id } }
          );
          break;
          
        case 'content':
          await Content.update(
            { url: newPath },
            { where: { id: record.id } }
          );
          break;
          
        case 'thumbnail':
          await Thumbnail.update(
            { file_path: newPath },
            { where: { id: record.id } }
          );
          break;
      }
      
      console.log(`✅ Updated ${record.type} record ${record.id}: ${OLD_BUCKET} → ${NEW_BUCKET}`);
      this.stats.dbRecordsUpdated++;
      return true;
      
    } catch (error) {
      console.error(`❌ Error updating ${record.type} ${record.id}:`, error.message);
      this.stats.errors.push(`DB update failed for ${record.type} ${record.id}: ${error.message}`);
      return false;
    }
  }

  /**
   * Run the complete migration process
   */
  async migrate() {
    try {
      // Validate buckets
      if (!(await this.validateBuckets())) {
        return false;
      }
      
      // Get files to migrate
      const filesToMigrate = await this.getFilesToMigrate();
      
      if (filesToMigrate.length === 0) {
        console.log('🎉 No files found that need migration!');
        return true;
      }
      
      console.log(`\n🚀 Starting migration of ${filesToMigrate.length} records...\n`);
      
      // Process each file
      for (let i = 0; i < filesToMigrate.length; i++) {
        const record = filesToMigrate[i];
        this.stats.filesChecked++;
        
        console.log(`\n📁 [${i + 1}/${filesToMigrate.length}] Processing ${record.type} ${record.id}`);
        console.log(`   Path: ${record.path}`);
        
        // Extract GCS path
        const gcsPath = this.extractGcsPath(record.path);
        if (!gcsPath) {
          console.log(`⚠️  Could not extract GCS path from: ${record.path}`);
          this.stats.filesSkipped++;
          continue;
        }
        
        console.log(`   GCS Path: ${gcsPath}`);
        
        // Migrate the file
        const migrated = await this.migrateFile(gcsPath);
        if (migrated) {
          this.stats.filesFound++;
          this.stats.filesMigrated++;
          
          // Update database record
          await this.updateDatabaseRecord(record);
        } else {
          this.stats.filesSkipped++;
        }
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      return true;
      
    } catch (error) {
      console.error('💥 Migration failed:', error);
      this.stats.errors.push(`Migration failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Print migration statistics
   */
  printStats() {
    console.log('\n📊 Migration Statistics');
    console.log('=' .repeat(40));
    console.log(`📋 Records Checked: ${this.stats.filesChecked}`);
    console.log(`🔍 Files Found in Old Bucket: ${this.stats.filesFound}`);
    console.log(`📤 Files Migrated: ${this.stats.filesMigrated}`);
    console.log(`⏭️  Files Skipped: ${this.stats.filesSkipped}`);
    console.log(`💾 Database Records Updated: ${this.stats.dbRecordsUpdated}`);
    console.log(`❌ Errors: ${this.stats.errors.length}`);
    
    if (this.stats.errors.length > 0) {
      console.log('\n🔥 Errors:');
      this.stats.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
  }
}

// Main execution
async function main() {
  const migrator = new BucketMigrator();
  
  try {
    const success = await migrator.migrate();
    migrator.printStats();
    
    if (success && migrator.stats.errors.length === 0) {
      console.log('\n🎉 Migration completed successfully!');
      console.log(`✅ All files have been migrated to bucket: ${NEW_BUCKET}`);
      console.log('✅ Database references have been updated');
      process.exit(0);
    } else {
      console.log('\n⚠️  Migration completed with errors - please review above');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Migration script crashed:', error);
    process.exit(1);
  }
}

// Run the migration
if (require.main === module) {
  main();
}
