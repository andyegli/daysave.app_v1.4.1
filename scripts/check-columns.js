#!/usr/bin/env node
/**
 * Database Column Checker for DaySave
 * 
 * PURPOSE:
 * Verifies that required columns exist in analysis tables after migrations
 * or database schema updates. Particularly useful for checking processing_job_id columns.
 * 
 * USAGE:
 * node scripts/check-columns.js
 * 
 * FEATURES:
 * - Checks video_analysis, audio_analysis, and image_analysis tables
 * - Verifies presence of processing_job_id column
 * - Lists all columns in each table for inspection
 * - Provides quick schema validation
 * 
 * OUTPUT:
 * - Table column listings
 * - processing_job_id presence confirmation
 * - Schema validation results
 * 
 * USE CASES:
 * - Post-migration validation
 * - Database schema debugging
 * - Column existence verification
 * - Development environment setup validation
 * 
 * DEPENDENCIES:
 * - Sequelize ORM and database models
 * - Database connection
 * 
 * AUTHOR: DaySave Development Team
 * CREATED: 2025-08-01 (Database Maintenance Tools)
 */

const { sequelize } = require('../models');

async function checkColumns() {
  try {
    const tables = ['video_analysis', 'audio_analysis', 'image_analysis'];
    
    for (const table of tables) {
      const columns = await sequelize.query(`DESCRIBE ${table}`, { 
        type: sequelize.QueryTypes.SELECT 
      });
      
      console.log(`\n${table} columns:`);
      const hasProcessingJobId = columns.some(col => col.Field === 'processing_job_id');
      console.log(`- Has processing_job_id: ${hasProcessingJobId}`);
      
      if (!hasProcessingJobId) {
        console.log(`  ❌ Missing processing_job_id column!`);
      } else {
        console.log(`  ✅ processing_job_id column exists`);
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkColumns(); 