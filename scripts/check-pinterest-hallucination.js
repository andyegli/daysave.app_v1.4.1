#!/usr/bin/env node

require('dotenv').config();
const { Content } = require('../models');
const { Op } = require('sequelize');

async function checkPinterestHallucination() {
  try {
    console.log('📌 Checking Pinterest content for hallucinations...');
    
    // Get recent Pinterest content
    const pinterest = await Content.findAll({
      where: { 
        url: { [Op.like]: '%pinterest.com%' }
      },
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    
    console.log(`📋 Found ${pinterest.length} Pinterest items:\n`);
    
    for (const p of pinterest) {
      console.log(`ID: ${p.id.substring(0,8)}...`);
      console.log(`URL: ${p.url}`);
      console.log(`Created: ${p.createdAt}`);
      console.log(`Updated: ${p.updatedAt}`);
      console.log(`Title: ${p.generated_title || 'NULL'}`);
      console.log(`Summary: ${(p.summary || 'NULL').substring(0,200)}...`);
      console.log(`Tags: ${p.auto_tags ? p.auto_tags.join(', ') : 'NULL'}`);
      console.log(`Transcription: ${p.transcription ? 'YES (' + p.transcription.length + ' chars)' : 'NULL'}`);
      
      // Check for hallucination patterns
      const title = p.generated_title || '';
      const summary = p.summary || '';
      const transcription = p.transcription || '';
      
      const hallucinationPatterns = [
        'AI assistant',
        'dialogue', 
        'audio transcription',
        'visual input',
        'Deciphering',
        'failure in',
        'requests specific',
        'assistant requests',
        'AI-driven dialogue'
      ];
      
      const foundPatterns = hallucinationPatterns.filter(pattern => 
        title.includes(pattern) || 
        summary.includes(pattern) || 
        transcription.includes(pattern)
      );
      
      if (foundPatterns.length > 0) {
        console.log(`⚠️  HALLUCINATION DETECTED!`);
        console.log(`   Patterns found: ${foundPatterns.join(', ')}`);
        console.log(`   This should be manicure/nail content, not AI dialogue!`);
      } else {
        console.log(`✅ Content appears normal`);
      }
      
      console.log(''); // spacing
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit();
  }
}

checkPinterestHallucination();