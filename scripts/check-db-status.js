#!/usr/bin/env node
/**
 * Database Status Checker for DaySave
 */

require('dotenv').config();
const db = require('../models');

async function checkDatabaseStatus() {
  console.log('🔍 Checking DaySave database status...');
  console.log('=====================================');

  try {
    // Test connection
    console.log('🔌 Testing database connection...');
    await db.sequelize.authenticate();
    console.log('✅ Database connection successful');
    
    // Get database info
    const config = db.sequelize.config;
    console.log(`📊 Database: ${config.database}`);
    console.log(`🖥️ Host: ${config.host}:${config.port}`);
    console.log(`👤 User: ${config.username}`);
    
    // Check if models are loaded
    console.log('\n📋 Checking Sequelize models...');
    const modelKeys = Object.keys(db).filter(key => 
      key !== 'sequelize' && 
      key !== 'Sequelize' && 
      typeof db[key] === 'object'
    );
    
    console.log(`📝 Found ${modelKeys.length} models: ${modelKeys.join(', ')}`);
    
    // Check actual database tables using raw query
    console.log('\n🗄️ Checking actual database tables...');
    const [tables] = await db.sequelize.query(
      "SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = ? ORDER BY TABLE_NAME",
      { replacements: [config.database] }
    );
    
    console.log(`📊 Found ${tables.length} actual tables in database:`);
    tables.forEach((table, index) => {
      console.log(`  ${index + 1}. ${table.TABLE_NAME}`);
    });
    
    // Check record counts for each table
    if (tables.length > 0) {
      console.log('\n📈 Record counts per table:');
      for (const table of tables) {
        try {
          const [result] = await db.sequelize.query(
            `SELECT COUNT(*) as count FROM \`${table.TABLE_NAME}\``
          );
          const count = result[0].count;
          console.log(`  ${table.TABLE_NAME}: ${count} records`);
        } catch (error) {
          console.log(`  ${table.TABLE_NAME}: Error - ${error.message}`);
        }
      }
    }
    
    console.log('\n=====================================');
    console.log('✅ Database status check completed');
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    console.error('\n💡 Possible issues:');
    console.error('   1. Database server not running');
    console.error('   2. Wrong credentials in .env file');
    console.error('   3. Database not created');
    console.error('   4. Network connectivity issues');
  } finally {
    if (db.sequelize) {
      await db.sequelize.close();
    }
  }
}

checkDatabaseStatus(); 