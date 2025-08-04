#!/usr/bin/env node

require('dotenv').config();
const { Content } = require('../models');

async function fixPinterestAnalysis() {
  try {
    console.log('📌 Fixing Pinterest content analysis...');
    
    // Find the specific Pinterest content that was misanalyzed
    const pinterest = await Content.findOne({
      where: { 
        url: { [require('sequelize').Op.like]: '%pinterest.com/pin/140806233928538%' }
      }
    });
    
    if (!pinterest) {
      console.log('❌ Pinterest content not found');
      return;
    }
    
    console.log(`📋 Found Pinterest content: ${pinterest.id.substring(0,8)}...`);
    console.log(`🔗 URL: ${pinterest.url}`);
    console.log(`\n❌ Current (incorrect) analysis:`);
    console.log(`   Title: ${pinterest.generated_title}`);
    console.log(`   Summary: ${pinterest.summary?.substring(0,100)}...`);
    console.log(`   Tags: ${pinterest.auto_tags ? pinterest.auto_tags.join(', ') : 'None'}`);
    
    // Reset all analysis fields to trigger complete reprocessing
    console.log(`\n🔄 Resetting all analysis fields for reprocessing...`);
    
    await pinterest.update({
      transcription: null,
      summary: null,
      generated_title: null,
      auto_tags: null,
      sentiment: null,
      // Keep user comments and tags if any
      createdAt: pinterest.createdAt, // Don't change creation time
      updatedAt: new Date() // Update modification time
    });
    
    console.log('✅ Pinterest content reset successfully!');
    console.log('\n📝 Expected after reprocessing:');
    console.log('   Title: Should mention manicure, fingernails, or nail art');
    console.log('   Summary: Should describe nail care techniques');
    console.log('   Tags: Should include manicure, nails, beauty, tutorial');
    
    console.log('\n💡 Next steps:');
    console.log('   1. Visit your content dashboard');
    console.log('   2. The Pinterest item will automatically reprocess');
    console.log('   3. Check if object detection properly identifies nail content');
    
  } catch (error) {
    console.error('❌ Error fixing Pinterest analysis:', error.message);
  } finally {
    process.exit();
  }
}

fixPinterestAnalysis();