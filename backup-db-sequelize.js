#!/usr/bin/env node
/**
 * Database Backup Script for DaySave (Sequelize-based)
 * Works without requiring mysqldump installation
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./models');

class SequelizeBackup {
  constructor() {
    this.backupDir = path.join(__dirname, 'db_backup');
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    this.backupFileName = `daysave_backup_${this.timestamp}.json`;
    this.backupFilePath = path.join(this.backupDir, this.backupFileName);
  }

  /**
   * Get all table names from Sequelize models
   */
  getTableNames() {
    return Object.keys(db).filter(key => {
      if (key === 'sequelize' || key === 'Sequelize') return false;
      const model = db[key];
      
      // Sequelize models are constructor functions, not objects!
      return (
        typeof model === 'function' &&  // Models are functions
        model.tableName                 // Has tableName property
      );
    });
  }

  /**
   * Export data from a single table
   */
  async exportTable(modelName) {
    try {
      const model = db[modelName];
      if (!model || !model.findAll) {
        console.log(`⚠️ Skipping ${modelName} - not a valid model`);
        return { tableName: modelName, data: [], error: 'Invalid model' };
      }

      console.log(`📊 Exporting ${modelName}...`);
      const data = await model.findAll({ raw: true });
      console.log(`✅ ${modelName}: ${data.length} records`);
      
      return {
        tableName: model.tableName || modelName,
        modelName: modelName,
        recordCount: data.length,
        data: data
      };
    } catch (error) {
      console.error(`❌ Error exporting ${modelName}:`, error.message);
      return {
        tableName: modelName,
        modelName: modelName,
        recordCount: 0,
        data: [],
        error: error.message
      };
    }
  }

  /**
   * Create complete database backup
   */
  async createBackup() {
    console.log('🚀 Starting DaySave database backup (Sequelize method)...');
    console.log('================================================================');

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

      // Get all model names
      const modelNames = this.getTableNames();
      console.log(`📋 Found ${modelNames.length} tables to backup`);

      // Export each table
      const tableExports = [];
      let totalRecords = 0;

      for (const modelName of modelNames) {
        const tableData = await this.exportTable(modelName);
        tableExports.push(tableData);
        totalRecords += tableData.recordCount;
      }

      // Create backup object
      const backup = {
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0',
          source: 'DaySave v1.4.1',
          method: 'sequelize',
          totalTables: modelNames.length,
          totalRecords: totalRecords,
          databaseName: db.sequelize.config.database,
          databaseHost: db.sequelize.config.host,
          nodeVersion: process.version,
          platform: process.platform
        },
        schema: {
          // Store model definitions for reference
          models: modelNames.map(name => ({
            name: name,
            tableName: db[name].tableName || name,
            attributes: db[name].rawAttributes ? Object.keys(db[name].rawAttributes) : []
          }))
        },
        data: tableExports
      };

      // Write backup to file
      fs.writeFileSync(this.backupFilePath, JSON.stringify(backup, null, 2));

      // Get file size
      const stats = fs.statSync(this.backupFilePath);
      const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);

      console.log('================================================================');
      console.log('✅ Backup completed successfully!');
      console.log(`📁 Location: ${this.backupDir}`);
      console.log(`💾 File: ${this.backupFileName}`);
      console.log(`📏 Size: ${sizeInMB} MB`);
      console.log(`📊 Tables: ${modelNames.length}`);
      console.log(`📈 Records: ${totalRecords}`);

      // Create restore instructions
      this.createRestoreScript();

      console.log('================================================================');
      return backup;

    } catch (error) {
      console.error('❌ Backup failed:', error.message);
      throw error;
    }
  }

  /**
   * Create a restore script
   */
  createRestoreScript() {
    const restoreScript = `#!/usr/bin/env node
/**
 * Restore script for DaySave backup: ${this.backupFileName}
 * Generated on: ${new Date().toISOString()}
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./models');

async function restoreDatabase() {
  console.log('🔄 Starting database restore...');
  
  try {
    // Load backup file
    const backupPath = path.join(__dirname, 'db_backup', '${this.backupFileName}');
    const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    
    console.log(\`📊 Restoring \${backup.metadata.totalRecords} records across \${backup.metadata.totalTables} tables\`);
    
    // Truncate all tables first (be careful!)
    console.log('⚠️ WARNING: This will delete all existing data!');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    for (const table of backup.data) {
      if (table.data.length > 0) {
        console.log(\`🔄 Restoring \${table.modelName} (\${table.recordCount} records)...\`);
        
        // Clear existing data
        await db[table.modelName].destroy({ where: {}, truncate: true });
        
        // Insert backup data
        await db[table.modelName].bulkCreate(table.data);
        
        console.log(\`✅ \${table.modelName} restored\`);
      }
    }
    
    console.log('✅ Database restore completed!');
  } catch (error) {
    console.error('❌ Restore failed:', error.message);
  }
}

restoreDatabase();`;

    const restoreScriptPath = path.join(this.backupDir, `restore_${this.timestamp}.js`);
    fs.writeFileSync(restoreScriptPath, restoreScript);
    console.log(`🔧 Restore script created: restore_${this.timestamp}.js`);
  }

  /**
   * List existing backups
   */
  listBackups() {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith('daysave_backup_') && file.endsWith('.json'))
        .map(file => {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            size: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
            modified: stats.mtime.toISOString()
          };
        })
        .sort((a, b) => new Date(b.modified) - new Date(a.modified));

      console.log('\n📋 Existing backups:');
      files.forEach((file, index) => {
        console.log(`${index + 1}. ${file.name} (${file.size}) - ${file.modified}`);
      });
    } catch (error) {
      console.log('📋 No existing backups found');
    }
  }
}

// Run backup if called directly
if (require.main === module) {
  const backup = new SequelizeBackup();
  
  backup.createBackup()
    .then(() => {
      backup.listBackups();
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Backup process failed');
      process.exit(1);
    });
}

module.exports = SequelizeBackup; 