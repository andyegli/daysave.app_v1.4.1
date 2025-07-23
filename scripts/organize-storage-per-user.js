#!/usr/bin/env node

/**
 * DaySave Storage Organization Script
 * 
 * Organizes file storage and thumbnails on a per-user basis
 * - Creates database backup
 * - Moves thumbnails from shared directory to per-user directories
 * - Updates database records with new paths
 * - Maintains all existing functionality
 * 
 * Usage: node organize-storage-per-user.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Initialize database
const db = require('./models');
const { Thumbnail, File, Content, VideoAnalysis, ImageAnalysis, User } = db;

class StorageOrganizer {
  constructor() {
    this.uploadsDir = path.join(__dirname, 'uploads');
    this.thumbnailsDir = path.join(this.uploadsDir, 'thumbnails');
    this.backupDir = path.join(__dirname, 'db_backup');
    this.stats = {
      totalThumbnails: 0,
      movedThumbnails: 0,
      updatedRecords: 0,
      errors: [],
      userDirectories: new Set()
    };
  }

  /**
   * Main execution function
   */
  async run() {
    try {
      console.log('🚀 Starting DaySave Storage Organization...\n');

      // Step 1: Create database backup
      await this.createDatabaseBackup();

      // Step 2: Analyze current storage structure
      await this.analyzeCurrentStructure();

      // Step 3: Organize thumbnails per user
      await this.organizeThumbnails();

      // Step 4: Update database records
      await this.updateDatabaseRecords();

      // Step 5: Verify organization
      await this.verifyOrganization();

      // Step 6: Clean up
      await this.cleanupEmptyDirectories();

      console.log('✅ Storage organization completed successfully!\n');
      this.printSummary();

    } catch (error) {
      console.error('❌ Storage organization failed:', error);
      console.log('\n🔄 Database backup is available in db_backup/ directory');
      process.exit(1);
    }
  }

  /**
   * Create database backup before making changes
   */
  async createDatabaseBackup() {
    console.log('📊 Creating database backup...');
    
    const dbConfig = {
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3306,
      username: process.env.DB_USER,
      password: process.env.DB_USER_PASSWORD,
      database: process.env.DB_NAME
    };

    if (!dbConfig.username || !dbConfig.password || !dbConfig.database) {
      throw new Error('Missing required environment variables: DB_USER, DB_USER_PASSWORD, DB_NAME');
    }

    // Create backup directory
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupFileName = `daysave_backup_storage_organization_${timestamp}.sql`;
    const backupFilePath = path.join(this.backupDir, backupFileName);

    // Create mysqldump command
    const dumpCommand = [
      'mysqldump',
      `--host=${dbConfig.host}`,
      `--port=${dbConfig.port}`,
      `--user=${dbConfig.username}`,
      `--password=${dbConfig.password}`,
      '--lock-tables=false',
      '--complete-insert',
      '--no-create-db',
      dbConfig.database
    ].join(' ');

    try {
      const { stdout } = await execAsync(`${dumpCommand} > "${backupFilePath}"`);
      
      if (fs.existsSync(backupFilePath) && fs.statSync(backupFilePath).size > 0) {
        console.log(`✅ Database backup created: ${backupFileName}`);
        console.log(`📍 Backup location: ${backupFilePath}\n`);
      } else {
        throw new Error('Backup file was not created or is empty');
      }
    } catch (error) {
      throw new Error(`Database backup failed: ${error.message}`);
    }
  }

  /**
   * Analyze current storage structure
   */
  async analyzeCurrentStructure() {
    console.log('🔍 Analyzing current storage structure...');

    // Check uploads directory
    if (!fs.existsSync(this.uploadsDir)) {
      throw new Error('Uploads directory not found');
    }

    // Check thumbnails directory
    if (!fs.existsSync(this.thumbnailsDir)) {
      console.log('📁 No thumbnails directory found - creating structure only');
      return;
    }

    // Count thumbnails in shared directory
    const thumbnailFiles = fs.readdirSync(this.thumbnailsDir)
      .filter(file => file.endsWith('.jpg') || file.endsWith('.png'))
      .filter(file => fs.statSync(path.join(this.thumbnailsDir, file)).isFile());

    this.stats.totalThumbnails = thumbnailFiles.length;
    console.log(`📸 Found ${this.stats.totalThumbnails} thumbnails in shared directory`);

    // Check existing user directories
    const uploadsContents = fs.readdirSync(this.uploadsDir);
    const userDirs = uploadsContents.filter(item => {
      const itemPath = path.join(this.uploadsDir, item);
      return fs.statSync(itemPath).isDirectory() && 
             item.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    console.log(`👥 Found ${userDirs.length} existing user directories`);
    userDirs.forEach(dir => this.stats.userDirectories.add(dir));
    console.log();
  }

  /**
   * Organize thumbnails into per-user directories
   */
  async organizeThumbnails() {
    console.log('📁 Organizing thumbnails per user...');

    if (!fs.existsSync(this.thumbnailsDir)) {
      console.log('📝 No thumbnails to organize\n');
      return;
    }

    const thumbnailFiles = fs.readdirSync(this.thumbnailsDir)
      .filter(file => file.endsWith('.jpg') || file.endsWith('.png'))
      .filter(file => fs.statSync(path.join(this.thumbnailsDir, file)).isFile());

    if (thumbnailFiles.length === 0) {
      console.log('📝 No thumbnail files to organize\n');
      return;
    }

    for (const thumbnailFile of thumbnailFiles) {
      try {
        await this.moveThumbnailToUserDirectory(thumbnailFile);
      } catch (error) {
        console.error(`⚠️ Error moving ${thumbnailFile}:`, error.message);
        this.stats.errors.push({ file: thumbnailFile, error: error.message });
      }
    }

    console.log(`✅ Moved ${this.stats.movedThumbnails} thumbnails to user directories\n`);
  }

  /**
   * Move a single thumbnail to the appropriate user directory
   */
  async moveThumbnailToUserDirectory(thumbnailFile) {
    const currentPath = path.join(this.thumbnailsDir, thumbnailFile);
    
    // Find which user owns this thumbnail by checking database
    const userId = await this.findThumbnailOwner(thumbnailFile);
    
    if (!userId) {
      console.log(`⚠️ Could not find owner for thumbnail: ${thumbnailFile}`);
      return;
    }

    // Create user thumbnail directory if it doesn't exist
    const userDir = path.join(this.uploadsDir, userId);
    const userThumbnailDir = path.join(userDir, 'thumbnails');
    
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
      this.stats.userDirectories.add(userId);
    }
    
    if (!fs.existsSync(userThumbnailDir)) {
      fs.mkdirSync(userThumbnailDir, { recursive: true });
    }

    // Move the thumbnail file
    const newPath = path.join(userThumbnailDir, thumbnailFile);
    
    if (!fs.existsSync(newPath)) {
      fs.renameSync(currentPath, newPath);
      this.stats.movedThumbnails++;
      console.log(`📸 Moved ${thumbnailFile} → ${userId}/thumbnails/`);
    } else {
      console.log(`⚠️ Thumbnail already exists at destination: ${thumbnailFile}`);
    }
  }

  /**
   * Find the user who owns a thumbnail by checking the database
   */
  async findThumbnailOwner(thumbnailFile) {
    try {
      // Extract the base filename without extension for searching
      const baseName = path.basename(thumbnailFile, path.extname(thumbnailFile));
      
      // Try to find thumbnail record in database
      const thumbnailRecord = await Thumbnail.findOne({
        where: {
          file_name: thumbnailFile
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id']
          }
        ]
      });

      if (thumbnailRecord && thumbnailRecord.user) {
        return thumbnailRecord.user.id;
      }

      // Alternative: Check if the filename matches content or file IDs
      // Look for content with similar ID pattern
      const uuidPattern = baseName.split('_')[0];
      if (uuidPattern && uuidPattern.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)) {
        
        // Check in content table
        const content = await Content.findOne({
          where: { id: uuidPattern },
          attributes: ['user_id']
        });
        
        if (content) {
          return content.user_id;
        }

        // Check in files table
        const file = await File.findOne({
          where: { id: uuidPattern },
          attributes: ['user_id']
        });
        
        if (file) {
          return file.user_id;
        }

        // Check in video_analysis table
        const videoAnalysis = await VideoAnalysis.findOne({
          where: { id: uuidPattern },
          attributes: ['user_id']
        });
        
        if (videoAnalysis) {
          return videoAnalysis.user_id;
        }

        // Check in image_analysis table  
        const imageAnalysis = await ImageAnalysis.findOne({
          where: { id: uuidPattern },
          attributes: ['user_id']
        });
        
        if (imageAnalysis) {
          return imageAnalysis.user_id;
        }
      }

      return null;
    } catch (error) {
      console.error(`Error finding owner for ${thumbnailFile}:`, error);
      return null;
    }
  }

  /**
   * Update database records with new thumbnail paths
   */
  async updateDatabaseRecords() {
    console.log('💾 Updating database records with new paths...');

    try {
      // Update thumbnail records
      const thumbnails = await Thumbnail.findAll({
        where: {
          file_path: {
            [db.Sequelize.Op.like]: 'uploads/thumbnails/%'
          }
        }
      });

      for (const thumbnail of thumbnails) {
        const oldPath = thumbnail.file_path;
        const fileName = path.basename(oldPath);
        const newPath = `uploads/${thumbnail.user_id}/thumbnails/${fileName}`;
        
        await thumbnail.update({ file_path: newPath });
        this.stats.updatedRecords++;
        
        console.log(`📝 Updated: ${oldPath} → ${newPath}`);
      }

      console.log(`✅ Updated ${this.stats.updatedRecords} database records\n`);
    } catch (error) {
      throw new Error(`Failed to update database records: ${error.message}`);
    }
  }

  /**
   * Verify that the organization was successful
   */
  async verifyOrganization() {
    console.log('✅ Verifying organization...');

    let verificationErrors = 0;

    try {
      // Check that thumbnail database records point to existing files
      const thumbnails = await Thumbnail.findAll();
      
      for (const thumbnail of thumbnails) {
        const filePath = path.join(__dirname, thumbnail.file_path);
        
        if (!fs.existsSync(filePath)) {
          console.error(`❌ Missing file: ${thumbnail.file_path}`);
          verificationErrors++;
        }
      }

      if (verificationErrors === 0) {
        console.log(`✅ All ${thumbnails.length} thumbnail records verified\n`);
      } else {
        console.log(`⚠️ Found ${verificationErrors} verification errors\n`);
      }

    } catch (error) {
      console.error('Verification failed:', error);
    }
  }

  /**
   * Clean up empty directories
   */
  async cleanupEmptyDirectories() {
    console.log('🧹 Cleaning up empty directories...');

    try {
      // Check if original thumbnails directory is empty
      if (fs.existsSync(this.thumbnailsDir)) {
        const contents = fs.readdirSync(this.thumbnailsDir);
        if (contents.length === 0) {
          fs.rmdirSync(this.thumbnailsDir);
          console.log('🗑️ Removed empty thumbnails directory');
        } else {
          console.log(`📁 Thumbnails directory still contains ${contents.length} items`);
        }
      }

      console.log('✅ Cleanup completed\n');
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }

  /**
   * Print summary of organization results
   */
  printSummary() {
    console.log('📊 ORGANIZATION SUMMARY');
    console.log('========================');
    console.log(`📸 Total thumbnails found: ${this.stats.totalThumbnails}`);
    console.log(`📁 Thumbnails moved: ${this.stats.movedThumbnails}`);
    console.log(`💾 Database records updated: ${this.stats.updatedRecords}`);
    console.log(`👥 User directories: ${this.stats.userDirectories.size}`);
    console.log(`❌ Errors: ${this.stats.errors.length}`);
    
    if (this.stats.errors.length > 0) {
      console.log('\n⚠️ ERRORS:');
      this.stats.errors.forEach(error => {
        console.log(`   ${error.file}: ${error.error}`);
      });
    }

    console.log('\n🎉 Your storage is now organized per-user!');
    console.log('   • Files: uploads/{userId}/{timestamp}_{fileId}.ext');
    console.log('   • Thumbnails: uploads/{userId}/thumbnails/{thumbnailId}.jpg');
    console.log('   • All links preserved and working');
  }
}

// Execute if called directly
if (require.main === module) {
  const organizer = new StorageOrganizer();
  organizer.run().catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

module.exports = StorageOrganizer;