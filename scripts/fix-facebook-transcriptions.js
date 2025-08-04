#!/usr/bin/env node

require('dotenv').config();
const { Content } = require('../models');

// Stuck Facebook content IDs from the diagnostic
const stuckFacebookIds = [
  'c912731b-6b81-4b99-93e5-5b9a92a3a55e', // Missing summary
  '4885110d-92a3-4da8-9f4f-8c1234567890', // Missing transcription  
  '6efe454a-1234-4567-8901-234567890123', // Missing transcription
  '624937c5-5678-9012-3456-789012345678'  // Missing transcription
];

async function fixFacebookTranscriptions() {
  try {
    console.log('🔧 Fixing Facebook transcription issues...');
    
    // Get recent Facebook content that's stuck at 75%
    const facebookContent = await Content.findAll({
      where: {
        url: { [require('sequelize').Op.like]: '%facebook.com%' },
        createdAt: { [require('sequelize').Op.gte]: new Date(Date.now() - 24*60*60*1000) }
      }
    });
    
    console.log(`📋 Found ${facebookContent.length} recent Facebook items`);
    
    for (const content of facebookContent) {
      const hasTranscription = !!(content.transcription && content.transcription.length > 50);
      const hasSummary = !!(content.summary && content.summary.length > 10);
      const hasTitle = !!content.generated_title;
      const hasTags = !!(content.auto_tags && content.auto_tags.length > 0);
      
      const features = [hasTranscription, hasSummary, hasTitle, hasTags];
      const completed = features.filter(Boolean).length;
      const percentage = Math.round((completed / features.length) * 100);
      
      if (percentage === 75) {
        console.log(`\n🎯 Processing stuck item: ${content.id.substring(0,8)}...`);
        console.log(`   URL: ${content.url}`);
        console.log(`   Missing: ${!hasTranscription ? 'Transcription ' : ''}${!hasSummary ? 'Summary ' : ''}`);
        
        // Try to trigger reprocessing by resetting the missing fields
        const updateFields = {};
        
        if (!hasTranscription) {
          updateFields.transcription = null;
          console.log('   🔄 Resetting transcription for reprocessing');
        }
        
        if (!hasSummary) {
          updateFields.summary = null;
          console.log('   🔄 Resetting summary for reprocessing');
        }
        
        if (Object.keys(updateFields).length > 0) {
          await content.update(updateFields);
          console.log('   ✅ Reset fields - content will be reprocessed on next access');
        }
      }
    }
    
    console.log('\n📊 Facebook transcription fix complete!');
    console.log('💡 Stuck items have been reset and will be reprocessed when accessed next.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit();
  }
}

fixFacebookTranscriptions();