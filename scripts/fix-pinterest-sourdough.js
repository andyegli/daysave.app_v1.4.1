#!/usr/bin/env node

require('dotenv').config();
const { Content } = require('../models');

async function fixPinterestSourdough() {
  try {
    console.log('📌 Fixing Pinterest sourdough bread hallucination...');
    
    // Find the specific hallucinated Pinterest content
    const pinterest = await Content.findOne({
      where: { 
        url: { [require('sequelize').Op.like]: '%sourdough-bread-beginner-friendly%' }
      }
    });
    
    if (!pinterest) {
      console.log('❌ Pinterest sourdough content not found');
      return;
    }
    
    console.log(`📋 Found hallucinated Pinterest content: ${pinterest.id.substring(0,8)}...`);
    console.log(`🔗 URL: ${pinterest.url}`);
    console.log(`\n❌ Current (HALLUCINATED) analysis:`);
    console.log(`   Title: ${pinterest.generated_title}`);
    console.log(`   Summary: ${pinterest.summary?.substring(0,150)}...`);
    console.log(`   Tags: ${pinterest.auto_tags ? pinterest.auto_tags.join(', ') : 'None'}`);
    
    console.log(`\n✅ Should be about:`);
    console.log(`   Title: Something about sourdough bread, baking, or beginner recipes`);
    console.log(`   Summary: Bread making techniques, sourdough starter, baking tips`);
    console.log(`   Tags: sourdough, bread, baking, recipe, cooking, beginner`);
    
    // Reset all analysis fields to trigger complete reprocessing
    console.log(`\n🔄 Resetting all analysis fields for reprocessing...`);
    
    await pinterest.update({
      transcription: null,
      summary: null,
      generated_title: null,
      auto_tags: null,
      sentiment: null,
      updatedAt: new Date()
    });
    
    console.log('✅ Pinterest sourdough content reset successfully!');
    
    console.log('\n💡 Next steps:');
    console.log('   1. Visit your content dashboard');
    console.log('   2. The Pinterest item will automatically reprocess');
    console.log('   3. Should properly identify sourdough bread content');
    console.log('   4. Check if Pinterest-specific downloader is needed');
    
    console.log('\n⚠️  Note: If hallucination persists, Pinterest needs a dedicated');
    console.log('   download method like Facebook/Instagram (using yt-dlp)');
    
  } catch (error) {
    console.error('❌ Error fixing Pinterest sourdough:', error.message);
  } finally {
    process.exit();
  }
}

fixPinterestSourdough();