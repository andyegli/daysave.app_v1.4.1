#!/usr/bin/env node
/**
 * Database Backup Script for DaySave
 * 
 * Creates a complete backup of the MySQL database with:
 * - Timestamped backup files
 * - Schema and data export
 * - Compression support
 * - Error handling and validation
 */

require('dotenv').config();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class DatabaseBackup {
  constructor() {
    this.backupDir = path.join(__dirname, '..', 'db_backup');
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    
    // Database connection details from environment
    this.dbConfig = {
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3306,
      username: process.env.DB_USER,
      password: process.env.DB_USER_PASSWORD,
      database: process.env.DB_NAME
    };
    
    // Backup file paths
    this.backupFileName = `daysave_backup_${this.timestamp}.sql`;
    this.backupFilePath = path.join(this.backupDir, this.backupFileName);
    this.compressedBackupPath = `${this.backupFilePath}.gz`;
  }

  /**
   * Validate configuration and requirements
   */
  validateConfig() {
    console.log('🔍 Validating backup configuration...');
    
    // Check required environment variables
    const requiredVars = ['DB_USER', 'DB_USER_PASSWORD', 'DB_NAME'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
    
    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log('📁 Created db_backup directory');
    }
    
    console.log('✅ Configuration validated');
    console.log(`📊 Database: ${this.dbConfig.database} at ${this.dbConfig.host}:${this.dbConfig.port}`);
    console.log(`💾 Backup file: ${this.backupFileName}`);
  }

  /**
   * Test database connection
   */
  async testConnection() {
    console.log('🔌 Testing database connection...');
    
    return new Promise((resolve, reject) => {
      const testCommand = `mysql -h ${this.dbConfig.host} -P ${this.dbConfig.port} -u ${this.dbConfig.username} -p'${this.dbConfig.password}' ${this.dbConfig.database} -e "SELECT 1;"`;
      
      exec(testCommand, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Database connection failed: ${error.message}`));
        } else {
          console.log('✅ Database connection successful');
          resolve();
        }
      });
    });
  }

  /**
   * Get database statistics before backup
   */
  async getDatabaseStats() {
    console.log('📊 Getting database statistics...');
    
    return new Promise((resolve, reject) => {
      const statsCommand = `mysql -h ${this.dbConfig.host} -P ${this.dbConfig.port} -u ${this.dbConfig.username} -p'${this.dbConfig.password}' ${this.dbConfig.database} -e "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = '${this.dbConfig.database}';"`;
      
      exec(statsCommand, (error, stdout, stderr) => {
        if (error) {
          console.warn('⚠️ Could not get database stats:', error.message);
          resolve({ tableCount: 'unknown' });
        } else {
          const lines = stdout.trim().split('\n');
          const tableCount = lines[1] || 'unknown';
          console.log(`📋 Tables to backup: ${tableCount}`);
          resolve({ tableCount });
        }
      });
    });
  }

  /**
   * Create database backup using mysqldump
   */
  async createBackup() {
    console.log('💾 Creating database backup...');
    
    return new Promise((resolve, reject) => {
      // mysqldump command with compatible options (no special privileges required)
      const dumpCommand = `mysqldump ` +
        `--host=${this.dbConfig.host} ` +
        `--port=${this.dbConfig.port} ` +
        `--user=${this.dbConfig.username} ` +
        `--password='${this.dbConfig.password}' ` +
        `--single-transaction ` +
        `--add-drop-table ` +
        `--disable-keys ` +
        `--extended-insert ` +
        `--quick ` +
        `--lock-tables=false ` +
        `--no-tablespaces ` +
        `--skip-comments ` +
        `--skip-dump-date ` +
        `${this.dbConfig.database} > "${this.backupFilePath}"`;
      
      console.log('⏳ Running mysqldump...');
      
      exec(dumpCommand, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Backup failed: ${error.message}`));
        } else {
          // Check if backup file was created and has content
          if (fs.existsSync(this.backupFilePath)) {
            const stats = fs.statSync(this.backupFilePath);
            if (stats.size > 0) {
              console.log(`✅ Backup created successfully: ${this.formatFileSize(stats.size)}`);
              resolve({ filePath: this.backupFilePath, size: stats.size });
            } else {
              reject(new Error('Backup file is empty'));
            }
          } else {
            reject(new Error('Backup file was not created'));
          }
        }
      });
    });
  }

  /**
   * Compress backup file (optional)
   */
  async compressBackup() {
    console.log('🗜️ Compressing backup file...');
    
    return new Promise((resolve, reject) => {
      const compressCommand = `gzip -c "${this.backupFilePath}" > "${this.compressedBackupPath}"`;
      
      exec(compressCommand, (error, stdout, stderr) => {
        if (error) {
          console.warn('⚠️ Compression failed, keeping uncompressed backup:', error.message);
          resolve({ compressed: false });
        } else {
          const originalSize = fs.statSync(this.backupFilePath).size;
          const compressedSize = fs.statSync(this.compressedBackupPath).size;
          const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
          
          console.log(`✅ Backup compressed: ${this.formatFileSize(compressedSize)} (${compressionRatio}% reduction)`);
          
          // Remove uncompressed file to save space
          fs.unlinkSync(this.backupFilePath);
          
          resolve({ 
            compressed: true, 
            filePath: this.compressedBackupPath,
            originalSize,
            compressedSize,
            compressionRatio
          });
        }
      });
    });
  }

  /**
   * Create backup manifest with metadata
   */
  createManifest(backupResult, stats) {
    const manifest = {
      backup: {
        timestamp: new Date().toISOString(),
        database: this.dbConfig.database,
        host: this.dbConfig.host,
        port: this.dbConfig.port,
        tables: stats.tableCount,
        filename: path.basename(backupResult.compressed ? this.compressedBackupPath : this.backupFilePath),
        size: backupResult.compressed ? backupResult.compressedSize : backupResult.size,
        compressed: backupResult.compressed || false,
        compressionRatio: backupResult.compressionRatio || null
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      },
      restore: {
        instructions: backupResult.compressed ? 
          `gunzip -c ${path.basename(this.compressedBackupPath)} | mysql -h ${this.dbConfig.host} -P ${this.dbConfig.port} -u ${this.dbConfig.username} -p ${this.dbConfig.database}` :
          `mysql -h ${this.dbConfig.host} -P ${this.dbConfig.port} -u ${this.dbConfig.username} -p ${this.dbConfig.database} < ${path.basename(this.backupFilePath)}`
      }
    };
    
    const manifestPath = path.join(this.backupDir, `manifest_${this.timestamp}.json`);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    
    console.log(`📋 Backup manifest created: ${path.basename(manifestPath)}`);
    return manifestPath;
  }

  /**
   * Clean up old backup files (keep last 5)
   */
  cleanupOldBackups() {
    console.log('🧹 Cleaning up old backups...');
    
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith('daysave_backup_') && (file.endsWith('.sql') || file.endsWith('.sql.gz')))
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file),
          mtime: fs.statSync(path.join(this.backupDir, file)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime);
      
      // Keep the 5 most recent backups
      const filesToDelete = files.slice(5);
      
      filesToDelete.forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`🗑️ Deleted old backup: ${file.name}`);
      });
      
      if (filesToDelete.length === 0) {
        console.log('✅ No old backups to clean up');
      } else {
        console.log(`✅ Cleaned up ${filesToDelete.length} old backup(s)`);
      }
    } catch (error) {
      console.warn('⚠️ Cleanup failed:', error.message);
    }
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Run complete backup process
   */
  async run() {
    console.log('🚀 Starting DaySave database backup...');
    console.log('================================');
    
    try {
      // Validation and setup
      this.validateConfig();
      await this.testConnection();
      const stats = await this.getDatabaseStats();
      
      // Create backup
      const backupResult = await this.createBackup();
      
      // Compress backup (optional, continues on failure)
      const compressionResult = await this.compressBackup();
      const finalResult = { ...backupResult, ...compressionResult };
      
      // Create manifest
      this.createManifest(finalResult, stats);
      
      // Cleanup old backups
      this.cleanupOldBackups();
      
      console.log('================================');
      console.log('✅ Database backup completed successfully!');
      console.log(`📁 Location: ${this.backupDir}`);
      console.log(`💾 File: ${path.basename(finalResult.compressed ? this.compressedBackupPath : this.backupFilePath)}`);
      console.log(`📏 Size: ${this.formatFileSize(finalResult.compressed ? finalResult.compressedSize : finalResult.size)}`);
      console.log('================================');
      
      return finalResult;
      
    } catch (error) {
      console.error('================================');
      console.error('❌ Backup failed:', error.message);
      console.error('================================');
      console.error('💡 Troubleshooting tips:');
      console.error('   1. Check that MySQL is running');
      console.error('   2. Verify database credentials in .env file');
      console.error('   3. Ensure mysqldump is installed and in PATH');
      console.error('   4. Check database permissions');
      console.error('================================');
      throw error;
    }
  }
}

// Run backup if called directly
if (require.main === module) {
  const backup = new DatabaseBackup();
  backup.run()
    .then(result => {
      process.exit(0);
    })
    .catch(error => {
      process.exit(1);
    });
}

module.exports = DatabaseBackup; 