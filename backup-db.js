#!/usr/bin/env node
/**
 * Simple Database Backup Script for DaySave
 */

require('dotenv').config();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get database config from environment
const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 3306,
  username: process.env.DB_USER,
  password: process.env.DB_USER_PASSWORD,
  database: process.env.DB_NAME
};

console.log('🚀 Starting DaySave database backup...');

// Check required environment variables
if (!dbConfig.username || !dbConfig.password || !dbConfig.database) {
  console.error('❌ Missing required environment variables: DB_USER, DB_USER_PASSWORD, DB_NAME');
  process.exit(1);
}

// Create backup directory
const backupDir = path.join(__dirname, 'db_backup');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
  console.log('📁 Created db_backup directory');
}

// Generate timestamp for backup file
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backupFileName = `daysave_backup_${timestamp}.sql`;
const backupFilePath = path.join(backupDir, backupFileName);

console.log(`📊 Database: ${dbConfig.database} at ${dbConfig.host}:${dbConfig.port}`);
console.log(`💾 Backup file: ${backupFileName}`);

// Create mysqldump command
const dumpCommand = [
  'mysqldump',
  `--host=${dbConfig.host}`,
  `--port=${dbConfig.port}`,
  `--user=${dbConfig.username}`,
  `--password=${dbConfig.password}`,
  '--single-transaction',
  '--routines',
  '--triggers',
  '--add-drop-table',
  dbConfig.database
].join(' ');

console.log('⏳ Creating backup...');

// Execute backup
exec(`${dumpCommand} > "${backupFilePath}"`, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Backup failed:', error.message);
    console.error('💡 Make sure MySQL is running and credentials are correct');
    process.exit(1);
  }

  // Check if backup file was created
  if (fs.existsSync(backupFilePath)) {
    const stats = fs.statSync(backupFilePath);
    const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);
    
    console.log('✅ Backup completed successfully!');
    console.log(`📁 Location: ${backupDir}`);
    console.log(`💾 File: ${backupFileName}`);
    console.log(`📏 Size: ${sizeInMB} MB`);
    
    // Create a simple manifest
    const manifest = {
      timestamp: new Date().toISOString(),
      database: dbConfig.database,
      filename: backupFileName,
      size: stats.size,
      restore_command: `mysql -h ${dbConfig.host} -P ${dbConfig.port} -u ${dbConfig.username} -p ${dbConfig.database} < ${backupFileName}`
    };
    
    fs.writeFileSync(path.join(backupDir, `manifest_${timestamp}.json`), JSON.stringify(manifest, null, 2));
    console.log(`📋 Manifest created: manifest_${timestamp}.json`);
    console.log('🎉 Backup process completed!');
  } else {
    console.error('❌ Backup file was not created');
    process.exit(1);
  }
}); 