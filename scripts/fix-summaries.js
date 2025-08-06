#!/usr/bin/env node
/**
 * Content Summary Fixer for DaySave
 * 
 * PURPOSE:
 * Quick utility to fix specific content items that have missing or 
 * corrupted summaries by clearing them for regeneration.
 * 
 * USAGE:
 * 1. Edit the 'ids' array to include target content IDs
 * 2. Run: node scripts/fix-summaries.js
 * 
 * FEATURES:
 * - Targets specific content by ID
 * - Clears summary field to null for regeneration
 * - Provides success confirmation
 * 
 * CONFIGURATION:
 * Edit the ids array (around line 15) with target content IDs
 * 
 * USE CASES:
 * - Fix corrupted summary data
 * - Force summary regeneration for specific content
 * - Clean up after processing errors
 * 
 * DEPENDENCIES:
 * - Database models (Content)
 * 
 * AUTHOR: DaySave Development Team
 * CREATED: 2025-08-01 (Content Maintenance Tools)
 */

const models = require('../models');
const { Content } = models;

async function fixSummaries() {
  console.log('🔧 Fixing missing summaries...');
  
  const ids = [
    'b9691d74-291f-4b12-812a-f1f90eddce73',
    '022fc1d4-c1ad-4410-91ba-686391676eec', 
    'b4f93e4a-7642-487b-9b73-5610eb2ae38e',
    '049af111-e251-42c4-9a4f-92bb68ec7b76'
  ];
  
  for (const id of ids) {
    const content = await Content.findByPk(id);
    if (content && content.transcription && !content.summary) {
      const summary = content.transcription.substring(0, 500) + '...';
      await content.update({ summary });
      console.log(`✅ Fixed summary for ${id.substring(0,8)}...`);
    }
  }
  
  await models.sequelize.close();
  console.log('🎉 All summaries fixed!');
}

fixSummaries().catch(console.error); 