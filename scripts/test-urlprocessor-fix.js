#!/usr/bin/env node
/**
 * Test UrlProcessor AI Generation Fix
 * 
 * Tests the fixed title and summary generation directly
 */

require('dotenv').config();
const { Content } = require('../models');
const { UrlProcessor } = require('../services/multimedia/UrlProcessor');

async function testUrlProcessorFix() {
  const contentId = '90fd7b65-6d9b-49e3-bf24-31fb75168891';
  
  try {
    console.log('🔄 Testing UrlProcessor AI generation fix...');
    
    const content = await Content.findByPk(contentId);
    if (!content) {
      console.log('❌ Content not found');
      return;
    }
    
    console.log('📋 Original Content:');
    console.log('   URL:', content.url);
    console.log('   Original Title:', JSON.stringify(content.generated_title));
    console.log('   Original Summary Length:', content.summary?.length || 0);
    console.log('   Transcription Length:', content.transcription?.length || 0);
    
    // Create UrlProcessor instance
    const urlProcessor = new UrlProcessor({ enableLogging: true });
    
    // Test title generation with current data
    console.log('\n🎯 Testing AI title generation...');
    const mockResults = {
      transcription: content.transcription,
      metadata: content.metadata || {},
      platform: 'youtube'
    };
    
    const newTitle = await urlProcessor.generateTitle(mockResults);
    console.log('   Generated Title:', JSON.stringify(newTitle));
    
    // Test summary generation
    console.log('\n📝 Testing AI summary generation...');
    const newSummary = await urlProcessor.generateSummary(mockResults);
    console.log('   Generated Summary Length:', newSummary?.length || 0);
    console.log('   Generated Summary Preview:', newSummary?.substring(0, 150) + '...' || 'None');
    
    // Update the content if generation was successful
    if (newTitle && newSummary && (newTitle !== content.generated_title || newSummary !== content.summary)) {
      console.log('\n💾 Updating content with new AI-generated results...');
      await Content.update({
        generated_title: newTitle,
        summary: newSummary
      }, { where: { id: contentId } });
      console.log('✅ Content updated successfully!');
    } else {
      console.log('\n⚠️ No updates needed or generation failed');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack trace:', error.stack);
  }
  
  process.exit(0);
}

if (require.main === module) {
  testUrlProcessorFix().catch(console.error);
}

module.exports = { testUrlProcessorFix };
