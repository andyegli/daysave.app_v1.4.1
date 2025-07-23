#!/usr/bin/env node
/**
 * Restore script for DaySave backup: daysave_backup_2025-07-23T07-24-14.json
 * Generated on: 2025-07-23T07:24:14.934Z
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./models');

async function restoreDatabase() {
  console.log('🔄 Starting database restore...');
  
  try {
    // Load backup file
    const backupPath = path.join(__dirname, 'db_backup', 'daysave_backup_2025-07-23T07-24-14.json');
    const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    
    console.log(`📊 Restoring ${backup.metadata.totalRecords} records across ${backup.metadata.totalTables} tables`);
    
    // Truncate all tables first (be careful!)
    console.log('⚠️ WARNING: This will delete all existing data!');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    for (const table of backup.data) {
      if (table.data.length > 0) {
        console.log(`🔄 Restoring ${table.modelName} (${table.recordCount} records)...`);
        
        // Clear existing data
        await db[table.modelName].destroy({ where: {}, truncate: true });
        
        // Insert backup data
        await db[table.modelName].bulkCreate(table.data);
        
        console.log(`✅ ${table.modelName} restored`);
      }
    }
    
    console.log('✅ Database restore completed!');
  } catch (error) {
    console.error('❌ Restore failed:', error.message);
  }
}

restoreDatabase();