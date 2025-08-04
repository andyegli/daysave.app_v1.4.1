#!/usr/bin/env node

require('dotenv').config();
const { Content, VideoAnalysis, OCRCaption, ProcessingJob } = require('../models');
const { Op } = require('sequelize');

async function fixYouTubeAnalysis() {
  try {
    console.log('🎬 Fixing YouTube AI pipeline failures...');
    
    // Find recent YouTube content with failed analysis
    const youtubeContent = await Content.findAll({
      where: {
        url: { [Op.like]: '%youtube.com%' },
        createdAt: { [Op.gte]: new Date(Date.now() - 24*60*60*1000) }
      },
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    
    console.log(`📋 Found ${youtubeContent.length} recent YouTube items`);
    
    for (const content of youtubeContent) {
      console.log(`\n🎯 Analyzing: ${content.id.substring(0,8)}...`);
      console.log(`   URL: ${content.url}`);
      console.log(`   Current Title: ${content.generated_title}`);
      
      // Check video analysis
      const videoAnalysis = await VideoAnalysis.findOne({ 
        where: { content_id: content.id } 
      });
      
      let hasObjects = false;
      let hasLabels = false;
      let hasQuality = false;
      
      if (videoAnalysis) {
        hasObjects = !!(videoAnalysis.objects && videoAnalysis.objects !== 'null');
        hasLabels = !!(videoAnalysis.labels && videoAnalysis.labels !== 'null');
        hasQuality = !!(videoAnalysis.quality_score !== undefined && videoAnalysis.quality_score !== null);
        
        console.log(`   Video Analysis Status:`);
        console.log(`     Objects: ${hasObjects ? '✅' : '❌'}`);
        console.log(`     Labels: ${hasLabels ? '✅' : '❌'}`);
        console.log(`     Quality: ${hasQuality ? '✅ (' + videoAnalysis.quality_score + '%)' : '❌'}`);
      } else {
        console.log(`   Video Analysis: ❌ Missing`);
      }
      
      // Check OCR captions
      const ocrCount = await OCRCaption.count({ 
        where: { content_id: content.id } 
      });
      console.log(`   OCR Captions: ${ocrCount > 0 ? '✅ (' + ocrCount + ')' : '❌'}`);
      
      // Check if content has generic "Deciphering Video Content" title (indicates failed analysis)
      const hasGenericTitle = content.generated_title && 
        content.generated_title.includes('Deciphering Video Content');
      
      if (hasGenericTitle) {
        console.log(`   ⚠️  Generic title detected - analysis failed`);
      }
      
      // Determine if this content needs fixing
      const needsFix = !hasObjects || !hasLabels || !hasQuality || ocrCount === 0 || hasGenericTitle;
      
      if (needsFix) {
        console.log(`   🔄 Resetting for reprocessing...`);
        
        // Reset content analysis fields
        await content.update({
          transcription: null,
          summary: null,
          generated_title: null,
          auto_tags: null,
          sentiment: null
        });
        
        // Reset or delete video analysis if incomplete
        if (videoAnalysis && (!hasObjects || !hasLabels || !hasQuality)) {
          await videoAnalysis.update({
            objects: null,
            labels: null,
            quality_score: null,
            face_data: null,
            scene_analysis: null,
            status: 'processing'
          });
        }
        
        // Delete OCR captions to force regeneration
        if (ocrCount === 0) {
          await OCRCaption.destroy({ where: { content_id: content.id } });
        }
        
        console.log(`   ✅ Reset complete - will reprocess on next access`);
      } else {
        console.log(`   ✅ Analysis appears complete`);
      }
    }
    
    console.log('\n📊 YouTube AI pipeline fix complete!');
    console.log('💡 Fixed items will reprocess when you next access them.');
    console.log('🔍 Expected improvements:');
    console.log('   - Proper object and label detection');
    console.log('   - OCR text extraction from video frames');
    console.log('   - Accurate titles based on video content');
    console.log('   - Complete video quality analysis');
    
  } catch (error) {
    console.error('❌ Error fixing YouTube analysis:', error.message);
  } finally {
    process.exit();
  }
}

fixYouTubeAnalysis();