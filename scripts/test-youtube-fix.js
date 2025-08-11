#!/usr/bin/env node
/**
 * Test YouTube URL Processing Fix
 * 
 * Tests the fixed UrlProcessor AI generation on the problematic YouTube URL
 */

require('dotenv').config();
const { Content } = require('../models');
const { AutomationOrchestrator } = require('../services/multimedia/AutomationOrchestrator');

async function testYouTubeReprocessing() {
  const contentId = '90fd7b65-6d9b-49e3-bf24-31fb75168891';
  
  try {
    console.log('🔄 Testing YouTube URL reprocessing with fixed UrlProcessor...');
    
    const content = await Content.findByPk(contentId);
    if (!content) {
      console.log('❌ Content not found');
      return;
    }
    
    console.log('📋 Original Content:');
    console.log('   URL:', content.url);
    console.log('   Original Title:', JSON.stringify(content.generated_title));
    console.log('   Original Summary Length:', content.summary?.length || 0);
    
    // Initialize orchestrator
    const orchestrator = AutomationOrchestrator.getInstance();
    
    // Process the URL with our fixed logic
    console.log('\n🎬 Reprocessing with fixed AI generation...');
    const result = await orchestrator.processUrl(content.url, {
      transcription: true,
      sentiment: true,
      summarization: true,
      thumbnails: true,
      speaker_identification: true,
      enableSummarization: true,
      enableSentimentAnalysis: true,
      user_id: content.user_id,
      content_id: content.id
    });
    
    console.log('\n📊 New Results:');
    console.log('   New Title:', JSON.stringify(result.generated_title || result.title));
    console.log('   New Summary Length:', result.summary?.length || 0);
    console.log('   New Summary Preview:', result.summary?.substring(0, 150) + '...' || 'None');
    
    // Update the content with new results
    const updateData = {};
    if (result.generated_title) updateData.generated_title = result.generated_title;
    if (result.summary) updateData.summary = result.summary;
    if (result.auto_tags) updateData.auto_tags = result.auto_tags;
    
    if (Object.keys(updateData).length > 0) {
      await Content.update(updateData, { where: { id: contentId } });
      console.log('\n✅ Content updated successfully!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

if (require.main === module) {
  testYouTubeReprocessing().catch(console.error);
}

module.exports = { testYouTubeReprocessing };
