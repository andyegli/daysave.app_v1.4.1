#!/usr/bin/env node
/**
 * Raw Database Backup Script for DaySave
 * Works directly with database tables via raw SQL queries
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../models');

class RawDatabaseBackup {
  constructor() {
    this.backupDir = path.join(__dirname, '../db_backup');
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    this.backupFileName = `daysave_raw_backup_${this.timestamp}.json`;
    this.backupFilePath = path.join(this.backupDir, this.backupFileName);
  }

  /**
   * Get all tables from the database
   */
  async getTables() {
    const [tables] = await db.sequelize.query(
      "SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = ? ORDER BY TABLE_NAME",
      { replacements: [db.sequelize.config.database] }
    );
    return tables.map(t => t.TABLE_NAME);
  }

  /**
   * Get table structure
   */
  async getTableStructure(tableName) {
    try {
      const [columns] = await db.sequelize.query(
        `DESCRIBE \`${tableName}\``
      );
      return columns;
    } catch (error) {
      console.error(`❌ Error getting structure for ${tableName}:`, error.message);
      return [];
    }
  }

  /**
   * Export data from a table
   */
  async exportTable(tableName) {
    try {
      console.log(`📊 Exporting ${tableName}...`);
      
      // Get table structure
      const structure = await this.getTableStructure(tableName);
      
      // Get table data
      const [data] = await db.sequelize.query(`SELECT * FROM \`${tableName}\``);
      
      console.log(`✅ ${tableName}: ${data.length} records`);
      
      return {
        tableName: tableName,
        recordCount: data.length,
        structure: structure,
        data: data
      };
    } catch (error) {
      console.error(`❌ Error exporting ${tableName}:`, error.message);
      return {
        tableName: tableName,
        recordCount: 0,
        structure: [],
        data: [],
        error: error.message
      };
    }
  }

  /**
   * Create complete database backup
   */
  async createBackup() {
    console.log('🚀 Starting DaySave database backup (Raw SQL method)...');
    console.log('=====================================================');

    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log('📁 Created db_backup directory');
    }

    console.log(`💾 Backup file: ${this.backupFileName}`);
    console.log('⏳ Exporting data...');

    try {
      // Test database connection
      await db.sequelize.authenticate();
      console.log('✅ Database connection successful');

      // Get all tables
      const tableNames = await this.getTables();
      console.log(`📋 Found ${tableNames.length} tables to backup`);

      // Export each table
      const tableExports = [];
      let totalRecords = 0;

      for (const tableName of tableNames) {
        const tableData = await this.exportTable(tableName);
        tableExports.push(tableData);
        totalRecords += tableData.recordCount;
      }

      // Create backup object
      const backup = {
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0',
          source: 'DaySave v1.4.1',
          method: 'raw_sql',
          totalTables: tableNames.length,
          totalRecords: totalRecords,
          databaseName: db.sequelize.config.database,
          databaseHost: db.sequelize.config.host,
          databasePort: db.sequelize.config.port,
          databaseUser: db.sequelize.config.username,
          nodeVersion: process.version,
          platform: process.platform
        },
        tables: tableExports
      };

      // Write backup to file
      console.log('💾 Writing backup file...');
      fs.writeFileSync(this.backupFilePath, JSON.stringify(backup, null, 2));

      // Get file size
      const stats = fs.statSync(this.backupFilePath);
      const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);

      console.log('=====================================================');
      console.log('✅ Backup completed successfully!');
      console.log(`📁 Location: ${this.backupDir}`);
      console.log(`💾 File: ${this.backupFileName}`);
      console.log(`📏 Size: ${sizeInMB} MB`);
      console.log(`📊 Tables: ${tableNames.length}`);
      console.log(`📈 Records: ${totalRecords}`);

      // Create summary report
      this.createSummaryReport(tableExports, totalRecords);

      console.log('=====================================================');
      return backup;

    } catch (error) {
      console.error('❌ Backup failed:', error.message);
      throw error;
    }
  }

  /**
   * Create a summary report
   */
  createSummaryReport(tableExports, totalRecords) {
    const summary = {
      timestamp: new Date().toISOString(),
      backupFile: this.backupFileName,
      totalTables: tableExports.length,
      totalRecords: totalRecords,
      tables: tableExports.map(table => ({
        name: table.tableName,
        records: table.recordCount,
        hasError: !!table.error
      })).sort((a, b) => b.records - a.records), // Sort by record count descending
      largestTables: tableExports
        .filter(t => t.recordCount > 0)
        .sort((a, b) => b.recordCount - a.recordCount)
        .slice(0, 10)
        .map(t => ({ name: t.tableName, records: t.recordCount })),
      emptyTables: tableExports
        .filter(t => t.recordCount === 0)
        .map(t => t.tableName),
      errors: tableExports
        .filter(t => t.error)
        .map(t => ({ table: t.tableName, error: t.error }))
    };

    const summaryPath = path.join(this.backupDir, `backup_summary_${this.timestamp}.json`);
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    
    console.log(`📋 Summary report created: backup_summary_${this.timestamp}.json`);
    
    // Print summary to console
    console.log('\n📊 Backup Summary:');
    console.log(`   Total Tables: ${summary.totalTables}`);
    console.log(`   Total Records: ${summary.totalRecords}`);
    console.log(`   Largest Tables: ${summary.largestTables.slice(0, 5).map(t => `${t.name}(${t.records})`).join(', ')}`);
    console.log(`   Empty Tables: ${summary.emptyTables.length}`);
    console.log(`   Errors: ${summary.errors.length}`);
  }

  /**
   * List existing backups
   */
  listBackups() {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.includes('backup') && file.endsWith('.json'))
        .map(file => {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            size: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
            modified: stats.mtime.toISOString().slice(0, 19)
          };
        })
        .sort((a, b) => new Date(b.modified) - new Date(a.modified));

      if (files.length > 0) {
        console.log('\n📋 All backups in db_backup folder:');
        files.forEach((file, index) => {
          console.log(`${index + 1}. ${file.name} (${file.size}) - ${file.modified}`);
        });
      } else {
        console.log('\n📋 No backups found');
      }
    } catch (error) {
      console.log('\n📋 Error listing backups:', error.message);
    }
  }
}

// Run backup if called directly
if (require.main === module) {
  const backup = new RawDatabaseBackup();
  
  backup.createBackup()
    .then(() => {
      backup.listBackups();
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Backup process failed');
      process.exit(1);
    })
    .finally(() => {
      if (db.sequelize) {
        db.sequelize.close();
      }
    });
}

module.exports = RawDatabaseBackup; 